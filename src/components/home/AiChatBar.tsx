'use client';

import { IconSend } from '@tabler/icons-react';
import gsap from 'gsap';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { buildApiUrl } from '@/lib/api';
import { useArtboardReady } from '@/src/components/background/ArtboardReadyProvider';
import { useTheme } from '@/src/components/theme/ThemeProvider';
import { getTranslations, type Locale } from '@/src/i18n';
import styles from './AiChatBar.module.css';
import { useAiChat } from './AiChatContext';

const SLIDE_DELAY = 0.5;
const SLIDE_DURATION = 0.5;
const TOGGLE_DURATION = 0.4;

type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };

function getLocaleFromPath(pathname: string): Locale {
  if (pathname.startsWith('/en')) return 'en';
  return 'lt';
}

export function AiChatBar() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname ?? '');
  const t = getTranslations(locale);
  const { theme } = useTheme();
  const { isReady } = useArtboardReady();
  const { isOpen, setDialogExpanded } = useAiChat();
  const isDark = theme === 'dark';
  const barRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const dialogWrapRef = useRef<HTMLDivElement>(null);
  const barAreaRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);
  const nextMessageIdRef = useRef(0);

  /* Teksto įvedimo eilutė: atsiranda iš apačios, slenka kairėn/dešinėn */
  useEffect(() => {
    if (!isReady || !barRef.current) return;
    const el = barRef.current;
    gsap.set(el, { y: '100%' });
    gsap.to(el, {
      y: 0,
      duration: SLIDE_DURATION,
      delay: SLIDE_DELAY,
      ease: 'power2.out',
    });
  }, [isReady]);

  useEffect(() => {
    if (!barRef.current) return;
    gsap.to(barRef.current, {
      x: isOpen ? 0 : '100%',
      duration: TOGGLE_DURATION,
      ease: 'power2.inOut',
    });
  }, [isOpen]);

  /* Dialogo langas: išvažiavimas ir suvažiavimas su animacija */
  useEffect(() => {
    if (!dialogWrapRef.current) return;
    if (isExpanded) {
      gsap.to(dialogWrapRef.current, {
        height: '40vh',
        duration: 0.35,
        ease: 'power2.out',
        overflow: 'hidden',
      });
    } else if (isCollapsing) {
      gsap.to(dialogWrapRef.current, {
        height: 0,
        duration: 0.35,
        ease: 'power2.in',
        overflow: 'hidden',
        onComplete: () => {
          setIsCollapsing(false);
        },
      });
    }
  }, [isExpanded, isCollapsing]);

  useEffect(() => {
    setDialogExpanded(isExpanded || isCollapsing);
  }, [isExpanded, isCollapsing, setDialogExpanded]);

  useEffect(() => {
    if (!dialogWrapRef.current) return;
    gsap.set(dialogWrapRef.current, {
      height: isExpanded ? '40vh' : 0,
      overflow: 'hidden',
    });
  }, [isExpanded]);

  /* Suskleidimas: scroll žemyn arba paspaudimas už dialogo/įvesties */
  const lastScrollYRef = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!isExpanded) return;
      const y = window.scrollY;
      if (y !== lastScrollYRef.current) {
        setIsCollapsing(true);
        setIsExpanded(false);
      }
      lastScrollYRef.current = y;
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (!isExpanded) return;
      const el = barAreaRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setIsCollapsing(true);
      setIsExpanded(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  useEffect(() => {
    if (messages.length === 0 && !isWaiting) return;
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isWaiting]);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    const text = query.trim();
    setQuery('');
    setIsExpanded(true);
    const userMessage: ChatMessage = {
      id: `m-${nextMessageIdRef.current++}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsWaiting(true);

    try {
      const res = await fetch(buildApiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error('Chat failed');
      const { content } = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${nextMessageIdRef.current++}`,
          role: 'assistant',
          content: content || '',
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${nextMessageIdRef.current++}`,
          role: 'assistant',
          content:
            locale === 'lt'
              ? 'Nepavyko gauti atsakymo. Bandykite dar kartą.'
              : 'Failed to get response. Please try again.',
        },
      ]);
    } finally {
      setIsWaiting(false);
    }
  };

  return (
    <div ref={barAreaRef}>
      <div
        ref={barRef}
        className={styles.bar}
        data-dialog-expanded={isExpanded || isCollapsing ? 'true' : undefined}
      >
        <div className={styles.barInner}>
          <div
            className={`${styles.dialogUnit} ${isExpanded || isCollapsing ? styles.dialogUnitExpanded : ''}`}
          >
            <div ref={dialogWrapRef} className={styles.dialogWrap}>
              <div ref={chatScrollRef} className={styles.chatField}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={m.role === 'user' ? styles.msgUser : styles.msgAssistant}
                  >
                    {m.content}
                  </div>
                ))}
                {isWaiting && (
                  <div className={styles.dotWrap} aria-hidden>
                    <span className={styles.dot} />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className={styles.inputWrap}>
            <input
              type="text"
              placeholder={t.ai.placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              onFocus={() => {
                if (messages.length > 0 && !isExpanded) setIsExpanded(true);
              }}
              className={styles.input}
              aria-label={t.ai.placeholder}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!query.trim() || isWaiting}
              className={styles.sendBtn}
              style={{
                background: isDark ? 'rgba(30, 30, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
                color: isDark ? '#e0e0e0' : '#333',
              }}
              aria-label={locale === 'lt' ? 'Siųsti' : 'Send'}
            >
              <IconSend size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
