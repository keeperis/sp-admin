'use client';

import { Stack, Text } from '@mantine/core';
import {
  formatDateTime,
  paymentMethodLabel,
  type ReservationBooking,
} from '@/lib/reservations/presentation';

export function BookingRegistrationDetails({
  booking,
}: {
  booking: Pick<ReservationBooking, 'paymentMethod' | 'createdAt'>;
}) {
  return (
    <Stack gap={4}>
      <Text size="sm">
        <strong>Mokėjimo būdas:</strong> {paymentMethodLabel(booking.paymentMethod)}
      </Text>
      <Text size="sm">
        <strong>Registruota (Vilniaus laiku):</strong> {formatDateTime(booking.createdAt)}
      </Text>
    </Stack>
  );
}
