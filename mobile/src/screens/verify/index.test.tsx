import { fireEvent, waitFor } from '@testing-library/react-native';

import { requestOtp, verifyOtp } from '@/api/auth';
import { ApiError } from '@/api/errors';
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
  jest.mocked(requestOtp).mockReset();
  jest.mocked(verifyOtp).mockReset();
  useSessionStore.setState({ hydrated: true, token: null, user: null });
  useUiStore.setState({ prompts: [] });
});

describe('VerifyScreen', () => {
  it('says where the code was sent', async () => {
    const view = await renderScreen(<VerifyScreen email="asha@example.com" onBack={() => {}} />);
    expect(view.getByText('asha@example.com')).toBeTruthy();
    expect(view.getByText('Enter OTP')).toBeTruthy();
  });

  it('will not submit an incomplete code', async () => {
    const view = await renderScreen(<VerifyScreen email="asha@example.com" onBack={() => {}} />);
    await fireEvent.changeText(codeInput(view), '123');
    await fireEvent.press(view.getByRole('button', { name: 'Verify' }));
    expect(view.getByRole('alert')).toHaveTextContent('Enter all 6 digits');
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it('verifies the code as a string and signs in, queuing the password offer for a new account', async () => {
    jest.mocked(verifyOtp).mockResolvedValue({ token: 'jwt', user: newUser });
    const view = await renderScreen(<VerifyScreen email="asha@example.com" onBack={() => {}} />);
    await fireEvent.changeText(codeInput(view), '012345');
    await fireEvent.press(view.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(useSessionStore.getState().token).toBe('jwt'));
    expect(verifyOtp).toHaveBeenCalledWith('asha@example.com', '012345');
    expect(selectNextPrompt(useUiStore.getState())).toBe('password');
  });

  it('shows the server message for a wrong code and keeps the user signed out', async () => {
    jest
      .mocked(verifyOtp)
      .mockRejectedValue(
        new ApiError({ kind: 'http', status: 400, code: 'OTP_INVALID', message: 'Invalid OTP' }),
      );
    const view = await renderScreen(<VerifyScreen email="asha@example.com" onBack={() => {}} />);
    await fireEvent.changeText(codeInput(view), '000000');
    await fireEvent.press(view.getByRole('button', { name: 'Verify' }));
    await waitFor(() => expect(view.getByRole('alert')).toHaveTextContent('Invalid OTP'));
    expect(useSessionStore.getState().token).toBeNull();
  });

  it('resends a code, clears the boxes and says so', async () => {
    jest.mocked(requestOtp).mockResolvedValue({ message: 'OTP sent' });
    const view = await renderScreen(<VerifyScreen email="asha@example.com" onBack={() => {}} />);
    await fireEvent.changeText(codeInput(view), '123');
    await fireEvent.press(view.getByRole('button', { name: 'Resend' }));
    await waitFor(() => expect(view.getByText('New code sent')).toBeTruthy());
    expect(requestOtp).toHaveBeenCalledWith('asha@example.com');
    expect(codeInput(view).props.value).toBe('');
  });

  it('goes back', async () => {
    const onBack = jest.fn();
    const view = await renderScreen(<VerifyScreen email="asha@example.com" onBack={onBack} />);
    await fireEvent.press(view.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });
});
