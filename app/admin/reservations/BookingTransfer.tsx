'use client';

import { Alert, Button, Card, Group, Loader, Select, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCalendarEvent } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import useSWR from 'swr';
import { workshopTimeKey } from '@/lib/workshop-reservations';

type TransferWorkshop = {
  id: string;
  titleLt: string;
  titleEn?: string;
  startISO: string;
  spotsLeft: number;
  placeName?: string | null;
};

type TransferOptions = {
  eligible: boolean;
  reason?: string;
  workshops: TransferWorkshop[];
};

async function fetchTransferOptions(url: string): Promise<TransferOptions> {
  const response = await fetch(url, { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Nepavyko gauti laisvų dirbtuvių');
  return result;
}

function workshopDate(startISO: string) {
  return workshopTimeKey(startISO).replace('T', ' ');
}

export function BookingTransfer({
  booking,
  disabled,
  onBusyChange,
  onTransferred,
}: {
  booking: {
    id: string;
    workshopId: string;
    customerEmail?: string | null;
    participantsCount: number;
    totalAmount: number;
    currency: string;
  };
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onTransferred: () => Promise<void>;
}) {
  const [opened, setOpened] = useState(false);
  const [workshopId, setWorkshopId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submittingRef = useRef(false);
  const requestRef = useRef<{ requestId: string; workshopId: string } | null>(null);
  const endpoint = `/api/admin/bookings/${encodeURIComponent(booking.id)}/transfer`;
  const { data, error, isLoading, mutate } = useSWR<TransferOptions>(
    opened ? endpoint : null,
    fetchTransferOptions,
    { shouldRetryOnError: false },
  );
  const selectedWorkshop = data?.workshops.find((workshop) => workshop.id === workshopId);

  const transfer = async () => {
    if (!selectedWorkshop || disabled || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    onBusyChange(true);
    setSubmitError('');
    if (requestRef.current?.workshopId !== selectedWorkshop.id) {
      requestRef.current = { requestId: crypto.randomUUID(), workshopId: selectedWorkshop.id };
    }
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          workshopId: selectedWorkshop.id,
          expectedWorkshopId: booking.workshopId,
          requestId: requestRef.current.requestId,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.transferred) {
        if (response.status >= 400 && response.status < 500) requestRef.current = null;
        if (result.code === 'BOOKING_CHANGED' || result.code === 'BOOKING_TRANSFER_IN_PROGRESS') {
          notifications.show({
            color: 'orange',
            message: result.error || 'Rezervacija keičiama. Atnaujinami jos duomenys.',
          });
          await onTransferred();
          return;
        }
        throw new Error(result.error || 'Nepavyko perregistruoti rezervacijos');
      }

      const emailStatus = result.emailDelivery?.status;
      notifications.show({
        color: booking.customerEmail && emailStatus !== 'sent' ? 'orange' : 'green',
        message: !booking.customerEmail
          ? 'Rezervacija perregistruota. El. paštas nenurodytas, todėl informuokite klientą apie pakeitimą.'
          : emailStatus === 'sent'
            ? 'Rezervacija perregistruota, laiškas apie pakeistą datą išsiųstas.'
            : 'Rezervacija perregistruota. Laiškas apie pakeistą datą dar neišsiųstas; patikrinkite jo būseną.',
      });
      setOpened(false);
      setWorkshopId(null);
      requestRef.current = null;
      // The transfer is already committed. A refresh failure must not invite a duplicate transfer.
      try {
        await onTransferred();
      } catch {
        notifications.show({
          color: 'orange',
          message:
            'Rezervacija perregistruota, bet duomenų atnaujinti nepavyko. Atnaujinkite puslapį.',
        });
      }
    } catch (nextError) {
      setSubmitError(
        nextError instanceof Error ? nextError.message : 'Nepavyko perregistruoti rezervacijos',
      );
      setWorkshopId(null);
      await mutate().catch(() => undefined);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      onBusyChange(false);
    }
  };

  if (!opened) {
    return (
      <Button
        variant="light"
        leftSection={<IconCalendarEvent size={16} />}
        disabled={disabled}
        onClick={() => setOpened(true)}
        styles={{
          label: { whiteSpace: 'normal', textAlign: 'left' },
          root: { height: 'auto', minHeight: 36 },
        }}
      >
        Perregistruoti į kitas dirbtuves
      </Button>
    );
  }

  return (
    <Card withBorder padding="md" radius="sm">
      <Stack gap="sm">
        <Text fw={600}>Perregistruoti rezervaciją</Text>
        <Text size="sm" c="dimmed">
          Pasirinkite kitas aktyvias vienkartines dirbtuves. Turi pakakti vietų visiems dalyviams (
          {booking.participantsCount}). Laikas nurodytas Vilniaus laiku.
        </Text>
        {isLoading ? (
          <Group gap="xs" role="status">
            <Loader size="sm" />
            <Text size="sm">Ieškoma laisvų dirbtuvių…</Text>
          </Group>
        ) : error ? (
          <Alert color="red" title="Nepavyko įkelti dirbtuvių">
            <Stack gap="xs">
              <Text size="sm">{error.message}</Text>
              <Button variant="light" size="xs" onClick={() => void mutate()}>
                Bandyti dar kartą
              </Button>
            </Stack>
          </Alert>
        ) : data && !data.eligible ? (
          <Alert color="orange">
            {data.reason || 'Šios rezervacijos perregistruoti negalima.'}
          </Alert>
        ) : data?.workshops.length === 0 ? (
          <Alert color="blue">
            Kitų aktyvių vienkartinių dirbtuvių, kuriose pakaktų vietų visiems dalyviams, nėra.
          </Alert>
        ) : data ? (
          <>
            <Select
              label="Naujos dirbtuvės"
              placeholder="Pasirinkite dirbtuves ir datą"
              data={data.workshops.map((workshop) => ({
                value: workshop.id,
                label: `${workshop.titleLt || workshop.titleEn} · ${workshopDate(workshop.startISO)} · Laisvų vietų: ${workshop.spotsLeft}`,
              }))}
              value={selectedWorkshop ? workshopId : null}
              onChange={setWorkshopId}
              disabled={disabled || submitting}
              searchable
              nothingFoundMessage="Dirbtuvių nerasta"
              styles={{ option: { whiteSpace: 'normal' } }}
            />
            {selectedWorkshop ? (
              <Card withBorder padding="sm" radius="sm">
                <Stack gap={4}>
                  <Text size="sm" fw={600} c="blue">
                    Pakeitimo patvirtinimas
                  </Text>
                  <Text size="sm" fw={600}>
                    {selectedWorkshop.titleLt || selectedWorkshop.titleEn}
                  </Text>
                  <Text size="sm">
                    Nauja data: {workshopDate(selectedWorkshop.startISO)} (Vilniaus laiku)
                  </Text>
                  {selectedWorkshop.placeName ? (
                    <Text size="sm">Vieta: {selectedWorkshop.placeName}</Text>
                  ) : null}
                  <Text size="sm">
                    Dalyviai: {booking.participantsCount}. Suma lieka {booking.totalAmount}{' '}
                    {booking.currency}.
                  </Text>
                  <Text size="sm">Bilieto kodas lieka tas pats ir galios naujose dirbtuvėse.</Text>
                  <Text size="sm">
                    {booking.customerEmail
                      ? `Apie pakeistą datą bus išsiųstas laiškas adresu ${booking.customerEmail}.`
                      : 'El. paštas nenurodytas. Apie pakeistą datą klientą reikės informuoti patiems.'}
                  </Text>
                </Stack>
              </Card>
            ) : null}
          </>
        ) : null}
        {submitError ? (
          <Alert color="red" role="alert">
            {submitError}
          </Alert>
        ) : null}
        <Group justify="flex-end">
          <Button
            variant="default"
            disabled={submitting}
            onClick={() => {
              setOpened(false);
              setWorkshopId(null);
              setSubmitError('');
            }}
          >
            Atšaukti
          </Button>
          <Button
            leftSection={<IconCalendarEvent size={16} />}
            loading={submitting}
            disabled={disabled || !data?.eligible || !selectedWorkshop || Boolean(error)}
            onClick={() => void transfer()}
          >
            Perregistruoti
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
