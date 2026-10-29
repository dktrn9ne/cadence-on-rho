import { amountUnits, weeklyUnits } from './amounts.js';
import { getSchedule } from './schedule.js';

export const SNAPSHOT_MAX_AGE_MS = 5 * 60 * 1000;
const HELD = new Set(['awaiting_signature', 'submitted', 'unresolved']);

// Advisory only. Never mutates plans or authorizes a payment.
export function payrollReadiness({ plans, payer, walletBalance, walletCheckedAt, now = Date.now() }) {
  const rows = [];
  for (const plan of plans) {
    const owner = plan.payerAddress ?? plan.payer;
    if (owner && owner !== payer) continue;
    try {
      if (!owner) throw new Error('Review this legacy plan: its paying wallet is not recorded.');
      const total = weeklyUnits(plan);
      const count = getSchedule(plan).payments;
      const paidCount = Number(plan.paidCount || 0);
      if (!Number.isSafeInteger(paidCount) || paidCount < 0 || paidCount > count) throw new Error('Payment count needs review.');
      const receipts = new Map();
      let paid = 0n;
      let held = false;
      for (const attempt of Object.values(plan.attempts || {})) {
        if (HELD.has(attempt.status)) held = true;
        if (attempt.status !== 'validated_success') continue;
        if (!Number.isSafeInteger(attempt.sequence) || attempt.sequence < 0 || attempt.sequence >= paidCount || receipts.has(attempt.sequence)) {
          throw new Error('Payment evidence is incomplete or duplicated.');
        }
        receipts.set(attempt.sequence, attempt);
        paid += amountUnits(attempt.amount);
      }
      if (receipts.size !== paidCount || paid > total) throw new Error('Payment evidence does not reconcile with this plan.');
      rows.push({ id: plan.id, name: plan.name || 'Unnamed recipient', total, paid, remaining: total - paid,
        state: held ? 'Review payment' : Number(plan.missedCount || 0) > 0 ? 'Missed payments' : total === paid ? 'Complete' : plan.active ? 'Active' : 'Paused',
        issue: held ? 'Resolve the held payment before another payout.' : Number(plan.missedCount || 0) > 0 ? 'Review missed installments in the payment plan.' : null });
    } catch (error) {
      rows.push({ id: plan.id, name: plan.name || 'Unnamed recipient', remaining: null, issue: error.message, state: 'Review evidence' });
    }
  }
  const remaining = rows.reduce((sum, row) => sum + (row.remaining ?? 0n), 0n);
  const paid = rows.reduce((sum, row) => sum + (row.paid ?? 0n), 0n);
  const completeEvidence = rows.every(row => row.remaining !== null);
  let wallet = null;
  try { wallet = amountUnits(walletBalance); } catch { /* Unknown is never a zero balance. */ }
  const fresh = Number.isFinite(walletCheckedAt) && now >= walletCheckedAt && now - walletCheckedAt <= SNAPSHOT_MAX_AGE_MS;
  const shortfall = wallet === null ? null : remaining > wallet ? remaining - wallet : 0n;
  const issues = rows.filter(row => row.issue);
  const status = !rows.length ? 'No payroll plans' : !completeEvidence || issues.length ? 'Review required' : !fresh || wallet === null ? 'Refresh wallet balance' : remaining === 0n ? 'Payroll complete' : shortfall > 0n ? 'Funding needed' : 'Wallet funded';
  return { rows, remaining, paid, completeEvidence, wallet, fresh, shortfall, issues, status };
}

export function formatUnits(units, currency = 'RLUSD') {
  if (units === null || units === undefined) return 'Unknown';
  const whole = units / 1_000_000n;
  const fraction = String(units % 1_000_000n).padStart(6, '0').replace(/0+$/, '').padEnd(2, '0');
  return `${whole.toLocaleString('en-US')}.${fraction} ${currency}`;
}
