import { z } from 'zod';

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_ISSUER: z.string().min(1).default('leaveflow-api'),
  JWT_AUDIENCE: z.string().min(1).default('leaveflow-web'),
  JWT_TTL_SECONDS: z.coerce.number().int().positive().default(28_800),
  BUSINESS_TIMEZONE: z
    .string()
    .default('Asia/Jerusalem')
    .refine(isValidTimeZone, 'must be a valid IANA time zone'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  databaseUrl: string;
  jwt: { secret: string; issuer: string; audience: string; ttlSeconds: number };
  businessTimeZone: string;
  logLevel: z.infer<typeof envSchema>['LOG_LEVEL'];
}

export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}

/** Validates the environment once at start-up; the process refuses to run on invalid config. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new ConfigError(`Invalid environment configuration:\n${problems}`);
  }
  const e = result.data;
  return {
    nodeEnv: e.NODE_ENV,
    databaseUrl: e.DATABASE_URL,
    jwt: {
      secret: e.JWT_SECRET,
      issuer: e.JWT_ISSUER,
      audience: e.JWT_AUDIENCE,
      ttlSeconds: e.JWT_TTL_SECONDS,
    },
    businessTimeZone: e.BUSINESS_TIMEZONE,
    logLevel: e.LOG_LEVEL,
  };
}
