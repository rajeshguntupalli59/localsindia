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
    config: {
      ...config.android.config,
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
    },
  },
  plugins: [
    ...config.plugins,
    'react-native-maps',
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
