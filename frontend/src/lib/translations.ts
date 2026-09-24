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
  home: {
    eyebrow: string;
    whyTitle: string;
    whySub: string;
    why1t: string;
    why1b: string;
    why2t: string;
    why2b: string;
    why3t: string;
    why3b: string;
    why4t: string;
    why4b: string;
    dayTitle: string;
    dayTitleDefault: string;
    daySub: string;
    morning: string;
    morningTag: string;
    midday: string;
    middayTag: string;
    evening: string;
    eveningTag: string;
    anytime: string;
    anytimeTag: string;
    closingBadge: string;
    closingTitle: string;
    closingSub: string;
    postFree: string;
    browse: string;
    browseDefault: string;
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
    home: {
      eyebrow: "Why LocalsIndia",
      whyTitle: "One app, not five",
      whySub: "Every other option means a different app for jobs, a different one for rooms, a different one for the market. LocalsIndia is the one your neighbourhood actually uses.",
      why1t: "Everything in one place",
      why1b: "Tiffin, jobs, rooms, vehicles, events, businesses — stop juggling five different apps.",
      why2t: "Talk directly, no middlemen",
      why2b: "Every listing connects straight to WhatsApp. No commission — listings go live after a quick spam check.",
      why3t: "Built for your neighbourhood",
      why3b: "Search by area, not just city — live across {count}+ cities in South India.",
      why4t: "In your language",
      why4b: "Browse and post in Telugu, Tamil, Kannada or Malayalam — not just English.",
      dayTitle: "A day in {city}",
      dayTitleDefault: "A day in your city",
      daySub: "Whatever you need, whenever you need it",
      morning: "Morning",
      morningTag: "Start the day sorted",
      midday: "Midday",
      middayTag: "Get things done",
      evening: "Evening",
      eveningTag: "See what's on",
      anytime: "Anytime",
      anytimeTag: "The bigger stuff",
      closingBadge: "Every listing talks straight to WhatsApp — zero commission",
      closingTitle: "Your neighbourhood is already here",
      closingSub: "{count}+ cities, {langs} languages, one free listing away.",
      postFree: "Post for free",
      browse: "Browse {city}",
      browseDefault: "Browse your city",
    },
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
    home: {
      eyebrow: "LocalsIndia ఎందుకు",
      whyTitle: "ఐదు యాప్‌లు కాదు, ఒక్కటే",
      whySub: "ఉద్యోగాలకు ఒక యాప్, గదులకు ఇంకో యాప్, కొనుగోళ్లకు మరో యాప్ — ఇక అవసరం లేదు. మీ ఏరియా వాళ్లు నిజంగా వాడేది LocalsIndia.",
      why1t: "అన్నీ ఒకే చోట",
      why1b: "టిఫిన్, ఉద్యోగాలు, గదులు, వాహనాలు, ఈవెంట్లు, వ్యాపారాలు — ఐదు వేర్వేరు యాప్‌లు అవసరం లేదు.",
      why2t: "మధ్యవర్తులు లేకుండా నేరుగా మాట్లాడండి",
      why2b: "ప్రతి లిస్టింగ్ నేరుగా WhatsAppకి కలుపుతుంది. కమీషన్ లేదు — చిన్న స్పామ్ తనిఖీ తర్వాత లిస్టింగ్ లైవ్ అవుతుంది.",
      why3t: "మీ ఏరియా కోసం తయారైంది",
      why3b: "నగరం మాత్రమే కాదు, ఏరియా వారీగా వెతకండి — దక్షిణ భారతదేశంలో {count}+ నగరాల్లో అందుబాటులో ఉంది.",
      why4t: "మీ భాషలో",
      why4b: "తెలుగు, తమిళం, కన్నడ, మలయాళంలో చూడండి, పోస్ట్ చేయండి — ఇంగ్లీష్ మాత్రమే కాదు.",
      dayTitle: "{city}లో ఒక రోజు",
      dayTitleDefault: "మీ నగరంలో ఒక రోజు",
      daySub: "మీకు ఏది కావాలన్నా, ఎప్పుడు కావాలన్నా",
      morning: "ఉదయం",
      morningTag: "రోజును సాఫీగా మొదలుపెట్టండి",
      midday: "మధ్యాహ్నం",
      middayTag: "పనులు పూర్తి చేసుకోండి",
      evening: "సాయంత్రం",
      eveningTag: "ఏం జరుగుతోందో చూడండి",
      anytime: "ఎప్పుడైనా",
      anytimeTag: "పెద్ద కొనుగోళ్లు",
      closingBadge: "ప్రతి లిస్టింగ్ నేరుగా WhatsAppలో — కమీషన్ సున్నా",
      closingTitle: "మీ ఏరియా ఇప్పటికే ఇక్కడ ఉంది",
      closingSub: "{count}+ నగరాలు, {langs} భాషలు, ఒక్క ఉచిత లిస్టింగ్ దూరంలో.",
      postFree: "ఉచితంగా పోస్ట్ చేయండి",
      browse: "{city} చూడండి",
      browseDefault: "మీ నగరం చూడండి",
    },
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
    home: {
      eyebrow: "ஏன் LocalsIndia",
      whyTitle: "ஐந்து ஆப்கள் அல்ல, ஒன்றே",
      whySub: "வேலைக்கு ஒரு ஆப், அறைக்கு இன்னொரு ஆப், சந்தைக்கு வேறொரு ஆப் — இனி தேவையில்லை. உங்கள் பகுதி மக்கள் உண்மையில் பயன்படுத்துவது LocalsIndia.",
      why1t: "எல்லாம் ஒரே இடத்தில்",
      why1b: "டிஃபின், வேலைகள், அறைகள், வாகனங்கள், நிகழ்வுகள், வணிகங்கள் — ஐந்து வெவ்வேறு ஆப்கள் தேவையில்லை.",
      why2t: "இடைத்தரகர் இல்லாமல் நேரடியாகப் பேசுங்கள்",
      why2b: "ஒவ்வொரு பட்டியலும் நேரடியாக WhatsApp-உடன் இணைகிறது. கமிஷன் இல்லை — சிறிய ஸ்பேம் சோதனைக்குப் பிறகு பட்டியல் நேரலையில் வரும்.",
      why3t: "உங்கள் பகுதிக்காக உருவாக்கப்பட்டது",
      why3b: "நகரம் மட்டுமல்ல, பகுதி வாரியாகத் தேடுங்கள் — தென்னிந்தியாவில் {count}+ நகரங்களில் கிடைக்கிறது.",
      why4t: "உங்கள் மொழியில்",
      why4b: "தமிழ், தெலுங்கு, கன்னடம், மலையாளத்தில் பார்க்கவும் இடவும் — ஆங்கிலம் மட்டுமல்ல.",
      dayTitle: "{city}இல் ஒரு நாள்",
      dayTitleDefault: "உங்கள் நகரில் ஒரு நாள்",
      daySub: "உங்களுக்கு எது வேண்டுமானாலும், எப்போது வேண்டுமானாலும்",
      morning: "காலை",
      morningTag: "நாளைச் சீராகத் தொடங்குங்கள்",
      midday: "மதியம்",
      middayTag: "வேலைகளை முடியுங்கள்",
      evening: "மாலை",
      eveningTag: "என்ன நடக்கிறது என்று பாருங்கள்",
      anytime: "எப்போதும்",
      anytimeTag: "பெரிய வாங்குதல்கள்",
      closingBadge: "ஒவ்வொரு பட்டியலும் நேரடியாக WhatsApp-இல் — பூஜ்ஜிய கமிஷன்",
      closingTitle: "உங்கள் பகுதி ஏற்கனவே இங்கே உள்ளது",
      closingSub: "{count}+ நகரங்கள், {langs} மொழிகள், ஒரு இலவச பட்டியல் தூரத்தில்.",
      postFree: "இலவசமாக இடுங்கள்",
      browse: "{city} பாருங்கள்",
      browseDefault: "உங்கள் நகரைப் பாருங்கள்",
    },
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
    home: {
      eyebrow: "LocalsIndia ಏಕೆ",
      whyTitle: "ಐದು ಆ್ಯಪ್ ಅಲ್ಲ, ಒಂದೇ",
      whySub: "ಉದ್ಯೋಗಕ್ಕೆ ಒಂದು ಆ್ಯಪ್, ಕೋಣೆಗೆ ಇನ್ನೊಂದು, ಮಾರುಕಟ್ಟೆಗೆ ಮತ್ತೊಂದು — ಇನ್ನು ಬೇಕಿಲ್ಲ. ನಿಮ್ಮ ಏರಿಯಾದ ಜನರು ನಿಜವಾಗಿ ಬಳಸುವುದು LocalsIndia.",
      why1t: "ಎಲ್ಲವೂ ಒಂದೇ ಕಡೆ",
      why1b: "ಟಿಫಿನ್, ಉದ್ಯೋಗ, ಕೋಣೆ, ವಾಹನ, ಕಾರ್ಯಕ್ರಮ, ವ್ಯಾಪಾರ — ಐದು ಬೇರೆ ಆ್ಯಪ್‌ಗಳ ಅಗತ್ಯವಿಲ್ಲ.",
      why2t: "ಮಧ್ಯವರ್ತಿಗಳಿಲ್ಲದೆ ನೇರವಾಗಿ ಮಾತನಾಡಿ",
      why2b: "ಪ್ರತಿ ಲಿಸ್ಟಿಂಗ್ ನೇರವಾಗಿ WhatsAppಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ. ಕಮಿಷನ್ ಇಲ್ಲ — ಸಣ್ಣ ಸ್ಪ್ಯಾಮ್ ಪರಿಶೀಲನೆಯ ನಂತರ ಲಿಸ್ಟಿಂಗ್ ಲೈವ್ ಆಗುತ್ತದೆ.",
      why3t: "ನಿಮ್ಮ ಏರಿಯಾಗಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ",
      why3b: "ನಗರ ಮಾತ್ರವಲ್ಲ, ಏರಿಯಾ ಪ್ರಕಾರ ಹುಡುಕಿ — ದಕ್ಷಿಣ ಭಾರತದ {count}+ ನಗರಗಳಲ್ಲಿ ಲಭ್ಯವಿದೆ.",
      why4t: "ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ",
      why4b: "ಕನ್ನಡ, ತೆಲುಗು, ತಮಿಳು, ಮಲಯಾಳಂನಲ್ಲಿ ನೋಡಿ ಮತ್ತು ಹಾಕಿ — ಇಂಗ್ಲಿಷ್ ಮಾತ್ರವಲ್ಲ.",
      dayTitle: "{city}ದಲ್ಲಿ ಒಂದು ದಿನ",
      dayTitleDefault: "ನಿಮ್ಮ ನಗರದಲ್ಲಿ ಒಂದು ದಿನ",
      daySub: "ನಿಮಗೆ ಏನು ಬೇಕಾದರೂ, ಯಾವಾಗ ಬೇಕಾದರೂ",
      morning: "ಬೆಳಿಗ್ಗೆ",
      morningTag: "ದಿನವನ್ನು ಸುಗಮವಾಗಿ ಆರಂಭಿಸಿ",
      midday: "ಮಧ್ಯಾಹ್ನ",
      middayTag: "ಕೆಲಸಗಳನ್ನು ಮುಗಿಸಿ",
      evening: "ಸಂಜೆ",
      eveningTag: "ಏನು ನಡೆಯುತ್ತಿದೆ ನೋಡಿ",
      anytime: "ಯಾವಾಗ ಬೇಕಾದರೂ",
      anytimeTag: "ದೊಡ್ಡ ಖರೀದಿಗಳು",
      closingBadge: "ಪ್ರತಿ ಲಿಸ್ಟಿಂಗ್ ನೇರವಾಗಿ WhatsAppನಲ್ಲಿ — ಶೂನ್ಯ ಕಮಿಷನ್",
      closingTitle: "ನಿಮ್ಮ ಏರಿಯಾ ಈಗಾಗಲೇ ಇಲ್ಲಿದೆ",
      closingSub: "{count}+ ನಗರಗಳು, {langs} ಭಾಷೆಗಳು, ಒಂದು ಉಚಿತ ಲಿಸ್ಟಿಂಗ್ ದೂರದಲ್ಲಿ.",
      postFree: "ಉಚಿತವಾಗಿ ಹಾಕಿ",
      browse: "{city} ನೋಡಿ",
      browseDefault: "ನಿಮ್ಮ ನಗರ ನೋಡಿ",
    },
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
    home: {
      eyebrow: "എന്തുകൊണ്ട് LocalsIndia",
      whyTitle: "അഞ്ച് ആപ്പുകളല്ല, ഒന്ന് മാത്രം",
      whySub: "ജോലിക്ക് ഒരു ആപ്പ്, മുറിക്ക് മറ്റൊന്ന്, മാർക്കറ്റിന് വേറൊന്ന് — ഇനി വേണ്ട. നിങ്ങളുടെ പ്രദേശത്തുള്ളവർ ശരിക്കും ഉപയോഗിക്കുന്നത് LocalsIndia ആണ്.",
      why1t: "എല്ലാം ഒരിടത്ത്",
      why1b: "ടിഫിൻ, ജോലി, മുറികൾ, വാഹനങ്ങൾ, പരിപാടികൾ, ബിസിനസുകൾ — അഞ്ച് വ്യത്യസ്ത ആപ്പുകൾ വേണ്ട.",
      why2t: "ഇടനിലക്കാരില്ലാതെ നേരിട്ട് സംസാരിക്കുക",
      why2b: "ഓരോ ലിസ്റ്റിംഗും നേരിട്ട് WhatsApp-ലേക്ക് ബന്ധിപ്പിക്കുന്നു. കമ്മീഷനില്ല — ചെറിയ സ്പാം പരിശോധനയ്ക്ക് ശേഷം ലിസ്റ്റിംഗ് ലൈവ് ആകും.",
      why3t: "നിങ്ങളുടെ പ്രദേശത്തിനായി നിർമ്മിച്ചത്",
      why3b: "നഗരം മാത്രമല്ല, പ്രദേശം അനുസരിച്ച് തിരയുക — ദക്ഷിണേന്ത്യയിലെ {count}+ നഗരങ്ങളിൽ ലഭ്യം.",
      why4t: "നിങ്ങളുടെ ഭാഷയിൽ",
      why4b: "മലയാളം, തമിഴ്, തെലുങ്ക്, കന്നഡ എന്നിവയിൽ കാണുക, പോസ്റ്റ് ചെയ്യുക — ഇംഗ്ലീഷ് മാത്രമല്ല.",
      dayTitle: "{city}ൽ ഒരു ദിവസം",
      dayTitleDefault: "നിങ്ങളുടെ നഗരത്തിൽ ഒരു ദിവസം",
      daySub: "എന്ത് വേണമെങ്കിലും, എപ്പോൾ വേണമെങ്കിലും",
      morning: "രാവിലെ",
      morningTag: "ദിവസം സുഗമമായി തുടങ്ങൂ",
      midday: "ഉച്ചയ്ക്ക്",
      middayTag: "കാര്യങ്ങൾ ചെയ്തുതീർക്കൂ",
      evening: "വൈകുന്നേരം",
      eveningTag: "എന്താണ് നടക്കുന്നതെന്ന് കാണൂ",
      anytime: "എപ്പോഴും",
      anytimeTag: "വലിയ വാങ്ങലുകൾ",
      closingBadge: "ഓരോ ലിസ്റ്റിംഗും നേരിട്ട് WhatsApp-ൽ — പൂജ്യം കമ്മീഷൻ",
      closingTitle: "നിങ്ങളുടെ പ്രദേശം ഇതിനകം ഇവിടെയുണ്ട്",
      closingSub: "{count}+ നഗരങ്ങൾ, {langs} ഭാഷകൾ, ഒരു സൗജന്യ ലിസ്റ്റിംഗ് അകലെ.",
      postFree: "സൗജന്യമായി പോസ്റ്റ് ചെയ്യുക",
      browse: "{city} കാണുക",
      browseDefault: "നിങ്ങളുടെ നഗരം കാണുക",
    },
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
