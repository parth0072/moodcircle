// Node resolve hook: lets `import x from './user'` find ./user.ts, the way TypeScript and Metro
// do, so schema files can be loaded under plain Node (type stripping) without rewriting them.
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {}
  }
  return nextResolve(specifier, context);
}
