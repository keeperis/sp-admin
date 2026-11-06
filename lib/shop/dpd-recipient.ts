import type { ShopOrderView } from './commerce-contract';

export type DpdRecipient = {
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  postalCode: string;
  country: 'LT';
};

export function initialDpdShipmentFields(order: Pick<ShopOrderView, 'customer' | 'delivery'>) {
  const deliveryType: 'courier' | 'locker' =
    order.delivery.method === 'courier' ? 'courier' : 'locker';
  const address =
    deliveryType === 'courier' ? order.delivery.courierAddress : order.delivery.dpdLocker;
  const recipient: DpdRecipient = {
    ...order.customer,
    street: address?.street || '',
    city: address?.city || '',
    postalCode: address?.postalCode || '',
    country: 'LT',
  };
  return {
    deliveryType,
    lockerId: order.delivery.dpdLocker?.id || '',
    recipient,
  };
}
