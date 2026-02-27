'use client';

import { usePathname } from 'next/navigation';
import { ArtboardBackground } from '@/src/components/background/ArtboardBackground';
import { ArtboardReadyProvider } from '@/src/components/background/ArtboardReadyProvider';
import { ContentWrapper } from '@/src/components/background/ContentWrapper';
// LAIKINA: AI pokalbių juosta paslėpta. Atkurti: atkomentuoti import ir <AiChatBar /> žemiau.
// import { AiChatBar } from '@/src/components/home/AiChatBar';
import { AiChatProvider } from '@/src/components/home/AiChatContext';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  if (isAdmin) {
    return <ThemeProvider>{children}</ThemeProvider>;
  }

  return (
    <ThemeProvider>
      <ThemeToggle />
      <AiChatProvider>
        <ArtboardReadyProvider>
          <ArtboardBackground />
          <ContentWrapper>{children}</ContentWrapper>
          {/* LAIKINA: AI chat paslėptas – atkomentuoti kai reikės: <AiChatBar /> */}
        </ArtboardReadyProvider>
      </AiChatProvider>
    </ThemeProvider>
  );
}
