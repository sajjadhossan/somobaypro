import { db } from '../db/index';

export interface JournalLineInput {
  accountCode: string;
  debit: number;
  credit: number;
  description?: string;
}

export class AccountingService {
  /**
   * Post a balanced double-entry journal entry
   */
  static postJournalEntry(params: {
    entryDate: string;
    referenceType: 'payment' | 'expense' | 'income' | 'reversal' | 'manual';
    referenceId?: string;
    description: string;
    lines: JournalLineInput[];
    createdBy: string;
  }) {
    // Validate Debits == Credits
    const totalDebit = params.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = params.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Double-entry unbalanced! Debits: ${totalDebit}, Credits: ${totalCredit}`);
    }

    const nextIdRow = db.prepare(`SELECT count(*) as count FROM journal_entries`).get() as { count: number };
    const entryNumber = `JE-2026-${String(nextIdRow.count + 1).padStart(5, '0')}`;

    const insertEntry = db.prepare(`
      INSERT INTO journal_entries (entry_number, entry_date, reference_type, reference_id, description, is_reversal, created_by)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `);

    const insertLine = db.prepare(`
      INSERT INTO journal_lines (journal_id, account_id, debit, credit, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    const updateAccountBalance = db.prepare(`
      UPDATE chart_of_accounts 
      SET balance = balance + ? 
      WHERE id = ?
    `);

    const getAccount = db.prepare(`SELECT id, type FROM chart_of_accounts WHERE code = ?`);

    const transaction = db.transaction(() => {
      const result = insertEntry.run(
        entryNumber,
        params.entryDate,
        params.referenceType,
        params.referenceId || null,
        params.description,
        params.createdBy
      );
      const journalId = result.lastInsertRowid;

      for (const line of params.lines) {
        const account = getAccount.get(line.accountCode) as { id: number; type: string } | undefined;
        if (!account) {
          throw new Error(`Chart of account with code ${line.accountCode} not found!`);
        }

        insertLine.run(journalId, account.id, line.debit, line.credit, line.description || params.description);

        // Update Account Balance based on type:
        // Asset/Expense: Debit increases (+), Credit decreases (-)
        // Liability/Equity/Revenue: Credit increases (+), Debit decreases (-)
        let delta = 0;
        if (['asset', 'expense'].includes(account.type)) {
          delta = line.debit - line.credit;
        } else {
          delta = line.credit - line.debit;
        }
        updateAccountBalance.run(delta, account.id);
      }

      return { journalId, entryNumber };
    });

    return transaction();
  }

  /**
   * Reverse a journal entry with an immutable reversal record (audit-compliant)
   */
  static reverseJournalEntry(journalId: number, reversedBy: string, reason: string) {
    const original = db.prepare(`SELECT * FROM journal_entries WHERE id = ?`).get(journalId) as any;
    if (!original) throw new Error('Original journal entry not found');

    const lines = db.prepare(`
      SELECT jl.*, ca.code as accountCode, ca.type as accountType 
      FROM journal_lines jl
      JOIN chart_of_accounts ca ON jl.account_id = ca.id
      WHERE jl.journal_id = ?
    `).all(journalId) as any[];

    const countRow = db.prepare(`SELECT count(*) as count FROM journal_entries`).get() as { count: number };
    const revEntryNumber = `JE-REV-2026-${String(countRow.count + 1).padStart(5, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const transaction = db.transaction(() => {
      const res = db.prepare(`
        INSERT INTO journal_entries (entry_number, entry_date, reference_type, reference_id, description, is_reversal, created_by)
        VALUES (?, ?, 'reversal', ?, ?, 1, ?)
      `).run(
        revEntryNumber,
        today,
        original.entry_number,
        `Reversal of ${original.entry_number}: ${reason}`,
        reversedBy
      );

      const revJournalId = res.lastInsertRowid;
      const updateBalance = db.prepare(`UPDATE chart_of_accounts SET balance = balance + ? WHERE id = ?`);

      for (const line of lines) {
        // Swap debit and credit to reverse
        db.prepare(`
          INSERT INTO journal_lines (journal_id, account_id, debit, credit, description)
          VALUES (?, ?, ?, ?, ?)
        `).run(revJournalId, line.account_id, line.credit, line.debit, `Reversal: ${line.description}`);

        let delta = 0;
        if (['asset', 'expense'].includes(line.accountType)) {
          delta = line.credit - line.debit; // reversed
        } else {
          delta = line.debit - line.credit; // reversed
        }
        updateBalance.run(delta, line.account_id);
      }

      return { revJournalId, revEntryNumber };
    });

    return transaction();
  }

  /**
   * Get Financial Summary: Total Assets, Total Liabilities, Total Equity, Total Revenue, Total Expenses, Net Surplus
   */
  static getFinancialSummary() {
    const accounts = db.prepare(`
      SELECT code, name_bn, name_en, type, balance 
      FROM chart_of_accounts 
      ORDER BY code ASC
    `).all() as any[];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const a of accounts) {
      if (a.type === 'asset') totalAssets += a.balance;
      else if (a.type === 'liability') totalLiabilities += a.balance;
      else if (a.type === 'equity') totalEquity += a.balance;
      else if (a.type === 'revenue') totalRevenue += a.balance;
      else if (a.type === 'expense') totalExpenses += a.balance;
    }

    const netSurplus = totalRevenue - totalExpenses;

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalExpenses,
      netSurplus,
      accounts
    };
  }

  /**
   * Get Cashbook: Cash In, Cash Out, Balance
   */
  static getCashbook(startDate?: string, endDate?: string) {
    const cashAccount = db.prepare(`SELECT id FROM chart_of_accounts WHERE code = '1010'`).get() as { id: number } | undefined;
    if (!cashAccount) return [];

    let query = `
      SELECT 
        je.entry_number,
        je.entry_date,
        je.description,
        jl.debit as cash_in,
        jl.credit as cash_out,
        je.created_by
      FROM journal_lines jl
      JOIN journal_entries je ON jl.journal_id = je.id
      WHERE jl.account_id = ?
    `;
    const params: any[] = [cashAccount.id];

    if (startDate) {
      query += ` AND je.entry_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND je.entry_date <= ?`;
      params.push(endDate);
    }
    query += ` ORDER BY je.entry_date ASC, je.id ASC`;

    return db.prepare(query).all(...params);
  }

  /**
   * Get Bankbook: Bank Deposits, Bank Withdrawals, Balance
   */
  static getBankbook(bankAccountId?: number, startDate?: string, endDate?: string) {
    const bankAccount = db.prepare(`SELECT id FROM chart_of_accounts WHERE code = '1020'`).get() as { id: number } | undefined;
    if (!bankAccount) return [];

    let query = `
      SELECT 
        je.entry_number,
        je.entry_date,
        je.reference_type,
        je.reference_id,
        je.description,
        jl.debit as bank_deposit,
        jl.credit as bank_withdrawal,
        je.created_by
      FROM journal_lines jl
      JOIN journal_entries je ON jl.journal_id = je.id
      WHERE jl.account_id = ?
    `;
    const params: any[] = [bankAccount.id];

    if (startDate) {
      query += ` AND je.entry_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND je.entry_date <= ?`;
      params.push(endDate);
    }
    query += ` ORDER BY je.entry_date ASC, je.id ASC`;

    return db.prepare(query).all(...params);
  }
}
