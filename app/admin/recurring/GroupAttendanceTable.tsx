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
import { IconPlus } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import {
  type AttendanceRegister,
  homeGroupLabels,
  REGISTER_MARKS,
  REGISTER_WEEKDAYS,
  type RegisterGroup,
  type RegisterRow,
  registerColumns,
  registerMonths,
  registerRows,
  reservedMembershipCount,
} from '@/lib/recurring/attendance-register';
import { participantStatusLabels, vilniusDate } from '@/lib/recurring/participants';
import type { SiteKey } from '@/lib/site';
import { AttendanceCell, type AttendanceChange } from './AttendanceCell';
import { GroupMembershipEditor } from './GroupMembershipEditor';
import styles from './GroupAttendanceTable.module.css';

const fetcher = async (url: string): Promise<AttendanceRegister> => {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Nepavyko įkelti lankymo lentelės.');
  return data;
};

export function GroupAttendanceTable({
  site,
  group,
  programName,
  canAdd,
  onAddParticipant,
  onViewParticipant,
}: {
  site: SiteKey;
  group: RegisterGroup & { name: string; durationMin: number };
  programName: string;
  canAdd: boolean;
  onAddParticipant: () => void;
  onViewParticipant: (id: string) => Promise<void>;
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
  const recordAttendance = async (change: AttendanceChange) => {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(
        `/api/admin/recurring/groups/${group.id}/attendance?${new URLSearchParams({ site })}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify(change),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nepavyko išsaugoti lankymo.');
      notifications.show({
        color: 'green',
        title: 'Lankymas išsaugotas',
        message:
          result.coverage === 'uncovered'
            ? 'Pažymėta be abonemento. Apmokėjimas nesuregistruotas, abonemento likutis nekeistas.'
            : change.result === 'attended'
              ? 'Dalyvis atvyko.'
              : 'Dalyvis neatvyko.',
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Nepavyko išsaugoti lankymo.');
    } finally {
      await refresh(
        (key) => typeof key === 'string' && key.startsWith('/api/admin/recurring/'),
        undefined,
        { revalidate: true },
      );
      saveLock.current = false;
      setSaving(false);
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
  const endMinutes =
    Number(group.startTime.slice(0, 2)) * 60 + Number(group.startTime.slice(3)) + group.durationMin;
  const endTime = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  const openParticipant = (row: RegisterRow) => {
    if (row.subscriptions.length === 1) void onViewParticipant(row.subscriptions[0].id);
    else setSelectedParticipant(row);
  };

  return (
    <Paper withBorder radius="md" p={{ base: 8, sm: 'md' }} className={styles.group}>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="xs" c="dimmed">
              {programName}
            </Text>
            <Title order={5}>{group.name}</Title>
            <Text size="sm">
              {REGISTER_WEEKDAYS[group.weekday - 1]} · {group.startTime}–{endTime}
            </Text>
          </div>
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
          <Text size="sm" c="dimmed">
            Grupė pilna. Vieta saugoma iki nurodytos lankymo pabaigos. Esamo dalyvio abonemento
            pratęsimas tuo pačiu vardu ir el. paštu antros vietos neužima.
          </Text>
        )}
        {saveError && (
          <Alert
            color="red"
            title="Lankymas neišsaugotas"
            withCloseButton
            onClose={() => setSaveError(null)}
          >
            {saveError}
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
                  {rows.map((row, index) => (
                    <tr key={row.key}>
                      <th scope="row" className={styles.participant}>
                        {row.subscriptions.length > 0 ? (
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
                            {homeGroupLabels(row, data).join('; ') || 'Pagrindinė grupė nenurodyta'}
                          </Text>
                        )}
                        {row.subscriptions.length > 1 && (
                          <Text size="xs" c="dimmed">
                            Abonementų: {row.subscriptions.length}
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
                            data-month-start={
                              columnIndex === 0 ||
                              column.date.slice(0, 7) !== columns[columnIndex - 1].date.slice(0, 7)
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
                                  onViewParticipant={onViewParticipant}
                                />
                              ))
                            ) : (
                              <AttendanceCell
                                row={row}
                                column={column}
                                busy={saving}
                                onRecord={recordAttendance}
                                onViewParticipant={onViewParticipant}
                              />
                            )}
                          </td>
                        );
                      })}
                      {columns.length === 0 && <td />}
                    </tr>
                  ))}
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
            <div className={styles.legend}>
              {Object.entries(REGISTER_MARKS).map(([key, mark]) => (
                <span key={key}>
                  <span className={styles.key} data-tone={mark.tone}>
                    {mark.symbol}
                  </span>
                  {mark.label}
                </span>
              ))}
              <span>↔ Perkeltas užsiėmimas</span>
              <span>
                <span className={styles.key} data-tone="attended">
                  A↔
                </span>
                Atšauktas užsiėmimas atlankytas
              </span>
              <span>€ Be abonemento · apmokėjimas nesuregistruotas</span>
              <span>Tuščia — paspauskite lankymui pažymėti be abonemento</span>
            </div>
          </>
        )}
      </Stack>
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
