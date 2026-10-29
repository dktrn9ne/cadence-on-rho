import { describe, expect, it } from 'vitest';
import { payrollReadiness, SNAPSHOT_MAX_AGE_MS, formatUnits } from './payrollReadiness.js';

const plan = (extra = {}) => ({ id: 'p', name: 'Worker', payer: 'employer', weeklyPay: '700', frequency: 'day', active: true, ...extra });
const calculate = (plans, extra = {}) => payrollReadiness({ plans, payer: 'employer', walletBalance: '200', walletCheckedAt: 1000, now: 1000, ...extra });

describe('payroll readiness', () => {
  it('subtracts only confirmed receipts and includes paused obligations', () => {
    const result = calculate([plan({ paidCount: 1, attempts: { a: { status: 'validated_success', sequence: 0, amount: '100' } } }), plan({ id: 'paused', weeklyPay: '0.000007', active: false })]);
    expect(result.remaining).toBe(600000007n);
    expect(result.shortfall).toBe(400000007n);
    expect(result.paid).toBe(100000000n);
    expect(result.rows[1].state).toBe('Paused');
    expect(formatUnits(result.remaining)).toBe('600.000007 RLUSD');
  });
  it('does not count another wallet or infer missing legacy evidence', () => {
    const result = calculate([plan({ payer: 'other' }), plan({ id: 'legacy', payer: null })]);
    expect(result.rows).toHaveLength(1);
    expect(result.completeEvidence).toBe(false);
    expect(result.status).toBe('Review required');
  });
  it('blocks a funded verdict for held or missed installments', () => {
    for (const status of ['awaiting_signature', 'submitted', 'unresolved']) {
      const result = calculate([plan({ attempts: { a: { status, amount: '100' } } })], { walletBalance: '900' });
      expect(result.remaining).toBe(700000000n);
      expect(result.status).toBe('Review required');
    }
    expect(calculate([plan({ missedCount: 1 })], { walletBalance: '900' }).status).toBe('Review required');
  });
  it('refuses incomplete, duplicate, or overpaid evidence', () => {
    const success = { status: 'validated_success', sequence: 0, amount: '100' };
    for (const attempts of [{}, { a: success, b: success }, { a: { ...success, amount: '701' } }]) {
      expect(calculate([plan({ paidCount: 1, attempts })]).completeEvidence).toBe(false);
    }
  });
  it('requires a current successful wallet snapshot, even when the old amount covers payroll', () => {
    expect(calculate([plan()], { walletBalance: '900' }).status).toBe('Wallet funded');
    expect(calculate([plan()], { walletBalance: '900', now: 1001 + SNAPSHOT_MAX_AGE_MS }).status).toBe('Refresh wallet balance');
    expect(calculate([plan()], { walletBalance: '900', walletCheckedAt: null }).status).toBe('Refresh wallet balance');
    expect(calculate([plan()], { walletBalance: 'NaN' }).wallet).toBe(null);
    expect(calculate([]).status).toBe('No payroll plans');
  });
});
