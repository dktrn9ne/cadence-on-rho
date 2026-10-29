export const DAILY_LIMIT = 3;
export const PAYROLL_ZONE = 'America/Chicago';
export const localDay = (time, zone = PAYROLL_ZONE) => new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(time));
export const addDays = (day, count) => new Date(Date.parse(`${day}T12:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
export function cents(value) {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(String(value))) throw new Error('Enter a USD amount with up to two decimal places.');
  const [whole, fraction = ''] = String(value).split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export const dollars = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);

export function createCycle({ hourly = '24', days = 14, shiftHours = 8, workdays = 5, now = Date.now() } = {}) {
  if (![7, 14].includes(days) || ![8, 9, 10, 11, 12].includes(shiftHours) || ![5, 6].includes(workdays)) throw new Error('Choose a supported pay cycle and schedule.');
  const rate = cents(hourly);
  if (rate < 100) throw new Error('Hourly rate must be at least $1.');
  return { version: 1, id: `cycle-${now}`, startDay: localDay(now), endDay: addDays(localDay(now), days), days, shiftHours, workdays, rate, holdPercent: 20, zone: PAYROLL_ZONE, shifts: [], payouts: [] };
}

export function validateCycle(cycle) {
  if (cycle?.version !== 1 || ![7,14].includes(cycle.days) || !Number.isSafeInteger(cycle.rate) || cycle.rate < 100 || ![8,9,10,11,12].includes(cycle.shiftHours) || ![5,6].includes(cycle.workdays) || cycle.zone !== PAYROLL_ZONE || cycle.holdPercent !== 20 || !Array.isArray(cycle.shifts) || !Array.isArray(cycle.payouts) || !/^\d{4}-\d{2}-\d{2}$/.test(cycle.startDay) || cycle.endDay !== addDays(cycle.startDay, cycle.days)) throw new Error('Stored payroll data needs review.');
  const ids = new Set();
  for (const payout of cycle.payouts) {
    if (!payout.id || ids.has(payout.id) || !['pending','paid','failed','unknown'].includes(payout.status) || !Number.isSafeInteger(payout.amount) || payout.amount <= 0 || !Number.isFinite(payout.createdAt)) throw new Error('Stored payout data needs review.');
    ids.add(payout.id);
  }
  let previousEnd = 0;
  for (const shift of cycle.shifts) {
    if (!Number.isFinite(shift.start) || (shift.end !== null && (!Number.isFinite(shift.end) || shift.end < shift.start)) || shift.start < previousEnd || localDay(shift.start) < cycle.startDay || localDay(shift.start) >= cycle.endDay) throw new Error('Stored shift data needs review.');
    previousEnd = shift.end ?? Infinity;
  }
  return cycle;
}

export function payrollTotals(cycle, now = Date.now()) {
  validateCycle(cycle);
  let ticks = 0;
  for (const shift of cycle.shifts) {
    const cap = Math.min(now, shift.end ?? now, shift.start + cycle.shiftHours * 3600000);
    let end = cap;
    if (end > shift.start && localDay(end - 1, cycle.zone) >= cycle.endDay) {
      let low = shift.start, high = end;
      while (high - low > 1) {
        const mid = Math.floor((low + high) / 2);
        if (localDay(mid, cycle.zone) < cycle.endDay) low = mid; else high = mid;
      }
      end = high;
    }
    ticks += Math.max(0, Math.floor((end - shift.start) / 15000));
  }
  const gross = Number(BigInt(ticks) * BigInt(cycle.rate) / 240n);
  const eligible = Math.floor(gross * (100 - cycle.holdPercent) / 100);
  const paid = cycle.payouts.filter(p => p.status === 'paid').reduce((sum,p) => sum + p.amount,0);
  const reserved = cycle.payouts.filter(p => p.status === 'pending' || p.status === 'unknown').reduce((sum,p) => sum + p.amount,0);
  const used = cycle.payouts.filter(p => localDay(p.createdAt, cycle.zone) === localDay(now, cycle.zone)).length;
  return { ticks, gross, held: gross - eligible, eligible, paid, reserved, available: Math.max(0, eligible - paid - reserved), remaining: Math.max(0, DAILY_LIMIT - used), ended: localDay(now,cycle.zone) >= cycle.endDay };
}

export function startShift(cycle, now = Date.now()) {
  validateCycle(cycle);
  if (localDay(now) < cycle.startDay || localDay(now) >= cycle.endDay) throw new Error('This pay cycle is not open.');
  if (cycle.shifts.some(s => s.end === null)) throw new Error('End the current shift first.');
  if (cycle.shifts.some(s => localDay(s.start) === localDay(now))) throw new Error('A shift has already been recorded today.');
  const weekIndex = Math.floor((Date.parse(`${localDay(now)}T12:00:00Z`) - Date.parse(`${cycle.startDay}T12:00:00Z`)) / 604800000);
  const worked = cycle.shifts.filter(s => Math.floor((Date.parse(`${localDay(s.start)}T12:00:00Z`) - Date.parse(`${cycle.startDay}T12:00:00Z`)) / 604800000) === weekIndex).length;
  if (worked >= cycle.workdays) throw new Error('The scheduled workdays for this week are complete.');
  return { ...cycle, shifts: [...cycle.shifts, { start: now, end: null }] };
}

export function requestPayout(cycle, amount, id, now = Date.now()) {
  const totals = payrollTotals(cycle, now);
  if (totals.remaining === 0) throw new Error('All three daily payout requests have been used.');
  const value = cents(amount);
  if (value <= 0 || value > totals.available) throw new Error('Request an amount within your available balance.');
  if (!id || cycle.payouts.some(p => p.id === id)) throw new Error('This request already exists.');
  return { ...cycle, payouts: [...cycle.payouts, { id, amount: value, createdAt: now, status: 'pending' }] };
}

export function settlePayout(cycle, id, status) {
  validateCycle(cycle);
  if (!['paid','failed','unknown'].includes(status)) throw new Error('Unsupported payout result.');
  const payout = cycle.payouts.find(p => p.id === id);
  if (!payout || !['pending','unknown'].includes(payout.status)) throw new Error('This payout already has a confirmed result.');
  return { ...cycle, payouts: cycle.payouts.map(p => p.id === id ? { ...p, status } : p) };
}
