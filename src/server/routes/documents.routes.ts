import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { authenticate, requireRole } from '../middleware/auth';
import { AuditService } from '../services/audit.service';

const router = Router();

// GET /api/documents
router.get('/', authenticate, (req: Request, res: Response) => {
  let query = `SELECT * FROM society_documents WHERE 1=1`;
  const params: any[] = [];

  if (req.user!.role === 'general_member') {
    query += ` AND access_level IN ('public', 'members_only')`;
  }

  query += ` ORDER BY uploaded_at DESC`;

  const documents = db.prepare(query).all(...params);
  return res.json({ documents });
});

// POST /api/documents
router.post('/', authenticate, requireRole(['super_admin', 'general_secretary', 'admin']), (req: Request, res: Response) => {
  const { title, category = 'general', fileUrl, fileSize, accessLevel = 'members_only' } = req.body;

  if (!title || !fileUrl) {
    return res.status(400).json({ error: 'Title and file URL are required.' });
  }

  const result = db.prepare(`
    INSERT INTO society_documents (title, category, file_url, file_size, access_level, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title, category, fileUrl, fileSize || null, accessLevel, req.user!.memberId);

  AuditService.log({
    userId: req.user!.id,
    userRole: req.user!.role,
    action: 'UPLOAD_DOCUMENT',
    entityType: 'society_documents',
    entityId: result.lastInsertRowid,
    newValues: { title, category, accessLevel },
  });

  return res.status(201).json({ message: 'Document added successfully.' });
});

export default router;
