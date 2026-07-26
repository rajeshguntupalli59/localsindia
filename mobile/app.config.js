// Extends the static app.json so EAS Build can inject google-services.json
// (gitignored — live API key) via a file-type environment variable.
// Locally, process.env.GOOGLE_SERVICES_JSON is unset, so app.json's static
// path to the real file on disk is used unchanged.
//
// Also injects the Google Maps Android API key (react-native-maps has no
// free default provider on Android, unlike iOS's Apple Maps) — set via EAS
// environment variables / .env, never hardcoded in the committed app.json.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || config.android.googleServicesFile,
  },
  plugins: [
    ...config.plugins,
    // react-native-maps' own config plugin ignores the legacy
    // android.config.googleMaps.apiKey field above (that's a dead/vestigial
    // path from Expo's old classic build service) — it only reads this
    // plugin option (props.androidGoogleMapsApiKey). Without it, the plugin's
    // else-branch actively strips the com.google.android.geo.API_KEY
    // meta-data tag from AndroidManifest.xml, which is what caused every
    // build to crash with "API key not found" regardless of the env var
    // being set correctly.
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }],
    // SDK 53+ dropped the legacy top-level `splash` key (still present in
    // app.json below for older tooling, but no longer honored) in favor of
    // this plugin — without it the app falls back to a default/unbranded
    // splash screen on cold start instead of the real logo.
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#F7921E',
      },
    ],
  ],
});
