import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, (req: Request, res: Response) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 50
  `).all(req.user!.id);

  const unreadCount = (db.prepare(`
    SELECT count(*) as count FROM notifications 
    WHERE user_id = ? AND is_read = 0
  `).get(req.user!.id) as { count: number }).count;

  return res.json({ notifications, unreadCount });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare(`
    UPDATE notifications 
    SET is_read = 1 
    WHERE id = ? AND user_id = ?
  `).run(id, req.user!.id);

  return res.json({ message: 'Notification marked as read.' });
});

// POST /api/notifications/mark-all-read
router.post('/mark-all-read', authenticate, (req: Request, res: Response) => {
  db.prepare(`
    UPDATE notifications 
    SET is_read = 1 
    WHERE user_id = ?
  `).run(req.user!.id);

  return res.json({ message: 'All notifications marked as read.' });
});

export default router;
