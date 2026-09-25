import assert from 'node:assert/strict';
import test from 'node:test';
import { automaticMakeupNotification } from './automatic-makeup';

test('makeup notifications distinguish saved attendance from an unavailable replacement', () => {
  assert.equal(automaticMakeupNotification(null), null);
  assert.equal(automaticMakeupNotification({ status: 'covered', message: 'Already booked' }), null);
  const scheduled = automaticMakeupNotification({ status: 'scheduled', message: '2026-10-07' });
  assert.equal(scheduled?.color, 'green');
  assert.equal(scheduled?.message, '2026-10-07');
  for (const status of ['unavailable', 'failed'] as const) {
    const notice = automaticMakeupNotification({ status, message: 'No available time' });
    assert.equal(notice?.color, 'yellow');
    assert.equal(notice?.autoClose, false);
    assert.match(notice?.title || '', /Lankymas išsaugotas/);
  }
});
