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
    enrollmentPlans(plans, 'pass').map((plan) => plan.id),
    ['four', 'eight'],
  );
  assert.deepEqual(
    enrollmentPlans(plans, 'single_visit').map((plan) => plan.id),
    ['one'],
  );
  assert.equal(enrollmentPlans(plans).length, 3);
});
test('manual admin enrollment offers single visits without requiring public group permission', () => {
  assert.deepEqual(enrollmentPlans([plans[2]], 'single_visit'), [plans[2]]);
  assert.deepEqual(enrollmentPlans([plans[2]]), [plans[2]]);
  assert.deepEqual(enrollmentPlans([plans[2]], 'pass'), []);
});
test('renewals default to previous active plan, or the first available plan', () => {
  const passes = enrollmentPlans(plans, 'pass');
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
