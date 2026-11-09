import { describe, expect, it } from 'vitest';
import { shareListText } from './ShareListButton';

const url = 'https://www.localsindia.com/hyderabad/dentists';

describe('shareListText', () => {
  it('names the top three and says how many more there are', () => {
    const text = shareListText({ title: 'Dentists in Hyderabad', names: ['A', 'B', 'C', 'D'], total: 1250, url });
    expect(text).toContain('Dentists in Hyderabad');
    expect(text).toContain('3. C');
    expect(text).not.toContain('4.');
    expect(text).toContain('See all 1,250 on LocalsIndia:');
    expect(text.endsWith(url)).toBe(true);
  });

  it('does not say "all" when the whole list is already named', () => {
    const text = shareListText({ title: 'Dentists in Hyderabad', names: ['A', 'B'], total: 2, url });
    expect(text).toContain('See them on LocalsIndia:');
    expect(text).not.toContain('See all');
  });
});
