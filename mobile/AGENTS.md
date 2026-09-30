# MoodCircle mobile: notes for coding agents

Read `.claude/skills/moodcircle-mobile/SKILL.md` (repository root) before any work in this
folder, and follow its workflow, architecture and verification steps.

- Branch names are `feature/...`, `bugfix/...` or `hotfix/...` with a meaningful description, never a `claude/`
  prefix: see `CLAUDE.md` at the repository root.
- Routes only in `src/app`; screens in `src/screens`; no tests or helpers in `src/app`.
- Add packages with `npx expo install`; never bump Expo, React or React Native by hand.
- Only a real `UNAUTHORIZED` answer signs the user out; a network error never does.
- Gates before saying "done": `npm run typecheck`, `npm run lint`, `npm test`, and the
  `verify-web` flow for UI work. This sandbox cannot run iOS: say what was and was not run.
