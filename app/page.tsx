import { Button, Center, Paper, Stack, Text, Title } from '@mantine/core';

const ceramicsUrl = process.env.CERAMICS_APP_URL || 'http://localhost:3001';
const yogaUrl = process.env.YOGA_APP_URL || 'http://localhost:3002';

export default function RootPage() {
  return (
    <Center mih="100vh" px="md">
      <Paper withBorder radius="md" p="xl" maw={560} w="100%">
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={1}>Soul Poetry Studio</Title>
            <Text c="dimmed">Pasirinkite kryptį</Text>
          </Stack>

          <Button component="a" href={ceramicsUrl} size="lg" radius="md" fullWidth>
            Ceramics
          </Button>

          <Button component="a" href={yogaUrl} size="lg" radius="md" variant="default" fullWidth>
            Yoga
          </Button>
        </Stack>
      </Paper>
    </Center>
  );
}
