import type { RegisterReservation } from './attendance-register';

export type AttendanceCorrection = {
  action: 'restore' | 'remove';
  subscriptionId: string;
  reservationId: string;
  date: string;
  expectedStatus: 'scheduled' | 'attended' | 'no_show';
  expectedUpdatedAt: string;
};

export function attendanceCorrectionAction(
  reservation?: RegisterReservation,
  occurrenceStatus?: string,
) {
  if (!reservation?.updatedAt) return null;
  if (reservation.status === 'scheduled') return 'remove' as const;
  if (occurrenceStatus !== 'cancelled' && ['attended', 'no_show'].includes(reservation.status))
    return 'restore' as const;
  return null;
}

export function attendanceCorrectionMessage(result: {
  action: string;
  creditedSessions?: number;
  removedDates?: string[];
}) {
  if (result.action === 'remove')
    return 'Apsilankymas pašalintas, vieta atlaisvinta. Abonemento likutis nepakeistas.';
  return [
    'Lankymo žyma atšaukta. Vizitas vėl suplanuotas.',
    result.creditedSessions ? 'Apsilankymas grąžintas į abonemento likutį.' : '',
    result.removedDates?.length
      ? `Automatinis pakaitinis vizitas pašalintas: ${result.removedDates.join(', ')}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}
