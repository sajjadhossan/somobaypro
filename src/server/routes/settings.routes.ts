import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditService } from '../services/audit.service';

const router = Router();

// GET /api/settings (Society Profile & Branding)
router.get('/', (req: Request, res: Response) => {
  const settings = db.prepare(`SELECT * FROM society_settings WHERE id = 1`).get();
  return res.json({ settings });
});

// PUT /api/settings (Update Society Profile - Super Admin Only)
router.put('/', authenticate, requireRole(['super_admin']), (req: Request, res: Response) => {
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
  } = req.body;

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
    selfRegistrationEnabled !== undefined ? (selfRegistrationEnabled ? 1 : 0) : null
  );

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'UPDATE_SOCIETY_SETTINGS',
    entityType: 'society_settings',
    entityId: 1,
    oldValues: oldSettings,
    newValues: req.body,
  });

  return res.json({ message: 'Society profile and branding updated successfully.' });
});

// GET /api/settings/backup (Download SQLite Database Backup)
router.get('/backup', authenticate, requireRole(['super_admin']), (req: Request, res: Response) => {
  const dbFile = path.resolve(process.cwd(), 'data', 'society.db');
  if (!fs.existsSync(dbFile)) {
    return res.status(404).json({ error: 'Database file not found.' });
  }

  const filename = `society-backup-${new Date().toISOString().slice(0, 10)}.db`;
  res.download(dbFile, filename);
});

// GET /api/settings/overview (Consolidated Executive Dashboard Metrics)
router.get('/overview', authenticate, requireRole(['super_admin', 'president', 'general_secretary', 'treasurer', 'admin', 'advisor']), (req: Request, res: Response) => {
  // Members count
  const memberStats = db.prepare(`
    SELECT 
      count(*) as total_members,
      COUNT(CASE WHEN membership_status = 'active' THEN 1 END) as active_members,
      COUNT(CASE WHEN membership_status = 'pending' THEN 1 END) as pending_members,
      COUNT(CASE WHEN membership_status = 'suspended' THEN 1 END) as suspended_members
    FROM members
  `).get() as any;

  // Subscriptions & Collections
  const collectionStats = db.prepare(`
    SELECT 
      COALESCE(SUM(amount), 0) as total_approved_collection,
      COUNT(id) as total_receipts_issued
    FROM receipts
    WHERE status = 'valid'
  `).get() as any;

  // Dues
  const duesStats = db.prepare(`
    SELECT 
      COALESCE(SUM(due_amount - paid_amount), 0) as total_outstanding_dues
    FROM subscription_dues
    WHERE status != 'paid'
  `).get() as any;

  // Pending Deposit Submissions
  const pendingSubmissions = db.prepare(`
    SELECT 
      COUNT(id) as pending_submissions_count,
      COALESCE(SUM(amount), 0) as pending_submissions_amount
    FROM payment_submissions
    WHERE status IN ('pending', 'verified_by_treasurer')
  `).get() as any;

  // Total Bank Balances
  const bankBalances = db.prepare(`
    SELECT COALESCE(SUM(current_balance), 0) as total_bank_balance
    FROM bank_accounts
    WHERE is_active = 1
  `).get() as any;

  // Recent Submissions
  const recentSubmissions = db.prepare(`
    SELECT ps.*, m.full_name_bn, m.mobile
    FROM payment_submissions ps
    JOIN members m ON ps.member_id = m.member_id
    ORDER BY ps.created_at DESC
    LIMIT 5
  `).all();

  // Recent Notices
  const recentNotices = db.prepare(`
    SELECT * FROM notices WHERE is_published = 1 ORDER BY publish_date DESC LIMIT 5
  `).all();

  // Open Support Tickets
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
