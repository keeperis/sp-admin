'use client';

import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import useSWR from 'swr';
import { buildApiUrl } from '@/lib/api';
import type { SiteKey } from '@/lib/site';

const PROJECT_OPTIONS: Array<{ value: SiteKey; label: string }> = [
  { value: 'ceramics', label: 'Ceramics' },
  { value: 'yoga', label: 'Yoga' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Visi statusai' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_payment', label: 'Laukia mokėjimo' },
  { value: 'confirmed', label: 'Patvirtinta' },
  { value: 'cancelled', label: 'Atšaukta' },
  { value: 'expired', label: 'Pasibaigė' },
];

const bookingFetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch bookings');
  }
  return data;
};

const formatDateTime = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('lt-LT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const statusColor = (status: string) => {
  if (status === 'confirmed') return 'green';
  if (status === 'pending_payment') return 'orange';
  if (status === 'cancelled') return 'red';
  if (status === 'expired') return 'gray';
  return 'blue';
};

function BookingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [site, setSite] = useState<SiteKey>(
    searchParams.get('site') === 'yoga' ? 'yoga' : 'ceramics',
  );
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [workshopId, setWorkshopId] = useState(searchParams.get('workshopId') || '');

  const bookingsApiUrl = buildApiUrl('/api/bookings', {
    site,
    status: status || undefined,
    workshopId: workshopId || undefined,
  });
  const workshopsApiUrl = buildApiUrl('/api/workshops', { site });

  const { data, error, isLoading } = useSWR(bookingsApiUrl, bookingFetcher);
  const { data: workshopsData } = useSWR(workshopsApiUrl, bookingFetcher);

  const workshopOptions = useMemo(() => {
    const workshops = workshopsData?.workshops || [];
    return [
      { value: '', label: 'Visi renginiai' },
      ...workshops.map((workshop: any) => ({
        value: workshop.id,
        label: `${workshop.titleLt} (${workshop.startISO?.replace('T', ' ') || '-'})`,
      })),
    ];
  }, [workshopsData]);

  const syncUrl = (next: { site?: SiteKey; status?: string; workshopId?: string }) => {
    const nextSite = next.site ?? site;
    const nextStatus = next.status ?? status;
    const nextWorkshopId = next.workshopId ?? workshopId;
    const params = new URLSearchParams();
    params.set('site', nextSite);
    if (nextStatus) params.set('status', nextStatus);
    if (nextWorkshopId) params.set('workshopId', nextWorkshopId);
    router.replace(`/admin/bookings?${params.toString()}`);
  };

  const clearFilters = () => {
    setStatus('');
    setWorkshopId('');
    syncUrl({ status: '', workshopId: '' });
  };

  const bookings = data?.bookings || [];

  return (
    <Container size="xl" py="md">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <Title order={2}>Bookings</Title>
          <Button variant="light" onClick={clearFilters}>
            Išvalyti filtrus
          </Button>
        </Group>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group align="flex-end">
              <Select
                label="Project"
                data={PROJECT_OPTIONS}
                value={site}
                onChange={(value) => {
                  const nextSite = value === 'yoga' ? 'yoga' : 'ceramics';
                  setSite(nextSite);
                  setWorkshopId('');
                  syncUrl({ site: nextSite, workshopId: '' });
                }}
                allowDeselect={false}
                w={170}
              />
              <Select
                label="Statusas"
                data={STATUS_OPTIONS}
                value={status}
                onChange={(value) => {
                  const nextStatus = value || '';
                  setStatus(nextStatus);
                  syncUrl({ status: nextStatus });
                }}
                allowDeselect={false}
                w={220}
              />
              <Select
                label="Renginys"
                data={workshopOptions}
                value={workshopId}
                onChange={(value) => {
                  const nextWorkshopId = value || '';
                  setWorkshopId(nextWorkshopId);
                  syncUrl({ workshopId: nextWorkshopId });
                }}
                searchable
                allowDeselect={false}
                style={{ flex: 1, minWidth: 260 }}
              />
              <TextInput label="Workshop ID" value={workshopId} readOnly w={260} />
            </Group>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>Registracijos</Title>
            <Text size="sm" c="dimmed">
              {isLoading ? 'Kraunama...' : `${bookings.length} įrašai`}
            </Text>
          </Group>

          {error ? (
            <Text c="red">{error.message}</Text>
          ) : bookings.length === 0 && !isLoading ? (
            <Text c="dimmed">Registracijų pagal pasirinktus filtrus nėra.</Text>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Klientas</Table.Th>
                  <Table.Th>Kontaktai</Table.Th>
                  <Table.Th>Renginys</Table.Th>
                  <Table.Th>Dalyviai</Table.Th>
                  <Table.Th>Suma</Table.Th>
                  <Table.Th>Statusas</Table.Th>
                  <Table.Th>Sukurta</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {bookings.map((booking: any) => (
                  <Table.Tr key={booking.id}>
                    <Table.Td>
                      <Text fw={500}>{booking.customerName}</Text>
                      <Text size="xs" c="dimmed">
                        {booking.source}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm">{booking.customerEmail}</Text>
                        <Text size="sm">{booking.customerPhone}</Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {booking.workshop?.titleLt || booking.workshopId}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {booking.workshop?.startISO
                          ? booking.workshop.startISO.replace('T', ' ')
                          : '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>{booking.participantsCount}</Table.Td>
                    <Table.Td>
                      {booking.totalAmount} {booking.currency}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={statusColor(booking.status)} variant="light">
                        {booking.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{formatDateTime(booking.createdAt)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>
      </Stack>
    </Container>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<Text c="dimmed">Kraunama...</Text>}>
      <BookingsPageContent />
    </Suspense>
  );
}
