import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { RealtimeService } from '../services/realtime.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pkss_society_secure_jwt_secret_key_2026';

// GET /api/realtime/events - SSE Stream for real-time live sync
router.get('/events', (req: Request, res: Response) => {
  // Extract token from query or Authorization header
  const token = (req.query.token as string) || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required for real-time sync.' });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  // Set HTTP headers for Server-Sent Events (SSE)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(': stream-start\n\n');

  const userId = decoded.id || decoded.userId;
  const clientId = `conn-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const client = {
    id: clientId,
    userId: userId,
    memberId: decoded.memberId,
    role: decoded.role,
    res,
  };

  RealtimeService.addClient(client);

  // Clean up on disconnect
  req.on('close', () => {
    RealtimeService.removeClient(clientId);
  });
});

// GET /api/realtime/stats - Active devices count
router.get('/stats', (req: Request, res: Response) => {
  res.json({ success: true, stats: RealtimeService.getStats() });
});

// POST /api/realtime/test-alert - Send test broadcast
router.post('/test-alert', (req: Request, res: Response) => {
  const { title, message } = req.body;
  RealtimeService.broadcast('NOTIFICATION', {
    title: title || 'লাইভ সিঙ্ক টেস্ট',
    message: message || 'সার্ভার থেকে সফলভাবে রিয়েলটাইম মেসেজ পাঠানো হয়েছে!',
    type: 'info',
  });

  res.json({ success: true, message: 'টেস্ট ব্রডকাস্ট পাঠানো হয়েছে।' });
});

export default router;
