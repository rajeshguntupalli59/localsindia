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

  it('links the type page when the business has one, never for catch-alls', () => {
    const dentist = outreachMessage({ ...biz, subcategory_slug: 'dentists', subcategory_name: 'Dentists' });
    expect(dentist).toContain('find you here: https://www.localsindia.com/hyderabad/dentists');
    expect(outreachMessage({ ...biz, subcategory_slug: 'other-shops', subcategory_name: 'Other Shops' })).not.toContain('find you here');
    expect(outreachMessage(biz)).not.toContain('find you here');
  });

  it('whatsapp link only for Indian mobiles', () => {
    expect(whatsappLink('+919848022338', 'hi there')).toBe('https://wa.me/919848022338?text=hi%20there');
    expect(whatsappLink('+914023456789', 'x')).toBeNull();   // landline
    expect(whatsappLink(null, 'x')).toBeNull();
  });
});
