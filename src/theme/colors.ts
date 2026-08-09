export const colors = {
  // Brand palette
  ink: '#2D2A32',          // primary text, replaces #111827
  primary: '#468367',      // actions/brand green, replaces #16a34a and #22c55e
  primaryMuted: '#639376', // secondary accents, pressed states
  sand: '#D6D1B1',         // subtle fills, tile accents
  cream: '#F2EDEB',        // app background, replaces white BACKGROUNDS only

  // Derived / functional
  surface: '#FFFFFF',        // cards and elevated surfaces stay white
  textSecondary: '#57545C',  // ink-derived ~70%, replaces #6b7280 #4b5563 #374151
  textMuted: '#8B888F',      // ink-derived ~45%, replaces #9ca3af
  border: '#E2DDD5',         // warm border derived from sand, replaces #e5e7eb #d1d5db
  destructive: '#B4534B',    // warmed red, replaces #dc2626 and #fca5a5
  textOnColor: '#FFFFFF',    // text on primary/destructive fills
} as const;
