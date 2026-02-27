'use client';

import { Box, Button, Card, Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { getTranslations, type Locale } from '@/src/i18n';

interface QuickChoiceProps {
  locale: Locale;
}

export function QuickChoice({ locale }: QuickChoiceProps) {
  const t = getTranslations(locale);

  const cards = [
    {
      title: t.quickChoice.oneTime.title,
      description: t.quickChoice.oneTime.description,
      color: 'blue',
    },
    {
      title: t.quickChoice.ongoing.title,
      description: t.quickChoice.ongoing.description,
      color: 'violet',
    },
    {
      title: t.quickChoice.gift.title,
      description: t.quickChoice.gift.description,
      color: 'pink',
    },
  ];

  return (
    <Box py="xl">
      <Container size="lg">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
          {cards.map((card) => (
            <Card
              key={card.title}
              shadow="md"
              padding="xl"
              radius="lg"
              withBorder
              style={{
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              <Stack gap="md">
                <Title order={3} size="h3" fw={600}>
                  {card.title}
                </Title>
                <Text size="md" c="dimmed" style={{ lineHeight: 1.6 }}>
                  {card.description}
                </Text>
                <Button
                  variant="light"
                  color={card.color}
                  rightSection={<IconArrowRight size={16} />}
                  mt="auto"
                >
                  {locale === 'lt' ? 'Sužinoti daugiau' : 'Learn more'}
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
