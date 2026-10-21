# NaturaX D2C Order Follow-up & Exception Automation System

**VitaNatura Elements Pvt Ltd — Operations & Post-Order SLA Automation**

An automated post-order follow-up, exception detection, SLA tracking, and escalation system built with **React**, **Vite**, **Tailwind CSS**, and **Lucide React**. Designed for D2C operations teams to eliminate manual spreadsheet filtering, enforce agent accountability, quarantine malformed data, and prevent duplicate exception tasks across recurring CSV batch imports.

---

## Key Capabilities

1. **On-Demand CSV Ingestion & Export**
   - Clean initial state on startup—data loads only when an operator uploads an order CSV file.
   - Includes a one-click **105-Row Sample CSV** generator (`NaturaX_D2C_Sample_105_Orders.csv`) and **Daily Exception Report** CSV exporter.
2. **Configurable 5-Rule Exception Engine + Pre-Validation Quarantine**
   - Evaluates uploaded order records in real time and assigns deterministic SLA deadlines, priorities, and recommended actions.
   - Live rule configuration modal allows managers to adjust thresholds (e.g., switching Dispatch Delay from `24h` to `12h`) and immediately re-evaluate all loaded orders.
3. **Employee Workload Matrix & Overdue Escalation**
   - Tracks Open, In Progress, Resolved, Overdue, and High-Priority tasks across operations specialists (`Rahul Nair`, `Sneha Menon`, `Arun Kumar`, `Priya Varma`, `Kiran Das`).
   - Reassigning an overdue task automatically transitions it to `In Progress`, grants a `+4h` SLA recovery window, and logs the escalation.
4. **Immutable Audit Trail**
   - Records every CSV import, rule threshold modification, task status change, and employee reassignment with timestamps, previous/new values, and acting manager identity.

---

## The 5-Rule Exception Engine & Data Quarantine Logic

Before evaluating standard operational rules, each uploaded row passes through a **Data Validation & Quarantine Gate**.

### Pre-Evaluation Gate: Data Correction Needed (Quarantine Logic)
- **Trigger Conditions**:
  - Missing mandatory fields (`Order ID`, `Customer Name`, `Phone Number`, `Order Status`, or `Expected Delivery Date` on active orders).
  - Unparseable or missing `Order Date` / `Expected Delivery Date` timestamps.
  - Invalid or non-positive `Order Value (INR)`.
  - Duplicate `Order ID` rows detected within the same uploaded file.
- **System Behavior**:
  - Quarantines the malformed record under the **`Data Correction Needed`** exception category (`High` priority, `4h` SLA).
  - Skips standard time-based rules on broken timestamps so corrupt rows never trigger false dispatch or delivery alerts.

### Standard Operational Rules (Evaluated on Validated Rows)

| Rule # | Exception Category | Trigger Condition (Default Threshold) | Priority | SLA Window | Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Rule 1** | **Unconfirmed Order** | `Order Status == "Unconfirmed"` and order age `> 2 hours` (configurable) | Medium (`High` if COD `> ₹2,500`) | `4h` (`High`) / `12h` (`Medium`) | Call customer to verify COD/address details and confirm order in ERP |
| **Rule 2** | **Dispatch Delay** | `Order Status == "Confirmed"`, blank `Dispatch Date`, and order age `> 24 hours` (configurable, e.g. `12h`) | Medium (`High` if `> 48h`) | `4h` (`High`) / `12h` (`Medium`) | Escalate to warehouse pick-pack lead for priority manifest & AWB generation |
| **Rule 3** | **Shipment Delay** | `Order Status == "Dispatched"` and current time is past `Expected Delivery Date` | High | `4h` | Raise courier delay ticket & send proactive WhatsApp delay update to customer |
| **Rule 4** | **Failed Delivery** | `Order Status == "Failed Delivery"` (Courier NDR) | High | `4h` | Trigger NDR follow-up call to confirm re-attempt availability & landmark |
| **Rule 5** | **High-Value Order Escalation** | `Order Value > ₹5,000` (configurable), undelivered (`Status != "Delivered"`), and past `Expected Delivery Date` | High (VIP) | `2h` | Priority VIP escalation: direct call to customer & dedicated courier account manager |

> **Note:** A single high-value delayed order can simultaneously trigger its primary operational exception (e.g., *Shipment Delay*) and *High-Value Order Escalation* so VIP cases receive dedicated escalation tracking.

---

## Deduplication Architecture (`OrderID::ExceptionCategory`)

To prevent duplicate tasks when operations teams re-upload the same CSV file or run live rule adjustments:

1. **Deterministic Composite Task Keys**:
   - Every generated exception task is indexed by a unique composite key:
     ```text
     <OrderID>::<ExceptionCategory>
     ```
     *(For intra-file duplicate rows caught by the quarantine gate, the row index suffix `<OrderID>-DUP-<RowIndex>::Data Correction Needed` is used so internal file duplicates are still surfaced).*
2. **Idempotent Merge on Re-Upload / Re-Evaluation**:
   - When a CSV is uploaded or rule thresholds change, `evaluateOrdersWithRules()` checks `existingTaskMap.get(taskKey)`.
   - If a task with that `taskKey` already exists, the engine **skips duplicate creation**, preserves the agent's current `status` (`Open` / `In Progress` / `Resolved`), `assignedEmployee`, and `slaDeadline`, refreshes dynamic order fields, and increments the `duplicateSkippedCount` metric logged in the Audit Trail.

---

## Local Setup & Installation

### Prerequisites
- **Node.js** `>= 18.0.0`
- **npm** `>= 9.0.0`

### Steps

1. **Clone or open the repository:**
   ```bash
   cd naturax-d2c-automation
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173/](http://localhost:5173/) in your browser.

4. **Build for production:**
   ```bash
   npm run build
   ```
   The optimized production bundle is emitted to `dist/`.

5. **Preview the production build locally:**
   ```bash
   npm run preview
   ```

---

## Project Structure

```text
naturax-d2c-automation/
├── index.html            # Application HTML entry point
├── package.json          # Dependencies and scripts (React, Vite, Tailwind, Lucide)
├── postcss.config.js     # PostCSS configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── vite.config.js        # Vite bundler configuration
└── src/
    ├── App.jsx           # Rule engine, CSV parser/exporter, state & 5-tab UI
    ├── index.css         # Tailwind CSS directives
    └── main.jsx          # React DOM root mount
```
