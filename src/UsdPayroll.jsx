import { useEffect, useState } from 'react';
import { CadenceLockup } from './brand/CadenceMark.jsx';
import { theme } from './brand/tokens.js';
import { createCycle, validateCycle, payrollTotals, startShift, requestPayout, settlePayout, dollars, localDay } from './domain/usdPayroll.js';
import './payrollReadiness.css';
import './usdPayroll.css';

const KEY = 'cadence-usd-payroll-demo-v1';
const load = () => { const raw = localStorage.getItem(KEY); return raw ? validateCycle(JSON.parse(raw)) : createCycle(); };
export default function UsdPayroll() {
  const [cycle, setCycle] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState('worker');
  const [now, setNow] = useState(Date.now());
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [bankBusy, setBankBusy] = useState(false);
  const [bankError, setBankError] = useState('');
  const [account, setAccount] = useState('');
  useEffect(() => {
    const previous = document.title; document.title = 'Cadence on Rho · USD payroll';
    const refresh = () => { try { setCycle(load()); setError(''); } catch { setCycle(null); setError('Stored payroll data could not be read. Requests are blocked; preserve the data for review.'); } };
    refresh(); window.addEventListener('storage', refresh);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { document.title = previous; window.removeEventListener('storage', refresh); clearInterval(timer); };
  }, []);
  const mutate = async action => {
    if (!navigator.locks) { setError('This browser cannot safely coordinate payout requests. Use a current browser on localhost or HTTPS.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await navigator.locks.request(KEY, () => {
        const next = validateCycle(action(load(), Date.now()));
        localStorage.setItem(KEY, JSON.stringify(next));
        setCycle(next); setNow(Date.now());
      });
    } catch (e) { setError(e.message || 'Could not save this change. No payout was requested.'); }
    finally { setBusy(false); }
  };
  const readBank = async () => {
    setBankBusy(true); setSnapshot(null); setBankError('');
    try {
      const response = await fetch('/api/rho-readiness', { cache: 'no-store', signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!Array.isArray(data.accounts) || !['sandbox','production'].includes(data.mode)) throw new Error();
      setSnapshot(data); setAccount(data.accounts.find(a => a.type === 'checking' && a.balance.currency === 'USD')?.id || '');
    } catch { setBankError('Rho is unavailable. Check the local server and try again.'); }
    finally { setBankBusy(false); }
  };
  let totals;
  try { if (cycle) totals = payrollTotals(cycle, now); } catch { /* Invalid records remain blocked. */ }
  const active = cycle?.shifts.find(s => s.end === null);
  const running = active && now < active.start + cycle.shiftHours * 3600000 && !totals?.ended;
  const checking = snapshot?.accounts.filter(a => a.type === 'checking' && a.balance.currency === 'USD') || [];
  const bank = checking.find(a => a.id === account);
  const configure = event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    mutate(current => {
      if (current.shifts.length || current.payouts.length) throw new Error('Pay terms are locked once work is recorded. Finish and reconcile this cycle before creating another.');
      return createCycle({ hourly: form.get('hourly'), days: Number(form.get('days')), shiftHours: Number(form.get('hours')), workdays: Number(form.get('workdays')) });
    });
  };
  return <div className="readiness-page usd-payroll" style={{ '--pr-bg': theme.bg, '--pr-card': theme.bgRaised, '--pr-line': theme.hairline, '--pr-text': theme.textPrimary, '--pr-muted': theme.textMuted }}>
    <header className="pr-top"><CadenceLockup compact platform="Rho" /><nav className="pr-top-actions" aria-label="Payroll views"><button aria-pressed={view === 'worker'} onClick={() => setView('worker')}>Worker</button><button aria-pressed={view === 'employer'} onClick={() => setView('employer')}>Employer</button><a href="/?readiness=demo">Funding overview</a></nav></header>
    <main className="pr-main"><div className="pr-heading"><div><p className="pr-eyebrow">CADENCE ON RHO / USD PAYROLL</p><h1>{view === 'worker' ? 'Your work. Your daily rhythm.' : 'A payday that follows the work.'}</h1><p>Earn throughout your shift. Request access up to three times a day.</p></div><span className={`pr-status ${running ? 'pr-good' : ''}`}>{running ? 'Shift accruing · 15-second intervals' : 'Shift not accruing'}</span></div>
      <p className="pr-notice"><b>Interactive payroll simulation.</b> One sample worker; all shifts and payout results here are simulated and saved on this browser. Rho account reads are separate. No USD is moved, no deposits are made, and no employer funds are reserved.</p>
      {error && <p className="pr-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      {cycle && totals ? <>
        <div className="usd-cycle"><span>{cycle.days === 7 ? 'Weekly' : 'Biweekly'} cycle · {cycle.startDay} through {new Date(Date.parse(`${cycle.endDay}T12:00:00Z`)-86400000).toISOString().slice(0,10)}</span><span>{dollars(cycle.rate)}/hour · {cycle.shiftHours} hours/day · {cycle.workdays} days/week</span></div>
        <div className="pr-metrics"><article><span>Earned gross so far</span><strong>{dollars(totals.gross)}</strong><small>Based on recorded sample work time</small></article><article className="pr-shortfall"><span>Available to request · estimated</span><strong>{dollars(totals.available)}</strong><small>After a 20% illustrative payroll hold and payout reservations</small></article><article><span>Daily requests remaining</span><strong>{totals.remaining} of 3</strong><small>Resets at midnight in America/Chicago</small></article></div>
        <div className="pr-columns"><section className="pr-card"><p className="pr-eyebrow">{view === 'worker' ? 'YOUR PAY' : 'TIME & EARNINGS'}</p><h2>{view === 'worker' ? 'Choose your next payout.' : 'Record a sample shift.'}</h2>
          {view === 'worker' ? <form onSubmit={e => { e.preventDefault(); mutate((current,time) => requestPayout(current, amount, crypto.randomUUID(), time)); }}><label className="pr-account">Payout amount (USD)<input name="amount" inputMode="decimal" placeholder="25.00" value={amount} onChange={e => setAmount(e.target.value)} required /></label><button className="pr-primary" disabled={busy || !totals.remaining || totals.available < 1}>Request simulated payout</button><p>Requests reserve their amount immediately. Daily limits count accepted requests, including failed requests. Bank deposit timing is separate.</p></form> : <><p>Recorded work accrues only within this cycle, capped at {cycle.shiftHours} hours per shift and {cycle.workdays} workdays per cycle week. Shift controls are demonstration controls, not verified timekeeping.</p><div className="usd-actions"><button disabled={busy || Boolean(active) || totals.ended} onClick={() => mutate((current,time) => startShift(current,time))}>Start sample shift</button><button disabled={busy || !active} onClick={() => mutate((current,time) => ({ ...current, shifts: current.shifts.map(s => s.end === null ? { ...s, end: Math.min(time,s.start + current.shiftHours * 3600000) } : s) }))}>End sample shift</button><button disabled={busy || cycle.shifts.length > 0 || cycle.payouts.length > 0} onClick={() => mutate((current,time) => {
            const start = time - 2 * 3600000;
            const next = createCycle({ hourly: (current.rate/100).toFixed(2), days: current.days, shiftHours: current.shiftHours, workdays: current.workdays, now: start });
            return { ...next, shifts: [{ start, end: null }] };
          })}>Load two hours of sample work</button></div></>}
          <div className="usd-breakdown"><div><span>Illustrative payroll hold</span><b>{dollars(totals.held)}</b></div><div><span>Pending / uncertain requests</span><b>{dollars(totals.reserved)}</b></div><div><span>Simulated paid</span><b>{dollars(totals.paid)}</b></div></div><p className="pr-footnote">The 20% hold illustrates a reserve; it is not calculated tax, a payslip, or verified net pay. Actual eligibility requires approved payroll deductions and a funded payout arrangement.</p>
        </section><section className="pr-card"><p className="pr-eyebrow">{view === 'worker' ? 'HOW YOUR CYCLE WORKS' : 'EMPLOYER SETUP'}</p><h2>{view === 'worker' ? 'Small intervals. Flexible access.' : 'Set the rhythm.'}</h2>
          {view === 'worker' ? <ol className="pr-checklist"><li><b>Earn every 15 seconds</b><span>Elapsed recorded work determines earnings—even after a reload. Off-shift time does not accrue.</span></li><li><b>Request up to three daily payouts</b><span>Only the estimated eligible amount is available. Pending and uncertain requests stay reserved.</span></li><li><b>Reconcile at cycle close</b><span>Review earnings, holds, and payout results. The remaining balance is not automatically deposited.</span></li></ol> : <form onSubmit={configure}><fieldset disabled={busy || cycle.shifts.length > 0 || cycle.payouts.length > 0}><label>Hourly rate (USD)<input name="hourly" defaultValue={(cycle.rate/100).toFixed(2)} inputMode="decimal" required /></label><label>Pay cycle<select name="days" defaultValue={cycle.days}><option value="7">One week</option><option value="14">Two weeks</option></select></label><label>Hours per shift<select name="hours" defaultValue={cycle.shiftHours}>{[8,9,10,11,12].map(n => <option key={n} value={n}>{n} hours</option>)}</select></label><label>Workdays per week<select name="workdays" defaultValue={cycle.workdays}><option value="5">5 days</option><option value="6">6 days</option></select></label><button>Save pay-cycle settings</button></fieldset><p>Pay terms lock after the first recorded shift or payout.</p></form>}
        </section></div>
        {view === 'employer' && <section className="pr-card"><div className="pr-card-title"><div><p className="pr-eyebrow">RHO BUSINESS CASH</p><h2>See the funding context.</h2></div><button onClick={readBank} disabled={bankBusy}>{bankBusy ? 'Reading Rho…' : 'Load Rho accounts'}</button></div><p>This read does not fund worker balances or execute payouts.</p>{bankError && <p role="alert" className="pr-error">{bankError}</p>}{snapshot && <><span className="pr-tag">{snapshot.mode === 'sandbox' ? 'Rho sandbox · fictional' : 'Live Rho · read only'}</span><label className="pr-account">USD checking account<select value={account} onChange={e => setAccount(e.target.value)}>{checking.map(a => <option key={a.id} value={a.id}>{a.name} · {a.last4}</option>)}</select></label><strong className="pr-bank-number">{bank ? dollars(bank.balance.amount) : 'No USD checking account'}</strong><p>Snapshot {new Date(snapshot.fetchedAt).toLocaleString()}. This is bank cash context, not money allocated to this worker.</p></>}</section>}
        <section className="pr-card"><div className="pr-card-title"><div><p className="pr-eyebrow">PAYOUT JOURNAL</p><h2>Every request has a clear status.</h2></div><span className="pr-tag">{localDay(now)} · America/Chicago</span></div><div className="pr-table-wrap"><table><thead><tr><th>Requested</th><th>Amount</th><th>Status</th>{view === 'employer' && <th>Simulate bank result</th>}</tr></thead><tbody>{cycle.payouts.map(p => <tr key={p.id}><td>{new Date(p.createdAt).toLocaleString('en-US',{timeZone:cycle.zone})}<small>{p.id}</small></td><td>{dollars(p.amount)}</td><td>{p.status === 'paid' ? 'Simulated paid' : p.status === 'unknown' ? 'Uncertain · reserved' : p.status === 'pending' ? 'Pending · reserved' : 'Confirmed failed · released'}</td>{view === 'employer' && <td>{['pending','unknown'].includes(p.status) ? <div className="usd-actions">{[['paid','Simulate paid'],['failed','Simulate failure'],['unknown','Simulate uncertain']].map(([status,label]) => <button key={status} disabled={busy} onClick={() => mutate(current => settlePayout(current,p.id,status))}>{label}</button>)}</div> : 'Result recorded'}</td>}</tr>)}{!cycle.payouts.length && <tr><td colSpan={view === 'employer' ? 4 : 3}>No payout requests yet. Record sample work from the employer view to explore the flow.</td></tr>}</tbody></table></div></section>
        {totals.ended && <section className="pr-card"><h2>Cycle closed · reconciliation required</h2><p>Review {dollars(totals.gross)} gross earnings, {dollars(totals.held)} illustrative hold, {dollars(totals.paid)} simulated paid, and {dollars(totals.reserved)} reserved. Remaining estimated eligible balance: {dollars(totals.available)}. No final payroll payment is automatic.</p></section>}
      </> : <p>Payroll is unavailable until the stored records can be read safely.</p>}
    </main>
  </div>;
}
