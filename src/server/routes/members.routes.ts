import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { db } from '../db/index';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';

const router = Router();

// Multer storage for member profile photos
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `member-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('শুধুমাত্র ছবি ফাইল অনুমোদিত।'));
    }
  },
});

// GET /api/members (List all members with filters)
router.get('/', authenticate, (req: Request, res: Response) => {
  const { status, type, search, limit = 100, offset = 0 } = req.query;

  let query = `
    SELECT m.*, u.role, u.account_status,
      (SELECT COALESCE(SUM(due_amount - paid_amount), 0) FROM subscription_dues WHERE member_id = m.member_id AND status != 'paid') as total_dues,
      (SELECT COALESCE(SUM(amount), 0) FROM receipts WHERE member_id = m.member_id AND status = 'valid') as total_paid
    FROM members m
    LEFT JOIN users u ON m.member_id = u.member_id
    WHERE 1=1
  `;
  const params: any[] = [];

  // General Members can only view the member directory in a limited way (or Advisors / Officials see full directory)
  if (req.user!.role === 'general_member') {
    // Limited public member directory (hide sensitive NID, emergency contacts)
    query = `
      SELECT m.member_id, m.full_name_bn, m.full_name_en, m.photo_url, m.designation, m.membership_type, m.joining_date, m.membership_status
      FROM members m
      WHERE m.membership_status = 'active'
    `;
  } else {
    if (status) {
      query += ` AND m.membership_status = ?`;
      params.push(status);
    }
    if (type) {
      query += ` AND m.membership_type = ?`;
      params.push(type);
    }
    if (search) {
      query += ` AND (m.full_name_bn LIKE ? OR m.full_name_en LIKE ? OR m.member_id LIKE ? OR m.mobile LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }
  }

  query += ` ORDER BY m.member_id ASC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const members = db.prepare(query).all(...params);
  const totalCount = (db.prepare(`SELECT count(*) as count FROM members`).get() as { count: number }).count;

  return res.json({ members, totalCount });
});

// GET /api/members/me/passbook (Digital Member Savings Passbook & Statement)
router.get('/me/passbook', authenticate, (req: Request, res: Response) => {
  const memberId = req.user!.role === 'general_member' 
    ? req.user!.memberId 
    : ((req.query.memberId as string) || req.user!.memberId);

  const member = db.prepare(`SELECT * FROM members WHERE member_id = ?`).get(memberId) as any;
  if (!member) return res.status(404).json({ error: 'সদস্য পাওয়া যায়নি।' });

  // Get all approved receipts for this member ordered chronologically
  const receipts = db.prepare(`
    SELECT r.*, ps.deposit_date, ps.transaction_id, ps.member_bank_name
    FROM receipts r
    LEFT JOIN payment_submissions ps ON r.payment_submission_id = ps.id
    WHERE r.member_id = ? AND r.status = 'valid'
    ORDER BY r.deposit_date ASC, r.id ASC
  `).all(memberId) as any[];

  let runningBalance = 0;
  const ledger = receipts.map((r, index) => {
    runningBalance += Number(r.amount);
    return {
      sl: index + 1,
      id: r.id,
      receiptNumber: r.receipt_number,
      paymentMonths: r.payment_months,
      depositDate: r.deposit_date || (r.issued_at ? r.issued_at.split('T')[0] : ''),
      bankName: r.bank_name,
      accountNumber: r.account_number,
      transactionId: r.transaction_id,
      depositorName: r.depositor_name || member.full_name_bn,
      amount: Number(r.amount),
      runningBalance: runningBalance,
      verificationToken: r.verification_token,
      issuedAt: r.issued_at,
    };
  });

  // Calculate dues
  const duesRow = db.prepare(`
    SELECT 
      COALESCE(SUM(due_amount), 0) as total_obligated,
      COALESCE(SUM(paid_amount), 0) as total_cleared,
      COALESCE(SUM(due_amount - paid_amount), 0) as total_due
    FROM subscription_dues
    WHERE member_id = ?
  `).get(memberId) as any;

  return res.json({
    member,
    ledger,
    summary: {
      totalSavings: runningBalance,
      totalDue: duesRow?.total_due || 0,
      totalEntries: ledger.length,
      currentMonthlyRate: member.monthly_subscription_amount || 1000,
    }
  });
});

// POST /api/members/me/photo (Self-KYC Profile Photo Upload)
router.post('/me/photo', authenticate, uploadPhoto.single('photo'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'ছবি প্রদান করা আবশ্যক।' });
  }

  const memberId = req.user!.memberId;
  const photoUrl = `/uploads/${req.file.filename}`;

  db.prepare(`
    UPDATE members 
    SET photo_url = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE member_id = ?
  `).run(photoUrl, memberId);

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'UPDATE_PROFILE_PHOTO',
    entityType: 'members',
    entityId: memberId,
    newValues: { photoUrl },
  });

  return res.json({ message: 'প্রোফাইল ছবি সফলভাবে আপডেট করা হয়েছে।', photoUrl });
});

// POST /api/members/me/nominee (Self-KYC Nominee Details Update)
router.post('/me/nominee', authenticate, (req: Request, res: Response) => {
  const memberId = req.user!.memberId;
  const { nomineeName, nomineeRelation, nomineeNid, nomineeMobile } = req.body;

  if (!nomineeName || !nomineeRelation) {
    return res.status(400).json({ error: 'নমিনির নাম এবং সম্পর্ক আবশ্যক।' });
  }

  db.prepare(`
    UPDATE members 
    SET nominee_name = ?, nominee_relation = ?, nominee_nid = ?, nominee_mobile = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE member_id = ?
  `).run(nomineeName.trim(), nomineeRelation.trim(), nomineeNid?.trim() || null, nomineeMobile?.trim() || null, memberId);

  return res.json({ message: 'নমিনির তথ্য সফলভাবে সংরক্ষিত হয়েছে।' });
});

// GET /api/members/:memberId (Single member profile)
router.get('/:memberId', authenticate, (req: Request, res: Response) => {
  const { memberId } = req.params;

  // General members can only view their own full profile
  if (req.user!.role === 'general_member' && req.user!.memberId !== memberId) {
    return res.status(403).json({ error: 'You are only authorized to view your own member profile.' });
  }

  const member = db.prepare(`
    SELECT m.*, u.role, u.account_status, u.last_login
    FROM members m
    LEFT JOIN users u ON m.member_id = u.member_id
    WHERE m.member_id = ?
  `).get(memberId) as any;

  if (!member) {
    return res.status(404).json({ error: 'Member not found.' });
  }

  // Get dues summary
  const dues = db.prepare(`
    SELECT * FROM subscription_dues 
    WHERE member_id = ? 
    ORDER BY billing_month DESC
  `).all(memberId);

  // Get approved receipts
  const receipts = db.prepare(`
    SELECT * FROM receipts 
    WHERE member_id = ? 
    ORDER BY issued_at DESC
  `).all(memberId);

  // Get pending submissions
  const pendingSubmissions = db.prepare(`
    SELECT * FROM payment_submissions 
    WHERE member_id = ? 
    ORDER BY created_at DESC
  `).all(memberId);

  return res.json({
    member,
    dues,
    receipts,
    pendingSubmissions,
  });
});

// POST /api/members (Dynamic Permission: Super Admin configures authorized roles: Admin, President, Secretary, Treasurer)
router.post('/', authenticate, (req: Request, res: Response) => {
  // Check dynamic role permission configured by Super Admin
  const settings = db.prepare(`SELECT member_creation_allowed_roles FROM society_settings WHERE id = 1`).get() as any;
  let allowedRoles: string[] = ['super_admin', 'admin', 'president', 'treasurer'];
  try {
    if (settings?.member_creation_allowed_roles) {
      allowedRoles = JSON.parse(settings.member_creation_allowed_roles);
    }
  } catch {
    allowedRoles = ['super_admin'];
  }

  // Super Admin always has full access
  if (req.user!.role !== 'super_admin' && !allowedRoles.includes(req.user!.role)) {
    return res.status(403).json({
      error: `অনুমতি নেই। নতুন সদস্য যুক্ত করার ক্ষমতা শুধুমাত্র সুপার এডমিন কর্তৃক অনুমোদিত কর্মকর্তাদের (${allowedRoles.join(', ')}) হাতে ন্যস্ত।`,
    });
  }
  const {
    fullNameBn,
    fullNameEn,
    fatherName,
    motherName,
    dob,
    gender = 'male',
    nidNumber,
    mobile,
    altMobile,
    email,
    presentAddress,
    permanentAddress,
    occupation,
    joiningDate,
    membershipType = 'regular',
    membershipFee = 500,
    monthlySubscriptionAmount = 1000,
    designation = 'সাধারণ সদস্য',
    role = 'general_member',
    nomineeName,
    nomineeRelation,
    nomineeMobile,
    nomineeNid,
    emergencyName,
    emergencyRelation,
    emergencyMobile,
    initialPassword = 'pkss' + mobile.slice(-4),
  } = req.body;

  if (!fullNameBn || !mobile) {
    return res.status(400).json({ error: 'Full name and mobile number are required.' });
  }

  const existingMobile = db.prepare(`SELECT id FROM users WHERE mobile = ?`).get(mobile);
  if (existingMobile) {
    return res.status(400).json({ error: 'Mobile number is already registered.' });
  }

  const countRow = db.prepare(`SELECT count(*) as count FROM members`).get() as { count: number };
  const memberId = `SOC-2026-${String(countRow.count + 1).padStart(4, '0')}`;
  const effectiveJoiningDate = joiningDate || new Date().toISOString().split('T')[0];
  const passwordHash = bcrypt.hashSync(initialPassword, 10);

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO members (
        member_id, full_name_bn, full_name_en, father_name, mother_name, dob, gender,
        nid_number, mobile, alt_mobile, email, present_address, permanent_address,
        occupation, joining_date, membership_type, membership_fee, monthly_subscription_amount,
        designation, membership_status, nominee_name, nominee_relation, nominee_mobile,
        nominee_nid, emergency_name, emergency_relation, emergency_mobile, approved_by, approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      memberId,
      fullNameBn,
      fullNameEn || fullNameBn,
      fatherName || null,
      motherName || null,
      dob || null,
      gender,
      nidNumber || null,
      mobile,
      altMobile || null,
      email || null,
      presentAddress || null,
      permanentAddress || null,
      occupation || null,
      effectiveJoiningDate,
      membershipType,
      Number(membershipFee),
      Number(monthlySubscriptionAmount),
      designation,
      nomineeName || null,
      nomineeRelation || null,
      nomineeMobile || null,
      nomineeNid || null,
      emergencyName || null,
      emergencyRelation || null,
      emergencyMobile || null,
      req.user!.memberId
    );

    // Create user account
    db.prepare(`
      INSERT INTO users (
        member_id, mobile, email, password_hash, role, account_status, permissions
      ) VALUES (?, ?, ?, ?, ?, 'active', '[]')
    `).run(
      memberId,
      mobile,
      email || null,
      passwordHash,
      role
    );

    // Automatically generate first month's due
    const currentMonth = new Date().toISOString().slice(0, 7);
    db.prepare(`
      INSERT OR IGNORE INTO subscription_dues (member_id, billing_month, due_amount, paid_amount, status, due_date)
      VALUES (?, ?, ?, 0, 'unpaid', ?)
    `).run(memberId, currentMonth, Number(monthlySubscriptionAmount), `${currentMonth}-15`);

    AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      userName: req.user!.fullNameBn,
      action: 'ADMIN_CREATE_MEMBER',
      entityType: 'members',
      entityId: memberId,
      newValues: { memberId, fullNameBn, mobile, role },
    });
  });

  transaction();

  return res.status(201).json({
    message: 'Member created successfully.',
    memberId,
    initialPassword,
  });
});

// PATCH /api/members/:memberId/status (Approve/Suspend/Activate)
router.patch('/:memberId/status', authenticate, requireRole(['super_admin', 'admin', 'general_secretary', 'president']), (req: Request, res: Response) => {
  const { memberId } = req.params;
  const { status, remarks } = req.body;

  const validStatuses = ['pending', 'active', 'suspended', 'inactive', 'resigned', 'terminated'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const member = db.prepare(`SELECT * FROM members WHERE member_id = ?`).get(memberId) as any;
  if (!member) {
    return res.status(404).json({ error: 'Member not found.' });
  }

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE members 
      SET membership_status = ?, remarks = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE member_id = ?
    `).run(status, remarks || null, req.user!.memberId, memberId);

    // Sync account status
    const accountStatus = status === 'active' ? 'active' : status === 'suspended' ? 'suspended' : 'deactivated';
    db.prepare(`
      UPDATE users 
      SET account_status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE member_id = ?
    `).run(accountStatus, memberId);

    // If activated, generate current month subscription if not exists
    if (status === 'active') {
      const currentMonth = new Date().toISOString().slice(0, 7);
      db.prepare(`
        INSERT OR IGNORE INTO subscription_dues (member_id, billing_month, due_amount, paid_amount, status, due_date)
        VALUES (?, ?, ?, 0, 'unpaid', ?)
      `).run(memberId, currentMonth, member.monthly_subscription_amount || 1000, `${currentMonth}-15`);
    }

    // Send in-app notification to member
    NotificationService.notifyMember(
      memberId,
      'সদস্যপদ স্ট্যাটাস আপডেট',
      `আপনার সদস্যপদ স্ট্যাটাস পরিবর্তিত হয়ে '${status}' করা হয়েছে।`,
      status === 'active' ? 'success' : 'warning',
      '/member/profile'
    );

    AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'MEMBER_STATUS_UPDATE',
      entityType: 'members',
      entityId: memberId,
      oldValues: { status: member.membership_status },
      newValues: { status, remarks },
    });
  });

  transaction();

  return res.json({ message: `Member ${memberId} status successfully updated to ${status}.` });
});

export default router;
