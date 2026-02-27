'use client';

import { Box, Button, Container, Grid, Stack, Text, Title } from '@mantine/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { BG_IMAGES } from '@/lib/bgImages';
import { useArtboardReady } from '@/src/components/background/ArtboardReadyProvider';
import { useSiteContent } from '@/src/hooks/useSiteContent';
import { getTranslations, type Locale } from '@/src/i18n';
import styles from './PrivateEvents.module.css';

gsap.registerPlugin(ScrollTrigger);

interface PrivateEventsProps {
  locale: Locale;
}

export function PrivateEvents({ locale }: PrivateEventsProps) {
  const t = getTranslations(locale);
  const { content } = useSiteContent(locale);
  const section = content?.sections.private;
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { isReady } = useArtboardReady();

  const sectionImage = BG_IMAGES[8] ?? BG_IMAGES[0] ?? '/bg/Potterylikepoetry-1.jpg';

  useEffect(() => {
    if (!isReady) return;
    const section = sectionRef.current;
    const panel = panelRef.current;
    if (!section || !panel) return;

    const anim = gsap.fromTo(
      panel,
      { x: '35%', opacity: 0 },
      {
        x: 0,
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

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('resize', refresh);
    const t1 = setTimeout(refresh, 800);
    const t2 = setTimeout(refresh, 2000);

    return () => {
      anim.kill();
      window.removeEventListener('resize', refresh);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isReady]);

  return (
    <section id="private-events" ref={sectionRef} className={styles.section}>
      <Box pt="xl" pb={{ base: '5rem', md: '5rem' }}>
        <div ref={panelRef} className={styles.panel}>
          <Container size="lg">
            <Grid gutter={{ base: 'xl', md: 48 }} align="stretch">
              <Grid.Col span={{ base: 12, md: 6 }} className={styles.imageCol}>
                <div className={styles.imageWrapper}>
                  <Image
                    src={sectionImage}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 100vw, 50vw"
                    style={{ objectFit: 'cover' }}
                    priority={false}
                  />
                </div>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap="lg" justify="center" className={styles.textColumn}>
                  <Title order={2} className={styles.title}>
                    {section?.title || t.privateEvents.title}
                  </Title>
                  {(section?.paragraphs?.length
                    ? section.paragraphs
                    : [
                        t.privateEvents.paragraph1,
                        t.privateEvents.paragraph2,
                        t.privateEvents.paragraph3,
                        t.privateEvents.paragraph4,
                        t.privateEvents.details.join(' '),
                      ]
                  ).map((paragraph) => (
                    <Text key={paragraph} size="lg" className={styles.paragraph}>
                      {paragraph}
                    </Text>
                  ))}
                  <Button
                    size="lg"
                    variant="filled"
                    color="dark"
                    mt="md"
                    className={styles.bookButton}
                  >
                    {t.privateEvents.bookButton}
                  </Button>
                </Stack>
              </Grid.Col>
            </Grid>
          </Container>
        </div>
      </Box>
    </section>
  );
}
