import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useAsyncResource } from './useAsyncResource';

// Faithful useFocusEffect: run the callback on mount and whenever its identity
// changes (our hook re-memoizes it on reload), honoring the returned cleanup —
// i.e. React.useEffect(() => cb(), [cb]). This mirrors real focus behavior and
// avoids the run-every-render loop a naive `(cb) => cb()` mock would create.
jest.mock('@react-navigation/native', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  return {
    useFocusEffect: (cb: () => void | (() => void)) =>
      React.useEffect(() => cb(), [cb]),
  };
});

let reloadFn: () => void;
function Harness({ loader }: { loader: () => Promise<unknown> }) {
  const r = useAsyncResource(loader);
  reloadFn = r.reload;
  return <Text>{`${r.status}|${r.data === null ? 'null' : String(r.data)}`}</Text>;
}

function text(tree: ReactTestRenderer): string {
  return JSON.stringify(tree.toJSON());
}

async function renderHook(loader: () => Promise<unknown>): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<Harness loader={loader} />);
  });
  return tree;
}

beforeEach(() => jest.clearAllMocks());

it('resolves to success with the data', async () => {
  const tree = await renderHook(() => Promise.resolve([1, 2, 3]));
  expect(text(tree)).toContain('success|1,2,3');
});

it('renders the error state (not an eternal blank) when the first read rejects', async () => {
  const tree = await renderHook(() => Promise.reject(new Error('boom')));
  expect(text(tree)).toContain('error|null');
});

it('recovers to success when reload() is called after an error', async () => {
  const loader = jest
    .fn()
    .mockRejectedValueOnce(new Error('boom'))
    .mockResolvedValue([9]);
  const tree = await renderHook(loader);
  expect(text(tree)).toContain('error|null');

  await act(async () => {
    reloadFn();
  });
  expect(text(tree)).toContain('success|9');
});

it('keeps stale data (and dev-logs) when a background refetch fails', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const loader = jest
    .fn()
    .mockResolvedValueOnce(['ok'])
    .mockRejectedValue(new Error('later boom'));
  const tree = await renderHook(loader);
  expect(text(tree)).toContain('success|ok');

  await act(async () => {
    reloadFn();
  });
  // Data-wins: still showing the last good data, not the error state.
  expect(text(tree)).toContain('success|ok');
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('[state] refetch failed'));
  warn.mockRestore();
});

it('does not update state after unmount (cancellation)', async () => {
  const err = jest.spyOn(console, 'error').mockImplementation(() => {});
  let resolve!: (v: number[]) => void;
  const tree = await renderHook(() => new Promise<number[]>((r) => (resolve = r)));
  await act(async () => {
    tree.unmount();
    resolve([1]); // late resolve after unmount must be a no-op
  });
  // React would log an update-after-unmount error if we set state here.
  expect(err).not.toHaveBeenCalled();
  err.mockRestore();
});
