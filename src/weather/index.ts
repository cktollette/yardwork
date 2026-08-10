/**
 * Weather module barrel. Consumers import the interface, the `Weather` type, and
 * the wired singleton from here — never the OpenWeather implementation directly,
 * keeping network specifics behind the boundary.
 */
export type { Weather, WeatherService } from './WeatherService';
export { weatherService } from './OpenWeatherService';
