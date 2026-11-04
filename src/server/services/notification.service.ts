import { db } from '../db/index';

export class NotificationService {
  /**
   * Send notification to a specific user
   */
  static notifyUser(params: {
    userId: number;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'urgent';
    link?: string;
  }) {
    try {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        params.userId,
        params.title,
        params.message,
        params.type || 'info',
        params.link || null
      );
      // In production, integrate SMS/Email webhook here (e.g. Banglalink/Grameenphone SMS gateway)
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }

  /**
   * Send notification to a member by their member_id
   */
  static notifyMember(memberId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'urgent' = 'info', link?: string) {
    const user = db.prepare(`SELECT id FROM users WHERE member_id = ?`).get(memberId) as { id: number } | undefined;
    if (user) {
      this.notifyUser({ userId: user.id, title, message, type, link });
    }
  }

  /**
   * Broadcast notification to all users of specific roles or all users
   */
  static broadcast(roles: string[] | 'all', title: string, message: string, type: 'info' | 'success' | 'warning' | 'urgent' = 'info', link?: string) {
    let users: { id: number }[] = [];
    if (roles === 'all') {
      users = db.prepare(`SELECT id FROM users WHERE account_status = 'active'`).all() as { id: number }[];
    } else {
      const placeholders = roles.map(() => '?').join(',');
      users = db.prepare(`SELECT id FROM users WHERE account_status = 'active' AND role IN (${placeholders})`).all(...roles) as { id: number }[];
    }

    const insert = db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction(() => {
      for (const u of users) {
        insert.run(u.id, title, message, type, link || null);
      }
    });

    insertMany();
  }
}
