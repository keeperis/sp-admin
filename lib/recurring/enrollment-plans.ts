import type { ParticipantEnrollment } from './participants';

export type EnrollmentPlan = {
  id: string;
  nameLt: string;
  sessionCount: number;
  validityDays: number;
  priceEur: number;
};

export function enrollmentPlans(
  plans: EnrollmentPlan[],
  singleVisitEnabled: boolean,
  kind?: ParticipantEnrollment['kind'],
) {
  return plans.filter((plan) => {
    if (plan.sessionCount === 1) return singleVisitEnabled && kind !== 'pass';
    return kind !== 'single_visit';
  });
}

export function preferredEnrollmentPlan(plans: EnrollmentPlan[], previousPlanId?: string) {
  return plans.find((plan) => plan.id === previousPlanId) || plans[0];
}

export function enrollmentPrice(plan: EnrollmentPlan, singleVisitPriceEur?: number | null) {
  return plan.sessionCount === 1 ? (singleVisitPriceEur ?? plan.priceEur) : plan.priceEur;
}
