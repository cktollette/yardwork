import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import HomeScreen from '../home/HomeScreen';
import LawnHomeScreen from '../lawn/LawnHomeScreen';
import type { RootStackParamList, RootTabParamList } from '../mow/navigation';
import StatsScreen from '../stats/StatsScreen';
import { colors, radii, typography } from '../theme';

const Tab = createBottomTabNavigator<RootTabParamList>();

/** Placeholder component for the center action route — never actually shown. */
function NullScreen() {
  return null;
}

/** Small themed dot standing in for a tab icon (no icon library installed). */
function TabDot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

/**
 * The elevated circular center button (The Grint / Strava pattern). It is an
 * action, not a tab: pressing it pushes the Timer flow on the root stack rather
 * than switching tabs, so it never carries active state.
 */
function MowCenterButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.centerWrap} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Start a mow"
        style={({ pressed }) => [styles.centerButton, pressed && styles.centerPressed]}
      >
        <Text style={styles.centerLabel}>MOW</Text>
      </Pressable>
    </View>
  );
}

export default function RootTabs() {
  // RootTabs is the root stack's first screen, so this resolves to the native
  // stack navigation — used to push the Timer flow from the center button.
  const rootNavigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.primaryMuted,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: styles.header,
        headerTintColor: colors.ink,
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Klippa',
          tabBarIcon: ({ color }) => <TabDot color={color} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <TabDot color={color} />,
        }}
      />
      <Tab.Screen
        name="MowAction"
        component={NullScreen}
        options={{
          tabBarButton: () => (
            <MowCenterButton onPress={() => rootNavigation.navigate('Timer')} />
          ),
        }}
      />
      <Tab.Screen
        name="Lawn"
        component={LawnHomeScreen}
        options={{
          title: 'My Lawn',
          tabBarIcon: ({ color }) => <TabDot color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const CENTER_SIZE = 64;

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.ink,
    borderTopColor: colors.ink,
  },
  tabLabel: {
    fontSize: typography.caption,
  },
  header: {
    backgroundColor: colors.cream,
  },
  headerTitle: {
    color: colors.ink,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.sm,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButton: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Lift the button above the bar (elevated center-action pattern).
    transform: [{ translateY: -12 }],
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  centerPressed: {
    backgroundColor: colors.primaryMuted,
  },
  centerLabel: {
    color: colors.textOnColor,
    fontSize: typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
