import { selectNextPrompt, useUiStore } from './ui-store';

beforeEach(() => useUiStore.setState({ prompts: [] }));

describe('ui store prompts', () => {
  it('queues each prompt once', () => {
    useUiStore.getState().enqueuePrompt('password');
    useUiStore.getState().enqueuePrompt('password');
    expect(useUiStore.getState().prompts).toEqual(['password']);
  });

  it('shows joy before the password prompt whatever order they were queued in', () => {
    useUiStore.getState().enqueuePrompt('password'); // queued at code verification
    useUiStore.getState().enqueuePrompt('joy'); // queued after first profile setup
    expect(selectNextPrompt(useUiStore.getState())).toBe('joy');
    useUiStore.getState().dismissPrompt('joy');
    expect(selectNextPrompt(useUiStore.getState())).toBe('password');
    useUiStore.getState().dismissPrompt('password');
    expect(selectNextPrompt(useUiStore.getState())).toBeNull();
  });

  it('clears everything, as on sign-out', () => {
    useUiStore.getState().enqueuePrompt('joy');
    useUiStore.getState().enqueuePrompt('password');
    useUiStore.getState().clearPrompts();
    expect(selectNextPrompt(useUiStore.getState())).toBeNull();
  });
});
