/**
 * Static i18n dictionaries for the 5 languages actually live in production
 * (English + the 4 languages of the South Indian states we serve — see
 * VALID_LANGS in lib/prefs.ts, the single source of truth this type derives
 * from). Bundled at build time — zero async loading, zero FOUT risk, zero
 * flicker. Covers all UI chrome: nav, hero, city picker, search, listing
 * cards, categories, sort, bottom nav, fresh section, and city home page.
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
    inCity:     string;
    inYourCity: string;
    sub:        string;
  };
  city: {
    select:    string;
    search:    string;
    recent:    string;
    locate:    string;
    notFound:  string;
  };
  search: {
    placeholder: string;
  };
  listing: {
    priceOnRequest: string;
    featured:       string;
    sold:           string;
    activeOnWA:     string;
    chatOnWA:       string;
    viewAll:        string;
    viewAllListings:string;
    noListings:     string;
    beFirst:        string;
    postListing:    string;
  };
  categories: {
    all:        string;
    tiffin:     string;
    pgRooms:    string;
    jobs:       string;
    vehicles:   string;
    electronics:string;
    events:     string;
    businesses: string;
    education:  string;
  };
  sort: {
    newest:       string;
    priceAsc:     string;
    priceDesc:    string;
    featuredFirst:string;
  };
  city2: {
    discover:         string;
    activeListings:   string;
    featuredListings: string;
    latestListings:   string;
  };
  bottomNav: {
    home:       string;
    search:     string;
    post:       string;
    myListings: string;
    profile:    string;
    signUp:     string;
  };
  fresh: {
    title:       string;
    live:        string;
    sub:         string;
    viewAll:     string;
    viewAllNear: string;
    footnote:    string;
    badgeNew:    string;
    badgeVerified:string;
  };
}

// ── Dictionaries ──────────────────────────────────────────────────────────────
const DICTS: Record<LangCode, UIDict> = {
  en: {
    nav:    { cities: 'Cities', signIn: 'Sign in', post: 'Post Listing', postShort: 'Post' },
    hero:   { headline1: 'Buy. Sell. Connect.', inCity: 'In {city}.', inYourCity: 'In Your City.', sub: 'Post listings, find PGs, discover local services — in your language, in your neighbourhood.' },
    city:   { select: 'Select City', search: 'Search city...', recent: 'Recent', locate: 'Use my location', notFound: 'No cities match "{query}"' },
    search: { placeholder: 'Search tiffin, PG, tutor...' },
    listing:{ priceOnRequest: 'Price on request', featured: 'Featured', sold: 'Sold', activeOnWA: 'Active on WA', chatOnWA: 'Chat on WhatsApp', viewAll: 'View all →', viewAllListings: 'View all listings →', noListings: 'No listings yet', beFirst: 'Be the first to post in your city!', postListing: '+ Post a Listing' },
    categories: { all: 'All', tiffin: 'Tiffin', pgRooms: 'PG / Rooms', jobs: 'Jobs', vehicles: 'Vehicles', electronics: 'Electronics', events: 'Events', businesses: 'Businesses', education: 'Education' },
    sort:   { newest: 'Newest First', priceAsc: 'Price: Low to High', priceDesc: 'Price: High to Low', featuredFirst: 'Featured First' },
    city2:  { discover: 'Discover', activeListings: '{count} active listings · updated just now', featuredListings: 'Featured Listings', latestListings: 'Latest Listings' },
    bottomNav: { home: 'Home', search: 'Search', post: 'Post', myListings: 'My Listings', profile: 'Profile', signUp: 'Sign Up' },
    fresh:  { title: 'Fresh Listings Near You', live: 'Live · Updated just now', sub: 'Real people, real prices — contact sellers directly via WhatsApp.', viewAll: 'View all', viewAllNear: 'View all near you', footnote: 'All sellers contactable directly via WhatsApp · No middlemen · No commissions', badgeNew: 'New', badgeVerified: 'Verified' },
  },
  te: {
    nav:    { cities: 'నగరాలు', signIn: 'సైన్ ఇన్', post: 'లిస్టింగ్ పోస్ట్ చేయి', postShort: 'పోస్ట్' },
    hero:   { headline1: 'కొనండి. అమ్మండి. కలవండి.', inCity: '{city}లో.', inYourCity: 'మీ నగరంలో.', sub: 'లిస్టింగ్‌లు పోస్ట్ చేయండి, PGలు కనుగొనండి — మీ భాషలో.' },
    city:   { select: 'నగరం ఎంచుకోండి', search: 'నగరం వెతకండి...', recent: 'ఇటీవలి', locate: 'నా లొకేషన్', notFound: '"{query}" తో నగరాలు దొరకలేదు' },
    search: { placeholder: 'టిఫిన్, PG, ట్యూటర్ వెతకండి...' },
    listing:{ priceOnRequest: 'ధర అడగండి', featured: 'ఫీచర్డ్', sold: 'అమ్ముడైంది', activeOnWA: 'WA లో చురుకు', chatOnWA: 'WhatsApp లో చాట్ చేయి', viewAll: 'అన్నీ చూడు →', viewAllListings: 'అన్ని లిస్టింగ్‌లు చూడు →', noListings: 'ఇంకా లిస్టింగ్‌లు లేవు', beFirst: 'మీ నగరంలో మొదటిగా పోస్ట్ చేయండి!', postListing: '+ లిస్టింగ్ పోస్ట్ చేయి' },
    categories: { all: 'అన్నీ', tiffin: 'టిఫిన్', pgRooms: 'PG / గదులు', jobs: 'ఉద్యోగాలు', vehicles: 'వాహనాలు', electronics: 'ఎలక్ట్రానిక్స్', events: 'కార్యక్రమాలు', businesses: 'వ్యాపారాలు', education: 'విద్య' },
    sort:   { newest: 'కొత్తవి ముందు', priceAsc: 'ధర: తక్కువ నుండి ఎక్కువ', priceDesc: 'ధర: ఎక్కువ నుండి తక్కువ', featuredFirst: 'ఫీచర్డ్ ముందు' },
    city2:  { discover: 'అన్వేషించండి', activeListings: '{count} చురుకు లిస్టింగ్‌లు · ఇప్పుడే అప్‌డేట్', featuredListings: 'ఫీచర్డ్ లిస్టింగ్‌లు', latestListings: 'తాజా లిస్టింగ్‌లు' },
    bottomNav: { home: 'హోమ్', search: 'వెతకండి', post: 'పోస్ట్', myListings: 'నా లిస్టింగ్‌లు', profile: 'ప్రొఫైల్', signUp: 'సైన్ అప్' },
    fresh:  { title: 'మీ దగ్గర కొత్త లిస్టింగ్‌లు', live: 'లైవ్ · ఇప్పుడే అప్‌డేట్', sub: 'నిజమైన వ్యక్తులు, నిజమైన ధరలు — WhatsApp లో నేరుగా సంప్రదించండి.', viewAll: 'అన్నీ చూడు', viewAllNear: 'దగ్గర అన్నీ చూడు', footnote: 'అన్ని విక్రేతలు WhatsApp లో నేరుగా · మధ్యవర్తులు లేరు · కమిషన్ లేదు', badgeNew: 'కొత్తది', badgeVerified: 'ధృవీకరించబడింది' },
  },
  ta: {
    nav:    { cities: 'நகரங்கள்', signIn: 'உள்நுழைக', post: 'பட்டியல் இடுக', postShort: 'இடுக' },
    hero:   { headline1: 'வாங்கு. விற்கு. இணை.', inCity: '{city}இல்.', inYourCity: 'உங்கள் நகரில்.', sub: 'பட்டியல்களை இடுக, PG கண்டறி — உங்கள் மொழியில்.' },
    city:   { select: 'நகரம் தேர்வு', search: 'நகரம் தேடுக...', recent: 'சமீபத்திய', locate: 'என் இடம்', notFound: '"{query}" பொருந்தும் நகரங்கள் இல்லை' },
    search: { placeholder: 'டிஃபின், PG, டியூட்டர் தேடுக...' },
    listing:{ priceOnRequest: 'விலை கேட்கவும்', featured: 'சிறப்பு', sold: 'விற்றது', activeOnWA: 'WA இல் செயலில்', chatOnWA: 'WhatsApp இல் பேசுக', viewAll: 'அனைத்தும் காண →', viewAllListings: 'அனைத்து பட்டியல்கள் →', noListings: 'இன்னும் பட்டியல்கள் இல்லை', beFirst: 'உங்கள் நகரில் முதலில் பதிவிடுங்கள்!', postListing: '+ பட்டியல் இடுக' },
    categories: { all: 'அனைத்தும்', tiffin: 'டிஃபின்', pgRooms: 'PG / அறைகள்', jobs: 'வேலைகள்', vehicles: 'வாகனங்கள்', electronics: 'மின்னணுவியல்', events: 'நிகழ்வுகள்', businesses: 'தொழில்கள்', education: 'கல்வி' },
    sort:   { newest: 'புதியது முதலில்', priceAsc: 'விலை: குறைவிலிருந்து அதிகம்', priceDesc: 'விலை: அதிகத்திலிருந்து குறைவு', featuredFirst: 'சிறப்பு முதலில்' },
    city2:  { discover: 'கண்டுபிடி', activeListings: '{count} செயலில் பட்டியல்கள் · இப்போது புதுப்பிக்கப்பட்டது', featuredListings: 'சிறப்பு பட்டியல்கள்', latestListings: 'சமீபத்திய பட்டியல்கள்' },
    bottomNav: { home: 'முகப்பு', search: 'தேடு', post: 'இடுக', myListings: 'என் பட்டியல்கள்', profile: 'சுயவிவரம்', signUp: 'பதிவு' },
    fresh:  { title: 'உங்கள் அருகில் புதிய பட்டியல்கள்', live: 'நேரலை · இப்போது புதுப்பிக்கப்பட்டது', sub: 'உண்மையான மக்கள், உண்மையான விலைகள் — WhatsApp மூலம் நேரடியாக தொடர்பு கொள்ளுங்கள்.', viewAll: 'அனைத்தும் காண', viewAllNear: 'அருகில் அனைத்தும் காண', footnote: 'அனைத்து விற்பனையாளர்களும் WhatsApp மூலம் நேரடியாக · தரகர்கள் இல்லை · கமிஷன் இல்லை', badgeNew: 'புதியது', badgeVerified: 'சரிபார்க்கப்பட்டது' },
  },
  kn: {
    nav:    { cities: 'ನಗರಗಳು', signIn: 'ಸೈನ್ ಇನ್', post: 'ಲಿಸ್ಟಿಂಗ್ ಹಾಕಿ', postShort: 'ಹಾಕಿ' },
    hero:   { headline1: 'ಕೊಳ್ಳಿ. ಮಾರಿ. ಸಂಪರ್ಕಿಸಿ.', inCity: '{city}ದಲ್ಲಿ.', inYourCity: 'ನಿಮ್ಮ ನಗರದಲ್ಲಿ.', sub: 'ಲಿಸ್ಟಿಂಗ್ ಹಾಕಿ, PG ಹುಡುಕಿ — ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ.' },
    city:   { select: 'ನಗರ ಆಯ್ಕೆ', search: 'ನಗರ ಹುಡುಕಿ...', recent: 'ಇತ್ತೀಚಿನ', locate: 'ನನ್ನ ಸ್ಥಳ', notFound: '"{query}" ಗೆ ಯಾವ ನಗರ ದೊರೆಯಲಿಲ್ಲ' },
    search: { placeholder: 'ಟಿಫಿನ್, PG, ಟ್ಯೂಟರ್ ಹುಡುಕಿ...' },
    listing:{ priceOnRequest: 'ಬೆಲೆ ಕೇಳಿ', featured: 'ವಿಶೇಷ', sold: 'ಮಾರಾಟವಾಯಿತು', activeOnWA: 'WA ನಲ್ಲಿ ಸಕ್ರಿಯ', chatOnWA: 'WhatsApp ನಲ್ಲಿ ಮಾತನಾಡಿ', viewAll: 'ಎಲ್ಲ ನೋಡಿ →', viewAllListings: 'ಎಲ್ಲ ಲಿಸ್ಟಿಂಗ್ ನೋಡಿ →', noListings: 'ಇನ್ನು ಲಿಸ್ಟಿಂಗ್‌ಗಳಿಲ್ಲ', beFirst: 'ನಿಮ್ಮ ನಗರದಲ್ಲಿ ಮೊದಲು ಪೋಸ್ಟ್ ಮಾಡಿ!', postListing: '+ ಲಿಸ್ಟಿಂಗ್ ಹಾಕಿ' },
    categories: { all: 'ಎಲ್ಲ', tiffin: 'ಟಿಫಿನ್', pgRooms: 'PG / ಕೋಣೆ', jobs: 'ಉದ್ಯೋಗ', vehicles: 'ವಾಹನ', electronics: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್', events: 'ಕಾರ್ಯಕ್ರಮ', businesses: 'ವ್ಯವಹಾರ', education: 'ಶಿಕ್ಷಣ' },
    sort:   { newest: 'ಹೊಸತು ಮೊದಲು', priceAsc: 'ಬೆಲೆ: ಕಡಿಮೆಯಿಂದ ಹೆಚ್ಚು', priceDesc: 'ಬೆಲೆ: ಹೆಚ್ಚಿನಿಂದ ಕಡಿಮೆ', featuredFirst: 'ವಿಶೇಷ ಮೊದಲು' },
    city2:  { discover: 'ಅನ್ವೇಷಿಸಿ', activeListings: '{count} ಸಕ್ರಿಯ ಲಿಸ್ಟಿಂಗ್ · ಇದೀಗ ಅಪ್‌ಡೇಟ್', featuredListings: 'ವಿಶೇಷ ಲಿಸ್ಟಿಂಗ್‌ಗಳು', latestListings: 'ಇತ್ತೀಚಿನ ಲಿಸ್ಟಿಂಗ್‌ಗಳು' },
    bottomNav: { home: 'ಮನೆ', search: 'ಹುಡುಕಿ', post: 'ಹಾಕಿ', myListings: 'ನನ್ನ ಲಿಸ್ಟಿಂಗ್', profile: 'ಪ್ರೊಫೈಲ್', signUp: 'ಸೈನ್ ಅಪ್' },
    fresh:  { title: 'ನಿಮ್ಮ ಹತ್ತಿರ ತಾಜಾ ಲಿಸ್ಟಿಂಗ್‌ಗಳು', live: 'ನೇರ · ಇದೀಗ ಅಪ್‌ಡೇಟ್', sub: 'ನಿಜ ಜನ, ನಿಜ ಬೆಲೆ — WhatsApp ಮೂಲಕ ನೇರ ಸಂಪರ್ಕ.', viewAll: 'ಎಲ್ಲ ನೋಡಿ', viewAllNear: 'ಹತ್ತಿರ ಎಲ್ಲ ನೋಡಿ', footnote: 'ಎಲ್ಲ ಮಾರಾಟಗಾರರು WhatsApp ನಲ್ಲಿ ನೇರ · ದಲ್ಲಾಳಿ ಇಲ್ಲ · ಕಮಿಷನ್ ಇಲ್ಲ', badgeNew: 'ಹೊಸತು', badgeVerified: 'ಪರಿಶೀಲಿತ' },
  },
  ml: {
    nav:    { cities: 'നഗരങ്ങൾ', signIn: 'സൈൻ ഇൻ', post: 'ലിസ്റ്റിംഗ് ചേർക്കുക', postShort: 'ചേർക്കുക' },
    hero:   { headline1: 'വാങ്ങുക. വിൽക്കുക. ബന്ധിക്കുക.', inCity: '{city}ൽ.', inYourCity: 'നിങ്ങളുടെ നഗരത്തിൽ.', sub: 'ലിസ്റ്റിംഗ് ചേർക്കുക, PG കണ്ടെത്തുക — നിങ്ങളുടെ ഭാഷയിൽ.' },
    city:   { select: 'നഗരം തിരഞ്ഞെടുക്കുക', search: 'നഗരം തിരയുക...', recent: 'സമീപകാലം', locate: 'എന്റെ സ്ഥലം', notFound: '"{query}" ക്ക് നഗരങ്ങൾ ലഭിച്ചില്ല' },
    search: { placeholder: 'ടിഫിൻ, PG, ട്യൂട്ടർ തിരയുക...' },
    listing:{ priceOnRequest: 'വില ആരായുക', featured: 'ഫീച്ചർഡ്', sold: 'വിൽക്കപ്പെട്ടു', activeOnWA: 'WA-ൽ സജീവം', chatOnWA: 'WhatsApp-ൽ സംസാരിക്കുക', viewAll: 'എല്ലാം കാണുക →', viewAllListings: 'എല്ലാ ലിസ്റ്റിംഗും →', noListings: 'ഇനിയും ലിസ്റ്റിംഗുകൾ ഇല്ല', beFirst: 'നിങ്ങളുടെ നഗരത്തിൽ ആദ്യം പോസ്റ്റ് ചെയ്യൂ!', postListing: '+ ലിസ്റ്റിംഗ് ചേർക്കുക' },
    categories: { all: 'എല്ലാം', tiffin: 'ടിഫിൻ', pgRooms: 'PG / മുറികൾ', jobs: 'ജോലി', vehicles: 'വാഹനങ്ങൾ', electronics: 'ഇലക്ട്രോണിക്സ്', events: 'ഇവന്റുകൾ', businesses: 'ബിസിനസ്', education: 'വിദ്യാഭ്യാസം' },
    sort:   { newest: 'പുതിയത് ആദ്യം', priceAsc: 'വില: കുറഞ്ഞത് മുതൽ കൂടിയത്', priceDesc: 'വില: കൂടിയത് മുതൽ കുറഞ്ഞത്', featuredFirst: 'ഫീച്ചർഡ് ആദ്യം' },
    city2:  { discover: 'കണ്ടെത്തുക', activeListings: '{count} സജീവ ലിസ്റ്റിംഗ് · ഇപ്പോൾ അപ്‌ഡേറ്റ്', featuredListings: 'ഫീച്ചർഡ് ലിസ്റ്റിംഗുകൾ', latestListings: 'ഏറ്റവും പുതിയ ലിസ്റ്റിംഗുകൾ' },
    bottomNav: { home: 'ഹോം', search: 'തിരയുക', post: 'ചേർക്കുക', myListings: 'എന്റെ ലിസ്റ്റിംഗ്', profile: 'പ്രൊഫൈൽ', signUp: 'സൈൻ അപ്' },
    fresh:  { title: 'നിങ്ങൾക്ക് അടുത്ത് പുതിയ ലിസ്റ്റിംഗുകൾ', live: 'തത്സമയം · ഇപ്പോൾ അപ്‌ഡേറ്റ്', sub: 'യഥാർഥ ആളുകൾ, യഥാർഥ വിലകൾ — WhatsApp-ൽ നേരിട്ട് ബന്ധപ്പെടുക.', viewAll: 'എല്ലാം കാണുക', viewAllNear: 'അടുത്ത് എല്ലാം കാണുക', footnote: 'എല്ലാ വിൽപ്പനക്കാരും WhatsApp-ൽ നേരിട്ട് · ഇടനിലക്കാർ ഇല്ല · കമ്മീഷൻ ഇല്ല', badgeNew: 'പുതിയത്', badgeVerified: 'പരിശോധിച്ചത്' },
  },
};

// ── Accessor ──────────────────────────────────────────────────────────────────
export function getDict(lang: LangCode): UIDict {
  return DICTS[lang] ?? DICTS.en;
}

// ── Translation function factory ──────────────────────────────────────────────
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
