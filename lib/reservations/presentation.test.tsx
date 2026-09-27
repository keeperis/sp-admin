import assert from 'node:assert/strict';
import test from 'node:test';
import { MantineProvider } from '@mantine/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookingRegistrationDetails } from '@/app/admin/reservations/BookingRegistrationDetails';
import { ReservationsList } from '@/app/admin/reservations/ReservationsList';
import {
  bookingPaymentStatusLabel,
  bookingWorkshopName,
  formatDateTime,
  paymentMethodLabel,
  type ReservationBooking,
} from './presentation';

const booking: ReservationBooking = {
  id: 'fixture-reservation',
  customerName: 'Testo Dalyvė',
  customerEmail: 'test@example.invalid',
  customerPhone: '+37060000000',
  source: 'website',
  status: 'pending_payment',
  participantsCount: 1,
  totalAmount: 50,
  currency: 'EUR',
  paymentMethod: 'bank_transfer',
  payment: null,
  createdAt: '2026-09-25T13:45:00.000Z',
  workshop: { titleLt: 'Puodelio dirbtuvės', startISO: '2026-10-02T17:00' },
};

test('selected bank transfer is visible before any payment record exists', () => {
  const html = renderToStaticMarkup(
    <MantineProvider>
      <BookingRegistrationDetails booking={booking} />
    </MantineProvider>,
  );
  assert.match(html, /Mokėjimo būdas:/);
  assert.match(html, /Banko pavedimu/);
  assert.match(html, /Registruota \(Vilniaus laiku\):/);
  assert.match(html, /2026-09-25 16:45/);
  assert.equal(bookingPaymentStatusLabel(booking), 'Laukia mokėjimo');
});

test('payment method stays independent of payment state and unknown choices are not guessed', () => {
  assert.equal(paymentMethodLabel('bank_transfer'), 'Banko pavedimu');
  assert.equal(paymentMethodLabel('card'), 'Kortele');
  for (const value of [undefined, null, 'manual', 'stripe'])
    assert.equal(paymentMethodLabel(value), 'Nenurodytas');
  assert.equal(bookingPaymentStatusLabel({ ...booking, payment: { status: 'paid' } }), 'Apmokėta');
  assert.equal(
    bookingPaymentStatusLabel({ ...booking, payment: { status: 'failed' } }),
    'Nepavyko',
  );
  assert.equal(
    bookingPaymentStatusLabel({ ...booking, payment: { status: 'refunded' } }),
    'Pinigai grąžinti',
  );
  assert.equal(bookingPaymentStatusLabel({ ...booking, status: 'expired' }), 'Mokėjimo įrašo nėra');
});

test('registration times use Vilnius time including date rollover and winter offset', () => {
  assert.equal(formatDateTime('2026-09-25T22:45:00Z'), '2026-09-26 01:45');
  assert.equal(formatDateTime('2026-12-25T22:45:00Z'), '2026-12-26 00:45');
  for (const value of [undefined, null, '', 'not-a-date'])
    assert.equal(formatDateTime(value), 'Nenurodyta');
});

test('mobile cards include all reservation fields and a details button; desktop table has native scrolling', () => {
  const html = renderToStaticMarkup(
    <MantineProvider>
      <ReservationsList bookings={[booking]} onView={() => {}} />
    </MantineProvider>,
  );
  assert.match(html, /role="listitem"/);
  for (const value of [
    'Testo Dalyvė',
    'test@example.invalid',
    'Puodelio dirbtuvės',
    'Banko pavedimu',
    'Laukia mokėjimo',
    '2026-09-25 16:45',
    'Dalyviai',
    'Suma',
    '50',
    'EUR',
  ])
    assert.ok(html.includes(value), value);
  assert.match(html, /aria-label="Rezervacijos detalės: Testo Dalyvė"/);
  assert.match(html, /mantine-hidden-from-lg/);
  assert.match(html, /mantine-visible-from-lg/);
  assert.match(html, /aria-label="Rezervacijos: slenkama lentelė"/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /--table-overflow:auto/);
  assert.match(html, /--table-min-width:calc\(71\.875rem/);
});

test('deleted workshop names remain available from the reservation snapshot', () => {
  const old = {
    ...booking,
    workshop: null,
    contractSnapshot: { serviceName: ' Ankstesnės dirbtuvės ' },
  };
  assert.equal(bookingWorkshopName(old), 'Ankstesnės dirbtuvės');
  const html = renderToStaticMarkup(
    <MantineProvider>
      <ReservationsList bookings={[old]} onView={() => {}} />
    </MantineProvider>,
  );
  assert.match(html, /Ištrintas užsiėmimas/);
  assert.match(html, /Ankstesnės dirbtuvės/);
});
