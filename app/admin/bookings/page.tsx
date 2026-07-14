'use client';

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  CopyButton,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconCircleCheck,
  IconCopy,
  IconExternalLink,
  IconEye,
  IconLink,
  IconMailForward,
  IconPlus,
  IconX,
} from '@tabler/icons-react';
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

const mutationHeaders = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
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
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [bookingAction, setBookingAction] = useState<
    'cancel' | 'email' | 'paid' | 'payment-link' | null
  >(null);
  const [manualBookingOpened, setManualBookingOpened] = useState(false);
  const [isCreatingManualBooking, setIsCreatingManualBooking] = useState(false);
  const [createdPaymentUrl, setCreatedPaymentUrl] = useState('');
  const [detailPaymentUrl, setDetailPaymentUrl] = useState('');

  const manualBookingForm = useForm({
    initialValues: {
      workshopId: searchParams.get('workshopId') || '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      participantsCount: 1,
      paid: false,
      notes: '',
    },
    validate: {
      workshopId: (value) => (value ? null : 'Pasirinkite užsiėmimą'),
      customerName: (value) => (value.trim().length >= 2 ? null : 'Įveskite vardą ir pavardę'),
      customerEmail: (value) =>
        /^\S+@\S+$/.test(value.trim()) ? null : 'Įveskite teisingą el. paštą',
      customerPhone: (value) =>
        !value.trim() || value.trim().length >= 6
          ? null
          : 'Telefonas turi būti tuščias arba bent 6 simbolių',
      participantsCount: (value) =>
        Number.isInteger(value) && value >= 1 ? null : 'Dalyvių skaičius turi būti bent 1',
    },
  });

  const bookingParams = new URLSearchParams({ site });
  if (status) bookingParams.set('status', status);
  if (workshopId) bookingParams.set('workshopId', workshopId);
  const bookingsApiUrl = `/api/admin/bookings?${bookingParams.toString()}`;
  const workshopsApiUrl = buildApiUrl('/api/workshops', { site });

  const { data, error, isLoading, mutate } = useSWR(bookingsApiUrl, bookingFetcher);
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
  const selectedWorkshopForManualBooking = useMemo(() => {
    const workshops = workshopsData?.workshops || [];
    return workshops.find((workshop: any) => workshop.id === manualBookingForm.values.workshopId);
  }, [manualBookingForm.values.workshopId, workshopsData]);

  const openManualBookingModal = () => {
    manualBookingForm.setValues({
      workshopId,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      participantsCount: 1,
      paid: false,
      notes: '',
    });
    manualBookingForm.clearErrors();
    setCreatedPaymentUrl('');
    setManualBookingOpened(true);
  };

  const createManualBooking = manualBookingForm.onSubmit(async (values) => {
    setIsCreatingManualBooking(true);
    setCreatedPaymentUrl('');
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: mutationHeaders,
        body: JSON.stringify({
          site,
          locale: 'lt',
          workshopId: values.workshopId,
          customerName: values.customerName.trim(),
          customerEmail: values.customerEmail.trim(),
          customerPhone: values.customerPhone.trim(),
          participantsCount: values.participantsCount,
          paid: values.paid,
          notes: values.notes.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.booking) {
        throw new Error(result.error || 'Nepavyko sukurti registracijos');
      }

      setCreatedPaymentUrl(result.paymentUrl || '');
      notifications.show({
        message: values.paid
          ? 'Apmokėta registracija sukurta, bilietas ir laiškas paruošti'
          : 'Neapmokėta registracija sukurta',
        color: 'green',
      });
      await mutate();
      if (values.paid) {
        setManualBookingOpened(false);
        await openBookingDetails(result.booking.id);
      } else {
        manualBookingForm.reset();
        manualBookingForm.setFieldValue('workshopId', values.workshopId);
      }
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setIsCreatingManualBooking(false);
    }
  });

  const openBookingDetails = async (bookingId: string) => {
    setIsLoadingDetails(true);
    setSelectedBooking({ id: bookingId });
    setDetailPaymentUrl('');
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.booking) {
        throw new Error(result.error || 'Nepavyko gauti registracijos');
      }
      setSelectedBooking(result.booking);
    } catch (nextError: any) {
      setSelectedBooking(null);
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const runBookingAction = async (action: 'cancel' | 'email') => {
    if (!selectedBooking?.id) return;
    if (action === 'cancel' && !confirm('Atšaukti šią neapmokėtą registraciją?')) return;

    setBookingAction(action);
    try {
      const suffix = action === 'cancel' ? 'cancel' : 'resend-confirmation';
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/${suffix}`, {
        method: 'POST',
        headers: {
          ...mutationHeaders,
        },
        body: '{}',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Veiksmas nepavyko');

      notifications.show({
        message: action === 'cancel' ? 'Registracija atšaukta' : 'Laiško siuntimas pakartotas',
        color: 'green',
      });
      await mutate();
      await openBookingDetails(selectedBooking.id);
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setBookingAction(null);
    }
  };

  const generatePaymentLink = async () => {
    if (!selectedBooking?.id) return;

    setBookingAction('payment-link');
    setDetailPaymentUrl('');
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/payment-link`, {
        method: 'POST',
        headers: mutationHeaders,
        body: '{}',
      });
      const result = await response.json();
      if (!response.ok || !result.paymentUrl) {
        throw new Error(result.error || 'Nepavyko sugeneruoti nuorodos');
      }
      setDetailPaymentUrl(result.paymentUrl);
      notifications.show({ message: 'Apmokėjimo nuoroda sugeneruota', color: 'green' });
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setBookingAction(null);
    }
  };

  const markBookingPaid = async () => {
    if (!selectedBooking?.id) return;
    if (
      !confirm(
        'Pažymėti registraciją kaip apmokėtą? Bus sugeneruotas bilietas ir siunčiamas patvirtinimo laiškas.',
      )
    ) {
      return;
    }

    setBookingAction('paid');
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/mark-paid`, {
        method: 'POST',
        headers: mutationHeaders,
        body: '{}',
      });
      const result = await response.json();
      if (!response.ok || !result.booking) {
        throw new Error(result.error || 'Nepavyko pažymėti kaip apmokėta');
      }

      notifications.show({ message: 'Registracija pažymėta kaip apmokėta', color: 'green' });
      setDetailPaymentUrl('');
      await mutate();
      await openBookingDetails(selectedBooking.id);
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setBookingAction(null);
    }
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <Title order={2}>Bookings</Title>
          <Group>
            <Button leftSection={<IconPlus size={16} />} onClick={openManualBookingModal}>
              Pridėti registraciją
            </Button>
            <Button variant="light" onClick={clearFilters}>
              Išvalyti filtrus
            </Button>
          </Group>
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
                  <Table.Th>Mokėjimas</Table.Th>
                  <Table.Th>Statusas</Table.Th>
                  <Table.Th>Sukurta</Table.Th>
                  <Table.Th />
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
                      <Badge
                        color={
                          booking.payment?.status === 'paid'
                            ? 'green'
                            : booking.payment?.status === 'refunded'
                              ? 'grape'
                              : booking.payment?.status === 'failed'
                                ? 'red'
                                : 'gray'
                        }
                        variant="light"
                      >
                        {booking.payment?.status || 'nėra'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={statusColor(booking.status)} variant="light">
                        {booking.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{formatDateTime(booking.createdAt)}</Table.Td>
                    <Table.Td>
                      <Tooltip label="Registracijos detalės">
                        <ActionIcon
                          variant="subtle"
                          aria-label="Registracijos detalės"
                          onClick={() => openBookingDetails(booking.id)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>

        <Modal
          opened={Boolean(selectedBooking)}
          onClose={() => setSelectedBooking(null)}
          title="Registracijos detalės"
          size="lg"
        >
          {isLoadingDetails || !selectedBooking?.status ? (
            <Group justify="center" py="xl">
              <Loader />
            </Group>
          ) : (
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={700}>{selectedBooking.customerName}</Text>
                  <Text size="sm">{selectedBooking.customerEmail}</Text>
                  <Text size="sm">{selectedBooking.customerPhone}</Text>
                </div>
                <Badge color={statusColor(selectedBooking.status)} variant="light">
                  {selectedBooking.status}
                </Badge>
              </Group>

              <Divider />
              <Stack gap={4}>
                <Text size="sm">
                  <strong>Renginys:</strong>{' '}
                  {selectedBooking.workshop?.titleLt || selectedBooking.workshopId}
                </Text>
                <Text size="sm">
                  <strong>Dalyviai:</strong> {selectedBooking.participantsCount}
                </Text>
                <Text size="sm">
                  <strong>Suma:</strong> {selectedBooking.totalAmount} {selectedBooking.currency}
                </Text>
                <Text size="sm">
                  <strong>Galioja iki:</strong> {formatDateTime(selectedBooking.expiresAt)}
                </Text>
                {selectedBooking.notes ? (
                  <Text size="sm">
                    <strong>Pastabos:</strong> {selectedBooking.notes}
                  </Text>
                ) : null}
              </Stack>

              <Divider />
              <Group grow align="stretch">
                <Card withBorder padding="sm" radius="sm">
                  <Text size="xs" c="dimmed">
                    Mokėjimas
                  </Text>
                  <Text fw={600}>{selectedBooking.payment?.status || 'Nėra'}</Text>
                  {selectedBooking.payment ? (
                    <Text size="xs" c="dimmed">
                      {selectedBooking.payment.provider} · {selectedBooking.payment.amount}{' '}
                      {selectedBooking.payment.currency}
                    </Text>
                  ) : null}
                </Card>
                <Card withBorder padding="sm" radius="sm">
                  <Text size="xs" c="dimmed">
                    Bilietas
                  </Text>
                  <Text fw={600}>{selectedBooking.ticket?.status || 'Nėra'}</Text>
                  {selectedBooking.ticket?.code ? (
                    <Text size="xs" c="dimmed">
                      {selectedBooking.ticket.code}
                    </Text>
                  ) : null}
                </Card>
                <Card withBorder padding="sm" radius="sm">
                  <Text size="xs" c="dimmed">
                    Laiškas
                  </Text>
                  <Text fw={600}>{selectedBooking.confirmationEmail?.status || 'Nėra'}</Text>
                  {selectedBooking.confirmationEmail?.attempts != null ? (
                    <Text size="xs" c="dimmed">
                      Bandymai: {selectedBooking.confirmationEmail.attempts}
                    </Text>
                  ) : null}
                </Card>
              </Group>

              {selectedBooking.confirmationEmail?.lastError ? (
                <Alert color="orange">{selectedBooking.confirmationEmail.lastError}</Alert>
              ) : null}

              {detailPaymentUrl ? (
                <Alert color="blue" title="Apmokėjimo nuoroda">
                  <Stack gap="sm">
                    <Text size="sm">
                      Šią nuorodą galima siųsti klientui. Ji atidarys registracijos būsenos langą su
                      pavedimo rekvizitais ir Stripe apmokėjimo mygtuku.
                    </Text>
                    <TextInput value={detailPaymentUrl} readOnly />
                    <Group gap="sm">
                      <CopyButton value={detailPaymentUrl}>
                        {({ copied, copy }) => (
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconCopy size={14} />}
                            onClick={copy}
                          >
                            {copied ? 'Nukopijuota' : 'Kopijuoti'}
                          </Button>
                        )}
                      </CopyButton>
                      <Button
                        component="a"
                        href={detailPaymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        size="xs"
                        variant="light"
                        leftSection={<IconExternalLink size={14} />}
                      >
                        Atidaryti
                      </Button>
                    </Group>
                  </Stack>
                </Alert>
              ) : null}

              <Group justify="flex-end">
                {selectedBooking.status === 'pending_payment' ? (
                  <Button
                    color="green"
                    variant="light"
                    leftSection={<IconCircleCheck size={16} />}
                    loading={bookingAction === 'paid'}
                    onClick={markBookingPaid}
                  >
                    Pažymėti apmokėta
                  </Button>
                ) : null}
                {selectedBooking.status === 'pending_payment' ? (
                  <Button
                    variant="light"
                    leftSection={<IconLink size={16} />}
                    loading={bookingAction === 'payment-link'}
                    onClick={generatePaymentLink}
                  >
                    Apmokėjimo nuoroda
                  </Button>
                ) : null}
                {selectedBooking.status === 'confirmed' &&
                selectedBooking.confirmationEmail?.status !== 'sent' ? (
                  <Button
                    variant="light"
                    leftSection={<IconMailForward size={16} />}
                    loading={bookingAction === 'email'}
                    onClick={() => runBookingAction('email')}
                  >
                    Pakartoti laišką
                  </Button>
                ) : null}
                {selectedBooking.status === 'pending_payment' ? (
                  <Button
                    color="red"
                    variant="light"
                    leftSection={<IconX size={16} />}
                    loading={bookingAction === 'cancel'}
                    onClick={() => runBookingAction('cancel')}
                  >
                    Atšaukti registraciją
                  </Button>
                ) : null}
              </Group>
            </Stack>
          )}
        </Modal>

        <Modal
          opened={manualBookingOpened}
          onClose={() => setManualBookingOpened(false)}
          title="Pridėti registraciją"
          size="lg"
        >
          <form onSubmit={createManualBooking}>
            <Stack gap="md">
              <Select
                label="Užsiėmimas"
                data={workshopOptions.filter((option) => option.value)}
                value={manualBookingForm.values.workshopId}
                onChange={(value) => manualBookingForm.setFieldValue('workshopId', value || '')}
                searchable
                required
                error={manualBookingForm.errors.workshopId}
              />
              {selectedWorkshopForManualBooking ? (
                <Alert color="gray">
                  Laisvos vietos: {selectedWorkshopForManualBooking.spotsLeft} /{' '}
                  {selectedWorkshopForManualBooking.spotsTotal}
                </Alert>
              ) : null}
              <Group grow>
                <TextInput
                  label="Vardas ir pavardė"
                  required
                  {...manualBookingForm.getInputProps('customerName')}
                />
                <TextInput
                  label="El. paštas"
                  required
                  placeholder="name@example.com"
                  {...manualBookingForm.getInputProps('customerEmail')}
                />
              </Group>
              <Group grow align="flex-start">
                <TextInput
                  label="Telefonas"
                  placeholder="+370..."
                  description="Neprivalomas"
                  {...manualBookingForm.getInputProps('customerPhone')}
                />
                <NumberInput
                  label="Dalyvių skaičius"
                  required
                  min={1}
                  max={
                    selectedWorkshopForManualBooking
                      ? Math.max(1, Number(selectedWorkshopForManualBooking.spotsLeft) || 0)
                      : undefined
                  }
                  allowDecimal={false}
                  allowNegative={false}
                  value={manualBookingForm.values.participantsCount}
                  onChange={(value) =>
                    manualBookingForm.setFieldValue(
                      'participantsCount',
                      Number(value) > 0 ? Number(value) : 1,
                    )
                  }
                  error={manualBookingForm.errors.participantsCount}
                />
              </Group>
              <Switch
                label="Jau apmokėta"
                description="Jei įjungta, iškart bus sugeneruotas bilietas ir siunčiamas patvirtinimo laiškas."
                {...manualBookingForm.getInputProps('paid', { type: 'checkbox' })}
              />
              <Textarea
                label="Pastabos"
                minRows={3}
                autosize
                {...manualBookingForm.getInputProps('notes')}
              />

              {createdPaymentUrl ? (
                <Alert color="blue" title="Apmokėjimo nuoroda klientui">
                  <Stack gap="sm">
                    <TextInput value={createdPaymentUrl} readOnly />
                    <Group gap="sm">
                      <CopyButton value={createdPaymentUrl}>
                        {({ copied, copy }) => (
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<IconCopy size={14} />}
                            onClick={copy}
                          >
                            {copied ? 'Nukopijuota' : 'Kopijuoti'}
                          </Button>
                        )}
                      </CopyButton>
                      <Button
                        component="a"
                        href={createdPaymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        size="xs"
                        variant="light"
                        leftSection={<IconExternalLink size={14} />}
                      >
                        Atidaryti
                      </Button>
                    </Group>
                  </Stack>
                </Alert>
              ) : null}

              <Group justify="flex-end">
                <Button variant="default" onClick={() => setManualBookingOpened(false)}>
                  Uždaryti
                </Button>
                <Button
                  type="submit"
                  loading={isCreatingManualBooking}
                  leftSection={<IconPlus size={16} />}
                >
                  Sukurti registraciją
                </Button>
              </Group>
            </Stack>
          </form>
        </Modal>
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
