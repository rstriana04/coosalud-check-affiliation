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
    url: process.env.REDIS_URL || 'redis://localhost:6380',
    jobProgressTTL: parseInt(process.env.JOB_PROGRESS_TTL || '3600', 10),
    jobHistoryTTL: parseInt(process.env.JOB_HISTORY_TTL || '604800', 10)
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
  },

  rcbMonthly: {
    username: process.env.RCB_USERNAME || 'kcastro',
    password: process.env.RCB_PASSWORD || 'tusalud2025',
    captchaApiKey: process.env.CAPTCHA_API_KEY || '94033347d8267a35ca8f593b84a61e3e'
  },

  llm: {
    useLLM: process.env.USE_LLM_EXTRACTION === 'true',
    provider: process.env.LLM_PROVIDER || 'ollama',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    customLlmUrl: process.env.CUSTOM_LLM_URL || '',
    customLlmApiKey: process.env.CUSTOM_LLM_API_KEY || '',
    customLlmModel: process.env.CUSTOM_LLM_MODEL || ''
  },

  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  email: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || 'ADRES Automation <noreply@resend.dev>'
  }
};

export const isDevelopment = config.env === 'development';
export const isProduction = config.env === 'production';

