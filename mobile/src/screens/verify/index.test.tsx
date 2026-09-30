import { fireEvent, waitFor } from '@testing-library/react-native';

import { requestOtp, setPassword, verifyOtp } from '@/api/auth';
import { ApiError } from '@/api/errors';
import { updateProfile } from '@/api/profile';
import { useSessionStore } from '@/stores/session-store';
import { selectNextPrompt, useUiStore } from '@/stores/ui-store';
import { renderScreen } from '@/test-utils/render-screen';

import { VerifyScreen } from '.';

jest.mock('@/api/auth', () => ({
  requestOtp: jest.fn(),
  verifyOtp: jest.fn(),
  passwordLogin: jest.fn(),
  setPassword: jest.fn(),
}));
jest.mock('@/api/profile', () => ({ updateProfile: jest.fn() }));
jest.mock('@/utils/secure-storage', () => ({
  secureStorage: {
    get: async () => null,
    set: async () => undefined,
    remove: async () => undefined,
  },
}));

const newUser = {
  id: 'u1',
  email: 'asha@example.com',
  name: null,
  username: null,
  avatar: null,
  isPremium: false,
  hasPassword: false,
  joyActivities: [],
  joyOnboarded: false,
};

const codeInput = (view: Awaited<ReturnType<typeof renderScreen>>) =>
  view.getByLabelText('Verification code, 6 digits');

beforeEach(() => {
  for (const fn of [requestOtp, verifyOtp, setPassword, updateProfile]) jest.mocked(fn).mockReset();
  useSessionStore.setState({ hydrated: true, token: null, user: null, persistent: true });
  useUiStore.getState().reset();
});

describe('VerifyScreen', () => {
  it('says where the code went and what it is for', async () => {
    const view = await renderScreen(
      <VerifyScreen email="asha@example.com" flow="signup" onBack={() => {}} />,
    );
    expect(view.getByText('Check your email')).toBeTruthy();
    expect(view.getByText('Sent to asha@example.com')).toBeTruthy();
    expect(view.getByText(/finish creating your account/)).toBeTruthy();
  });

  it('explains the forgot-password flow differently', async () => {
    const view = await renderScreen(
      <VerifyScreen email="asha@example.com" flow="forgot" onBack={() => {}} />,
    );
    expect(view.getByText(/choose a new password/)).toBeTruthy();
  });

  it('asks for all six digits before calling the server', async () => {
    const view = await renderScreen(
      <VerifyScreen email="asha@example.com" flow="signup" onBack={() => {}} />,
    );
    await fireEvent.changeText(codeInput(view), '123');
    await fireEvent.press(view.getByRole('button', { name: 'Verify' }));
    expect(view.getByText('Enter all 6 digits')).toBeTruthy();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it('creates the account: confirms the code, saves the typed name and password, and signs in', async () => {
    useUiStore.getState().setSignupDraft({ name: 'Asha', password: 'Secret123!' });
    jest.mocked(verifyOtp).mockResolvedValue({ token: 'jwt', user: newUser });
    jest
      .mocked(updateProfile)
      .mockResolvedValue({ ...newUser, name: 'Asha', email: undefined, hasPassword: undefined });
    jest.mocked(setPassword).mockResolvedValue({ message: 'Password set', hasPassword: true });

    const view = await renderScreen(
      <VerifyScreen email="asha@example.com" flow="signup" onBack={() => {}} />,
    );
    await fireEvent.changeText(codeInput(view), '012345');
    await fireEvent.press(view.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(useSessionStore.getState().token).toBe('jwt'));
    expect(verifyOtp).toHaveBeenCalledWith('asha@example.com', '012345');
    expect(useSessionStore.getState().user).toMatchObject({ name: 'Asha', hasPassword: true });
  });

  it('shows the server message for a wrong code and stays on the screen', async () => {
    jest
      .mocked(verifyOtp)
      .mockRejectedValue(
        new ApiError({ kind: 'http', status: 400, code: 'INVALID_OTP', message: 'Invalid OTP' }),
      );
    const view = await renderScreen(
      <VerifyScreen email="asha@example.com" flow="signup" onBack={() => {}} />,
    );
    await fireEvent.changeText(codeInput(view), '000000');
    await fireEvent.press(view.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(view.getByRole('alert')).toHaveTextContent('Invalid OTP'));
    expect(useSessionStore.getState().token).toBeNull();
    expect(view.getByText('Check your email')).toBeTruthy();
  });

  it('after "Forgot password?" signs in and queues the password sheet', async () => {
    jest
      .mocked(verifyOtp)
      .mockResolvedValue({ token: 'jwt', user: { ...newUser, name: 'Asha', hasPassword: true } });
    const view = await renderScreen(
      <VerifyScreen email="asha@example.com" flow="forgot" onBack={() => {}} />,
    );
    await fireEvent.changeText(codeInput(view), '123456');
    await fireEvent.press(view.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(useSessionStore.getState().token).toBe('jwt'));
    expect(selectNextPrompt(useUiStore.getState())).toBe('password');
  });

  it('sends another code, clearing the old one', async () => {
    jest.mocked(requestOtp).mockResolvedValue({ message: 'OTP sent' });
    const view = await renderScreen(
      <VerifyScreen email="asha@example.com" flow="signup" onBack={() => {}} />,
    );
    await fireEvent.changeText(codeInput(view), '123');
    await fireEvent.press(view.getByRole('button', { name: 'Resend' }));

    await waitFor(() => expect(view.getByText('New code sent')).toBeTruthy());
    expect(requestOtp).toHaveBeenCalledWith('asha@example.com');
    expect(codeInput(view).props.value).toBe('');
  });

  it('goes back', async () => {
    const onBack = jest.fn();
    const view = await renderScreen(
      <VerifyScreen email="asha@example.com" flow="signup" onBack={onBack} />,
    );
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
