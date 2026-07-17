// Extends the static app.json so EAS Build can inject google-services.json
// (gitignored — live API key) via a file-type environment variable.
// Locally, process.env.GOOGLE_SERVICES_JSON is unset, so app.json's static
// path to the real file on disk is used unchanged.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || config.android.googleServicesFile,
  },
});
