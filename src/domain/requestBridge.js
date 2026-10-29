import { isValidClassicAddress } from 'xrpl';
import { dollars } from './usdPayroll.js';
export const REQUEST_PREFIX = 'withdrawal-';
export const requestPlanId = request => `${REQUEST_PREFIX}${request.id}`;
export const isRequestPlan = plan => String(plan.id).startsWith(REQUEST_PREFIX);

// A withdrawal is a single installment, never a streaming scheduler plan.
// It retains the engine's existing journal, signing and recovery semantics.
export function requestPaymentPlan(request, payer) {
  if (request.payer !== payer || !isValidClassicAddress(payer)) throw new Error('Reconnect the employer wallet that approved this cycle.');
  if (!isValidClassicAddress(request.destination) || request.destination === payer) throw new Error('Provide a valid worker XRPL address different from the employer wallet.');
  if (request.rail !== 'rlusd' || request.status !== 'pending' || !Number.isSafeInteger(request.amount) || request.amount <= 0 || !request.id) throw new Error('This request is not eligible for an RLUSD payment.');
  return { id: requestPlanId(request), name: `Payout ${request.id.slice(0,8)}`, role: 'Worker payout', payer, address: request.destination, payMode: 'weekly', weeklyPay: (request.amount/100).toFixed(2), frequency: 'week', active: true, paidCount: 0, nextRunAt: null, attempts: {} };
}

export function requestOutcome(request, plans) {
  const plan = plans.find(p => p.id === requestPlanId(request));
  if (!plan) return request.status;
  if (plan.payer !== request.payer || (plan.address ?? plan.destination) !== request.destination || plan.weeklyPay !== (request.amount/100).toFixed(2)) return 'unknown';
  const attempts = Object.values(plan.attempts || {}).filter(a => a.sequence === 0).sort((a,b) => b.attemptNo-a.attemptNo);
  const attempt = attempts[0];
  if (!attempt) return 'pending';
  if (attempt.status === 'validated_success') return 'paid';
  if (['validated_failure','failed_no_hash'].includes(attempt.status)) return 'failed';
  return 'unknown';
}

export function paymentSummary(request) { return `${dollars(request.amount)} equivalent · ${(request.amount/100).toFixed(2)} RLUSD · XRPL mainnet`; }
