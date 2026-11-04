import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { seedDatabase } from './db/seed';

// Import Route Handlers
import authRouter from './routes/auth.routes';
import membersRouter from './routes/members.routes';
import subscriptionsRouter from './routes/subscriptions.routes';
import paymentsRouter from './routes/payments.routes';
import receiptsRouter from './routes/receipts.routes';
import accountingRouter from './routes/accounting.routes';
import meetingsRouter from './routes/meetings.routes';
import noticesRouter from './routes/notices.routes';
import notificationsRouter from './routes/notifications.routes';
import documentsRouter from './routes/documents.routes';
import supportRouter from './routes/support.routes';
import auditRouter from './routes/audit.routes';
import settingsRouter from './routes/settings.routes';
import backupRouter from './routes/backup.routes';
import aiRouter from './routes/ai.routes';
import { BackupService } from './services/backup.service';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads folder exists and serve statically
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/members', membersRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/accounting', accountingRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/notices', noticesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/support', supportRouter);
app.use('/api/audit', auditRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/backup', backupRouter);
app.use('/api/ai', aiRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    system: 'Digital Society Management System',
    version: '1.0.0',
    noLoansRule: 'STRICTLY_ENFORCED',
  });
});

// Serve frontend in production build if dist exists
const distDir = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(distDir, 'index.html'));
    }
    next();
  });
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Initialize database and start server
async function startServer() {
  try {
    await seedDatabase();
    // Start automated 1-minute and real-time database backup service
    BackupService.initScheduler();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`DIGITAL SOCIETY MANAGEMENT SYSTEM - BACKEND SERVER`);
      console.log(`Server running at http://0.0.0.0:${PORT}`);
      console.log(`API Health Check: http://localhost:${PORT}/api/health`);
      console.log(`No-Loan Policy: Strictly Enforced`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
