import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditService } from '../services/audit.service';
import { NotificationService } from '../services/notification.service';

const router = Router();

// GET /api/support
router.get('/', authenticate, (req: Request, res: Response) => {
  let query = `
    SELECT st.*, m.full_name_bn, m.full_name_en, m.mobile
    FROM support_tickets st
    JOIN members m ON st.member_id = m.member_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user!.role === 'general_member') {
    query += ` AND st.member_id = ?`;
    params.push(req.user!.memberId);
  }

  query += ` ORDER BY st.created_at DESC`;

  const tickets = db.prepare(query).all(...params);
  return res.json({ tickets });
});

// POST /api/support (Member opens ticket)
router.post('/', authenticate, (req: Request, res: Response) => {
  const { subject, category = 'general', message, priority = 'normal' } = req.body;
  const memberId = req.user!.memberId;

  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required.' });
  }

  const countRow = db.prepare(`SELECT count(*) as count FROM support_tickets`).get() as { count: number };
  const ticketNumber = `TKT-2026-${String(countRow.count + 1).padStart(4, '0')}`;

  const result = db.prepare(`
    INSERT INTO support_tickets (
      ticket_number, member_id, subject, category, message, status, priority
    ) VALUES (?, ?, ?, ?, ?, 'open', ?)
  `).run(
    ticketNumber,
    memberId,
    subject,
    category,
    message,
    priority
  );

  // Notify Admins
  NotificationService.broadcast(
    ['super_admin', 'admin', 'general_secretary'],
    'নতুন সহায়তা / অভিযোগ টিকিট',
    `সদস্য ${req.user!.fullNameBn || memberId} একটি নতুন টিকিট তৈরি করেছেন: ${subject}`,
    'info',
    '/admin/support'
  );

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'CREATE_SUPPORT_TICKET',
    entityType: 'support_tickets',
    entityId: result.lastInsertRowid,
    newValues: { ticketNumber, subject, category },
  });

  return res.status(201).json({ message: 'Support ticket submitted.', ticketNumber });
});

// PATCH /api/support/:id/respond (Admin replies or updates ticket)
router.patch('/:id/respond', authenticate, requireRole(['super_admin', 'admin', 'general_secretary', 'president']), (req: Request, res: Response) => {
  const { id } = req.params;
  const { adminResponse, status = 'resolved' } = req.body;

  if (!adminResponse) {
    return res.status(400).json({ error: 'Admin response message is required.' });
  }

  const ticket = db.prepare(`SELECT * FROM support_tickets WHERE id = ?`).get(id) as any;
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  db.prepare(`
    UPDATE support_tickets 
    SET admin_response = ?, status = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(adminResponse, status, req.user!.memberId, id);

  // Notify the member
  NotificationService.notifyMember(
    ticket.member_id,
    'আপনার টিকিটের উত্তর দেওয়া হয়েছে',
    `টিকিট নং ${ticket.ticket_number}-এর উত্তর দেওয়া হয়েছে: ${adminResponse.slice(0, 80)}...`,
    'info',
    '/member/support'
  );

  return res.json({ message: 'Ticket updated and response sent.' });
});

export default router;
