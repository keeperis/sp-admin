import type { Metadata, Viewport } from 'next';

// Only admin/auth layouts use these: the public landing keeps its own identity.
export const adminAppMetadata: Metadata = {
  title: 'SoulPoetry Admin',
  applicationName: 'SoulPoetry Admin',
  description: 'SoulPoetry studijos administravimas',
  manifest: '/admin.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'SoulPoetry Admin',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.ico',
    apple: [{ url: '/icons/admin-apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  other: {
    // Next 16 emits the unprefixed tag from appleWebApp.capable; retain the iOS fallback too.
    'apple-mobile-web-app-capable': 'yes',
  },
};

export const adminAppViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Keep the default safe viewport rather than drawing under the iPhone status bar.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1b1e' },
  ],
};
