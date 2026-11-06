import { getNeonSql } from '../services/neon.js';
import bcrypt from 'bcryptjs';

export async function migrateAndSeedNeon() {
  const sql = getNeonSql();

  console.log('🔄 Initializing Neon PostgreSQL Schema...');

  // 1. Create Tables
  await sql`
    CREATE TABLE IF NOT EXISTS society_settings (
      id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      name_bn TEXT NOT NULL,
      name_en TEXT NOT NULL,
      short_name TEXT NOT NULL,
      reg_no TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      currency TEXT DEFAULT 'BDT',
      monthly_subscription_default NUMERIC DEFAULT 1000,
      membership_fee_default NUMERIC DEFAULT 500,
      approval_workflow TEXT DEFAULT 'treasurer_only',
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      member_id TEXT UNIQUE NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      account_status TEXT DEFAULT 'active',
      permissions JSONB DEFAULT '[]'::jsonb,
      failed_attempts INT DEFAULT 0,
      locked_until TIMESTAMP WITH TIME ZONE,
      last_login TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
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
      joining_date TEXT NOT NULL,
      membership_type TEXT DEFAULT 'regular',
      membership_fee NUMERIC DEFAULT 500,
      monthly_subscription_amount NUMERIC DEFAULT 1000,
      designation TEXT DEFAULT 'সাধারণ সদস্য',
      membership_status TEXT DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id SERIAL PRIMARY KEY,
      bank_name TEXT NOT NULL,
      branch_name TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      routing_number TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INT,
      member_id TEXT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details JSONB DEFAULT '{}'::jsonb,
      ip_address TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  console.log('✅ Tables created successfully in Neon Postgres!');

  // 2. Seed Society Settings if not exists
  const existingSettings = await sql`SELECT id FROM society_settings WHERE id = 1 LIMIT 1;`;
  if (existingSettings.length === 0) {
    await sql`
      INSERT INTO society_settings (
        id, name_bn, name_en, short_name, reg_no, address, phone, email
      ) VALUES (
        1,
        'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড',
        'Progoti Kalyan Somobay Samity Ltd.',
        'সমবায় প্রো (SomobayPro)',
        'REG-DH-2018-0942',
        'মতিঝিল বাণিজ্যিক এলাকা, ঢাকা-১০০০',
        '+8801711000000',
        'info@somobaypro.com'
      );
    `;
    console.log('✅ Default society settings seeded into Neon!');
  }

  // 3. Seed Super Admin User
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const seedUsers = [
    { id: 'SOC-2026-0001', mobile: '01711000001', name_bn: 'মোহাম্মদ সাজ্জাদ হোসেন', name_en: 'Mohammad Sajjad Hossain', role: 'super_admin' },
  ];

  for (const u of seedUsers) {
    const existing = await sql`SELECT id FROM users WHERE mobile = ${u.mobile} LIMIT 1;`;
    if (existing.length === 0) {
      await sql`
        INSERT INTO users (member_id, mobile, password_hash, role, account_status)
        VALUES (${u.id}, ${u.mobile}, ${passwordHash}, ${u.role}, 'active');
      `;
      await sql`
        INSERT INTO members (member_id, full_name_bn, full_name_en, mobile, joining_date, designation)
        VALUES (${u.id}, ${u.name_bn}, ${u.name_en}, ${u.mobile}, '2026-01-01', ${u.role})
        ON CONFLICT (member_id) DO NOTHING;
      `;
    }
  }

  console.log('✅ Super Admin user seeded into Neon PostgreSQL!');
  return { success: true };
}

// Auto-run if executed directly
if (process.argv[1]?.endsWith('neon-migrate.ts') || process.argv[1]?.endsWith('neon-migrate.js')) {
  migrateAndSeedNeon()
    .then(() => {
      console.log('🎉 Neon Migration & Seed Completed Successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration error:', err);
      process.exit(1);
    });
}
