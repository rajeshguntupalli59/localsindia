/**
 * Static i18n dictionaries for all 11 languages.
 * Bundled at build time — zero async loading, zero FOUT risk, zero flicker.
 * Covers all UI chrome: nav, hero, city picker, search, listing cards,
 * categories, sort, bottom nav, fresh section, and city home page.
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
  hi: {
    nav:    { cities: 'शहर', signIn: 'साइन इन', post: 'लिस्टिंग पोस्ट करें', postShort: 'पोस्ट' },
    hero:   { headline1: 'खरीदें. बेचें. जुड़ें.', inCity: '{city} में.', inYourCity: 'आपके शहर में.', sub: 'लिस्टिंग पोस्ट करें, PG खोजें, स्थानीय सेवाएं खोजें — आपकी भाषा में।' },
    city:   { select: 'शहर चुनें', search: 'शहर खोजें...', recent: 'हाल के', locate: 'मेरी लोकेशन', notFound: '"{query}" से कोई शहर नहीं मिला' },
    search: { placeholder: 'टिफिन, PG, ट्यूटर खोजें...' },
    listing:{ priceOnRequest: 'कीमत पर जानकारी लें', featured: 'फीचर्ड', sold: 'बिका', activeOnWA: 'WA पर सक्रिय', chatOnWA: 'WhatsApp पर चैट करें', viewAll: 'सभी देखें →', viewAllListings: 'सभी लिस्टिंग देखें →', noListings: 'अभी कोई लिस्टिंग नहीं', beFirst: 'अपने शहर में पहली लिस्टिंग पोस्ट करें!', postListing: '+ लिस्टिंग पोस्ट करें' },
    categories: { all: 'सभी', tiffin: 'टिफिन', pgRooms: 'PG / कमरे', jobs: 'नौकरी', vehicles: 'वाहन', electronics: 'इलेक्ट्रॉनिक्स', events: 'इवेंट', businesses: 'व्यवसाय', education: 'शिक्षा' },
    sort:   { newest: 'नवीनतम पहले', priceAsc: 'कीमत: कम से अधिक', priceDesc: 'कीमत: अधिक से कम', featuredFirst: 'फीचर्ड पहले' },
    city2:  { discover: 'खोजें', activeListings: '{count} सक्रिय लिस्टिंग · अभी अपडेट', featuredListings: 'फीचर्ड लिस्टिंग', latestListings: 'नवीनतम लिस्टिंग' },
    bottomNav: { home: 'होम', search: 'खोजें', post: 'पोस्ट', myListings: 'मेरी लिस्टिंग', profile: 'प्रोफ़ाइल', signUp: 'साइन अप' },
    fresh:  { title: 'आपके पास ताज़ी लिस्टिंग', live: 'लाइव · अभी अपडेट', sub: 'असली लोग, असली कीमतें — WhatsApp पर सीधे संपर्क करें।', viewAll: 'सभी देखें', viewAllNear: 'आस-पास सभी देखें', footnote: 'सभी विक्रेता WhatsApp पर सीधे · कोई बिचौलिया नहीं · कोई कमीशन नहीं', badgeNew: 'नया', badgeVerified: 'सत्यापित' },
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
  mr: {
    nav:    { cities: 'शहरे', signIn: 'साइन इन', post: 'लिस्टिंग टाका', postShort: 'टाका' },
    hero:   { headline1: 'खरेदी करा. विका. जोडा.', inCity: '{city}मध्ये.', inYourCity: 'तुमच्या शहरात.', sub: 'लिस्टिंग टाका, PG शोधा — तुमच्या भाषेत.' },
    city:   { select: 'शहर निवडा', search: 'शहर शोधा...', recent: 'अलीकडील', locate: 'माझे स्थान', notFound: '"{query}" साठी कोणतेही शहर आढळले नाही' },
    search: { placeholder: 'टिफिन, PG, शिक्षक शोधा...' },
    listing:{ priceOnRequest: 'किंमत विचारा', featured: 'वैशिष्ट्यीकृत', sold: 'विकले', activeOnWA: 'WA वर सक्रिय', chatOnWA: 'WhatsApp वर चॅट करा', viewAll: 'सर्व पाहा →', viewAllListings: 'सर्व लिस्टिंग पाहा →', noListings: 'अजून लिस्टिंग नाही', beFirst: 'तुमच्या शहरात पहिले पोस्ट करा!', postListing: '+ लिस्टिंग टाका' },
    categories: { all: 'सर्व', tiffin: 'टिफिन', pgRooms: 'PG / खोल्या', jobs: 'नोकऱ्या', vehicles: 'वाहने', electronics: 'इलेक्ट्रॉनिक्स', events: 'कार्यक्रम', businesses: 'व्यवसाय', education: 'शिक्षण' },
    sort:   { newest: 'नवीनतम प्रथम', priceAsc: 'किंमत: कमी ते जास्त', priceDesc: 'किंमत: जास्त ते कमी', featuredFirst: 'वैशिष्ट्यीकृत प्रथम' },
    city2:  { discover: 'शोधा', activeListings: '{count} सक्रिय लिस्टिंग · आत्ता अपडेट', featuredListings: 'वैशिष्ट्यीकृत लिस्टिंग', latestListings: 'नवीनतम लिस्टिंग' },
    bottomNav: { home: 'होम', search: 'शोधा', post: 'टाका', myListings: 'माझ्या लिस्टिंग', profile: 'प्रोफाइल', signUp: 'साइन अप' },
    fresh:  { title: 'तुमच्या जवळ नवीन लिस्टिंग', live: 'थेट · आत्ता अपडेट', sub: 'खरे लोक, खऱ्या किंमती — WhatsApp वर थेट संपर्क करा.', viewAll: 'सर्व पाहा', viewAllNear: 'जवळ सर्व पाहा', footnote: 'सर्व विक्रेते WhatsApp वर थेट · दलाल नाही · कमिशन नाही', badgeNew: 'नवीन', badgeVerified: 'सत्यापित' },
  },
  bn: {
    nav:    { cities: 'শহর', signIn: 'সাইন ইন', post: 'লিস্টিং দিন', postShort: 'দিন' },
    hero:   { headline1: 'কিনুন. বেচুন. সংযুক্ত হন.', inCity: '{city}তে.', inYourCity: 'আপনার শহরে.', sub: 'লিস্টিং দিন, PG খুঁজুন — আপনার ভাষায়।' },
    city:   { select: 'শহর বেছে নিন', search: 'শহর খুঁজুন...', recent: 'সাম্প্রতিক', locate: 'আমার অবস্থান', notFound: '"{query}" এর জন্য কোনো শহর পাওয়া যায়নি' },
    search: { placeholder: 'টিফিন, PG, টিউটর খুঁজুন...' },
    listing:{ priceOnRequest: 'মূল্য জিজ্ঞাসা করুন', featured: 'ফিচার্ড', sold: 'বিক্রি হয়েছে', activeOnWA: 'WA তে সক্রিয়', chatOnWA: 'WhatsApp এ কথা বলুন', viewAll: 'সব দেখুন →', viewAllListings: 'সব লিস্টিং দেখুন →', noListings: 'এখনও কোনো লিস্টিং নেই', beFirst: 'আপনার শহরে প্রথম পোস্ট করুন!', postListing: '+ লিস্টিং দিন' },
    categories: { all: 'সব', tiffin: 'টিফিন', pgRooms: 'PG / ঘর', jobs: 'চাকরি', vehicles: 'যানবাহন', electronics: 'ইলেকট্রনিক্স', events: 'ইভেন্ট', businesses: 'ব্যবসা', education: 'শিক্ষা' },
    sort:   { newest: 'নতুন প্রথমে', priceAsc: 'দাম: কম থেকে বেশি', priceDesc: 'দাম: বেশি থেকে কম', featuredFirst: 'ফিচার্ড প্রথমে' },
    city2:  { discover: 'আবিষ্কার করুন', activeListings: '{count}টি সক্রিয় লিস্টিং · এইমাত্র আপডেট', featuredListings: 'ফিচার্ড লিস্টিং', latestListings: 'সর্বশেষ লিস্টিং' },
    bottomNav: { home: 'হোম', search: 'খুঁজুন', post: 'দিন', myListings: 'আমার লিস্টিং', profile: 'প্রোফাইল', signUp: 'সাইন আপ' },
    fresh:  { title: 'আপনার কাছে নতুন লিস্টিং', live: 'লাইভ · এইমাত্র আপডেট', sub: 'আসল মানুষ, আসল দাম — WhatsApp এ সরাসরি যোগাযোগ করুন।', viewAll: 'সব দেখুন', viewAllNear: 'কাছে সব দেখুন', footnote: 'সব বিক্রেতা WhatsApp এ সরাসরি · দালাল নেই · কমিশন নেই', badgeNew: 'নতুন', badgeVerified: 'যাচাইকৃত' },
  },
  gu: {
    nav:    { cities: 'શહેરો', signIn: 'સાઇન ઇન', post: 'લિસ્ટિંગ મૂકો', postShort: 'મૂકો' },
    hero:   { headline1: 'ખરીદો. વેચો. જોડાઓ.', inCity: '{city}માં.', inYourCity: 'તમારા શહેરમાં.', sub: 'લિસ્ટિંગ મૂકો, PG શોધો — તમારી ભાષામાં.' },
    city:   { select: 'શહેર પસંદ કરો', search: 'શહેર શોધો...', recent: 'તાજેતરના', locate: 'મારું સ્થાન', notFound: '"{query}" માટે કોઈ શહેર મળ્યું નહીં' },
    search: { placeholder: 'ટિફિન, PG, ટ્યુટર શોધો...' },
    listing:{ priceOnRequest: 'ભાવ પૂછો', featured: 'ફીચર્ડ', sold: 'વેચાઈ ગયું', activeOnWA: 'WA પર સક્રિય', chatOnWA: 'WhatsApp પર વાત કરો', viewAll: 'બધું જુઓ →', viewAllListings: 'બધી લિસ્ટિંગ જુઓ →', noListings: 'હજુ કોઈ લિસ્ટિંગ નથી', beFirst: 'તમારા શહેરમાં પ્રથમ પોસ્ટ કરો!', postListing: '+ લિસ્ટિંગ મૂકો' },
    categories: { all: 'બધું', tiffin: 'ટિફિન', pgRooms: 'PG / ઓરડા', jobs: 'નોકરી', vehicles: 'વાહન', electronics: 'ઇલેક્ટ્રોનિક્સ', events: 'ઇવેન્ટ', businesses: 'ધંધો', education: 'શિક્ષણ' },
    sort:   { newest: 'નવું પ્રથમ', priceAsc: 'ભાવ: ઓછા થી વધુ', priceDesc: 'ભાવ: વધુ થી ઓછા', featuredFirst: 'ફીચર્ડ પ્રથમ' },
    city2:  { discover: 'શોધો', activeListings: '{count} સક્રિય લિસ્ટિંગ · હમણાં અપડેટ', featuredListings: 'ફીચર્ડ લિસ્ટિંગ', latestListings: 'નવીનતમ લિસ્ટિંગ' },
    bottomNav: { home: 'હોમ', search: 'શોધો', post: 'મૂકો', myListings: 'મારી લિસ્ટિંગ', profile: 'પ્રોફાઇલ', signUp: 'સાઇન અપ' },
    fresh:  { title: 'તમારી નજીક નવી લિસ્ટિંગ', live: 'લાઇવ · હમણાં અપડેટ', sub: 'સાચા લોકો, સાચી કિંમત — WhatsApp પર સીધો સંપર્ક.', viewAll: 'બધું જુઓ', viewAllNear: 'નજીક બધું જુઓ', footnote: 'બધા વિક્રેતા WhatsApp પર સીધા · દલાલ નહીં · કમિશન નહીં', badgeNew: 'નવું', badgeVerified: 'ચકાસાયેલ' },
  },
  pa: {
    nav:    { cities: 'ਸ਼ਹਿਰ', signIn: 'ਸਾਈਨ ਇਨ', post: 'ਲਿਸਟਿੰਗ ਪਾਓ', postShort: 'ਪਾਓ' },
    hero:   { headline1: 'ਖਰੀਦੋ. ਵੇਚੋ. ਜੁੜੋ.', inCity: '{city} ਵਿੱਚ.', inYourCity: 'ਤੁਹਾਡੇ ਸ਼ਹਿਰ ਵਿੱਚ.', sub: 'ਲਿਸਟਿੰਗ ਪਾਓ, PG ਲੱਭੋ — ਤੁਹਾਡੀ ਭਾਸ਼ਾ ਵਿੱਚ।' },
    city:   { select: 'ਸ਼ਹਿਰ ਚੁਣੋ', search: 'ਸ਼ਹਿਰ ਖੋਜੋ...', recent: 'ਹਾਲੀਆ', locate: 'ਮੇਰੀ ਲੋਕੇਸ਼ਨ', notFound: '"{query}" ਲਈ ਕੋਈ ਸ਼ਹਿਰ ਨਹੀਂ ਮਿਲਿਆ' },
    search: { placeholder: 'ਟਿਫਿਨ, PG, ਟਿਊਟਰ ਖੋਜੋ...' },
    listing:{ priceOnRequest: 'ਕੀਮਤ ਪੁੱਛੋ', featured: 'ਫੀਚਰਡ', sold: 'ਵਿਕ ਗਿਆ', activeOnWA: "WA 'ਤੇ ਸਰਗਰਮ", chatOnWA: "WhatsApp 'ਤੇ ਗੱਲ ਕਰੋ", viewAll: 'ਸਭ ਦੇਖੋ →', viewAllListings: 'ਸਾਰੀਆਂ ਲਿਸਟਿੰਗ ਦੇਖੋ →', noListings: 'ਅਜੇ ਕੋਈ ਲਿਸਟਿੰਗ ਨਹੀਂ', beFirst: 'ਆਪਣੇ ਸ਼ਹਿਰ ਵਿੱਚ ਪਹਿਲੀ ਪੋਸਟ ਕਰੋ!', postListing: '+ ਲਿਸਟਿੰਗ ਪਾਓ' },
    categories: { all: 'ਸਭ', tiffin: 'ਟਿਫਿਨ', pgRooms: 'PG / ਕਮਰੇ', jobs: 'ਨੌਕਰੀਆਂ', vehicles: 'ਵਾਹਨ', electronics: 'ਇਲੈਕਟ੍ਰੋਨਿਕਸ', events: 'ਸਮਾਗਮ', businesses: 'ਕਾਰੋਬਾਰ', education: 'ਸਿੱਖਿਆ' },
    sort:   { newest: 'ਨਵੇਂ ਪਹਿਲਾਂ', priceAsc: 'ਕੀਮਤ: ਘੱਟ ਤੋਂ ਵੱਧ', priceDesc: 'ਕੀਮਤ: ਵੱਧ ਤੋਂ ਘੱਟ', featuredFirst: 'ਫੀਚਰਡ ਪਹਿਲਾਂ' },
    city2:  { discover: 'ਖੋਜੋ', activeListings: '{count} ਸਰਗਰਮ ਲਿਸਟਿੰਗ · ਹੁਣੇ ਅਪਡੇਟ', featuredListings: 'ਫੀਚਰਡ ਲਿਸਟਿੰਗ', latestListings: 'ਤਾਜ਼ਾ ਲਿਸਟਿੰਗ' },
    bottomNav: { home: 'ਹੋਮ', search: 'ਖੋਜੋ', post: 'ਪਾਓ', myListings: 'ਮੇਰੀਆਂ ਲਿਸਟਿੰਗ', profile: 'ਪ੍ਰੋਫਾਈਲ', signUp: 'ਸਾਈਨ ਅੱਪ' },
    fresh:  { title: 'ਤੁਹਾਡੇ ਨੇੜੇ ਨਵੀਆਂ ਲਿਸਟਿੰਗ', live: "ਲਾਈਵ · ਹੁਣੇ ਅਪਡੇਟ", sub: "ਅਸਲ ਲੋਕ, ਅਸਲ ਕੀਮਤਾਂ — WhatsApp 'ਤੇ ਸਿੱਧਾ ਸੰਪਰਕ।", viewAll: 'ਸਭ ਦੇਖੋ', viewAllNear: 'ਨੇੜੇ ਸਭ ਦੇਖੋ', footnote: "ਸਾਰੇ ਵਿਕ੍ਰੇਤਾ WhatsApp 'ਤੇ ਸਿੱਧੇ · ਦਲਾਲ ਨਹੀਂ · ਕਮਿਸ਼ਨ ਨਹੀਂ", badgeNew: 'ਨਵੀਂ', badgeVerified: 'ਪੁਸ਼ਟੀਕ੍ਰਿਤ' },
  },
  or: {
    nav:    { cities: 'ସହର', signIn: 'ସାଇନ ଇନ', post: 'ଲିଷ୍ଟିଂ ଦିଅ', postShort: 'ଦିଅ' },
    hero:   { headline1: 'କିଣ. ବେଚ. ସଂଯୁକ୍ତ ହ.', inCity: '{city}ରେ.', inYourCity: 'ତୁମ ସହରରେ.', sub: 'ଲିଷ୍ଟିଂ ଦିଅ, PG ଖୋଜ — ତୁମ ଭାଷାରେ।' },
    city:   { select: 'ସହର ବାଛ', search: 'ସହର ଖୋଜ...', recent: 'ସାମ୍ପ୍ରତିକ', locate: 'ମୋ ସ୍ଥାନ', notFound: '"{query}" ପାଇଁ କୌଣସି ସହର ମିଳିଲା ନାହିଁ' },
    search: { placeholder: 'ଟିଫିନ, PG, ଟ୍ୟୁଟର ଖୋଜ...' },
    listing:{ priceOnRequest: 'ଦାମ ପଚାର', featured: 'ଫିଚର୍ଡ', sold: 'ବିକ୍ରି ହୋଇଛି', activeOnWA: 'WA ରେ ସକ୍ରିୟ', chatOnWA: 'WhatsApp ରେ କଥା ହ', viewAll: 'ସବୁ ଦେଖ →', viewAllListings: 'ସବୁ ଲିଷ୍ଟିଂ ଦେଖ →', noListings: 'ଏପର୍ଯ୍ୟନ୍ତ ଲିଷ୍ଟିଂ ନାହିଁ', beFirst: 'ତୁମ ସହରରେ ପ୍ରଥମ ପୋଷ୍ଟ କର!', postListing: '+ ଲିଷ୍ଟିଂ ଦିଅ' },
    categories: { all: 'ସବୁ', tiffin: 'ଟିଫିନ', pgRooms: 'PG / ଘର', jobs: 'ଚାକିରି', vehicles: 'ଯାନ', electronics: 'ଇଲେକ୍ଟ୍ରୋନିକ୍ସ', events: 'ଅନୁଷ୍ଠାନ', businesses: 'ବ୍ୟବସାୟ', education: 'ଶିକ୍ଷା' },
    sort:   { newest: 'ନୂଆ ପ୍ରଥମ', priceAsc: 'ଦାମ: କମ ଠୁ ଅଧିକ', priceDesc: 'ଦାମ: ଅଧିକ ଠୁ କମ', featuredFirst: 'ଫିଚର୍ଡ ପ୍ରଥମ' },
    city2:  { discover: 'ଅନ୍ୱେଷଣ', activeListings: '{count} ସକ୍ରିୟ ଲିଷ୍ଟିଂ · ଏଇମାତ୍ର ଅପଡ଼େଟ', featuredListings: 'ଫିଚର୍ଡ ଲିଷ୍ଟିଂ', latestListings: 'ସର୍ବଶେଷ ଲିଷ୍ଟିଂ' },
    bottomNav: { home: 'ହୋମ', search: 'ଖୋଜ', post: 'ଦିଅ', myListings: 'ମୋ ଲିଷ୍ଟିଂ', profile: 'ପ୍ରୋଫାଇଲ', signUp: 'ସାଇନ ଅପ' },
    fresh:  { title: 'ତୁମ ନିକଟରେ ତାଜା ଲିଷ୍ଟିଂ', live: 'ଲାଇଭ · ଏଇମାତ୍ର ଅପଡ଼େଟ', sub: 'ଆସଲ ଲୋକ, ଆସଲ ଦାମ — WhatsApp ରେ ସିଧା ଯୋଗାଯୋଗ।', viewAll: 'ସବୁ ଦେଖ', viewAllNear: 'ନିକଟରେ ସବୁ ଦେଖ', footnote: 'ସବୁ ବିକ୍ରେତା WhatsApp ରେ ସିଧା · ଦଲାଲ ନାହିଁ · କମିଶନ ନାହିଁ', badgeNew: 'ନୂଆ', badgeVerified: 'ଯାଞ୍ଚ ହୋଇଛି' },
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
