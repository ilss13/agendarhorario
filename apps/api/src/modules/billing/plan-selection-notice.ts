const BILLABLE_STATUSES = new Set(['active', 'trialing']);

export const shouldNotifyPlanSelection = (input: {
  previousPlanId: string | null;
  previousStatus: string | null;
  nextPlanId: string;
  nextStatus: string;
}): boolean => {
  if (!BILLABLE_STATUSES.has(input.nextStatus)) return false;
  const wasBillable = input.previousStatus !== null && BILLABLE_STATUSES.has(input.previousStatus);
  if (!wasBillable) return true;
  return input.previousPlanId !== input.nextPlanId;
};
