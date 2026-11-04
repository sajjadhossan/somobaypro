import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db/index';

export class BackupService {
  private static timer: NodeJS.Timeout | null = null;
  private static isBackingUp = false;
  private static lastBackupTime: Date | null = null;
  private static pendingOfflineQueue: string[] = [];

  /**
   * Initializes backup directory and starts the 1-minute backup scheduler
   */
  static initScheduler() {
    const backupDir = path.resolve(process.cwd(), 'data', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    if (this.timer) {
      clearInterval(this.timer);
    }

    // Run every 60 seconds (1 minute)
    console.log('⏰ Initializing 1-minute Telegram Auto-Backup Scheduler...');
    this.timer = setInterval(() => {
      this.triggerBackup('নিয়মিত ১-মিনিট অটো ব্যাকআপ (Scheduled 60s)').catch((err) => {
        console.error('Error in scheduled 1-minute backup:', err.message);
      });
    }, 60000);

    // Initial backup on startup (delayed 5s to allow server initialization)
    setTimeout(() => {
      this.triggerBackup('সার্ভার রিস্টার্ট প্রাথমিক ব্যাকআপ (Startup Snapshot)').catch(() => {});
    }, 5000);
  }

  /**
   * Triggers a full database backup both locally and to Telegram
   */
  static async triggerBackup(reason: string = 'ম্যানুয়াল ব্যাকআপ'): Promise<{
    success: boolean;
    localBackupPath: string;
    telegramSent: boolean;
    message: string;
  }> {
    if (this.isBackingUp) {
      return {
        success: false,
        localBackupPath: '',
        telegramSent: false,
        message: 'আগের ব্যাকআপ প্রক্রিয়াধীন রয়েছে।',
      };
    }

    this.isBackingUp = true;
    try {
      const dbPath = path.resolve(process.cwd(), 'data', 'society.db');
      if (!fs.existsSync(dbPath)) {
        throw new Error('মূল ডাটাবেস ফাইল পাওয়া যায়নি: ' + dbPath);
      }

      const backupDir = path.resolve(process.cwd(), 'data', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Generate timestamped filename
      const now = new Date();
      const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const backupFileName = `society_backup_${timestamp}.db`;
      const localBackupPath = path.join(backupDir, backupFileName);

      // Perform atomic copy using fs.copyFileSync
      fs.copyFileSync(dbPath, localBackupPath);

      // Clean old backups keeping last 30
      this.cleanOldBackups(backupDir, 30);

      // Get society settings & Telegram config
      const settings = db.prepare(`
        SELECT name_bn, short_name, telegram_bot_token, telegram_chat_id, telegram_backup_enabled
        FROM society_settings WHERE id = 1
      `).get() as any;

      let telegramSent = false;
      let telegramMessage = 'টেলিগ্রাম কনফিগার করা হয়নি বা নিষ্ক্রিয় আছে। লোকাল ব্যাকআপ সফল।';

      if (settings?.telegram_backup_enabled && settings?.telegram_bot_token && settings?.telegram_chat_id) {
        try {
          const stats = this.getQuickSocietyStats();
          const caption = 
`🛡️ *${settings.name_bn || 'প্রগতি কল্যাণ সমবায় সমিতি লিমিটেড'}*
━━━━━━━━━━━━━━━━━━━━━━
📦 *ডাটাবেস ক্লাউড ব্যাকআপ (Auto Backup)*
⏰ সময়: ${now.toLocaleDateString('bn-BD')} ${now.toLocaleTimeString('bn-BD')}
⚡ ইভেন্ট: ${reason}
📊 মোট সদস্য: ${stats.totalMembers} জন
💰 মোট আদায়কৃত চাঁদা: ৳${stats.totalCollection.toLocaleString('bn-BD')}
💾 ফাইল: \`${backupFileName}\`
━━━━━━━━━━━━━━━━━━━━━━
✅ ডাটাবেসটি নিরাপদ ক্লাউডে সংরক্ষিত হলো।`;

          await this.sendToTelegram(settings.telegram_bot_token, settings.telegram_chat_id, localBackupPath, backupFileName, caption);
          telegramSent = true;
          telegramMessage = 'টেলিগ্রামে ব্যাকআপ সফলভাবে পাঠানো হয়েছে!';

          // Update last backup timestamp in settings
          db.prepare(`UPDATE society_settings SET last_telegram_backup_at = datetime('now') WHERE id = 1`).run();
          this.lastBackupTime = now;
        } catch (tgError: any) {
          console.warn('Telegram upload failed (offline or network issue):', tgError.message);
          this.pendingOfflineQueue.push(localBackupPath);
          telegramMessage = `টেলিগ্রাম আপলোড ব্যর্থ (অফলাইন মোড): ${tgError.message}। ফাইলটি লোকাল ব্যাকআপে সংরক্ষিত আছে।`;
        }
      }

      return {
        success: true,
        localBackupPath,
        telegramSent,
        message: telegramMessage,
      };
    } finally {
      this.isBackingUp = false;
    }
  }

  /**
   * Helper to send document to Telegram Bot API
   */
  private static async sendToTelegram(
    botToken: string,
    chatId: string,
    filePath: string,
    fileName: string,
    caption: string
  ) {
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', blob, fileName);
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Telegram API responded with ${res.status}: ${errText}`);
    }
  }

  /**
   * Test Telegram Bot connection
   */
  static async testConnection(botToken: string, chatId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🔔 *SomobayPro - প্রগতি কল্যাণ সমবায় সমিতি*\n\n✅ টেলিগ্রাম ব্যাকআপ কানেকশন টেস্ট সফল হয়েছে!\nসময়: ${new Date().toLocaleString('bn-BD')}\nপ্রতি ১ মিনিট পর পর এবং প্রতি ট্রানজেকশনে স্বয়ংক্রিয় ব্যাকআপ সচল থাকবে।`,
          parse_mode: 'Markdown',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, message: `টেলিগ্রাম বট এরর (${res.status}): ${text}` };
      }

      return { success: true, message: 'টেলিগ্রামে টেস্ট মেসেজ সফলভাবে পৌঁছেছে!' };
    } catch (err: any) {
      return { success: false, message: `সার্ভার সংযোগ ত্রুটি: ${err.message}` };
    }
  }

  /**
   * Quick society stats for backup caption
   */
  private static getQuickSocietyStats(): { totalMembers: number; totalCollection: number } {
    try {
      const mRow = db.prepare(`SELECT count(*) as count FROM members`).get() as { count: number };
      const cRow = db.prepare(`SELECT coalesce(sum(amount), 0) as total FROM receipts WHERE status = 'active'`).get() as { total: number };
      return {
        totalMembers: mRow?.count || 0,
        totalCollection: cRow?.total || 0,
      };
    } catch {
      return { totalMembers: 0, totalCollection: 0 };
    }
  }

  /**
   * Keep only recent N backups locally
   */
  private static cleanOldBackups(backupDir: string, keepCount: number) {
    try {
      const files = fs.readdirSync(backupDir)
        .filter((f) => f.startsWith('society_backup_') && f.endsWith('.db'))
        .map((f) => ({
          name: f,
          path: path.join(backupDir, f),
          time: fs.statSync(path.join(backupDir, f)).mtimeMs,
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > keepCount) {
        for (let i = keepCount; i < files.length; i++) {
          try {
            fs.unlinkSync(files[i].path);
          } catch {}
        }
      }
    } catch {}
  }

  /**
   * Returns backup status for UI
   */
  static getStatus() {
    const settings = db.prepare(`
      SELECT telegram_backup_enabled, last_telegram_backup_at, telegram_chat_id,
             CASE WHEN telegram_bot_token IS NOT NULL AND length(telegram_bot_token) > 5 THEN 1 ELSE 0 END as has_token
      FROM society_settings WHERE id = 1
    `).get() as any;

    const backupDir = path.resolve(process.cwd(), 'data', 'backups');
    let localBackupCount = 0;
    let latestBackupFile = null;

    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.db'));
      localBackupCount = files.length;
      if (files.length > 0) {
        latestBackupFile = files.sort().reverse()[0];
      }
    }

    return {
      enabled: Boolean(settings?.telegram_backup_enabled),
      hasToken: Boolean(settings?.has_token),
      chatId: settings?.telegram_chat_id || '',
      lastBackupAt: settings?.last_telegram_backup_at || this.lastBackupTime || null,
      localBackupCount,
      latestBackupFile,
      intervalSeconds: 60,
    };
  }
}
