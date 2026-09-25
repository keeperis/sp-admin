import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeContactDetails, validateContactDetails } from './contact-details';

const contact = { customerName: 'Testo Dalyvis', customerEmail: '', customerPhone: '' };

test('manual contact editing requires a name but permits missing email and phone', () => {
  assert.deepEqual(validateContactDetails(contact), {});
  assert.ok(validateContactDetails({ ...contact, customerName: '  ' }).customerName);
  assert.ok(validateContactDetails(contact, true).customerEmail);
});

test('contact editing validates supplied emails and all field lengths', () => {
  for (const customerEmail of ['kai', 'a@b', 'a b@example.com', `${'a'.repeat(255)}@example.com`]) {
    assert.ok(validateContactDetails({ ...contact, customerEmail }).customerEmail);
  }
  assert.ok(validateContactDetails({ ...contact, customerName: 'a'.repeat(201) }).customerName);
  assert.ok(validateContactDetails({ ...contact, customerPhone: '1'.repeat(51) }).customerPhone);
  assert.deepEqual(
    validateContactDetails({ ...contact, customerEmail: 'test@example.com' }, true),
    {},
  );
});

test('contact values are trimmed and the email is normalized before saving', () => {
  assert.deepEqual(
    normalizeContactDetails({
      customerName: '  Testo Dalyvis  ',
      customerEmail: ' TEST@EXAMPLE.COM ',
      customerPhone: ' +37060000000 ',
    }),
    {
      customerName: 'Testo Dalyvis',
      customerEmail: 'test@example.com',
      customerPhone: '+37060000000',
    },
  );
});
