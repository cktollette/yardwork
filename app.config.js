// Dynamic Expo config. Everything static lives in app.json; this file exists
// only so the @rnmapbox/maps SECRET download token can be referenced from an
// env var (RNMAPBOX_MAPS_DOWNLOAD_TOKEN) at build time — never inlined here or
// committed. Expo passes app.json's `expo` object in as `config`.
module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    [
      '@rnmapbox/maps',
      {
        // Read at native build time (expo prebuild / run:ios). Undefined in
        // environments without the token; the build will fail loudly if unset.
        RNMapboxMapsDownloadToken: process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN,
      },
    ],
  ],
});
