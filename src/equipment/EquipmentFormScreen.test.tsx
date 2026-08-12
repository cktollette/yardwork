import { Alert } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import EquipmentFormScreen from './EquipmentFormScreen';

// Mock the repository so nothing touches storage and we can assert on writes.
jest.mock('./asyncStorageRepositories', () => ({
  equipmentRepository: {
    list: jest.fn(),
    getById: jest.fn(),
    add: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { equipmentRepository } = require('./asyncStorageRepositories');

const navigation = { setOptions: jest.fn(), goBack: jest.fn(), navigate: jest.fn() };

function renderAddForm(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      // Add mode: no route params.
      <EquipmentFormScreen
        navigation={navigation as never}
        route={{ params: undefined } as never}
      />,
    );
  });
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('EquipmentFormScreen validation', () => {
  it('does not persist and shows an error when brand or power source is missing', async () => {
    const tree = renderAddForm();

    await act(async () => {
      // Press Save with an empty brand and no power source (model still optional).
      tree.root.findByProps({ label: 'Save equipment' }).props.onPress();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing details',
      expect.stringContaining('brand'),
    );
    expect(equipmentRepository.add).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('persists with the model omitted — model is optional at entry', async () => {
    const tree = renderAddForm();

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Brand' }).props.onChangeText('Honda');
      // Model deliberately left blank.
    });
    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Gas' }).props.onPress();
    });

    await act(async () => {
      tree.root.findByProps({ label: 'Save equipment' }).props.onPress();
    });

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(equipmentRepository.add).toHaveBeenCalledTimes(1);
    expect(equipmentRepository.add).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'mower', brand: 'Honda', powerSource: 'gas' }),
    );
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('persists when brand, model, and power source are all provided', async () => {
    const tree = renderAddForm();

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Brand' }).props.onChangeText('Toro');
      tree.root.findByProps({ accessibilityLabel: 'Model' }).props.onChangeText('Recycler 22');
    });
    act(() => {
      // Power source segment (SegmentedControl radio labeled "Gas").
      tree.root.findByProps({ accessibilityLabel: 'Gas' }).props.onPress();
    });

    await act(async () => {
      tree.root.findByProps({ label: 'Save equipment' }).props.onPress();
    });

    expect(equipmentRepository.add).toHaveBeenCalledTimes(1);
    expect(equipmentRepository.add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'mower',
        brand: 'Toro',
        model: 'Recycler 22',
        powerSource: 'gas',
      }),
    );
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
