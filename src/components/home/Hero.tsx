'use client';

import { Box } from '@mantine/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';
import { useArtboardReady } from '@/src/components/background/ArtboardReadyProvider';
import { useSiteContent } from '@/src/hooks/useSiteContent';
import { getTranslations, type Locale } from '@/src/i18n';
import styles from './Hero.module.css';

gsap.registerPlugin(ScrollTrigger);

const ENTRANCE_DELAY_MS = 500;
const CYCLE_INTERVAL_MS = 4000;
const TRANSITION_DURATION = 0.5;
const EXIT_OFFSET = -60;
const ENTER_OFFSET = 60;
const STAGGER_DELAY = 0.2;

interface HeroProps {
  locale: Locale;
}

export function Hero({ locale }: HeroProps) {
  const t = getTranslations(locale);
  const { content } = useSiteContent(locale);
  const variations = content?.hero.lines || (t.hero.headlineVariations as string[][]);
  const heroRef = useRef<HTMLElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const variationIndexRef = useRef(0);
  const { isReady } = useArtboardReady();

  /* Įėjimo animacijos: po nuotraukų + 0.5s */
  useEffect(() => {
    if (!isReady || variations.length === 0) return;
    const lineEls = lineRefs.current.filter(Boolean) as HTMLDivElement[];
    if (lineEls.length === 0) return;

    const innerEls = innerRefs.current.filter(Boolean) as HTMLDivElement[];
    if (innerEls.length === 0) return;

    gsap.set(innerEls[0], { x: '30vw', opacity: 0 });
    gsap.set(innerEls[1], { x: '30vw', opacity: 0 });
    gsap.set(innerEls[2], { x: '-30vw', opacity: 0 });

    const tl = gsap.timeline({ delay: ENTRANCE_DELAY_MS / 1000 });

    tl.to(innerEls[0], { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out' });
    tl.to(innerEls[1], { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }, '-=0.3');
    tl.to(innerEls[2], { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }, '-=0.3');

    return () => {
      tl.kill();
    };
  }, [isReady, variations.length]);

  /* Tekstų ciklinimas: 1→2→3 su 0.2s vėlavimu, jei tas pats žodis – scale pulse */
  useEffect(() => {
    if (!isReady || variations.length === 0) return;

    const cycleToNext = () => {
      const innerEls = innerRefs.current.filter(Boolean) as HTMLDivElement[];
      if (innerEls.length < 3) return;
      const currentIdx = variationIndexRef.current;
      const nextIdx = (currentIdx + 1) % variations.length;
      const currentWords = variations[currentIdx]!;
      const nextWords = variations[nextIdx]!;

      variationIndexRef.current = nextIdx;

      const animateLine = (i: number, delay: number) => {
        const el = innerRefs.current[i];
        if (!el) return;
        const currentWord = currentWords[i];
        const nextWord = nextWords[i];

        const runAt = () => {
          if (currentWord === nextWord) return;
          gsap.to(el, {
            y: EXIT_OFFSET,
            opacity: 0,
            duration: TRANSITION_DURATION,
            ease: 'power2.in',
            onComplete: () => {
              el.textContent = nextWord ?? '';
              gsap.set(el, { y: ENTER_OFFSET, opacity: 0 });
              gsap.to(el, {
                y: 0,
                opacity: 1,
                duration: TRANSITION_DURATION,
                ease: 'power2.out',
              });
            },
          });
        };

        if (delay > 0) {
          setTimeout(runAt, delay * 1000);
        } else {
          runAt();
        }
      };

      animateLine(0, 0);
      animateLine(1, STAGGER_DELAY);
      animateLine(2, STAGGER_DELAY * 2);
    };

    const entranceDurationMs = (ENTRANCE_DELAY_MS / 1000 + 0.6 + 0.5 + 0.6 + 0.5 + 0.6) * 1000;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(cycleToNext, CYCLE_INTERVAL_MS);
    }, entranceDurationMs);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isReady, variations]);

  /* Scroll animacija: suvažiuoja į centrą */
  useEffect(() => {
    const hero = heroRef.current;
    const lineEls = lineRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!hero || lineEls.length === 0) return;

    const st = ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
      animation: gsap
        .timeline()
        .to(lineEls[1], {
          xPercent: -35,
          transformOrigin: '100% 50%',
          ease: 'power2.out',
        })
        .to(
          lineEls[2],
          {
            xPercent: 35,
            transformOrigin: '0% 50%',
            ease: 'power2.out',
          },
          '<',
        ),
    });

    return () => st.kill();
  }, []);

  const initialWords = variations[0] ?? ['', '', ''];

  return (
    <Box id="top" ref={heroRef} component="section" className={styles.hero}>
      <header className={styles.brandLayer}>{content?.hero.brandName || t.hero.brandName}</header>
      <div className={styles.headlineLayer}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            className={styles.headlineLine}
            data-line={i}
          >
            <div
              ref={(el) => {
                innerRefs.current[i] = el;
              }}
              className={styles.headlineLineInner}
            >
              {initialWords[i]}
            </div>
          </div>
        ))}
      </div>
    </Box>
  );
}
