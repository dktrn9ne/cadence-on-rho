import { describe, it, expect } from 'vitest';
import { createCycle, startShift, payrollTotals, requestPayout, settlePayout, validateCycle } from './usdPayroll.js';
const start = Date.parse('2026-10-26T14:00:00Z');
const worked = (options = {}) => startShift(createCycle({ now: start, ...options }),start);
describe('USD accrual and daily payouts', () => {
  it('accrues at 15-second intervals from elapsed approved work, caps shift hours, and retains fractions until display', () => {
    const cycle = worked();
    expect(payrollTotals(cycle,start+14999).gross).toBe(0);
    expect(payrollTotals(cycle,start+15000).gross).toBe(10);
    expect(payrollTotals(cycle,start+8*3600000).gross).toBe(19200);
    expect(payrollTotals(cycle,start+24*3600000).gross).toBe(19200);
    const odd = worked({hourly:'17.13'});
    expect(payrollTotals(odd,start+3600000).gross).toBe(1713);
  });
  it('reserves pending and uncertain money and refuses to spend it twice', () => {
    const now = start+2*3600000;
    let cycle = requestPayout(worked(),'30','a',now);
    expect(payrollTotals(cycle,now).available).toBe(840);
    expect(() => requestPayout(cycle,'10','b',now)).toThrow('available');
    cycle = settlePayout(cycle,'a','unknown');
    expect(payrollTotals(cycle,now).reserved).toBe(3000);
    cycle = settlePayout(cycle,'a','failed');
    expect(payrollTotals(cycle,now).available).toBe(3840);
    expect(() => settlePayout(cycle,'a','paid')).toThrow('confirmed');
  });
  it('enforces three accepted requests per Chicago day, including failures, and resets after local midnight', () => {
    let cycle = worked(); const now = Date.parse('2026-10-27T04:59:59Z');
    for (let i=0;i<3;i++) cycle = requestPayout(cycle,'1',String(i),now);
    cycle = settlePayout(cycle,'0','failed');
    expect(payrollTotals(cycle,now).remaining).toBe(0);
    expect(() => requestPayout(cycle,'1','four',now)).toThrow('three');
    expect(payrollTotals(cycle,Date.parse('2026-10-27T05:00:00Z')).remaining).toBe(3);
  });
  it('does not accrue off shift, beyond the cycle, or for overlapping work', () => {
    let cycle = worked(); cycle = { ...cycle, shifts: [{start,end:start+3600000}] };
    expect(payrollTotals(cycle,start+3*3600000).gross).toBe(2400);
    expect(() => startShift(cycle,start+4*3600000)).toThrow('already');
    expect(() => startShift(worked(),start+86400000)).toThrow('current shift');
    const last = Date.parse('2026-11-09T05:00:00Z');
    cycle = { ...createCycle({now:start}),shifts:[{start:last,end:null}] };
    expect(payrollTotals(cycle,last+8*3600000).gross).toBe(2400);
  });
  it('honors five or six workdays per cycle week', () => {
    let cycle = createCycle({now:start,days:14,workdays:5});
    for(let i=0;i<5;i++) { cycle=startShift(cycle,start+i*86400000); cycle={...cycle,shifts:cycle.shifts.map(s=>s.end===null?{...s,end:s.start+8*3600000}:s)}; }
    expect(() => startShift(cycle,start+5*86400000)).toThrow('workdays');
    expect(startShift(cycle,start+7*86400000).shifts).toHaveLength(6);
  });
  it('fails closed on corrupt records and rejects duplicate request IDs', () => {
    const now=start+3600000;
    expect(() => validateCycle({...worked(),rate:NaN})).toThrow('review');
    const cycle=requestPayout(worked(),'1','same',now);
    expect(() => requestPayout(cycle,'1','same',now)).toThrow('exists');
  });
});
