import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../../app/admin/recurring/AttendanceCell.tsx', import.meta.url),
  'utf8',
);
const dropdown = source.match(/<Menu.Dropdown>([\s\S]*?)<\/Menu.Dropdown>/)?.[1];

test('attendance menu contains actions and separators only, without informational labels', () => {
  assert.ok(dropdown);
  const elements = [...dropdown.matchAll(/<([A-Za-z][\w.]*)\b/g)].map((match) => match[1]);
  assert.ok(elements.includes('Menu.Item'));
  assert.ok(
    elements.every((tag) => ['Menu.Item', 'Menu.Divider'].includes(tag) || tag.startsWith('Icon')),
  );
  for (const action of [
    'Naujas abonemento periodas',
    'Vienas apsilankymas',
    'Apmokėjo už apsilankymą',
    'Apmokėjo už visą periodą',
    'Atvyko',
    'Neatvyko',
    'Atšaukti dalyvavimo žymą',
    'Atšaukti neatvykimo žymą',
    'Pašalinti apsilankymą',
    'Dalyvio informacija',
  ])
    assert.ok(dropdown.includes(action), `Missing action: ${action}`);
});

test('cell retains contextual information in its accessible label and tooltip', () => {
  assert.match(source, /title=\{label\}/);
  assert.match(source, /aria-label=\{label\}/);
  const label = source.match(/const label = ([^;]+);/)?.[1];
  assert.ok(label);
  for (const detail of [
    'row.name',
    'column.date',
    'column.time',
    'paymentLabel',
    'periodLabel',
    'makeupProgressLabel',
    'makeupSourceLabel',
  ]) {
    assert.ok(label.includes(detail), `Missing cell context: ${detail}`);
  }
});

test('payment section and its divider are only shown when payment is actionable', () => {
  assert.match(dropdown || '', /paymentLabel && subscription\?\.canMarkPaid && onMarkPaid &&/);
});
