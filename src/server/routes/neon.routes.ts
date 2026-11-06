import { Router, Request, Response } from 'express';
import { testAllNeonServices, getNeonSql, uploadToNeonStorage, getNeonAuthJwks, NEON_REALTIME_URL } from '../services/neon.js';

const router = Router();

// GET /api/neon/status - Full health check for all 4 Neon services
router.get('/status', async (req: Request, res: Response) => {
  try {
    const report = await testAllNeonServices();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/neon/users - Verify Neon PostgreSQL data
router.get('/users', async (req: Request, res: Response) => {
  try {
    const sql = getNeonSql();
    const users = await sql`
      SELECT u.id, u.member_id, u.mobile, u.role, u.account_status, m.full_name_bn, m.full_name_en 
      FROM users u
      LEFT JOIN members m ON u.member_id = m.member_id
      ORDER BY u.id ASC;
    `;
    res.json({ success: true, count: users.length, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/neon/storage/test - Test writing and reading from Neon S3 Bucket
router.post('/storage/test', async (req: Request, res: Response) => {
  try {
    const testKey = `test/ping-${Date.now()}.txt`;
    const content = `Neon Object Storage Test - SomobayPro at ${new Date().toISOString()}`;
    await uploadToNeonStorage(testKey, content, 'text/plain');
    res.json({ success: true, message: 'File written to Neon S3 assets bucket', key: testKey });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/neon/auth/jwks - Expose Neon Auth JWKS keys
router.get('/auth/jwks', async (req: Request, res: Response) => {
  try {
    const jwks = await getNeonAuthJwks();
    res.json(jwks);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

import { db } from '../db/index.js';

async function syncNeonUserToDatabase(email: string, name?: string, requestedSocietyId: number = 1) {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Check if user has an assigned role in Neon's neon_auth.user
  let neonRole = 'general_member';
  try {
    const { getNeonSql } = await import('../services/neon.js');
    const sql = getNeonSql();
    const rows = await sql`SELECT role FROM neon_auth.user WHERE LOWER(email) = ${cleanEmail} LIMIT 1;`;
    if (rows[0]?.role && rows[0].role !== 'user') {
      neonRole = rows[0].role;
    }
  } catch (e) {
    // Neon query fallback
  }

  // 2. Special Super Admin override for the platform founder email
  const isSuperOwner = cleanEmail === 'hossansajjad1994@gmail.com';
  if (isSuperOwner) {
    neonRole = 'super_admin';
  }

  let user = db.prepare(`SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(mobile) = ?`).get(cleanEmail, cleanEmail) as any;

  if (!user) {
    const countRow = db.prepare(`SELECT count(*) as count FROM members`).get() as { count: number };
    const memberId = `NEON-${String(countRow.count + 1).padStart(4, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const displayName = (name && name.trim()) || cleanEmail.split('@')[0];

    const initialAccountStatus = isSuperOwner ? 'active' : 'activation_pending';
    const initialMembershipStatus = isSuperOwner ? 'active' : 'pending';
    const initialPermissions = isSuperOwner
      ? '["all_privileges", "manage_societies", "approve_members", "manage_finance", "view_reports"]'
      : '["view_own_dues", "submit_deposit", "view_own_receipts"]';

    db.transaction(() => {
      db.prepare(`
        INSERT INTO members (
          member_id, full_name_bn, full_name_en, mobile, email, joining_date,
          membership_type, membership_fee, monthly_subscription_amount, designation, membership_status, society_id
        ) VALUES (?, ?, ?, ?, ?, ?, 'regular', 500, 1000, ?, ?, ?)
      `).run(
        memberId,
        displayName,
        displayName,
        cleanEmail,
        cleanEmail,
        today,
        isSuperOwner ? 'সুপার এডমিন ও সভাপতি' : 'সাধারণ সদস্য',
        initialMembershipStatus,
        requestedSocietyId
      );

      db.prepare(`
        INSERT INTO users (
          member_id, mobile, email, password_hash, role, account_status, permissions, society_id
        ) VALUES (?, ?, ?, 'NEON_MANAGED_AUTH', ?, ?, ?, ?)
      `).run(
        memberId,
        cleanEmail,
        cleanEmail,
        neonRole,
        initialAccountStatus,
        initialPermissions,
        requestedSocietyId
      );
    })();

    user = db.prepare(`SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(mobile) = ?`).get(cleanEmail, cleanEmail) as any;
  } else {
    // If owner or if role in Neon changed, keep role updated!
    if (isSuperOwner && user.role !== 'super_admin') {
      db.prepare(`UPDATE users SET role = 'super_admin', account_status = 'active' WHERE id = ?`).run(user.id);
      db.prepare(`UPDATE members SET membership_status = 'active' WHERE member_id = ?`).run(user.member_id);
      user.role = 'super_admin';
      user.account_status = 'active';
    } else if (neonRole !== 'general_member' && neonRole !== user.role) {
      db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(neonRole, user.id);
      user.role = neonRole;
    }
  }

  const member = db.prepare(`SELECT * FROM members WHERE member_id = ?`).get(user.member_id) as any;

  let parsedPermissions: string[] = [];
  try {
    parsedPermissions = JSON.parse(user.permissions || '[]');
  } catch {
    parsedPermissions = ['view_own_dues', 'submit_deposit', 'view_own_receipts'];
  }

  return {
    id: user.id,
    memberId: user.member_id,
    mobile: user.mobile,
    email: user.email || cleanEmail,
    role: user.role,
    accountStatus: user.account_status,
    societyId: user.society_id || 1,
    permissions: parsedPermissions,
    fullNameBn: member?.full_name_bn || name || 'সমবায় সদস্য',
    fullNameEn: member?.full_name_en || name || 'Somobay Member',
    membershipStatus: member?.membership_status || 'active',
  };
}

// POST /api/neon/auth/signup - Neon Managed Better Auth Email Signup
router.post('/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, societyId, callbackURL } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const { getNeonAuthClient } = await import('../services/neon.js');
    const { generateToken } = await import('../middleware/auth.js');
    const authClient = await getNeonAuthClient();
    const effectiveOrigin = (req.headers.origin as string) || callbackURL || 'https://somobaypro.vercel.app';
    const effectiveCallback = callbackURL || effectiveOrigin;

    let neonUser: any = null;
    try {
      const result = await authClient.signUp.email(
        {
          email: cleanEmail,
          password,
          name: name || cleanEmail.split('@')[0],
          callbackURL: effectiveCallback,
        },
        {
          headers: {
            origin: effectiveOrigin,
          },
        }
      );
      if (result?.error) {
        throw new Error(result.error.message || 'Neon signup failed');
      }
      neonUser = result?.data?.user || result?.user;
    } catch (err: any) {
      // If user already registered in Neon, automatically try signing in
      if (err.message && err.message.toLowerCase().includes('already exists')) {
        const signinRes = await authClient.signIn.email(
          {
            email: cleanEmail,
            password,
            callbackURL: effectiveCallback,
          },
          {
            headers: {
              origin: effectiveOrigin,
            },
          }
        );
        if (signinRes?.error) {
          return res.status(400).json({
            success: false,
            error: 'এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি আছে। দয়া করে সাইন-ইন ট্যাবে পাসওয়ার্ড দিয়ে লগইন করুন।'
          });
        }
        neonUser = signinRes?.data?.user || signinRes?.user;
      } else {
        throw err;
      }
    }

    const appUser = await syncNeonUserToDatabase(cleanEmail, name || neonUser?.name, Number(societyId) || 1);

    // If new user is activation_pending (requires approval from President / Super Admin)
    if (appUser.role !== 'super_admin' && appUser.accountStatus === 'activation_pending') {
      return res.status(201).json({
        success: true,
        pendingApproval: true,
        message: 'আপনার নিবন্ধন আবেদনটি সফলভাবে জমা হয়েছে! সমিতির সভাপতি বা সুপার এডমিন অনুমোদন (Approve) করলে আপনি লগইন করতে পারবেন।',
        user: appUser,
      });
    }

    const token = generateToken(appUser as any);

    return res.status(201).json({
      success: true,
      token,
      user: appUser,
      neonUser,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Signup failed' });
  }
});

// POST /api/neon/auth/signin - Neon Managed Better Auth Email Signin
router.post('/auth/signin', async (req: Request, res: Response) => {
  try {
    const { email, password, callbackURL } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const { getNeonAuthClient } = await import('../services/neon.js');
    const { generateToken } = await import('../middleware/auth.js');
    const authClient = await getNeonAuthClient();
    const effectiveOrigin = (req.headers.origin as string) || callbackURL || 'https://somobaypro.vercel.app';
    const effectiveCallback = callbackURL || effectiveOrigin;

    const result = await authClient.signIn.email(
      {
        email: cleanEmail,
        password,
        callbackURL: effectiveCallback,
      },
      {
        headers: {
          origin: effectiveOrigin,
        },
      }
    );

    if (result?.error) {
      return res.status(401).json({
        success: false,
        error: result.error.message || 'ভুল ইমেইল বা পাসওয়ার্ড প্রদান করা হয়েছে'
      });
    }

    const neonUser = result.data?.user || result.user || {};
    const appUser = await syncNeonUserToDatabase(cleanEmail, neonUser.name);

    // Enforce approval check: Activation pending users cannot enter without approval!
    if (appUser.accountStatus === 'activation_pending') {
      return res.status(403).json({
        success: false,
        error: 'আপনার আবেদনটি এখনো অপেক্ষমাণ রয়েছে। সমিতির সভাপতি বা সুপার এডমিন অনুমোদন (Approve) করার পর আপনি লগইন করতে পারবেন।'
      });
    }

    if (appUser.accountStatus === 'suspended' || appUser.accountStatus === 'deactivated') {
      return res.status(403).json({
        success: false,
        error: 'আপনার অ্যাকাউন্টটি স্থগিত বা নিষ্ক্রিয় করা হয়েছে। সমিতির কর্তৃপক্ষের সাথে যোগাযোগ করুন।'
      });
    }

    const token = generateToken(appUser as any);

    return res.json({
      success: true,
      token,
      user: appUser,
      session: result.data?.session || result.session,
    });
  } catch (err: any) {
    return res.status(401).json({ success: false, error: err.message || 'Authentication failed' });
  }
});

// GET /api/neon/auth/users - Read registered Better Auth users from PostgreSQL
router.get('/auth/users', async (req: Request, res: Response) => {
  try {
    const sql = getNeonSql();
    const users = await sql`
      SELECT id, name, email, "emailVerified", "createdAt" 
      FROM neon_auth.user 
      ORDER BY "createdAt" DESC 
      LIMIT 20;
    `;
    res.json({ success: true, count: users.length, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
