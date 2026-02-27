'use client';

import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

interface ArtboardReadyContextValue {
  isReady: boolean;
  setReady: () => void;
}

const ArtboardReadyContext = createContext<ArtboardReadyContextValue | null>(null);

export function ArtboardReadyProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const setReady = useCallback(() => setIsReady(true), []);
  return (
    <ArtboardReadyContext.Provider value={{ isReady, setReady }}>
      {children}
    </ArtboardReadyContext.Provider>
  );
}

export function useArtboardReady() {
  const ctx = useContext(ArtboardReadyContext);
  if (!ctx) throw new Error('useArtboardReady must be used within ArtboardReadyProvider');
  return ctx;
}
