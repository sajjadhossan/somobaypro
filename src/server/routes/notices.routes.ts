import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';
import { RealtimeService } from '../services/realtime.service';

const router = Router();

// GET /api/notices
router.get('/', authenticate, (req: Request, res: Response) => {
  const user = req.user!;

  let query = `
    SELECT n.*,
      CASE WHEN nr.read_at IS NOT NULL THEN 1 ELSE 0 END as is_read
    FROM notices n
    LEFT JOIN notice_reads nr ON n.id = nr.notice_id AND nr.user_id = ?
    WHERE n.is_published = 1
  `;
  const params: any[] = [user.id];

  // If member, only see notices targeted to 'all' or 'general_member'
  if (user.role === 'general_member') {
    query += ` AND (n.target_role = 'all' OR n.target_role = 'general_member')`;
  }

  query += ` ORDER BY n.priority = 'urgent' DESC, n.publish_date DESC, n.id DESC`;

  const notices = db.prepare(query).all(...params);
  return res.json({ notices });
});

// POST /api/notices (Create Notice)
router.post('/', authenticate, requireRole(['super_admin', 'general_secretary', 'admin', 'president']), (req: Request, res: Response) => {
  const { titleBn, titleEn, contentBn, contentEn, priority = 'normal', targetRole = 'all', publishDate, expiryDate, attachmentUrl } = req.body;

  if (!titleBn || !contentBn) {
    return res.status(400).json({ error: 'Bengali Title and Content are required.' });
  }

  const countRow = db.prepare(`SELECT count(*) as count FROM notices`).get() as { count: number };
  const noticeNumber = `NOT-2026-${String(countRow.count + 1).padStart(4, '0')}`;
  const effectivePublishDate = publishDate || new Date().toISOString().split('T')[0];

  const result = db.prepare(`
    INSERT INTO notices (
      notice_number, title_bn, title_en, content_bn, content_en, priority,
      target_role, publish_date, expiry_date, attachment_url, is_published, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    noticeNumber,
    titleBn,
    titleEn || titleBn,
    contentBn,
    contentEn || contentBn,
    priority,
    targetRole,
    effectivePublishDate,
    expiryDate || null,
    attachmentUrl || null,
    req.user!.memberId
  );

  // Broadcast in-app notifications
  NotificationService.broadcast(
    targetRole === 'all' ? 'all' : [targetRole],
    `নতুন বিজ্ঞপ্তি: ${titleBn}`,
    contentBn.slice(0, 100) + '...',
    priority === 'urgent' ? 'urgent' : 'info',
    '/notices'
  );

  // Real-time instant broadcast across all members' connected devices
  RealtimeService.broadcast('NOTICE_PUBLISHED', {
    id: result.lastInsertRowid,
    noticeNumber,
    title: titleBn,
    priority,
    message: `নতুন বিজ্ঞপ্তি প্রকাশিত হয়েছে: ${titleBn}`,
    timestamp: new Date().toISOString(),
  });
  RealtimeService.broadcast('DATA_REFRESH', { entity: 'notices' });

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'CREATE_NOTICE',
    entityType: 'notices',
    entityId: result.lastInsertRowid,
    newValues: { noticeNumber, titleBn, priority },
  });

  return res.status(201).json({ message: 'Notice published successfully.', noticeNumber });
});

// POST /api/notices/:id/read (Mark as read)
router.post('/:id/read', authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare(`
    INSERT OR IGNORE INTO notice_reads (notice_id, user_id)
    VALUES (?, ?)
  `).run(id, req.user!.id);

  return res.json({ message: 'Notice marked as read.' });
});

export default router;
