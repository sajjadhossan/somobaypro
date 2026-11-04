import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// GET /api/audit/logs
router.get('/logs', authenticate, requireRole(['super_admin']), (req: Request, res: Response) => {
  const { action, entityType, limit = 100 } = req.query;

  let query = `SELECT * FROM audit_logs WHERE 1=1`;
  const params: any[] = [];

  if (action) {
    query += ` AND action = ?`;
    params.push(action);
  }
  if (entityType) {
    query += ` AND entity_type = ?`;
    params.push(entityType);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(Number(limit));

  const logs = db.prepare(query).all(...params);
  return res.json({ logs });
});

// GET /api/audit/logins
router.get('/logins', authenticate, requireRole(['super_admin', 'admin']), (req: Request, res: Response) => {
  const { limit = 100 } = req.query;

  const history = db.prepare(`
    SELECT lh.*, u.member_id, u.role
    FROM login_history lh
    LEFT JOIN users u ON lh.user_id = u.id
    ORDER BY lh.created_at DESC
    LIMIT ?
  `).all(Number(limit));

  return res.json({ loginHistory: history });
});

export default router;
