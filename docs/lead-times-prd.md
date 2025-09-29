# Lead Times (ETA) PRD — Modeled on Current Stages

This PRD adds customer-visible lead times and per-stage ETAs using your existing order stages from `src/lib/types/order.ts` (`submitted` → `paid` → `in_production` → `shipping` → `delivered`). It avoids detailed sub-steps (no QC/proofing breakdown) and keeps the system simple and maintainable.

## 1) Goals
- **Customer transparency**: Show lead time on product pages before ordering.
- **Order clarity**: In Order Details, show expected time remaining for the current stage and the overall estimated delivery window.
- **Admin control**: In the Admin Portal, allow editing global defaults and per-product overrides for production and shipping time ranges.
- **Stability**: Snapshot lead-time settings onto orders at creation so subsequent admin changes do not shift existing customer promises.

## 2) Scope
- **In scope**
  - Product list/detail: surface estimated lead time per product.
  - Order details: per-stage remaining time (for current status) and overall ETA.
  - Admin portal: edit global defaults and per-product overrides.
  - Server/API: persist defaults/overrides; compute ETA from snapshot and current status.
- **Out of scope (v1)**
  - Detailed sub-stages (proofing, QC, etc.).
  - Holiday calendars and capacity modeling (business days = Mon–Fri, local TZ).
  - Carrier-accurate shipping by zone/method (use a default shipping range or a product override range).

## 3) Current Stages (source of truth)
From `src/lib/types/order.ts`:
- `submitted`
- `paid`
- `in_production`
- `shipping`
- `delivered`

We model lead times onto two time-bearing stages:
- **in_production**: productionDays (range)
- **shipping**: shippingDays (range)

`submitted` and `paid` serve as gates without a time range in v1. Overall ETA = production window + shipping window.

## 4) Data Model

### 4.1 Global Defaults (Mongo: `settings`)
Document key `leadTimes` within `settings` document (or separate doc keyed by type):
```json
{
  "_id": "settings",
  "leadTimes": {
    "production": { "minDays": 7, "maxDays": 10 },
    "shipping": { "minDays": 2, "maxDays": 4 },
    "businessCalendar": {
      "timezone": "America/New_York",
      "workingDays": ["Mon","Tue","Wed","Thu","Fri"]
    },
    "updatedAt": "2025-09-29T00:00:00Z",
    "updatedByUserId": "..."
  }
}
```

### 4.2 Product Overrides (Mongo: `products`)
Add optional `leadTimes` override (if omitted, fall back to defaults):
```json
{
  "id": "prod_123",
  "name": "Hoodie",
  "leadTimes": {
    "production": { "minDays": 10, "maxDays": 14 },
    "shipping": { "minDays": 2, "maxDays": 4 }
  }
}
```

### 4.3 Order Snapshot (Mongo: `orders`)
Attach a snapshot at order creation so later admin edits don’t change customer promises:
```json
{
  "leadTimeSnapshot": {
    "productId": "prod_123",
    "production": { "minDays": 10, "maxDays": 14 },
    "shipping": { "minDays": 2, "maxDays": 4 },
    "businessCalendar": {
      "timezone": "America/New_York",
      "workingDays": ["Mon","Tue","Wed","Thu","Fri"]
    },
    "capturedAt": "2025-09-29T00:00:00Z"
  },
  "expectedSchedule": {
    "in_production": { "expectedStartAt": "...", "expectedEndAt": "..." },
    "shipping": { "expectedStartAt": "...", "expectedEndAt": "..." }
  },
  "estimatedDeliveryWindow": { "start": "...", "end": "..." }
}
```

## 5) API Contracts (OpenAPI: `server/openapi/lead-times.yaml`)

### Admin
- **GET** `/api/lead-times/defaults` → returns global defaults.
- **PUT** `/api/lead-times/defaults` (admin) → update global defaults.
- **GET** `/api/products/:id/lead-times` → effective lead times (override or defaults).
- **PUT** `/api/products/:id/lead-times` (admin) → upsert product override.

### Public/Customer
- **GET** `/api/products/:id/lead-times/effective` → effective lead times for display.
- **GET** `/api/orders/:id/eta` → per-stage ETA and overall delivery window from the order snapshot and current status.

Example `/api/orders/:id/eta` response:
```json
{
  "stages": {
    "in_production": {
      "status": "in_progress|pending|done",
      "expectedStartAt": "2025-10-10T17:00:00Z",
      "expectedEndAt": "2025-10-18T17:00:00Z",
      "remainingBusinessDays": 3.5
    },
    "shipping": {
      "status": "pending|in_progress|done",
      "expectedStartAt": "2025-10-18T17:00:00Z",
      "expectedEndAt": "2025-10-22T17:00:00Z"
    }
  },
  "overall": {
    "deliveryWindow": { "start": "2025-10-20T17:00:00Z", "end": "2025-10-24T17:00:00Z" },
    "isLate": false,
    "daysLate": 0
  }
}
```

## 6) Calculation Logic
- **Effective config**: Use product override if present; else global defaults.
- **Start points**:
  - Production window starts at `paid_at` when available; else `created_at`.
  - Shipping window starts at production expected end.
- **Business days**: Mon–Fri in configured timezone. V1 ignores holidays.
- **Schedule**:
  - `in_production.expectedEndAt` = add business days (min/max held as a range, compute both start/end of window) from start.
  - `shipping.expectedEndAt` = add shipping business days after production window end.
- **Current stage remaining**:
  - If status is `in_production`, compute remaining vs `in_production.expectedEndAt`.
  - If status is `shipping`, compute remaining vs `shipping.expectedEndAt`.
  - If status is `submitted`/`paid`, show production window preview but mark as not started.
- **Lateness**: If now > expected end for current stage, `isLate = true`, `daysLate = businessDayDelta`.

## 7) UX/UI

### Customer — Product list/detail (`src/components/`)
- **Lead time blurb**: “Estimated lead time: Production X–Y business days + Shipping A–B business days”.
- Optional: display derived delivery date range (“Estimated delivery: Oct 21–Oct 25”) by adding the two windows to now. Keep labeled as “Estimated”.

### Customer — Order details (`src/pages/OrderDetails.tsx`)
- Show stage chips for: submitted, paid, in_production, shipping, delivered.
- For **in_production** and **shipping**:
  - Show “Time remaining” and expected completion date.
- Show overall delivery window at the top.
- If behind schedule, show “Running late by X business days”.

### Admin — Lead time management (`admin/`)
- **Global defaults page**: inputs for Production min/max, Shipping min/max, Business calendar.
- **Product override page**: toggle “Use global defaults” vs “Override”; inputs for Production and Shipping min/max; Clear override.
- **Publish flow**: Save draft → Publish. Only future orders use new values; existing orders keep snapshot.

## 8) Security & Permissions
- Admin-only for editing defaults and product overrides (server middleware).
- Public read endpoints for product effective lead times and order ETA.

## 9) Observability
- Track on-time % vs promised window.
- Average days late by stage.

## 10) Rollout Plan
- **Server**
  - Add settings model and endpoints. Add product override field. Add order snapshot fields and lightweight `etaService` for schedule math.
  - OpenAPI spec under `server/openapi/lead-times.yaml`.
- **Client (customer)**
  - Product pages: fetch and render effective lead times.
  - Order Details: fetch `/orders/:id/eta` and render stage remaining + overall delivery window.
- **Admin**
  - New pages/forms for defaults and product overrides.
- **Data migration**
  - Seed defaults. Existing open orders: compute ETA on-the-fly and label as “estimated (no snapshot)” or backfill snapshot via script.
- **Feature flag**
  - Gate UI behind an internal flag; roll out to staff first, then all.

## 11) Acceptance Criteria
- **Product pages** show lead times from product override or global defaults.
- **Order details** display current stage remaining time and overall delivery window; late status appears when overdue.
- **Admin edits** affect only new orders; existing orders retain snapshot.
- **API** `/api/orders/:id/eta` returns data consistent with snapshot + business day rules and current status.
