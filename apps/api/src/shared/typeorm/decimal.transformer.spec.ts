import { decimalTransformer } from './decimal.transformer';

describe('decimalTransformer', () => {
  describe('to', () => {
    it('formats numbers to two decimal places', () => {
      expect(decimalTransformer.to(10)).toBe('10.00');
      expect(decimalTransformer.to(10.5)).toBe('10.50');
    });

    it('returns null for null or undefined', () => {
      expect(decimalTransformer.to(null)).toBeNull();
      expect(decimalTransformer.to(undefined)).toBeNull();
    });
  });

  describe('from', () => {
    it('parses decimal strings to numbers', () => {
      expect(decimalTransformer.from('10.50')).toBe(10.5);
      expect(decimalTransformer.from('0.00')).toBe(0);
    });

    it('returns null for null or undefined', () => {
      expect(decimalTransformer.from(null)).toBeNull();
      expect(decimalTransformer.from(undefined as unknown as string | null)).toBeNull();
    });
  });
});
