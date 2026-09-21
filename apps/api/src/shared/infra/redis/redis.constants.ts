export const REDIS_CLIENT = 'REDIS_CLIENT';

export const otpLookupKey = (kind: 'email' | 'phone', target: string): string =>
  `otp:dev:${kind}:${target}`;
