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
  assert.match(html, /Renginio pradžia:/);
  assert.match(html, /2026-10-02 17:00/);
  assert.match(html, /Registracijos šaltinis:/);
  assert.match(html, /Svetainė/);
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

test('compact list shows name, status and participant count once; full information stays in details', () => {
  const html = renderToStaticMarkup(
    <MantineProvider>
      <ReservationsList bookings={[booking]} onView={() => {}} />
    </MantineProvider>,
  );
  assert.match(html, /<ul/);
  assert.match(html, /<li/);
  for (const value of ['Testo Dalyvė', 'Laukia mokėjimo', 'Dalyviai: 1'])
    assert.ok(html.includes(value), value);
  for (const value of [
    'test@example.invalid',
    '+37060000000',
    'Puodelio dirbtuvės',
    'Banko pavedimu',
    '2026-09-25 16:45',
    'EUR',
  ])
    assert.ok(!html.includes(value), value);
  assert.match(html, /aria-label="Rezervacijos detalės: Testo Dalyvė"/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.equal((html.match(/<button /g) || []).length, 1);
  assert.ok(!html.includes('<table'));
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
      <BookingRegistrationDetails
        booking={{
          ...old,
          contractSnapshot: { ...old.contractSnapshot, startISO: '2026-01-01T12:00' },
        }}
      />
    </MantineProvider>,
  );
  assert.match(html, /2026-01-01 12:00/);
});

test('eight reservations render as exactly eight compact buttons, including a group booking', () => {
  const bookings = Array.from({ length: 8 }, (_, i) => ({
    ...booking,
    id: `booking-${i}`,
    customerName: `Dalyvis ${i + 1}`,
    participantsCount: i === 7 ? 3 : 1,
  }));
  const html = renderToStaticMarkup(
    <MantineProvider>
      <ReservationsList bookings={bookings} onView={() => {}} />
    </MantineProvider>,
  );
  assert.equal((html.match(/<button /g) || []).length, 8);
  assert.equal((html.match(/<li/g) || []).length, 8);
  assert.match(html, /Dalyviai: 3/);
});
