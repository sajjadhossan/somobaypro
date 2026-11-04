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

// GET /api/subscriptions/reports (Comprehensive Monthly, Yearly, Individual, and Overall Reports)
router.get('/reports', authenticate, (req: Request, res: Response) => {
  const { year = String(new Date().getFullYear()), month, memberId, status } = req.query;

  const isMember = req.user!.role === 'general_member';
  const effectiveMemberId = isMember ? req.user!.memberId : (memberId && memberId !== 'all' ? (memberId as string) : null);

  // Fetch target members
  let memberQuery = `SELECT * FROM members WHERE 1=1`;
  const memberParams: any[] = [];
  if (effectiveMemberId) {
    memberQuery += ` AND member_id = ?`;
    memberParams.push(effectiveMemberId);
  }
  memberQuery += ` ORDER BY member_id ASC`;
  const members = db.prepare(memberQuery).all(...memberParams) as any[];

  const monthNames = [
    { num: '01', bn: 'জানুয়ারি', en: 'January' },
    { num: '02', bn: 'ফেব্রুয়ারি', en: 'February' },
    { num: '03', bn: 'মার্চ', en: 'March' },
    { num: '04', bn: 'এপ্রিল', en: 'April' },
    { num: '05', bn: 'মে', en: 'May' },
    { num: '06', bn: 'জুন', en: 'June' },
    { num: '07', bn: 'জুলাই', en: 'July' },
    { num: '08', bn: 'আগস্ট', en: 'August' },
    { num: '09', bn: 'সেপ্টেম্বর', en: 'September' },
    { num: '10', bn: 'অক্টোবর', en: 'October' },
    { num: '11', bn: 'নভেম্বর', en: 'November' },
    { num: '12', bn: 'ডিসেম্বর', en: 'December' },
  ];

  let grandTotalBilled = 0;
  let grandTotalPaid = 0;
  let grandTotalDue = 0;

  const membersReport = members.map((m) => {
    // 12-month matrix for the year
    const duesRows = db.prepare(`
      SELECT sd.*, r.receipt_number, r.deposit_date, r.bank_name, r.transaction_id, r.depositor_name, r.depositor_relation
      FROM subscription_dues sd
      LEFT JOIN receipts r ON r.member_id = sd.member_id AND r.payment_months LIKE ('%' || sd.billing_month || '%') AND r.status = 'valid'
      WHERE sd.member_id = ? AND sd.billing_month LIKE ?
      ORDER BY sd.billing_month ASC
    `).all(m.member_id, `${year}-%`) as any[];

    const duesMap = new Map<string, any>();
    for (const row of duesRows) {
      duesMap.set(row.billing_month, row);
    }

    const monthsMatrix = monthNames.map((mn) => {
      const monthKey = `${year}-${mn.num}`;
      const record = duesMap.get(monthKey);
      return {
        monthKey,
        monthNameBn: mn.bn,
        monthNameEn: mn.en,
        status: record ? record.status : 'not_billed',
        dueAmount: record ? record.due_amount : 0,
        paidAmount: record ? record.paid_amount : 0,
        balance: record ? record.due_amount - record.paid_amount : 0,
        receiptNumber: record?.receipt_number || null,
        depositDate: record?.deposit_date || null,
      };
    });

    // Total stats for the year
    const yearBilled = monthsMatrix.reduce((acc, cur) => acc + cur.dueAmount, 0);
    const yearPaid = monthsMatrix.reduce((acc, cur) => acc + cur.paidAmount, 0);
    const yearDue = monthsMatrix.reduce((acc, cur) => acc + cur.balance, 0);

    grandTotalBilled += yearBilled;
    grandTotalPaid += yearPaid;
    grandTotalDue += yearDue;

    // Last payment submission / receipt details
    const lastReceipt = db.prepare(`
      SELECT r.*, ps.depositor_name, ps.depositor_relation, ps.depositor_nid, ps.depositor_mobile
      FROM receipts r
      LEFT JOIN payment_submissions ps ON r.payment_submission_id = ps.id
      WHERE r.member_id = ? AND r.status = 'valid'
      ORDER BY r.issued_at DESC
      LIMIT 1
    `).get(m.member_id) as any;

    return {
      memberId: m.member_id,
      fullNameBn: m.full_name_bn,
      fullNameEn: m.full_name_en,
      mobile: m.mobile,
      designation: m.designation,
      joiningDate: m.joining_date,
      monthlySubscriptionAmount: m.monthly_subscription_amount || 1000,
      membershipStatus: m.membership_status,
      yearBilled,
      yearPaid,
      yearDue,
      monthsMatrix,
      lastPayment: lastReceipt ? {
        receiptNumber: lastReceipt.receipt_number,
        amount: lastReceipt.amount,
        bankName: lastReceipt.bank_name,
        depositDate: lastReceipt.deposit_date,
        transactionId: lastReceipt.transaction_id,
        depositorName: lastReceipt.depositor_name || m.full_name_bn,
        depositorRelation: lastReceipt.depositor_relation || 'নিজ',
        depositorNid: lastReceipt.depositor_nid,
      } : null,
    };
  });

  // Filter by status if requested
  const filteredReport = status === 'paid'
    ? membersReport.filter((r) => r.yearDue === 0 && r.yearPaid > 0)
    : status === 'overdue'
    ? membersReport.filter((r) => r.yearDue > 0)
    : membersReport;

  const collectionRate = grandTotalBilled > 0 ? Math.round((grandTotalPaid / grandTotalBilled) * 100) : 100;

  return res.json({
    year,
    month: month || 'all',
    membersReport: filteredReport,
    summary: {
      totalMembers: members.length,
      grandTotalBilled,
      grandTotalPaid,
      grandTotalDue,
      collectionRate,
    },
  });
});

// POST /api/subscriptions/send-due-notice (Generate WhatsApp & Telegram Notice for overdue members)
router.post('/send-due-notice', authenticate, requireRole(['super_admin', 'admin', 'treasurer', 'president', 'general_secretary']), (req: Request, res: Response) => {
  const { memberId, dueAmount, dueMonths } = req.body;

  const member = db.prepare(`SELECT * FROM members WHERE member_id = ?`).get(memberId) as any;
  if (!member) {
    return res.status(404).json({ error: 'Member not found.' });
  }

  const society = db.prepare(`SELECT * FROM society_settings WHERE id = 1`).get() as any;

  // In-app notification
  NotificationService.notifyMember(
    memberId,
    'বকেয়া চাঁদা পরিশোধের অনুরোধ',
    `আপনার ${dueMonths || 'বিগত'} মাসের মোট ৳${dueAmount} টাকা চাঁদা বকেয়া রয়েছে। অনুগ্রহ করে ব্যাংকে জমা দিন।`,
    'warning',
    '/member/subscription'
  );

  // Message template for WhatsApp & Telegram
  const messageText = `*${society?.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}*\n` +
    `সরকারি নিবন্ধন নং: ${society?.reg_no || 'REG-DH-2018-0942'}\n\n` +
    `আসসালামু আলাইকুম, সম্মানিত সদস্য *${member.full_name_bn}* (আইডি: ${member.member_id}),\n` +
    `সমিতির হিসাব অনুযায়ী আপনার *${dueMonths || 'বিগত'}* মাসের মোট বকেয়া চাঁদার পরিমাণ: *৳${Number(dueAmount).toLocaleString('en-IN')}/-*\n\n` +
    `📌 *ব্যাংক জমার তথ্য:*\n` +
    `ব্যাংক: সোনালী ব্যাংক পিএলসি\n` +
    `হিসাব নং: 0112802001458 (ধানমন্ডি শাখা)\n\n` +
    `টাকা জমা দিয়ে অ্যাপে স্লিপ আপলোড করার অনুরোধ রইলো।\n` +
    `যোগাযোগ: ${society?.phone || '+880 1712-345678'}`;

  // WhatsApp link (using international format without leading zero or with +880)
  const cleanMobile = member.mobile.replace(/\D/g, '');
  const waMobile = cleanMobile.startsWith('88') ? cleanMobile : `88${cleanMobile}`;
  const whatsappUrl = `https://wa.me/${waMobile}?text=${encodeURIComponent(messageText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(society?.website || 'https://progotikalyan.org')}&text=${encodeURIComponent(messageText)}`;

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'SEND_DUE_NOTICE',
    entityType: 'members',
    entityId: memberId,
    newValues: { memberId, dueAmount, dueMonths },
  });

  return res.json({
    message: 'বকেয়া নোটিশ লিংক প্রস্তুত ও ইন-অ্যাপ বিজ্ঞপ্তি পাঠানো হয়েছে।',
    whatsappUrl,
    telegramUrl,
    messageText,
    mobile: member.mobile,
  });
});

export default router;
