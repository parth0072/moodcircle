import { fireEvent } from '@testing-library/react-native';

import { renderScreen } from '@/test-utils/render-screen';

import { WelcomeScreen } from '.';

describe('WelcomeScreen', () => {
  it('offers to create an account or log in, and nothing the server cannot do', async () => {
    const onCreateAccount = jest.fn();
    const onLogIn = jest.fn();
    const view = await renderScreen(
      <WelcomeScreen onCreateAccount={onCreateAccount} onLogIn={onLogIn} />,
    );
    expect(view.getByText('A kinder place for your feelings')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Create an account' }));
    await fireEvent.press(view.getByRole('button', { name: 'Log in' }));
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
    expect(onLogIn).toHaveBeenCalledTimes(1);

    // The design also shows Apple and Google buttons; the server has neither, so they are not drawn.
    expect(view.queryByText(/Apple|Google/)).toBeNull();
  });
});
