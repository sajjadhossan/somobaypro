import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';

const router = Router();

// GET /api/subscriptions/my (Personal member subscription dashboard)
router.get('/my', authenticate, (req: Request, res: Response) => {
  const memberId = req.user!.memberId;

  // Month-wise dues records
  const dues = db.prepare(`
    SELECT sd.*, 
      r.receipt_number, r.issued_at as receipt_date, r.verification_token
    FROM subscription_dues sd
    LEFT JOIN receipts r ON r.member_id = sd.member_id AND r.payment_months LIKE ('%' || sd.billing_month || '%') AND r.status = 'valid'
    WHERE sd.member_id = ?
    ORDER BY sd.billing_month DESC
  `).all(memberId);

  // Overall totals
  const totalStats = db.prepare(`
    SELECT 
      COALESCE(SUM(due_amount), 0) as total_billed,
      COALESCE(SUM(paid_amount), 0) as total_paid,
      COALESCE(SUM(due_amount - paid_amount), 0) as total_due,
      COUNT(CASE WHEN status != 'paid' THEN 1 END) as unpaid_months_count
    FROM subscription_dues
    WHERE member_id = ?
  `).get(memberId) as any;

  // Pending submissions amount
  const pendingAmountRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as pending_amount
    FROM payment_submissions
    WHERE member_id = ? AND status IN ('pending', 'verified_by_treasurer')
  `).get(memberId) as { pending_amount: number };

  // Member's current configured monthly rate
  const memberRow = db.prepare(`SELECT monthly_subscription_amount, membership_status FROM members WHERE member_id = ?`).get(memberId) as any;

  return res.json({
    dues,
    totalBilled: totalStats.total_billed,
    totalPaid: totalStats.total_paid,
    totalDue: totalStats.total_due,
    unpaidMonthsCount: totalStats.unpaid_months_count,
    pendingAmount: pendingAmountRow.pending_amount,
    currentRate: memberRow?.monthly_subscription_amount || 1000,
    membershipStatus: memberRow?.membership_status || 'active',
  });
});

// GET /api/subscriptions/dues (Admin overview of all member dues)
router.get('/dues', authenticate, requireRole(['super_admin', 'admin', 'president', 'general_secretary', 'treasurer']), (req: Request, res: Response) => {
  const { month, status, search } = req.query;

  let query = `
    SELECT 
      sd.*, 
      m.full_name_bn, m.full_name_en, m.mobile, m.designation, m.membership_status
    FROM subscription_dues sd
    JOIN members m ON sd.member_id = m.member_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (month) {
    query += ` AND sd.billing_month = ?`;
    params.push(month);
  }
  if (status) {
    query += ` AND sd.status = ?`;
    params.push(status);
  }
  if (search) {
    query += ` AND (m.full_name_bn LIKE ? OR m.full_name_en LIKE ? OR m.member_id LIKE ? OR m.mobile LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ` ORDER BY sd.billing_month DESC, sd.member_id ASC`;

  const records = db.prepare(query).all(...params);

  // Month-wise aggregation
  const summary = db.prepare(`
    SELECT 
      billing_month,
      COUNT(DISTINCT member_id) as total_members,
      SUM(due_amount) as total_due_amount,
      SUM(paid_amount) as total_paid_amount,
      SUM(due_amount - paid_amount) as total_outstanding,
      COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
      COUNT(CASE WHEN status != 'paid' THEN 1 END) as unpaid_count
    FROM subscription_dues
    GROUP BY billing_month
    ORDER BY billing_month DESC
    LIMIT 12
  `).all();

  return res.json({ records, summary });
});

// POST /api/subscriptions/generate-monthly (Auto-generate dues for active members)
router.post('/generate-monthly', authenticate, requireRole(['super_admin', 'admin', 'treasurer']), (req: Request, res: Response) => {
  const { billingMonth } = req.body; // e.g. "2026-03"

  if (!billingMonth || !/^\d{4}-\d{2}$/.test(billingMonth)) {
    return res.status(400).json({ error: 'Valid billing month in YYYY-MM format is required.' });
  }

  const activeMembers = db.prepare(`
    SELECT member_id, monthly_subscription_amount 
    FROM members 
    WHERE membership_status = 'active'
  `).all() as { member_id: string; monthly_subscription_amount: number }[];

  const dueDate = `${billingMonth}-15`;
  let createdCount = 0;

  const insertDue = db.prepare(`
    INSERT OR IGNORE INTO subscription_dues (member_id, billing_month, due_amount, paid_amount, status, due_date)
    VALUES (?, ?, ?, 0, 'unpaid', ?)
  `);

  const transaction = db.transaction(() => {
    for (const m of activeMembers) {
      const result = insertDue.run(m.member_id, billingMonth, m.monthly_subscription_amount || 1000, dueDate);
      if (result.changes > 0) createdCount++;
    }

    AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'GENERATE_MONTHLY_DUES',
      entityType: 'subscription_dues',
      newValues: { billingMonth, createdCount, totalActiveMembers: activeMembers.length },
    });
  });

  transaction();

  // Notify members
  NotificationService.broadcast(
    ['general_member'],
    'মাসিক চাঁদা বিলিং নোটিশ',
    `${billingMonth} মাসের চাঁদা নির্ধারিত হয়েছে। অনুগ্রহ করে নির্ধারিত সময়ের মধ্যে ব্যাংকে জমা দিন।`,
    'info',
    '/member/subscription'
  );

  return res.json({
    message: `Generated monthly subscription dues for ${createdCount} active members for month ${billingMonth}.`,
    createdCount,
    totalActiveMembers: activeMembers.length,
  });
});

export default router;
