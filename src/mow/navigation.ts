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
  Stats: undefined;
  /**
   * The center action button. Never rendered as a screen — its custom
   * tabBarButton pushes the Timer flow instead of switching tabs — but the
   * navigator still needs a route entry for it.
   */
  MowAction: undefined;
  Lawn: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList> | undefined;
  Timer: undefined;
  SaveMow: { draft: DraftMow };
  MowList: undefined;
  /** Edit or delete a single logged mow, loaded by id. */
  MowDetail: { mowId: string };
  /**
   * Draw or edit the lawn polygon for a Property. `create` starts empty;
   * `edit` preloads the property's existing boundary. One polygon per property.
   */
  LawnDraw: { propertyId: string; mode: 'create' | 'edit' };
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
