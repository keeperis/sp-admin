import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { MantineProvider } from '@mantine/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { GroupMembershipEditor } from '@/app/admin/recurring/GroupMembershipEditor';

for (const endsOn of [null, '2026-10-15']) {
  test(`membership is an icon-only accessible control (${endsOn || 'indefinite'})`, () => {
    const html = renderToStaticMarkup(
      <MantineProvider>
        <GroupMembershipEditor
          membership={{
            key: 'member',
            subscriptionIds: ['subscription'],
            startsOn: '2026-09-01',
            endsOn,
          }}
          name="Testo Dalyvis"
          groupId="group"
          site="ceramics"
        />
      </MantineProvider>,
    );
    const button = html.match(/<button\b[^>]*>([\s\S]*?)<\/button>/);
    assert.ok(button);
    assert.equal(button[1].replace(/<[^>]*>/g, '').trim(), '');
    assert.match(button[1], /<svg/);
    const label = endsOn ? `Nebesilanko nuo ${endsOn}` : 'Vieta rezervuota neribotai';
    assert.ok(button[0].includes(`aria-label="Testo Dalyvis: ${label}"`));
    assert.ok(button[0].includes(`title="${label}"`));
    assert.doesNotMatch(html, /Vieta saugoma/);
  });
}

test('participant rows omit subscription counts but retain the subscription picker', () => {
  const source = readFileSync(
    new URL('../../app/admin/recurring/GroupAttendanceTable.tsx', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /Abonementų:/);
  assert.match(source, /onClick=\{\(\) => openParticipant\(row\)\}/);
  assert.match(source, /selectedParticipant\?\.subscriptions\.map/);
});

test('participant names use filtered passes for direct opening and the multi-period picker', () => {
  const source = readFileSync(
    new URL('../../app/admin/recurring/GroupAttendanceTable.tsx', import.meta.url),
    'utf8',
  );
  assert.match(
    source,
    /const subscriptions = selectableParticipantSubscriptions\(row\.subscriptions\)/,
  );
  assert.match(
    source,
    /if \(subscriptions\.length === 1\) void onViewParticipant\(subscriptions\[0\]\.id\)/,
  );
  assert.match(
    source,
    /else if \(subscriptions\.length > 1\) setSelectedParticipant\(\{ \.\.\.row, subscriptions \}\)/,
  );
  assert.match(source, /selectableParticipantSubscriptions\(row\.subscriptions\)\.length > 0/);
  assert.match(source, /\{canViewParticipant \? \(/);
});

test('period outline and its legend use the same thin one-pixel border', () => {
  const css = readFileSync(
    new URL('../../app/admin/recurring/GroupAttendanceTable.module.css', import.meta.url),
    'utf8',
  );
  for (const selector of [
    '.table td[data-period]::after',
    '.table td[data-period-start="true"]::after',
    '.table td[data-period-end="true"]::after',
    '.periodKey',
  ]) {
    const rule = css.slice(css.indexOf(selector)).split('}')[0];
    assert.match(rule, /border(?:-block|-left|-right)?: 1px solid var\(--mantine-color-gray-6\)/);
  }
});
