import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  scraping: {
    coosaludUrl: process.env.COOSALUD_URL || 'https://coosalud.com/estado-de-afiliacion/',
    headlessMode: process.env.HEADLESS_MODE === 'true',
    timeoutMs: parseInt(process.env.TIMEOUT_MS || '30000', 10),
    minDelayMs: parseInt(process.env.MIN_DELAY_MS || '3000', 10),
    maxDelayMs: parseInt(process.env.MAX_DELAY_MS || '5000', 10)
  },
  
  processing: {
    maxWorkers: parseInt(process.env.MAX_WORKERS || '2', 10),
    batchSize: parseInt(process.env.BATCH_SIZE || '10', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10)
  },
  
  uploads: {
    maxFileSize: 10 * 1024 * 1024,
    allowedMimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
  }
};

export const isDevelopment = config.env === 'development';
export const isProduction = config.env === 'production';

