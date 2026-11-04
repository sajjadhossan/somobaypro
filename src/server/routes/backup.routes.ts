import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { authenticate, requireRole } from '../middleware/auth';
import { BackupService } from '../services/backup.service';
import fs from 'node:fs';
import path from 'node:path';

const router = Router();

// GET /api/backup/status - Get current backup settings and status
router.get('/status', authenticate, (req: Request, res: Response) => {
  try {
    const status = BackupService.getStatus();
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backup/trigger - Trigger immediate backup
router.post('/trigger', authenticate, requireRole(['super_admin', 'admin']), async (req: Request, res: Response) => {
  try {
    const reason = req.body.reason || `ম্যানুয়াল ব্যাকআপ অনুরোধকারী: ${req.user?.fullNameBn || 'এডমিন'}`;
    const result = await BackupService.triggerBackup(reason);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backup/test-telegram - Test Telegram Bot connection
router.post('/test-telegram', authenticate, requireRole(['super_admin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { botToken, chatId } = req.body;
    if (!botToken || !chatId) {
      return res.status(400).json({ error: 'বট টোকেন এবং চ্যাট আইডি উভয়ই আবশ্যক।' });
    }
    const result = await BackupService.testConnection(botToken, chatId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/backup/config - Update Telegram backup configuration
router.post('/config', authenticate, requireRole(['super_admin', 'admin']), (req: Request, res: Response) => {
  try {
    const { botToken, chatId, enabled } = req.body;
    db.prepare(`
      UPDATE society_settings
      SET telegram_bot_token = coalesce(?, telegram_bot_token),
          telegram_chat_id = coalesce(?, telegram_chat_id),
          telegram_backup_enabled = ?,
          updated_at = datetime('now')
      WHERE id = 1
    `).run(
      botToken !== undefined ? botToken : null,
      chatId !== undefined ? chatId : null,
      enabled ? 1 : 0
    );

    res.json({ success: true, message: 'টেলিগ্রাম ব্যাকআপ কনফিগারেশন সংরক্ষিত হয়েছে।' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/backup/download-latest - Direct download of latest SQLite database
router.get('/download-latest', authenticate, requireRole(['super_admin', 'admin']), (req: Request, res: Response) => {
  try {
    const dbPath = path.resolve(process.cwd(), 'data', 'society.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'ডাটাবেস ফাইল পাওয়া যায়নি।' });
    }
    res.download(dbPath, `society_backup_${new Date().toISOString().slice(0, 10)}.db`);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
