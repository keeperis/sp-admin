'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  CopyButton,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconCircleCheck,
  IconCopy,
  IconExternalLink,
  IconMailForward,
  IconMessage,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { type ReactNode, useMemo, useState } from 'react';
import {
  bookingPaymentStatusLabel,
  bookingWorkshopName,
  deletedWorkshopLabel,
  formatDateTime,
  statusColor,
  statusLabel,
} from '@/lib/reservations/presentation';
import type { SiteKey } from '@/lib/site';
import {
  filterWorkshops,
  type WorkshopSummary,
  workshopTimeKey,
} from '@/lib/workshop-reservations';
import { BookingRegistrationDetails } from './BookingRegistrationDetails';

const mutationHeaders = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
};

type ReservationActions = {
  openBookingDetails: (id: string) => Promise<void>;
  openManualBooking: (workshopId?: string) => void;
  openMessageTemplate: () => Promise<void>;
};

export function ReservationManager({
  site,
  workshops,
  nowKey,
  onChanged,
  children,
}: {
  site: SiteKey;
  workshops: WorkshopSummary[];
  nowKey: string;
  onChanged: () => Promise<unknown>;
  children: (actions: ReservationActions) => ReactNode;
}) {
  const mutate = onChanged;
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [bookingAction, setBookingAction] = useState<
    'cancel' | 'delete' | 'email' | 'paid' | 'reservation-message' | null
  >(null);
  const [manualBookingOpened, setManualBookingOpened] = useState(false);
  const [isCreatingManualBooking, setIsCreatingManualBooking] = useState(false);
  const [createdPaymentUrl, setCreatedPaymentUrl] = useState('');
  const [createdReservationMessage, setCreatedReservationMessage] = useState('');
  const [detailPaymentUrl, setDetailPaymentUrl] = useState('');
  const [detailReservationMessage, setDetailReservationMessage] = useState('');
  const [messageTemplateOpened, setMessageTemplateOpened] = useState(false);
  const [isLoadingMessageTemplate, setIsLoadingMessageTemplate] = useState(false);
  const [isSavingMessageTemplate, setIsSavingMessageTemplate] = useState(false);
  const [messageTemplatePlaceholders, setMessageTemplatePlaceholders] = useState<
    Array<{ key: string; label: string }>
  >([]);

  const manualBookingForm = useForm({
    initialValues: {
      workshopId: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      participantsCount: 1,
      reservationDurationHours: 48,
      notes: '',
    },
    validate: {
      workshopId: (value) => (value ? null : 'Pasirinkite užsiėmimą'),
      customerName: (value) => (value.trim().length >= 2 ? null : 'Įveskite vardą ir pavardę'),
      customerEmail: (value) =>
        !value.trim() || /^\S+@\S+\.\S+$/.test(value.trim())
          ? null
          : 'Palikite tuščią arba įveskite teisingą el. paštą',
      customerPhone: (value) =>
        !value.trim() || value.trim().length >= 6
          ? null
          : 'Telefonas turi būti tuščias arba bent 6 simbolių',
      participantsCount: (value) =>
        Number.isInteger(value) && value >= 1 ? null : 'Dalyvių skaičius turi būti bent 1',
      reservationDurationHours: (value) =>
        Number.isInteger(value) && value >= 1 && value <= 720
          ? null
          : 'Trukmė turi būti nuo 1 iki 720 valandų',
    },
  });

  const messageTemplateForm = useForm({
    initialValues: { template: '' },
    validate: {
      template: (value) => (value.trim() ? null : 'Šablono tekstas negali būti tuščias'),
    },
  });

  const upcomingWorkshopOptions = useMemo(
    () =>
      filterWorkshops(workshops, 'upcoming', nowKey)
        .filter((workshop) => Boolean(workshopTimeKey(workshop.startISO)))
        .map((workshop) => ({
          value: workshop.id,
          label: `${workshop.titleLt} (${workshop.startISO.replace('T', ' ')})`,
        })),
    [workshops, nowKey],
  );

  const selectedWorkshopForManualBooking = workshops.find(
    (workshop) => workshop.id === manualBookingForm.values.workshopId,
  );

  const openManualBookingModal = (workshopId = '') => {
    const selectedUpcomingWorkshopId = upcomingWorkshopOptions.some(
      (option) => option.value === workshopId,
    )
      ? workshopId
      : '';
    manualBookingForm.setValues({
      workshopId: selectedUpcomingWorkshopId,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      participantsCount: 1,
      reservationDurationHours: 48,
      notes: '',
    });
    manualBookingForm.clearErrors();
    setCreatedPaymentUrl('');
    setCreatedReservationMessage('');
    setManualBookingOpened(true);
  };

  const createManualBooking = manualBookingForm.onSubmit(async (values) => {
    setIsCreatingManualBooking(true);
    setCreatedPaymentUrl('');
    setCreatedReservationMessage('');
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
          reservationDurationHours: values.reservationDurationHours,
          notes: values.notes.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.booking) {
        throw new Error(result.error || 'Nepavyko sukurti rezervacijos');
      }

      setCreatedPaymentUrl(result.paymentUrl || '');
      setCreatedReservationMessage(result.reservationMessage?.text || '');
      notifications.show({
        message: 'Neapmokėta rezervacija ir pranešimas klientui sukurti',
        color: 'green',
      });
      await mutate();
      manualBookingForm.reset();
      manualBookingForm.setFieldValue('workshopId', values.workshopId);
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
    setDetailReservationMessage('');
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.booking) {
        throw new Error(result.error || 'Nepavyko gauti rezervacijos');
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
    if (action === 'cancel' && !confirm('Atšaukti šią neapmokėtą rezervaciją?')) return;

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
        message: action === 'cancel' ? 'Rezervacija atšaukta' : 'Laiško siuntimas pakartotas',
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

  const generateReservationMessage = async () => {
    if (!selectedBooking?.id) return;

    setBookingAction('reservation-message');
    setDetailPaymentUrl('');
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/payment-link`, {
        method: 'POST',
        headers: mutationHeaders,
        body: '{}',
      });
      const result = await response.json();
      if (!response.ok || !result.paymentUrl) {
        throw new Error(result.error || 'Nepavyko sugeneruoti rezervacijos žinutės');
      }
      setDetailPaymentUrl(result.paymentUrl);
      setDetailReservationMessage(result.reservationMessage?.text || '');
      notifications.show({ message: 'Rezervacijos žinutė sugeneruota', color: 'green' });
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setBookingAction(null);
    }
  };

  const openMessageTemplate = async () => {
    setMessageTemplateOpened(true);
    setIsLoadingMessageTemplate(true);
    messageTemplateForm.clearErrors();
    try {
      const response = await fetch(
        `/api/admin/reservations/message-template?site=${encodeURIComponent(site)}`,
        { cache: 'no-store' },
      );
      const result = await response.json();
      if (!response.ok || typeof result.template !== 'string') {
        throw new Error(result.error || 'Nepavyko gauti pranešimo šablono');
      }
      messageTemplateForm.setValues({ template: result.template });
      setMessageTemplatePlaceholders(Array.isArray(result.placeholders) ? result.placeholders : []);
    } catch (nextError: any) {
      setMessageTemplateOpened(false);
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setIsLoadingMessageTemplate(false);
    }
  };

  const saveMessageTemplate = messageTemplateForm.onSubmit(async (values) => {
    setIsSavingMessageTemplate(true);
    try {
      const response = await fetch(
        `/api/admin/reservations/message-template?site=${encodeURIComponent(site)}`,
        {
          method: 'PUT',
          headers: mutationHeaders,
          body: JSON.stringify({ template: values.template.trim() }),
        },
      );
      const result = await response.json();
      if (!response.ok || typeof result.template !== 'string') {
        throw new Error(result.error || 'Nepavyko išsaugoti pranešimo šablono');
      }
      messageTemplateForm.setValues({ template: result.template });
      setMessageTemplateOpened(false);
      notifications.show({ message: 'Rezervacijos pranešimo šablonas išsaugotas', color: 'green' });
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setIsSavingMessageTemplate(false);
    }
  });

  const markBookingPaid = async () => {
    if (!selectedBooking?.id) return;
    if (
      !confirm(
        'Pažymėti rezervaciją kaip apmokėtą? Bus sugeneruotas bilietas ir siunčiamas patvirtinimo laiškas, jei nurodytas el. paštas.',
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

      notifications.show({ message: 'Rezervacija pažymėta kaip apmokėta', color: 'green' });
      setDetailPaymentUrl('');
      await mutate();
      await openBookingDetails(selectedBooking.id);
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setBookingAction(null);
    }
  };

  const deleteOrphanBooking = async () => {
    if (!selectedBooking?.id || selectedBooking.workshop !== null) return;
    if (
      !confirm(
        'Negrįžtamai ištrinti šią našlaitę rezervaciją? Užsiėmimas jau ištrintas, o šio veiksmo atšaukti nebus galima.',
      )
    ) {
      return;
    }

    const bookingId = selectedBooking.id;
    setBookingAction('delete');
    try {
      const response = await fetch(`/api/admin/bookings/${encodeURIComponent(bookingId)}`, {
        method: 'DELETE',
        headers: mutationHeaders,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Nepavyko ištrinti našlaitės rezervacijos');
      }

      await mutate();
      setSelectedBooking(null);
      setDetailPaymentUrl('');
      notifications.show({ message: 'Našlaitė rezervacija ištrinta', color: 'green' });
    } catch (nextError: any) {
      notifications.show({ message: nextError?.message || 'Klaida', color: 'red' });
    } finally {
      setBookingAction(null);
    }
  };

  return (
    <>
      {children({
        openBookingDetails,
        openManualBooking: openManualBookingModal,
        openMessageTemplate,
      })}
      <Modal
        opened={Boolean(selectedBooking)}
        onClose={() => setSelectedBooking(null)}
        title="Rezervacijos detalės"
        size="lg"
      >
        {isLoadingDetails || !selectedBooking?.status ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : (
          <Stack gap="md" miw={0} style={{ overflowWrap: 'anywhere' }}>
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={700}>{selectedBooking.customerName}</Text>
                <Text size="sm">{selectedBooking.customerEmail}</Text>
                <Text size="sm">{selectedBooking.customerPhone}</Text>
              </div>
              <Badge color={statusColor(selectedBooking.status)} variant="light">
                {statusLabel(selectedBooking.status)}
              </Badge>
            </Group>

            <Divider />
            <Stack gap={4}>
              <Group gap="xs" align="center">
                <Text size="sm">
                  <strong>Renginys:</strong> {bookingWorkshopName(selectedBooking)}
                </Text>
                {selectedBooking.workshop === null ? (
                  <Badge color="red" variant="light" size="sm">
                    {deletedWorkshopLabel}
                  </Badge>
                ) : null}
              </Group>
              <Text size="sm">
                <strong>Dalyviai:</strong> {selectedBooking.participantsCount}
              </Text>
              <Text size="sm">
                <strong>Suma:</strong> {selectedBooking.totalAmount} {selectedBooking.currency}
              </Text>
              <BookingRegistrationDetails booking={selectedBooking} />
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
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <Card withBorder padding="sm" radius="sm">
                <Text size="xs" c="dimmed">
                  Mokėjimo būsena
                </Text>
                <Text fw={600}>{bookingPaymentStatusLabel(selectedBooking)}</Text>
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
                <Text fw={600}>{statusLabel(selectedBooking.ticket?.status)}</Text>
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
                <Text fw={600}>{statusLabel(selectedBooking.confirmationEmail?.status)}</Text>
                {selectedBooking.confirmationEmail?.attempts != null ? (
                  <Text size="xs" c="dimmed">
                    Bandymai: {selectedBooking.confirmationEmail.attempts}
                  </Text>
                ) : null}
              </Card>
            </SimpleGrid>

            {selectedBooking.confirmationEmail?.lastError ? (
              <Alert color="orange">{selectedBooking.confirmationEmail.lastError}</Alert>
            ) : null}

            {detailPaymentUrl ? (
              <Alert color="blue" title="Pranešimas klientui">
                <Stack gap="sm">
                  <Text size="sm">
                    Nukopijuokite visą pranešimą ir išsiųskite klientui pasirinktu kanalu.
                  </Text>
                  {detailReservationMessage ? (
                    <Textarea value={detailReservationMessage} readOnly autosize minRows={10} />
                  ) : (
                    <TextInput value={detailPaymentUrl} readOnly />
                  )}
                  <Group gap="sm">
                    <CopyButton value={detailReservationMessage || detailPaymentUrl}>
                      {({ copied, copy }) => (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconCopy size={14} />}
                          onClick={copy}
                        >
                          {copied ? 'Nukopijuota' : 'Kopijuoti visą pranešimą'}
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
              {selectedBooking.workshop === null ? (
                <Button
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  loading={bookingAction === 'delete'}
                  onClick={deleteOrphanBooking}
                >
                  Ištrinti našlaitę rezervaciją
                </Button>
              ) : null}
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
                  leftSection={<IconMessage size={16} />}
                  loading={bookingAction === 'reservation-message'}
                  onClick={generateReservationMessage}
                >
                  Rezervacijos žinutė
                </Button>
              ) : null}
              {selectedBooking.customerEmail &&
              selectedBooking.status === 'confirmed' &&
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
                  Atšaukti rezervaciją
                </Button>
              ) : null}
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={manualBookingOpened}
        onClose={() => setManualBookingOpened(false)}
        title="Pridėti rezervaciją"
        size="lg"
      >
        <form onSubmit={createManualBooking}>
          <Stack gap="md">
            <Divider label="Privalomi duomenys" labelPosition="left" />
            <Select
              label="Užsiėmimas"
              data={upcomingWorkshopOptions}
              value={manualBookingForm.values.workshopId}
              onChange={(value) => manualBookingForm.setFieldValue('workshopId', value || '')}
              placeholder="Pasirinkite planuojamą užsiėmimą"
              nothingFoundMessage="Planuojamų užsiėmimų nėra"
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
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="md">
              <TextInput
                label="Vardas ir pavardė"
                required
                {...manualBookingForm.getInputProps('customerName')}
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
            </SimpleGrid>
            <NumberInput
              label="Rezervacijos trukmė"
              description="Kiek valandų klientui galios rezervacija"
              required
              min={1}
              max={720}
              suffix=" val."
              allowDecimal={false}
              allowNegative={false}
              value={manualBookingForm.values.reservationDurationHours}
              onChange={(value) =>
                manualBookingForm.setFieldValue(
                  'reservationDurationHours',
                  Number(value) > 0 ? Number(value) : 48,
                )
              }
              error={manualBookingForm.errors.reservationDurationHours}
            />

            <Divider label="Neprivalomi duomenys" labelPosition="left" mt="xs" />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" verticalSpacing="md">
              <TextInput
                label="El. paštas"
                placeholder="name@example.com"
                description="Neprivalomas"
                {...manualBookingForm.getInputProps('customerEmail')}
              />
              <TextInput
                label="Telefonas"
                placeholder="+370..."
                description="Neprivalomas"
                {...manualBookingForm.getInputProps('customerPhone')}
              />
            </SimpleGrid>
            <Textarea
              label="Pastabos"
              description="Neprivalomas"
              minRows={3}
              autosize
              {...manualBookingForm.getInputProps('notes')}
            />

            {createdPaymentUrl || createdReservationMessage ? (
              <Alert color="blue" title="Paruoštas pranešimas klientui">
                <Stack gap="sm">
                  <Text size="sm">
                    Nukopijuokite visą pranešimą ir išsiųskite klientui pasirinktu kanalu.
                  </Text>
                  <Textarea
                    value={createdReservationMessage || createdPaymentUrl}
                    readOnly
                    autosize
                    minRows={10}
                  />
                  <Group gap="sm">
                    <CopyButton value={createdReservationMessage || createdPaymentUrl}>
                      {({ copied, copy }) => (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconCopy size={14} />}
                          onClick={copy}
                        >
                          {copied ? 'Nukopijuota' : 'Kopijuoti visą pranešimą'}
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
                Sukurti rezervaciją
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={messageTemplateOpened}
        onClose={() => setMessageTemplateOpened(false)}
        title={`Rezervacijos pranešimo šablonas · ${site}`}
        size="xl"
      >
        {isLoadingMessageTemplate ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : (
          <form onSubmit={saveMessageTemplate}>
            <Stack gap="md">
              <Alert color="blue">
                Šablonas taikomas pasirinktame projekte. Kliento vardą kreipiniui sistema, esant
                veikiančiai DI paslaugai, suderina automatiškai.
              </Alert>
              <Textarea
                label="Pranešimo tekstas"
                description="Keiskite tekstą laisvai, bet neištrinkite privalomų kintamųjų."
                autosize
                minRows={16}
                maxRows={28}
                {...messageTemplateForm.getInputProps('template')}
              />
              <div>
                <Text size="sm" fw={600} mb="xs">
                  Galimi kintamieji
                </Text>
                <Group gap="xs">
                  {messageTemplatePlaceholders.map((placeholder) => (
                    <Tooltip key={placeholder.key} label={placeholder.label}>
                      <Code>{`{{${placeholder.key}}}`}</Code>
                    </Tooltip>
                  ))}
                </Group>
              </div>
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setMessageTemplateOpened(false)}>
                  Atšaukti
                </Button>
                <Button type="submit" loading={isSavingMessageTemplate}>
                  Išsaugoti šabloną
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </>
  );
}
