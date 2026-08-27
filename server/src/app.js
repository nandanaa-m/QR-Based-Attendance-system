import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import routes
import sessionRoutes    from './routes/sessionRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import exportRoutes     from './routes/exportRoutes.js';
import authRoutes       from './routes/authRoutes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';

// Import the batch-write queue — start it once the server is up
import queueService from './services/queueService.js';

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  ...(process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map(url => url.trim())
    : []),
  'https://krysten-flukey-uninventively.ngrok-free.dev',
  'http://192.168.29.28:5173',
].filter(Boolean).map(url => url.replace(/\/$/, '')); // strip trailing slashes

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes(origin.replace(/\/$/, ''))
    ) {
      return callback(null, true);
    }

    console.log('Blocked by CORS:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const qStats = queueService.getStats();

  res.json({
    status:    'ok',
    message:   'QR Attendance API is running',
    timestamp: new Date().toISOString(),
    queue: {
      currentLength:   qStats.currentLength,
      totalEnqueued:   qStats.totalEnqueued,
      totalFlushed:    qStats.totalFlushed,
      totalFailed:     qStats.totalFailed,
      flushRatePerMin: qStats.flushRatePerMin,
      lastFlushAt:     qStats.lastFlushAt,
    },
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', sessionRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', exportRoutes);
app.use('/api', authRoutes);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(errorHandler);

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Start server + queue ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);

  // Boot the batch-write queue AFTER the server is listening
  queueService.start();
});

export default app;

