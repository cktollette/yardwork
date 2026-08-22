import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import FirstMowSheet, {
  FIRST_MOW_SHEET_CONFIRM,
  FIRST_MOW_SHEET_LINES,
  FIRST_MOW_SHEET_TITLE,
} from './FirstMowSheet';

function render(visible: boolean, onDismiss = jest.fn()): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<FirstMowSheet visible={visible} onDismiss={onDismiss} />);
  });
  return tree;
}

it('pins the coaching copy: title, three steps, one button, ASCII only', () => {
  expect(FIRST_MOW_SHEET_TITLE).toBe('Your first mow');
  expect(FIRST_MOW_SHEET_LINES).toEqual([
    'Start the timer.',
    'Mow. Keep your phone or watch on you so we can count steps.',
    'Tap Finish, then Save.',
  ]);
  expect(FIRST_MOW_SHEET_CONFIRM).toBe('Got it');
  // No em dashes / non-ASCII in any user-facing string.
  for (const s of [FIRST_MOW_SHEET_TITLE, FIRST_MOW_SHEET_CONFIRM, ...FIRST_MOW_SHEET_LINES]) {
    expect(/[^\x00-\x7F]/.test(s)).toBe(false);
  }
});

it('renders the title, all three steps, and the button when visible', () => {
  const json = JSON.stringify(render(true).toJSON());
  expect(json).toContain(FIRST_MOW_SHEET_TITLE);
  for (const line of FIRST_MOW_SHEET_LINES) expect(json).toContain(line);
  expect(json).toContain(FIRST_MOW_SHEET_CONFIRM);
});

it('"Got it" dismisses', () => {
  const onDismiss = jest.fn();
  const tree = render(true, onDismiss);
  act(() => {
    tree.root.findByProps({ accessibilityRole: 'button' }).props.onPress();
  });
  expect(onDismiss).toHaveBeenCalled();
});
