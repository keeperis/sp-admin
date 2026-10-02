'use client';

import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle, IconPlus } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import {
  type AttendanceCorrection,
  attendanceCorrectionMessage,
} from '@/lib/recurring/attendance-correction';
import {
  type AttendanceRegister,
  homeGroupLabels,
  REGISTER_MARKS,
  type RegisterGroup,
  type RegisterRow,
  registerColumns,
  registerMonths,
  registerPeriodFrames,
  registerRows,
  reservedMembershipCount,
} from '@/lib/recurring/attendance-register';
import { automaticMakeupNotification } from '@/lib/recurring/automatic-makeup';
import {
  type ParticipantEnrollment,
  participantStatusLabels,
  selectableParticipantSubscriptions,
  vilniusDate,
} from '@/lib/recurring/participants';
import { revalidateRecurringData } from '@/lib/recurring/revalidate';
import type { SiteKey } from '@/lib/site';
import { AttendanceCell, type AttendanceChange } from './AttendanceCell';
import styles from './GroupAttendanceTable.module.css';
import { GroupMembershipEditor } from './GroupMembershipEditor';

const fetcher = async (url: string): Promise<AttendanceRegister> => {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Nepavyko įkelti lankymo lentelės.');
  return data;
};

export function GroupAttendanceTable({
  site,
  group,
  canAdd,
  onAddParticipant,
  onViewParticipant,
  onEnroll,
}: {
  site: SiteKey;
  group: RegisterGroup & { name: string; durationMin: number };
  canAdd: boolean;
  onAddParticipant: () => void;
  onViewParticipant: (id: string) => Promise<void>;
  onEnroll: (enrollment: ParticipantEnrollment) => void;
}) {
  const { data, error, isLoading, mutate } = useSWR<AttendanceRegister>(
    `/api/admin/recurring/groups/${group.id}/attendance?${new URLSearchParams({ site })}`,
    fetcher,
  );
  const [selectedParticipant, setSelectedParticipant] = useState<RegisterRow | null>(null);
  const { mutate: refresh } = useSWRConfig();
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [makeupWarning, setMakeupWarning] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{
    change: AttendanceCorrection;
    name: string;
  } | null>(null);
  const recordAttendance = async (change: AttendanceChange | AttendanceCorrection) => {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setSaveError(null);
    setMakeupWarning(null);
    try {
      const response = await fetch(
        `/api/admin/recurring/groups/${group.id}/attendance?${new URLSearchParams({ site })}`,
        {
          method: 'action' in change ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify(change),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nepavyko išsaugoti lankymo.');
      notifications.show({
        color: 'green',
        title: 'action' in change ? 'Apsilankymas pataisytas' : 'Lankymas išsaugotas',
        message:
          'action' in change
            ? attendanceCorrectionMessage(result)
            : result.coverage === 'uncovered'
              ? 'Pažymėta be abonemento. Apmokėjimas nesuregistruotas, abonemento likutis nekeistas.'
              : change.result === 'attended'
                ? 'Dalyvis atvyko.'
                : 'Dalyvis neatvyko.',
      });
      if ('action' in change) setPendingRemoval(null);
      const makeupNotice = automaticMakeupNotification(result.automaticMakeup);
      if (makeupNotice) {
        notifications.show(makeupNotice);
        if (makeupNotice.color === 'yellow') setMakeupWarning(makeupNotice.message);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Nepavyko išsaugoti lankymo.');
    } finally {
      try {
        await revalidateRecurringData(refresh);
      } catch {
        setSaveError(
          (previous) => previous || 'Nepavyko atnaujinti lentelės. Įkelkite puslapį iš naujo.',
        );
      } finally {
        saveLock.current = false;
        setSaving(false);
      }
    }
  };
  const correctAttendance = (change: AttendanceCorrection, name: string) => {
    if (change.action === 'remove') {
      setSaveError(null);
      setPendingRemoval({ change, name });
    } else void recordAttendance(change);
  };
  const markPaid = async (subscriptionId: string) => {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(
        `/api/admin/recurring/subscriptions/${subscriptionId}/mark-paid?${new URLSearchParams({ site })}`,
        {
          method: 'POST',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nepavyko patvirtinti apmokėjimo.');
      notifications.show({
        color: 'green',
        title: 'Apmokėjimas pažymėtas',
        message:
          result.subscription.totalSessions === 1
            ? 'Apmokėtas vienas apsilankymas.'
            : 'Apmokėtas visas abonemento periodas. Lankymo žymos nepakeistos.',
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Nepavyko patvirtinti apmokėjimo.');
    } finally {
      try {
        await revalidateRecurringData(refresh);
      } catch {
        setSaveError(
          (previous) => previous || 'Nepavyko atnaujinti lentelės. Įkelkite puslapį iš naujo.',
        );
      } finally {
        saveLock.current = false;
        setSaving(false);
      }
    }
  };
  const columns = data ? registerColumns(data.group, data.occurrences) : [];
  const months = registerMonths(columns);
  const rows = data ? registerRows(data) : [];
  const today = vilniusDate();
  const reservedSeats = Math.max(
    data?.seats?.reservedCount || 0,
    reservedMembershipCount(data?.memberships || [], today, group.effectiveUntil),
  );
  const fullyAllocated = Boolean(
    data?.seats && (data.seats.availableCount === 0 || reservedSeats >= data.seats.capacity),
  );
  const onlyRenewals = Boolean(
    fullyAllocated && !data?.memberships?.some((member) => member.endsOn && member.endsOn > today),
  );
  const openParticipant = (row: RegisterRow) => {
    const subscriptions = selectableParticipantSubscriptions(row.subscriptions);
    if (subscriptions.length === 1) void onViewParticipant(subscriptions[0].id);
    else if (subscriptions.length > 1) setSelectedParticipant({ ...row, subscriptions });
  };

  return (
    <Paper withBorder radius="md" p={{ base: 8, sm: 'md' }} className={styles.group}>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Title order={5}>{group.name}</Title>
          <Group gap="xs">
            {data?.seats && (
              <Badge variant="light" color={fullyAllocated ? 'orange' : 'green'}>
                Rezervuota: {reservedSeats}/{data.seats.capacity}
              </Badge>
            )}
            {data && (
              <Badge variant="light" color="gray">
                Dalyvių: {rows.length}
              </Badge>
            )}
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              disabled={!canAdd}
              onClick={onAddParticipant}
              aria-label={`${onlyRenewals ? 'Pratęsti abonementą' : 'Pridėti dalyvį'}: ${group.name}`}
            >
              {onlyRenewals ? 'Pratęsti abonementą' : 'Pridėti dalyvį'}
            </Button>
          </Group>
        </Group>
        {fullyAllocated && (
          <Group
            role="note"
            aria-label="Informacija apie grupės vietas"
            gap={8}
            align="flex-start"
            wrap="nowrap"
            className={styles.capacityNotice}
          >
            <IconInfoCircle size={16} aria-hidden="true" />
            <Text size="xs" lh={1.45} c="inherit">
              Grupė pilna. Vieta saugoma iki nurodytos lankymo pabaigos. Esamo dalyvio abonemento
              pratęsimas iš jo tuščio langelio antros vietos neužima, net jei el. paštas
              nenurodytas.
            </Text>
          </Group>
        )}
        {saveError && (
          <Alert
            color="red"
            title="Veiksmo nepavyko užbaigti"
            withCloseButton
            onClose={() => setSaveError(null)}
          >
            {saveError}
          </Alert>
        )}
        {makeupWarning && (
          <Alert color="yellow" title="Lankymas išsaugotas – pakaitinis vizitas">
            {makeupWarning}
          </Alert>
        )}
        {error ? (
          <Alert color="red" title="Nepavyko įkelti dalyvių">
            {error.message}
            <Button variant="subtle" size="xs" onClick={() => void mutate()}>
              Bandyti dar kartą
            </Button>
          </Alert>
        ) : isLoading || !data ? (
          <Loader size="sm" />
        ) : (
          <>
            <section
              className={styles.scroller}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: Allow keyboard scrolling of the wide register.
              tabIndex={0}
              aria-label={`${group.name}: dalyvių ir datų lentelė`}
            >
              <table className={styles.table} aria-label={`${group.name}: lankymas`}>
                <thead>
                  <tr className={styles.monthRow}>
                    <th scope="col" rowSpan={2} className={styles.participant}>
                      Dalyvis
                    </th>
                    {months.map((month) => (
                      <th scope="colgroup" key={month.key} colSpan={month.count}>
                        {month.label}
                      </th>
                    ))}
                    {columns.length === 0 && (
                      <th scope="col" rowSpan={2}>
                        Užsiėmimų datų dar nėra
                      </th>
                    )}
                  </tr>
                  <tr className={styles.dateRow}>
                    {columns.map((column, index) => (
                      <th
                        key={column.date}
                        scope="col"
                        data-month-start={
                          index === 0 ||
                          column.date.slice(0, 7) !== columns[index - 1].date.slice(0, 7)
                        }
                        data-today={column.date === today}
                        data-cancelled={column.occurrence?.status === 'cancelled'}
                        title={`${column.date} ${column.time}${column.occurrence?.status === 'cancelled' ? ' · Užsiėmimas atšauktas' : ''}`}
                      >
                        <span>{Number(column.date.slice(8))}</span>
                        <small>{column.time}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const frames = registerPeriodFrames(row, columns);
                    const canViewParticipant =
                      selectableParticipantSubscriptions(row.subscriptions).length > 0;
                    return (
                      <tr key={row.key}>
                        <th scope="row" className={styles.participant}>
                          {canViewParticipant ? (
                            <Anchor
                              component="button"
                              type="button"
                              ta="left"
                              className={styles.name}
                              onClick={() => openParticipant(row)}
                            >
                              {index + 1}. {row.name}
                            </Anchor>
                          ) : (
                            <Text size="sm">{row.name}</Text>
                          )}
                          {row.guest && (
                            <Text size="xs" c="dimmed">
                              {homeGroupLabels(row, data).join('; ') ||
                                'Pagrindinė grupė nenurodyta'}
                            </Text>
                          )}
                          {data.memberships
                            ?.filter((member) =>
                              member.subscriptionIds.some((id) =>
                                row.subscriptions.some((item) => item.id === id),
                              ),
                            )
                            .map((membership) => (
                              <GroupMembershipEditor
                                key={membership.key}
                                membership={membership}
                                name={row.name}
                                groupId={group.id}
                                site={site}
                              />
                            ))}
                        </th>
                        {columns.map((column, columnIndex) => {
                          const reservations = row.cells.get(column.date) || [];
                          return (
                            <td
                              key={column.date}
                              data-period={frames[columnIndex]?.subscriptionId}
                              data-period-paid={frames[columnIndex]?.paid}
                              data-period-start={frames[columnIndex]?.start}
                              data-period-end={frames[columnIndex]?.end}
                              data-month-start={
                                columnIndex === 0 ||
                                column.date.slice(0, 7) !==
                                  columns[columnIndex - 1].date.slice(0, 7)
                              }
                              data-today={column.date === today}
                              title={
                                reservations.length
                                  ? undefined
                                  : `${row.name} · ${column.date} · Rezervacijos nėra`
                              }
                            >
                              {reservations.length ? (
                                reservations.map((reservation) => (
                                  <AttendanceCell
                                    key={reservation.id}
                                    row={row}
                                    column={column}
                                    reservation={reservation}
                                    busy={saving}
                                    onRecord={recordAttendance}
                                    onCorrect={correctAttendance}
                                    onMarkPaid={markPaid}
                                    onViewParticipant={onViewParticipant}
                                  />
                                ))
                              ) : (
                                <AttendanceCell
                                  row={row}
                                  column={column}
                                  busy={saving}
                                  onRecord={recordAttendance}
                                  onCorrect={correctAttendance}
                                  onViewParticipant={onViewParticipant}
                                  onEnroll={canAdd ? onEnroll : undefined}
                                />
                              )}
                            </td>
                          );
                        })}
                        {columns.length === 0 && <td />}
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td className={styles.empty} colSpan={Math.max(columns.length, 1) + 1}>
                        Šioje grupėje dalyvių dar nėra.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
            <details className={styles.legendDisclosure}>
              <summary>Žymėjimų paaiškinimai</summary>
              <div className={styles.legend}>
                {Object.entries(REGISTER_MARKS)
                  .filter(([key]) => !['scheduled', 'attended'].includes(key))
                  .map(([key, mark]) => (
                    <span key={key}>
                      <span className={styles.key} data-tone={mark.tone}>
                        {mark.symbol}
                      </span>
                      {mark.label}
                    </span>
                  ))}
                <span>
                  <span className={styles.key} data-tone="planned">
                    P
                  </span>
                  Suplanuota · apmokėjimas nepažymėtas
                </span>
                <span>
                  <span className={styles.key} data-tone="attended">
                    P
                  </span>
                  Suplanuota · apmokėta
                </span>
                <span>
                  <span className={styles.key} data-tone="planned">
                    ✓
                  </span>
                  Atvyko · apmokėjimas nepažymėtas
                </span>
                <span>
                  <span className={styles.key} data-tone="attended">
                    ✓
                  </span>
                  Atvyko · apmokėta
                </span>
                <span>↔ Perkeltas užsiėmimas</span>
                <span>
                  <span className={styles.key} data-tone="attended">
                    A↔
                  </span>
                  Atšauktas užsiėmimas atlankytas
                </span>
                <span>€ Be abonemento · apmokėjimas nesuregistruotas</span>
                <span>
                  <span className={styles.periodKey} data-period-paid="false" />
                  Vienas abonemento periodas · apmokėjimas nepažymėtas
                </span>
                <span>
                  <span className={styles.periodKey} data-period-paid="true" />
                  Vienas abonemento periodas · apmokėta
                </span>
                <span>
                  Tuščia — naujas abonemento periodas, vienas apsilankymas arba lankymo žyma
                </span>
              </div>
            </details>
          </>
        )}
      </Stack>
      <Modal
        opened={Boolean(pendingRemoval)}
        onClose={() => !saving && setPendingRemoval(null)}
        title="Pašalinti apsilankymą?"
        closeOnClickOutside={!saving}
        closeOnEscape={!saving}
        withCloseButton={!saving}
      >
        <Stack>
          <Text>
            {pendingRemoval?.name} · {pendingRemoval?.change.date}
          </Text>
          <Text size="sm">
            Apsilankymas bus pašalintas iš lankymo lentelės ir vieta atlaisvinta. Abonemento likutis
            nesikeis. Veiksmas bus išsaugotas istorijoje.
          </Text>
          {saveError && <Alert color="red">{saveError}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" disabled={saving} onClick={() => setPendingRemoval(null)}>
              Grįžti
            </Button>
            <Button
              color="red"
              loading={saving}
              onClick={() => pendingRemoval && void recordAttendance(pendingRemoval.change)}
            >
              Pašalinti apsilankymą
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={Boolean(selectedParticipant)}
        onClose={() => setSelectedParticipant(null)}
        title={selectedParticipant?.name}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Šis dalyvis turi kelis abonementus. Pasirinkite, kurio detales peržiūrėti.
          </Text>
          {selectedParticipant?.subscriptions.map((subscription) => (
            <Button
              key={subscription.id}
              variant="light"
              h="auto"
              py="sm"
              styles={{ label: { whiteSpace: 'normal' } }}
              onClick={() => {
                setSelectedParticipant(null);
                void onViewParticipant(subscription.id);
              }}
            >
              {subscription.validFrom} – {subscription.validUntil} ·{' '}
              {participantStatusLabels[subscription.status] || subscription.status} · Liko{' '}
              {subscription.remainingSessions} iš {subscription.totalSessions}
            </Button>
          ))}
        </Stack>
      </Modal>
    </Paper>
  );
}
