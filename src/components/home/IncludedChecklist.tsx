'use client';

import { Box, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { getTranslations, type Locale } from '@/src/i18n';

interface IncludedChecklistProps {
  locale: Locale;
}

export function IncludedChecklist({ locale }: IncludedChecklistProps) {
  const t = getTranslations(locale);

  const items = [
    t.included.items.materials,
    t.included.items.glazes,
    t.included.items.firing,
    t.included.items.drinks,
  ];

  return (
    <Box py="xl">
      <Container size="lg">
        <Stack gap="xl">
          <Title order={2} ta="center" size="2.5rem" fw={600}>
            {t.included.title}
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" mt="xl">
            {items.map((item) => (
              <Group key={item} gap="md">
                <ThemeIcon size="lg" radius="xl" color="green" variant="light">
                  <IconCheck size={20} />
                </ThemeIcon>
                <Text size="lg" fw={500}>
                  {item}
                </Text>
              </Group>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  );
}
