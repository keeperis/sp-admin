'use client';

import { Anchor, Container, Stack } from '@mantine/core';
import Link from 'next/link';
import { DpdIntegration } from '../DpdIntegration';

export default function DpdIntegrationPage() {
  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Anchor component={Link} href="/admin/shop" size="sm" c="dimmed">
          ← Parduotuvės valdymas
        </Anchor>
        <DpdIntegration />
      </Stack>
    </Container>
  );
}
