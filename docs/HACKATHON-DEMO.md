# Cadence on Rho: everyday payday

## Three-minute presentation

**Problem (20 seconds).** A warehouse employer pays every two weeks. Workers earn every shift, but cannot access that pay when everyday expenses arrive. Cadence gives employers an approval queue and workers visibility into recorded earnings and payout requests.

**Funding (20 seconds).** Show Cadence's Rho staging account separately. On October 28 it displayed $10 million of test funds with no pending outflows. Refresh before presenting. Explain that these are staging funds; the Cadence bank API connection and USD payout execution are not yet working. Do not show credentials.

**Earnings (40 seconds).** Open `/?app=demo&scenario=hackathon` in the isolated rehearsal workspace and click **Load hackathon scenario**. One warehouse worker earns $30/hour, eight hours a day, five days a week, on a biweekly cycle. The initial four-hour shift has $120 gross, a $24 illustrative hold, a $25 simulated paid request, a $40 pending request, and $31 still available. Earnings update in 15-second ticks. The hold is an example, not calculated tax or verified net pay.

**Approval (40 seconds).** Open Payout requests, review the $40 amount and destination, and simulate confirmation. Point to Payment records. Pending requests reserve earnings; confirmed payouts reduce the remaining eligible balance. No actual transfer occurs in demo mode.

**Control and recovery (40 seconds).** Open Worker earnings and request $15. This is the third daily request. Show the remaining count at zero. In Payment records simulate an uncertain outcome: those funds remain reserved. Then simulate confirmed failure to show the reservation release. Failed requests still consume their daily slot. Explain that real engine recovery verifies a transaction hash rather than blindly resending.

**Close (20 seconds).** “Cadence connects the employer's funding decision to the worker's earned-pay request and the payment record. With Rho's staging payment access, the next step is a USD payout and matching bank transaction.”

## What works and what remains

- Working prototype: one worker's browser-local cycle, time accrual, reservations, three requests per Chicago day, approval screens, demo settlement and recovery states.
- Existing connected engine: real RLUSD on XRPL mainnet with wallet signing and ledger reconciliation. Keep it disconnected during the demo; automated tests mock the signing and ledger boundaries.
- Rho verified separately: staging login, read-only token creation, and staging funds visible in Rho. Cadence still needs the official staging endpoint/auth instructions.
- Proposed Rho flow: check available business USD, submit an approved USD payout with a stable request identifier, track pending/settled/failed results, and reconcile the returned bank transaction. Payment permissions, supported rails, test recipients and test settlement behavior must be confirmed with Rho.
- Not implemented: authenticated employer/worker roles, verified attendance, actual payroll deductions, multi-worker payroll, bank USD payouts or USD-to-RLUSD conversion.

Load the scenario only into an empty demo cycle. Existing demo records are preserved. A fresh private browser profile gives a clean rehearsal without changing connected wallet data.

