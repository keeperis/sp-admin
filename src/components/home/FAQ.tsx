'use client';

import { Accordion, Box, Container, Stack, Text } from '@mantine/core';
import { faq } from '@/src/data/faq';
import { useSiteContent } from '@/src/hooks/useSiteContent';
import { getTranslations, type Locale } from '@/src/i18n';
import type { FAQTag } from '@/src/lib/content/schema';
import styles from './FAQ.module.css';

interface FAQProps {
  locale: Locale;
  tags?: FAQTag[];
}

export function FAQ({ locale, tags }: FAQProps) {
  const t = getTranslations(locale);
  const { content } = useSiteContent(locale);
  const cmsItems = content?.faq || [];
  const faqItems =
    cmsItems.length > 0
      ? cmsItems
          .filter((item) => (tags?.length ? tags.includes(item.tag) : true))
          .map((item) => ({
            id: item.id,
            question: item.question,
            answer: item.answer,
          }))
      : faq.map((item) => ({
          id: item.id,
          question: locale === 'lt' ? item.qLt : item.qEn,
          answer: locale === 'lt' ? item.aLt : item.aEn,
        }));

  return (
    <section id="faq" className={styles.section}>
      <Box pt="xl" pb={{ base: '5rem', md: '5rem' }}>
        <Container size="lg">
          <Stack gap="xl">
            <div className={styles.sectionTitleWrapper}>
              <div className={styles.sectionTitleLine}>{t.faq.title}</div>
            </div>
            <Accordion variant="separated" radius="md" mt="md">
              {faqItems.map((item) => (
                <Accordion.Item key={item.id} value={item.id}>
                  <Accordion.Control fw={600}>{item.question}</Accordion.Control>
                  <Accordion.Panel>
                    <Text size="md" c="dimmed" style={{ lineHeight: 1.7 }}>
                      {item.answer}
                    </Text>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Stack>
        </Container>
      </Box>
    </section>
  );
}
