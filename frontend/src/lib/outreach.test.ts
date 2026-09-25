import { describe, expect, it } from 'vitest';
import { outreachMessage, whatsappLink } from './outreach';

const biz = { id: 'abc', name: 'Sri Balaji Tiffins', city_slug: 'hyderabad', city_name: 'Hyderabad' };

describe('outreach', () => {
  it('message names the business and links its public page', () => {
    const m = outreachMessage(biz);
    expect(m).toContain('"Sri Balaji Tiffins"');
    expect(m).toContain('https://www.localsindia.com/hyderabad/businesses/abc');
    expect(m).toContain('reply STOP');
  });

  it('whatsapp link only for Indian mobiles', () => {
    expect(whatsappLink('+919848022338', 'hi there')).toBe('https://wa.me/919848022338?text=hi%20there');
    expect(whatsappLink('+914023456789', 'x')).toBeNull();   // landline
    expect(whatsappLink(null, 'x')).toBeNull();
  });
});
