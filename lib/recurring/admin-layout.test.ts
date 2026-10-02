import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../../app/admin/recurring/page.tsx', import.meta.url), 'utf8');

test('recurring page omits duplicate list and refund queue without removing participant details', () => {
  assert.doesNotMatch(page, /<Title order=\{4\}>Abonementai<\/Title>/);
  assert.doesNotMatch(page, /subscriptionsApiUrl|clearFilters|setCustomerEmail|refundAttention/);
  assert.doesNotMatch(
    page,
    /Abonementų, jų būsenų, pinigų grąžinimų ir veiksmų istorijos valdymas/,
  );
  assert.match(page, /onViewParticipant=\{openSubscriptionDetails\}/);
  assert.match(page, /title="Abonemento informacija"/);
  assert.match(page, /await revalidateRecurringData\(refreshRecurringCache\)/);
});

test('single-visit settings start collapsed and their wide table can scroll', () => {
  const settings = page.match(/<Card\s+component="details"[^>]*>/)?.[0];
  assert.ok(settings);
  assert.doesNotMatch(settings, /\bopen(?:=|\s|>)/);
  assert.match(page, /<summary className=\{styles.settingsSummary\}>/);
  assert.match(page, /<SubscriptionDetailTable label="Grupių vieno apsilankymo nustatymai"/);
  assert.doesNotMatch(page, /<Table striped highlightOnHover>/);
});

test('manual transfer cards keep all payment details and the existing payment action', () => {
  const cards = readFileSync(
    new URL('../../app/admin/recurring/ManualTransferList.tsx', import.meta.url),
    'utf8',
  );
  for (const field of ['customerName', 'customerEmail', 'amount', 'startDate', 'age', 'id']) {
    assert.ok(cards.includes(`{transfer.${field}}`));
  }
  assert.match(cards, /component="article"/);
  assert.match(cards, /loading=\{loadingId === transfer.id\}/);
  assert.match(cards, /onClick=\{\(\) => onMarkPaid\(transfer.id\)\}/);
  assert.match(page, /onMarkPaid=\{\(id\) => void markManualRecurringPurchasePaid\(id\)\}/);
  const css = readFileSync(
    new URL('../../app/admin/recurring/RecurringAdminPage.module.css', import.meta.url),
    'utf8',
  );
  assert.match(css, /\.transfer\s*\{[^}]*min-width: 0;[^}]*overflow-wrap: anywhere;/);
  assert.match(css, /\.purchaseId\s*\{[^}]*white-space: normal;[^}]*overflow-wrap: anywhere;/);
});
