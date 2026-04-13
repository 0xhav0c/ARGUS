/** Centralized theme constants for ARGUS UI */
export const theme = {
  bg: '#0a0e17',
  bgTranslucent: 'rgba(10,14,23,0.97)',
  card: '#0d1220',
  border: '#141c2e',
  borderLight: '#1e293b',
  accent: '#00d4ff',
  accentDim: '#00d4ff40',
  text: '#c8d6e5',
  textBright: '#e2e8f0',
  dim: '#4a5568',
  dimLight: '#64748b',
  success: '#00e676',
  warning: '#ffab40',
  danger: '#ff3b5c',
  info: '#448aff',
  font: "'JetBrains Mono', 'Fira Code', monospace",
} as const

export type Theme = typeof theme
