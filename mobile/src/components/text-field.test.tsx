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

  it('announces an error as an alert', async () => {
    const view = await render(<TextField label="Email" error="Enter a valid email address" />);
    expect(view.getByRole('alert')).toHaveTextContent('Enter a valid email address');
  });

  it('shows no alert when there is no error', async () => {
    const view = await render(<TextField label="Email" />);
    expect(view.queryByRole('alert')).toBeNull();
  });

  it('hides a password until Show is pressed, and hides it again with Hide', async () => {
    const view = await render(<TextField label="Password" secure value="hunter2hunter2" />);
    expect(view.getByLabelText('Password').props.secureTextEntry).toBe(true);

    await fireEvent.press(view.getByRole('button', { name: 'Show password' }));
    expect(view.getByLabelText('Password').props.secureTextEntry).toBe(false);
    expect(view.getByText('Hide')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Hide password' }));
    expect(view.getByLabelText('Password').props.secureTextEntry).toBe(true);
  });

  it('has no Show button on an ordinary field', async () => {
    const view = await render(<TextField label="Email" />);
    expect(view.queryByRole('button')).toBeNull();
  });
});
