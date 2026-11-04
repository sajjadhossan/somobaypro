import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { authenticate, requireRole } from '../middleware/auth';
import { AccountingService } from '../services/accounting.service';
import { AuditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';

const router = Router();

// GET /api/receipts/verify/:receiptNumber (PUBLIC VERIFICATION - NO LOGIN REQUIRED!)
router.get('/verify/:receiptNumber', (req: Request, res: Response) => {
  const { receiptNumber } = req.params;
  const token = req.query.token as string | undefined;

  const receipt = db.prepare(`
    SELECT 
      r.receipt_number, r.amount, r.payment_months, r.bank_name, r.deposit_date, r.transaction_id,
      r.depositor_name, r.depositor_relation, r.depositor_nid, r.depositor_mobile,
      r.status, r.cancelled_reason, r.issued_at, r.verification_token,
      m.member_id, m.full_name_bn, m.full_name_en,
      s.name_bn as society_name_bn, s.name_en as society_name_en, s.reg_no as society_reg_no,
      s.logo_url as society_logo, s.phone as society_phone, s.receipt_footer
    FROM receipts r
    JOIN members m ON r.member_id = m.member_id
    CROSS JOIN society_settings s WHERE s.id = 1
    AND r.receipt_number = ?
  `).get(receiptNumber) as any;

  if (!receipt) {
    return res.status(404).json({
      valid: false,
      status: 'INVALID',
      message: 'রসিদটি খুঁজে পাওয়া যায়নি অথবা অবৈধ। / Receipt not found or invalid.',
    });
  }

  // If token is provided, verify match for tamper-proofing
  if (token && receipt.verification_token !== token) {
    return res.status(400).json({
      valid: false,
      status: 'TAMPERED',
      message: 'রসিদের নিরাপত্তা টোকেন মিলছে না। / Security verification token mismatch.',
    });
  }

  // Mask member ID for privacy: e.g. SOC-****-0001
  const maskedMemberId = receipt.member_id.replace(/^SOC-(\d{4})-(\d{4})$/, 'SOC-****-$2');

  return res.json({
    valid: receipt.status === 'valid',
    status: receipt.status.toUpperCase(), // 'VALID' or 'CANCELLED'
    receiptNumber: receipt.receipt_number,
    societyNameBn: receipt.society_name_bn,
    societyNameEn: receipt.society_name_en,
    societyRegNo: receipt.society_reg_no,
    societyLogo: receipt.society_logo,
    societyPhone: receipt.society_phone,
    memberNameBn: receipt.full_name_bn,
    memberNameEn: receipt.full_name_en,
    memberId: maskedMemberId,
    depositorName: receipt.depositor_name || receipt.full_name_bn,
    depositorRelation: receipt.depositor_relation || 'নিজ',
    depositorNid: receipt.depositor_nid || null,
    depositorMobile: receipt.depositor_mobile || null,
    amount: receipt.amount,
    paymentMonths: receipt.payment_months,
    bankName: receipt.bank_name,
    depositDate: receipt.deposit_date,
    transactionId: receipt.transaction_id,
    issuedAt: receipt.issued_at,
    cancelledReason: receipt.cancelled_reason,
    receiptFooter: receipt.receipt_footer,
  });
});

// GET /api/receipts (List receipts)
router.get('/', authenticate, (req: Request, res: Response) => {
  const { memberId, status } = req.query;

  let query = `
    SELECT r.*, m.full_name_bn, m.full_name_en, m.mobile
    FROM receipts r
    JOIN members m ON r.member_id = m.member_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user!.role === 'general_member') {
    query += ` AND r.member_id = ?`;
    params.push(req.user!.memberId);
  } else {
    if (memberId) {
      query += ` AND r.member_id = ?`;
      params.push(memberId);
    }
  }

  if (status) {
    query += ` AND r.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY r.issued_at DESC`;

  const receipts = db.prepare(query).all(...params);
  return res.json({ receipts });
});

// GET /api/receipts/:receiptNumber (Full details for PDF / printing)
router.get('/:receiptNumber', authenticate, (req: Request, res: Response) => {
  const { receiptNumber } = req.params;

  const receipt = db.prepare(`
    SELECT 
      r.*, 
      m.full_name_bn, m.full_name_en, m.mobile, m.designation,
      u.role as issuer_role,
      s.name_bn as society_name_bn, s.name_en as society_name_en, s.reg_no as society_reg_no,
      s.address as society_address, s.phone as society_phone, s.email as society_email,
      s.logo_url as society_logo, s.official_signature_url, s.receipt_footer
    FROM receipts r
    JOIN members m ON r.member_id = m.member_id
    LEFT JOIN users u ON r.issued_by_id = u.member_id
    CROSS JOIN society_settings s WHERE s.id = 1
    WHERE r.receipt_number = ?
  `).get(receiptNumber) as any;

  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found.' });
  }

  // General member can only view their own receipt
  if (req.user!.role === 'general_member' && req.user!.memberId !== receipt.member_id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  return res.json({ receipt });
});

// PATCH /api/receipts/:receiptNumber/cancel (Cancel receipt with audit reversal)
router.patch('/:receiptNumber/cancel', authenticate, requireRole(['super_admin', 'treasurer']), (req: Request, res: Response) => {
  const { receiptNumber } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ error: 'Cancellation reason is required.' });
  }

  const receipt = db.prepare(`SELECT * FROM receipts WHERE receipt_number = ?`).get(receiptNumber) as any;
  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found.' });
  }

  if (receipt.status === 'cancelled') {
    return res.status(400).json({ error: 'Receipt is already cancelled.' });
  }

  const transaction = db.transaction(() => {
    // 1. Mark receipt as cancelled
    db.prepare(`
      UPDATE receipts 
      SET status = 'cancelled', cancelled_reason = ?, cancelled_by = ?, cancelled_at = CURRENT_TIMESTAMP 
      WHERE receipt_number = ?
    `).run(reason, req.user!.memberId, receiptNumber);

    // 2. Mark submission as rejected/cancelled
    db.prepare(`
      UPDATE payment_submissions 
      SET status = 'rejected', rejection_reason = ? 
      WHERE id = ?
    `).run(`রসিদ বাতিল: ${reason}`, receipt.payment_submission_id);

    // 3. Revert Member Dues
    const months = receipt.payment_months.split(',').map((m: string) => m.trim());
    for (const m of months) {
      db.prepare(`
        UPDATE subscription_dues 
        SET paid_amount = 0, status = 'unpaid', updated_at = CURRENT_TIMESTAMP 
        WHERE member_id = ? AND billing_month = ?
      `).run(receipt.member_id, m);
    }

    // 4. Reverse Journal Entry in double-entry accounting
    const originalJournal = db.prepare(`
      SELECT id FROM journal_entries WHERE reference_id = ? AND reference_type = 'payment'
    `).get(receiptNumber) as { id: number } | undefined;

    if (originalJournal) {
      AccountingService.reverseJournalEntry(originalJournal.id, req.user!.memberId, reason);
    }

    // 5. Notify Member
    NotificationService.notifyMember(
      receipt.member_id,
      'রসিদ বাতিল সংক্রান্ত বিজ্ঞপ্তি',
      `আপনার রসিদ ${receiptNumber} বাতিল করা হয়েছে। কারণ: ${reason}`,
      'urgent',
      '/member/receipts'
    );

    AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'CANCEL_RECEIPT',
      entityType: 'receipts',
      entityId: receiptNumber,
      newValues: { reason },
    });
  });

  transaction();

  return res.json({ message: `Receipt ${receiptNumber} has been cancelled and financial entries reversed.` });
});

export default router;
