'use client';

import { Stack, Text } from '@mantine/core';
import {
  bookingWorkshopStartISO,
  formatDateTime,
  paymentMethodLabel,
  type ReservationBooking,
} from '@/lib/reservations/presentation';

export function BookingRegistrationDetails({
  booking,
}: {
  booking: Pick<
    ReservationBooking,
    'paymentMethod' | 'createdAt' | 'source' | 'workshop' | 'contractSnapshot'
  >;
}) {
  return (
    <Stack gap={4}>
      <Text size="sm">
        <strong>Renginio pradžia:</strong>{' '}
        {bookingWorkshopStartISO(booking).replace('T', ' ') || 'Nenurodyta'}
      </Text>
      <Text size="sm">
        <strong>Registracijos šaltinis:</strong>{' '}
        {booking.source === 'website'
          ? 'Svetainė'
          : booking.source === 'admin'
            ? 'Administratorius'
            : booking.source === 'voucher'
              ? 'Dovanų kuponas'
              : booking.source || 'Nenurodytas'}
      </Text>
      <Text size="sm">
        <strong>Mokėjimo būdas:</strong> {paymentMethodLabel(booking.paymentMethod)}
      </Text>
      <Text size="sm">
        <strong>Registruota (Vilniaus laiku):</strong> {formatDateTime(booking.createdAt)}
      </Text>
    </Stack>
  );
}
