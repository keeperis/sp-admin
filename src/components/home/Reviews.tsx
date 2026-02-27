'use client';

import { Box, Card, Container, Rating, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { reviews } from '@/src/data/reviews';
import { getTranslations, type Locale } from '@/src/i18n';

interface ReviewsProps {
  locale: Locale;
}

export function Reviews({ locale }: ReviewsProps) {
  const t = getTranslations(locale);

  return (
    <Box py="xl">
      <Container size="lg">
        <Stack gap="xl">
          <Title order={2} ta="center" size="2.5rem" fw={600}>
            {t.reviews.title}
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
            {reviews.map((review) => (
              <Card
                key={review.id}
                shadow="sm"
                padding="xl"
                radius="lg"
                withBorder
                style={{
                  backgroundColor: 'white',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Stack gap="md">
                  {review.rating && <Rating value={review.rating} readOnly size="sm" />}
                  <Text size="md" style={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                    "{locale === 'lt' ? review.textLt : review.textEn}"
                  </Text>
                  <Text fw={600} size="sm" c="dimmed" mt="auto">
                    — {review.name}
                  </Text>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  );
}
