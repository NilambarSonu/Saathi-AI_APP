const common = {
  primary: '#1A7B3C',
  primaryDark: '#0E4D26',
  primaryDeep: '#072F18',
  secondary: '#22B455',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  amber: '#F59E0B',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  premium: '#8B5CF6',
};

type ThemePalette = typeof common & {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  label1: string;
  label2: string;
  label3: string;
  bg0: string;
  bg1: string;
  fillGreen: string;
  fillBlue: string;
  fillAmber: string;
  fillPurple: string;
  sep1: string;
  sep2: string;
  primaryLight: string;
  cardBackground: string;
  cardBorder: string;
  statsGreen: [string, string];
  statsAmber: [string, string];
  statsBlue: [string, string];
  heroGradient: [string, string];
  heroBackground: string;
  popupHandle: string;
  modalBackground: string;
  tabBarBackground: string;
  tabBarBorder: string;
  activeTab: string;
  inactiveTab: string;
  
  // Feature colors
  featureGreen: string;
  featureBlue: string;
  featureAmber: string;
  featurePurple: string;
  
  // Chart/Parameter colors
  paramNitrogen: string;
  paramPhosphorus: string;
  paramPotassium: string;
  paramPH: string;
  paramMoisture: string;
  
  // Gradient backgrounds for cards
  cardGradientGreen: [string, string];
  cardGradientAmber: [string, string];
  cardGradientBlue: [string, string];
  cardGradientPurple: [string, string];
  
  // Hero specifics
  heroText: string;
  heroSubtext: string;
  heroBorder: string;
  heroBtnGradient: [string, string];
};

const light: ThemePalette = {
  ...common,
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  label1: '#111827',
  label2: '#374151',
  label3: '#6B7280',
  bg0: '#F9FAFB',
  bg1: '#F3F4F6',
  fillGreen: '#ECFDF5',
  fillBlue: '#EFF6FF',
  fillAmber: '#FFFBEB',
  fillPurple: '#F5F3FF',
  sep1: '#E5E7EB',
  sep2: '#F3F4F6',
  primaryLight: '#ECFDF5',
  cardBackground: '#FFFFFF',
  cardBorder: '#E5E7EB',
  statsGreen: ['#F0FDF4', '#D1FAE5'],
  statsAmber: ['#FFFBEB', '#FEF3C7'],
  statsBlue: ['#EFF6FF', '#DBEAFE'],
  heroGradient: ['#FFEDE4', '#F4F4F4'],
  heroBackground: '#FFF5EF',
  popupHandle: '#E5E7EB',
  modalBackground: '#FFFFFF',
  tabBarBackground: 'rgba(240, 253, 244, 0.60)',
  tabBarBorder: 'rgba(167, 243, 208, 0.35)',
  activeTab: '#0a843dff',
  inactiveTab: '#9CAF9F',
  
  featureGreen: '#21db6eff',
  featureBlue: '#2787f6ff',
  featureAmber: '#eab329ff',
  featurePurple: '#c438e4ff',
  
  paramNitrogen: '#EF4444',
  paramPhosphorus: '#8B5CF6',
  paramPotassium: '#F59E0B',
  paramPH: '#2563EB',
  paramMoisture: '#10B981',
  
  cardGradientGreen: ['#F0FDF4', '#D1FAE5'],
  cardGradientAmber: ['#FFFBEB', '#FEF3C7'],
  cardGradientBlue: ['#EFF6FF', '#DBEAFE'],
  cardGradientPurple: ['#F5F3FF', '#EDE9FE'],
  
  heroText: '#1A1A1A',
  heroSubtext: '#4A4A4A',
  heroBorder: 'rgba(255, 107, 0, 0.1)',
  heroBtnGradient: ['#FF5F6D', '#FFC371'],
};

const dark: ThemePalette = {
  ...common,
  background: '#101611',
  surface: '#18211B',
  surfaceAlt: '#202B24',
  border: '#304136',
  borderLight: '#26352C',
  textPrimary: '#F5F7F3',
  textSecondary: '#B9C5BC',
  textMuted: '#768579',
  label1: '#F5F7F3',
  label2: '#C9D2CB',
  label3: '#94A39A',
  bg0: '#101611',
  bg1: '#17251C',
  fillGreen: 'rgba(52, 211, 153, 0.16)',
  fillBlue: 'rgba(96, 165, 250, 0.15)',
  fillAmber: 'rgba(251, 191, 36, 0.15)',
  fillPurple: 'rgba(167, 139, 250, 0.15)',
  sep1: 'rgba(255, 255, 255, 0.08)',
  sep2: 'rgba(255, 255, 255, 0.12)',
  primaryLight: 'rgba(52, 211, 153, 0.16)',
  cardBackground: '#18211B',
  cardBorder: 'rgba(255, 255, 255, 0.12)',
  statsGreen: ['rgba(32, 83, 62, 0.94)', 'rgba(21, 43, 32, 0.96)'],
  statsAmber: ['rgba(92, 66, 26, 0.94)', 'rgba(38, 31, 20, 0.96)'],
  statsBlue: ['rgba(30, 61, 101, 0.94)', 'rgba(22, 32, 51, 0.96)'],
  heroGradient: ['#31251C', '#1B211B'],
  heroBackground: '#211D18',
  popupHandle: '#4B5B50',
  modalBackground: '#18211B',
  tabBarBackground: 'rgba(18, 27, 21, 0.86)',
  tabBarBorder: 'rgba(110, 231, 183, 0.22)',
  activeTab: '#6EE7B7',
  inactiveTab: '#7F9185',
  
  featureGreen: '#6EE7B7',
  featureBlue: '#93C5FD',
  featureAmber: '#FCD34D',
  featurePurple: '#C4B5FD',
  
  paramNitrogen: '#F87171',
  paramPhosphorus: '#A78BFA',
  paramPotassium: '#FBBF24',
  paramPH: '#60A5FA',
  paramMoisture: '#34D399',
  
  cardGradientGreen: ['rgba(52, 211, 153, 0.22)', 'rgba(24, 33, 27, 0.96)'],
  cardGradientAmber: ['rgba(251, 191, 36, 0.2)', 'rgba(24, 33, 27, 0.96)'],
  cardGradientBlue: ['rgba(96, 165, 250, 0.2)', 'rgba(24, 33, 27, 0.96)'],
  cardGradientPurple: ['rgba(196, 181, 253, 0.2)', 'rgba(24, 33, 27, 0.96)'],
  
  heroText: '#F2F4F3',
  heroSubtext: '#C2B8AA',
  heroBorder: 'rgba(251, 191, 36, 0.22)',
  heroBtnGradient: ['#F97316', '#FBBF24'],
};

export const Colors: ThemePalette & { light: ThemePalette; dark: ThemePalette } = {
  ...light,
  light,
  dark,
};

export type ThemeColors = ThemePalette;
