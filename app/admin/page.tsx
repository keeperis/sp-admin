'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconBrain,
  IconBrandFacebook,
  IconCheck,
  IconClock,
  IconDatabase,
  IconMail,
  IconRefresh,
  IconShieldCheck,
  IconX,
} from '@tabler/icons-react';
import useSWR from 'swr';

type CheckState = 'ok' | 'warning' | 'error';

type StatusCheck = {
  id: string;
  label: string;
  state: CheckState;
  message: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
};

type StatusResponse = {
  ok: boolean;
  state: CheckState;
  generatedAt: string;
  latencyMs: number;
  checks: StatusCheck[];
};

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || 'Nepavyko gauti dashboard būsenos');
  }
  return payload as StatusResponse;
};

const stateMeta = {
  ok: { label: 'Veikia', color: 'green', icon: IconCheck },
  warning: { label: 'Reikia dėmesio', color: 'yellow', icon: IconAlertTriangle },
  error: { label: 'Neveikia', color: 'red', icon: IconX },
} satisfies Record<CheckState, { label: string; color: string; icon: typeof IconCheck }>;

const checkIcons: Record<string, typeof IconCheck> = {
  auth: IconShieldCheck,
  database: IconDatabase,
  email: IconMail,
  meta: IconBrandFacebook,
  payments: IconShieldCheck,
  cron: IconClock,
  ai: IconBrain,
};

function formatDateTime(value?: string | null) {
  if (!value) return 'Nėra duomenų';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('lt-LT', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date);
}

function compactValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Nėra';
  if (typeof value === 'boolean') return value ? 'Taip' : 'Ne';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(1);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Tuščia';
  return JSON.stringify(value);
}

function detailRows(check: StatusCheck): Array<[string, unknown]> {
  if (!check.details) return [];

  if (check.id === 'meta') {
    const credential = check.details.credential as Record<string, unknown> | undefined;
    const page = check.details.page as Record<string, unknown> | undefined;
    return [
      ['Puslapis', page?.name || credential?.pageName || credential?.pageId],
      ['Credential būsena', credential?.status],
      ['Paskutinė patikra', formatDateTime(credential?.lastValidatedAt as string | undefined)],
      ['Galioja iki', formatDateTime(credential?.expiresAt as string | undefined)],
      ['Events kiekis', credential?.lastEventsCount],
    ];
  }

  if (check.id === 'email') {
    const smtp = check.details.smtp as Record<string, unknown> | undefined;
    const sites = check.details.sites as Record<string, Record<string, unknown>> | undefined;
    return [
      ['SMTP host', smtp?.host || sites?.ceramics?.host || sites?.yoga?.host],
      ['SMTP port', smtp?.port || sites?.ceramics?.port || sites?.yoga?.port],
      ['Ceramics from', sites?.ceramics?.fromEmail],
      ['Yoga from', sites?.yoga?.fromEmail],
      ['Nepavykę per 24 val.', check.details.failedLast24h],
    ];
  }

  return Object.entries(check.details);
}

function StatusCard({ check }: { check: StatusCheck }) {
  const meta = stateMeta[check.state];
  const StateIcon = meta.icon;
  const CheckIcon = checkIcons[check.id] || IconShieldCheck;
  const rows = detailRows(check);

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            <ThemeIcon variant="light" color={meta.color} radius="xl" size="lg">
              <CheckIcon size={18} />
            </ThemeIcon>
            <div>
              <Title order={3} size="h4">
                {check.label}
              </Title>
              {typeof check.latencyMs === 'number' ? (
                <Text size="xs" c="dimmed">
                  {check.latencyMs} ms
                </Text>
              ) : null}
            </div>
          </Group>
          <Badge color={meta.color} variant="light" leftSection={<StateIcon size={12} />}>
            {meta.label}
          </Badge>
        </Group>

        <Text c="dimmed" size="sm">
          {check.message}
        </Text>

        {rows.length > 0 ? (
          <Stack gap={6}>
            {rows.map(([label, value]) => (
              <Group key={label} justify="space-between" gap="md" wrap="nowrap">
                <Text size="xs" c="dimmed">
                  {label}
                </Text>
                <Text size="xs" fw={600} ta="right" style={{ overflowWrap: 'anywhere' }}>
                  {compactValue(value)}
                </Text>
              </Group>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<StatusResponse>(
    '/api/admin/status',
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false },
  );
  const checks = data?.checks || [];
  const summary = data ? stateMeta[data.state] : null;
  const SummaryIcon = summary?.icon || IconRefresh;

  return (
    <Container size="xl" py="md">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1}>Dashboard</Title>
            <Text c="dimmed">Bendra prisijungimų, integracijų ir servisų būsena.</Text>
          </div>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={() => mutate()}
            loading={isValidating}
            variant="light"
          >
            Atnaujinti
          </Button>
        </Group>

        {error ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Nepavyko įkelti būsenos">
            {error.message}
          </Alert>
        ) : null}

        <Card withBorder radius="md" padding="lg">
          <Group justify="space-between" align="center">
            <Group gap="md">
              <ThemeIcon color={summary?.color || 'gray'} variant="light" radius="xl" size="xl">
                {isLoading && !data ? <Loader size={20} /> : <SummaryIcon size={22} />}
              </ThemeIcon>
              <div>
                <Title order={2} size="h3">
                  {summary ? summary.label : isLoading ? 'Tikrinama' : 'Nėra duomenų'}
                </Title>
                <Text c="dimmed" size="sm">
                  {data
                    ? `Atnaujinta ${formatDateTime(data.generatedAt)} per ${data.latencyMs} ms`
                    : 'Statusas dar neįkeltas'}
                </Text>
              </div>
            </Group>
            {data ? (
              <Badge color={summary?.color || 'gray'} size="lg" variant="light">
                {data.ok ? 'OK' : 'Reikia tvarkyti'}
              </Badge>
            ) : null}
          </Group>
        </Card>

        {isLoading && checks.length === 0 ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {checks.map((check) => (
              <StatusCard check={check} key={check.id} />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
