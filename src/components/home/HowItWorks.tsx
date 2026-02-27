'use client';

import { Box, Container, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { getTranslations, type Locale } from '@/src/i18n';

interface HowItWorksProps {
  locale: Locale;
}

export function HowItWorks({ locale }: HowItWorksProps) {
  const t = getTranslations(locale);

  const steps = [
    t.howItWorks.steps.arrive,
    t.howItWorks.steps.intro,
    t.howItWorks.steps.creating,
    t.howItWorks.steps.glazing,
    t.howItWorks.steps.pickup,
  ];

  return (
    <Box py="xl">
      <Container size="lg">
        <Stack gap="xl">
          <Title order={2} ta="center" size="2.5rem" fw={600}>
            {t.howItWorks.title}
          </Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="xl" mt="xl">
            {steps.map((step, index) => (
              <Stack key={step} gap="md" align="center" ta="center">
                <ThemeIcon
                  size={60}
                  radius="xl"
                  color="blue"
                  variant="light"
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </ThemeIcon>
                <Text size="md" fw={500}>
                  {step}
                </Text>
              </Stack>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  );
}
