const SENSITIVE_QUERY = /^(email|phone|token|code|otp|verificationtoken)$/i;

const PRIORITY_TRACE =
  /\/public|\/auth|\/billing|\/company|\/me|\/p\/|\/dashboard|\/admin|\/a\/|\/login|\/registrar/i;

export function redactTelemetryUrl(url: string): string {
  const absolute = /^https?:\/\//i.test(url);
  let parsed: URL;
  try {
    parsed = new URL(url, 'https://placeholder.invalid');
  } catch {
    return url;
  }
  parsed.pathname = parsed.pathname
    .replace(/\/a\/[^/]+/gi, '/a/:token')
    .replace(/\/appointments\/action\/[^/]+/gi, '/appointments/action/:token');
  parsed.searchParams.forEach((_value, key) => {
    if (SENSITIVE_QUERY.test(key)) {
      parsed.searchParams.set(key, 'redacted');
    }
  });
  if (absolute) return parsed.toString();
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function sentryTraceSampleRate(name: string | undefined): number {
  const value = name ?? '';
  if (/health/i.test(value)) return 0;
  if (PRIORITY_TRACE.test(value)) return 1;
  return 0.2;
}

export function flowFromPath(path: string): string {
  if (path.includes('/a/') || path.includes('/appointments/action')) return 'action_link';
  if (path.includes('/p/') || path.includes('/public')) return 'booking';
  if (path.includes('/dashboard') || path.includes('/admin') || path.includes('/company')) {
    return 'dashboard';
  }
  if (path.includes('/login') || path.includes('/registrar') || path.includes('/auth'))
    return 'auth';
  if (path.includes('/billing')) return 'billing';
  if (path.includes('/me')) return 'me';
  return 'other';
}

export function shouldCaptureHttpStatus(status: number): boolean {
  return status === 0 || status >= 500;
}

export function shouldLogClientHttpStatus(status: number): boolean {
  return status === 400 || status === 409 || status === 422 || status === 429;
}
