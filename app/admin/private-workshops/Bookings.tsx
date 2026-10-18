'use client';

import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCheck, IconMail, IconRefresh } from '@tabler/icons-react';
import { useState } from 'react';
import {
  bookingStatuses,
  completionPreview,
  localDateTime,
  money,
  PRIVATE_API,
  privateRequest,
} from '@/lib/private-workshops/admin';
import type { PrivateWorkshopBooking } from '@/lib/private-workshops/types';

type BookingAction = 'mark_paid' | 'cancel' | 'complete' | 'resend_email';
type ActionPayload = {
  action: BookingAction;
  actualParticipants?: number;
  adminNotes?: string;
  emailKind?: 'requested' | 'confirmed';
};

function EmailState({
  label,
  value,
}: {
  label: string;
  value?: { status: string; lastError?: string | null };
}) {
  const labels: Record<string, string> = {
    sent: 'Išsiųstas',
    delivered: 'Pristatytas',
    queued: 'Eilėje',
    pending: 'Laukia siuntimo',
    failed: 'Nepavyko',
    sending: 'Siunčiamas',
  };
  return (
    <Stack gap={2}>
      <Text size="sm">
        {label}: {value ? labels[value.status] || value.status : 'Dar nesiųstas'}
      </Text>
      {value?.lastError && (
        <Text size="xs" c="red" style={{ overflowWrap: 'anywhere' }}>
          {value.lastError}
        </Text>
      )}
    </Stack>
  );
}

export function BookingDetails({
  booking,
  onUpdated,
}: {
  booking: PrivateWorkshopBooking;
  onUpdated: (booking: PrivateWorkshopBooking) => void;
}) {
  const [action, setAction] = useState<ActionPayload | null>(null);
  const [participants, setParticipants] = useState(
    booking.actualParticipants ?? booking.quote.selection.participantsCount,
  );
  const [notes, setNotes] = useState(booking.adminNotes || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const preview = completionPreview(booking, participants);
  const status = bookingStatuses[booking.status];
  const mayComplete =
    booking.status === 'confirmed' && new Date(booking.quote.endISO).getTime() <= Date.now();
  async function submit() {
    if (!action) return;
    setBusy(true);
    setError('');
    try {
      const result = await privateRequest<{ booking: PrivateWorkshopBooking }>(
        `${PRIVATE_API}/bookings/${encodeURIComponent(booking.id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            ...action,
            adminNotes: notes,
            ...(action.action === 'complete' ? { actualParticipants: participants } : {}),
          }),
        },
      );
      setAction(null);
      onUpdated(result.booking);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Nepavyko atlikti veiksmo.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Stack style={{ overflowWrap: 'anywhere' }}>
      <Group justify="space-between">
        <Title order={4}>{booking.customerName}</Title>
        <Badge color={status.color} style={{ height: 'auto', whiteSpace: 'normal' }}>
          {status.label}
        </Badge>
      </Group>
      <Text size="sm">
        {booking.customerEmail}
        <br />
        {booking.customerPhone}
      </Text>
      <Text size="sm">Rezervacijos nr.: {booking.reference}</Text>
      <Divider />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Text size="sm">
          <b>Dirbtuvės:</b> {booking.quote.workshopType.titleLt}
        </Text>
        <Text size="sm">
          <b>Vieta:</b> {booking.placeName || '–'}
        </Text>
        <Text size="sm">
          <b>Pradžia:</b> {localDateTime(booking.quote.startISO)}
        </Text>
        <Text size="sm">
          <b>Pabaiga:</b> {localDateTime(booking.quote.endISO)}
        </Text>
        <Text size="sm">
          <b>Registruota:</b> {localDateTime(booking.createdAt)}
        </Text>
        <Text size="sm">
          <b>Apmokėti iki:</b> {localDateTime(booking.expiresAt)}
        </Text>
        <Text size="sm">
          <b>Dalyviai:</b> {booking.quote.selection.participantsCount} (mažiausiai{' '}
          {booking.quote.minimumParticipants})
        </Text>
        <Text size="sm">
          <b>Kaina asmeniui:</b> {money(booking.quote.pricePerPersonEur)}
        </Text>
      </SimpleGrid>
      <Card withBorder>
        <Stack gap="xs">
          <Text fw={600}>Mokėjimas pavedimu</Text>
          <Text>
            Rezervacijai: <b>{money(booking.quote.depositEur)}</b> už minimalų dalyvių skaičių
          </Text>
          <Text size="sm">Preliminari suma: {money(booking.quote.estimatedTotalEur)}</Text>
          <Text size="sm">
            Papildomos paslaugos: {money(booking.quote.addonsTotalEur)} · apmokamos po užsiėmimo
          </Text>
          <Text size="sm">
            Preliminarus likutis po užsiėmimo: {money(booking.quote.remainingEstimateEur)}
          </Text>
          <Text size="sm">Pavedimo gavimas pažymėtas: {localDateTime(booking.paidAt)}</Text>
          <Text size="sm">Mokėjimo paskirtis: {booking.bankTransfer.paymentPurpose}</Text>
          <Text size="xs" c="dimmed">
            {booking.bankTransfer.beneficiaryName} · {booking.bankTransfer.iban}
          </Text>
          {booking.finalTotalEur !== null && (
            <>
              <Divider />
              <Text>Faktinis dalyvių skaičius: {booking.actualParticipants}</Text>
              <Text fw={600}>Galutinė suma: {money(booking.finalTotalEur)}</Text>
              <Text>Po užsiėmimo mokėtinas likutis: {money(booking.balanceDueEur ?? 0)}</Text>
            </>
          )}
        </Stack>
      </Card>
      {booking.quote.addons.length > 0 && (
        <Stack gap="xs">
          <Text fw={600}>Pasirinktos papildomos paslaugos</Text>
          {booking.quote.addons.map((addon) => (
            <Text size="sm" key={addon.id}>
              {addon.titleLt} · {money(addon.priceEur)}
              {addon.durationMin ? ` · +${addon.durationMin} min.` : ''}
            </Text>
          ))}
        </Stack>
      )}
      <Stack gap="xs">
        <Text fw={600}>
          Mokėtojas: {booking.buyerType === 'business' ? 'Įmonė' : 'Fizinis asmuo'}
        </Text>
        {booking.billingDetails && (
          <Text size="sm">
            {booking.billingDetails.companyName}
            <br />
            Įmonės kodas: {booking.billingDetails.companyCode}
            <br />
            PVM kodas: {booking.billingDetails.vatCode || '–'}
            <br />
            {booking.billingDetails.companyAddress}
          </Text>
        )}
      </Stack>
      {booking.notes && (
        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
          Kliento pastabos: {booking.notes}
        </Text>
      )}
      {booking.legalAcceptance ? (
        <details>
          <summary>Registruojantis patvirtintos sąlygos</summary>
          <Stack mt="sm" gap="xs">
            <Text fw={600}>{booking.legalAcceptance.termsSnapshot.title}</Text>
            <Text size="sm">Redakcija: {booking.legalAcceptance.termsVersion}</Text>
            <Text size="sm">Sutikta: {localDateTime(booking.legalAcceptance.termsAcceptedAt)}</Text>
            {booking.legalAcceptance.termsSnapshot.sections.map((section) => (
              <Stack key={section.title} gap={4}>
                <Text size="sm" fw={600}>
                  {section.title}
                </Text>
                {section.paragraphs.map((paragraph) => (
                  <Text key={paragraph} size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {paragraph}
                  </Text>
                ))}
              </Stack>
            ))}
          </Stack>
        </details>
      ) : booking.cancellationTerms || booking.reschedulingTerms ? (
        <details>
          <summary>Registruojantis patvirtintos sąlygos</summary>
          <Stack mt="sm" gap="xs">
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {booking.cancellationTerms}
            </Text>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {booking.reschedulingTerms}
            </Text>
          </Stack>
        </details>
      ) : null}
      <Divider />
      <Title order={5}>Laiškų pristatymas</Title>
      <EmailState label="Rezervacijos informacija" value={booking.emails?.requested} />
      <EmailState label="Patvirtinimas ir atmintinė" value={booking.emails?.confirmed} />
      <Group>
        {booking.status === 'pending_transfer' && (
          <Button
            size="xs"
            variant="light"
            leftSection={<IconMail size={14} />}
            onClick={() => setAction({ action: 'resend_email', emailKind: 'requested' })}
          >
            Persiųsti rezervacijos informaciją
          </Button>
        )}
        {booking.paidAt && (booking.status === 'confirmed' || booking.status === 'completed') && (
          <Button
            size="xs"
            variant="light"
            leftSection={<IconMail size={14} />}
            onClick={() => setAction({ action: 'resend_email', emailKind: 'confirmed' })}
          >
            Persiųsti patvirtinimą
          </Button>
        )}
      </Group>
      <Divider />
      <Textarea
        label="Administratoriaus pastabos veiksmui"
        description="Išsaugomos kartu su toliau pasirinktu veiksmu."
        value={notes}
        onChange={(event) => setNotes(event.currentTarget.value)}
        minRows={2}
        autosize
      />
      <Group>
        {booking.status === 'pending_transfer' && (
          <Button
            color="green"
            leftSection={<IconCheck size={16} />}
            onClick={() => setAction({ action: 'mark_paid' })}
          >
            Pavedimas gautas
          </Button>
        )}
        {booking.status === 'confirmed' && (
          <Button
            variant="light"
            disabled={!mayComplete}
            onClick={() => setAction({ action: 'complete' })}
          >
            Užbaigti užsiėmimą
          </Button>
        )}
        {(booking.status === 'pending_transfer' || booking.status === 'confirmed') && (
          <Button color="red" variant="light" onClick={() => setAction({ action: 'cancel' })}>
            Atšaukti rezervaciją
          </Button>
        )}
      </Group>
      {booking.status === 'confirmed' && !mayComplete && (
        <Text size="xs" c="dimmed">
          Galutinį dalyvių skaičių galima užfiksuoti pasibaigus užsiėmimui.
        </Text>
      )}
      <Modal
        opened={!!action}
        onClose={() => {
          if (!busy) {
            setAction(null);
            setError('');
          }
        }}
        title={
          action?.action === 'mark_paid'
            ? 'Patvirtinti gautą pavedimą'
            : action?.action === 'cancel'
              ? 'Atšaukti rezervaciją'
              : action?.action === 'complete'
                ? 'Faktinis dalyvių skaičius'
                : 'Pakartotinai siųsti laišką'
        }
        centered
        size="md"
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
      >
        <Stack>
          {error && <Alert color="red">{error}</Alert>}
          {action?.action === 'mark_paid' && (
            <Text>
              Ar gautas {money(booking.quote.depositEur)} pavedimas? Klientui bus išsiųstas
              rezervacijos patvirtinimas su atmintine.
            </Text>
          )}
          {action?.action === 'cancel' && (
            <Alert color="orange">
              Rezervacija bus atšaukta, jos laikas atlaisvintas. Šis veiksmas negrąžina pinigų
              automatiškai.
            </Alert>
          )}
          {action?.action === 'resend_email' && (
            <Text>Laiškas bus pakartotinai išsiųstas adresu {booking.customerEmail}.</Text>
          )}
          {action?.action === 'complete' && (
            <>
              <NumberInput
                label="Faktinis dalyvių skaičius"
                min={0}
                max={booking.quote.workshopType.maxParticipants}
                allowDecimal={false}
                value={participants}
                onChange={(value) => setParticipants(Number(value))}
              />
              <Text size="sm">
                Apmokestinama ne mažiau kaip už {booking.quote.minimumParticipants} dalyvius.
                Papildomos paslaugos įtrauktos.
              </Text>
              <Text>
                Galutinė suma: <b>{money(preview.total)}</b>
              </Text>
              <Text>
                Likutis po užsiėmimo: <b>{money(preview.balance)}</b>
              </Text>
              <Text size="xs" c="dimmed">
                Galutinę sumą serveris perskaičiuoja pagal rezervacijos metu išsaugotas kainas.
              </Text>
            </>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={busy}
              onClick={() => {
                setAction(null);
                setError('');
              }}
            >
              Grįžti
            </Button>
            <Button
              color={action?.action === 'cancel' ? 'red' : undefined}
              loading={busy}
              onClick={() => void submit()}
            >
              Patvirtinti
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

export function Bookings({
  bookings,
  onRefresh,
  onUpdated,
  refreshing,
}: {
  bookings: PrivateWorkshopBooking[];
  onRefresh: () => void;
  onUpdated: (booking: PrivateWorkshopBooking) => void;
  refreshing: boolean;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = bookings.find((booking) => booking.id === selectedId);
  const visible = bookings.filter(
    (booking) =>
      (!status || booking.status === status) &&
      `${booking.customerName} ${booking.customerEmail} ${booking.reference}`
        .toLocaleLowerCase('lt')
        .includes(search.trim().toLocaleLowerCase('lt')),
  );
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Privačių užsiėmimų rezervacijos</Title>
        <Button
          variant="light"
          loading={refreshing}
          leftSection={<IconRefresh size={16} />}
          onClick={onRefresh}
        >
          Atnaujinti
        </Button>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Select
          label="Būsena"
          placeholder="Visos būsenos"
          clearable
          data={Object.entries(bookingStatuses).map(([value, state]) => ({
            value,
            label: state.label,
          }))}
          value={status}
          onChange={setStatus}
        />
        <TextInput
          label="Klientas arba rezervacijos numeris"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
      </SimpleGrid>
      <Text size="sm" c="dimmed">
        Rodoma rezervacijų: {visible.length}
      </Text>
      {!visible.length && (
        <Card withBorder>
          <Text c="dimmed">Rezervacijų nėra.</Text>
        </Card>
      )}
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        {visible.map((booking) => (
          <Card withBorder key={booking.id} style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={600}>{booking.customerName}</Text>
                <Badge
                  color={bookingStatuses[booking.status].color}
                  style={{ height: 'auto', whiteSpace: 'normal' }}
                >
                  {bookingStatuses[booking.status].label}
                </Badge>
              </Group>
              <Text size="sm">
                {booking.customerEmail}
                <br />
                {booking.customerPhone}
              </Text>
              <Text>{booking.quote.workshopType.titleLt}</Text>
              <Text size="sm">
                {localDateTime(booking.quote.startISO)} ·{' '}
                {booking.quote.selection.participantsCount} dalyvių
              </Text>
              <Text size="sm">
                Rezervacijai: <b>{money(booking.quote.depositEur)}</b> · preliminariai{' '}
                {money(booking.quote.estimatedTotalEur)}
              </Text>
              <Text size="xs" c="dimmed">
                {booking.reference} · registruota {localDateTime(booking.createdAt)}
              </Text>
              <Button variant="light" onClick={() => setSelectedId(booking.id)}>
                Rezervacijos detalės
              </Button>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
      <Modal
        opened={!!selected}
        onClose={() => setSelectedId(null)}
        title="Privačios rezervacijos detalės"
        size="lg"
        centered
      >
        {selected && (
          <BookingDetails
            key={`${selected.id}-${selected.status}`}
            booking={selected}
            onUpdated={onUpdated}
          />
        )}
      </Modal>
    </Stack>
  );
}
