import assert from 'node:assert/strict';
import test from 'node:test';
import { enrollmentPlans, enrollmentPrice, preferredEnrollmentPlan } from './enrollment-plans';

const plans = [
  { id: 'four', nameLt: '4 kartai', sessionCount: 4, validityDays: 35, priceEur: 100 },
  { id: 'eight', nameLt: '8 kartai', sessionCount: 8, validityDays: 70, priceEur: 190 },
  { id: 'one', nameLt: 'Vienas', sessionCount: 1, validityDays: 1, priceEur: 35 },
];
test('cell action offers only plans of the selected enrollment kind', () => {
  assert.deepEqual(
    enrollmentPlans(plans, true, 'pass').map((plan) => plan.id),
    ['four', 'eight'],
  );
  assert.deepEqual(
    enrollmentPlans(plans, true, 'single_visit').map((plan) => plan.id),
    ['one'],
  );
  assert.deepEqual(enrollmentPlans(plans, false, 'single_visit'), []);
  assert.equal(enrollmentPlans(plans, true).length, 3);
});
test('renewals default to previous active plan, or the first available plan', () => {
  const passes = enrollmentPlans(plans, true, 'pass');
  assert.equal(preferredEnrollmentPlan(passes, 'eight')?.id, 'eight');
  assert.equal(preferredEnrollmentPlan(passes, 'archived')?.id, 'four');
  assert.equal(preferredEnrollmentPlan([], 'four'), undefined);
});
test('single visit uses group price including zero, subscriptions use plan price', () => {
  assert.equal(enrollmentPrice(plans[2], 30), 30);
  assert.equal(enrollmentPrice(plans[2], 0), 0);
  assert.equal(enrollmentPrice(plans[2], null), 35);
  assert.equal(enrollmentPrice(plans[0], 30), 100);
});
