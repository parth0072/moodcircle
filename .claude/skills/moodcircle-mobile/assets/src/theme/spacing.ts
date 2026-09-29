// 4-point grid, keyed by multiples of four. The web CSS leans on 12 and 20 as well as the
// usual steps, so they get their own keys instead of scattering literals through screens.
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 } as const;
