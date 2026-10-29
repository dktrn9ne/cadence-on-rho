# Cadence on Rho

**Work today. Own your payday.**

A fintech hackathon prototype combining employer payroll oversight, worker earnings, and up to three daily payout requests with the existing Cadence payment engine.

## Run the demo

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev -- --port 5174
```

Open http://127.0.0.1:5174/?app=demo&scenario=hackathon and click **Load hackathon scenario**. **Reset rehearsal** restores the isolated starting scenario.

The example worker earns $30/hour on a biweekly cycle: $120 gross after four hours, a $24 illustrative hold, $25 simulated paid, $40 awaiting approval, and $31 available. Earnings keep accruing every 15 seconds. Review the $40 request, simulate confirmation, then request $15 to show the third daily request and uncertain-outcome recovery.

## What works

- Employer overview, cycle settings, worker earnings, payout review, and payment records.
- Weekly or biweekly cycles, 8–12-hour shifts, 5–6 workdays/week, and 15-second earnings ticks.
- Three accepted requests per America/Chicago day; pending and uncertain outcomes reserve earnings.
- Isolated simulated settlement and failure/recovery controls.
- Existing RLUSD/XRPL engine with durable attempts, wallet approval, receipt validation, and hash reconciliation. Connected mode uses real XRPL mainnet; the presentation demo never signs.

## Rho integration status

Rho staging account access and test funding were verified separately. A read-only staging token was created locally and is **not included**. The included Rho adapter defaults to the public fictional sandbox. The funded staging account is not connected to the app; Rho USD payout execution remains a proposed integration requiring official staging endpoint and payment-access instructions.

Bank USD and wallet RLUSD are separate. No conversion is connected. The prototype models one worker with browser-local declarations; it does not implement authenticated employer/employee roles, verified attendance, actual payroll deductions, production payroll processing, or cross-device eligibility enforcement. The 20% hold is illustrative, not calculated tax.

## Demo assets

- [Narrated 31-second intro](assets/cadence-on-rho-intro.mp4)
- [Starting scenario screenshot](assets/demo-overview.png)
- [Narration script](assets/narration-script.txt)

The intro was created with [Bravado](https://github.com/dktrn9ne/Bravado); narration is a synthetic stock voice. Record the live walkthrough in Loom and add its link to your submission.

## Walkthrough and verification

See [demo guide](docs/HACKATHON-DEMO.md) and [implementation details](docs/IMPLEMENTATION.md).

```sh
npm test
npm run build
npm run test:browser
```

Tests mock wallet signing and ledger responses; they do not move money. See [QA](docs/QA.md).

## Project lineage

Built for the Rho fintech track on top of [Cadence](https://github.com/dktrn9ne/cadence). This submission repository contains the combined Cadence on Rho prototype. Existing Cadence engine code predates this integration; the Rho workspace, earnings/request workflow, and hackathon scenario are the new work. No new license grant is added by this submission.
