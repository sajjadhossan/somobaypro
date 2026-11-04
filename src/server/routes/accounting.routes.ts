import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { authenticate, requireRole } from '../middleware/auth';
import { AccountingService } from '../services/accounting.service';
import { AuditService } from '../services/audit.service';

const router = Router();

// GET /api/accounting/summary
router.get('/summary', authenticate, requireRole(['super_admin', 'president', 'treasurer', 'general_secretary', 'advisor', 'admin']), (req: Request, res: Response) => {
  const summary = AccountingService.getFinancialSummary();
  return res.json(summary);
});

// GET /api/accounting/chart-of-accounts
router.get('/chart-of-accounts', authenticate, requireRole(['super_admin', 'treasurer', 'president', 'admin']), (req: Request, res: Response) => {
  const accounts = db.prepare(`SELECT * FROM chart_of_accounts ORDER BY code ASC`).all();
  return res.json({ accounts });
});

// GET /api/accounting/cashbook
router.get('/cashbook', authenticate, requireRole(['super_admin', 'treasurer', 'president', 'admin']), (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  const entries = AccountingService.getCashbook(startDate as string, endDate as string);
  return res.json({ entries });
});

// GET /api/accounting/bankbook
router.get('/bankbook', authenticate, requireRole(['super_admin', 'treasurer', 'president', 'admin']), (req: Request, res: Response) => {
  const { bankAccountId, startDate, endDate } = req.query;
  const entries = AccountingService.getBankbook(
    bankAccountId ? Number(bankAccountId) : undefined,
    startDate as string,
    endDate as string
  );
  return res.json({ entries });
});

// GET /api/accounting/journal-entries
router.get('/journal-entries', authenticate, requireRole(['super_admin', 'treasurer', 'president', 'admin']), (req: Request, res: Response) => {
  const entries = db.prepare(`
    SELECT je.*, 
      (SELECT json_group_array(json_object(
        'code', ca.code,
        'name_bn', ca.name_bn,
        'name_en', ca.name_en,
        'debit', jl.debit,
        'credit', jl.credit,
        'description', jl.description
      ))
      FROM journal_lines jl
      JOIN chart_of_accounts ca ON jl.account_id = ca.id
      WHERE jl.journal_id = je.id) as lines
    FROM journal_entries je
    ORDER BY je.entry_date DESC, je.id DESC
    LIMIT 100
  `).all();

  const formatted = entries.map((e: any) => ({
    ...e,
    lines: JSON.parse(e.lines || '[]'),
  }));

  return res.json({ journalEntries: formatted });
});

// GET /api/accounting/expenses
router.get('/expenses', authenticate, requireRole(['super_admin', 'treasurer', 'president', 'general_secretary', 'admin', 'advisor']), (req: Request, res: Response) => {
  const expenses = db.prepare(`
    SELECT er.*, ba.bank_name, ba.account_number
    FROM expense_records er
    LEFT JOIN bank_accounts ba ON er.bank_account_id = ba.id
    ORDER BY er.expense_date DESC, er.id DESC
  `).all();

  return res.json({ expenses });
});

// POST /api/accounting/expenses (Create expense voucher)
router.post('/expenses', authenticate, requireRole(['super_admin', 'treasurer']), (req: Request, res: Response) => {
  const { category, amount, expenseDate, paymentMethod = 'bank', bankAccountId, payeeName, description } = req.body;

  if (!category || !amount || !expenseDate || !payeeName || !description) {
    return res.status(400).json({ error: 'Category, amount, date, payee name, and description are required.' });
  }

  const expenseCount = db.prepare(`SELECT count(*) as count FROM expense_records`).get() as { count: number };
  const voucherNumber = `VCH-2026-${String(expenseCount.count + 1).padStart(5, '0')}`;

  // Map category to chart of accounts code
  const categoryAccountMap: Record<string, string> = {
    office_rent: '5010', // Office Rent Expense
    utility: '5020',     // Electricity & Utility
    salary: '5030',      // Staff Salary / Allowances
    stationery: '5040',  // Printing & Stationery
    meeting_entertainment: '5050', // Meeting & Hospitality
    event: '5060',       // Annual General Meeting / Events
    maintenance: '5070', // Office Maintenance
    other: '5090',       // Miscellaneous Expense
  };

  const expenseAccountCode = categoryAccountMap[category] || '5090';
  const assetAccountCode = paymentMethod === 'cash' ? '1010' : '1020';

  const transaction = db.transaction(() => {
    // 1. Insert Expense Record
    const result = db.prepare(`
      INSERT INTO expense_records (
        voucher_number, category, amount, expense_date, payment_method, bank_account_id,
        payee_name, description, status, approved_by, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
    `).run(
      voucherNumber,
      category,
      Number(amount),
      expenseDate,
      paymentMethod,
      paymentMethod === 'bank' ? Number(bankAccountId) : null,
      payeeName,
      description,
      req.user!.memberId,
      req.user!.memberId
    );

    // 2. If paid by bank, deduct from bank account balance
    if (paymentMethod === 'bank' && bankAccountId) {
      db.prepare(`
        UPDATE bank_accounts 
        SET current_balance = current_balance - ? 
        WHERE id = ?
      `).run(Number(amount), Number(bankAccountId));
    }

    // 3. Post Double-Entry Journal:
    // Debit: Expense Account (Asset decreases, expense increases)
    // Credit: Cash / Bank Account
    AccountingService.postJournalEntry({
      entryDate: expenseDate,
      referenceType: 'expense',
      referenceId: voucherNumber,
      description: `খরচ ভাউচার: ${description} (প্রাপক: ${payeeName})`,
      lines: [
        { accountCode: expenseAccountCode, debit: Number(amount), credit: 0, description: `ব্যয়: ${category}` },
        { accountCode: assetAccountCode, debit: 0, credit: Number(amount), description: `পরিশোধ (${paymentMethod})` },
      ],
      createdBy: req.user!.memberId,
    });

    AuditService.log({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'RECORD_EXPENSE',
      entityType: 'expense_records',
      entityId: result.lastInsertRowid,
      newValues: { voucherNumber, amount, category, payeeName },
    });
  });

  transaction();

  return res.status(201).json({
    message: 'Expense recorded successfully and ledger updated.',
    voucherNumber,
  });
});

// GET /api/accounting/reports/collection
router.get('/reports/collection', authenticate, requireRole(['super_admin', 'treasurer', 'president', 'general_secretary', 'admin', 'advisor']), (req: Request, res: Response) => {
  const monthWise = db.prepare(`
    SELECT 
      billing_month,
      COUNT(DISTINCT member_id) as total_members,
      SUM(due_amount) as total_due,
      SUM(paid_amount) as total_collected,
      SUM(due_amount - paid_amount) as total_uncollected
    FROM subscription_dues
    GROUP BY billing_month
    ORDER BY billing_month DESC
  `).all();

  const topPayers = db.prepare(`
    SELECT 
      m.member_id, m.full_name_bn, m.full_name_en, m.mobile,
      SUM(r.amount) as total_paid
    FROM receipts r
    JOIN members m ON r.member_id = m.member_id
    WHERE r.status = 'valid'
    GROUP BY m.member_id
    ORDER BY total_paid DESC
    LIMIT 10
  `).all();

  const topDefaulters = db.prepare(`
    SELECT 
      m.member_id, m.full_name_bn, m.full_name_en, m.mobile,
      SUM(sd.due_amount - sd.paid_amount) as total_due,
      COUNT(sd.id) as unpaid_months
    FROM subscription_dues sd
    JOIN members m ON sd.member_id = m.member_id
    WHERE sd.status != 'paid'
    GROUP BY m.member_id
    ORDER BY total_due DESC
    LIMIT 10
  `).all();

  return res.json({ monthWise, topPayers, topDefaulters });
});

export default router;
