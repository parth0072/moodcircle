import { fireEvent, render } from '@testing-library/react-native';

import { Button } from './button';

describe('Button', () => {
  it('calls onPress', async () => {
    const onPress = jest.fn();
    const view = await render(<Button title="Continue" onPress={onPress} />);
    await fireEvent.press(view.getByRole('button', { name: 'Continue' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('blocks taps while loading but keeps its label for screen readers', async () => {
    const onPress = jest.fn();
    const view = await render(<Button title="Verify" loading onPress={onPress} />);
    const button = view.getByRole('button', { name: 'Verify' });
    expect(button.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('blocks taps when disabled', async () => {
    const onPress = jest.fn();
    const view = await render(<Button title="Save" disabled onPress={onPress} />);
    await fireEvent.press(view.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
