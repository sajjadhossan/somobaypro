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

// POST /api/neon/auth/signup - Neon Managed Better Auth Email Signup
router.post('/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, callbackURL } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const { getNeonAuthClient } = await import('../services/neon.js');
    const authClient = await getNeonAuthClient();
    const effectiveCallback = callbackURL || 'https://somobaypro.vercel.app';
    const result = await authClient.signUp.email(
      {
        email,
        password,
        name: name || email.split('@')[0],
        callbackURL: effectiveCallback,
      },
      {
        headers: {
          origin: effectiveCallback,
        },
      }
    );
    res.status(201).json({
      success: true,
      user: result.data?.user || result.user,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/neon/auth/signin - Neon Managed Better Auth Email Signin
router.post('/auth/signin', async (req: Request, res: Response) => {
  try {
    const { email, password, callbackURL } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const { getNeonAuthClient } = await import('../services/neon.js');
    const authClient = await getNeonAuthClient();
    const effectiveCallback = callbackURL || 'https://somobaypro.vercel.app';
    const result = await authClient.signIn.email(
      {
        email,
        password,
        callbackURL: effectiveCallback,
      },
      {
        headers: {
          origin: effectiveCallback,
        },
      }
    );
    res.json({
      success: true,
      user: result.data?.user || result.user,
      session: result.data?.session || result.session,
    });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message });
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
