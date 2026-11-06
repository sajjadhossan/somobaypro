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

function syncNeonUserToDatabase(email: string, name?: string) {
  const cleanEmail = email.trim().toLowerCase();
  let user = db.prepare(`SELECT * FROM users WHERE email = ? OR mobile = ?`).get(cleanEmail, cleanEmail) as any;

  if (!user) {
    const countRow = db.prepare(`SELECT count(*) as count FROM members`).get() as { count: number };
    const memberId = `NEON-${String(countRow.count + 1).padStart(4, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const displayName = (name && name.trim()) || cleanEmail.split('@')[0];

    db.transaction(() => {
      db.prepare(`
        INSERT INTO members (
          member_id, full_name_bn, full_name_en, mobile, email, joining_date,
          membership_type, membership_fee, monthly_subscription_amount, designation, membership_status
        ) VALUES (?, ?, ?, ?, ?, ?, 'regular', 500, 1000, 'সাধারণ সদস্য', 'active')
      `).run(memberId, displayName, displayName, cleanEmail, cleanEmail, today);

      db.prepare(`
        INSERT INTO users (
          member_id, mobile, email, password_hash, role, account_status, permissions
        ) VALUES (?, ?, ?, 'NEON_MANAGED_AUTH', 'general_member', 'active', '["view_own_dues","submit_deposit","view_own_receipts"]')
      `).run(memberId, cleanEmail, cleanEmail);
    })();

    user = db.prepare(`SELECT * FROM users WHERE email = ? OR mobile = ?`).get(cleanEmail, cleanEmail) as any;
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
    permissions: parsedPermissions,
    fullNameBn: member?.full_name_bn || name || 'সমবায় সদস্য',
    fullNameEn: member?.full_name_en || name || 'Somobay Member',
    membershipStatus: member?.membership_status || 'active',
  };
}

// POST /api/neon/auth/signup - Neon Managed Better Auth Email Signup
router.post('/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, callbackURL } = req.body;
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

    const appUser = syncNeonUserToDatabase(cleanEmail, name || neonUser?.name);
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
    const appUser = syncNeonUserToDatabase(cleanEmail, neonUser.name);
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
