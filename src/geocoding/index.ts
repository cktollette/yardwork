/**
 * Geocoding module barrel. Consumers import the interface, the `GeocodeResult`
 * type, and the wired singleton from here — never the Mapbox implementation
 * directly, keeping network specifics behind the boundary.
 */
export type { GeocodeResult, GeocodingService } from './GeocodingService';
export { geocodingService } from './MapboxGeocodingService';
