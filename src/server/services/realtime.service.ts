import { Response } from 'express';

export interface RealtimeClient {
  id: string;
  userId: number;
  memberId: string;
  role: string;
  res: Response;
}

export class RealtimeService {
  private static clients: Map<string, RealtimeClient> = new Map();
  private static heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initializes the 25-second keepalive heartbeat to prevent timeouts
   */
  static init() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(() => {
      for (const client of this.clients.values()) {
        try {
          client.res.write(': keepalive\n\n');
        } catch {
          this.removeClient(client.id);
        }
      }
    }, 25000);
  }

  /**
   * Register a new client SSE connection
   */
  static addClient(client: RealtimeClient) {
    this.clients.set(client.id, client);
    this.init();

    // Send initial welcome & sync handshake
    try {
      client.res.write(
        `event: CONNECTED\ndata: ${JSON.stringify({
          message: 'রিয়েলটাইম ক্লাউড সিঙ্ক সফলভাবে সংযুক্ত হয়েছে।',
          onlineDevices: this.clients.size,
          timestamp: new Date().toISOString(),
        })}\n\n`
      );

      // Notify others of updated device count
      this.broadcastDeviceCount();
    } catch {
      this.removeClient(client.id);
    }
  }

  /**
   * Remove disconnected client
   */
  static removeClient(clientId: string) {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      this.broadcastDeviceCount();
    }
  }

  /**
   * Broadcast an event to ALL connected devices (e.g. notices, new transactions)
   */
  static broadcast(event: string, payload: any) {
    const data = `event: ${event}\ndata: ${JSON.stringify({ ...payload, _broadcastAt: new Date().toISOString() })}\n\n`;
    for (const client of this.clients.values()) {
      try {
        client.res.write(data);
      } catch {
        this.removeClient(client.id);
      }
    }
  }

  /**
   * Send event to a specific member or user ID
   */
  static sendToUser(identifier: string | number, event: string, payload: any) {
    const data = `event: ${event}\ndata: ${JSON.stringify({ ...payload, _sentAt: new Date().toISOString() })}\n\n`;
    const target = String(identifier);

    for (const client of this.clients.values()) {
      if (String(client.userId) === target || client.memberId === target) {
        try {
          client.res.write(data);
        } catch {
          this.removeClient(client.id);
        }
      }
    }
  }

  /**
   * Send event to users with specific roles (e.g. treasurer, president, admin)
   */
  static sendToRole(roles: string[], event: string, payload: any) {
    const data = `event: ${event}\ndata: ${JSON.stringify({ ...payload, _sentAt: new Date().toISOString() })}\n\n`;

    for (const client of this.clients.values()) {
      if (roles.includes(client.role)) {
        try {
          client.res.write(data);
        } catch {
          this.removeClient(client.id);
        }
      }
    }
  }

  /**
   * Broadcast current online device count
   */
  private static broadcastDeviceCount() {
    const data = `event: DEVICE_STATS\ndata: ${JSON.stringify({
      onlineDevices: this.clients.size,
    })}\n\n`;

    for (const client of this.clients.values()) {
      try {
        client.res.write(data);
      } catch {
        this.removeClient(client.id);
      }
    }
  }

  /**
   * Get stats for admin inspection
   */
  static getStats() {
    const roles: Record<string, number> = {};
    for (const c of this.clients.values()) {
      roles[c.role] = (roles[c.role] || 0) + 1;
    }

    return {
      totalOnline: this.clients.size,
      rolesBreakdown: roles,
    };
  }
}
