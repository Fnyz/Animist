// Design tokens for the dark, cinematic look with the coral brand accent.
// Every screen takes its colors, fonts and spacing from here.

export const colors = {
  bg: '#0E0F14',
  surface: '#181A22',
  surface2: '#22252F',
  tabBar: '#14161D',
  line: '#2C2F3A',
  text: '#F2F2F5',
  textSoft: '#C3C6D2',
  muted: '#A3A6B4',
  accent: '#FF7A59',
  onAccent: '#1A0E0A',
  scrim: 'rgba(14,15,20,0.78)',
  danger: '#FF8A80',
  dangerSoft: '#3A1D1D',
  success: '#7FE0AE',
  successSoft: '#1E3A2E',
};

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 };

// Poster colors shown while cover images load.
export const posterPlaceholder = colors.surface2;
