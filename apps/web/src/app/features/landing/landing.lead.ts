const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isLandingLeadEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= 180 && EMAIL.test(email);
}
