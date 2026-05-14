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
}).custom((value, helpers) => {
  if (!value.FIREBASE_SERVICE_ACCOUNT_PATH && !value.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return helpers.error('any.custom', {
      message:
        'Defina FIREBASE_SERVICE_ACCOUNT_PATH ou FIREBASE_SERVICE_ACCOUNT_JSON para o Firebase Admin.',
    });
  }
  return value;
});
