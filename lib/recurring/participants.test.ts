import assert from 'node:assert/strict';
import test from 'node:test';
import {
  nextGroupDate,
  type ParticipantReservation,
  rosterCounts,
  vilniusDate,
} from './participants';

test('local today uses Vilnius date, not UTC date', () => {
  assert.equal(vilniusDate(new Date('2026-09-19T22:30:00Z')), '2026-09-20');
});
test('suggests the next group weekday inside its effective window', () => {
  assert.equal(nextGroupDate(6, '2026-09-01', '2026-09-19'), '2026-09-19');
  assert.equal(nextGroupDate(3, '2026-09-01', '2026-09-19'), '2026-09-23');
  assert.equal(nextGroupDate(7, '2026-10-01', '2026-09-19'), '2026-10-04');
});
test('manual form skips a group session that already started today', () => {
  assert.equal(
    nextGroupDate(6, '2026-09-01', '2026-09-19', '10:30', new Date('2026-09-19T07:31:00Z')),
    '2026-09-26',
  );
});
test('attendance totals include makeup visitors and separate cancellations', () => {
  const rows = [
    { status: 'scheduled', reservationType: 'default' },
    { status: 'scheduled', reservationType: 'makeup' },
    { status: 'attended', reservationType: 'makeup' },
    { status: 'cancelled_early', reservationType: 'default' },
    { status: 'no_show', reservationType: 'default' },
    { status: 'released', reservationType: 'default' },
  ] as ParticipantReservation[];
  assert.deepEqual(rosterCounts(rows), { scheduled: 2, attended: 1, cancelled: 2 });
});
