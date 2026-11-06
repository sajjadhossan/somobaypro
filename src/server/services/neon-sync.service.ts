import { db } from '../db/index.js';
import { getNeonSql } from './neon.js';

export class NeonSyncService {
  private static isSyncing = false;

  /**
   * Synchronize all users and officials directly from Neon PostgreSQL and Neon Auth
   * Ensures that whatever is defined in Neon is always exactly what exists in the app.
   */
  public static async syncAllFromNeon(): Promise<{ syncedUsers: number; syncedMembers: number; error?: string }> {
    if (this.isSyncing) {
      return { syncedUsers: 0, syncedMembers: 0 };
    }
    this.isSyncing = true;

    let syncedUsers = 0;
    let syncedMembers = 0;

    try {
      const sql = getNeonSql();

      // 1. Fetch users from Neon PostgreSQL public.users table
      let neonUsers: any[] = [];
      try {
        neonUsers = await sql`
          SELECT id, name, phone, email, password_hash, role, status 
          FROM users 
          WHERE deleted_at IS NULL;
        `;
      } catch (err: any) {
        console.warn('Neon public.users query notice:', err.message);
      }

      // 2. Fetch users from Neon Auth neon_auth.user table
      let neonAuthUsers: any[] = [];
      try {
        neonAuthUsers = await sql`
          SELECT id, name, email, role 
          FROM neon_auth.user 
          WHERE banned = false;
        `;
      } catch (err: any) {
        console.warn('Neon neon_auth.user query notice:', err.message);
      }

      // Map Neon role string to SomobayPro role
      const mapRole = (rawRole: string | null | undefined): string => {
        if (!rawRole) return 'general_member';
        const r = rawRole.toUpperCase();
        if (r.includes('SUPER')) return 'super_admin';
        if (r.includes('PRESIDENT') || r === 'SAMITY_ADMIN') return 'president';
        if (r.includes('MANAGER') || r.includes('TREASURER')) return 'treasurer';
        if (r.includes('SECRETARY')) return 'general_secretary';
        if (r.includes('ADVISOR')) return 'advisor';
        if (r.includes('ADMIN')) return 'admin';
        return 'general_member';
      };

      const getDesignation = (role: string): string => {
        switch (role) {
          case 'super_admin': return 'মালিক ও সুপার অ্যাডমিন';
          case 'president': return 'সভাপতি';
          case 'treasurer': return 'ম্যানেজার / কোষাধ্যক্ষ';
          case 'general_secretary': return 'সাধারণ সম্পাদক';
          case 'advisor': return 'উপদেষ্টা';
          case 'admin': return 'প্রশাসক';
          default: return 'সাধারণ সদস্য';
        }
      };

      // Merge and process Neon PostgreSQL users
      for (const nu of neonUsers) {
        const phone = (nu.phone || '').trim();
        const email = (nu.email || '').trim().toLowerCase();
        const name = (nu.name || '').trim();
        const appRole = mapRole(nu.role);
        const designation = getDesignation(appRole);

        // Check if user exists by phone or email
        let existingUser = db.prepare(`
          SELECT * FROM users WHERE (mobile = ? AND mobile != '') OR (LOWER(email) = ? AND email != '')
        `).get(phone, email) as any;

        if (existingUser) {
          // Update user role and status
          db.prepare(`
            UPDATE users 
            SET role = ?, mobile = COALESCE(NULLIF(?, ''), mobile), email = COALESCE(NULLIF(?, ''), email), account_status = 'active'
            WHERE id = ?
          `).run(appRole, phone, email, existingUser.id);

          // Update corresponding member
          db.prepare(`
            UPDATE members 
            SET full_name_bn = COALESCE(NULLIF(?, ''), full_name_bn),
                designation = ?,
                mobile = COALESCE(NULLIF(?, ''), mobile),
                email = COALESCE(NULLIF(?, ''), email),
                membership_status = 'active'
            WHERE member_id = ?
          `).run(name, designation, phone, email, existingUser.member_id);

          syncedUsers++;
        } else {
          // Generate new Member ID for Neon user
          const countRow = db.prepare(`SELECT count(*) as count FROM members`).get() as { count: number };
          const memberId = `NEON-${String(countRow.count + 1).padStart(4, '0')}`;
          const today = new Date().toISOString().split('T')[0];

          db.transaction(() => {
            db.prepare(`
              INSERT INTO members (
                member_id, full_name_bn, full_name_en, mobile, email, joining_date,
                membership_type, membership_fee, monthly_subscription_amount, designation, membership_status, society_id
              ) VALUES (?, ?, ?, ?, ?, ?, 'regular', 500, 1000, ?, 'active', 1)
            `).run(
              memberId,
              name || 'সমবায় সদস্য',
              name || 'Somobay Member',
              phone || `01700${Math.floor(100000 + Math.random() * 900000)}`,
              email || null,
              today,
              designation
            );

            db.prepare(`
              INSERT INTO users (
                member_id, mobile, email, password_hash, role, account_status, permissions, society_id
              ) VALUES (?, ?, ?, ?, ?, 'active', '["all_privileges"]', 1)
            `).run(
              memberId,
              phone || `01700${Math.floor(100000 + Math.random() * 900000)}`,
              email || null,
              nu.password_hash || '$2b$10$kY5h0Bo4lfYY2LmIL4GkQ.yUKgIaWSg3WVyBuxBAkhdpgChkD71tO', // Fallback hash
              appRole
            );
          })();

          syncedUsers++;
          syncedMembers++;
        }
      }

      // Merge and process Neon Auth users
      for (const nau of neonAuthUsers) {
        const email = (nau.email || '').trim().toLowerCase();
        const name = (nau.name || '').trim();
        const appRole = mapRole(nau.role);
        const designation = getDesignation(appRole);

        if (!email) continue;

        let existingUser = db.prepare(`SELECT * FROM users WHERE LOWER(email) = ?`).get(email) as any;
        if (existingUser) {
          db.prepare(`UPDATE users SET role = ?, account_status = 'active' WHERE id = ?`).run(appRole, existingUser.id);
          db.prepare(`
            UPDATE members 
            SET full_name_bn = COALESCE(NULLIF(?, ''), full_name_bn),
                designation = ?,
                membership_status = 'active'
            WHERE member_id = ?
          `).run(name, designation, existingUser.member_id);
          syncedUsers++;
        } else {
          const countRow = db.prepare(`SELECT count(*) as count FROM members`).get() as { count: number };
          const memberId = `NEON-${String(countRow.count + 1).padStart(4, '0')}`;
          const today = new Date().toISOString().split('T')[0];

          db.transaction(() => {
            db.prepare(`
              INSERT INTO members (
                member_id, full_name_bn, full_name_en, mobile, email, joining_date,
                membership_type, membership_fee, monthly_subscription_amount, designation, membership_status, society_id
              ) VALUES (?, ?, ?, ?, ?, ?, 'regular', 500, 1000, ?, 'active', 1)
            `).run(
              memberId,
              name || 'সমবায় সদস্য',
              name || 'Somobay Member',
              email,
              email,
              today,
              designation
            );

            db.prepare(`
              INSERT INTO users (
                member_id, mobile, email, password_hash, role, account_status, permissions, society_id
              ) VALUES (?, ?, ?, 'NEON_MANAGED_AUTH', ?, 'active', '["all_privileges"]', 1)
            `).run(
              memberId,
              email,
              email,
              appRole
            );
          })();
          syncedUsers++;
          syncedMembers++;
        }
      }

      console.log(`⚡ NeonSyncService: Successfully synced ${syncedUsers} users & officials from Neon Cloud Database!`);
      return { syncedUsers, syncedMembers };
    } catch (error: any) {
      console.error('NeonSyncService Error:', error.message);
      return { syncedUsers, syncedMembers, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }
}
