import { envValidationSchema } from './validation.schema';

const validEnv = {
  DB_USER: 'app',
  DB_PASSWORD: 'app',
  DB_NAME: 'agendarhorario',
  FIREBASE_PROJECT_ID: 'proj',
  FIREBASE_WEB_API_KEY: 'key',
  FIREBASE_SERVICE_ACCOUNT_PATH: './sa.json',
};

describe('envValidationSchema', () => {
  it('accepts a minimal valid env and applies defaults', () => {
    const result = envValidationSchema.validate(validEnv);
    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      NODE_ENV: 'development',
      API_PORT: 3000,
      DB_USER: 'app',
      FIREBASE_PROJECT_ID: 'proj',
      STRIPE_TRIAL_DAYS: 14,
      SMTP_USE_FOR: 'dev',
    });
  });

  it('accepts FIREBASE_SERVICE_ACCOUNT_JSON instead of PATH', () => {
    const result = envValidationSchema.validate({
      ...validEnv,
      FIREBASE_SERVICE_ACCOUNT_PATH: undefined,
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"type":"service_account"}',
    });
    expect(result.error).toBeUndefined();
  });

  it('rejects when both firebase service account sources are missing', () => {
    const result = envValidationSchema.validate({
      DB_USER: 'app',
      DB_PASSWORD: 'app',
      DB_NAME: 'agendarhorario',
      FIREBASE_PROJECT_ID: 'proj',
      FIREBASE_WEB_API_KEY: 'key',
    });
    expect(result.error).toBeDefined();
  });

  it('rejects invalid NODE_ENV', () => {
    const result = envValidationSchema.validate({ ...validEnv, NODE_ENV: 'staging' });
    expect(result.error).toBeDefined();
  });

  it('rejects missing required DB_USER', () => {
    const { DB_USER: _omit, ...rest } = validEnv;
    const result = envValidationSchema.validate(rest);
    expect(result.error).toBeDefined();
  });

  it('rejects non-uri WEB_ORIGIN', () => {
    const result = envValidationSchema.validate({ ...validEnv, WEB_ORIGIN: 'not-a-uri' });
    expect(result.error).toBeDefined();
  });

  it('rejects VERIFICATION_JWT_SECRET shorter than 16 chars when provided', () => {
    const result = envValidationSchema.validate({
      ...validEnv,
      VERIFICATION_JWT_SECRET: 'short',
    });
    expect(result.error).toBeDefined();
  });

  it('rejects STRIPE_TRIAL_DAYS above 90', () => {
    const result = envValidationSchema.validate({ ...validEnv, STRIPE_TRIAL_DAYS: 91 });
    expect(result.error).toBeDefined();
  });

  it('rejects invalid SMTP_USE_FOR', () => {
    const result = envValidationSchema.validate({ ...validEnv, SMTP_USE_FOR: 'always' });
    expect(result.error).toBeDefined();
  });

  it('allows empty DB_PASSWORD', () => {
    const result = envValidationSchema.validate({ ...validEnv, DB_PASSWORD: '' });
    expect(result.error).toBeUndefined();
  });
});
