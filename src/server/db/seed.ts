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

  // 4. Default Super Admin User (Founder & Platform Owner)
  const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

  const insertMember = db.prepare(`
    INSERT INTO members (
      member_id, full_name_bn, full_name_en, father_name, mother_name, dob, gender,
      nid_number, mobile, email, present_address, permanent_address, occupation,
      joining_date, membership_type, membership_fee, monthly_subscription_amount,
      designation, membership_status, nominee_name, nominee_relation, nominee_mobile,
      emergency_name, emergency_relation, emergency_mobile, approved_by, approved_at, society_id
    ) VALUES (
      'SOC-2026-0001', 'সাজ্জাদ হোসাইন', 'Sajjad Hossain',
      'মরহুম হাজী আব্দুল জলিল', 'মরহুমা ফাতেমা খাতুন', '1985-05-15', 'male',
      '19852693847500001', '01881210444', 'hossansajjad1994@gmail.com',
      'ধানমন্ডি, ঢাকা', 'মুন্সীগঞ্জ সদর', 'সফটওয়্যার প্রতিষ্ঠাতা ও উদ্যোক্তা',
      '2024-01-01', 'life', 500, 1000,
      'প্রধান নিয়ন্ত্রক ও প্রতিষ্ঠাতা', 'active',
      'মোছাঃ সুফিয়া বেগম', 'স্ত্রী', '01819000000',
      'আব্দুল করিম', 'ভাই', '01911000000',
      'SOC-2026-0001', CURRENT_TIMESTAMP, 1
    )
  `);
  insertMember.run();

  const insertUser = db.prepare(`
    INSERT INTO users (
      member_id, mobile, email, password_hash, role, account_status, permissions, society_id
    ) VALUES ('SOC-2026-0001', '01881210444', 'hossansajjad1994@gmail.com', ?, 'super_admin', 'active', '[]', 1)
  `);
  insertUser.run(defaultPasswordHash);

  // 5. Official Statutory Notice (Strict No Loans Policy)
  const insertNotice = db.prepare(`
    INSERT INTO notices (
      notice_number, title_bn, title_en, content_bn, content_en, priority,
      target_role, publish_date, is_published, created_by, society_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'SOC-2026-0001', 1)
  `);

  insertNotice.run(
    'NOT-2026-0001',
    'জরুরি নোটিশ: সমিতি কর্তৃক কোনো প্রকার ঋণ প্রদান করা হয় না',
    'Urgent Notice: No Loans are Provided by the Society',
    'সোসাইটির সকল সদস্য ও শুভানুধ্যায়ীদের বিশেষভাবে সতর্ক করা হচ্ছে যে, সমিতি কেবল সদস্যদের কল্যাণ, মাসিক সঞ্চয় ও সমাজসেবামূলক কর্মকাণ্ড পরিচালনা করে। কোনো ব্যক্তি বা সংস্থাকে কোনো ধরনের ঋণ প্রদান করা হয় না এবং ভবিষ্যতেও হবে না। ভুয়া তথ্য ও প্রতারণা থেকে সাবধান থাকুন।',
    'Notice to all members: This society strictly does not provide any loans. Beware of fraudulent offers.',
    'urgent',
    'all',
    '2026-01-01'
  );

  console.log('Clean production seeding completed successfully!');
}

if (process.argv[1]?.includes('seed.ts')) {
  seedDatabase().catch(console.error);
}

