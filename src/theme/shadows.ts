import { colors } from './colors';

/**
 * Named elevation styles. `floating` canonicalizes the two ad-hoc `#000` shadows
 * used by floating chrome (the MOW center button and the in-progress banner) into
 * a single ink-tinted elevation. Consumers migrate to it in Phase 1b.
 */
export const shadows = {
  floating: {
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
} as const;
