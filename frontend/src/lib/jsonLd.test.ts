import { describe, expect, it } from 'vitest';
import { serializeJsonLd as jsonLd } from './jsonLd';

describe('jsonLd', () => {
  it('cannot be broken out of with </script>', () => {
    const out = jsonLd({ name: 'Best Dental</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
  });

  it('still parses back to the same data', () => {
    const data = { name: 'A & B <Clinic>', text: 'line\u2028sep' };
    expect(JSON.parse(jsonLd(data))).toEqual(data);
  });
});
