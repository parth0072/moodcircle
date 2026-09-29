import { fireEvent, render } from '@testing-library/react-native';

import { TextField } from './text-field';

describe('TextField', () => {
  it('labels the input and forwards typing', async () => {
    const onChangeText = jest.fn();
    const view = await render(
      <TextField label="Email address" value="" onChangeText={onChangeText} />,
    );
    await fireEvent.changeText(view.getByLabelText('Email address'), 'a@b.co');
    expect(onChangeText).toHaveBeenCalledWith('a@b.co');
  });

  it('announces an error as an alert and shows the prefix', async () => {
    const view = await render(<TextField label="Username" prefix="@" error="Username is taken" />);
    expect(view.getByRole('alert')).toHaveTextContent('Username is taken');
    expect(view.getByText('@')).toBeTruthy();
  });

  it('shows no alert when there is no error', async () => {
    const view = await render(<TextField label="Username" />);
    expect(view.queryByRole('alert')).toBeNull();
  });
});
