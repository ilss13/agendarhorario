import { isLandingLeadEmail } from './landing.lead';

describe('isLandingLeadEmail', () => {
  it('accepts a trimmed address', () => {
    expect(isLandingLeadEmail('  ana@studio.com  ')).toBe(true);
  });

  it('rejects empty, incomplete and oversized addresses', () => {
    expect(isLandingLeadEmail('   ')).toBe(false);
    expect(isLandingLeadEmail('ana@')).toBe(false);
    expect(isLandingLeadEmail(`${'a'.repeat(170)}@studio.com`)).toBe(false);
  });
});
