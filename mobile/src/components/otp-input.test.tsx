import { fireEvent, render } from '@testing-library/react-native';

import { OtpInput } from './otp-input';

describe('OtpInput', () => {
  it('shows each typed digit in its own box', async () => {
    const view = await render(<OtpInput value="123" onChange={() => {}} />);
    for (const digit of ['1', '2', '3']) {
      expect(view.getByText(digit, { includeHiddenElements: true })).toBeTruthy();
    }
  });

  it('reports only digits, capped at the length, including a pasted code with junk', async () => {
    const onChange = jest.fn();
    const view = await render(<OtpInput value="" onChange={onChange} />);
    const input = view.getByTestId('otp-input');

    await fireEvent.changeText(input, '12a3 45-6789');
    expect(onChange).toHaveBeenLastCalledWith('123456');

    await fireEvent.changeText(input, 'abc');
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('is one labelled field for screen readers, with the boxes hidden', async () => {
    const view = await render(<OtpInput value="" onChange={() => {}} />);
    expect(view.getByLabelText('Verification code, 6 digits')).toBeTruthy();
  });

  it('asks the OS for one-time-code autofill', async () => {
    const view = await render(<OtpInput value="" onChange={() => {}} />);
    expect(view.getByTestId('otp-input').props).toMatchObject({
      textContentType: 'oneTimeCode',
      keyboardType: 'number-pad',
      maxLength: 6,
    });
  });
});
