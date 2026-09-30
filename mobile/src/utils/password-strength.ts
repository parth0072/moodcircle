export const MIN_PASSWORD_LENGTH = 8;

export interface PasswordStrength {
  /** How many of the four meter bars to fill: 0 (nothing typed) to 4. */
  score: 0 | 1 | 2 | 3 | 4;
  /** The line under the meter, naming the next thing that would make the password stronger. */
  label: string;
}

/**
 * The meter under the sign-up password field. A password shorter than the minimum never gets more
 * than one bar; past it, each of mixed case, a digit and a symbol adds one. It is guidance only:
 * the server's own rule (a minimum length) is what actually accepts or refuses a password.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return { score: 0, label: `Use at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { score: 1, label: `Too short — use at least ${MIN_PASSWORD_LENGTH} characters` };
  }

  const missing: string[] = [];
  if (!(/[a-z]/.test(password) && /[A-Z]/.test(password))) missing.push('mix upper and lower case');
  if (!/\d/.test(password)) missing.push('add a number');
  if (!/[^A-Za-z0-9]/.test(password)) missing.push('add a symbol');

  const score = (4 - missing.length) as 1 | 2 | 3 | 4;
  if (score === 4) return { score, label: 'Strong' };
  const next = missing[0];
  if (score === 1) return { score, label: `Weak — ${next}` };
  if (score === 2) return { score, label: `Okay — ${next}` };
  return { score, label: `Good — ${next} to make it strong` };
}
