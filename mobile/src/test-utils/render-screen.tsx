import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createQueryWrapper } from './query-wrapper';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Renders a screen the way the app hosts it: safe-area context plus a fresh QueryClient. */
export async function renderScreen(ui: ReactElement) {
  const QueryWrapper = createQueryWrapper();
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryWrapper>{ui}</QueryWrapper>
    </SafeAreaProvider>,
  );
}
