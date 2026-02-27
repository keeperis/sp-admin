'use client';

import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

interface AiChatContextValue {
  isOpen: boolean;
  toggle: () => void;
  isDialogExpanded: boolean;
  setDialogExpanded: (value: boolean) => void;
}

const AiChatContext = createContext<AiChatContextValue | null>(null);

export function AiChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isDialogExpanded, setIsDialogExpanded] = useState(false);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const setDialogExpanded = useCallback((value: boolean) => setIsDialogExpanded(value), []);
  return (
    <AiChatContext.Provider value={{ isOpen, toggle, isDialogExpanded, setDialogExpanded }}>
      {children}
    </AiChatContext.Provider>
  );
}

export function useAiChat() {
  const ctx = useContext(AiChatContext);
  if (!ctx) throw new Error('useAiChat must be used within AiChatProvider');
  return ctx;
}
