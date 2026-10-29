import { describe, it, expect } from 'vitest';
import { hackathonScenario } from './hackathonScenario.js';
import { payrollTotals, requestPayout } from './usdPayroll.js';

describe('hackathon presentation scenario', () => {
  it('shows accrual, a prior settlement, a reservation, and exactly one remaining daily request', () => {
    const now = Date.parse('2026-10-28T17:00:00Z');
    const cycle = hackathonScenario(now);
    expect(payrollTotals(cycle, now)).toMatchObject({ gross: 12000, held: 2400, paid: 2500, reserved: 4000, available: 3100, remaining: 1 });
    const third = requestPayout(cycle, '15', 'demo-third', now);
    expect(payrollTotals(third, now)).toMatchObject({ available: 1600, remaining: 0 });
    expect(() => requestPayout(third, '1', 'demo-fourth', now)).toThrow('All three');
    expect(payrollTotals(cycle, now + 15000).gross).toBe(12012);
  });
});
