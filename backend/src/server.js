import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import uploadRoutes from './routes/upload.js';
import jobsRoutes from './routes/jobs.js';
import statsRoutes from './routes/stats.js';
import historyRoutes from './routes/history.js';
import rcbMonthlyRoutes from './routes/rcbMonthly.js';
import resolucion202Routes from './routes/resolucion202.js';
import { initializeSocketService, getIoInstance } from './services/socketService.js';
import { initializeEventBus, subscribeToEvents } from './services/eventBus.js';

const app = express();
const httpServer = createServer(app);

const corsOrigin = config.env === 'development' 
  ? (origin, callback) => {
      if (!origin || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  : config.frontendUrl;

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(helmet());
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

initializeSocketService(io);

initializeEventBus();
subscribeToEvents((event, data) => {
  const socketIo = getIoInstance();
  if (socketIo) {
    logger.debug(`Relaying event from worker to clients: ${event}`);
    socketIo.emit(event, data);
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/upload', uploadRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/rcb-monthly', rcbMonthlyRoutes);
app.use('/api/resolucion-202', resolucion202Routes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

app.use(errorHandler);

io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });

  socket.on('error', (error) => {
    logger.error('Socket error', { error: error.message });
  });
});

httpServer.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`, {
    env: config.env,
    frontendUrl: config.frontendUrl
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

export { app, io };

