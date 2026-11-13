import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bankPaymentConfirmation,
  commerceMode,
  orderStatusLabel,
  paymentLabel,
} from './commerce-mode';

test('missing, legacy and malformed modes cannot describe a real payment', () => {
  for (const mode of [undefined, null, '', 'LIVE', true, {}, 'production', 'test']) {
    assert.equal(commerceMode(mode), 'test');
    assert.equal(orderStatusLabel('paid', mode), 'Apmokėta (testas)');
    assert.match(paymentLabel('card', mode), /TEST/);
    assert.match(paymentLabel('bank_transfer', mode), /TEST/);
    assert.deepEqual(bankPaymentConfirmation(mode), { confirmTestPayment: true });
  }
});

test('an explicit live order uses actual-receipt confirmation, while historical TEST stays simulated', () => {
  assert.equal(commerceMode('live'), 'live');
  assert.equal(orderStatusLabel('paid', 'live'), 'Apmokėta');
  assert.equal(paymentLabel('card', 'live'), 'Stripe');
  assert.equal(paymentLabel('bank_transfer', 'live'), 'Bankinis pavedimas');
  assert.deepEqual(bankPaymentConfirmation('live'), { confirmReceivedPayment: true });
  assert.deepEqual(bankPaymentConfirmation('test'), { confirmTestPayment: true });
  assert.equal(orderStatusLabel('payment_review', 'live'), 'Mokėjimą reikia patikrinti');
});
