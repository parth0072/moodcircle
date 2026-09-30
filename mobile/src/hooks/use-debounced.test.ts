import { act, renderHook } from '@testing-library/react-native';

import { useDebounced } from './use-debounced';

describe('useDebounced', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('gives the new value only once it has stopped changing', async () => {
    const view = await renderHook((props: { value: string }) => useDebounced(props.value, 400), {
      initialProps: { value: 'a' },
    });
    await view.rerender({ value: 'ab' });
    await view.rerender({ value: 'abc' });
    expect(view.result.current).toBe('a');

    await act(async () => {
      jest.advanceTimersByTime(399);
    });
    expect(view.result.current).toBe('a');

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(view.result.current).toBe('abc');
  });
});
