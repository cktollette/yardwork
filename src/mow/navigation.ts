import type { DraftMow } from './timer';

/**
 * Route map for the app's native-stack navigator.
 *
 * The completed mow rides to the Save Mow screen as a route param; everything
 * the screen needs to persist is in `draft` plus the note the user types.
 */
export type RootStackParamList = {
  Timer: undefined;
  SaveMow: { draft: DraftMow };
  MowList: undefined;
  Stats: undefined;
  /**
   * Draw or edit the lawn polygon for a Property. `create` starts empty;
   * `edit` preloads the property's existing boundary. One polygon per property.
   */
  LawnDraw: { propertyId: string; mode: 'create' | 'edit' };
};
