const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Strip NSHealthUpdateUsageDescription from the iOS Info.plist.
 *
 * react-native-health's config plugin unconditionally emits a default
 * NSHealthUpdateUsageDescription, but this app requests read-only HealthKit
 * scopes (steps + walking/running distance) and never writes.
 *
 * ORDERING: register this plugin BEFORE "react-native-health" in app.json.
 * @expo/config-plugins runs user infoPlist mods LIFO — each mod's action runs,
 * then delegates to the previously-registered mod (see withMod.js: the action
 * runs, then `return nextMod(results)`). So the EARLIEST-registered infoPlist
 * mod gets the final word. Registering this first means it runs last and its
 * deletion wins, leaving only NSHealthShareUsageDescription. (Registering it
 * after react-native-health makes it run first, before the key is even set — a
 * no-op — which is why the intuitive "later wins" order does not work here.)
 */
const withHealthKitReadOnly = (config) =>
  withInfoPlist(config, (config) => {
    delete config.modResults.NSHealthUpdateUsageDescription;
    return config;
  });

module.exports = withHealthKitReadOnly;
