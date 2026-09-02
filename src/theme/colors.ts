export const colors = {
  // Brand palette
  ink: '#2D2A32',          // primary text, replaces #111827
  primary: '#2E5E43',      // actions/brand green (rebrand v2), was #468367
  greenLight: '#66B287',   // fills, progress, positive accents, selected-chip fill. FAILS
                           // contrast for text on light backgrounds — never use for text on white.
  // primaryMuted historically did two jobs — pressed feedback AND the inactive tab
  // tint — which only read correctly under the old lighter green. It now keeps ONLY
  // the inactive-tint job (unchanged value); press-darken lives in primaryPressed.
  primaryMuted: '#639376', // inactive tab tint (NOT pressed states)
  primaryPressed: '#254B36', // pressed state for primary fills (new primary darkened ~20%)
  background: '#FFFFFF',    // app ground. Distinct job from `surface` (elevated cards): both
                           // white today, kept separate so the ground can diverge later (D-084).

  // Derived / functional
  surface: '#FFFFFF',        // cards and elevated surfaces stay white
  textSecondary: '#57545C',  // ink-derived ~70%, replaces #6b7280 #4b5563 #374151
  textMuted: '#8B888F',      // ink-derived ~45%, replaces #9ca3af
  border: '#E2DDD5',         // warm hairline/outline (incl. outline-pill badges), replaces #e5e7eb #d1d5db
  destructive: '#B4534B',    // warmed red, replaces #dc2626 and #fca5a5
  warning: '#C08A3E',        // caution amber, replaces #f59e0b
  textOnColor: '#FFFFFF',    // text on primary/destructive fills
  scrim: 'rgba(45, 42, 50, 0.5)', // canonical sheet/modal backdrop (ink-tinted)
} as const;
