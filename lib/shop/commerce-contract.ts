// Shared with sp-admin and sp-shop. All commerce in this iteration is explicitly test-only.
export const documentKinds = ['terms', 'delivery', 'returns', 'privacy', 'cookies'] as const;
export type DocumentKind = (typeof documentKinds)[number];
export const documentLinks: Record<DocumentKind, { title: string; slug: string }> = {
  terms: { title: 'Pirkimo sąlygos', slug: 'pirkimo-salygos' },
  delivery: { title: 'Pristatymas ir apmokėjimas', slug: 'pristatymas' },
  returns: { title: 'Grąžinimas ir garantija', slug: 'grazinimas' },
  privacy: { title: 'Privatumo politika', slug: 'privatumas' },
  cookies: { title: 'Slapukai ir vietinė saugykla', slug: 'slapukai' },
};
export type CommerceDocument = { title: string; body: string; version: string; reviewed: boolean };
export type PickupSchedule = {
  weekly: Array<{ day: number; intervals: Array<{ start: string; end: string }> }>;
  exceptions: Array<{ date: string; closed: boolean; intervals: Array<{ start: string; end: string }>; note: string }>;
};
export type ShopCourierAddress = { street: string; city: string; postalCode: string; country: 'LT' };
export type CommerceSettings = {
  mode: 'test';
  seller: {
    name: string;
    code: string;
    vatCode: string;
    address: string;
    returnAddress: string;
    email: string;
    phone: string;
  };
  bank: {
    beneficiaryName: string;
    beneficiaryCode: string;
    iban: string;
    bankName: string;
    paymentPurposePrefix: string;
  };
  delivery: {
    pickupLabel: string;
    pickupAddress: string;
    pickupFeeCents: number;
    parcelLabel: string;
    parcelFeeCents: number;
    courierEnabled: boolean;
    courierFeeCents: number;
    pickupSchedule: PickupSchedule;
    estimatedDays: string;
  };
  documents: Record<DocumentKind, CommerceDocument>;
};
export type CommerceSnapshot = {
  revision: number;
  updatedAt: string | null;
  data: CommerceSettings;
  stripeReady: boolean;
  webhookReady: boolean;
};
export type OrderLine = {
  id: string;
  slug: string;
  name: string;
  image: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
};
export type OrderStatus = 'awaiting_payment' | 'paid' | 'expired' | 'cancelled' | 'payment_review';
export type FulfillmentStatus =
  | 'unfulfilled'
  | 'preparing'
  | 'ready_for_pickup'
  | 'shipped'
  | 'fulfilled';
export type FulfillmentHistoryEntry = {
  revision: number;
  status: Exclude<FulfillmentStatus, 'unfulfilled'>;
  at: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
};
export const fulfillmentStatusLabels: Record<FulfillmentStatus, string> = {
  unfulfilled: 'Dar neruošiamas',
  preparing: 'Ruošiamas',
  ready_for_pickup: 'Paruoštas atsiimti',
  shipped: 'Išsiųstas',
  fulfilled: 'Įvykdytas',
};
export type ShopNotificationView = {
  id: string;
  eventKey: string;
  kind: string;
  label: string;
  subject: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'dead' | 'preview';
  transport: 'preview' | 'smtp';
  attempts: number;
  createdAt: string;
  sentAt: string | null;
  nextAttemptAt: string | null;
  lastError: string | null;
};
export type ShopNotificationList = {
  notifications: ShopNotificationView[];
  transport: 'preview' | 'smtp' | 'disabled';
  configured: boolean;
};
export type ShopNotificationPreview = {
  subject: string;
  text: string;
  html: string;
  contractText: string;
  returnUrl: string;
};
export type ShopDpdLocker = {
  id: string;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: 'LT';
};
export type ShopOrderView = {
  id: string;
  number: string;
  mode: 'test';
  status: OrderStatus;
  paymentMethod: 'card' | 'bank_transfer';
  createdAt: string;
  paidAt: string | null;
  reservationExpiresAt: string | null;
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentRevision: number;
  fulfillmentUpdatedAt: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  fulfillmentHistory: FulfillmentHistoryEntry[];
  customer: { name: string; email: string; phone: string };
  delivery: {
    method: 'studio' | 'parcel' | 'courier';
    location: string;
    label: string;
    dpdLocker?: ShopDpdLocker;
    courierAddress?: ShopCourierAddress;
  };
  lines: OrderLine[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: 'EUR';
  bank: CommerceSettings['bank'];
  paymentReference: string;
  seller: CommerceSettings['seller'];
  documents: CommerceSettings['documents'];
  acceptedAt: string;
  checkoutUrl: string | null;
  withdrawalRequestedAt: string | null;
};
export const orderStatusLabels: Record<OrderStatus, string> = {
  awaiting_payment: 'Laukiama apmokėjimo',
  paid: 'Apmokėta (testas)',
  expired: 'Mokėjimo laikas baigėsi',
  cancelled: 'Atšauktas',
  payment_review: 'Mokėjimą reikia patikrinti',
};
