import { createCycle, validateCycle } from './usdPayroll.js';

// Isolated presentation fixture. Never used by the connected payment engine.
export function hackathonScenario(now = Date.now()) {
  const start = now - 4 * 3600000;
  return validateCycle({
    ...createCycle({ hourly: '30', days: 14, shiftHours: 8, workdays: 5, now: start }),
    shifts: [{ start, end: null }],
    payouts: [
      { id: 'demo-morning-payout', amount: 2500, createdAt: now - 3600000, status: 'paid', payer: 'demo-employer', destination: 'demo-worker', rail: 'rlusd' },
      { id: 'demo-lunch-request', amount: 4000, createdAt: now - 60000, status: 'pending', payer: 'demo-employer', destination: 'demo-worker', rail: 'rlusd' },
    ],
  });
}
