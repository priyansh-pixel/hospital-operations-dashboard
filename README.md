# Hospital Patient Flow & Waiting-Time Optimization Dashboard

Standalone local version of the verified Claude Artifact — an MBA Operations
Management decision-support application. No backend, no database, no internet
connection required after dependencies are installed.

## Prerequisites

- **Node.js 18 or later** (tested with Node 22). Download: https://nodejs.org
- npm (comes bundled with Node.js)

## Setup (Windows Command Prompt or PowerShell)

```
cd path\to\hospital-ops-dashboard
npm install
```

## Run locally

```
npm run dev
```

Opens at **http://localhost:5173/** — if that port is busy, Vite will pick
the next free one and print the actual URL in the terminal; use that instead.

## Production build (optional)

```
npm run build
npm run preview
```

`npm run build` outputs a static `dist/` folder. `npm run preview` serves
that build locally so you can check the final production version.

## Project structure

```
src/
  data/patientsData.js         1,573-record dataset + department reference data
  utils/calculations.js        all KPI, wait-time, alert, and utilization formulas
  utils/forecast.js            Emergency demand forecast + OPD capacity planner logic (unmodified)
  utils/whatIf.js              What-if capacity scenario simulator (reuses forecast.js)
  components/Shared.jsx        sidebar, filters, KPI cards, badges, info panel
  components/PatientFormModal.jsx   add/edit form + delete confirmation
  components/screens/          the seven screens (Dashboard, Patient Flow,
                                Departments, Demand & Capacity, Patient Records,
                                Reports & Alerts, Forecast & OPD Planner, Triage & Priority Queue)
  App.jsx                      top-level state, navigation, filters
  App.css                      all styling
```

## Screens

1. Executive Dashboard
2. Patient Flow Analysis
3. Departments & Bottleneck Analysis
4. Demand, Peak Hours & Capacity
5. Patient Records
6. Reports & Alerts
7. **Forecast & OPD Planner** — next-day Emergency demand estimate (historical-average
   method, 1-day horizon) plus a manager-parameter-driven OPD capacity planner and
   rule-based recommended action. Always uses the full historical dataset regardless
   of active filters, so it reflects overall hospital-wide Emergency demand.

## Notes

- The dataset is embedded directly in `src/data/patientsData.js` — nothing is
  fetched from a server or database.
- "Add Patient" changes only exist for your current browser session; use
  **Reset to Original Dataset** on the Patient Records screen to restore the
  original 1,573 records at any time.
- Elapsed timers on the Dashboard's "Currently active patients" panel use a
  simulated operational clock anchored to the historical dataset, not your
  computer's real-world clock.
