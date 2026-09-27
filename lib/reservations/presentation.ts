export type ReservationBooking = {
  id: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  source?: string;
  status: string;
  paymentMethod?: string | null;
  participantsCount: number;
  totalAmount: number;
  currency: string;
  createdAt?: string | null;
  workshopId?: string | null;
  workshop?: { titleLt?: string; titleEn?: string; startISO?: string } | null;
  contractSnapshot?: { serviceName?: string; startISO?: string } | null;
  payment?: { status?: string; provider?: string } | null;
};

export function formatDateTime(value?: string | null) {
  if (!value) return 'Nenurodyta';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Nenurodyta';
  return new Intl.DateTimeFormat('lt-LT', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Vilnius',
  }).format(date);
}

export function statusColor(status?: string | null) {
  if (status === 'confirmed' || status === 'paid') return 'green';
  if (status === 'pending_payment' || status === 'pending') return 'orange';
  if (status === 'cancelled' || status === 'failed') return 'red';
  if (status === 'expired') return 'gray';
  if (status === 'refunded') return 'grape';
  return 'blue';
}

export function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    cancelled: 'Atšaukta',
    confirmed: 'Patvirtinta',
    draft: 'Juodraštis',
    expired: 'Pasibaigė',
    failed: 'Nepavyko',
    paid: 'Apmokėta',
    pending: 'Laukiama',
    pending_payment: 'Laukia mokėjimo',
    refunded: 'Pinigai grąžinti',
    sent: 'Išsiųsta',
    valid: 'Galioja',
  };
  return status ? labels[status] || status : 'Nėra';
}

// The chosen method is independent of whether a Payment record exists yet.
// Do not infer a customer's choice from a provider, status or reservation source.
export function paymentMethodLabel(method?: string | null) {
  if (method === 'bank_transfer') return 'Banko pavedimu';
  if (method === 'card') return 'Kortele';
  return 'Nenurodytas';
}

export function bookingPaymentStatus(booking: Pick<ReservationBooking, 'payment' | 'status'>) {
  return (
    booking.payment?.status || (booking.status === 'pending_payment' ? 'pending_payment' : null)
  );
}

export function bookingPaymentStatusLabel(booking: Pick<ReservationBooking, 'payment' | 'status'>) {
  const status = bookingPaymentStatus(booking);
  return status ? statusLabel(status) : 'Mokėjimo įrašo nėra';
}

export const deletedWorkshopLabel = 'Ištrintas užsiėmimas';

export function bookingWorkshopName(booking: ReservationBooking) {
  if (booking.workshop)
    return booking.workshop.titleLt || booking.workshop.titleEn || booking.workshopId || '-';
  if (booking.workshop === null) {
    const name = booking.contractSnapshot?.serviceName;
    return (typeof name === 'string' ? name.trim() : '') || booking.workshopId || '-';
  }
  return booking.workshopId || '-';
}

export function bookingWorkshopStartISO(booking: ReservationBooking) {
  const value =
    booking.workshop?.startISO ||
    (booking.workshop === null ? booking.contractSnapshot?.startISO : '');
  return typeof value === 'string' ? value : '';
}
