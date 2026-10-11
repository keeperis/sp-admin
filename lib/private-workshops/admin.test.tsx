import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { MantineProvider } from '@mantine/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookingDetails, Bookings } from '@/app/admin/private-workshops/Bookings';
import { GeneralSettings, WorkshopTypes } from '@/app/admin/private-workshops/ConfigEditor';
import {
  addDates,
  completionPreview,
  privateRequest,
  validateConfig,
  validImageUrl,
} from './admin';
import type { PrivateWorkshopBooking, PrivateWorkshopConfig } from './types';

function config(): PrivateWorkshopConfig {
  return {
    version: 3,
    settings: {
      enabled: false,
      titleLt: 'Privatūs',
      titleEn: '',
      descriptionLt: 'Aprašymas',
      descriptionEn: '',
      coverImageUrl: '',
      cancellationTermsLt: 'Atšaukimas',
      cancellationTermsEn: '',
      reschedulingTermsLt: 'Perkėlimas',
      reschedulingTermsEn: '',
      memoLt: 'Atmintinė',
      memoEn: '',
      placeName: 'Studija',
      holdHours: 48,
      startStepMin: 30,
      bufferMin: 60,
      wholeWindow: false,
      addonsDueNow: false,
    },
    types: [
      {
        id: 'type-1',
        active: true,
        titleLt: 'Puodelio dirbtuvės',
        titleEn: '',
        thumbnailUrl: '',
        durationMin: 120,
        minParticipants: 6,
        maxParticipants: 12,
        pricePerPersonEur: 50,
      },
    ],
    addons: [
      {
        id: 'addon-1',
        active: true,
        titleLt: 'Stalo dekoras',
        titleEn: '',
        priceEur: 30,
        durationMin: 0,
      },
    ],
    windows: [
      {
        id: 'window-1',
        active: true,
        dates: ['2026-12-01'],
        startTime: '10:00',
        endTime: '18:00',
        typeIds: ['type-1'],
        addonIds: ['addon-1'],
      },
    ],
  };
}

function booking(): PrivateWorkshopBooking {
  const draft = config();
  return {
    id: 'booking-1',
    reference: 'PRIV-TEST',
    site: 'ceramics',
    locale: 'lt',
    status: 'pending_transfer',
    customerName: 'Bandomasis klientas',
    customerEmail: 'long-private-workshop-email@example.test',
    customerPhone: '+37060000000',
    buyerType: 'business',
    billingDetails: {
      companyName: 'Bandomoji įmonė',
      companyCode: '123456789',
      companyAddress: 'Vilnius',
    },
    quote: {
      selection: {
        windowId: 'window-1',
        date: '2026-12-01',
        startTime: '10:00',
        typeId: 'type-1',
        participantsCount: 8,
        addonIds: ['addon-1'],
      },
      workshopType: draft.types[0],
      addons: draft.addons,
      startISO: '2026-12-01T08:00:00Z',
      endISO: '2026-12-01T10:00:00Z',
      durationMin: 120,
      minimumParticipants: 6,
      pricePerPersonEur: 50,
      addonsTotalEur: 30,
      depositEur: 300,
      estimatedTotalEur: 430,
      remainingEstimateEur: 130,
      termsVersion: 3,
    },
    placeName: 'Studija',
    cancellationTerms: 'Atšaukimas',
    reschedulingTerms: 'Perkėlimas',
    createdAt: '2026-10-04T08:00:00Z',
    expiresAt: '2026-10-07T08:00:00Z',
    paidAt: null,
    bankTransfer: {
      beneficiaryName: 'Test',
      beneficiaryCode: '123',
      iban: 'LTTEST',
      bankName: 'Bankas',
      paymentPurpose: 'PRIV-TEST',
      amount: 300,
      currency: 'EUR',
    },
    actualParticipants: null,
    finalTotalEur: null,
    balanceDueEur: null,
    adminNotes: '',
    emails: { requested: { status: 'failed', lastError: 'Siuntimo klaida' } },
  };
}

test('dates are deduplicated and sorted for repeated windows', () => {
  assert.deepEqual(addDates(['2026-12-03', '2026-12-01'], ['2026-12-01', '2026-12-02']), [
    '2026-12-01',
    '2026-12-02',
    '2026-12-03',
  ]);
});

test('configuration validates participant bounds, referential links and duration', () => {
  const draft = config();
  assert.equal(validateConfig(draft), null);
  draft.types[0].maxParticipants = 3;
  assert.match(validateConfig(draft) || '', /dalyvių ribas/);
  draft.types[0].maxParticipants = 12;
  draft.windows[0].typeIds = ['missing'];
  assert.match(validateConfig(draft) || '', /nebeegzistuojantis/);
  draft.windows[0].typeIds = ['type-1'];
  draft.windows[0].endTime = '11:00';
  assert.match(validateConfig(draft) || '', /netelpa/);
});

test('extras cannot be requested upfront and enabling needs terms', () => {
  const draft = config();
  draft.settings.addonsDueNow = true;
  assert.match(validateConfig(draft) || '', /tik po užsiėmimo/);
  draft.settings.addonsDueNow = false;
  draft.settings.enabled = true;
  draft.settings.cancellationTermsLt = '';
  assert.match(validateConfig(draft) || '', /sąlygas/);
});

test('completion uses booking prices, adds extras after workshop and bills at least minimum', () => {
  const item = booking();
  assert.deepEqual(completionPreview(item, 8), { total: 430, balance: 130 });
  assert.deepEqual(completionPreview(item, 0), { total: 330, balance: 30 });
  item.quote.pricePerPersonEur = 49.99;
  item.quote.depositEur = 299.94;
  assert.deepEqual(completionPreview(item, 7), { total: 379.93, balance: 79.99 });
});

test('image URLs reject executable and protocol-relative URLs', () => {
  for (const value of ['javascript:alert(1)', '//example.test/image.jpg', 'data:image/svg+xml,svg'])
    assert.equal(validImageUrl(value), false);
  assert.equal(validImageUrl('/bg/image.jpg'), true);
  assert.equal(validImageUrl('https://example.test/image.jpg'), true);
});

test('settings expose agreed timing rules and both language variants', () => {
  const html = renderToStaticMarkup(
    <MantineProvider>
      <GeneralSettings config={config()} onChange={() => {}} />
    </MantineProvider>,
  );
  for (const text of [
    '30 min.',
    '60 min.',
    '72 val.',
    'Papildomos paslaugos ir likutis apmokami po užsiėmimo',
    'Atmintinė patvirtinimo laiškui (LT)',
    'Atmintinė patvirtinimo laiškui (EN)',
  ])
    assert.ok(html.includes(text), text);
});

test('persisted workshop types deactivate instead of destructive removal', () => {
  const html = renderToStaticMarkup(
    <MantineProvider>
      <WorkshopTypes config={config()} onChange={() => {}} persistedIds={new Set(['type-1'])} />
    </MantineProvider>,
  );
  assert.match(html, /Ankstesnės rezervacijos išliks/);
  assert.doesNotMatch(html, /Pašalinti naują įrašą/);
});

test('booking cards wrap mobile contacts and details display payment, buyer and email state', () => {
  const item = booking();
  const cards = renderToStaticMarkup(
    <MantineProvider>
      <Bookings bookings={[item]} onRefresh={() => {}} onUpdated={() => {}} refreshing={false} />
    </MantineProvider>,
  );
  assert.match(cards, /overflow-wrap:anywhere/);
  assert.ok(cards.includes(item.customerEmail));
  assert.doesNotMatch(cards, /<table/);
  const details = renderToStaticMarkup(
    <MantineProvider>
      <BookingDetails booking={item} onUpdated={() => {}} />
    </MantineProvider>,
  );
  for (const text of [
    'Mokėjimas pavedimu',
    'Preliminari suma',
    'apmokamos po užsiėmimo',
    'Bandomoji įmonė',
    'Registruota:',
    'Siuntimo klaida',
    'Pavedimas gautas',
  ])
    assert.ok(details.includes(text), text);
});

test('admin requests carry CSRF headers, version payload and preserve conflict error', async () => {
  const original = globalThis.fetch;
  let seen: RequestInit | undefined;
  try {
    globalThis.fetch = async (_url, init) => {
      seen = init;
      return new Response(
        JSON.stringify({ error: 'Version conflict', code: 'PRIVATE_CONFIG_CONFLICT' }),
        { status: 409 },
      );
    };
    await assert.rejects(
      privateRequest('/api/admin/private-workshops', {
        method: 'PUT',
        body: JSON.stringify(config()),
      }),
      /Duomenys pasikeitė/,
    );
    assert.equal(new Headers(seen?.headers).get('x-requested-with'), 'XMLHttpRequest');
    assert.equal(JSON.parse(String(seen?.body)).version, 3);
    assert.equal(seen?.cache, 'no-store');
  } finally {
    globalThis.fetch = original;
  }
});

test('booking state conflicts retain actionable server error instead of draft warning', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          error: 'Rezervacijos apmokėjimo terminas pasibaigė.',
          code: 'PRIVATE_STATE_CONFLICT',
        }),
        { status: 409 },
      );
    await assert.rejects(
      privateRequest('/api/admin/private-workshops/bookings/test', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'mark_paid' }),
      }),
      /apmokėjimo terminas pasibaigė/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('email resend actions are restricted to appropriate booking states', () => {
  const item = booking();
  item.paidAt = '2026-10-05T08:00:00Z';
  for (const status of ['cancelled', 'expired'] as const) {
    item.status = status;
    const html = renderToStaticMarkup(
      <MantineProvider>
        <BookingDetails booking={item} onUpdated={() => {}} />
      </MantineProvider>,
    );
    assert.doesNotMatch(html, /Persiųsti rezervacijos informaciją/);
    assert.doesNotMatch(html, /Persiųsti patvirtinimą/);
  }
  item.status = 'confirmed';
  const html = renderToStaticMarkup(
    <MantineProvider>
      <BookingDetails booking={item} onUpdated={() => {}} />
    </MantineProvider>,
  );
  assert.doesNotMatch(html, /Persiųsti rezervacijos informaciją/);
  assert.match(html, /Persiųsti patvirtinimą/);
});

test('private proxy uses shared authenticated guard without destructive methods', () => {
  const route = readFileSync(
    new URL('../../app/api/admin/private-workshops/[[...path]]/route.ts', import.meta.url),
    'utf8',
  );
  assert.match(route, /proxyAdminApiRequest/);
  assert.match(route, /export const PUT/);
  assert.match(route, /export const PATCH/);
  assert.doesNotMatch(route, /export const DELETE/);
});
