import assert from 'node:assert/strict';
import test from 'node:test';
import { initialDpdShipmentFields } from './dpd-recipient';

const customer = {
  name: 'Pirkėjo Testas',
  phone: '+37060000000',
  email: 'buyer@example.invalid',
};
const address = {
  street: 'Gėlių g. 1-2',
  city: 'Vilnius',
  postalCode: '01234',
  country: 'LT' as const,
};
const locker = {
  id: 'LT90001',
  name: 'Testo paštomatas',
  street: 'Paštomato g. 5',
  city: 'Kaunas',
  postalCode: '45678',
  country: 'LT' as const,
};

test('courier shipment starts with buyer contact details and the accepted courier address', () => {
  const order = {
    customer,
    delivery: {
      method: 'courier' as const,
      label: 'DPD kurjeris',
      location: 'Display-only text is not parsed for an address',
      courierAddress: address,
      dpdLocker: locker,
    },
  };
  const before = structuredClone(order);
  const fields = initialDpdShipmentFields(order);
  assert.equal(fields.deliveryType, 'courier');
  assert.deepEqual(fields.recipient, { ...customer, ...address });
  fields.recipient.street = 'Siuntai pakeistas adresas';
  assert.deepEqual(order, before);
});

test('locker shipment still prefills its canonical address and choice', () => {
  const fields = initialDpdShipmentFields({
    customer,
    delivery: {
      method: 'parcel',
      label: 'DPD paštomatas',
      location: 'Locker location',
      dpdLocker: locker,
    },
  });
  assert.equal(fields.deliveryType, 'locker');
  assert.equal(fields.lockerId, locker.id);
  assert.deepEqual(fields.recipient, {
    ...customer,
    street: locker.street,
    city: locker.city,
    postalCode: locker.postalCode,
    country: 'LT',
  });
});

test('legacy free-text orders retain buyer contact details and require an explicit address or locker', () => {
  const fields = initialDpdShipmentFields({
    customer,
    delivery: { method: 'parcel', label: 'Siuntimas', location: 'Old manual address' },
  });
  assert.equal(fields.deliveryType, 'locker');
  assert.equal(fields.lockerId, '');
  assert.deepEqual(fields.recipient, {
    ...customer,
    street: '',
    city: '',
    postalCode: '',
    country: 'LT',
  });
});
