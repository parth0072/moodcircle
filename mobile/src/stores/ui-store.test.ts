import { selectNextPrompt, useUiStore } from './ui-store';

beforeEach(() => useUiStore.getState().reset());

describe('ui store', () => {
  it('queues the password prompt once, and dismissing it empties the queue', () => {
    useUiStore.getState().enqueuePrompt('password');
    useUiStore.getState().enqueuePrompt('password');
    expect(useUiStore.getState().prompts).toEqual(['password']);
    expect(selectNextPrompt(useUiStore.getState())).toBe('password');
    useUiStore.getState().dismissPrompt('password');
    expect(selectNextPrompt(useUiStore.getState())).toBeNull();
  });

  it('holds the sign-up form in memory until it is used or cleared', () => {
    useUiStore.getState().setSignupDraft({ name: 'Asha', password: 'Secret123!' });
    expect(useUiStore.getState().signupDraft).toEqual({ name: 'Asha', password: 'Secret123!' });
    useUiStore.getState().clearSignupDraft();
    expect(useUiStore.getState().signupDraft).toBeNull();
  });

  it('keeps a notice until it is cleared', () => {
    useUiStore.getState().setNotice('You already had an account');
    expect(useUiStore.getState().notice).toBe('You already had an account');
    useUiStore.getState().clearNotice();
    expect(useUiStore.getState().notice).toBeNull();
  });

  it('resets everything, as on sign-out: nothing of one user carries over to the next', () => {
    useUiStore.getState().enqueuePrompt('password');
    useUiStore.getState().setSignupDraft({ name: 'Asha', password: 'Secret123!' });
    useUiStore.getState().setNotice('hello');
    useUiStore.getState().reset();
    expect(useUiStore.getState()).toMatchObject({ prompts: [], signupDraft: null, notice: null });
  });
});
