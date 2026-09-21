import assert from 'node:assert/strict';
import test from 'node:test';
import {
  type AttendanceRegister,
  homeGroupLabels,
  makeupProgressLabel,
  makeupSourceLabel,
  manualAttendanceSubscription,
  type RegisterOccurrence,
  type RegisterReservation,
  registerColumns,
  registerMonths,
  registerRows,
  reservationMark,
} from './attendance-register';
import type { ParticipantSubscription } from './participants';

const group = {
  id: 'group',
  weekday: 6,
  startTime: '10:30',
  effectiveFrom: '2026-09-12',
  effectiveUntil: '2026-10-03',
};
const occurrence: RegisterOccurrence = {
  id: 'o1',
  date: '2026-09-19',
  startISO: '2026-09-19T07:30:00Z',
  status: 'scheduled',
};
const member = (
  id: string,
  extra: Partial<ParticipantSubscription> = {},
): ParticipantSubscription => ({
  id,
  customerName: 'Testo Dalyvis',
  customerEmail: 'test@example.invalid',
  status: 'active',
  defaultGroupId: 'group',
  validFrom: '2026-09-12',
  validUntil: '2026-10-16',
  remainingSessions: 4,
  totalSessions: 4,
  ...extra,
});
const reservation = (
  subscriptionId: string,
  extra: Partial<RegisterReservation> = {},
): RegisterReservation => ({
  id: `r-${subscriptionId}`,
  subscriptionId,
  occurrenceId: 'o1',
  status: 'scheduled',
  reservationType: 'default',
  ...extra,
});
const data = (extra: Partial<AttendanceRegister> = {}): AttendanceRegister => ({
  group,
  occurrences: [occurrence],
  subscriptions: [member('s1')],
  reservations: [reservation('s1')],
  ...extra,
});

test('date columns cover finite cycle and use Vilnius time for persisted exceptions', () => {
  const columns = registerColumns(group, [occurrence]);
  assert.deepEqual(
    columns.map((column) => column.date),
    ['2026-09-12', '2026-09-19', '2026-09-26', '2026-10-03'],
  );
  assert.equal(columns[1].time, '10:30');
  assert.equal(columns[0].occurrence, undefined);
  assert.deepEqual(registerMonths(columns), [
    { key: '2026-09', label: 'Rugsėjis 2026', count: 3 },
    { key: '2026-10', label: 'Spalis 2026', count: 1 },
  ]);
});
test('open-ended groups stop at last persisted date; saved dates survive timetable edits', () => {
  assert.deepEqual(
    registerColumns({ ...group, effectiveUntil: null }, []).map((c) => c.date),
    [],
  );
  const columns = registerColumns({ ...group, effectiveFrom: '2026-10-01', effectiveUntil: null }, [
    occurrence,
  ]);
  assert.equal(columns[0].date, '2026-09-19');
  assert.equal(columns.length, 1);
});
test('month headings distinguish years', () => {
  const columns = registerColumns(
    { ...group, effectiveFrom: '2026-12-26', effectiveUntil: '2027-01-09' },
    [],
  );
  assert.deepEqual(
    registerMonths(columns).map((month) => month.label),
    ['Gruodis 2026', 'Sausis 2027'],
  );
});
test('empty validity dates never become reservations or automatic attendance', () => {
  const rows = registerRows(data());
  assert.equal(rows[0].cells.size, 1);
  assert.equal(rows[0].cells.has('2026-09-12'), false);
  assert.equal(rows[0].cells.get('2026-09-19')?.[0].status, 'scheduled');
});
test('renewals share one participant row without overwriting overlapping reservations', () => {
  const rows = registerRows(
    data({
      subscriptions: [
        member('s1'),
        member('s2', { customerName: ' testo  dalyvis ', customerEmail: 'TEST@example.invalid' }),
      ],
      reservations: [reservation('s1'), reservation('s2', { status: 'cancelled_early' })],
    }),
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].subscriptions.length, 2);
  assert.equal(rows[0].cells.get('2026-09-19')?.length, 2);
});
test('shared family email does not merge different participants', () => {
  assert.equal(
    registerRows(
      data({ subscriptions: [member('s1'), member('s2', { customerName: 'Kitas Dalyvis' })] }),
    ).length,
    2,
  );
});

test('participants with no email keep separate rows, even when their names match', () => {
  const rows = registerRows(
    data({
      subscriptions: [member('s1', { customerEmail: '' }), member('s2', { customerEmail: '' })],
    }),
  );
  assert.equal(rows.length, 2);
});
test('visitors and cancelled or released reservations remain visible in actual group', () => {
  const rows = registerRows(
    data({
      subscriptions: [
        member('s1'),
        member('guest', { customerName: 'Svečias', defaultGroupId: 'other' }),
        member('empty'),
      ],
      reservations: [
        reservation('s1', { status: 'released' }),
        reservation('guest', { reservationType: 'makeup', status: 'cancelled_early' }),
      ],
    }),
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[1].guest, true);
  assert.equal(rows[1].cells.get('2026-09-19')?.[0].reservationType, 'makeup');
  assert.equal(rows[0].cells.get('2026-09-19')?.[0].status, 'released');
});
test('missing participant data does not silently hide reservations', () => {
  const rows = registerRows(data({ subscriptions: [] }));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].subscriptions.length, 0);
  assert.equal(rows[0].cells.size, 1);
});
test('cancelled whole class overrides a scheduled mark, but not recorded attendance', () => {
  assert.equal(
    reservationMark(reservation('s1'), { ...occurrence, status: 'cancelled' }).symbol,
    'A',
  );
  assert.equal(
    reservationMark(reservation('s1', { status: 'attended' }), {
      ...occurrence,
      status: 'cancelled',
    }).symbol,
    '✓',
  );
});

test('visitor label includes the home weekday and time, without contact details', () => {
  const register = data({
    subscriptions: [member('guest', { defaultGroupId: 'home' })],
    reservations: [reservation('guest')],
    homeGroups: [{ id: 'home', weekday: 6, startTime: '10:30' }],
  });
  assert.deepEqual(homeGroupLabels(registerRows(register)[0], register), ['Šeštadienis · 10:30']);
});

test('empty-cell identity stays deterministic across renewals without requiring an active pass', () => {
  const row = registerRows(
    data({
      subscriptions: [
        member('new', { validFrom: '2026-11-01' }),
        member('old', { validFrom: '2026-09-01', status: 'expired', remainingSessions: 0 }),
      ],
    }),
  )[0];
  assert.equal(manualAttendanceSubscription(row, '2026-10-01')?.id, 'old');
  assert.equal(manualAttendanceSubscription(row, '2026-11-01')?.id, 'new');
});

test('uncovered attendance is retained with its explicit coverage flag', () => {
  const row = registerRows(
    data({
      reservations: [
        reservation('s1', { status: 'attended', reservationType: 'manual', coverage: 'uncovered' }),
      ],
    }),
  )[0];
  const mark = row.cells.get('2026-09-19')?.[0];
  assert.equal(mark?.coverage, 'uncovered');
  assert.equal(mark && reservationMark(mark).symbol, '✓');
});

const replacement = {
  reservationId: 'makeup1',
  occurrenceId: 'other-occurrence',
  groupId: 'other-group',
  groupName: 'Trečiadienio grupė',
  date: '2026-09-16',
  startISO: '2026-09-16T15:00:00Z',
  status: 'attended',
  fulfilled: true,
};

test('fulfilled cancellation stays A for history but becomes green', () => {
  const mark = reservationMark(
    reservation('s1', { status: 'cancelled_early', makeup: replacement }),
  );
  assert.equal(mark.symbol, 'A');
  assert.equal(mark.tone, 'attended');
  assert.match(mark.label, /Atlankyta/);
  assert.equal(
    makeupProgressLabel(replacement),
    'Atlankyta: 2026-09-16 18:00 · Trečiadienio grupė',
  );
  assert.equal(
    makeupProgressLabel({ ...replacement, startISO: '2026-09-16T18:00' }),
    'Atlankyta: 2026-09-16 18:00 · Trečiadienio grupė',
  );
});

test('scheduled, missed or unlinked replacements never turn A green', () => {
  for (const status of ['scheduled', 'no_show', 'cancelled_late', 'cancelled']) {
    assert.equal(
      reservationMark(
        reservation('s1', {
          status: 'cancelled_early',
          makeup: { ...replacement, status, fulfilled: false },
        }),
      ).tone,
      'cancelled',
    );
  }
  assert.equal(reservationMark(reservation('s1', { status: 'cancelled_early' })).tone, 'cancelled');
  assert.match(
    makeupProgressLabel({ ...replacement, status: 'scheduled', fulfilled: false }),
    /Atlankymas suplanuotas/,
  );
  assert.match(
    makeupProgressLabel({ ...replacement, status: 'no_show', fulfilled: false }),
    /neatvyko/,
  );
});

test('fulfilled makeup metadata does not relabel unrelated reservation statuses', () => {
  assert.equal(
    reservationMark(reservation('s1', { status: 'cancelled_late', makeup: replacement })).symbol,
    'V',
  );
  assert.equal(
    reservationMark(reservation('s1', { status: 'scheduled', makeup: replacement })).tone,
    'planned',
  );
});

test('makeup visit identifies the original date, Vilnius time and group', () => {
  const source = {
    ...replacement,
    reservationId: 'original',
    date: '2026-09-19',
    startISO: '2026-09-19T10:30',
    groupName: 'Šeštadienio grupė',
  };
  assert.equal(
    makeupSourceLabel(source),
    'Atlankytas užsiėmimas: 2026-09-19 10:30 · Šeštadienio grupė',
  );
  assert.equal(
    makeupSourceLabel({ ...source, startISO: '2026-09-19T07:30:00Z' }),
    makeupSourceLabel(source),
  );
  assert.equal(
    makeupSourceLabel({ ...source, fulfilled: false }),
    'Vietoje užsiėmimo: 2026-09-19 10:30 · Šeštadienio grupė',
  );
});
