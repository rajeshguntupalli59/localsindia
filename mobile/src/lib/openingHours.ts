// COPY of frontend/src/lib/openingHours.ts — keep the two in sync.
// Minimal parser for the common OpenStreetMap opening_hours formats:
//   "24/7", "Mo-Sa 09:00-21:00; Su off", "Mo,We 10:00-13:00,16:00-20:00",
//   "09:00-21:00" (every day), "18:00-02:00" (past midnight).
// Anything else returns null — the page then shows the raw text, never a
// guessed "Open now". Times are evaluated in India time, whoever is viewing.

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Span = [number, number];          // minutes from the day's midnight; end may exceed 1440
export type WeekHours = Span[][];      // index 0 = Monday

function parseDays(sel: string): number[] | null {
  const out: number[] = [];
  for (const part of sel.split(',')) {
    const m = part.trim().match(/^([A-Z][a-z])(?:-([A-Z][a-z]))?$/);
    if (!m) return null;
    const a = DAYS.indexOf(m[1] as typeof DAYS[number]);
    const b = m[2] ? DAYS.indexOf(m[2] as typeof DAYS[number]) : a;
    if (a < 0 || b < 0) return null;
    for (let d = a; ; d = (d + 1) % 7) { out.push(d); if (d === b) break; }
  }
  return out;
}

function parseTimes(sel: string): Span[] | null {
  const spans: Span[] = [];
  for (const part of sel.split(',')) {
    const m = part.trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const start = +m[1] * 60 + +m[2];
    let end = +m[3] * 60 + +m[4];
    if (start > 24 * 60 || end > 24 * 60 + 12 * 60) return null;
    if (end <= start) end += 24 * 60;   // closes after midnight
    spans.push([start, end]);
  }
  return spans;
}

export function parseOpeningHours(raw: string | null | undefined): WeekHours | null {
  if (!raw) return null;
  const text = raw.trim();
  if (text === '24/7') return Array.from({ length: 7 }, () => [[0, 24 * 60]] as Span[]);
  const week: WeekHours = Array.from({ length: 7 }, () => []);
  for (const rule of text.split(';').map(r => r.trim()).filter(Boolean)) {
    const m = rule.match(/^(?:([A-Z][a-z](?:[-,][A-Z][a-z])*)\s+)?(.+)$/);
    if (!m) return null;
    const days = m[1] ? parseDays(m[1]) : [0, 1, 2, 3, 4, 5, 6];
    if (!days) return null;
    const rest = m[2].trim();
    const spans = /^(off|closed)$/i.test(rest) ? [] : rest === '24/7' || rest === '00:00-24:00' ? [[0, 24 * 60] as Span] : parseTimes(rest);
    if (!spans) return null;
    for (const d of days) week[d] = spans;   // later rules override earlier ones
  }
  return week;
}

function indiaNow(now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const day = DAY_NAMES.indexOf(get('weekday'));
  return { day, minutes: +get('hour') * 60 + +get('minute') };
}

const fmt = (min: number) => {
  const m = min % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** { open, label } for right now in India, e.g. "Open now · closes 21:00". */
export function openStatus(week: WeekHours, now = new Date()): { open: boolean; label: string } {
  const { day, minutes } = indiaNow(now);
  const yesterday = (day + 6) % 7;
  const current = week[day].find(([s, e]) => minutes >= s && minutes < e)
    ?? week[yesterday].map(([s, e]) => [s - 24 * 60, e - 24 * 60] as Span).find(([s, e]) => minutes >= s && minutes < e);
  if (current) {
    return { open: true, label: current[1] - current[0] >= 24 * 60 ? 'Open 24 hours' : `Open now · closes ${fmt(current[1])}` };
  }
  const laterToday = week[day].find(([s]) => s > minutes);
  if (laterToday) return { open: false, label: `Closed · opens ${fmt(laterToday[0])}` };
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (week[d].length) return { open: false, label: `Closed · opens ${i === 1 ? 'tomorrow' : DAY_NAMES[d]} ${fmt(week[d][0][0])}` };
  }
  return { open: false, label: 'Closed' };
}

/** Human rows, consecutive days with the same hours grouped: ["Mon–Sat: 09:00–21:00", "Sun: Closed"]. */
export function describeWeek(week: WeekHours): string[] {
  const text = (spans: Span[]) => spans.length === 0 ? 'Closed'
    : spans.map(([s, e]) => (e - s >= 24 * 60 ? 'Open 24 hours' : `${fmt(s)}–${fmt(e)}`)).join(', ');
  const rows: string[] = [];
  let start = 0;
  for (let d = 1; d <= 7; d++) {
    if (d === 7 || text(week[d]) !== text(week[start])) {
      const label = start === d - 1 ? DAY_NAMES[start] : `${DAY_NAMES[start]}–${DAY_NAMES[d - 1]}`;
      rows.push(`${label}: ${text(week[start])}`);
      start = d;
    }
  }
  return rows;
}

/** schema.org openingHours strings, e.g. ["Mo-Sa 09:00-21:00"] (closed days omitted). */
export function schemaOpeningHours(week: WeekHours): string[] {
  const key = (spans: Span[]) => JSON.stringify(spans);
  const out: string[] = [];
  let start = 0;
  for (let d = 1; d <= 7; d++) {
    if (d === 7 || key(week[d]) !== key(week[start])) {
      const days = start === d - 1 ? DAYS[start] : `${DAYS[start]}-${DAYS[d - 1]}`;
      for (const [s, e] of week[start]) out.push(`${days} ${fmt(s)}-${e - s >= 24 * 60 ? '23:59' : fmt(e)}`);
      start = d;
    }
  }
  return out;
}
