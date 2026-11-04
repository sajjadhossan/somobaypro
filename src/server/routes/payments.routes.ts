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

// POST /api/payments/submissions (Member submits deposit slip)
router.post('/submissions', authenticate, upload.single('slip'), (req: Request, res: Response) => {
  const { amount, paymentMonths, societyBankAccountId, memberBankName, memberBranchName, depositDate, transactionId, notes } = req.body;
  const memberId = req.user!.memberId;

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

  const countRow = db.prepare(`SELECT count(*) as count FROM payment_submissions`).get() as { count: number };
  const submissionNumber = `SUB-2026-${String(countRow.count + 1).padStart(5, '0')}`;
  const slipImageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db.prepare(`
    INSERT INTO payment_submissions (
      submission_number, member_id, amount, payment_months, society_bank_account_id,
      member_bank_name, member_branch_name, deposit_date, transaction_id, slip_image_url, notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
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
    notes || null
  );

  // Notify Treasurer and Cashier
  NotificationService.broadcast(
    ['treasurer', 'super_admin', 'admin'],
    'নতুন ব্যাংক জমা সাবমিশন',
    `সদস্য ${req.user!.fullNameBn || memberId} ৳${amount} টাকা জমার তথ্য দাখিল করেছেন (আইডি: ${submissionNumber})। যাচাই করুন।`,
    'info',
    '/admin/payments'
  );

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    userName: req.user!.fullNameBn,
    action: 'SUBMIT_BANK_DEPOSIT',
    entityType: 'payment_submissions',
    entityId: result.lastInsertRowid,
    newValues: { submissionNumber, memberId, amount, transactionId },
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
  
  // Cryptographically secure verification token
  const verificationToken = crypto.randomBytes(24).toString('hex');
  const verificationUrl = `${req.protocol}://${req.get('host')}/verify/${receiptNumber}?token=${verificationToken}`;

  // Generate QR code data URL
  const qrCodeData = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
  });

  const transaction = db.transaction(() => {
    // 1. Update Payment Submission status to approved
    db.prepare(`
      UPDATE payment_submissions 
      SET status = 'approved', approved_by_id = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user!.memberId, id);

    // 2. Insert Official Digital Receipt
    db.prepare(`
      INSERT INTO receipts (
        receipt_number, payment_submission_id, member_id, amount, payment_months,
        bank_name, account_number, deposit_date, transaction_id, verification_token,
        qr_code_data, status, issued_by_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'valid', ?)
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

    // 5. Post Double-Entry Accounting Journal Entry:
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

    AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'APPROVE_PAYMENT',
      entityType: 'payment_submissions',
      entityId: id,
      newValues: { receiptNumber, amount: submission.amount, memberId: submission.member_id },
    });
  });

  transaction();

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
