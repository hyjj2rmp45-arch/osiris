import { createHmac, timingSafeEqual } from 'crypto';

interface InitDataUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface ParsedInitData {
  user?: InitDataUser;
  auth_date: number;
  hash: string;
  query_id?: string;
  receiver?: InitDataUser;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
}

function parseInitData(initData: string): ParsedInitData {
  const params = new URLSearchParams(initData);
  const result: ParsedInitData = {
    auth_date: 0,
    hash: '',
  };

  for (const [key, value] of params.entries()) {
    if (key === 'user') {
      try {
        result.user = JSON.parse(value) as InitDataUser;
      } catch {
        // ignore parse error
      }
    } else if (key === 'auth_date') {
      result.auth_date = parseInt(value, 10);
    } else if (key === 'hash') {
      result.hash = value;
    } else if (key === 'query_id') {
      result.query_id = value;
    } else if (key === 'receiver') {
      try {
        result.receiver = JSON.parse(value) as InitDataUser;
      } catch {
        // ignore
      }
    } else if (key === 'chat_type') {
      result.chat_type = value;
    } else if (key === 'chat_instance') {
      result.chat_instance = value;
    } else if (key === 'start_param') {
      result.start_param = value;
    } else if (key === 'can_send_after') {
      result.can_send_after = parseInt(value, 10);
    }
  }

  return result;
}

function buildDataCheckString(initData: string): string {
  const params = new URLSearchParams(initData);
  const entries: [string, string][] = [];

  for (const [key, value] of params.entries()) {
    if (key !== 'hash') {
      entries.push([key, value]);
    }
  }

  entries.sort((a, b) => a[0].localeCompare(b[0]));

  return entries.map(([k, v]) => `${k}=${v}`).join('\n');
}

export function validateInitData(initData: string, botToken: string): { valid: boolean; user?: InitDataUser | undefined; error?: string | undefined } {
  const parsed = parseInitData(initData);

  if (!parsed.hash) {
    return { valid: false, error: 'Missing hash in initData' };
  }

  // Check auth_date staleness (max 1 hour)
  const now = Math.floor(Date.now() / 1000);
  if (now - parsed.auth_date > 3600) {
    return { valid: false, error: 'initData expired (auth_date too old)' };
  }

  // Derive HMAC key: HMAC_SHA256("WebAppData", bot_token)
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();

  // Build data-check-string
  const dataCheckString = buildDataCheckString(initData);

  // Compute expected hash
  const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  // Constant-time comparison
  const providedHashBuffer = Buffer.from(parsed.hash, 'hex');
  const expectedHashBuffer = Buffer.from(expectedHash, 'hex');

  if (providedHashBuffer.length !== expectedHashBuffer.length || !timingSafeEqual(providedHashBuffer, expectedHashBuffer)) {
    return { valid: false, error: 'Invalid initData hash' };
  }

  return { valid: true, user: parsed.user };
}

export function getDevMockUser(debugUserId?: string): InitDataUser | null {
  if (process.env.NODE_ENV === 'production') return null;
  if (!debugUserId) return null;

  const id = parseInt(debugUserId, 10);
  if (isNaN(id)) return null;

  return {
    id,
    first_name: 'Dev',
    last_name: 'User',
    username: `dev_${id}`,
    language_code: 'en',
    is_premium: false,
  };
}

export function getAllowedTelegramIds(): Set<number> {
  const env = process.env.ALLOWED_TELEGRAM_IDS;
  if (!env) return new Set();

  const ids = new Set<number>();
  for (const part of env.split(',')) {
    const id = parseInt(part.trim(), 10);
    if (!isNaN(id)) ids.add(id);
  }
  return ids;
}

export function isAllowedTelegramId(id: number): boolean {
  const allowed = getAllowedTelegramIds();
  return allowed.size === 0 || allowed.has(id);
}

export function determineUserRole(telegramId: number): 'user' | 'tester' | 'admin' {
  const adminIds = new Set<number>();
  const adminEnv = process.env.ADMIN_TELEGRAM_IDS;
  if (adminEnv) {
    for (const part of adminEnv.split(',')) {
      const id = parseInt(part.trim(), 10);
      if (!isNaN(id)) adminIds.add(id);
    }
  }

  if (adminIds.has(telegramId)) return 'admin';

  const allowed = getAllowedTelegramIds();
  if (allowed.has(telegramId)) return 'tester';

  return 'user';
}