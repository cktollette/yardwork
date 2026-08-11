/**
 * Activity module barrel. Consumers import the interface, the `Activity` type,
 * and the wired singleton from here — never the HealthKit implementation
 * directly, keeping the concrete HealthKit library behind the boundary. Mirrors
 * src/weather/index.ts.
 */
export type { Activity, ActivityService } from './ActivityService';
export { activityService } from './HealthKitActivityService';
