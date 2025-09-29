# Feature PRD — Admin: Tracking Number Input + Show in Order Details

- Owner: Engineering
- Last updated: 2025-09-28
- Status: Planned

## Summary
Allow admins to input a shipping tracking number and an estimated delivery date on the admin order page. Persist to server and surface to customers in the `Order Details` page.

This is mostly wiring; the data model and server endpoint already support tracking numbers and ETAs.

## Current State
- Model: `server/src/models/Order.ts`
  - Fields: `trackingNumber?: string`, `estimatedDelivery?: Date` (and `actualDelivery?: Date`).
- Server route: `server/src/routes/orderRoutes.ts`
  - `PATCH /orders/:id/status` accepts `status`, `trackingNumber`, and `estimatedDelivery`. It sets `actualDelivery` when `status === 'delivered'`.
- Admin UI: `admin/src/pages/OrderDetail.tsx`
  - Has a status select and timeline/production/files/payments tabs.
  - The `updateStatus` mutation currently only sends `{ status }`.
- Customer UI: `src/pages/OrderDetails.tsx`
  - Displays `order.tracking_number` with a link to parcelsapp tracker if present.
  - Displays `order.estimated_delivery`.
  - These fields are mapped from server by `src/lib/services/orderServiceNode.ts` (maps `trackingNumber -> tracking_number`).

## Goals
- Add inputs for `Tracking number` (string) and `Estimated delivery` (date) on the admin order screen.
- Include these in the `PATCH /orders/:id/status` payload.
- Keep the UX simple and consistent with the existing status update.

## Non-Goals
- Carrier detection or validation beyond non-empty string.
- Webhooks to auto-update delivery status.

## UX/Copy
- Labels: `Tracking number`, `Estimated delivery`.
- Helper text: `Optional. Share with your customer to track shipping.`
- Buttons: Follow Save vs Save & Apply pattern (see Save & Apply PRD). Primary `Save`, Secondary `Save & apply`.

## Frontend Changes

### 1) Admin order page
- File: `admin/src/pages/OrderDetail.tsx`
- In the `overview` tab (or a `Shipping` section), add a small form:
  - `<input value={tracking} onChange=... />`
  - `<input type="date" value={eta} onChange=... />`
  - Two buttons
    - `Save`: `updateStatus.mutate({ status: order.status, trackingNumber: tracking || undefined, estimatedDelivery: eta || undefined })`
    - `Save & apply`: same mutation, then `qc.invalidateQueries(['orders'])` and `qc.invalidateQueries(['orders', id])`
- Initialize local state from fetched `order` once loaded.
- Consider minimal validation: trim tracking string.

### 2) Mutation payload
- The mutation already posts to `/orders/:id/status`. Extend the payload type in this file (internal only) to include optional fields.
- No change to `OrderService` is needed for admin (admin uses `api` directly in this page).

### 3) Customer Order Details page (read-only)
- File: `src/pages/OrderDetails.tsx`
- Already renders `order.tracking_number` into a tracking link and shows `estimated_delivery`. No change required. Validate format before linking.

## Server / API
- No changes required. Endpoint already accepts `trackingNumber` and `estimatedDelivery`.

## QA/Acceptance Criteria
- Admin can edit tracking number and ETA and click `Save` to persist without leaving page.
- After `Save & apply`, the admin orders list updates to reflect shipping changes (if displayed) and the customer's `Order Details` shows the tracking link.
- Setting status to `delivered` automatically populates `actualDelivery` on server; customer view shows it if later surfaced.

## Rollout Plan
- Ship with no feature flag; low risk.
