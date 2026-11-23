import { describe, expect, it } from 'vitest';
import { toIndianMobile } from './phone';

describe('toIndianMobile', () => {
  it('accepts the ways people type a mobile number', () => {
    for (const s of ['9663122267', '96631 22267', '+91 96631 22267', '919663122267', '09663122267', '+91-96631-22267']) {
      expect(toIndianMobile(s)).toBe('+919663122267');
    }
  });
  it('refuses short numbers, non-mobile starts and junk', () => {
    for (const s of ['96631222', '5663122267', '+915663122267', '966312226712', 'abc', '']) {
      expect(toIndianMobile(s)).toBeNull();
    }
  });
});
