'use client';

import { Container, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import Link from 'next/link';
import { adminSections } from '@/lib/admin-navigation';
import classes from './page.module.css';

export default function AdminHomePage() {
  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Title order={1}>Administravimas</Title>
          <Text c="dimmed">Pasirink skiltį.</Text>
        </div>
        <nav aria-label="Administravimo skiltys">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {adminSections.map((section) => {
              const Icon = section.icon;
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  className={classes.section}
                  aria-label={section.label}
                >
                  <ThemeIcon variant="light" size={44} radius="md" className={classes.icon}>
                    <Icon size={22} aria-hidden="true" />
                  </ThemeIcon>
                  <div className={classes.copy}>
                    <Text fw={600}>{section.label}</Text>
                    <Text size="sm" c="dimmed">
                      {section.description}
                    </Text>
                  </div>
                  <IconChevronRight size={18} className={classes.chevron} aria-hidden="true" />
                </Link>
              );
            })}
          </SimpleGrid>
        </nav>
      </Stack>
    </Container>
  );
}
