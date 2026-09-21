import type { ParticipantSubscription } from './participants';

export type RegisterGroup = {
  id: string;
  weekday: number;
  startTime: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
};
export type RegisterOccurrence = {
  id: string;
  date: string;
  startISO: string;
  status: string;
};
type MakeupSession = {
  reservationId: string;
  occurrenceId: string;
  groupId: string;
  groupName: string;
  date: string;
  startISO: string;
  fulfilled: boolean;
};
export type RegisterReservation = {
  id: string;
  subscriptionId: string;
  occurrenceId: string;
  status: string;
  reservationType: string;
  coverage?: 'subscription' | 'uncovered';
  makeup?: (MakeupSession & { status: string }) | null;
  makeupFor?: MakeupSession | null;
};
export type AttendanceRegister = {
  group: RegisterGroup;
  occurrences: RegisterOccurrence[];
  subscriptions: ParticipantSubscription[];
  reservations: RegisterReservation[];
  homeGroups?: Pick<RegisterGroup, 'id' | 'weekday' | 'startTime'>[];
};
export type RegisterColumn = { date: string; time: string; occurrence?: RegisterOccurrence };
export type RegisterRow = {
  key: string;
  name: string;
  email: string;
  guest: boolean;
  subscriptions: ParticipantSubscription[];
  cells: Map<string, RegisterReservation[]>;
};

const MONTHS = [
  'Sausis',
  'Vasaris',
  'Kovas',
  'Balandis',
  'Gegužė',
  'Birželis',
  'Liepa',
  'Rugpjūtis',
  'Rugsėjis',
  'Spalis',
  'Lapkritis',
  'Gruodis',
];

export const REGISTER_MARKS: Record<string, { symbol: string; label: string; tone: string }> = {
  scheduled: { symbol: 'P', label: 'Suplanuota', tone: 'planned' },
  attended: { symbol: '✓', label: 'Atvyko', tone: 'attended' },
  cancelled_early: { symbol: 'A', label: 'Atšaukta laiku', tone: 'cancelled' },
  cancelled_late: { symbol: 'V', label: 'Atšaukta per vėlai', tone: 'missed' },
  no_show: { symbol: 'N', label: 'Neatvyko', tone: 'missed' },
  released: { symbol: '–', label: 'Vieta atlaisvinta', tone: 'cancelled' },
};

export const REGISTER_WEEKDAYS = [
  'Pirmadienis',
  'Antradienis',
  'Trečiadienis',
  'Ketvirtadienis',
  'Penktadienis',
  'Šeštadienis',
  'Sekmadienis',
];

export function homeGroupLabels(row: RegisterRow, data: AttendanceRegister) {
  const ids = new Set(row.subscriptions.map((subscription) => subscription.defaultGroupId));
  return [
    ...new Set(
      (data.homeGroups || [])
        .filter((group) => ids.has(group.id))
        .map((group) => `${REGISTER_WEEKDAYS[group.weekday - 1]} · ${group.startTime}`),
    ),
  ];
}

// This is only the identity for an uncovered visit, never a pass to debit.
export function manualAttendanceSubscription(row: RegisterRow, date: string) {
  const sorted = [...row.subscriptions].sort(
    (a, b) => a.validFrom.localeCompare(b.validFrom) || a.id.localeCompare(b.id),
  );
  return sorted.filter((subscription) => subscription.validFrom <= date).at(-1) || sorted[0];
}

export function reservationMark(reservation: RegisterReservation, occurrence?: RegisterOccurrence) {
  if (reservation.status === 'cancelled_early' && reservation.makeup?.fulfilled) {
    return { symbol: 'A', label: 'Atšaukta laiku · Atlankyta', tone: 'attended' };
  }
  if (occurrence?.status === 'cancelled' && reservation.status === 'scheduled') {
    return { symbol: 'A', label: 'Atšauktas visas užsiėmimas', tone: 'cancelled' };
  }
  return (
    REGISTER_MARKS[reservation.status] || {
      symbol: '?',
      label: 'Nežinoma būsena',
      tone: 'cancelled',
    }
  );
}

function makeupSessionLabel(session: MakeupSession) {
  // Recurring occurrences may contain Vilnius wall-clock timestamps with no
  // offset. Do not reinterpret those in the administrator's browser timezone.
  const time = !/([zZ]|[+-]\d{2}:?\d{2})$/.test(session.startISO)
    ? session.startISO.slice(11, 16)
    : new Intl.DateTimeFormat('lt-LT', {
        timeZone: 'Europe/Vilnius',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(session.startISO));
  return `${session.date} ${time} · ${session.groupName}`;
}

export function makeupSourceLabel(source: NonNullable<RegisterReservation['makeupFor']>) {
  const state = source.fulfilled ? 'Atlankytas užsiėmimas' : 'Vietoje užsiėmimo';
  return `${state}: ${makeupSessionLabel(source)}`;
}

export function makeupProgressLabel(makeup: NonNullable<RegisterReservation['makeup']>) {
  const state = makeup.fulfilled
    ? 'Atlankyta'
    : makeup.status === 'scheduled'
      ? 'Atlankymas suplanuotas'
      : makeup.status === 'no_show'
        ? 'Į atlankymą neatvyko'
        : makeup.status === 'cancelled_late'
          ? 'Atlankymas atšauktas per vėlai'
          : makeup.status === 'cancelled'
            ? 'Atlankymo užsiėmimas atšauktas'
            : 'Atlankymas nepatvirtintas';
  return `${state}: ${makeupSessionLabel(makeup)}`;
}

export function registerColumns(group: RegisterGroup, occurrences: RegisterOccurrence[]) {
  const columns = new Map<string, RegisterColumn>();
  // Show the whole finite cycle, including future dates not generated in the DB yet.
  // Empty cells are NOT bookings and do not reserve seats or imply attendance.
  const until =
    group.effectiveUntil ||
    occurrences
      .map((item) => item.date)
      .sort()
      .at(-1);
  if (until && group.effectiveFrom <= until) {
    const day = new Date(`${group.effectiveFrom}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() + ((group.weekday - (day.getUTCDay() || 7) + 7) % 7));
    while (day.toISOString().slice(0, 10) <= until) {
      const date = day.toISOString().slice(0, 10);
      columns.set(date, { date, time: group.startTime });
      day.setUTCDate(day.getUTCDate() + 7);
    }
  }
  // Persisted exceptions and cancelled dates must remain visible even when the
  // weekly timetable or effective window has since been edited.
  for (const occurrence of occurrences) {
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Vilnius',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(occurrence.startISO));
    columns.set(occurrence.date, { date: occurrence.date, time, occurrence });
  }
  return [...columns.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function registerMonths(columns: RegisterColumn[]) {
  const months: { key: string; label: string; count: number }[] = [];
  for (const column of columns) {
    const key = column.date.slice(0, 7);
    const previous = months.at(-1);
    if (previous?.key === key) previous.count += 1;
    else
      months.push({
        key,
        label: `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`,
        count: 1,
      });
  }
  return months;
}

export function registerRows(data: AttendanceRegister) {
  const rows = new Map<string, RegisterRow>();
  const rowBySubscription = new Map<string, RegisterRow>();
  const normalize = (value: string) =>
    value.normalize('NFKC').trim().toLocaleLowerCase('lt').replace(/\s+/g, ' ');
  for (const subscription of data.subscriptions) {
    // Renewals share a row; people using the same family email but different names do not.
    const key = subscription.customerEmail.trim()
      ? JSON.stringify([
          normalize(subscription.customerEmail),
          normalize(subscription.customerName),
        ])
      : subscription.id;
    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        name: subscription.customerName,
        email: subscription.customerEmail,
        guest: true,
        subscriptions: [],
        cells: new Map(),
      };
      rows.set(key, row);
    }
    row.subscriptions.push(subscription);
    if (subscription.defaultGroupId === data.group.id) row.guest = false;
    rowBySubscription.set(subscription.id, row);
  }
  const occurrenceById = new Map(data.occurrences.map((item) => [item.id, item]));
  for (const reservation of data.reservations) {
    const occurrence = occurrenceById.get(reservation.occurrenceId);
    if (!occurrence) continue;
    let row = rowBySubscription.get(reservation.subscriptionId);
    if (!row) {
      // Do not silently hide an existing reservation with a missing subscription.
      const key = `missing:${reservation.subscriptionId}`;
      row = rows.get(key) || {
        key,
        name: 'Dalyvio duomenys nepasiekiami',
        email: '',
        guest: true,
        subscriptions: [],
        cells: new Map(),
      };
      rows.set(key, row);
      rowBySubscription.set(reservation.subscriptionId, row);
    }
    const cell = row.cells.get(occurrence.date) || [];
    cell.push(reservation);
    row.cells.set(occurrence.date, cell);
  }
  return [...rows.values()].sort(
    (a, b) => Number(a.guest) - Number(b.guest) || a.name.localeCompare(b.name, 'lt'),
  );
}
