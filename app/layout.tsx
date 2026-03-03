import type { Metadata } from 'next';
import {
  Bodoni_Moda,
  Fraunces,
  Hurricane,
  Lovers_Quarrel,
  Nunito_Sans,
  Space_Grotesk,
} from 'next/font/google';
import './globals.css';
import { MantineProvider } from '@mantine/core';
import { ThemeWrapper } from '@/src/components/theme/ThemeWrapper';
import '@mantine/core/styles.css';
import { appTheme } from '@/src/theme';

const spaceGrotesk = Space_Grotesk({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});
const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  variable: '--font-bodoni',
});
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' });
const nunito = Nunito_Sans({ subsets: ['latin'], variable: '--font-nunito-sans' });
const loversQuarrel = Lovers_Quarrel({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-lovers-quarrel',
});
const hurricane = Hurricane({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-hurricane',
});

const themeInitScript = `(function(){try{var s=localStorage.getItem('plp-theme');var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light')}catch(e){}})();`;

export const metadata: Metadata = {
  title: 'Soul Poetry Studija',
  description: 'Soul Poetry Studio landing and admin',
  icons: {
    icon: [
      { url: '/favicon_dark.png', media: '(prefers-color-scheme: light)', type: 'image/png' },
      { url: '/favicon_white.png', media: '(prefers-color-scheme: dark)', type: 'image/png' },
      { url: '/favicon.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [{ url: '/favicon.png', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${bodoni.variable} ${fraunces.variable} ${nunito.variable} ${loversQuarrel.variable} ${hurricane.variable}`}
    >
      <body>
        <script>{themeInitScript}</script>
        <MantineProvider theme={appTheme}>
          <ThemeWrapper>{children}</ThemeWrapper>
        </MantineProvider>
      </body>
    </html>
  );
}
