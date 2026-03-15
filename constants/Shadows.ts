// constants/Shadows.ts
export const Shadows = {
  // Level 0 — no shadow (flat, on card surface)
  none: {},

  // Level 1 — subtle lift (stat pills, small chips)
  sm: {
    shadowColor: '#0D3B1D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // Level 2 — card shadow (standard cards)
  md: {
    shadowColor: '#0D3B1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 5,
  },

  // Level 3 — floating elements (Agni card, connect card)
  lg: {
    shadowColor: '#0D3B1D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },

  // Level 4 — modals, tab bar
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 20,
  },
};
