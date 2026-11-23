import { describe, expect, it } from 'vitest';
import { safePath } from './safeRedirect';

const BACKSLASH = String.fromCharCode(92); // avoid source-escaping ambiguity
const TAB = String.fromCharCode(9);

describe('safePath (open-redirect guard)', () => {
  it('keeps genuine internal paths', () => {
    expect(safePath('/hyderabad/businesses/123?claim=1')).toBe('/hyderabad/businesses/123?claim=1');
    expect(safePath('/profile/listings')).toBe('/profile/listings');
  });
  it('rejects off-site targets that still start with a slash', () => {
    for (const p of ['//evil.com', '//evil.com/path', '/' + BACKSLASH + 'evil.com', '/' + TAB + '/evil.com']) {
      expect(safePath(p)).toBeNull();
    }
  });
  it('rejects absolute URLs and non-paths', () => {
    for (const p of ['https://evil.com', 'http://evil.com', 'javascript:alert(1)', 'evil.com', '', null, undefined]) {
      expect(safePath(p)).toBeNull();
    }
  });
});
