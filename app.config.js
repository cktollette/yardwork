// Dynamic Expo config. Everything static lives in app.json; this file exists
// only for the @rnmapbox/maps plugin. The SECRET download token is read from
// the RNMAPBOX_MAPS_DOWNLOAD_TOKEN env var directly by the plugin at native
// build time — never inlined here or committed. Expo passes app.json's `expo`
// object in as `config`.
//
// SOURCE-OF-TRUTH GUARDRAIL: native identifiers — ios.bundleIdentifier and
// android.package — live in app.json and MUST NOT be set here. This file does a
// shallow `...config` spread, so any identifier set in the returned object would
// silently override app.json with no error or warning. Since the bundle
// identifier is permanent once registered with Apple, keep it defined in exactly
// one place: app.json.
module.exports = ({ config }) => ({
  ...config,
  // expo-location is added WITHOUT a config object on purpose: with no message
  // prop the plugin leaves NSLocationWhenInUseUsageDescription to whatever
  // ios.infoPlist in app.json already sets, keeping that key in exactly one
  // place (same single-source-of-truth guardrail as the native identifiers).
  plugins: [...(config.plugins ?? []), '@rnmapbox/maps', 'expo-location'],
});
