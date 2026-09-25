import { describe, expect, it } from 'vitest';
import { reviewInviteText } from './ReviewInvite';

describe('reviewInviteText', () => {
  it('names the business and ends with its page link', () => {
    const t = reviewInviteText('Abhi ENT Clinic', 'https://www.localsindia.com/hyderabad/businesses/x');
    expect(t).toContain('Abhi ENT Clinic is now on LocalsIndia');
    expect(t.endsWith('\nhttps://www.localsindia.com/hyderabad/businesses/x')).toBe(true);
  });
});
