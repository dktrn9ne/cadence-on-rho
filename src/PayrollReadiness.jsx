import { useEffect, useMemo, useState } from 'react';
import { payrollReadiness, formatUnits, SNAPSHOT_MAX_AGE_MS } from './domain/payrollReadiness.js';
import { theme } from './brand/tokens.js';
import { CadenceLockup } from './brand/CadenceMark.jsx';
import './payrollReadiness.css';

const usd = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const dateLabel = date => Number.isFinite(new Date(date).getTime()) ? new Date(date).toLocaleString() : 'Unknown';

export default function PayrollReadiness({ plans = [], payer, walletBalance, walletCheckedAt, balanceLoading, onRefreshWallet, onBack, demo = false }) {
  useEffect(() => { const previous = document.title; document.title = 'Cadence on Rho'; return () => { document.title = previous; }; }, []);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountId, setAccountId] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  const result = useMemo(() => payrollReadiness({ plans, payer, walletBalance, walletCheckedAt, now }), [plans, payer, walletBalance, walletCheckedAt, now]);
  const refreshRho = async () => {
    setLoading(true); setError(''); setSnapshot(null);
    try {
      const response = await fetch('/api/rho-readiness', { cache: 'no-store', signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!['sandbox', 'production'].includes(data.mode) || !Array.isArray(data.accounts) || !Array.isArray(data.transactions) || !Number.isFinite(Date.parse(data.fetchedAt))) throw new Error();
      setSnapshot(data); setNow(Date.now());
      setAccountId(current => data.accounts.some(a => a.id === current && a.type === 'checking' && a.balance.currency === 'USD') ? current : data.accounts.find(a => a.type === 'checking' && a.balance.currency === 'USD')?.id || '');
    } catch { setError('Could not load Rho. Start the local app server or check your Rho connection, then try again.'); }
    finally { setLoading(false); }
  };
  const accounts = snapshot?.accounts.filter(a => a.type === 'checking' && a.balance.currency === 'USD') || [];
  const account = accounts.find(a => a.id === accountId);
  const transactions = snapshot?.transactions.filter(t => t.accountId === accountId) || [];
  const bankFresh = snapshot && now - Date.parse(snapshot.fetchedAt) <= SNAPSHOT_MAX_AGE_MS;
  const blockers = result.issues.length;
  return <div className="readiness-page" style={{ '--pr-bg': theme.bg, '--pr-card': theme.bgRaised, '--pr-line': theme.hairline, '--pr-text': theme.textPrimary, '--pr-muted': theme.textMuted }}>
    <header className="pr-top"><CadenceLockup compact platform="Rho" /><div className="pr-top-actions"><span className="pr-tag">{demo ? 'Demo payroll · no wallet connected' : 'Employer workspace'}</span>{onBack && <button onClick={onBack}>Back to payment plans</button>}</div></header>
    <main className="pr-main">
      <a href="/?payroll=usd" style={{ color: theme.accent2 }}>Open USD payroll · daily payout requests →</a>
      <div className="pr-heading"><div><p className="pr-eyebrow">Cadence on Rho</p><h1>Ready for the next payday.</h1><p>Know what you owe, what is funded, and what needs your attention.</p></div><span className={`pr-status ${result.status === 'Wallet funded' ? 'pr-good' : ''}`}>{result.status}</span></div>
      {demo && <p className="pr-notice">You are exploring fictional payroll plans and a sample wallet balance. Loading Rho uses its separate public sandbox, never your Cadence staging account. No payments can be made here.</p>}
      <div className="pr-metrics">
        <article><span>Remaining plan obligations</span><strong>{formatUnits(result.remaining)}</strong><small>{result.completeEvidence ? 'All unpaid installments, including paused plans' : 'Known subtotal · incomplete evidence needs review'}</small></article>
        <article><span>Employer wallet</span><strong>{formatUnits(result.wallet)}</strong><small>{result.fresh ? `Checked ${dateLabel(walletCheckedAt)}` : 'Refresh required · balance is unknown or older than 5 minutes'}</small></article>
        <article className="pr-shortfall"><span>Additional RLUSD needed</span><strong>{result.completeEvidence ? formatUnits(result.shortfall) : 'Needs review'}</strong><small>Rho cash is never counted as wallet funding</small></article>
      </div>
      <div className="pr-columns">
        <section className="pr-card"><div className="pr-card-title"><div><p className="pr-eyebrow">01 / BUSINESS CASH</p><h2>Rho funding context</h2></div><span className="pr-tag">{snapshot ? snapshot.mode === 'sandbox' ? 'Rho sandbox · fictional' : 'Live Rho · read only' : 'Not connected'}</span></div>
          <p>Choose the checking account you would use to fund payroll. Its balance is a bank snapshot, not confirmed RLUSD.</p>
          <button className="pr-primary" onClick={refreshRho} disabled={loading}>{loading ? 'Reading Rho…' : snapshot ? 'Refresh Rho snapshot' : 'Load Rho snapshot'}</button>
          {error && <p role="alert" className="pr-error">{error}</p>}
          {snapshot && <><label className="pr-account">USD checking account<select value={accountId} onChange={e => setAccountId(e.target.value)}>{!accounts.length && <option value="">No USD checking accounts</option>}{accounts.map(a => <option key={a.id} value={a.id}>{a.name}{a.last4 ? ` · ${a.last4}` : ''}</option>)}</select></label><div className="pr-bank-number">{account ? usd(account.balance.amount) : 'No account selected'}</div><small>Snapshot {dateLabel(snapshot.fetchedAt)}{!bankFresh && ' · Stale, refresh before review'}</small></>}
          <div className="pr-explainer"><b>USD → RLUSD funding is a separate step.</b><p>A conversion provider and funding confirmation are required before bank cash becomes spendable RLUSD. This screen does not initiate transfers or conversion.</p></div>
        </section>
        <section className="pr-card"><div className="pr-card-title"><div><p className="pr-eyebrow">02 / PAYOUT READINESS</p><h2>Your review checklist</h2></div><span className="pr-tag">Advisory</span></div>
          <ol className="pr-checklist"><li><b>{result.rows.length ? `${result.rows.length} plan(s) in scope` : 'Create a payment plan'}</b><span>Only this paying wallet’s plans are counted. Unassigned legacy plans require review.</span></li><li><b>{result.fresh ? 'Wallet snapshot is current' : 'Refresh the employer wallet'}</b><span>{result.shortfall === 0n && result.fresh ? 'The wallet covers the known obligations.' : 'Confirm RLUSD funding on XRPL before payout.'}</span></li><li><b>{blockers ? `${blockers} plan(s) need attention` : 'Review destinations and approve payouts'}</b><span>{blockers ? 'Resolve held payments, missed installments, or missing evidence in the payment plans.' : 'Funding coverage does not authorize payment or verify payroll compliance.'}</span></li></ol>
          {onRefreshWallet && <button onClick={onRefreshWallet} disabled={balanceLoading}>{balanceLoading ? 'Reading wallet…' : 'Refresh wallet balance'}</button>}
          <p className="pr-footnote">Cadence’s existing signing and recovery controls remain in effect. Keep the payment app open and your device awake for scheduled payouts.</p>
        </section>
      </div>
      <section className="pr-card"><div className="pr-card-title"><div><p className="pr-eyebrow">03 / PLAN RECONCILIATION</p><h2>Every installment accounted for.</h2></div><span className="pr-tag">{formatUnits(result.paid)} confirmed</span></div><div className="pr-table-wrap"><table><thead><tr><th>Recipient</th><th>Confirmed paid</th><th>Remaining</th><th>Review status</th></tr></thead><tbody>{result.rows.map(row => <tr key={row.id}><td><b>{row.name}</b>{row.issue && <small>{row.issue}</small>}</td><td>{formatUnits(row.paid)}</td><td>{formatUnits(row.remaining)}</td><td><span className="pr-tag">{row.state}</span></td></tr>)}{!result.rows.length && <tr><td colSpan="4">No plans for this wallet yet. Create a plan from the employer dashboard.</td></tr>}</tbody></table></div></section>
      {snapshot && <section className="pr-card"><div className="pr-card-title"><div><p className="pr-eyebrow">BANK EVIDENCE</p><h2>Account activity</h2></div><span className="pr-tag">{transactions.length} records</span></div><p>Bank activity provides context. No bank transaction has been automatically matched to a Cadence payout.</p><div className="pr-table-wrap"><table><thead><tr><th>Counterparty</th><th>Amount</th><th>Status</th><th>Posted / initiated</th></tr></thead><tbody>{transactions.slice(0, 20).map(t => <tr key={t.id}><td>{t.counterparty || 'Unknown counterparty'}</td><td>{t.amount.currency === 'USD' ? usd(t.amount.amount) : `${t.amount.amount} minor units ${t.amount.currency}`}</td><td>{t.status}</td><td>{dateLabel(t.date)}</td></tr>)}{!transactions.length && <tr><td colSpan="4">No transactions for the selected account.</td></tr>}</tbody></table></div>{transactions.length > 20 && <p>Showing the first 20 records for this account.</p>}</section>}
      <footer className="pr-footer">Bank cash, wallet funding, and confirmed worker payments are separate evidence. Income history describes observed payments; it does not verify employment.</footer>
    </main>
  </div>;
}

export function PayrollReadinessDemo() {
  const [checkedAt] = useState(Date.now());
  const payer = 'demo-employer';
  const plans = [
    { id: 'demo-1', name: 'Alex Morgan', payer, weeklyPay: '2400', frequency: 'day', paidCount: 1, active: true, attempts: { first: { sequence: 0, status: 'validated_success', amount: '342.857143' } } },
    { id: 'demo-2', name: 'Jordan Lee', payer, weeklyPay: '1800', frequency: 'day', active: true },
    { id: 'demo-3', name: 'Sam Rivera', payer, weeklyPay: '800', frequency: 'day', active: false },
  ];
  return <PayrollReadiness demo plans={plans} payer={payer} walletBalance="2000" walletCheckedAt={checkedAt} />;
}
