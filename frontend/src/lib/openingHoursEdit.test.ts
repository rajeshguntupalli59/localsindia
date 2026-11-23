import { describe, expect, it } from 'vitest';
import { rowsToOpeningHours, weekToRows, type DayRow } from './openingHours';

const open = (o: string, c: string): DayRow => ({ closed: false, open: o, close: c });
const shut: DayRow = { closed: true, open: '09:00', close: '21:00' };

describe('weekToRows', () => {
  it('turns simple hours into 7 day rows', () => {
    const rows = weekToRows('Mo-Sa 09:00-21:00; Su off')!;
    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual(open('09:00', '21:00'));
    expect(rows[5]).toEqual(open('09:00', '21:00'));
    expect(rows[6].closed).toBe(true);
  });
  it('keeps past-midnight and 24-hour days', () => {
    expect(weekToRows('18:00-02:00')![0]).toEqual(open('18:00', '02:00'));
    expect(weekToRows('24/7')![3]).toEqual(open('00:00', '24:00'));
  });
  it('returns null when there are no hours or the editor cannot show them', () => {
    expect(weekToRows(null)).toBeNull();
    expect(weekToRows('')).toBeNull();
    expect(weekToRows('Mo-Fr 10:00-13:00,16:00-20:00')).toBeNull(); // lunch break
    expect(weekToRows('sunrise-sunset')).toBeNull();
  });
});

describe('rowsToOpeningHours', () => {
  it('groups consecutive days with the same hours', () => {
    const rows = [...Array(6).fill(open('09:00', '21:00')), shut];
    expect(rowsToOpeningHours(rows)).toBe('Mo-Sa 09:00-21:00; Su off');
  });
  it('writes every day the same as one rule', () => {
    expect(rowsToOpeningHours(Array(7).fill(open('10:00', '22:00')))).toBe('Mo-Su 10:00-22:00');
  });
  it('writes single days and gaps', () => {
    const rows = [open('09:00', '17:00'), shut, open('09:00', '17:00'), open('09:00', '17:00'), open('09:00', '13:00'), shut, shut];
    expect(rowsToOpeningHours(rows)).toBe('Mo 09:00-17:00; Tu off; We-Th 09:00-17:00; Fr 09:00-13:00; Sa-Su off');
  });
  it('returns null when every day is closed', () => {
    expect(rowsToOpeningHours(Array(7).fill(shut))).toBeNull();
  });
  it('round-trips through the parser', () => {
    for (const raw of ['Mo-Sa 09:00-21:00; Su off', 'Mo-Su 00:00-24:00', 'Mo-Fr 18:00-02:00; Sa-Su off']) {
      expect(rowsToOpeningHours(weekToRows(raw)!)).toBe(raw);
    }
  });
});
