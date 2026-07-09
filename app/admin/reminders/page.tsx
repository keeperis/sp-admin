'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconSearch, IconUserOff } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import type { SiteKey } from '@/lib/site';

type ReminderChannel = 'email' | 'sms';
type ReminderStatus = 'active' | 'withdrawn';
type WorkshopInterest = 'ongoing' | 'one_time' | 'all';

interface ReminderSubscription {
  channels: ReminderChannel[];
  consentedAt: string;
  consentVersion: string;
  createdAt: string;
  email: string | null;
  id: string;
  locale: 'lt' | 'en';
  phone: string | null;
  privacyNoticeVersion: string;
  site: 'ceramics' | 'yoga';
  sourceWorkshop: {
    id: string;
    startISO: string;
    titleEn: string;
    titleLt: string;
  } | null;
  status: ReminderStatus;
  updatedAt: string;
  withdrawnAt: string | null;
  workshopInterest: WorkshopInterest;
}

interface ReminderListResponse {
  limit: number;
  subscriptions: ReminderSubscription[];
}

const PROJECT_OPTIONS: Array<{ value: SiteKey; label: string }> = [
  { value: 'ceramics', label: 'Ceramics' },
  { value: 'yoga', label: 'Yoga' },
];

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Nepavyko gauti prenumeratorių');
  return data as ReminderListResponse;
};

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('lt-LT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function interestLabel(interest: WorkshopInterest) {
  if (interest === 'ongoing') return 'Nuolatiniai užsiėmimai';
  if (interest === 'one_time') return 'Vieno karto dirbtuvės';
  return 'Visi nauji užsiėmimai';
}

function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export default function ReminderSubscribersPage() {
  const [site, setSite] = useState<SiteKey>('ceramics');
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [interest, setInterest] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 350);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({ site });
    if (status) params.set('status', status);
    if (channel) params.set('channel', channel);
    if (interest) params.set('interest', interest);
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    return `/api/admin/reminders?${params.toString()}`;
  }, [channel, debouncedSearch, interest, site, status]);

  const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher);
  const subscriptions = data?.subscriptions || [];

  const clearFilters = () => {
    setStatus('');
    setChannel('');
    setInterest('');
    setSearch('');
  };

  const withdrawSubscription = async (subscription: ReminderSubscription) => {
    if (
      !confirm(
        `Atšaukti priminimų prenumeratą kontaktui ${subscription.email || subscription.phone || subscription.id}?`,
      )
    ) {
      return;
    }

    setWithdrawingId(subscription.id);
    try {
      const response = await fetch(`/api/admin/reminders/${subscription.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ status: 'withdrawn' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nepavyko atšaukti prenumeratos');
      notifications.show({ message: 'Prenumerata atšaukta', color: 'green' });
      await mutate();
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setWithdrawingId(null);
    }
  };

  const exportCsv = () => {
    const headers = [
      'El. paštas',
      'Telefonas',
      'Kanalai',
      'Interesas',
      'Statusas',
      'Sutikimo data',
      'Sutikimo versija',
      'Privatumo versija',
      'Šaltinio užsiėmimas',
      'Atšaukimo data',
    ];
    const rows = subscriptions.map((subscription) => [
      subscription.email,
      subscription.phone,
      subscription.channels.join(', '),
      interestLabel(subscription.workshopInterest),
      subscription.status,
      subscription.consentedAt,
      subscription.consentVersion,
      subscription.privacyNoticeVersion,
      subscription.sourceWorkshop?.titleLt || '',
      subscription.withdrawnAt || '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `priminimu-prenumeratoriai-${site}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2}>Priminimų prenumeratoriai</Title>
            <Text size="sm" c="dimmed" mt={4}>
              El. pašto ir SMS sutikimai apie naujus užsiėmimus
            </Text>
          </div>
          <Group>
            <Button variant="light" onClick={clearFilters}>
              Išvalyti filtrus
            </Button>
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={exportCsv}
              disabled={subscriptions.length === 0}
            >
              Eksportuoti CSV
            </Button>
          </Group>
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group align="flex-end" wrap="wrap">
            <Select
              label="Projektas"
              data={PROJECT_OPTIONS}
              value={site}
              onChange={(value) => setSite(value === 'yoga' ? 'yoga' : 'ceramics')}
              allowDeselect={false}
              w={170}
            />
            <Select
              label="Statusas"
              data={[
                { value: '', label: 'Visi statusai' },
                { value: 'active', label: 'Aktyvūs' },
                { value: 'withdrawn', label: 'Atšaukti' },
              ]}
              value={status}
              onChange={(value) => setStatus(value || '')}
              allowDeselect={false}
              w={180}
            />
            <Select
              label="Kanalas"
              data={[
                { value: '', label: 'Visi kanalai' },
                { value: 'email', label: 'El. paštas' },
                { value: 'sms', label: 'SMS' },
              ]}
              value={channel}
              onChange={(value) => setChannel(value || '')}
              allowDeselect={false}
              w={180}
            />
            <Select
              label="Užsiėmimų tipas"
              data={[
                { value: '', label: 'Visi tipai' },
                { value: 'ongoing', label: 'Nuolatiniai' },
                { value: 'one_time', label: 'Vieno karto' },
                { value: 'all', label: 'Visi nauji' },
              ]}
              value={interest}
              onChange={(value) => setInterest(value || '')}
              allowDeselect={false}
              w={190}
            />
            <TextInput
              label="Paieška"
              placeholder="El. paštas arba telefonas"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              style={{ flex: 1, minWidth: 240 }}
            />
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Prenumeratoriai</Title>
            <Text size="sm" c="dimmed">
              {isLoading ? 'Kraunama...' : `${subscriptions.length} įrašai`}
            </Text>
          </Group>

          {error ? (
            <Alert color="red">{error.message}</Alert>
          ) : isLoading ? (
            <Group justify="center" py="xl">
              <Loader />
            </Group>
          ) : subscriptions.length === 0 ? (
            <Text c="dimmed">Prenumeratorių pagal pasirinktus filtrus nėra.</Text>
          ) : (
            <Table.ScrollContainer minWidth={1100}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Kontaktai</Table.Th>
                    <Table.Th>Kanalai</Table.Th>
                    <Table.Th>Užsiėmimų tipas</Table.Th>
                    <Table.Th>Šaltinis</Table.Th>
                    <Table.Th>Sutikimas</Table.Th>
                    <Table.Th>Statusas</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {subscriptions.map((subscription) => (
                    <Table.Tr key={subscription.id}>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text size="sm">{subscription.email || '-'}</Text>
                          <Text size="sm">{subscription.phone || '-'}</Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6}>
                          {subscription.channels.map((item) => (
                            <Badge
                              key={item}
                              variant="light"
                              color={item === 'sms' ? 'violet' : 'blue'}
                            >
                              {item === 'sms' ? 'SMS' : 'El. paštas'}
                            </Badge>
                          ))}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{interestLabel(subscription.workshopInterest)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {subscription.sourceWorkshop?.titleLt || 'Pilnos grupės langas'}
                        </Text>
                        {subscription.sourceWorkshop?.startISO ? (
                          <Text size="xs" c="dimmed">
                            {formatDateTime(subscription.sourceWorkshop.startISO)}
                          </Text>
                        ) : null}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDateTime(subscription.consentedAt)}</Text>
                        <Text size="xs" c="dimmed">
                          {subscription.consentVersion} · privatumas{' '}
                          {subscription.privacyNoticeVersion}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={subscription.status === 'active' ? 'green' : 'gray'}
                          variant="light"
                        >
                          {subscription.status === 'active' ? 'Aktyvi' : 'Atšaukta'}
                        </Badge>
                        {subscription.withdrawnAt ? (
                          <Text size="xs" c="dimmed" mt={4}>
                            {formatDateTime(subscription.withdrawnAt)}
                          </Text>
                        ) : null}
                      </Table.Td>
                      <Table.Td>
                        {subscription.status === 'active' ? (
                          <Button
                            size="xs"
                            color="red"
                            variant="light"
                            leftSection={<IconUserOff size={14} />}
                            loading={withdrawingId === subscription.id}
                            onClick={() => withdrawSubscription(subscription)}
                          >
                            Atšaukti
                          </Button>
                        ) : null}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
