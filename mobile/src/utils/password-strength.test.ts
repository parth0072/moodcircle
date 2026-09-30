import { passwordStrength } from './password-strength';

describe('passwordStrength', () => {
  it('asks for the minimum length before anything is typed', () => {
    expect(passwordStrength('')).toEqual({ score: 0, label: 'Use at least 8 characters' });
  });

  it('gives a too-short password one bar however varied it is', () => {
    expect(passwordStrength('Aa1!')).toMatchObject({ score: 1 });
    expect(passwordStrength('Aa1!').label).toMatch(/Too short/);
  });

  it('adds a bar for each of mixed case, a digit and a symbol once long enough', () => {
    expect(passwordStrength('abcdefgh').score).toBe(1);
    expect(passwordStrength('abcdEFGH').score).toBe(2);
    expect(passwordStrength('abcdEF12').score).toBe(3);
    expect(passwordStrength('abcdEF1!').score).toBe(4);
  });

  it('names the next thing to add, matching the design copy at three bars', () => {
    expect(passwordStrength('abcdEF12').label).toBe('Good — add a symbol to make it strong');
    expect(passwordStrength('abcdefgh').label).toBe('Weak — mix upper and lower case');
    expect(passwordStrength('abcdEFGH').label).toBe('Okay — add a number');
    expect(passwordStrength('abcdEF1!').label).toBe('Strong');
  });

  it('treats a symbol or digit as variety even without mixed case', () => {
    expect(passwordStrength('abcdef1!').score).toBe(3);
  });
});
