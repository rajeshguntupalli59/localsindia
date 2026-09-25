// Serialise structured data for <script type="application/ld+json">.
// JSON.stringify alone is NOT safe here: a business name or listing title
// containing "</script>" would end the tag and run whatever follows. Escaping
// <, >, & and the two JS line separators (U+2028/U+2029) keeps the JSON valid
// for Google while making it impossible to break out of the script element.
const LINE_SEP = new RegExp('\\u2028', 'g');
const PARA_SEP = new RegExp('\\u2029', 'g');

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(LINE_SEP, '\\u2028')
    .replace(PARA_SEP, '\\u2029');
}
