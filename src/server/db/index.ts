import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'society.db');
const rawDb = new DatabaseSync(dbPath);

// Enable Foreign Keys and Write-Ahead Logging
rawDb.exec('PRAGMA journal_mode = WAL;');
rawDb.exec('PRAGMA foreign_keys = ON;');

// Helper to provide transaction function similar to better-sqlite3
(rawDb as any).transaction = function (fn: Function) {
  return function (...args: any[]) {
    rawDb.exec('BEGIN IMMEDIATE;');
    try {
      const res = fn(...args);
      rawDb.exec('COMMIT;');
      return res;
    } catch (err) {
      try {
        rawDb.exec('ROLLBACK;');
      } catch (e) {
        // ignore rollback error if already rolled back
      }
      throw err;
    }
  };
};

export const db = rawDb as DatabaseSync & {
  transaction: <T extends (...args: any[]) => any>(fn: T) => T;
};

export function initDatabase() {
  db.exec(`
    -- Society Settings
    CREATE TABLE IF NOT EXISTS society_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name_bn TEXT NOT NULL,
      name_en TEXT NOT NULL,
      short_name TEXT NOT NULL,
      reg_no TEXT,
      address TEXT,
      district TEXT,
      upazila TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      est_date TEXT,
      description TEXT,
      logo_url TEXT,
      official_signature_url TEXT,
      receipt_footer TEXT,
      currency TEXT DEFAULT 'BDT',
      monthly_subscription_default REAL DEFAULT 1000,
      membership_fee_default REAL DEFAULT 500,
      approval_workflow TEXT DEFAULT 'treasurer_only',
      self_registration_enabled INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Users Table (Authentication and RBAC)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT UNIQUE NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'president', 'general_secretary', 'treasurer', 'advisor', 'general_member')),
      account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'activation_pending', 'suspended', 'locked', 'deactivated')),
      permissions TEXT DEFAULT '[]',
      failed_attempts INTEGER DEFAULT 0,
      locked_until DATETIME,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Members Profile Table
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT UNIQUE NOT NULL,
      full_name_bn TEXT NOT NULL,
      full_name_en TEXT NOT NULL,
      photo_url TEXT,
      father_name TEXT,
      mother_name TEXT,
      dob TEXT,
      gender TEXT DEFAULT 'male',
      nid_number TEXT,
      mobile TEXT UNIQUE NOT NULL,
      alt_mobile TEXT,
      email TEXT,
      present_address TEXT,
      permanent_address TEXT,
      occupation TEXT,
      joining_date TEXT NOT NULL,
      membership_type TEXT DEFAULT 'regular' CHECK (membership_type IN ('regular', 'life', 'honorary', 'executive')),
      membership_fee REAL DEFAULT 500,
      monthly_subscription_amount REAL DEFAULT 1000,
      designation TEXT DEFAULT 'সাধারণ সদস্য',
      membership_status TEXT DEFAULT 'active' CHECK (membership_status IN ('pending', 'active', 'suspended', 'inactive', 'resigned', 'terminated')),
      nominee_name TEXT,
      nominee_relation TEXT,
      nominee_mobile TEXT,
      nominee_nid TEXT,
      emergency_name TEXT,
      emergency_relation TEXT,
      emergency_mobile TEXT,
      approved_by TEXT,
      approved_at DATETIME,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Official Society Bank Accounts
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      branch_name TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_number TEXT UNIQUE NOT NULL,
      account_type TEXT DEFAULT 'Current',
      routing_number TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_primary INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Monthly Subscription Dues (Generated for members)
    CREATE TABLE IF NOT EXISTS subscription_dues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT NOT NULL,
      billing_month TEXT NOT NULL,
      due_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue')),
      due_date TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(member_id, billing_month),
      FOREIGN KEY(member_id) REFERENCES members(member_id) ON DELETE CASCADE
    );

    -- Bank Deposit Submissions (By Members)
    CREATE TABLE IF NOT EXISTS payment_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_number TEXT UNIQUE NOT NULL,
      member_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_months TEXT NOT NULL,
      society_bank_account_id INTEGER NOT NULL,
      member_bank_name TEXT,
      member_branch_name TEXT,
      deposit_date TEXT NOT NULL,
      transaction_id TEXT NOT NULL,
      slip_image_url TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified_by_treasurer', 'approved', 'rejected')),
      rejection_reason TEXT,
      verified_by_treasurer_id TEXT,
      verified_at DATETIME,
      approved_by_id TEXT,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(member_id) REFERENCES members(member_id),
      FOREIGN KEY(society_bank_account_id) REFERENCES bank_accounts(id)
    );

    -- Digital Receipts (Issued strictly upon payment approval)
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      payment_submission_id INTEGER UNIQUE NOT NULL,
      member_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_months TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      deposit_date TEXT NOT NULL,
      transaction_id TEXT NOT NULL,
      verification_token TEXT UNIQUE NOT NULL,
      qr_code_data TEXT NOT NULL,
      status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'cancelled')),
      cancelled_reason TEXT,
      cancelled_by TEXT,
      cancelled_at DATETIME,
      issued_by_id TEXT NOT NULL,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(payment_submission_id) REFERENCES payment_submissions(id),
      FOREIGN KEY(member_id) REFERENCES members(member_id)
    );

    -- Chart of Accounts (Double-Entry Accounting)
    CREATE TABLE IF NOT EXISTS chart_of_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name_bn TEXT NOT NULL,
      name_en TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
      balance REAL DEFAULT 0,
      description TEXT
    );

    -- Journal Entries (General Ledger)
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_number TEXT UNIQUE NOT NULL,
      entry_date TEXT NOT NULL,
      reference_type TEXT CHECK (reference_type IN ('payment', 'expense', 'income', 'reversal', 'manual')),
      reference_id TEXT,
      description TEXT NOT NULL,
      is_reversal INTEGER DEFAULT 0,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Journal Lines (Debit/Credit records)
    CREATE TABLE IF NOT EXISTS journal_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journal_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      description TEXT,
      FOREIGN KEY(journal_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
      FOREIGN KEY(account_id) REFERENCES chart_of_accounts(id)
    );

    -- Other Income Records
    CREATE TABLE IF NOT EXISTS income_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      income_number TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('monthly_subscription', 'membership_fee', 'donation', 'bank_profit', 'other')),
      amount REAL NOT NULL,
      income_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'bank' CHECK (payment_method IN ('bank', 'cash')),
      bank_account_id INTEGER,
      description TEXT,
      receipt_id INTEGER,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(bank_account_id) REFERENCES bank_accounts(id)
    );

    -- Expense Records
    CREATE TABLE IF NOT EXISTS expense_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_number TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('office_rent', 'utility', 'salary', 'stationery', 'meeting_entertainment', 'event', 'maintenance', 'other')),
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'bank' CHECK (payment_method IN ('cash', 'bank')),
      bank_account_id INTEGER,
      payee_name TEXT NOT NULL,
      description TEXT NOT NULL,
      bill_attachment_url TEXT,
      status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
      approved_by TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(bank_account_id) REFERENCES bank_accounts(id)
    );

    -- Meetings
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      meeting_type TEXT DEFAULT 'general' CHECK (meeting_type IN ('agm', 'egm', 'executive', 'general', 'emergency')),
      date_time TEXT NOT NULL,
      location TEXT NOT NULL,
      meeting_link TEXT,
      agenda TEXT NOT NULL,
      minutes TEXT,
      resolutions TEXT,
      is_published INTEGER DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Meeting Attendance
    CREATE TABLE IF NOT EXISTS meeting_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      member_id TEXT NOT NULL,
      status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'excused')),
      remarks TEXT,
      FOREIGN KEY(meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
      FOREIGN KEY(member_id) REFERENCES members(member_id),
      UNIQUE(meeting_id, member_id)
    );

    -- Notices
    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notice_number TEXT UNIQUE NOT NULL,
      title_bn TEXT NOT NULL,
      title_en TEXT NOT NULL,
      content_bn TEXT NOT NULL,
      content_en TEXT NOT NULL,
      priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'important')),
      target_role TEXT DEFAULT 'all',
      publish_date TEXT NOT NULL,
      expiry_date TEXT,
      attachment_url TEXT,
      is_published INTEGER DEFAULT 1,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Notice Read Tracking
    CREATE TABLE IF NOT EXISTS notice_reads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notice_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(notice_id, user_id),
      FOREIGN KEY(notice_id) REFERENCES notices(id) ON DELETE CASCADE
    );

    -- In-App Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'urgent')),
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Official Society Documents
    CREATE TABLE IF NOT EXISTS society_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'general' CHECK (category IN ('bylaw', 'registration', 'audit', 'resolution', 'general')),
      file_url TEXT NOT NULL,
      file_size TEXT,
      access_level TEXT DEFAULT 'members_only' CHECK (access_level IN ('public', 'members_only', 'executives_only')),
      uploaded_by TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Support & Help Tickets
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      member_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      category TEXT DEFAULT 'general' CHECK (category IN ('payment', 'profile', 'general', 'complaint')),
      message TEXT NOT NULL,
      status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
      priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
      admin_response TEXT,
      resolved_by TEXT,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(member_id) REFERENCES members(member_id)
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_role TEXT,
      user_name TEXT,
      ip_address TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Login History
    CREATE TABLE IF NOT EXISTS login_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      identifier_used TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'locked')),
      failure_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- OTP Verifications
    CREATE TABLE IF NOT EXISTS otp_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mobile TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      purpose TEXT NOT NULL CHECK (purpose IN ('registration', 'activation', 'password_reset')),
      expires_at DATETIME NOT NULL,
      is_used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indices
    CREATE INDEX IF NOT EXISTS idx_members_mobile ON members(mobile);
    CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id);
    CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
    CREATE INDEX IF NOT EXISTS idx_users_member_id ON users(member_id);
    CREATE INDEX IF NOT EXISTS idx_subscription_dues_member ON subscription_dues(member_id, billing_month);
    CREATE INDEX IF NOT EXISTS idx_payment_submissions_member ON payment_submissions(member_id);
    CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON payment_submissions(status);
    CREATE INDEX IF NOT EXISTS idx_receipts_token ON receipts(verification_token);
    CREATE INDEX IF NOT EXISTS idx_receipts_receipt_no ON receipts(receipt_number);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
  `);
}
