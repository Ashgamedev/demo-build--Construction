/**
 * Currency math utilities for Deepthi Construction CRM.
 * Single source of truth for all percentage ↔ amount calculations.
 * Uses integer rounding to avoid floating-point currency issues.
 */

/**
 * Calculate milestone amount from contract value and percentage.
 * Returns amount rounded to nearest rupee.
 */
export function calculateMilestoneAmount(contractValue: number, percentage: number): number {
  if (!contractValue || !percentage) return 0;
  return Math.round((contractValue * percentage) / 100);
}

/**
 * Calculate milestone percentage from contract value and amount.
 * Returns percentage with up to 2 decimal places.
 */
export function calculateMilestonePercentage(contractValue: number, amount: number): number {
  if (!contractValue || !amount) return 0;
  return Math.round((amount / contractValue) * 10000) / 100; // 2 decimal precision
}

/**
 * Validate a payment schedule against contract value.
 * Returns validation result with details.
 */
export interface ScheduleValidation {
  totalAmount: number;
  totalPercentage: number;
  difference: number;
  isValid: boolean;
  message: string;
}

export function validatePaymentSchedule(
  contractValue: number,
  schedule: Array<{ percentage: number; amount: number }>
): ScheduleValidation {
  const totalAmount = schedule.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalPercentage = schedule.reduce((sum, s) => sum + (s.percentage || 0), 0);
  const difference = contractValue - totalAmount;
  
  // Allow ±1 rupee tolerance for rounding
  const isValid = Math.abs(difference) <= 1 && Math.abs(totalPercentage - 100) <= 0.1;
  
  let message = '';
  if (isValid) {
    message = 'Payment schedule matches contract value.';
  } else if (Math.abs(totalPercentage - 100) > 0.1) {
    message = `Total percentage is ${totalPercentage.toFixed(1)}%. It should be exactly 100%.`;
  } else {
    message = `Scheduled amount (₹${totalAmount.toLocaleString('en-IN')}) does not match contract value (₹${contractValue.toLocaleString('en-IN')}). Difference: ₹${Math.abs(difference).toLocaleString('en-IN')}.`;
  }

  return { totalAmount, totalPercentage, difference, isValid, message };
}

/**
 * Format currency for display (Indian numbering system).
 */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
