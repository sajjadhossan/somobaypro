import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';

const router = Router();

// GET /api/meetings
router.get('/', authenticate, (req: Request, res: Response) => {
  let query = `
    SELECT m.*, 
      (SELECT count(*) FROM meeting_attendance WHERE meeting_id = m.id AND status = 'present') as present_count
    FROM meetings m
    WHERE 1=1
  `;
  // Members only see published meetings
  if (req.user!.role === 'general_member') {
    query += ` AND m.is_published = 1`;
  }
  query += ` ORDER BY m.date_time DESC`;

  const meetings = db.prepare(query).all();
  return res.json({ meetings });
});

// GET /api/meetings/:id
router.get('/:id', authenticate, (req: Request, res: Response) => {
  const { id } = req.params;
  const meeting = db.prepare(`SELECT * FROM meetings WHERE id = ?`).get(id) as any;
  if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });

  const attendance = db.prepare(`
    SELECT ma.*, m.full_name_bn, m.full_name_en, m.designation, m.mobile
    FROM meeting_attendance ma
    JOIN members m ON ma.member_id = m.member_id
    WHERE ma.meeting_id = ?
    ORDER BY m.member_id ASC
  `).all(id);

  return res.json({ meeting, attendance });
});

// POST /api/meetings (Schedule meeting)
router.post('/', authenticate, requireRole(['super_admin', 'general_secretary', 'president', 'admin']), (req: Request, res: Response) => {
  const { title, meetingType = 'general', dateTime, location, meetingLink, agenda } = req.body;

  if (!title || !dateTime || !location || !agenda) {
    return res.status(400).json({ error: 'Title, date & time, location, and agenda are required.' });
  }

  const result = db.prepare(`
    INSERT INTO meetings (title, meeting_type, date_time, location, meeting_link, agenda, is_published, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run(title, meetingType, dateTime, location, meetingLink || null, agenda, req.user!.memberId);

  // Broadcast notification to all members
  NotificationService.broadcast(
    'all',
    'নতুন সভা / মিটিং নোটিশ',
    `বিষয়: ${title}। তারিখ ও সময়: ${new Date(dateTime).toLocaleString()}। স্থান: ${location}`,
    'info',
    '/meetings'
  );

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'SCHEDULE_MEETING',
    entityType: 'meetings',
    entityId: result.lastInsertRowid,
    newValues: { title, dateTime, location },
  });

  return res.status(201).json({ message: 'Meeting scheduled successfully.', meetingId: result.lastInsertRowid });
});

// POST /api/meetings/:id/attendance (Record attendance)
router.post('/:id/attendance', authenticate, requireRole(['super_admin', 'general_secretary', 'admin']), (req: Request, res: Response) => {
  const { id } = req.params;
  const { attendanceList } = req.body; // array of { memberId, status: 'present'|'absent'|'excused', remarks }

  if (!Array.isArray(attendanceList)) {
    return res.status(400).json({ error: 'Attendance list must be an array.' });
  }

  const upsert = db.prepare(`
    INSERT INTO meeting_attendance (meeting_id, member_id, status, remarks)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(meeting_id, member_id) DO UPDATE SET
      status = excluded.status,
      remarks = excluded.remarks
  `);

  const transaction = db.transaction(() => {
    for (const a of attendanceList) {
      upsert.run(id, a.memberId, a.status, a.remarks || null);
    }
  });

  transaction();

  return res.json({ message: 'Attendance recorded successfully.' });
});

// PATCH /api/meetings/:id/minutes (Record meeting minutes and resolutions)
router.patch('/:id/minutes', authenticate, requireRole(['super_admin', 'general_secretary', 'president']), (req: Request, res: Response) => {
  const { id } = req.params;
  const { minutes, resolutions } = req.body;

  db.prepare(`
    UPDATE meetings 
    SET minutes = ?, resolutions = ? 
    WHERE id = ?
  `).run(minutes, resolutions, id);

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'RECORD_MEETING_MINUTES',
    entityType: 'meetings',
    entityId: id,
  });

  return res.json({ message: 'Meeting minutes and resolutions saved.' });
});

export default router;
