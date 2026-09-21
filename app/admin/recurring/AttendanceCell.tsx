'use client';

import { Menu } from '@mantine/core';
import { IconCheck, IconUser, IconX } from '@tabler/icons-react';
import {
  makeupProgressLabel,
  makeupSourceLabel,
  manualAttendanceSubscription,
  type RegisterColumn,
  type RegisterReservation,
  type RegisterRow,
  reservationMark,
} from '@/lib/recurring/attendance-register';
import styles from './GroupAttendanceTable.module.css';

export type AttendanceChange = {
  subscriptionId: string;
  reservationId?: string;
  date: string;
  result: 'attended' | 'no_show';
};

export function AttendanceCell({
  row,
  column,
  reservation,
  busy,
  onRecord,
  onViewParticipant,
}: {
  row: RegisterRow;
  column: RegisterColumn;
  reservation?: RegisterReservation;
  busy: boolean;
  onRecord: (change: AttendanceChange) => Promise<void>;
  onViewParticipant: (id: string) => Promise<void>;
}) {
  const subscription = reservation
    ? row.subscriptions.find((item) => item.id === reservation.subscriptionId)
    : manualAttendanceSubscription(row, column.date);
  const mark = reservation ? reservationMark(reservation, column.occurrence) : null;
  const moved = reservation?.reservationType === 'makeup';
  const replacement = reservation?.status === 'cancelled_early' ? reservation.makeup : null;
  const source = moved ? reservation.makeupFor : null;
  const uncovered = reservation?.coverage === 'uncovered';
  const canRecord =
    (!reservation || reservation.status === 'scheduled') &&
    column.occurrence?.status !== 'cancelled';
  const label = `${row.name} · ${column.date} ${column.time} · ${replacement ? 'Atšaukta laiku' : mark?.label || 'Rezervacijos nėra'}${moved ? ' · Perkeltas užsiėmimas' : ''}${replacement ? ` · ${makeupProgressLabel(replacement)}` : ''}${source ? ` · ${makeupSourceLabel(source)}` : ''}${uncovered ? ' · Be abonemento' : ''}`;
  const record = (result: AttendanceChange['result']) => {
    if (subscription)
      void onRecord({
        subscriptionId: subscription.id,
        date: column.date,
        result,
        ...(reservation ? { reservationId: reservation.id } : {}),
      });
  };
  return (
    <Menu withinPortal position="bottom" withArrow width={250}>
      <Menu.Target>
        <button
          type="button"
          className={styles.mark}
          data-tone={mark?.tone || 'empty'}
          data-uncovered={uncovered}
          title={label}
          aria-label={label}
          disabled={busy || !subscription || (!reservation && !canRecord)}
        >
          {mark?.symbol}
          {(moved || replacement) && <small>↔</small>}
          {uncovered && <small>€</small>}
          {!reservation && (
            <span className={styles.emptyHint} aria-hidden="true">
              +
            </span>
          )}
        </button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          {row.name}
          <br />
          {column.date} · {column.time}
        </Menu.Label>
        {!reservation && (
          <Menu.Label>
            Be abonemento. Likutis nesumažės,
            <br />
            apmokėjimas nebus registruojamas.
          </Menu.Label>
        )}
        {uncovered && <Menu.Label>Be abonemento · apmokėjimas nesuregistruotas</Menu.Label>}
        {replacement && (
          <Menu.Label c={replacement.fulfilled ? 'green' : undefined}>
            {makeupProgressLabel(replacement)}
          </Menu.Label>
        )}
        {source && (
          <Menu.Label c={source.fulfilled ? 'green' : undefined}>
            {makeupSourceLabel(source)}
          </Menu.Label>
        )}
        {canRecord && (
          <>
            <Menu.Item
              color="green"
              leftSection={<IconCheck size={16} />}
              onClick={() => record('attended')}
            >
              Atvyko
            </Menu.Item>
            <Menu.Item
              color="red"
              leftSection={<IconX size={16} />}
              onClick={() => record('no_show')}
            >
              Neatvyko
            </Menu.Item>
            <Menu.Divider />
          </>
        )}
        <Menu.Item
          leftSection={<IconUser size={16} />}
          onClick={() => subscription && void onViewParticipant(subscription.id)}
        >
          Dalyvio informacija
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
