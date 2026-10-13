import 'dotenv/config';

function csv(value) {
  return (value ?? '').split(',').map((part) => part.trim()).filter(Boolean);
}

function ownerJids(value) {
  return csv(value)
    .map((number) => number.replace(/\D/gu, ''))
    .filter(Boolean)
    .map((number) => `${number}@s.whatsapp.net`);
}

function integerEnv(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

export const config = {
  name: 'TAUROBERO BOT',
  prefix: process.env.BOT_PREFIX || '!',
  authDir: process.env.AUTH_DIR || './data/auth',
  dataFile: process.env.DATA_FILE || './data/state.json',
  logLevel: process.env.LOG_LEVEL || 'info',
  owners: ownerJids(process.env.BOT_OWNERS),
  antiSpam: {
    enabled: process.env.ANTISPAM_ENABLED !== 'false',
    limit: integerEnv(process.env.ANTISPAM_LIMIT, 7, 3, 100),
    windowMs: integerEnv(process.env.ANTISPAM_WINDOW_MS, 10_000, 5_000, 300_000),
  },
  ai: {
    endpoint: process.env.AI_API_URL || '',
    token: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || '',
  },
  downloads: {
    endpoint: process.env.DOWNLOAD_API_URL || '',
    token: process.env.DOWNLOAD_API_KEY || '',
    allowedHosts: csv(process.env.DOWNLOAD_ALLOWED_HOSTS).map((host) => host.toLowerCase()),
  },
};