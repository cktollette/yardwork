import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { Mow, Property } from '../mow/models';
import type { RootTabParamList } from '../mow/navigation';
import HomeScreen from './HomeScreen';

// Home reads mows + the default property through the repositories; mock them.
jest.mock('../mow/asyncStorageRepositories', () => ({
  mowRepository: { listMows: jest.fn() },
  propertyRepository: { getOrCreateDefault: jest.fn() },
}));
// The launch-time unfinished-mow recovery hook is covered by its own test; stub
// it here so Home's tests stay focused on the dashboard and touch no storage.
jest.mock('../mow/unfinishedMowRecovery', () => ({
  useUnfinishedMowRecovery: jest.fn(),
}));
import {
  mowRepository,
  propertyRepository,
} from '../mow/asyncStorageRepositories';

const listMows = mowRepository.listMows as jest.Mock;
const getProperty = propertyRepository.getOrCreateDefault as jest.Mock;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// HomeScreen is a tab screen (composite tab+stack props); mount it in a tab
// navigator typed like the real one so it typechecks. The MowDetail/Timer push
// targets aren't exercised here (no press), so they don't need registering.
const Tab = createBottomTabNavigator<RootTabParamList>();

async function renderHome(): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <NavigationContainer>
          <Tab.Navigator screenOptions={{ headerShown: false }}>
            <Tab.Screen name="Home" component={HomeScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>,
    );
  });
  return tree;
}

const PROPERTY: Property = {
  id: 'p1',
  name: 'My Lawn',
  createdAt: 0,
  zones: [{ id: 'z1', name: 'Lawn', vertices: [], areaSqFt: 5000 }],
};

function makeMow(overrides: Partial<Mow>): Mow {
  return {
    id: 'm1',
    propertyId: 'p1',
    startedAt: Date.now() - 3600_000,
    endedAt: Date.now(),
    durationSeconds: 2400, // 00:40:00
    ...overrides,
  };
}

afterEach(() => jest.clearAllMocks());

describe('HomeScreen', () => {
  it('shows the cold-start welcome when no mows exist', async () => {
    listMows.mockResolvedValue([]);
    getProperty.mockResolvedValue({ ...PROPERTY, zones: [] });

    const json = JSON.stringify((await renderHome()).toJSON());
    expect(json).toContain('Welcome to Klippa');
    expect(json).toContain('Log your first mow');
    // No dashboard cards in the empty state.
    expect(json).not.toContain('Season totals');
  });

  it('shows streak, last mow, and season totals when mows exist', async () => {
    listMows.mockResolvedValue([makeMow({})]); // newest-first, one mow
    getProperty.mockResolvedValue(PROPERTY);

    const json = JSON.stringify((await renderHome()).toJSON());
    expect(json).toContain('week streak'); // streak hero
    expect(json).toContain('Last mow'); // last-mow card
    expect(json).toContain('00:40:00'); // its duration
    expect(json).toContain('Season totals'); // totals card
    expect(json).toContain('mows');
    expect(json).toContain('hours');
  });
});
