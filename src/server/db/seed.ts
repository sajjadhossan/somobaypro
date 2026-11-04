import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { db, initDatabase } from './index';
import { AccountingService } from '../services/accounting.service';

export async function seedDatabase() {
  initDatabase();

  const existingSettings = db.prepare(`SELECT count(*) as count FROM society_settings`).get() as { count: number };
  if (existingSettings.count > 0) {
    console.log('Database already seeded. Skipping initial seed.');
    return;
  }

  console.log('Seeding database with realistic Bangladeshi Kalyan Samity data...');

  // 1. Society Settings and Branding
  db.prepare(`
    INSERT INTO society_settings (
      id, name_bn, name_en, short_name, reg_no, address, district, upazila,
      phone, email, website, est_date, description, logo_url, official_signature_url,
      receipt_footer, currency, monthly_subscription_default, membership_fee_default,
      approval_workflow, self_registration_enabled
    ) VALUES (
      1,
      'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড',
      'Progoti Kalyan Somobay Samity Limited',
      'PKSS',
      'REG-DH-2018-0942',
      'হাউজ #১২, রোড #০৫, ব্লক-ডি, ধানমন্ডি আ/এ',
      'ঢাকা',
      'ধানমন্ডি',
      '+880 1712-345678',
      'info@progotikalyan.org',
      'https://progotikalyan.org',
      '2018-03-26',
      'সদস্যদের পারস্পরিক সহযোগিতা, সামাজিক কল্যাণ ও সঞ্চয় নিশ্চিতকরণের জন্য গঠিত নিবন্ধিত সমবায় সমিতি। কোনো প্রকার ঋণ প্রদান করা হয় না।',
      '/logo.svg',
      '/signature.png',
      'এটি একটি কম্পিউটার জেনারেটেড ডিজিটাল রসিদ। কিউআর কোড স্ক্যান করে অনলাইন যাচাই করা যাবে।',
      'BDT',
      1000,
      500,
      'treasurer_only',
      1
    )
  `).run();

  // 2. Chart of Accounts (Double-Entry Accounting)
  const chartOfAccounts = [
    // Assets (1000s)
    { code: '1010', name_bn: 'নগদ তহবিল (ক্যাশ ইন হ্যান্ড)', name_en: 'Cash in Hand', type: 'asset', description: 'সোসাইটির অফিস ক্যাশ' },
    { code: '1020', name_bn: 'ব্যাংক হিসাব (সোনালী ও ডাচ-বাংলা)', name_en: 'Bank Accounts', type: 'asset', description: 'অফিসিয়াল ব্যাংক একাউন্ট' },
    { code: '1030', name_bn: 'সদস্য চাঁদা প্রাপ্য (রিসিভেবল)', name_en: 'Subscription Dues Receivable', type: 'asset', description: 'বকেয়া চাঁদা' },
    { code: '1050', name_bn: 'অফিস আসবাবপত্র ও সরঞ্জাম', name_en: 'Office Furniture & Equipment', type: 'asset', description: 'স্থায়ী সম্পদ' },

    // Liabilities (2000s)
    { code: '2010', name_bn: 'প্রদেয় বিল ও খরচ', name_en: 'Accounts Payable', type: 'liability', description: 'বকেয়া বিলসমূহ' },

    // Equity (3000s)
    { code: '3010', name_bn: 'সোসাইটি মূল তহবিল (সঞ্চিতি)', name_en: 'General Reserve Fund', type: 'equity', description: 'সমিতির সংরক্ষিত মূল তহবিল' },

    // Revenues (4000s)
    { code: '4010', name_bn: 'সদস্যদের মাসিক চাঁদা আয়', name_en: 'Monthly Subscription Revenue', type: 'revenue', description: 'নিয়মিত মাসিক চাঁদা' },
    { code: '4020', name_bn: 'নতুন সদস্য ভর্তি ফি', name_en: 'Membership Admission Fees', type: 'revenue', description: 'এককালীন সদস্য ভর্তি ফি' },
    { code: '4030', name_bn: 'ব্যাংক মুনাফা / লভ্যাংশ', name_en: 'Bank Profit & Interest Income', type: 'revenue', description: 'ব্যাংক জমার মুনাফা' },
    { code: '4040', name_bn: 'অনুদান ও অন্যান্য আয়', name_en: 'Donations & Other Income', type: 'revenue', description: 'কল্যাণ অনুদান' },

    // Expenses (5000s)
    { code: '5010', name_bn: 'অফিস ভাড়া খরচ', name_en: 'Office Rent Expense', type: 'expense', description: 'কার্যালয় ভাড়া' },
    { code: '5020', name_bn: 'বিদ্যুৎ ও ইউটিলিটি বিল', name_en: 'Utility & Electricity Expense', type: 'expense', description: 'সেবা বিল' },
    { code: '5030', name_bn: 'কর্মকর্তা সম্মানী ও বেতন', name_en: 'Staff Salary & Honorarium', type: 'expense', description: 'অফিস সহকারী ও স্টাফ' },
    { code: '5040', name_bn: 'মুদ্রণ ও স্টেশনারি', name_en: 'Printing & Stationery', type: 'expense', description: 'কাগজপত্র ও রসিদ বই' },
    { code: '5050', name_bn: 'সভা ও আপ্যায়ন খরচ', name_en: 'Meeting & Hospitality', type: 'expense', description: 'কমিটি সভা আপ্যায়ন' },
    { code: '5060', name_bn: 'বার্ষিক সাধারণ সভা (AGM)', name_en: 'Annual General Meeting Expense', type: 'expense', description: 'বার্ষিক সম্মেলন' },
    { code: '5070', name_bn: 'অফিস মেরামত ও রক্ষণাবেক্ষণ', name_en: 'Repairs & Maintenance', type: 'expense', description: 'অফিস সংস্কার' },
    { code: '5090', name_bn: 'বিবিধ আনুষঙ্গিক ব্যয়', name_en: 'Miscellaneous Expense', type: 'expense', description: 'অন্যান্য খরচ' },
  ];

  const insertCOA = db.prepare(`
    INSERT INTO chart_of_accounts (code, name_bn, name_en, type, balance, description)
    VALUES (?, ?, ?, ?, 0, ?)
  `);
  for (const coa of chartOfAccounts) {
    insertCOA.run(coa.code, coa.name_bn, coa.name_en, coa.type, coa.description);
  }

  // 3. Official Society Bank Accounts
  const insertBank = db.prepare(`
    INSERT INTO bank_accounts (
      bank_name, branch_name, account_name, account_number, account_type, routing_number, opening_balance, current_balance, is_primary, is_active, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  insertBank.run(
    'Sonali Bank PLC',
    'Dhanmondi Branch',
    'Progoti Kalyan Somobay Samity',
    '0102030405060',
    'Current',
    '200261144',
    250000,
    250000,
    1,
    'প্রাথমিক প্রধান ব্যাংক হিসাব'
  );

  insertBank.run(
    'Dutch-Bangla Bank PLC',
    'Satmasjid Road Branch',
    'Progoti Kalyan Somobay Samity',
    '1151200034567',
    'Savings',
    '090261345',
    150000,
    150000,
    0,
    'অনলাইন পেমেন্ট ও সঞ্চয়ী হিসাব'
  );

  // 4. Default Users for all 7 Primary Roles
  const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

  const initialRoles = [
    {
      memberId: 'SOC-2026-0001',
      fullNameBn: 'মোহাম্মদ সাজ্জাদ হোসেন',
      fullNameEn: 'Mohammad Sajjad Hossain',
      mobile: '01711000001',
      email: 'superadmin@progotikalyan.org',
      role: 'super_admin',
      designation: 'প্রধান নিয়ন্ত্রক ও প্রতিষ্ঠাতা',
      membershipType: 'life',
    },
    {
      memberId: 'SOC-2026-0002',
      fullNameBn: 'রফিকুল ইসলাম তালুকদার',
      fullNameEn: 'Rafiqul Islam Talukder',
      mobile: '01711000002',
      email: 'admin@progotikalyan.org',
      role: 'admin',
      designation: 'প্রশাসক (সিস্টেম এডমিন)',
      membershipType: 'executive',
    },
    {
      memberId: 'SOC-2026-0003',
      fullNameBn: 'ড. আবুল কালাম আজাদ',
      fullNameEn: 'Dr. Abul Kalam Azad',
      mobile: '01711000003',
      email: 'president@progotikalyan.org',
      role: 'president',
      designation: 'সভাপতি (কার্যনির্বাহী পরিষদ)',
      membershipType: 'executive',
    },
    {
      memberId: 'SOC-2026-0004',
      fullNameBn: 'মাহমুদুল হাসান চৌধুরী',
      fullNameEn: 'Mahmudul Hasan Chowdhury',
      mobile: '01711000004',
      email: 'secretary@progotikalyan.org',
      role: 'general_secretary',
      designation: 'সাধারণ সম্পাদক',
      membershipType: 'executive',
    },
    {
      memberId: 'SOC-2026-0005',
      fullNameBn: 'নুরুল হক মজুমদার',
      fullNameEn: 'Nurul Haque Mazumder',
      mobile: '01711000005',
      email: 'treasurer@progotikalyan.org',
      role: 'treasurer',
      designation: 'কোষাধ্যক্ষ (অর্থ সম্পাদক)',
      membershipType: 'executive',
    },
    {
      memberId: 'SOC-2026-0006',
      fullNameBn: 'প্রফেসর এম. এ. লতিফ',
      fullNameEn: 'Prof. M. A. Latif',
      mobile: '01711000006',
      email: 'advisor@progotikalyan.org',
      role: 'advisor',
      designation: 'প্রধান উপদেষ্টা',
      membershipType: 'honorary',
    },
    {
      memberId: 'SOC-2026-0007',
      fullNameBn: 'তানভীর আহমেদ',
      fullNameEn: 'Tanvir Ahmed',
      mobile: '01711000007',
      email: 'tanvir@example.com',
      role: 'general_member',
      designation: 'সাধারণ সদস্য',
      membershipType: 'regular',
    },
    {
      memberId: 'SOC-2026-0008',
      fullNameBn: 'মোছাঃ নাসরিন আক্তার',
      fullNameEn: 'Nasrin Akter',
      mobile: '01711000008',
      email: 'nasrin@example.com',
      role: 'general_member',
      designation: 'সাধারণ সদস্য',
      membershipType: 'regular',
    },
    {
      memberId: 'SOC-2026-0009',
      fullNameBn: 'কাজী শাহাদাত হোসেন',
      fullNameEn: 'Kazi Shahadat Hossain',
      mobile: '01711000009',
      email: 'shahadat@example.com',
      role: 'general_member',
      designation: 'সাধারণ সদস্য',
      membershipType: 'regular',
    },
    {
      memberId: 'SOC-2026-0010',
      fullNameBn: 'ফারহানা ইসলাম সুমি',
      fullNameEn: 'Farhana Islam Sumi',
      mobile: '01711000010',
      email: 'farhana@example.com',
      role: 'general_member',
      designation: 'সাধারণ সদস্য',
      membershipType: 'regular',
    },
  ];

  const insertMember = db.prepare(`
    INSERT INTO members (
      member_id, full_name_bn, full_name_en, father_name, mother_name, dob, gender,
      nid_number, mobile, email, present_address, permanent_address, occupation,
      joining_date, membership_type, membership_fee, monthly_subscription_amount,
      designation, membership_status, nominee_name, nominee_relation, nominee_mobile,
      emergency_name, emergency_relation, emergency_mobile, approved_by, approved_at
    ) VALUES (?, ?, ?, ?, ?, '1985-05-15', 'male', ?, ?, ?, 'ধানমন্ডি, ঢাকা', 'মুন্সীগঞ্জ সদর', 'ব্যবসায়ী/চাকুরিজীবী', '2024-01-01', ?, 500, 1000, ?, 'active', 'মোছাঃ সুফিয়া বেগম', 'স্ত্রী', '01819000000', 'আব্দুল করিম', 'ভাই', '01911000000', 'SOC-2026-0001', CURRENT_TIMESTAMP)
  `);

  const insertUser = db.prepare(`
    INSERT INTO users (
      member_id, mobile, email, password_hash, role, account_status, permissions
    ) VALUES (?, ?, ?, ?, ?, 'active', '[]')
  `);

  for (let i = 0; i < initialRoles.length; i++) {
    const r = initialRoles[i];
    const nid = `1985269384750000${i + 1}`;
    insertMember.run(
      r.memberId,
      r.fullNameBn,
      r.fullNameEn,
      'মরহুম হাজী আব্দুল জলিল',
      'মরহুমা ফাতেমা খাতুন',
      nid,
      r.mobile,
      r.email,
      r.membershipType,
      r.designation
    );

    insertUser.run(
      r.memberId,
      r.mobile,
      r.email,
      defaultPasswordHash,
      r.role
    );
  }

  // 5. Pre-seed Subscription Dues for Jan, Feb, Mar 2026
  const months = ['2026-01', '2026-02', '2026-03'];
  const insertDue = db.prepare(`
    INSERT INTO subscription_dues (member_id, billing_month, due_amount, paid_amount, status, due_date)
    VALUES (?, ?, 1000, ?, ?, ?)
  `);

  for (const r of initialRoles) {
    // Member 0007 has Jan paid, Feb paid, Mar unpaid
    // Member 0008 has Jan paid, Feb unpaid, Mar unpaid
    // Member 0009 has all 3 unpaid
    // Member 0010 has Jan paid, Feb partial
    if (r.memberId === 'SOC-2026-0007') {
      insertDue.run(r.memberId, '2026-01', 1000, 'paid', '2026-01-15');
      insertDue.run(r.memberId, '2026-02', 1000, 'paid', '2026-02-15');
      insertDue.run(r.memberId, '2026-03', 0, 'unpaid', '2026-03-15');
    } else if (r.memberId === 'SOC-2026-0008') {
      insertDue.run(r.memberId, '2026-01', 1000, 'paid', '2026-01-15');
      insertDue.run(r.memberId, '2026-02', 0, 'unpaid', '2026-02-15');
      insertDue.run(r.memberId, '2026-03', 0, 'unpaid', '2026-03-15');
    } else {
      for (const m of months) {
        insertDue.run(r.memberId, m, 1000, 'paid', `${m}-15`);
      }
    }
  }

  // 6. Pre-seed Approved Receipts with QR Verification for Tanvir Ahmed (SOC-2026-0007)
  const seedReceipts = [
    {
      receiptNumber: 'RCP-2026-000001',
      memberId: 'SOC-2026-0007',
      amount: 1000,
      months: '2026-01',
      depositDate: '2026-01-10',
      txId: 'SON-DEP-994821',
      token: crypto.randomBytes(24).toString('hex'),
    },
    {
      receiptNumber: 'RCP-2026-000002',
      memberId: 'SOC-2026-0007',
      amount: 1000,
      months: '2026-02',
      depositDate: '2026-02-12',
      txId: 'DBBL-FT-481920',
      token: crypto.randomBytes(24).toString('hex'),
    },
  ];

  for (const rc of seedReceipts) {
    const subRes = db.prepare(`
      INSERT INTO payment_submissions (
        submission_number, member_id, amount, payment_months, society_bank_account_id,
        member_bank_name, member_branch_name, deposit_date, transaction_id, status,
        approved_by_id, approved_at
      ) VALUES (?, ?, ?, ?, 1, 'Dutch-Bangla Bank', 'Mirpur', ?, ?, 'approved', 'SOC-2026-0005', CURRENT_TIMESTAMP)
    `).run(
      `SUB-${rc.receiptNumber.slice(4)}`,
      rc.memberId,
      rc.amount,
      rc.months,
      rc.depositDate,
      rc.txId
    );

    const qrUrl = `http://localhost:5173/verify/${rc.receiptNumber}?token=${rc.token}`;
    const qrData = await QRCode.toDataURL(qrUrl, { margin: 1, width: 256 });

    db.prepare(`
      INSERT INTO receipts (
        receipt_number, payment_submission_id, member_id, amount, payment_months,
        bank_name, account_number, deposit_date, transaction_id, verification_token,
        qr_code_data, status, issued_by_id
      ) VALUES (?, ?, ?, ?, ?, 'Sonali Bank PLC', '0102030405060', ?, ?, ?, ?, 'valid', 'SOC-2026-0005')
    `).run(
      rc.receiptNumber,
      subRes.lastInsertRowid,
      rc.memberId,
      rc.amount,
      rc.months,
      rc.depositDate,
      rc.txId,
      rc.token,
      qrData
    );

    // Initial Ledger entries for seed receipts
    AccountingService.postJournalEntry({
      entryDate: rc.depositDate,
      referenceType: 'payment',
      referenceId: rc.receiptNumber,
      description: `সদস্য চাঁদা প্রাপ্তি - তানভীর আহমেদ (${rc.memberId}), মাস: ${rc.months}`,
      lines: [
        { accountCode: '1020', debit: rc.amount, credit: 0, description: 'ব্যাংক জমা - Sonali Bank' },
        { accountCode: '4010', debit: 0, credit: rc.amount, description: 'মাসিক চাঁদা আয়' },
      ],
      createdBy: 'SOC-2026-0005',
    });
  }

  // 7. Seed one Pending Deposit Submission for Treasurer to review and approve!
  db.prepare(`
    INSERT INTO payment_submissions (
      submission_number, member_id, amount, payment_months, society_bank_account_id,
      member_bank_name, member_branch_name, deposit_date, transaction_id, notes, status
    ) VALUES (
      'SUB-2026-00003',
      'SOC-2026-0008',
      1000,
      '2026-02',
      1,
      'Sonali Bank',
      'Dhanmondi',
      '2026-03-01',
      'DEP-SLIP-778899',
      'ফেব্রুয়ারি ২০২৬ মাসের চাঁদা জমা দেওয়া হলো। স্লিপ সংযুক্ত।',
      'pending'
    )
  `).run();

  // 8. Seed Expense Voucher (Double-Entry)
  const expRes = db.prepare(`
    INSERT INTO expense_records (
      voucher_number, category, amount, expense_date, payment_method, bank_account_id,
      payee_name, description, status, approved_by, created_by
    ) VALUES (
      'VCH-2026-00001',
      'office_rent',
      15000,
      '2026-02-01',
      'bank',
      1,
      'হাজী মোজাম্মেল হক (মালিক)',
      'ফেব্রুয়ারি ২০২৬ মাসের অফিস ভাড়া পরিশোধ',
      'approved',
      'SOC-2026-0003',
      'SOC-2026-0005'
    )
  `).run();

  AccountingService.postJournalEntry({
    entryDate: '2026-02-01',
    referenceType: 'expense',
    referenceId: 'VCH-2026-00001',
    description: 'অফিস ভাড়া পরিশোধ (ফেব্রুয়ারি ২০২৬)',
    lines: [
      { accountCode: '5010', debit: 15000, credit: 0, description: 'অফিস ভাড়া ব্যয়' },
      { accountCode: '1020', debit: 0, credit: 15000, description: 'সোনালী ব্যাংক হতে পরিশোধ' },
    ],
    createdBy: 'SOC-2026-0005',
  });

  // 9. Pre-seed Official Notices
  const insertNotice = db.prepare(`
    INSERT INTO notices (
      notice_number, title_bn, title_en, content_bn, content_en, priority,
      target_role, publish_date, is_published, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'SOC-2026-0004')
  `);

  insertNotice.run(
    'NOT-2026-0001',
    'মার্চ ২০২৬ মাসের নিয়মিত মাসিক চাঁদা পরিশোধের সময়সূচী',
    'Schedule for Payment of March 2026 Monthly Subscription',
    'সকল সম্মানিত সদস্যবৃন্দের অবগতির জন্য জানানো যাচ্ছে যে, মার্চ ২০২৬ মাসের মাসিক চাঁদা আগামী ১৫ই মার্চের মধ্যে সমিতির অফিসিয়াল ব্যাংক হিসাবে জমা দেওয়ার জন্য অনুরোধ করা যাচ্ছে। জমা রশিদ সিস্টেমে সাবমিট করে ডিজিটাল রসিদ গ্রহণ করুন।',
    'All members are requested to deposit the monthly subscription of March 2026 into the official bank account by March 15th.',
    'important',
    'all',
    '2026-03-01'
  );

  insertNotice.run(
    'NOT-2026-0002',
    'জরুরি নোটিশ: সমিতি কর্তৃক কোনো প্রকার ঋণ প্রদান করা হয় না',
    'Urgent Notice: No Loans are Provided by the Society',
    'সোসাইটির সকল সদস্য ও শুভানুধ্যায়ীদের বিশেষভাবে সতর্ক করা হচ্ছে যে, প্রগতি কল্যাণ সমবায় সমিতি কেবল সদস্যদের কল্যাণ, মাসিক সঞ্চয় ও সমাজসেবামূলক কর্মকাণ্ড পরিচালনা করে। কোনো ব্যক্তি বা সংস্থাকে কোনো ধরনের ঋণ প্রদান করা হয় না এবং ভবিষ্যতেও হবে না। ভুয়া তথ্য ও প্রতারণা থেকে সাবধান থাকুন।',
    'Notice to all members: This society strictly does not provide any loans. Beware of fraudulent offers.',
    'urgent',
    'all',
    '2026-02-15'
  );

  // 10. Pre-seed Upcoming Meeting
  db.prepare(`
    INSERT INTO meetings (
      title, meeting_type, date_time, location, agenda, minutes, resolutions, is_published, created_by
    ) VALUES (
      'কার্যনির্বাহী পরিষদের দ্বি-মাসিক সভা - মার্চ ২০২৬',
      'executive',
      '2026-03-20T17:00',
      'সমিতির প্রধান কার্যালয় (সম্মেলন কক্ষ), ধানমন্ডি',
      '১. বিগত সভার কার্যবিবরণী নিশ্চিতকরণ।\n২. ফেব্রুয়ারি মাসের আয়-ব্যয় অনুমোদন।\n৩. ডিজিটাল রসিদ ও কিউআর যাচাই ব্যবস্থার অগ্রগতি পর্যালোচনা।\n৪. বিবিধ।',
      'বিগত সভার সিদ্ধান্তসমূহ সর্বসম্মতিক্রমে অনুমোদিত হয়। ডিজিটাল রসিদ কার্যক্রম দ্রুত বাস্তবায়নে কোষাধ্যক্ষকে নির্দেশ প্রদান করা হয়।',
      'সকল সদস্যের ডিজিটাল রসিদ বাধ্যতামূলক করা হলো। কোনো কাগজের রসিদ বৈধ হিসেবে গণ্য হবে না।',
      1,
      'SOC-2026-0004'
    )
  `).run();

  // 11. Pre-seed Official Society Documents
  const insertDoc = db.prepare(`
    INSERT INTO society_documents (title, category, file_url, file_size, access_level, uploaded_by)
    VALUES (?, ?, ?, ?, ?, 'SOC-2026-0004')
  `);

  insertDoc.run('সমিতির অনুমোদিত উপ-আইন (Bylaws) ও গঠনতন্ত্র', 'bylaw', '/documents/bylaws-2026.pdf', '2.4 MB', 'members_only');
  insertDoc.run('সমবায় অধিদপ্তর নিবন্ধন সনদপত্র (Reg Certificate)', 'registration', '/documents/registration-cert.pdf', '1.1 MB', 'public');
  insertDoc.run('বার্ষিক অডিট প্রতিবেদন ২০২৩-২০২৪', 'audit', '/documents/annual-audit-report.pdf', '3.8 MB', 'members_only');

  // 12. Pre-seed Support Ticket
  db.prepare(`
    INSERT INTO support_tickets (
      ticket_number, member_id, subject, category, message, status, priority, admin_response, resolved_by, resolved_at
    ) VALUES (
      'TKT-2026-0001',
      'SOC-2026-0007',
      'মোবাইল ব্যাংকিং থেকে সরাসরি জমা দেওয়ার সুবিধা',
      'general',
      'আসসালামু আলাইকুম, ব্যাংকের পাশাপাশি সরাসরি বিকাশ বা নগদ একাউন্টে সমিতির পক্ষ থেকে জমা নেওয়া সম্ভব কি না জানালে উপকৃত হতাম।',
      'resolved',
      'normal',
      'ওয়ালাইকুম আসসালাম। সমিতির হিসাবের স্বচ্ছতা ও ডাবল-এন্ট্রি অডিট নিয়মানুযায়ী সকল অর্থ কেবল অনুমোদিত ব্যাংক একাউন্টে জমা নেওয়া হয়। তবে আপনি বিকাশ/নগদের "ব্যাংক ডিপোজিট" সুবিধা ব্যবহার করে সরাসরি সমিতির ব্যাংক একাউন্টে জমা করতে পারবেন।',
      'SOC-2026-0004',
      CURRENT_TIMESTAMP
    )
  `).run();

  console.log('Seeding completed successfully!');
}

if (process.argv[1]?.includes('seed.ts')) {
  seedDatabase().catch(console.error);
}

