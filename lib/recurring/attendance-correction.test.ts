import assert from 'node:assert/strict';
import test from 'node:test';
import { attendanceCorrectionAction, attendanceCorrectionMessage } from './attendance-correction';
import type { RegisterReservation } from './attendance-register';

const reservation: RegisterReservation = {
  id: 'r',
  subscriptionId: 's',
  occurrenceId: 'o',
  status: 'scheduled',
  reservationType: 'default',
  updatedAt: '2026-09-27T07:00:00.000Z',
};
test('scheduled cells offer removal, attended and missed cells offer restoring planned state', () => {
  assert.equal(attendanceCorrectionAction(reservation), 'remove');
  for (const status of ['attended', 'no_show'])
    assert.equal(attendanceCorrectionAction({ ...reservation, status }), 'restore');
  for (const status of ['released', 'cancelled_early', 'cancelled_late'])
    assert.equal(attendanceCorrectionAction({ ...reservation, status }), null);
  assert.equal(attendanceCorrectionAction(undefined), null);
  assert.equal(attendanceCorrectionAction({ ...reservation, updatedAt: undefined }), null);
  assert.equal(
    attendanceCorrectionAction({ ...reservation, status: 'attended' }, 'cancelled'),
    null,
  );
  assert.equal(attendanceCorrectionAction(reservation, 'cancelled'), 'remove');
});
test('correction notifications distinguish unchanged balance, refunded visit and retracted makeup', () => {
  assert.match(attendanceCorrectionMessage({ action: 'remove' }), /likutis nepakeistas/);
  assert.match(
    attendanceCorrectionMessage({ action: 'restore', creditedSessions: 1 }),
    /grąžintas į abonemento likutį/,
  );
  const uncharged = attendanceCorrectionMessage({
    action: 'restore',
    creditedSessions: 0,
    removedDates: ['2026-10-07'],
  });
  assert.match(uncharged, /vėl suplanuotas/);
  assert.match(uncharged, /2026-10-07/);
  assert.doesNotMatch(uncharged, /grąžintas į abonemento likutį/);
});
