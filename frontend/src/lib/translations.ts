/**
 * Static i18n dictionaries for all 11 languages.
 *
 * Bundled at build time — zero async loading, zero FOUT risk, zero flicker.
 * Covers shared UI chrome only: nav, hero headline, city picker, search bar.
 * Full listing content translations go through next-intl messages/*.json.
 *
 * Usage:
 *   const { t } = usePrefs();
 *   t('nav.post')           → "Post Listing"
 *   t('hero.inCity', { city: 'Hyderabad' }) → "In Hyderabad."
 */

import type { LangCode } from './prefs';

// ── Schema ────────────────────────────────────────────────────────────────────
export interface UIDict {
  nav: {
    cities:    string;
    signIn:    string;
    post:      string;
    postShort: string;
  };
  hero: {
    headline1:  string;
    inCity:     string; // supports {city} interpolation
    inYourCity: string;
    sub:        string;
  };
  city: {
    select:    string;
    search:    string;
    recent:    string;
    locate:    string;
    notFound:  string; // "No cities match '{query}'"
  };
  search: {
    placeholder: string;
  };
}

// ── Dictionaries ──────────────────────────────────────────────────────────────
const DICTS: Record<LangCode, UIDict> = {
  en: {
    nav:    { cities: 'Cities', signIn: 'Sign in', post: 'Post Listing', postShort: 'Post' },
    hero:   { headline1: 'Buy. Sell. Connect.', inCity: 'In {city}.', inYourCity: 'In Your City.', sub: 'Post listings, find PGs, discover local services — in your language, in your neighbourhood.' },
    city:   { select: 'Select City', search: 'Search city...', recent: 'Recent', locate: 'Use my location', notFound: 'No cities match "{query}"' },
    search: { placeholder: 'Search tiffin, PG, tutor...' },
  },
  hi: {
    nav:    { cities: 'शहर', signIn: 'साइन इन', post: 'लिस्टिंग पोस्ट करें', postShort: 'पोस्ट' },
    hero:   { headline1: 'खरीदें. बेचें. जुड़ें.', inCity: '{city} में.', inYourCity: 'आपके शहर में.', sub: 'लिस्टिंग पोस्ट करें, PG खोजें, स्थानीय सेवाएं खोजें — आपकी भाषा में।' },
    city:   { select: 'शहर चुनें', search: 'शहर खोजें...', recent: 'हाल के', locate: 'मेरी लोकेशन', notFound: '"{query}" से कोई शहर नहीं मिला' },
    search: { placeholder: 'टिफिन, PG, ट्यूटर खोजें...' },
  },
  te: {
    nav:    { cities: 'నగరాలు', signIn: 'సైన్ ఇన్', post: 'లిస్టింగ్ పోస్ట్ చేయి', postShort: 'పోస్ట్' },
    hero:   { headline1: 'కొనండి. అమ్మండి. కలవండి.', inCity: '{city}లో.', inYourCity: 'మీ నగరంలో.', sub: 'లిస్టింగ్‌లు పోస్ట్ చేయండి, PGలు కనుగొనండి — మీ భాషలో.' },
    city:   { select: 'నగరం ఎంచుకోండి', search: 'నగరం వెతకండి...', recent: 'ఇటీవలి', locate: 'నా లొకేషన్', notFound: '"{query}" తో నగరాలు దొరకలేదు' },
    search: { placeholder: 'టిఫిన్, PG, ట్యూటర్ వెతకండి...' },
  },
  ta: {
    nav:    { cities: 'நகரங்கள்', signIn: 'உள்நுழைக', post: 'பட்டியல் இடுக', postShort: 'இடுக' },
    hero:   { headline1: 'வாங்கு. விற்கு. இணை.', inCity: '{city}இல்.', inYourCity: 'உங்கள் நகரில்.', sub: 'பட்டியல்களை இடுக, PG கண்டறி — உங்கள் மொழியில்.' },
    city:   { select: 'நகரம் தேர்வு', search: 'நகரம் தேடுக...', recent: 'சமீபத்திய', locate: 'என் இடம்', notFound: '"{query}" பொருந்தும் நகரங்கள் இல்லை' },
    search: { placeholder: 'டிஃபின், PG, டியூட்டர் தேடுக...' },
  },
  kn: {
    nav:    { cities: 'ನಗರಗಳು', signIn: 'ಸೈನ್ ಇನ್', post: 'ಲಿಸ್ಟಿಂಗ್ ಹಾಕಿ', postShort: 'ಹಾಕಿ' },
    hero:   { headline1: 'ಕೊಳ್ಳಿ. ಮಾರಿ. ಸಂಪರ್ಕಿಸಿ.', inCity: '{city}ದಲ್ಲಿ.', inYourCity: 'ನಿಮ್ಮ ನಗರದಲ್ಲಿ.', sub: 'ಲಿಸ್ಟಿಂಗ್ ಹಾಕಿ, PG ಹುಡುಕಿ — ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ.' },
    city:   { select: 'ನಗರ ಆಯ್ಕೆ', search: 'ನಗರ ಹುಡುಕಿ...', recent: 'ಇತ್ತೀಚಿನ', locate: 'ನನ್ನ ಸ್ಥಳ', notFound: '"{query}" ಗೆ ಯಾವ ನಗರ ದೊರೆಯಲಿಲ್ಲ' },
    search: { placeholder: 'ಟಿಫಿನ್, PG, ಟ್ಯೂಟರ್ ಹುಡುಕಿ...' },
  },
  ml: {
    nav:    { cities: 'നഗരങ്ങൾ', signIn: 'സൈൻ ഇൻ', post: 'ലിസ്റ്റിംഗ് ചേർക്കുക', postShort: 'ചേർക്കുക' },
    hero:   { headline1: 'വാങ്ങുക. വിൽക്കുക. ബന്ധിക്കുക.', inCity: '{city}ൽ.', inYourCity: 'നിങ്ങളുടെ നഗരത്തിൽ.', sub: 'ലിസ്റ്റിംഗ് ചേർക്കുക, PG കണ്ടെത്തുക — നിങ്ങളുടെ ഭാഷയിൽ.' },
    city:   { select: 'നഗരം തിരഞ്ഞെടുക്കുക', search: 'നഗരം തിരയുക...', recent: 'സമീപകാലം', locate: 'എന്റെ സ്ഥലം', notFound: '"{query}" ക്ക് നഗരങ്ങൾ ലഭിച്ചില്ല' },
    search: { placeholder: 'ടിഫിൻ, PG, ട്യൂട്ടർ തിരയുക...' },
  },
  mr: {
    nav:    { cities: 'शहरे', signIn: 'साइन इन', post: 'लिस्टिंग टाका', postShort: 'टाका' },
    hero:   { headline1: 'खरेदी करा. विका. जोडा.', inCity: '{city}मध्ये.', inYourCity: 'तुमच्या शहरात.', sub: 'लिस्टिंग टाका, PG शोधा — तुमच्या भाषेत.' },
    city:   { select: 'शहर निवडा', search: 'शहर शोधा...', recent: 'अलीकडील', locate: 'माझे स्थान', notFound: '"{query}" साठी कोणतेही शहर आढळले नाही' },
    search: { placeholder: 'टिफिन, PG, शिक्षक शोधा...' },
  },
  bn: {
    nav:    { cities: 'শহর', signIn: 'সাইন ইন', post: 'লিস্টিং দিন', postShort: 'দিন' },
    hero:   { headline1: 'কিনুন. বেচুন. সংযুক্ত হন.', inCity: '{city}তে.', inYourCity: 'আপনার শহরে.', sub: 'লিস্টিং দিন, PG খুঁজুন — আপনার ভাষায়।' },
    city:   { select: 'শহর বেছে নিন', search: 'শহর খুঁজুন...', recent: 'সাম্প্রতিক', locate: 'আমার অবস্থান', notFound: '"{query}" এর জন্য কোনো শহর পাওয়া যায়নি' },
    search: { placeholder: 'টিফিন, PG, টিউটর খুঁজুন...' },
  },
  gu: {
    nav:    { cities: 'શહેરો', signIn: 'સાઇન ઇન', post: 'લિસ્ટિંગ મૂકો', postShort: 'મૂકો' },
    hero:   { headline1: 'ખરીદો. વેચો. જોડાઓ.', inCity: '{city}માં.', inYourCity: 'તમારા શહેરમાં.', sub: 'લિસ્ટિંગ મૂકો, PG શોધો — તમારી ભાષામાં.' },
    city:   { select: 'શહેર પસંદ કરો', search: 'શહેર શોધો...', recent: 'તાજેતરના', locate: 'મારું સ્થાન', notFound: '"{query}" માટે કોઈ શહેર મળ્યું નહીં' },
    search: { placeholder: 'ટિફિન, PG, ટ્યુટર શોધો...' },
  },
  pa: {
    nav:    { cities: 'ਸ਼ਹਿਰ', signIn: 'ਸਾਈਨ ਇਨ', post: 'ਲਿਸਟਿੰਗ ਪਾਓ', postShort: 'ਪਾਓ' },
    hero:   { headline1: 'ਖਰੀਦੋ. ਵੇਚੋ. ਜੁੜੋ.', inCity: '{city} ਵਿੱਚ.', inYourCity: 'ਤੁਹਾਡੇ ਸ਼ਹਿਰ ਵਿੱਚ.', sub: 'ਲਿਸਟਿੰਗ ਪਾਓ, PG ਲੱਭੋ — ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਵਿੱਚ।' },
    city:   { select: 'ਸ਼ਹਿਰ ਚੁਣੋ', search: 'ਸ਼ਹਿਰ ਖੋਜੋ...', recent: 'ਹਾਲੀਆ', locate: 'ਮੇਰੀ ਲੋਕੇਸ਼ਨ', notFound: '"{query}" ਲਈ ਕੋਈ ਸ਼ਹਿਰ ਨਹੀਂ ਮਿਲਿਆ' },
    search: { placeholder: 'ਟਿਫਿਨ, PG, ਟਿਊਟਰ ਖੋਜੋ...' },
  },
  or: {
    nav:    { cities: 'ସହର', signIn: 'ସାଇନ ଇନ', post: 'ଲିଷ୍ଟିଂ ଦିଅ', postShort: 'ଦିଅ' },
    hero:   { headline1: 'କିଣ. ବେଚ. ସଂଯୁକ୍ତ ହ.', inCity: '{city}ରେ.', inYourCity: 'ତୁମ ସହରରେ.', sub: 'ଲିଷ୍ଟିଂ ଦିଅ, PG ଖୋଜ — ତୁମ ଭାଷାରେ।' },
    city:   { select: 'ସହର ବାଛ', search: 'ସହର ଖୋଜ...', recent: 'ସାମ୍ପ୍ରତିକ', locate: 'ମୋ ସ୍ଥାନ', notFound: '"{query}" ପାଇଁ କୌଣସି ସହର ମିଳିଲା ନାହିଁ' },
    search: { placeholder: 'ଟିଫିନ, PG, ଟ୍ୟୁଟର ଖୋଜ...' },
  },
};

// ── Accessor ──────────────────────────────────────────────────────────────────
export function getDict(lang: LangCode): UIDict {
  return DICTS[lang] ?? DICTS.en;
}

// ── Translation function factory ──────────────────────────────────────────────
// Produces a typed t() function bound to a specific language.
// Supports {variable} interpolation: t('hero.inCity', { city: 'Mumbai' })
type NestedKeyOf<T, Prefix extends string = ''> =
  T extends string
    ? Prefix
    : T extends object
      ? { [K in keyof T]-?: NestedKeyOf<T[K], Prefix extends '' ? `${K & string}` : `${Prefix}.${K & string}`> }[keyof T]
      : never;

export type TranslationKey = NestedKeyOf<UIDict>;

function resolvePath(obj: UIDict, path: string): string {
  const result = path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof result === 'string' ? result : path;
}

export function makeT(lang: LangCode) {
  const dict = getDict(lang);
  return function t(key: TranslationKey, vars?: Record<string, string>): string {
    let str = resolvePath(dict, key);
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v);
      });
    }
    return str;
  };
}
