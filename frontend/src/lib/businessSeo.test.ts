import { describe, expect, it } from 'vitest';
import { businessTitle } from './businessSeo';

const base = { name: 'Ravi Hospital', address: null, phone: null, opening_hours: null, locality: null };

describe('businessTitle', () => {
  it('lists every detail the page has, with the area', () => {
    const b = { ...base, address: 'Road 1', phone: '+919876543210', opening_hours: 'Mo-Su 09:00-21:00', locality: 'KPHB' };
    expect(businessTitle(b, 'Hyderabad', 'Doctors')).toBe('Ravi Hospital, KPHB — Address, Phone Number & Timings | LocalsIndia');
  });

  it('never promises a detail the page does not have', () => {
    const t = businessTitle({ ...base, address: 'Road 1', phone: '+919876543210' }, 'Hyderabad', 'Doctors');
    expect(t).toBe('Ravi Hospital, Hyderabad — Address & Phone Number | LocalsIndia');
    expect(businessTitle({ ...base, phone: '+919876543210' }, 'Hyderabad', 'Doctors')).toBe('Ravi Hospital, Hyderabad — Phone Number | LocalsIndia');
  });

  it('does not repeat a place already in the name', () => {
    const t = businessTitle({ ...base, name: 'Sunrise Hospital Karimnagar', address: 'Road 1' }, 'Karimnagar', 'Doctors');
    expect(t).toBe('Sunrise Hospital Karimnagar — Address | LocalsIndia');
  });

  it('falls back to the type and city when there are no details', () => {
    expect(businessTitle(base, 'Hyderabad', 'Doctors & Clinics')).toBe('Ravi Hospital — Doctors & Clinics in Hyderabad | LocalsIndia');
  });
});
