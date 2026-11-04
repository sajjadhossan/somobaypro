import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { db } from '../db/index';
import { authenticate, requireRole } from '../middleware/auth';
import { AccountingService } from '../services/accounting.service';
import { AuditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';
import { BackupService } from '../services/backup.service';
import { RealtimeService } from '../services/realtime.service';

const router = Router();

// Multer storage configuration for deposit slips
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'slip-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WEBP, and PDF files are allowed for deposit slips.'));
    }
  },
});

// GET /api/payments/bank-accounts
router.get('/bank-accounts', authenticate, (req: Request, res: Response) => {
  const accounts = db.prepare(`SELECT * FROM bank_accounts WHERE is_active = 1 ORDER BY is_primary DESC, id ASC`).all();
  return res.json({ accounts });
});

// POST /api/payments/bank-accounts (Admin creates bank account)
router.post('/bank-accounts', authenticate, requireRole(['super_admin', 'treasurer']), (req: Request, res: Response) => {
  const { bankName, branchName, accountName, accountNumber, accountType, routingNumber, openingBalance, isPrimary, description } = req.body;

  if (!bankName || !accountNumber || !accountName) {
    return res.status(400).json({ error: 'Bank name, account number, and account name are required.' });
  }

  const transaction = db.transaction(() => {
    if (isPrimary) {
      db.prepare(`UPDATE bank_accounts SET is_primary = 0`).run();
    }

    const result = db.prepare(`
      INSERT INTO bank_accounts (
        bank_name, branch_name, account_name, accountNumber, account_type, routing_number, opening_balance, current_balance, is_primary, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bankName,
      branchName || '',
      accountName,
      accountNumber,
      accountType || 'Current',
      routingNumber || null,
      Number(openingBalance) || 0,
      Number(openingBalance) || 0,
      isPrimary ? 1 : 0,
      description || null
    );

    AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'CREATE_BANK_ACCOUNT',
      entityType: 'bank_accounts',
      entityId: result.lastInsertRowid,
      newValues: { bankName, accountNumber },
    });
  });

  transaction();

  return res.status(201).json({ message: 'Bank account added successfully.' });
});

// GET /api/payments/depositors (List saved depositors for a member)
router.get('/depositors', authenticate, (req: Request, res: Response) => {
  const memberId = req.user!.role === 'general_member' ? req.user!.memberId : ((req.query.memberId as string) || req.user!.memberId);
  const depositors = db.prepare(`
    SELECT * FROM member_depositors 
    WHERE member_id = ? 
    ORDER BY is_default DESC, last_used_at DESC, id DESC
  `).all(memberId);
  return res.json({ depositors });
});

// POST /api/payments/depositors (Create or update saved depositor profile)
router.post('/depositors', authenticate, (req: Request, res: Response) => {
  const { depositorName, depositorRelation, depositorNid, depositorMobile, isDefault } = req.body;
  const memberId = req.user!.role === 'general_member' ? req.user!.memberId : (req.body.memberId || req.user!.memberId);

  if (!depositorName || !depositorRelation) {
    return res.status(400).json({ error: 'জমাদানকারীর নাম এবং সম্পর্ক আবশ্যক।' });
  }

  const existing = db.prepare(`
    SELECT id FROM member_depositors 
    WHERE member_id = ? AND depositor_name = ?
  `).get(memberId, depositorName.trim()) as any;

  if (existing) {
    db.prepare(`
      UPDATE member_depositors 
      SET depositor_relation = ?, depositor_nid = ?, depositor_mobile = ?, is_default = ?, last_used_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(depositorRelation.trim(), depositorNid?.trim() || null, depositorMobile?.trim() || null, isDefault ? 1 : 0, existing.id);
    return res.json({ message: 'জমাদানকারীর তথ্য আপডেট করা হয়েছে।' });
  } else {
    db.prepare(`
      INSERT INTO member_depositors (member_id, depositor_name, depositor_relation, depositor_nid, depositor_mobile, is_default)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(memberId, depositorName.trim(), depositorRelation.trim(), depositorNid?.trim() || null, depositorMobile?.trim() || null, isDefault ? 1 : 0);
    return res.status(201).json({ message: 'নতুন জমাদানকারী সেভ করা হয়েছে।' });
  }
});

// DELETE /api/payments/depositors/:id
router.delete('/depositors/:id', authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const memberId = req.user!.memberId;

  if (req.user!.role === 'general_member') {
    db.prepare(`DELETE FROM member_depositors WHERE id = ? AND member_id = ?`).run(id, memberId);
  } else {
    db.prepare(`DELETE FROM member_depositors WHERE id = ?`).run(id);
  }
  return res.json({ message: 'জমাদানকারী মুছে ফেলা হয়েছে।' });
});

// GET /api/payments/submissions
router.get('/submissions', authenticate, (req: Request, res: Response) => {
  const { status, memberId } = req.query;

  let query = `
    SELECT ps.*, 
      m.full_name_bn, m.full_name_en, m.mobile,
      ba.bank_name as society_bank_name, ba.account_number as society_account_number,
      r.receipt_number, r.verification_token
    FROM payment_submissions ps
    JOIN members m ON ps.member_id = m.member_id
    JOIN bank_accounts ba ON ps.society_bank_account_id = ba.id
    LEFT JOIN receipts r ON ps.id = r.payment_submission_id
    WHERE 1=1
  `;
  const params: any[] = [];

  // General Members only see their own submissions
  if (req.user!.role === 'general_member') {
    query += ` AND ps.member_id = ?`;
    params.push(req.user!.memberId);
  } else {
    if (memberId) {
      query += ` AND ps.member_id = ?`;
      params.push(memberId);
    }
  }

  if (status) {
    query += ` AND ps.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY ps.created_at DESC`;

  const submissions = db.prepare(query).all(...params);
  return res.json({ submissions });
});

// POST /api/payments/submissions (Member or family representative submits deposit slip)
router.post('/submissions', authenticate, upload.single('slip'), (req: Request, res: Response) => {
  const { 
    amount, paymentMonths, societyBankAccountId, memberBankName, memberBranchName, 
    depositDate, transactionId, notes,
    depositorType, depositorName, depositorRelation, depositorNid, depositorMobile, saveDepositor,
    memberId: targetMemberId
  } = req.body;

  const isOfficialUser = ['super_admin', 'treasurer', 'president', 'admin'].includes(req.user!.role);
  const memberId = (isOfficialUser && targetMemberId) ? targetMemberId.trim() : req.user!.memberId;

  if (!amount || !paymentMonths || !societyBankAccountId || !depositDate || !transactionId) {
    return res.status(400).json({ error: 'Amount, payment months, society bank account, deposit date, and bank transaction ID are required.' });
  }

  // Prevent duplicate transaction ID submission
  const existingTx = db.prepare(`
    SELECT id, submission_number FROM payment_submissions 
    WHERE transaction_id = ? AND status != 'rejected'
  `).get(transactionId.trim());

  if (existingTx) {
    return res.status(400).json({ error: `This transaction ID / slip number has already been submitted under submission ${(existingTx as any).submission_number}.` });
  }

  // Lookup target member
  const memberRecord = db.prepare(`SELECT full_name_bn, mobile, nid_number FROM members WHERE member_id = ?`).get(memberId) as any;

  // Determine effective depositor details
  const effectiveType = depositorType === 'family_member' || depositorType === 'representative' ? depositorType : 'self';
  const effectiveDepositorName = depositorName?.trim() || memberRecord?.full_name_bn || req.user!.fullNameBn || memberId;
  const effectiveDepositorRelation = depositorRelation?.trim() || (effectiveType === 'self' ? 'নিজ' : 'পরিবারের সদস্য');
  const effectiveDepositorNid = depositorNid?.trim() || (effectiveType === 'self' ? memberRecord?.nid_number : null);
  const effectiveDepositorMobile = depositorMobile?.trim() || (effectiveType === 'self' ? memberRecord?.mobile : null);

  // Auto-save depositor profile if requested or if family member details provided
  if ((saveDepositor === 'true' || saveDepositor === true || saveDepositor === '1') && effectiveDepositorName) {
    try {
      const existingDep = db.prepare(`SELECT id FROM member_depositors WHERE member_id = ? AND depositor_name = ?`).get(memberId, effectiveDepositorName) as any;
      if (existingDep) {
        db.prepare(`
          UPDATE member_depositors 
          SET depositor_relation = ?, depositor_nid = ?, depositor_mobile = ?, last_used_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(effectiveDepositorRelation, effectiveDepositorNid, effectiveDepositorMobile, existingDep.id);
      } else {
        db.prepare(`
          INSERT INTO member_depositors (member_id, depositor_name, depositor_relation, depositor_nid, depositor_mobile)
          VALUES (?, ?, ?, ?, ?)
        `).run(memberId, effectiveDepositorName, effectiveDepositorRelation, effectiveDepositorNid, effectiveDepositorMobile);
      }
    } catch (e) {
      console.error('Error saving depositor profile:', e);
    }
  }

  const countRow = db.prepare(`SELECT count(*) as count FROM payment_submissions`).get() as { count: number };
  const submissionNumber = `SUB-2026-${String(countRow.count + 1).padStart(5, '0')}`;
  const slipImageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db.prepare(`
    INSERT INTO payment_submissions (
      submission_number, member_id, amount, payment_months, society_bank_account_id,
      member_bank_name, member_branch_name, deposit_date, transaction_id, slip_image_url,
      depositor_type, depositor_name, depositor_relation, depositor_nid, depositor_mobile,
      notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    submissionNumber,
    memberId,
    Number(amount),
    paymentMonths,
    Number(societyBankAccountId),
    memberBankName || null,
    memberBranchName || null,
    depositDate,
    transactionId.trim(),
    slipImageUrl,
    effectiveType,
    effectiveDepositorName,
    effectiveDepositorRelation,
    effectiveDepositorNid,
    effectiveDepositorMobile,
    notes || null
  );

  // Notify Treasurer and Cashier with depositor information
  const depositorNotice = effectiveType === 'self' 
    ? `সদস্য ${req.user!.fullNameBn || memberId}` 
    : `সদস্য ${req.user!.fullNameBn || memberId}-এর পক্ষে ${effectiveDepositorName} (${effectiveDepositorRelation})`;

  NotificationService.broadcast(
    ['treasurer', 'super_admin', 'admin'],
    'নতুন ব্যাংক জমা সাবমিশন',
    `${depositorNotice} ৳${amount} টাকা জমার তথ্য দাখিল করেছেন (আইডি: ${submissionNumber})। যাচাই করুন।`,
    'info',
    '/admin/payments'
  );

  // Instant real-time multi-device sync
  RealtimeService.sendToRole(
    ['treasurer', 'super_admin', 'admin', 'president'],
    'PAYMENT_SUBMITTED',
    {
      submissionNumber,
      memberId,
      amount: Number(amount),
      depositorName: effectiveDepositorName,
      message: `${depositorNotice} ৳${amount} টাকা জমার তথ্য দাখিল করেছেন (আইডি: ${submissionNumber})।`,
    }
  );
  RealtimeService.broadcast('DATA_REFRESH', { entity: 'submissions', memberId });

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    userName: req.user!.fullNameBn,
    action: 'SUBMIT_BANK_DEPOSIT',
    entityType: 'payment_submissions',
    entityId: result.lastInsertRowid,
    newValues: { submissionNumber, memberId, amount, transactionId, depositorName: effectiveDepositorName, depositorRelation: effectiveDepositorRelation },
  });

  return res.status(201).json({
    message: 'Deposit submission received. It is now Pending Verification by the Treasurer.',
    submissionNumber,
  });
});

// PATCH /api/payments/submissions/:id/verify (Treasurer checks slip with bank)
router.patch('/submissions/:id/verify', authenticate, requireRole(['super_admin', 'treasurer']), (req: Request, res: Response) => {
  const { id } = req.params;
  const submission = db.prepare(`SELECT * FROM payment_submissions WHERE id = ?`).get(id) as any;

  if (!submission) {
    return res.status(404).json({ error: 'Payment submission not found.' });
  }

  if (submission.status !== 'pending') {
    return res.status(400).json({ error: `Submission is already in '${submission.status}' status.` });
  }

  db.prepare(`
    UPDATE payment_submissions 
    SET status = 'verified_by_treasurer', verified_by_treasurer_id = ?, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.user!.memberId, id);

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'VERIFY_DEPOSIT_SLIP',
    entityType: 'payment_submissions',
    entityId: id,
  });

  // Real-time notification & multi-device sync
  RealtimeService.broadcast('DATA_REFRESH', { entity: 'submissions', id });

  return res.json({ message: 'Deposit slip verified successfully. Ready for final approval.' });
});

// PATCH /api/payments/submissions/:id/approve (Final Approval + Receipt Generation + Double-Entry Journal)
router.patch('/submissions/:id/approve', authenticate, requireRole(['super_admin', 'treasurer', 'president', 'admin']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const submission = db.prepare(`
    SELECT ps.*, ba.bank_name as society_bank_name, ba.account_number as society_account_number, m.full_name_bn, m.full_name_en
    FROM payment_submissions ps
    JOIN bank_accounts ba ON ps.society_bank_account_id = ba.id
    JOIN members m ON ps.member_id = m.member_id
    WHERE ps.id = ?
  `).get(id) as any;

  if (!submission) {
    return res.status(404).json({ error: 'Payment submission not found.' });
  }

  if (submission.status === 'approved') {
    return res.status(400).json({ error: 'Payment has already been approved.' });
  }

  // Generate Receipt Number: RCP-2026-XXXXXX
  const receiptCountRow = db.prepare(`SELECT count(*) as count FROM receipts`).get() as { count: number };
  const receiptNumber = `RCP-2026-${String(receiptCountRow.count + 1).padStart(6, '0')}`;
  
  const effectiveDepositorName = submission.depositor_name || submission.full_name_bn;
  const effectiveDepositorRelation = submission.depositor_relation || 'নিজ';
  const effectiveDepositorNid = submission.depositor_nid || '';
  const effectiveDepositorMobile = submission.depositor_mobile || '';

  // Cryptographically secure verification token
  const verificationToken = crypto.randomBytes(24).toString('hex');
  const verificationUrl = `${req.protocol}://${req.get('host')}/verify/${receiptNumber}?token=${verificationToken}`;

  // Self-Contained Offline Verification Payload (scannable by any mobile camera even without internet)
  const offlineQrPayload = 
`🛡️ প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড (REG-DH-2018-0942)
━━━━━━━━━━━━━━━━━━━━━━
✅ অফিশিয়াল অনুমোদিত রসিদ (100% Verified)
📄 রসিদ নং: ${receiptNumber}
👤 সদস্য: ${submission.full_name_bn} (${submission.member_id})
👥 জমাদানকারী: ${effectiveDepositorName} (${effectiveDepositorRelation})
💰 জমার পরিমাণ: ৳${Number(submission.amount).toLocaleString('bn-BD')} (${submission.payment_months})
🏦 ব্যাংক: ${submission.society_bank_name || 'সোনালী ব্যাংক পিএলসি'}
📅 জমা তারিখ: ${submission.deposit_date}
✍️ অনুমোদনকারী: কোষাধ্যক্ষ ও সভাপতি
🔐 সিকিউরিটি টোকেন: ${verificationToken}
🌐 অনলাইন সত্যতা যাচাই: ${verificationUrl}`;

  // Generate QR code data URL (Works offline & online)
  const qrCodeData = await QRCode.toDataURL(offlineQrPayload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
  });

  const transaction = db.transaction(() => {
    // 1. Update Payment Submission status to approved
    db.prepare(`
      UPDATE payment_submissions 
      SET status = 'approved', approved_by_id = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user!.memberId, id);

    // 2. Insert Official Digital Receipt with Depositor details

    db.prepare(`
      INSERT INTO receipts (
        receipt_number, payment_submission_id, member_id, amount, payment_months,
        bank_name, account_number, deposit_date, transaction_id,
        depositor_name, depositor_relation, depositor_nid, depositor_mobile,
        verification_token, qr_code_data, status, issued_by_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid', ?)
    `).run(
      receiptNumber,
      submission.id,
      submission.member_id,
      submission.amount,
      submission.payment_months,
      submission.society_bank_name,
      submission.society_account_number,
      submission.deposit_date,
      submission.transaction_id,
      effectiveDepositorName,
      effectiveDepositorRelation,
      effectiveDepositorNid,
      effectiveDepositorMobile,
      verificationToken,
      qrCodeData,
      req.user!.memberId
    );

    // 3. Update Bank Account Balance
    db.prepare(`
      UPDATE bank_accounts 
      SET current_balance = current_balance + ? 
      WHERE id = ?
    `).run(submission.amount, submission.society_bank_account_id);

    // 4. Update Member Dues for the specified payment month(s)
    const months = submission.payment_months.split(',').map((m: string) => m.trim());
    let remainingAmountToCredit = submission.amount;

    for (const month of months) {
      if (remainingAmountToCredit <= 0) break;

      const dueRecord = db.prepare(`
        SELECT * FROM subscription_dues 
        WHERE member_id = ? AND billing_month = ?
      `).get(submission.member_id, month) as any;

      if (dueRecord) {
        const needed = dueRecord.due_amount - dueRecord.paid_amount;
        const toPay = Math.min(remainingAmountToCredit, needed);
        const newPaid = dueRecord.paid_amount + toPay;
        const newStatus = newPaid >= dueRecord.due_amount ? 'paid' : 'partially_paid';

        db.prepare(`
          UPDATE subscription_dues 
          SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(newPaid, newStatus, dueRecord.id);

        remainingAmountToCredit -= toPay;
      } else {
        // If due was not explicitly generated beforehand, create it as paid
        const monthlyRate = Math.min(remainingAmountToCredit, 1000);
        db.prepare(`
          INSERT INTO subscription_dues (member_id, billing_month, due_amount, paid_amount, status, due_date)
          VALUES (?, ?, ?, ?, 'paid', ?)
        `).run(submission.member_id, month, monthlyRate, monthlyRate, `${month}-15`);
        remainingAmountToCredit -= monthlyRate;
      }
    }
  });

  // Execute database updates
  transaction();

  // 5. Post Double-Entry Accounting Journal Entry (manages its own atomic transaction):
  // Debit: Bank Account (Code 1020)
  // Credit: Member Subscription Revenue (Code 4010)
  AccountingService.postJournalEntry({
    entryDate: submission.deposit_date,
    referenceType: 'payment',
    referenceId: receiptNumber,
    description: `সদস্য চাঁদা প্রাপ্তি - ${submission.full_name_bn} (${submission.member_id}), মাস: ${submission.payment_months}, রসিদ: ${receiptNumber}`,
    lines: [
      { accountCode: '1020', debit: submission.amount, credit: 0, description: `ব্যাংক জমা - ${submission.society_bank_name}` },
      { accountCode: '4010', debit: 0, credit: submission.amount, description: `মাসিক চাঁদা আয় (${submission.member_id})` },
    ],
    createdBy: req.user!.memberId,
  });

  // 6. Notify Member with Receipt Link
  NotificationService.notifyMember(
    submission.member_id,
    'পেমেন্ট অনুমোদিত ও ডিজিটাল রসিদ প্রস্তুত',
    `আপনার ৳${submission.amount} টাকার জমা অনুমোদিত হয়েছে। ডিজিটাল রসিদ নং: ${receiptNumber}`,
    'success',
    `/member/receipts`
  );

  // Real-time instant notification to member's phone & all admin devices
  RealtimeService.sendToUser(submission.member_id, 'PAYMENT_APPROVED', {
    receiptNumber,
    amount: submission.amount,
    title: 'পেমেন্ট অনুমোদিত হয়েছে! 🎉',
    message: `আপনার ৳${submission.amount} টাকার জমা অনুমোদিত হয়েছে। ডিজিটাল রসিদ নং: ${receiptNumber}`,
    timestamp: new Date().toISOString(),
  });
  RealtimeService.broadcast('DATA_REFRESH', { entity: 'payments', receiptNumber, memberId: submission.member_id });

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'APPROVE_PAYMENT',
    entityType: 'payment_submissions',
    entityId: id,
    newValues: { receiptNumber, amount: submission.amount, memberId: submission.member_id },
  });

  // Real-time instantaneous database backup upon financial transaction
  BackupService.triggerBackup(`নতুন চাঁদা জমা অনুমোদন ও রসিদ জারি (রসিদ: ${receiptNumber}, পরিমাণ: ৳${submission.amount})`).catch(() => {});

  return res.json({
    message: 'Payment approved successfully. Digital receipt generated and accounting ledger updated.',
    receiptNumber,
    verificationToken,
  });
});

// PATCH /api/payments/submissions/:id/reject (Rejection with reason)
router.patch('/submissions/:id/reject', authenticate, requireRole(['super_admin', 'treasurer', 'president', 'admin']), (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Rejection reason is required.' });
  }

  const submission = db.prepare(`SELECT * FROM payment_submissions WHERE id = ?`).get(id) as any;
  if (!submission) {
    return res.status(404).json({ error: 'Payment submission not found.' });
  }

  if (submission.status === 'approved') {
    return res.status(400).json({ error: 'Cannot reject an already approved payment. Cancel receipt instead.' });
  }

  db.prepare(`
    UPDATE payment_submissions 
    SET status = 'rejected', rejection_reason = ?, approved_by_id = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(reason, req.user!.memberId, id);

  NotificationService.notifyMember(
    submission.member_id,
    'পেমেন্ট সাবমিশন বাতিল করা হয়েছে',
    `আপনার জমা সাবমিশন (${submission.submission_number}) বাতিল করা হয়েছে। কারণ: ${reason}`,
    'warning',
    '/member/payments'
  );

  // Real-time notification to member
  RealtimeService.sendToUser(submission.member_id, 'PAYMENT_REJECTED', {
    submissionNumber: submission.submission_number,
    reason,
    title: 'পেমেন্ট সাবমিশন বাতিল করা হয়েছে',
    message: `আপনার জমা সাবমিশন (${submission.submission_number}) বাতিল করা হয়েছে। কারণ: ${reason}`,
  });
  RealtimeService.broadcast('DATA_REFRESH', { entity: 'submissions', memberId: submission.member_id });

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'REJECT_PAYMENT',
    entityType: 'payment_submissions',
    entityId: id,
    newValues: { reason },
  });

  return res.json({ message: 'Payment submission rejected.' });
});

export default router;
