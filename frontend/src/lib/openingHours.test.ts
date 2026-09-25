import { describe, expect, it } from 'vitest';
import { describeWeek, openStatus, parseOpeningHours, schemaOpeningHours } from './openingHours';

// India is UTC+5:30 — these build a Date for a given IST day/time.
// 2026-09-21 is a Monday.
const ist = (isoLocal: string) => new Date(`${isoLocal}+05:30`);

describe('parseOpeningHours', () => {
  it('reads the common formats', () => {
    expect(describeWeek(parseOpeningHours('Mo-Sa 09:00-21:00; Su off')!)).toEqual(['Mon–Sat: 09:00–21:00', 'Sun: Closed']);
    expect(describeWeek(parseOpeningHours('24/7')!)).toEqual(['Mon–Sun: Open 24 hours']);
    expect(describeWeek(parseOpeningHours('10:00-22:00')!)).toEqual(['Mon–Sun: 10:00–22:00']);
    expect(describeWeek(parseOpeningHours('Mo,We 10:00-13:00,16:00-20:00')!)).toEqual([
      'Mon: 10:00–13:00, 16:00–20:00', 'Tue: Closed', 'Wed: 10:00–13:00, 16:00–20:00', 'Thu–Sun: Closed']);
  });

  it('refuses what it cannot read instead of guessing', () => {
    expect(parseOpeningHours('Mo-Fr 09:00-18:00; PH off')).toBeNull();
    expect(parseOpeningHours('sunrise-sunset')).toBeNull();
    expect(parseOpeningHours('')).toBeNull();
    expect(parseOpeningHours(null)).toBeNull();
  });
});

describe('openStatus (India time)', () => {
  const week = parseOpeningHours('Mo-Sa 09:00-21:00; Su off')!;
  it('open / closing time', () => {
    expect(openStatus(week, ist('2026-09-21T10:30:00'))).toEqual({ open: true, label: 'Open now · closes 21:00' });
  });
  it('before opening, after closing, and on a closed day', () => {
    expect(openStatus(week, ist('2026-09-21T07:00:00'))).toEqual({ open: false, label: 'Closed · opens 09:00' });
    expect(openStatus(week, ist('2026-09-21T22:00:00'))).toEqual({ open: false, label: 'Closed · opens tomorrow 09:00' });
    expect(openStatus(week, ist('2026-09-26T22:00:00'))).toEqual({ open: false, label: 'Closed · opens Mon 09:00' });
  });
  it('late-night spans carry into the next morning', () => {
    const bar = parseOpeningHours('18:00-02:00')!;
    expect(openStatus(bar, ist('2026-09-22T01:00:00'))).toEqual({ open: true, label: 'Open now · closes 02:00' });
  });
  it('24/7', () => {
    expect(openStatus(parseOpeningHours('24/7')!, ist('2026-09-21T03:00:00')).label).toBe('Open 24 hours');
  });
});

describe('schemaOpeningHours', () => {
  it('groups days and drops closed ones', () => {
    expect(schemaOpeningHours(parseOpeningHours('Mo-Sa 09:00-21:00; Su off')!)).toEqual(['Mo-Sa 09:00-21:00']);
    expect(schemaOpeningHours(parseOpeningHours('24/7')!)).toEqual(['Mo-Su 00:00-23:59']);
    expect(schemaOpeningHours(parseOpeningHours('18:00-02:00')!)).toEqual(['Mo-Su 18:00-02:00']);
  });
});
