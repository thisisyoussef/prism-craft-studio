# Feature PRD — Admin: Save & Apply Pattern

- Owner: Engineering
- Last updated: 2025-09-28
- Status: Planned

## Summary
Introduce a consistent "Save" and "Save & Apply" UX pattern across admin forms so admins can either:
- Save changes (persist to server, keep working quietly), or
- Save & Apply (persist and immediately apply the change across the UI by invalidating caches and refreshing dependent lists).

Initial scope targets:
- Products
  - `admin/src/pages/Products.tsx`
  - `admin/src/pages/ProductDetail.tsx` (ProductForm)
  - Variant blocks inside `ProductDetail.tsx`
- Orders
  - `admin/src/pages/OrderDetail.tsx` for status/tracking/ETA updates (see Tracking feature PRD for details)

Server already supports PATCH endpoints:
- `PATCH /products/:id` (in `server/src/routes/productRoutes.ts`)
- `PATCH /variants/:id` (in `server/src/routes/variantRoutes.ts`)
- `PATCH /orders/:id/status` (in `server/src/routes/orderRoutes.ts`)

## Goals
- Provide two clear actions for admins editing data.
- Ensure "Apply" always reflects in list screens without manual refresh.
- Keep implementation lightweight; no new schema required.

## Non-Goals
- Workflow approval/versioning.
- Draft/publish model for products (handled later if needed).

## UX/Copy
- Primary button: `Save`
- Secondary button (accent): `Save & apply`
- On success, show toasts: `Saved` and/or `Applied`.
- Keep user on the same page (no modal close unless it was opened as a modal).

## Frontend Changes

### 1) Products list quick toggles
- File: `admin/src/pages/Products.tsx`
- Existing mutations already invalidate `['products']` on success.
- Add a secondary action in row context menus (optional) to "Save & apply" that explicitly triggers `qc.invalidateQueries(['products'])` and shows a toast "Applied".
- Because current code already invalidates on toggle/delete, this change is mostly a UX affordance and consistent labels.

### 2) Product detail form
- File: `admin/src/pages/ProductDetail.tsx`, component `ProductForm`
- Add two buttons instead of one:
  - `Save`: calls existing `updateProduct.mutate` with current formData; onSuccess only updates the product query and shows toast `Saved`.
  - `Save & apply`: same mutation; onSuccess also calls `qc.invalidateQueries(['products'])` and shows toast `Applied`.
- Keep form open after both actions.

### 3) Variants editor blocks
- File: `admin/src/pages/ProductDetail.tsx`
- For per-variant changes (color, hex, stock, price, images), group the inputs and add two buttons at the bottom of each variant card:
  - `Save` — existing `updateVariant.mutate` calls.
  - `Save & apply` — after mutation success, call `qc.invalidateQueries(['products', id, 'variants'])` and `qc.invalidateQueries(['products'])`.
- Show toasts for both actions.

### 4) Orders — status/tracking/ETA
- File: `admin/src/pages/OrderDetail.tsx`
- For the status/tracking/ETA panel:
  - `Save`: PATCH `/orders/:id/status` with values but do not navigate; show `Saved`.
  - `Save & apply`: same, then force refresh queries for `['orders']` and `['orders', id]`; show `Applied`.

## API/Server
- No new endpoints required.
- Consider updating `server/src/routes/orderRoutes.ts` logging to distinguish between a status update with and without timeline events.

## Telemetry/Logging
- Client: console.info when Apply is used (optional).
- Server: existing logs are sufficient.

## QA/Acceptance Criteria
- Product Detail shows two buttons; both persist successfully.
- After `Save & apply`, the Products list reflects changes without manual refresh.
- Variants edited with `Save & apply` refresh their list immediately (including image slot previews).
- Orders updated with `Save & apply` reflect in admin Orders table and in the customer `src/pages/OrderDetails.tsx` after refresh.

## Rollout Plan
- Ship without feature flags.
- Low risk; purely UI affordance + cache invalidations.
