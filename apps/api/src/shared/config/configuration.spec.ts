import { loadConfig } from './configuration';

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses defaults when env vars are absent', () => {
    delete process.env['API_PORT'];
    delete process.env['API_GLOBAL_PREFIX'];
    delete process.env['NODE_ENV'];
    delete process.env['WEB_ORIGIN'];
    delete process.env['SESSION_COOKIE_NAME'];
    delete process.env['SESSION_COOKIE_SECURE'];
    delete process.env['SESSION_COOKIE_DOMAIN'];
    delete process.env['SESSION_COOKIE_MAX_AGE_DAYS'];
    delete process.env['CSRF_COOKIE_NAME'];
    delete process.env['DB_HOST'];
    delete process.env['DB_PORT'];
    delete process.env['DB_USER'];
    delete process.env['DB_PASSWORD'];
    delete process.env['DB_NAME'];
    delete process.env['DB_SYNCHRONIZE'];
    delete process.env['DB_LOGGING'];
    delete process.env['REDIS_HOST'];
    delete process.env['REDIS_PORT'];
    delete process.env['FIREBASE_PROJECT_ID'];
    delete process.env['FIREBASE_WEB_API_KEY'];
    delete process.env['FIREBASE_SERVICE_ACCOUNT_PATH'];
    delete process.env['FIREBASE_SERVICE_ACCOUNT_JSON'];
    delete process.env['THROTTLE_TTL_MS'];
    delete process.env['THROTTLE_LIMIT'];
    delete process.env['SENDGRID_API_KEY'];
    delete process.env['EMAIL_FROM'];
    delete process.env['SMTP_HOST'];
    delete process.env['SMTP_PORT'];
    delete process.env['TWILIO_ACCOUNT_SID'];
    delete process.env['TWILIO_AUTH_TOKEN'];
    delete process.env['TWILIO_SMS_FROM'];
    delete process.env['TWILIO_WHATSAPP_FROM'];
    delete process.env['VERIFICATION_JWT_SECRET'];
    delete process.env['VERIFICATION_OTP_TTL_MINUTES'];
    delete process.env['VERIFICATION_TOKEN_TTL_MINUTES'];
    delete process.env['VERIFICATION_MAX_ATTEMPTS'];
    delete process.env['STRIPE_SECRET_KEY'];
    delete process.env['STRIPE_WEBHOOK_SECRET'];
    delete process.env['STRIPE_PRICE_BASICO'];
    delete process.env['STRIPE_PRICE_MEDIO'];
    delete process.env['STRIPE_PRICE_GRANDE'];
    delete process.env['STRIPE_PRICE_SUPER'];
    delete process.env['STRIPE_TRIAL_DAYS'];
    delete process.env['STRIPE_SUCCESS_URL'];
    delete process.env['STRIPE_CANCEL_URL'];

    const cfg = loadConfig();

    expect(cfg).toMatchObject({
      port: 3000,
      globalPrefix: 'api',
      nodeEnv: 'development',
      webOrigin: 'http://localhost:4200',
      session: {
        cookieName: '__session',
        secure: false,
        domain: 'localhost',
        maxAgeMs: 5 * 24 * 60 * 60 * 1000,
      },
      csrf: { cookieName: 'XSRF-TOKEN' },
      db: {
        host: 'localhost',
        port: 3306,
        user: 'app',
        password: 'app',
        database: 'agendarhorario',
        synchronize: false,
        logging: false,
      },
      redis: { host: 'localhost', port: 6379 },
      firebase: { projectId: '', webApiKey: '' },
      throttle: { ttlMs: 60_000, limit: 120 },
      notifications: { emailFrom: 'no-reply@agendarhorario.com' },
      verification: {
        jwtSecret: 'dev-verification-secret-change-me',
        otpTtlMinutes: 10,
        tokenTtlMinutes: 15,
        maxAttempts: 5,
      },
      stripe: {
        secretKey: '',
        webhookSecret: '',
        prices: { basico: '', medio: '', grande: '', super: '' },
        trialDays: 14,
        successUrl: 'http://localhost:4200/dashboard/assinatura?status=ok',
        cancelUrl: 'http://localhost:4200/dashboard/assinatura?status=cancel',
      },
    });
  });

  it('maps process.env values when present', () => {
    process.env['API_PORT'] = '4000';
    process.env['API_GLOBAL_PREFIX'] = 'v1';
    process.env['NODE_ENV'] = 'production';
    process.env['WEB_ORIGIN'] = 'https://app.example.com';
    process.env['SESSION_COOKIE_NAME'] = 'sid';
    process.env['SESSION_COOKIE_SECURE'] = 'true';
    process.env['SESSION_COOKIE_DOMAIN'] = '.example.com';
    process.env['SESSION_COOKIE_MAX_AGE_DAYS'] = '2';
    process.env['CSRF_COOKIE_NAME'] = 'csrf';
    process.env['DB_HOST'] = 'db';
    process.env['DB_PORT'] = '3307';
    process.env['DB_USER'] = 'u';
    process.env['DB_PASSWORD'] = 'p';
    process.env['DB_NAME'] = 'n';
    process.env['DB_SYNCHRONIZE'] = 'true';
    process.env['DB_LOGGING'] = 'true';
    process.env['REDIS_HOST'] = 'redis';
    process.env['REDIS_PORT'] = '6380';
    process.env['FIREBASE_PROJECT_ID'] = 'proj';
    process.env['FIREBASE_WEB_API_KEY'] = 'key';
    process.env['FIREBASE_SERVICE_ACCOUNT_PATH'] = './sa.json';
    process.env['FIREBASE_SERVICE_ACCOUNT_JSON'] = '{"type":"service_account"}';
    process.env['THROTTLE_TTL_MS'] = '1000';
    process.env['THROTTLE_LIMIT'] = '10';
    process.env['SENDGRID_API_KEY'] = 'sg';
    process.env['EMAIL_FROM'] = 'hi@example.com';
    process.env['SMTP_HOST'] = 'smtp';
    process.env['SMTP_PORT'] = '587';
    process.env['TWILIO_ACCOUNT_SID'] = 'sid';
    process.env['TWILIO_AUTH_TOKEN'] = 'tok';
    process.env['TWILIO_SMS_FROM'] = '+1';
    process.env['TWILIO_WHATSAPP_FROM'] = '+2';
    process.env['VERIFICATION_JWT_SECRET'] = 'secret-secret-secret';
    process.env['VERIFICATION_OTP_TTL_MINUTES'] = '3';
    process.env['VERIFICATION_TOKEN_TTL_MINUTES'] = '7';
    process.env['VERIFICATION_MAX_ATTEMPTS'] = '2';
    process.env['STRIPE_SECRET_KEY'] = 'sk';
    process.env['STRIPE_WEBHOOK_SECRET'] = 'wh';
    process.env['STRIPE_PRICE_BASICO'] = 'price_b';
    process.env['STRIPE_PRICE_MEDIO'] = 'price_m';
    process.env['STRIPE_PRICE_GRANDE'] = 'price_g';
    process.env['STRIPE_PRICE_SUPER'] = 'price_s';
    process.env['STRIPE_TRIAL_DAYS'] = '7';
    process.env['STRIPE_SUCCESS_URL'] = 'https://ok';
    process.env['STRIPE_CANCEL_URL'] = 'https://cancel';

    const cfg = loadConfig();

    expect(cfg.port).toBe(4000);
    expect(cfg.globalPrefix).toBe('v1');
    expect(cfg.nodeEnv).toBe('production');
    expect(cfg.webOrigin).toBe('https://app.example.com');
    expect(cfg.session).toEqual({
      cookieName: 'sid',
      secure: true,
      domain: '.example.com',
      maxAgeMs: 2 * 24 * 60 * 60 * 1000,
    });
    expect(cfg.csrf.cookieName).toBe('csrf');
    expect(cfg.db).toEqual({
      host: 'db',
      port: 3307,
      user: 'u',
      password: 'p',
      database: 'n',
      synchronize: true,
      logging: true,
    });
    expect(cfg.redis).toEqual({ host: 'redis', port: 6380 });
    expect(cfg.firebase).toEqual({
      projectId: 'proj',
      webApiKey: 'key',
      serviceAccountPath: './sa.json',
      serviceAccountJson: '{"type":"service_account"}',
    });
    expect(cfg.throttle).toEqual({ ttlMs: 1000, limit: 10 });
    expect(cfg.notifications).toEqual({
      sendgridApiKey: 'sg',
      emailFrom: 'hi@example.com',
      smtpHost: 'smtp',
      smtpPort: 587,
      twilioAccountSid: 'sid',
      twilioAuthToken: 'tok',
      twilioSmsFrom: '+1',
      twilioWhatsappFrom: '+2',
    });
    expect(cfg.verification).toEqual({
      jwtSecret: 'secret-secret-secret',
      otpTtlMinutes: 3,
      tokenTtlMinutes: 7,
      maxAttempts: 2,
    });
    expect(cfg.stripe).toEqual({
      secretKey: 'sk',
      webhookSecret: 'wh',
      prices: {
        basico: 'price_b',
        medio: 'price_m',
        grande: 'price_g',
        super: 'price_s',
      },
      trialDays: 7,
      successUrl: 'https://ok',
      cancelUrl: 'https://cancel',
    });
  });

  it('leaves smtpPort undefined when SMTP_PORT is absent', () => {
    delete process.env['SMTP_PORT'];
    expect(loadConfig().notifications.smtpPort).toBeUndefined();
  });

  it('treats SESSION_COOKIE_SECURE as false when not exactly true', () => {
    process.env['SESSION_COOKIE_SECURE'] = 'yes';
    expect(loadConfig().session.secure).toBe(false);
  });
});
