'use client';

import { Box, Button, Container, Group, ScrollArea, Stack, Title } from '@mantine/core';
import { getTranslations, type Locale } from '@/src/i18n';

interface GalleryStripProps {
  locale: Locale;
}

export function GalleryStrip({ locale }: GalleryStripProps) {
  const t = getTranslations(locale);

  return (
    <Box py="xl">
      <Container size="lg">
        <Stack gap="xl">
          <Title order={2} ta="center" size="2.5rem" fw={600}>
            {t.gallery.title}
          </Title>
          <ScrollArea>
            <Group gap="md" style={{ minWidth: 'max-content' }}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Box
                  key={i}
                  style={{
                    width: 250,
                    height: 250,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0,
                    fontSize: '18px',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {locale === 'lt' ? 'Nuotrauka' : 'Image'} {i}
                </Box>
              ))}
            </Group>
          </ScrollArea>
          <Group justify="center" mt="xl">
            <Button variant="light" size="lg" radius="xl">
              {t.gallery.seeMore}
            </Button>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
