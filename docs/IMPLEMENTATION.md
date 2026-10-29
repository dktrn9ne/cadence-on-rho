# Cadence

## Unified Cadence on Rho workspace

Use `/?app=demo` for the redesigned isolated demo. At `/`, connect an employer
wallet to open the same workspace with the existing XRPL payment engine.
Navigation covers employer overview, payroll/team, worker earnings, payout
requests, Rho funding, and settlement records. Legacy standalone preview URLs
are preserved; they use separate storage and do not migrate into this workspace.

The unified earnings cycle models one worker. Live mode records employer-declared
work; demo mode can seed two sample hours. Both retain weekly/biweekly cycles,
8–12-hour shift caps, 5–6 workdays per cycle week, the illustrative 20% hold,
and three accepted requests per America/Chicago day. Pending and uncertain
requests reserve their amount. This is local workflow state, not trusted
server-side payroll eligibility or authenticated employee access.

Live requests pin the paying wallet, worker's public destination, amount, and
RLUSD rail. Employer review explicitly shows XRPL mainnet and requires approval
before signing. The request is mapped to a deterministic `withdrawal-<request-id>`
plan containing one installment. That plan goes through the existing dispatcher,
durable journal, wallet signer, ledger identity checks, and hash recovery.
Withdrawal plans are excluded from automatic scheduling and are paused after
the approval attempt. A fresh employer-wallet snapshot is required. Requests
for destinations with an incomplete legacy payroll plan are refused to avoid
overlapping payment obligations. A prior attempted request cannot be signed
again through the approval action; uncertain payments require recovery.

The UI derives paid/failed/uncertain status from the engine's persisted attempt
records. Demo settlement controls never exist in connected mode. Earnings are
displayed as USD reference amounts; real payouts are RLUSD and are **not bank
USD deposits**. Rho cash is read separately; no automatic conversion, Rho payout
execution, tax calculation, or multi-device eligibility enforcement is connected.
Do not use this local prototype as a production payroll service.

Verification includes a hermetic dashboard test that connects a mocked wallet,
approves a worker request, calls the original submitter once, confirms a matched
ledger receipt, and proves a scheduler tick cannot resend it. Browser tests
cover the unified demo's earnings → request → review → settlement journal flow.

## Cadence on Rho: USD pay-cycle prototype

Open `http://127.0.0.1:5173/?payroll=usd` after starting the local development
server. This separate USD workflow demonstrates one worker, weekly/biweekly
cycles, 8–12 hour shifts, 5–6 workdays per cycle week, and earnings calculated
in 15-second intervals from recorded elapsed work. Daily request limits reset
at midnight America/Chicago, including daylight-saving changes.

Use **Employer** to configure terms before recording work, then start a sample
shift or load two hours of sample work. **Worker** can request up to three
payouts per local day. All accepted requests count toward the limit, including
confirmed failures. Pending and uncertain payouts reserve their amount;
confirmed failures release the amount, and simulated paid results become
paid journal entries. Confirmed terminal results cannot be changed. At cycle
close, accrual stops and the screen displays the reconciliation summary;
there is no automatic final deposit or next-cycle rollover.

Amounts are calculated in integer cents with fractional earnings accumulated
across intervals. The fixed 20% illustrative hold is not payroll tax or
verified net pay. The current prototype is a browser-local simulation, not
payroll processing or earned-wage disbursement: no money is moved or reserved
at a bank. Both views are demonstration controls, not authenticated roles.
Browser Web Locks serialize requests across tabs on this origin/profile;
storage writes must succeed before the UI accepts a change. This does not
provide cross-device coordination, trusted timekeeping, or tamper resistance.

The employer's Rho account panel uses the existing read-only adapter. Bank
cash is shown separately and never grants withdrawal eligibility. A real
deployment still requires authenticated employer/worker accounts, server-side
time approval and balances, payroll deduction inputs, verified funding,
Rho payment initiation access, and bank-status reconciliation. Existing XRPL
payment plans and wallet signing are separate from this USD simulation.

## Payroll Readiness, connected to Rho

From the employer dashboard, choose **Payroll readiness** to review unpaid
plan obligations, confirmed installment receipts, the employer's RLUSD wallet,
and a separate Rho checking-account snapshot. All incomplete plans for the
current payer are included, even paused plans. Other payers are excluded;
unassigned legacy plans and incomplete receipt evidence require review.
Held or missed payments prevent a funded verdict. A successful wallet read
expires after five minutes; failed refreshes invalidate it immediately.
Readiness is advisory and does not change the payment dispatcher or authorize payouts.

For a wallet-free walkthrough, run `npm run dev` and visit
`http://127.0.0.1:5173/?readiness=demo`. The demo has fictional payroll and
wallet data, cannot submit payments, and does not acquire payment-session
ownership. Choose **Load Rho snapshot** to read Rho's actual public sandbox API.
Sandbox records are fictional and **are not the personal hackathon staging account**.

The server reads `/accounts` and `/transactions`, follows pagination, and returns
only the fields the screen uses. The token never reaches the client bundle,
local storage, logs, or API response. Bank cash never counts toward RLUSD funding,
and bank transactions are not automatically matched to XRPL receipts.
USD-to-RLUSD conversion and bank-to-wallet reconciliation are future integrations.

The local development server defaults to `RHO_MODE=sandbox` (no private token
needed). For an authorized live business connection, set `RHO_MODE=production`
and `RHO_API_TOKEN` in the ignored `.env.local` file and restart the local app.
Use a Rho business token limited to `accounts:read` and `transactions:read`.
The local endpoint requires a loopback client and matching host/origin; it
cannot be used over the LAN. Do not prefix the token with `VITE_`.

The Vercel API function serves sandbox data only. Hosted live access deliberately
fails closed until business authentication and authorization exist. The installed
Electron build and plain `vite preview` do not run the Rho endpoint: use the local
development server or the Vercel function. A VPN/browser login alone does not
configure API access, and the hackathon's staging GraphQL SDK is not wired here.

Official contracts: [Accounts](https://docs.rho.co/docs/v1/accounts),
[Transactions](https://docs.rho.co/docs/v1/transactions),
[Authentication](https://docs.rho.co/docs/v1/auth),
[Pagination](https://docs.rho.co/docs/v1/pagination).

Cadence is a consumer wallet dashboard for RLUSD income verification and scheduled XRP Ledger payments.

The web version uses XRPL Connect so supported XRP wallets can connect to Cadence and sign each real payment. The local desktop version imports a wallet from a BIP39 mnemonic seed phrase or XRPL family seed and signs on this device.

## Run From latest.zip

1. Install Node.js 22.12 or newer from [nodejs.org](https://nodejs.org/).
2. Download `latest.zip` from this repo.
3. Unzip it.
4. Open a terminal in the unzipped folder.
5. Install dependencies:

```powershell
npm ci
```

6. Start the local desktop app:

```powershell
npm run desktop:dev
```

If Windows PowerShell blocks `npm`, use:

```powershell
npm.cmd ci
npm.cmd run desktop:dev
```

For the web XRPL Connect version, run the Vite server and open the local app URL in a browser with your preferred supported XRP wallet:

```text
http://127.0.0.1:5173/
```

## Consumer Flow

1. Open Cadence.
2. Local desktop: choose mnemonic seed phrase or XRPL family seed and click `Import wallet`.
3. Web: click `Connect XRPL wallet`, choose a supported wallet, and approve the connection.
4. Cadence opens the employer dashboard first for payment management.
5. Use `Employee dashboard` to review the connected wallet balance and recent received RLUSD.
6. From the employee dashboard, click `Income proof` to open the full income verification screen.
7. Add a recipient XRPL address and payment rhythm from the employer dashboard.
8. Local desktop signs each payment with the imported wallet. Web asks the connected XRPL wallet to confirm each payment request.

The income verification page reads real `account_tx` ledger data for the connected wallet only. It counts only explicitly validated incoming RLUSD payments with a positive ledger-delivered amount, the matching payer and recipient, and `SourceTag: 2606250005`. The payer comes from the matching local plan; when no plan resolves, the historical Cadence employer wallet is shown as a labeled demo fallback.

## Continuous Payments

Cadence can submit real XRPL mainnet transactions.

- Recipient payments are RLUSD `Payment` transactions.
- Each stream/installment submits one RLUSD payment directly to the designated recipient wallet.
- Source tag: `2606250005`
- Keep the app open and the device awake: this is an app-driven scheduler, not an always-on payroll service.
- One active payment session is allowed per browser origin/profile. Close the owning tab and refresh another tab to transfer ownership. Browsers without Web Locks cannot submit payments.
- The desktop shell permits one process instance. Separate browsers, profiles, devices, and web/desktop surfaces do not share a distributed lock.
- Each plan pays one weekly total and then stops. Missed windows require individual approval.
- Amounts use integer micro-units. Prior successful receipts determine the remaining balance, and the final installment reconciles exactly to the weekly total.
- Older plans with incomplete prior receipt evidence are blocked until the operator reviews wallet history and creates a new plan for the remaining amount.
- Recipient, payer, amount, and frequency cannot change while a plan is active or after a payment attempt starts. Pause the old plan and create a new plan for changed terms.

The web version asks the connected XRPL wallet to confirm each recipient payment. The local desktop version signs and submits each recipient payment with the imported mnemonic/family seed wallet.

## Web Wallets

Cadence uses XRPL Connect for the web wallet selector. The current web flow includes Xaman, Crossmark, GemWallet, and Xyra adapters on XRPL mainnet.

## XRPL Constants

- Network: XRPL mainnet
- WebSocket endpoint: `wss://s1.ripple.com`
- Asset: RLUSD
- RLUSD issuer: `rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De`
- RLUSD currency code: `524C555344000000000000000000000000000000`
- Cadence employer wallet: `rEfcBKrxNp8mxL4xu46R5wL3ex4dpDE864`
- Source tag: `2606250005`
- Keep the app open and the device awake: this is an app-driven scheduler, not an always-on payroll service.
- One active payment session is allowed per browser origin/profile. Close the owning tab and refresh another tab to transfer ownership. Browsers without Web Locks cannot submit payments.
- The desktop shell permits one process instance. Separate browsers, profiles, devices, and web/desktop surfaces do not share a distributed lock.
- Each plan pays one weekly total and then stops. Missed windows require individual approval.
- Amounts use integer micro-units. Prior successful receipts determine the remaining balance, and the final installment reconciles exactly to the weekly total.
- Older plans with incomplete prior receipt evidence are blocked until the operator reviews wallet history and creates a new plan for the remaining amount.
- Recipient, payer, amount, and frequency cannot change while a plan is active or after a payment attempt starts. Pause the old plan and create a new plan for changed terms.

## Safety Notes

- Only connect wallets you control.
- Confirm the recipient address, amount, RLUSD issuer, and source tag before signing.
- The local desktop version uses a mnemonic seed phrase or XRPL family seed to create an in-memory signing wallet.
- Support logs redact secret-like fields before export.
- Network fees, account reserves, and trustline behavior are controlled by XRPL mainnet.

## Troubleshooting

If the local desktop app derives a different wallet than expected, use the optional expected public address field to verify the mnemonic or family seed before continuing.

If Cadence web shows a different wallet than expected, disconnect and reconnect from the opening screen after selecting the correct account in your XRPL wallet. Cadence should use the exact public `r...` address returned by XRPL Connect.

If the app reports an RLUSD balance of zero, confirm the connected wallet is funded on XRPL mainnet and has an RLUSD trustline to the issuer above.

If a payment does not submit, check for insufficient XRP reserve/network fees, a missing RLUSD trustline, a recipient address typo, or a cancelled wallet prompt on the web version.

If the desktop app opens to a stale screen, stop old Vite/Electron processes and restart from the current folder.

## Scripts

```bash
npm run dev
npm run desktop:dev
npm run build
npm run desktop
npm run preview
```

## Recover an Interrupted Payment

An unknown submission remains blocked; Cadence never assumes it failed and never blindly retries it.

- Desktop signing persists the public transaction hash before relaying the signed transaction. A transport timeout can therefore be reconciled by hash.
- If a web wallet or an older session lost the hash, open the plan's recovery form and paste the public 64-character transaction hash from wallet history. Cadence verifies payer, recipient, numeric RLUSD amount, issuer, source tag, and ledger validation before settling the held attempt. A hash already used by another attempt is refused.
- If the ledger cannot confirm the transaction, or there is no hash and no proof that nothing was submitted, the installment stays blocked. This release does not implement transaction-history discovery or an override that resets unknown payments.

Income estimates require at least three confirmed payments spanning seven days of complete fetched history. The first receipt establishes the timing baseline and is excluded from the rate numerator. Estimates describe observed payments; they do not verify employment or guarantee future income.

## Maintain the Download Archive

From a Git checkout with Python 3 installed, run `npm run release:archive` after changing source files. `npm run release:check` compares every archived file byte-for-byte with current source, including a SHA-256 manifest. CI blocks stale archives. The archive excludes dependencies, built assets, and environment files; users install the pinned lockfile and build locally.

## Verification

Run `npm ci`, `npm test`, `npm run build`, and `npm run release:check`. For the production browser smoke, install Chromium with `npx playwright install chromium`, then run `npm run test:browser`. Browser checks exercise ownership and viewport rendering without connecting a wallet or contacting the ledger. `npm run test:desktop` verifies the built Electron opening screen and session ownership without importing a wallet; Linux CI runs it under Xvfb.

The install-time font patch is a small version-checked script, `scripts/patch-sdk-fonts.mjs`; upgrading the pinned wallet connector requires reviewing that script. Crossmark remains supported by XRPL Connect's adapter; the unused standalone SDK has been removed.
