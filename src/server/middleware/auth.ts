import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/index';

const JWT_SECRET = process.env.JWT_SECRET || 'pkss_society_secure_jwt_secret_key_2026';

export interface AuthUser {
  id: number;
  memberId: string;
  mobile: string;
  role: string;
  accountStatus: string;
  permissions: string[];
  fullNameBn?: string;
  fullNameEn?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(user: AuthUser, expiresIn: string = '7d') {
  return jwt.sign(
    {
      id: user.id,
      memberId: user.memberId,
      mobile: user.mobile,
      role: user.role,
      permissions: user.permissions,
    },
    JWT_SECRET,
    { expiresIn } as any
  );
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check user in database
    const user = db.prepare(`
      SELECT u.id, u.member_id as memberId, u.mobile, u.role, u.account_status as accountStatus, 
             u.permissions, m.full_name_bn as fullNameBn, m.full_name_en as fullNameEn
      FROM users u
      LEFT JOIN members m ON u.member_id = m.member_id
      WHERE u.id = ?
    `).get(decoded.id) as any;

    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({ error: `Account is ${user.accountStatus}. Please contact the administrator.` });
    }

    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = JSON.parse(user.permissions || '[]');
    } catch {
      parsedPermissions = [];
    }

    req.user = {
      id: user.id,
      memberId: user.memberId,
      mobile: user.mobile,
      role: user.role,
      accountStatus: user.accountStatus,
      permissions: parsedPermissions,
      fullNameBn: user.fullNameBn,
      fullNameEn: user.fullNameEn,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

/**
 * Middleware to enforce role access.
 * Note: Super Admin always has full access across the system!
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // Super Admin has unrestricted authority across all modules
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({ 
      error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}], current role is: ${req.user.role}` 
    });
  };
}

/**
 * Middleware to enforce granular permissions or Super Admin authority
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (req.user.role === 'super_admin' || req.user.permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({ error: `Permission denied. Missing required permission: ${permission}` });
  };
}
