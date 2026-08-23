import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { DraftMow } from './timer';

/**
 * The app is a root native-stack whose first screen hosts a bottom-tab
 * navigator (RootTabParamList). Push flows — the mow timer, the mow log, and
 * the full-screen lawn editor — live on the root stack ABOVE the tabs, so they
 * cover the tab bar while active.
 */
export type RootTabParamList = {
  Home: undefined;
  /** The Profile tab — occupies the former Stats slot. The full stats screen is
   *  reachable from Profile as the pushed `Statistics` route. */
  Profile: undefined;
  /**
   * The center action button. Never rendered as a screen — its custom
   * tabBarButton pushes the Timer flow instead of switching tabs — but the
   * navigator still needs a route entry for it.
   */
  MowAction: undefined;
  /** The mow log. Its stack root is MowListScreen; MowDetail pushes on the root stack. */
  Log: undefined;
  Lawn: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList> | undefined;
  Timer: undefined;
  /** The full stats screen — pushed from the Profile tab (was the Stats tab). */
  Statistics: undefined;
  SaveMow: { draft: DraftMow };
  /** Edit or delete a single logged mow, loaded by id. */
  MowDetail: { mowId: string };
  /**
   * Draw or edit a lawn zone for a Property. `create` starts empty and adds a
   * new zone; `edit` preloads the zone named by `zoneId` and writes back to it.
   * `zoneId` is required for `edit` and ignored for `create`.
   */
  LawnDraw: { propertyId: string; mode: 'create' | 'edit'; zoneId?: string };
  /** The equipment garage: a list of the user's equipment (reached from Lawn). */
  Garage: undefined;
  /** Add (no id) or edit (id supplied) a piece of equipment. */
  EquipmentForm: { equipmentId?: string } | undefined;
};

/** Props for a screen that lives directly on the root stack. */
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

/**
 * Props for a tab screen. Composite so a tab screen can also navigate to the
 * root stack's push routes (e.g. Stats → LawnDraw) with full type safety.
 */
export type RootTabScreenProps<T extends keyof RootTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<RootTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;
