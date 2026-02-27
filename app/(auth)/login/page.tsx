'use client';

import { Button, Card, Center, Stack, Text, Title } from '@mantine/core';
import { IconBrandGoogle } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <Center style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Card
        shadow="sm"
        padding="xl"
        radius="md"
        withBorder
        style={{ width: '100%', maxWidth: 400 }}
      >
        <Stack gap="md">
          <Title order={2} ta="center">
            SoulPoetry Admin
          </Title>
          <Text c="dimmed" ta="center" size="sm">
            Sign in with your Google account to continue
          </Text>
          <Button
            leftSection={<IconBrandGoogle size={18} />}
            onClick={() => signIn('google', { callbackUrl: '/admin/content' })}
            fullWidth
            size="md"
          >
            Sign in with Google
          </Button>
        </Stack>
      </Card>
    </Center>
  );
}
