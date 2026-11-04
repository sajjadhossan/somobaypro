import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index';
import { generateToken, authenticate } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';

const router = Router();

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Mobile number or Member ID and password are required.' });
  }

  const cleanIdentifier = identifier.trim();

  // Find user by mobile or member_id
  const user = db.prepare(`
    SELECT u.*, m.full_name_bn, m.full_name_en, m.membership_status, m.membership_type, m.designation
    FROM users u
    LEFT JOIN members m ON u.member_id = m.member_id
    WHERE u.mobile = ? OR u.member_id = ?
  `).get(cleanIdentifier, cleanIdentifier) as any;

  if (!user) {
    AuditService.logLogin({
      identifierUsed: cleanIdentifier,
      ipAddress,
      userAgent,
      status: 'failed',
      failureReason: 'User not found',
    });
    return res.status(401).json({ error: 'Invalid credentials. Mobile or Member ID not found.' });
  }

  // Check if locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    AuditService.logLogin({
      userId: user.id,
      identifierUsed: cleanIdentifier,
      ipAddress,
      userAgent,
      status: 'locked',
      failureReason: 'Account temporarily locked due to failed attempts',
    });
    return res.status(403).json({ 
      error: `Account is temporarily locked due to multiple failed login attempts. Please try again after ${new Date(user.locked_until).toLocaleTimeString()}.` 
    });
  }

  // Check account status
  if (user.account_status !== 'active') {
    AuditService.logLogin({
      userId: user.id,
      identifierUsed: cleanIdentifier,
      ipAddress,
      userAgent,
      status: 'failed',
      failureReason: `Account status is ${user.account_status}`,
    });
    return res.status(403).json({ error: `Account is ${user.account_status}. Please contact the administrator.` });
  }

  // Verify password
  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    const failedAttempts = (user.failed_attempts || 0) + 1;
    let lockedUntil = null;
    
    // Lock after 5 consecutive failed attempts for 15 minutes
    if (failedAttempts >= 5) {
      const lockDate = new Date(Date.now() + 15 * 60 * 1000);
      lockedUntil = lockDate.toISOString();
    }

    db.prepare(`
      UPDATE users 
      SET failed_attempts = ?, locked_until = ? 
      WHERE id = ?
    `).run(failedAttempts, lockedUntil, user.id);

    AuditService.logLogin({
      userId: user.id,
      identifierUsed: cleanIdentifier,
      ipAddress,
      userAgent,
      status: 'failed',
      failureReason: `Incorrect password (Attempt ${failedAttempts})`,
    });

    if (failedAttempts >= 5) {
      return res.status(403).json({ 
        error: 'Too many failed login attempts. Your account has been temporarily locked for 15 minutes.' 
      });
    }

    return res.status(401).json({ 
      error: `Invalid password. Attempt ${failedAttempts} of 5 before lockout.` 
    });
  }

  // Successful login: reset failed attempts and record last login
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users 
    SET failed_attempts = 0, locked_until = NULL, last_login = ? 
    WHERE id = ?
  `).run(now, user.id);

  AuditService.logLogin({
    userId: user.id,
    identifierUsed: cleanIdentifier,
    ipAddress,
    userAgent,
    status: 'success',
  });

  AuditService.log({
    userId: user.id,
    userRole: user.role,
    userName: user.full_name_bn || user.member_id,
    ipAddress,
    action: 'USER_LOGIN',
    entityType: 'users',
    entityId: user.id,
  });

  let parsedPermissions: string[] = [];
  try {
    parsedPermissions = JSON.parse(user.permissions || '[]');
  } catch {
    parsedPermissions = [];
  }

  const authUser = {
    id: user.id,
    memberId: user.member_id,
    mobile: user.mobile,
    role: user.role,
    accountStatus: user.account_status,
    permissions: parsedPermissions,
    fullNameBn: user.full_name_bn,
    fullNameEn: user.full_name_en,
  };

  const token = generateToken(authUser);

  return res.json({
    token,
    user: {
      id: user.id,
      memberId: user.member_id,
      mobile: user.mobile,
      email: user.email,
      role: user.role,
      accountStatus: user.account_status,
      permissions: parsedPermissions,
      fullNameBn: user.full_name_bn,
      fullNameEn: user.full_name_en,
      membershipStatus: user.membership_status,
      membershipType: user.membership_type,
      designation: user.designation,
      lastLogin: now,
    },
  });
});

// POST /api/auth/register (Method B: Member Self-Registration)
router.post('/register', (req: Request, res: Response) => {
  const {
    fullNameBn,
    fullNameEn,
    fatherName,
    motherName,
    mobile,
    email,
    dob,
    nidNumber,
    presentAddress,
    permanentAddress,
    occupation,
    nomineeName,
    nomineeRelation,
    nomineeMobile,
    nomineeNid,
    emergencyName,
    emergencyRelation,
    emergencyMobile,
    password,
  } = req.body;

  if (!fullNameBn || !mobile || !password) {
    return res.status(400).json({ error: 'Full name, mobile number, and password are required.' });
  }

  // Check society self-registration setting
  const settings = db.prepare(`SELECT self_registration_enabled, monthly_subscription_default, membership_fee_default FROM society_settings WHERE id = 1`).get() as any;
  if (!settings.self_registration_enabled) {
    return res.status(403).json({ error: 'Online self-registration is currently disabled by administrator.' });
  }

  // Check duplicate mobile or NID
  const existingUser = db.prepare(`SELECT id FROM users WHERE mobile = ?`).get(mobile);
  if (existingUser) {
    return res.status(400).json({ error: 'This mobile number is already registered in the society.' });
  }

  if (nidNumber) {
    const existingNid = db.prepare(`SELECT id FROM members WHERE nid_number = ?`).get(nidNumber);
    if (existingNid) {
      return res.status(400).json({ error: 'This NID number is already associated with an existing member.' });
    }
  }

  // Generate unique Member ID: SOC-2026-XXXX
  const currentCountRow = db.prepare(`SELECT count(*) as count FROM members`).get() as { count: number };
  const memberId = `SOC-2026-${String(currentCountRow.count + 1).padStart(4, '0')}`;

  const passwordHash = bcrypt.hashSync(password, 10);
  const today = new Date().toISOString().split('T')[0];

  const transaction = db.transaction(() => {
    // Insert into members
    db.prepare(`
      INSERT INTO members (
        member_id, full_name_bn, full_name_en, father_name, mother_name, dob, nid_number,
        mobile, email, present_address, permanent_address, occupation, joining_date,
        membership_type, membership_fee, monthly_subscription_amount, designation,
        membership_status, nominee_name, nominee_relation, nominee_mobile, nominee_nid,
        emergency_name, emergency_relation, emergency_mobile
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'regular', ?, ?, 'সাধারণ সদস্য', 'pending', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      memberId,
      fullNameBn,
      fullNameEn || fullNameBn,
      fatherName || null,
      motherName || null,
      dob || null,
      nidNumber || null,
      mobile,
      email || null,
      presentAddress || null,
      permanentAddress || null,
      occupation || null,
      today,
      settings.membership_fee_default || 500,
      settings.monthly_subscription_default || 1000,
      nomineeName || null,
      nomineeRelation || null,
      nomineeMobile || null,
      nomineeNid || null,
      emergencyName || null,
      emergencyRelation || null,
      emergencyMobile || null
    );

    // Insert user account with activation_pending or active pending approval
    db.prepare(`
      INSERT INTO users (
        member_id, mobile, email, password_hash, role, account_status, permissions
      ) VALUES (?, ?, ?, ?, 'general_member', 'activation_pending', '[]')
    `).run(
      memberId,
      mobile,
      email || null,
      passwordHash
    );

    // Notify General Secretary and Admins
    NotificationService.broadcast(
      ['super_admin', 'admin', 'general_secretary'],
      'নতুন সদস্য নিবন্ধন আবেদন',
      `${fullNameBn} (${memberId}) সদস্যপদের জন্য আবেদন করেছেন। অনুমোদন পর্যালোচনা করুন।`,
      'info',
      '/admin/members'
    );

    AuditService.log({
      action: 'MEMBER_SELF_REGISTER',
      entityType: 'members',
      entityId: memberId,
      newValues: { memberId, fullNameBn, mobile },
    });
  });

  transaction();

  return res.status(201).json({
    message: 'Registration successful! Your application has been submitted for approval.',
    memberId,
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: Request, res: Response) => {
  const user = req.user!;
  
  const member = db.prepare(`
    SELECT * FROM members WHERE member_id = ?
  `).get(user.memberId) as any;

  const society = db.prepare(`SELECT * FROM society_settings WHERE id = 1`).get() as any;

  // Unread notifications count
  const unreadNotifs = db.prepare(`
    SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
  `).get(user.id) as { count: number };

  return res.json({
    user: {
      ...user,
      unreadNotificationsCount: unreadNotifs.count,
    },
    member,
    society,
  });
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both current password and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const user = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(req.user!.id) as { password_hash: string };
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newHash, req.user!.id);

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'PASSWORD_CHANGE',
    entityType: 'users',
    entityId: req.user!.id,
  });

  return res.json({ message: 'Password changed successfully.' });
});

export default router;
