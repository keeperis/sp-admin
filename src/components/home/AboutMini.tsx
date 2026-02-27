'use client';

import { Box, Container, Stack, Text } from '@mantine/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef } from 'react';
import { useArtboardReady } from '@/src/components/background/ArtboardReadyProvider';
import { useSiteContent } from '@/src/hooks/useSiteContent';
import { getTranslations, type Locale } from '@/src/i18n';
import styles from './AboutMini.module.css';

gsap.registerPlugin(ScrollTrigger);

interface AboutMiniProps {
  locale: Locale;
}

export function AboutMini({ locale }: AboutMiniProps) {
  const t = getTranslations(locale);
  const { content } = useSiteContent(locale);
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { isReady } = useArtboardReady();

  /* Panelė su turiniu iš apačios */
  useEffect(() => {
    if (!isReady) return;
    const section = sectionRef.current;
    const panel = panelRef.current;
    if (!section || !panel) return;

    const anim = gsap.fromTo(
      panel,
      { y: 80, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 92%',
          end: 'top 25%',
          scrub: 1.5,
        },
      },
    );

    return () => {
      anim.kill();
    };
  }, [isReady]);

  return (
    <section id="about" ref={sectionRef} className={styles.section} style={{ marginTop: '8rem' }}>
      <Box pt="md" pb={{ base: '5rem', md: '5rem' }}>
        <div ref={panelRef} className={styles.panel}>
          <Container size="lg">
            <Stack gap="lg" style={{ maxWidth: 800, margin: '0 auto' }} ta="center">
              <div className={styles.sectionTitleWrapper}>
                <div className={`${styles.sectionTitleLine} ${styles.sectionTitleLine2}`}>
                  {content?.about.title || t.about.titleLine2}
                </div>
              </div>
              <Text size="lg" style={{ lineHeight: 1.8 }} className={styles.text}>
                {content?.about.text || t.about.text}
              </Text>
            </Stack>
          </Container>
        </div>
      </Box>
    </section>
  );
}
