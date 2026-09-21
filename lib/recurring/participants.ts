export type ParticipantSubscription = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: string;
  defaultGroupId: string;
  validFrom: string;
  validUntil: string;
  remainingSessions: number;
  totalSessions: number;
  purchaseChannel?: string;
};

export type ParticipantReservation = {
  id: string;
  subscriptionId: string;
  status: string;
  reservationType: string;
  subscription: ParticipantSubscription | null;
};

export const participantStatusLabels: Record<string, string> = {
  active: 'Aktyvus',
  paused: 'Pristabdytas',
  pending_payment: 'Laukia mokėjimo',
  completed: 'Užbaigtas',
  expired: 'Pasibaigęs',
  cancelled: 'Atšauktas',
  scheduled: 'Suplanuota',
  attended: 'Dalyvavo',
  no_show: 'Neatvyko',
  cancelled_early: 'Atšauktas laiku',
  cancelled_late: 'Atšauktas per vėlai',
  released: 'Vieta atlaisvinta',
};

export function participantStatusColor(status: string) {
  if (['active', 'scheduled', 'attended'].includes(status)) return 'green';
  if (['paused', 'pending_payment'].includes(status)) return 'orange';
  if (['no_show', 'cancelled_late'].includes(status)) return 'red';
  return 'gray';
}

export function vilniusDate(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Vilnius' }).format(now);
}

export function nextGroupDate(
  weekday: number,
  effectiveFrom: string,
  today = vilniusDate(),
  startTime?: string,
  now = new Date(),
) {
  const date = new Date(`${today > effectiveFrom ? today : effectiveFrom}T12:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + ((weekday - day + 7) % 7));
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Vilnius',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  if (startTime && date.toISOString().slice(0, 10) === vilniusDate(now) && startTime <= time) {
    date.setUTCDate(date.getUTCDate() + 7);
  }
  return date.toISOString().slice(0, 10);
}

// Count actual attendance reservations, not default-group memberships. Makeup visitors count too.
export function rosterCounts(reservations: ParticipantReservation[]) {
  return {
    scheduled: reservations.filter((item) => item.status === 'scheduled').length,
    attended: reservations.filter((item) => item.status === 'attended').length,
    cancelled: reservations.filter((item) =>
      ['cancelled_early', 'cancelled_late', 'released'].includes(item.status),
    ).length,
  };
}
