export interface AppConfig {
  port: number;
  globalPrefix: string;
  nodeEnv: 'development' | 'test' | 'production';
  webOrigin: string;
  session: {
    cookieName: string;
    secure: boolean;
    domain: string;
    maxAgeMs: number;
  };
  csrf: {
    cookieName: string;
  };
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    synchronize: boolean;
    logging: boolean;
  };
  redis: {
    host: string;
    port: number;
  };
  firebase: {
    projectId: string;
    webApiKey: string;
    serviceAccountPath?: string;
    serviceAccountJson?: string;
  };
  throttle: {
    ttlMs: number;
    limit: number;
  };
  notifications: {
    sendgridApiKey?: string;
    emailFrom: string;
    smtpHost?: string;
    smtpPort?: number;
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioSmsFrom?: string;
    twilioWhatsappFrom?: string;
  };
  verification: {
    jwtSecret: string;
    otpTtlMinutes: number;
    tokenTtlMinutes: number;
    maxAttempts: number;
  };
}

export const loadConfig = (): AppConfig => ({
  port: Number(process.env['API_PORT'] ?? 3000),
  globalPrefix: process.env['API_GLOBAL_PREFIX'] ?? 'api',
  nodeEnv: (process.env['NODE_ENV'] as AppConfig['nodeEnv']) ?? 'development',
  webOrigin: process.env['WEB_ORIGIN'] ?? 'http://localhost:4200',
  session: {
    cookieName: process.env['SESSION_COOKIE_NAME'] ?? '__session',
    secure: process.env['SESSION_COOKIE_SECURE'] === 'true',
    domain: process.env['SESSION_COOKIE_DOMAIN'] ?? 'localhost',
    maxAgeMs: Number(process.env['SESSION_COOKIE_MAX_AGE_DAYS'] ?? 5) * 24 * 60 * 60 * 1000,
  },
  csrf: {
    cookieName: process.env['CSRF_COOKIE_NAME'] ?? 'XSRF-TOKEN',
  },
  db: {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: Number(process.env['DB_PORT'] ?? 3306),
    user: process.env['DB_USER'] ?? 'app',
    password: process.env['DB_PASSWORD'] ?? 'app',
    database: process.env['DB_NAME'] ?? 'agendarhorario',
    synchronize: process.env['DB_SYNCHRONIZE'] === 'true',
    logging: process.env['DB_LOGGING'] === 'true',
  },
  redis: {
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: Number(process.env['REDIS_PORT'] ?? 6379),
  },
  firebase: {
    projectId: process.env['FIREBASE_PROJECT_ID'] ?? '',
    webApiKey: process.env['FIREBASE_WEB_API_KEY'] ?? '',
    serviceAccountPath: process.env['FIREBASE_SERVICE_ACCOUNT_PATH'],
    serviceAccountJson: process.env['FIREBASE_SERVICE_ACCOUNT_JSON'],
  },
  throttle: {
    ttlMs: Number(process.env['THROTTLE_TTL_MS'] ?? 60_000),
    limit: Number(process.env['THROTTLE_LIMIT'] ?? 120),
  },
  notifications: {
    sendgridApiKey: process.env['SENDGRID_API_KEY'],
    emailFrom: process.env['EMAIL_FROM'] ?? 'no-reply@agendarhorario.com',
    smtpHost: process.env['SMTP_HOST'],
    smtpPort: process.env['SMTP_PORT'] ? Number(process.env['SMTP_PORT']) : undefined,
    twilioAccountSid: process.env['TWILIO_ACCOUNT_SID'],
    twilioAuthToken: process.env['TWILIO_AUTH_TOKEN'],
    twilioSmsFrom: process.env['TWILIO_SMS_FROM'],
    twilioWhatsappFrom: process.env['TWILIO_WHATSAPP_FROM'],
  },
  verification: {
    jwtSecret: process.env['VERIFICATION_JWT_SECRET'] ?? 'dev-verification-secret-change-me',
    otpTtlMinutes: Number(process.env['VERIFICATION_OTP_TTL_MINUTES'] ?? 10),
    tokenTtlMinutes: Number(process.env['VERIFICATION_TOKEN_TTL_MINUTES'] ?? 15),
    maxAttempts: Number(process.env['VERIFICATION_MAX_ATTEMPTS'] ?? 5),
  },
});
