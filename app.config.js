// Dynamic Expo config. Everything static lives in app.json; this file exists
// only for the @rnmapbox/maps plugin. The SECRET download token is read from
// the RNMAPBOX_MAPS_DOWNLOAD_TOKEN env var directly by the plugin at native
// build time — never inlined here or committed. Expo passes app.json's `expo`
// object in as `config`.
module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), '@rnmapbox/maps'],
});
