import { fireEvent } from '@testing-library/react-native';

import { renderScreen } from '@/test-utils/render-screen';

import { OnboardingScreen } from '.';

describe('OnboardingScreen', () => {
  it('shows the promise and starts on "Get started"', async () => {
    const onStart = jest.fn();
    const view = await renderScreen(<OnboardingScreen onStart={onStart} />);
    expect(view.getByText('Moodbloom')).toBeTruthy();
    expect(view.getByText('Notice how you feel, one day at a time')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Get started' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('names the emotions in its illustrations', async () => {
    const view = await renderScreen(<OnboardingScreen onStart={() => {}} />);
    for (const label of ['Meh', 'Worry', 'Anger', 'Joy']) {
      expect(view.getByText(label)).toBeTruthy();
    }
  });
});
