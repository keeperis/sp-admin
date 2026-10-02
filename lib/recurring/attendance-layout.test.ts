import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../../app/admin/recurring/GroupAttendanceTable.tsx', import.meta.url),
  'utf8',
);
const participants = readFileSync(
  new URL('../../app/admin/recurring/GroupParticipants.tsx', import.meta.url),
  'utf8',
);

test('attendance headings omit repeated program, weekday/time and introductory copy', () => {
  assert.match(source, /<Title order=\{5\}>\{group.name\}<\/Title>/);
  assert.doesNotMatch(source, /programName|REGISTER_WEEKDAYS|endTime|endMinutes/);
  assert.doesNotMatch(
    participants,
    /Visos grupės ir jų užsiėmimų datos|Paspauskite langelį lankymui/,
  );
  assert.match(participants, /Grupių dalyviai ir lankymas/);
  assert.match(participants, /Atnaujinti/);
});

test('each group legend is hidden in a native keyboard-accessible disclosure by default', () => {
  const disclosure = source.match(/<details\b([^>]*)>([\s\S]*?)<\/details>/);
  assert.ok(disclosure);
  assert.doesNotMatch(disclosure[1], /\bopen\b/);
  assert.match(disclosure[2], /<summary>Žymėjimų paaiškinimai<\/summary>/);
  assert.match(disclosure[2], /className=\{styles.legend\}/);
  for (const text of [
    'REGISTER_MARKS',
    'Suplanuota · apmokėjimas nepažymėtas',
    'Suplanuota · apmokėta',
    'Atvyko · apmokėjimas nepažymėtas',
    'Atvyko · apmokėta',
    'Perkeltas užsiėmimas',
    'Vienas abonemento periodas',
    'Tuščia — naujas abonemento periodas',
  ])
    assert.ok(disclosure[2].includes(text), `Missing legend item: ${text}`);
});
