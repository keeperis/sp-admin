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
export type OrderStatus = 'awaiting_payment' | 'paid' | 'expired' | 'cancelled';
export type ShopOrderView = {
  id: string;
  number: string;
  mode: 'test';
  status: OrderStatus;
  paymentMethod: 'card' | 'bank_transfer';
  createdAt: string;
  paidAt: string | null;
  customer: { name: string; email: string; phone: string };
  delivery: { method: 'studio' | 'parcel'; location: string; label: string };
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
};
