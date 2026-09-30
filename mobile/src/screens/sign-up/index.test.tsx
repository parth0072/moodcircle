import { fireEvent, waitFor } from '@testing-library/react-native';

import { requestOtp } from '@/api/auth';
import { ApiError } from '@/api/errors';
import { useUiStore } from '@/stores/ui-store';
import { renderScreen } from '@/test-utils/render-screen';

import { SignUpScreen } from '.';

jest.mock('@/api/auth', () => ({ requestOtp: jest.fn() }));
jest.mock('@/api/profile', () => ({ updateProfile: jest.fn() }));

const setup = async () => {
  const handlers = { onBack: jest.fn(), onLogIn: jest.fn(), onCodeSent: jest.fn() };
  const view = await renderScreen(<SignUpScreen {...handlers} />);
  const type = (label: string, value: string) =>
    fireEvent.changeText(view.getByLabelText(label), value);
  const fillValid = async () => {
    await type('Your name', '  Asha  ');
    await type('Email', ' Asha@Example.com ');
    await type('Password', 'Secret123!');
    await fireEvent.press(view.getByRole('checkbox', { name: /I agree to the Terms/ }));
  };
  return { view, type, fillValid, ...handlers };
};

beforeEach(() => {
  jest.mocked(requestOtp).mockReset();
  useUiStore.getState().reset();
});

describe('SignUpScreen', () => {
  it('asks for every field before calling the server', async () => {
    const { view } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Create account' }));
    expect(view.getByText('Enter your name')).toBeTruthy();
    expect(view.getByText('Enter a valid email address')).toBeTruthy();
    expect(view.getByText('Password needs at least 8 characters')).toBeTruthy();
    expect(view.getByText('Agree to the Terms and Privacy Policy to continue')).toBeTruthy();
    expect(requestOtp).not.toHaveBeenCalled();
  });

  it('emails a code to the tidied address, keeps the form in memory only, and moves on', async () => {
    jest.mocked(requestOtp).mockResolvedValue({ message: 'OTP sent' });
    const { view, fillValid, onCodeSent } = await setup();
    await fillValid();
    await fireEvent.press(view.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onCodeSent).toHaveBeenCalledWith('asha@example.com'));
    expect(requestOtp).toHaveBeenCalledWith('asha@example.com');
    expect(useUiStore.getState().signupDraft).toEqual({ name: 'Asha', password: 'Secret123!' });
  });

  it('starts with the terms unchecked, so agreeing is a choice, and clears its error once checked', async () => {
    const { view } = await setup();
    const box = () => view.getByRole('checkbox', { name: /I agree to the Terms/ });
    expect(box().props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(view.getByRole('button', { name: 'Create account' }));
    expect(view.getByText(/Agree to the Terms/)).toBeTruthy();
    await fireEvent.press(box());
    expect(box().props.accessibilityState).toMatchObject({ checked: true });
    expect(view.queryByText(/Agree to the Terms/)).toBeNull();
  });

  it('guides the password with a meter that reads the typed text', async () => {
    const { view, type } = await setup();
    expect(view.getByText('Use at least 8 characters')).toBeTruthy();
    await type('Password', 'abcdEF12');
    expect(view.getByText('Good — add a symbol to make it strong')).toBeTruthy();
  });

  it('keeps everything typed and says why when the code cannot be sent', async () => {
    jest.mocked(requestOtp).mockRejectedValue(
      new ApiError({
        kind: 'network',
        code: 'NETWORK_ERROR',
        message: 'Could not reach the server. Check your connection and try again.',
      }),
    );
    const { view, fillValid, onCodeSent } = await setup();
    await fillValid();
    await fireEvent.press(view.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(view.getByRole('alert')).toHaveTextContent(/Could not reach the server/),
    );
    expect(onCodeSent).not.toHaveBeenCalled();
    expect(useUiStore.getState().signupDraft).toBeNull();
    expect(view.getByLabelText('Your name').props.value).toBe('  Asha  ');
  });

  it("drops a field's message as soon as that field is edited", async () => {
    const { view, type } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Create account' }));
    expect(view.getByText('Enter your name')).toBeTruthy();
    expect(view.getByText('Enter a valid email address')).toBeTruthy();

    await type('Your name', 'Asha');
    expect(view.queryByText('Enter your name')).toBeNull();
    expect(view.getByText('Enter a valid email address')).toBeTruthy();
  });

  it('has a way back and a way to log in instead', async () => {
    const { view, onBack, onLogIn } = await setup();
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    await fireEvent.press(view.getByRole('button', { name: 'Log in' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onLogIn).toHaveBeenCalledTimes(1);
  });
});
