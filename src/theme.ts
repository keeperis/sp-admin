import { createTheme } from '@mantine/core';

export const appTheme = createTheme({
  primaryColor: 'blue',
  colors: {
    blue: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#4dabf7',
      '#339af0',
      '#228be6',
      '#1c7ed6',
      '#1971c2',
      '#1864ab',
    ],
  },
  fontFamily: 'var(--font-body-current), var(--font-space-grotesk), Space Grotesk, sans-serif',
  headings: {
    fontFamily:
      'var(--font-heading-current), var(--font-bodoni), Bodoni Moda, Georgia, serif',
    fontWeight: '600',
  },
  defaultRadius: 'md',
});
