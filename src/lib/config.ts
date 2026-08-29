import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional().default('redis://127.0.0.1:6379'),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_SECRET_KEY: z.string().optional(),

  SOLANA_RPC_URL: z.string().url().optional(),
  HELIUS_API_KEY: z.string().optional(),
  JUPITER_API_URL: z.string().url().default('https://quote-api.jup.ag/v6'),
  JUPITER_API_KEY: z.string().optional(),
  JITO_URL: z.string().url().optional(),
  JITO_AUTH_TOKEN: z.string().optional(),
  PUMP_PORTAL_API_URL: z.string().url().default('https://pumpportal.fun/api'),

  PHANTOM_SOL_ADDRESS: z.string().min(32).optional(),
  PHANTOM_USDC_ADDRESS: z.string().min(32).optional(),
  USDC_MINT: z.string().min(32).optional(),
  PHANTOM_NETWORK: z.enum(['mainnet', 'devnet']).default('mainnet'),

  NTFY_TOPIC: z.string().optional().default('OSIRIS'),
  NTFY_SERVER: z.string().url().optional().default('https://ntfy.sh'),

  ADMIN_TELEGRAM_IDS: z.string().optional(), // comma-separated ids
  ALLOWED_TELEGRAM_IDS: z.string().optional(), // comma-separated ids
  WEBAPP_URL: z.string().url().optional(),
  TUNNEL_URL: z.string().url().optional(),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;
let validationError: Error | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  if (validationError) throw validationError;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n');
    validationError = new Error(`Invalid environment configuration:\n${missing}`);
    throw validationError;
  }

  cached = parsed.data;
  return cached;
}

export function getEnv(): Env {
  if (!cached) {
    return loadEnv();
  }
  return cached;
}

export function assertEnv(keys: Array<keyof Env>): void {
  const env = getEnv();
  const missing = keys.filter((key) => !env[key] || String(env[key]).trim() === '');
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
