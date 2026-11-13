import { type OrderStatus, orderStatusLabels, type ShopCommerceMode } from './commerce-contract';

// Only an explicit server-provided live mode may describe a real payment.
export const commerceMode = (mode: unknown): ShopCommerceMode =>
  mode === 'live' ? 'live' : 'test';
export const isLiveCommerce = (mode: unknown) => commerceMode(mode) === 'live';
export const orderStatusLabel = (status: OrderStatus, mode: unknown) =>
  status === 'paid' && !isLiveCommerce(mode) ? 'Apmokėta (testas)' : orderStatusLabels[status];
export const paymentLabel = (method: 'card' | 'bank_transfer', mode: unknown) =>
  method === 'card'
    ? isLiveCommerce(mode)
      ? 'Stripe'
      : 'Stripe TEST'
    : isLiveCommerce(mode)
      ? 'Bankinis pavedimas'
      : 'Pavedimas · TEST';

export const bankPaymentConfirmation = (mode: unknown) =>
  isLiveCommerce(mode) ? { confirmReceivedPayment: true } : { confirmTestPayment: true };
