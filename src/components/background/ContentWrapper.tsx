'use client';

import { useEffect, useState } from 'react';
import { useArtboardReady } from './ArtboardReadyProvider';

const DELAY_MS = 500;

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const { isReady } = useArtboardReady();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    const t = setTimeout(() => setShowContent(true), DELAY_MS);
    return () => clearTimeout(t);
  }, [isReady]);

  return (
    <div
      style={{
        opacity: showContent ? 1 : 0,
        visibility: showContent ? 'visible' : 'hidden',
        transition: 'opacity 0.4s ease-out, visibility 0.4s',
      }}
    >
      {children}
    </div>
  );
}
