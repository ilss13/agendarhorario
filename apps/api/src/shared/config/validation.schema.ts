import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  API_PORT: Joi.number().default(3000),
  API_GLOBAL_PREFIX: Joi.string().default('api'),
  WEB_ORIGIN: Joi.string().uri().default('http://localhost:4200'),

  SESSION_COOKIE_NAME: Joi.string().default('__session'),
  SESSION_COOKIE_SECURE: Joi.boolean().default(false),
  SESSION_COOKIE_DOMAIN: Joi.string().default('localhost'),
  SESSION_COOKIE_MAX_AGE_DAYS: Joi.number().default(5),
  CSRF_COOKIE_NAME: Joi.string().default('XSRF-TOKEN'),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_WEB_API_KEY: Joi.string().required(),
  FIREBASE_SERVICE_ACCOUNT_PATH: Joi.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: Joi.string().optional(),

  THROTTLE_TTL_MS: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(120),

  SENDGRID_API_KEY: Joi.string().allow('').optional(),
  EMAIL_FROM: Joi.string().email().default('no-reply@agendarhorario.com'),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USE_FOR: Joi.string().valid('dev', 'never').default('dev'),

  TWILIO_ACCOUNT_SID: Joi.string().allow('').optional(),
  TWILIO_AUTH_TOKEN: Joi.string().allow('').optional(),
  TWILIO_SMS_FROM: Joi.string().allow('').optional(),
  TWILIO_WHATSAPP_FROM: Joi.string().allow('').optional(),

  VERIFICATION_JWT_SECRET: Joi.string().min(16).default('dev-verification-secret-change-me'),
  VERIFICATION_OTP_TTL_MINUTES: Joi.number().default(10),
  VERIFICATION_TOKEN_TTL_MINUTES: Joi.number().default(15),
  VERIFICATION_MAX_ATTEMPTS: Joi.number().default(5),
  APPOINTMENT_ACTION_TOKEN_TTL_HOURS: Joi.number().default(72),

  STRIPE_SECRET_KEY: Joi.string().allow('').optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  STRIPE_PRICE_BASICO: Joi.string().allow('').optional(),
  STRIPE_PRICE_MEDIO: Joi.string().allow('').optional(),
  STRIPE_PRICE_GRANDE: Joi.string().allow('').optional(),
  STRIPE_PRICE_SUPER: Joi.string().allow('').optional(),
  STRIPE_SUCCESS_URL: Joi.string().uri().optional(),
  STRIPE_CANCEL_URL: Joi.string().uri().optional(),
}).custom((value, helpers) => {
  if (!value.FIREBASE_SERVICE_ACCOUNT_PATH && !value.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return helpers.error('any.custom', {
      message:
        'Defina FIREBASE_SERVICE_ACCOUNT_PATH ou FIREBASE_SERVICE_ACCOUNT_JSON para o Firebase Admin.',
    });
  }
  return value;
});
