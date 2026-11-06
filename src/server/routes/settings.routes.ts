import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditService } from '../services/audit.service';

const router = Router();

// GET /api/settings (Active Society Profile & Branding)
router.get('/', (req: Request, res: Response) => {
  const settings = db.prepare(`SELECT * FROM society_settings WHERE id = 1`).get();
  return res.json({ settings });
});

// GET /api/settings/permissions (Check who is allowed to create members)
router.get('/permissions', authenticate, (req: Request, res: Response) => {
  const settings = db.prepare(`SELECT member_creation_allowed_roles FROM society_settings WHERE id = 1`).get() as any;
  let allowedRoles: string[] = ['super_admin', 'admin', 'president', 'treasurer'];
  try {
    if (settings?.member_creation_allowed_roles) {
      allowedRoles = JSON.parse(settings.member_creation_allowed_roles);
    }
  } catch {
    allowedRoles = ['super_admin'];
  }

  const allAvailableRoles = [
    { key: 'super_admin', labelBn: 'সুপার এডমিন (সর্বদা অনুমোদিত)', labelEn: 'Super Admin', locked: true },
    { key: 'admin', labelBn: 'এডমিন (সিস্টেম প্রশাসক)', labelEn: 'Admin', locked: false },
    { key: 'president', labelBn: 'সভাপতি (কার্যনির্বাহী পরিষদ)', labelEn: 'President', locked: false },
    { key: 'general_secretary', labelBn: 'সাধারণ সম্পাদক (সচিবালয়)', labelEn: 'General Secretary', locked: false },
    { key: 'treasurer', labelBn: 'কোষাধ্যক্ষ / ক্যাশিয়ার (অর্থ বিভাগ)', labelEn: 'Treasurer / Cashier', locked: false },
  ];

  return res.json({
    allowedRoles,
    allAvailableRoles,
    canCurrentUserAddMembers: req.user!.role === 'super_admin' || allowedRoles.includes(req.user!.role),
  });
});

// PUT /api/settings/permissions (Super Admin updates member creation permissions)
router.put('/permissions', authenticate, requireRole(['super_admin']), (req: Request, res: Response) => {
  const { allowedRoles } = req.body;

  if (!Array.isArray(allowedRoles)) {
    return res.status(400).json({ error: 'allowedRoles must be an array of role keys.' });
  }

  // Ensure super_admin is always included
  const finalRoles = Array.from(new Set(['super_admin', ...allowedRoles]));

  db.prepare(`
    UPDATE society_settings 
    SET member_creation_allowed_roles = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = 1
  `).run(JSON.stringify(finalRoles));

  // Sync with societies table
  try {
    db.prepare(`
      UPDATE societies 
      SET member_creation_allowed_roles = ? 
      WHERE id = 1
    `).run(JSON.stringify(finalRoles));
  } catch {}

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    userName: req.user!.fullNameBn,
    action: 'UPDATE_MEMBER_CREATION_PERMISSIONS',
    entityType: 'society_settings',
    entityId: 1,
    newValues: { allowedRoles: finalRoles },
  });

  return res.json({
    message: 'সদস্য যুক্ত করার পারমিশন সফলভাবে আপডেট করা হয়েছে।',
    allowedRoles: finalRoles,
  });
});

// GET /api/settings/public-societies (Public endpoint for registration dropdown)
router.get('/public-societies', (req: Request, res: Response) => {
  const societies = db.prepare(`
    SELECT id, name_bn, name_en, short_name, address 
    FROM societies 
    WHERE is_active = 1 
    ORDER BY id ASC
  `).all();
  return res.json({ societies });
});

// GET /api/settings/societies (List all societies managed in SomobayPro with counts)
router.get('/societies', authenticate, requireRole(['super_admin', 'admin', 'president']), (req: Request, res: Response) => {
  const societies = db.prepare(`
    SELECT s.*,
      (SELECT COUNT(*) FROM members WHERE society_id = s.id AND membership_status = 'active') as active_members_count,
      (SELECT COUNT(*) FROM members WHERE society_id = s.id AND membership_status = 'pending') as pending_members_count,
      (SELECT u.mobile FROM users u WHERE u.society_id = s.id AND u.role = 'president' LIMIT 1) as president_mobile
    FROM societies s 
    ORDER BY s.id ASC
  `).all();
  return res.json({ societies });
});

// POST /api/settings/societies (Super Admin creates a new society profile)
router.post('/societies', authenticate, requireRole(['super_admin']), (req: Request, res: Response) => {
  const {
    nameBn,
    nameEn,
    shortName,
    regNo,
    address,
    district,
    upazila,
    phone,
    email,
    monthlySubscriptionDefault = 1000,
  } = req.body;

  if (!nameBn) {
    return res.status(400).json({ error: 'সমিতির পূর্ণ নাম (বাংলায়) আবশ্যক।' });
  }

  const result = db.prepare(`
    INSERT INTO societies (
      name_bn, name_en, short_name, reg_no, address, district, upazila, phone, email, monthly_subscription_default
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nameBn,
    nameEn || nameBn,
    shortName || 'SOMOBAY',
    regNo || '',
    address || '',
    district || 'ঢাকা',
    upazila || '',
    phone || '',
    email || '',
    Number(monthlySubscriptionDefault) || 1000
  );

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'CREATE_SOCIETY_PROFILE',
    entityType: 'societies',
    entityId: result.lastInsertRowid,
    newValues: { nameBn, regNo },
  });

  return res.status(201).json({
    message: 'নতুন সোসাইটি প্রোফাইল সফলভাবে তৈরি হয়েছে।',
    societyId: result.lastInsertRowid,
  });
});

// POST /api/settings/societies/:id/switch (Switch active society profile)
router.post('/societies/:id/switch', authenticate, requireRole(['super_admin']), (req: Request, res: Response) => {
  const { id } = req.params;
  const target = db.prepare(`SELECT * FROM societies WHERE id = ?`).get(id) as any;

  if (!target) {
    return res.status(404).json({ error: 'সোসাইটি প্রোফাইল পাওয়া যায়নি।' });
  }

  // Update active society_settings (id=1) with target profile info
  db.prepare(`
    UPDATE society_settings SET
      name_bn = ?,
      name_en = ?,
      short_name = ?,
      reg_no = ?,
      address = ?,
      district = ?,
      upazila = ?,
      phone = ?,
      email = ?,
      monthly_subscription_default = ?,
      member_creation_allowed_roles = COALESCE(?, member_creation_allowed_roles),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(
    target.name_bn,
    target.name_en,
    target.short_name,
    target.reg_no,
    target.address,
    target.district,
    target.upazila,
    target.phone,
    target.email,
    target.monthly_subscription_default,
    target.member_creation_allowed_roles
  );

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'SWITCH_ACTIVE_SOCIETY',
    entityType: 'society_settings',
    entityId: id,
    newValues: { nameBn: target.name_bn },
  });

  return res.json({
    message: `সক্রিয় সমিতি প্রোফাইল পরিবর্তিত হয়ে '${target.name_bn}'-এ সেট হয়েছে।`,
    activeSociety: target,
  });
});

// DELETE /api/settings/societies/:id (Delete Society and all its data)
router.delete('/societies/:id', authenticate, requireRole(['super_admin']), (req: Request, res: Response) => {
  const societyId = Number(req.params.id);
  if (!societyId || isNaN(societyId)) {
    return res.status(400).json({ error: 'বৈধ সোসাইটি আইডি দিন।' });
  }

  if (societyId === 1) {
    return res.status(400).json({ error: 'মূল প্রাথমিক সমিতি (ID: 1) মোছা যাবে না।' });
  }

  const existing = db.prepare(`SELECT * FROM societies WHERE id = ?`).get(societyId) as any;
  if (!existing) {
    return res.status(404).json({ error: 'সোসাইটি পাওয়া যায়নি।' });
  }

  try {
    // 1. Delete associated data
    db.prepare(`DELETE FROM receipts WHERE society_id = ?`).run(societyId);
    db.prepare(`DELETE FROM payments WHERE society_id = ?`).run(societyId);
    db.prepare(`DELETE FROM subscription_dues WHERE member_id IN (SELECT member_id FROM members WHERE society_id = ?)`).run(societyId);
    db.prepare(`DELETE FROM members WHERE society_id = ?`).run(societyId);
    db.prepare(`DELETE FROM users WHERE society_id = ?`).run(societyId);
    db.prepare(`DELETE FROM notices WHERE society_id = ?`).run(societyId);
    db.prepare(`DELETE FROM meetings WHERE society_id = ?`).run(societyId);

    // 2. Delete the society itself
    db.prepare(`DELETE FROM societies WHERE id = ?`).run(societyId);

    AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'DELETE_SOCIETY',
      entityType: 'societies',
      entityId: societyId,
      oldValues: { name_bn: existing.name_bn },
    });

    return res.json({
      success: true,
      message: `সমিতি '${existing.name_bn}' এবং এর যাবতীয় কার্যকলাপ সফলভাবে মুছে ফেলা হয়েছে।`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'সমিতি মুছতে ব্যর্থ হয়েছে।' });
  }
});

// PUT /api/settings (Update Society Profile & Branding - Super Admin, President, Admin)
router.put('/', authenticate, requireRole(['super_admin', 'president', 'admin']), (req: Request, res: Response) => {
  const {
    societyId: reqSocId,
    nameBn,
    nameEn,
    shortName,
    regNo,
    address,
    district,
    upazila,
    phone,
    email,
    website,
    estDate,
    description,
    logoUrl,
    officialSignatureUrl,
    receiptFooter,
    monthlySubscriptionDefault,
    membershipFeeDefault,
    approvalWorkflow,
    selfRegistrationEnabled,
    geminiApiKey,
    geminiModel,
  } = req.body;

  const targetSocietyId = req.user!.role === 'super_admin'
    ? (Number(reqSocId) || req.user!.societyId || 1)
    : (req.user!.societyId || 1);

  // 1. Update societies table
  try {
    db.prepare(`
      UPDATE societies SET
        name_bn = COALESCE(?, name_bn),
        name_en = COALESCE(?, name_en),
        short_name = COALESCE(?, short_name),
        reg_no = COALESCE(?, reg_no),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        monthly_subscription_default = COALESCE(?, monthly_subscription_default),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      nameBn,
      nameEn,
      shortName,
      regNo,
      address,
      phone,
      email,
      monthlySubscriptionDefault ? Number(monthlySubscriptionDefault) : null,
      targetSocietyId
    );
  } catch (err) {
    console.error('Error updating societies table:', err);
  }

  // 2. If target is active/primary society (id: 1) or user's active society, sync society_settings
  if (targetSocietyId === 1 || req.user!.societyId === 1) {
    const oldSettings = db.prepare(`SELECT * FROM society_settings WHERE id = 1`).get();

    db.prepare(`
      UPDATE society_settings SET
        name_bn = COALESCE(?, name_bn),
        name_en = COALESCE(?, name_en),
        short_name = COALESCE(?, short_name),
        reg_no = COALESCE(?, reg_no),
        address = COALESCE(?, address),
        district = COALESCE(?, district),
        upazila = COALESCE(?, upazila),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        website = COALESCE(?, website),
        est_date = COALESCE(?, est_date),
        description = COALESCE(?, description),
        logo_url = COALESCE(?, logo_url),
        official_signature_url = COALESCE(?, official_signature_url),
        receipt_footer = COALESCE(?, receipt_footer),
        monthly_subscription_default = COALESCE(?, monthly_subscription_default),
        membership_fee_default = COALESCE(?, membership_fee_default),
        approval_workflow = COALESCE(?, approval_workflow),
        self_registration_enabled = COALESCE(?, self_registration_enabled),
        gemini_api_key = COALESCE(?, gemini_api_key),
        gemini_model = COALESCE(?, gemini_model),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      nameBn,
      nameEn,
      shortName,
      regNo,
      address,
      district,
      upazila,
      phone,
      email,
      website,
      estDate,
      description,
      logoUrl,
      officialSignatureUrl,
      receiptFooter,
      monthlySubscriptionDefault ? Number(monthlySubscriptionDefault) : null,
      membershipFeeDefault ? Number(membershipFeeDefault) : null,
      approvalWorkflow,
      selfRegistrationEnabled !== undefined ? (selfRegistrationEnabled ? 1 : 0) : null,
      geminiApiKey !== undefined ? geminiApiKey : null,
      geminiModel !== undefined ? geminiModel : null
    );

    AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'UPDATE_SOCIETY_SETTINGS',
      entityType: 'society_settings',
      entityId: targetSocietyId,
      oldValues: oldSettings,
      newValues: req.body,
    });
  }

  return res.json({ 
    success: true, 
    message: 'সোসাইটি প্রোফাইল, তথ্য ও সেটিংস সফলভাবে আপডেট হয়েছে।' 
  });
});

// GET /api/settings/backup (Download SQLite Database Backup)
router.get('/backup', authenticate, requireRole(['super_admin']), (req: Request, res: Response) => {
  const dbFile = path.resolve(process.cwd(), 'data', 'society.db');
  if (!fs.existsSync(dbFile)) {
    return res.status(404).json({ error: 'Database file not found.' });
  }

  const filename = `somobaypro-backup-${new Date().toISOString().slice(0, 10)}.db`;
  res.download(dbFile, filename);
});

// GET /api/settings/overview (Consolidated Executive Dashboard Metrics)
router.get('/overview', authenticate, requireRole(['super_admin', 'president', 'general_secretary', 'treasurer', 'admin', 'advisor']), (req: Request, res: Response) => {
  const memberStats = db.prepare(`
    SELECT 
      count(*) as total_members,
      COUNT(CASE WHEN membership_status = 'active' THEN 1 END) as active_members,
      COUNT(CASE WHEN membership_status = 'pending' THEN 1 END) as pending_members,
      COUNT(CASE WHEN membership_status = 'suspended' THEN 1 END) as suspended_members
    FROM members
  `).get() as any;

  const collectionStats = db.prepare(`
    SELECT 
      COALESCE(SUM(amount), 0) as total_approved_collection,
      COUNT(id) as total_receipts_issued
    FROM receipts
    WHERE status = 'valid'
  `).get() as any;

  const duesStats = db.prepare(`
    SELECT 
      COALESCE(SUM(due_amount - paid_amount), 0) as total_outstanding_dues
    FROM subscription_dues
    WHERE status != 'paid'
  `).get() as any;

  const pendingSubmissions = db.prepare(`
    SELECT 
      COUNT(id) as pending_submissions_count,
      COALESCE(SUM(amount), 0) as pending_submissions_amount
    FROM payment_submissions
    WHERE status IN ('pending', 'verified_by_treasurer')
  `).get() as any;

  const bankBalances = db.prepare(`
    SELECT COALESCE(SUM(current_balance), 0) as total_bank_balance
    FROM bank_accounts
    WHERE is_active = 1
  `).get() as any;

  const recentSubmissions = db.prepare(`
    SELECT ps.*, m.full_name_bn, m.mobile
    FROM payment_submissions ps
    JOIN members m ON ps.member_id = m.member_id
    ORDER BY ps.created_at DESC
    LIMIT 5
  `).all();

  const recentNotices = db.prepare(`
    SELECT * FROM notices WHERE is_published = 1 ORDER BY publish_date DESC LIMIT 5
  `).all();

  const openTicketsCount = (db.prepare(`
    SELECT count(*) as count FROM support_tickets WHERE status = 'open'
  `).get() as { count: number }).count;

  return res.json({
    memberStats,
    collectionStats,
    duesStats,
    pendingSubmissions,
    bankBalances,
    recentSubmissions,
    recentNotices,
    openTicketsCount,
  });
});

export default router;
