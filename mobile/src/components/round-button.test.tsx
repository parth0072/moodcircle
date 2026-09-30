import { fireEvent, render } from '@testing-library/react-native';

import { RoundButton } from './round-button';

describe('RoundButton', () => {
  it('is announced by its label, since the icon is decorative, and fires onPress', async () => {
    const onPress = jest.fn();
    const view = await render(<RoundButton icon="chevron-left" label="Back" onPress={onPress} />);
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders on a blue screen too', async () => {
    const view = await render(<RoundButton icon="pie" label="Mood insights" tone="glass" />);
    expect(view.getByRole('button', { name: 'Mood insights' })).toBeTruthy();
  });
});
