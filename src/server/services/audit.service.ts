import { db } from '../db/index';

export class AuditService {
  static log(params: {
    userId?: number;
    userRole?: string;
    userName?: string;
    ipAddress?: string;
    action: string;
    entityType: string;
    entityId?: string | number;
    oldValues?: any;
    newValues?: any;
  }) {
    try {
      db.prepare(`
        INSERT INTO audit_logs (
          user_id, user_role, user_name, ip_address, action, entity_type, entity_id, old_values, new_values
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        params.userId || null,
        params.userRole || null,
        params.userName || null,
        params.ipAddress || null,
        params.action,
        params.entityType,
        params.entityId ? String(params.entityId) : null,
        params.oldValues ? JSON.stringify(params.oldValues) : null,
        params.newValues ? JSON.stringify(params.newValues) : null
      );
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }

  static logLogin(params: {
    userId?: number;
    identifierUsed: string;
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failed' | 'locked';
    failureReason?: string;
  }) {
    try {
      db.prepare(`
        INSERT INTO login_history (
          user_id, identifier_used, ip_address, user_agent, status, failure_reason
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        params.userId || null,
        params.identifierUsed,
        params.ipAddress || null,
        params.userAgent || null,
        params.status,
        params.failureReason || null
      );
    } catch (err) {
      console.error('Failed to log login history:', err);
    }
  }
}
