# Prism Craft Studio — Admin Portal PRD

Version: 1.0
Date: 2025-09-07
Owner: Engineering (Cascade assistant) • Stakeholders: Youssef (Founder), Ops/Production
Status: Draft for review

## 1) Overview
Build a lightweight, secure Admin Portal (separate from the public website) to manage the full production workflow: orders, products & inventory, variants, payments, files, samples, bookings, guest drafts, and customer communications.

The portal will use the existing Node.js REST API with MongoDB Atlas that already powers orders, products, variants, payments (Stripe), file uploads, timelines, and production updates.

## 2) Goals and Non‑Goals
- Goals
  - Central place for admins to run day-to-day operations.
  - Full CRUD on products and variants, stock tracking, and activation.
  - End-to-end order management: status updates, timeline & production updates, payments, shipping details, and customer messaging.
  - Access to sample orders and designer bookings.
  - View and manage files tied to orders and products.
  - Basic user administration (create admins, toggle user active status).
  - Real-time updates for critical changes (order status, production updates).
- Non-Goals (Phase 1)
  - Customer-facing features (this is a separate, admin-only app).
  - Advanced analytics/reporting dashboards (simple tables + exports are enough initially).
  - Complex RBAC (Phase 1 supports the existing `admin` role; additional roles like `staff` can follow).

## 3) Users and Roles
- Admin
  - Full access to all features.
- Customer (not permitted to access portal)
  - Access via public website only.
- Future: Staff
  - Limited subset of admin permissions (e.g., update production only). Requires backend support for role or permissions; tracked as a follow-up.

Current backend RBAC: `requireAuth` and `requireAdmin` gate most admin operations. Refer to `server/src/middleware/auth.ts`.

## 4) Success Metrics
- Process time: Reduce the time to update an order (status + timeline + files) to under 60 seconds.
- Accuracy: 0 production updates missed due to UX friction.
- Stability: <1% error rate across admin requests over 30 days.

## 5) Functional Requirements

### 5.1 Orders Management
- Orders list
  - View all orders with paging/sorting.
  - Filter by status, date range, customer email/company, order number.
  - Search by order number or email.
  - Bulk select with actions: update status, send email (Phase 2).
- Order detail
  - View core fields: items/quantities, pricing, status, paid amount, shipping address, tracking, dates.
  - Update status with optional tracking and delivery ETA.
  - Timeline: add events, view history, note trigger source.
  - Production: add updates with stage/status/description/photos/documents.
  - Files: upload/download/view for this order; tag with purpose.
  - Payments: view associated payments, generate Stripe checkout session or invoice link.
  - Email: send a message to the customer with templates and freeform text.
  - Real-time: reflect status and production updates pushed by the server without refresh.

API mapping
- GET /api/orders (admin sees all)
- GET /api/orders/:id
- PATCH /api/orders/:id/status (admin)
- GET /api/orders/:id/payment (admin)
- PATCH /api/orders/:id/payment (simulate completion; usually for testing)
- POST /api/orders/:id/timeline (admin)
- GET /api/orders/:id/timeline
- POST /api/orders/:id/production (admin)
- GET /api/orders/:id/production-updates
- POST /api/files/upload (with orderId) • GET /api/files/order/:id
- POST /api/emails/send
- POST /api/payments/create-checkout • POST /api/payments/create-invoice

Notes and gaps
- OpenAPI suggests shipping auto-charge on status=shipping; current `orderRoutes.ts` does not implement auto-charge. Decision: leave out auto-charge for Phase 1; consider in Phase 2.
- Real-time: `emitToRoom('order:{id}', 'order.updated', ...)` is implemented on status update; ensure similar emits for other critical events as needed.

### 5.2 Products & Inventory
- Products
  - List all products (including inactive).
  - Create/edit/delete a product.
  - Toggle product active state.
  - Manage images, description, specs, MOQ/minimumQuantity.
- Variants
  - List/create/edit/delete variants per product.
  - Manage stock, color, hex code, optional price override, and images.

API mapping
- Products: GET /api/products (admin sees all), POST /api/products, GET /api/products/:id, PATCH /api/products/:id, DELETE /api/products/:id
- Variants: GET /api/products/:productId/variants, GET /api/variants?productId=..., POST /api/products/:productId/variants, PATCH /api/variants/:id, DELETE /api/variants/:id

### 5.3 Samples
- Samples list and detail.
- Create sample orders (internal use) and update status, tracking.

API mapping
- POST /api/samples • GET /api/samples • GET /api/samples/:id • PATCH /api/samples/:id

### 5.4 Designer Bookings
- View bookings and update status/notes.

API mapping
- POST /api/bookings • GET /api/bookings • PATCH /api/bookings/:id

### 5.5 Files
- Upload files and associate with order and purpose.
- List files by order.

API mapping
- POST /api/files/upload • GET /api/files/order/:id

### 5.6 Email
- Compose and send email to a recipient (typically order.customerEmail).
- Support plain text and basic HTML.

API mapping
- POST /api/emails/send (requires auth)

### 5.7 Users (Admin)
- List users with pagination and search.
- Create a new admin user.
- Toggle user active status (cannot disable self per backend guard).

API mapping
- GET /api/auth/users (admin)
- POST /api/auth/admin (admin)
- PUT /api/auth/users/:userId/toggle-status (admin)

### 5.8 Guest Drafts
- View and search guest drafts by email and type.
- Inspect a draft’s details (items, totals, metadata).
- Phase 2: Convert a draft to an order (requires a new endpoint).

API mapping
- GET /api/guest-drafts?email=&type=&limit=
- GET /api/guest-drafts/:id

Note: `guestDraftRouter` uses `requireAdmin` but not `requireAuth`. Because `requireAdmin` expects `req.user` to be populated, chain `requireAuth` before `requireAdmin` in backend to avoid 401 without parsing the token.

### 5.9 Pricing (Read-only in Phase 1)
- View active pricing rules to support quoting.

API mapping
- GET /api/pricing
- POST /api/pricing is test-only.

## 6) Non-Functional Requirements
- Security
  - JWT-based auth; admin-only access enforced client-side and server-side.
  - HttpOnly cookie session in production preferred; localStorage acceptable in dev.
  - CSRF protection for cookie-based auth if adopted.
  - CORS locked to admin domain in production.
  - Rate limiting on auth endpoints.
  - Audit logs for critical actions (order status changes, admin user changes).
- Performance
  - Orders list returns within 500ms P95 for 1k orders; server-side pagination.
  - File uploads under 20MB per file in Phase 1 (configurable).
- Observability
  - Console + structured logs for actions.
  - Frontend error boundary and toast notifications.
  - Optional Sentry integration.
- Accessibility
  - Keyboard navigability, focus states, color contrast.
- Browser support
  - Latest Chrome, Firefox, Safari, Edge.

## 7) UX & Navigation
- Global layout
  - Top bar: logo, search, user menu (profile, logout).
  - Left nav: Orders, Products, Variants, Samples, Bookings, Users, Guest drafts, Files (as sub of Orders), Pricing (read-only), Settings.
- Screen summaries
  - Orders list: filters, status chips, date range; row actions (view, status update).
  - Order detail: tabs for Overview, Timeline, Production, Files, Payments, Email.
  - Products list + detail forms with validation; Variants table within product detail.
  - Samples list/detail; Bookings list/detail.
  - Users: list, invite admin, toggle status.
  - Guest drafts: list/detail.
- Copy style
  - Direct, minimal, sentence case, non-hype. Aligns with brand values of transparency and modesty.

## 8) Technical Architecture
- Frontend
  - Stack: Vite + React + TypeScript + TailwindCSS + React Router + React Query.
  - State/query: React Query for server state; lightweight local state (Zustand optional).
  - Auth: JWT via /api/auth/login; store token; attach Authorization header.
  - Realtime: Socket.IO client; subscribe to `order:{id}` for detail pages.
  - Env: VITE_API_BASE_URL; optional VITE_SOCKET_URL.
- Backend
  - Use existing routes from `server/src/routes/*` and OpenAPI specs under `server/openapi/*`.
  - Consider adding emits on create/update where real-time UX is expected.

## 9) Step-by-Step Implementation Plan

Milestone 0 — Project setup (0.5 day)
- Create `/admin/` app (Vite React TS) in repo; share Tailwind and eslint config.
- Add Axios client with base URL and interceptors for auth token/errors.
- Auth screens: Login using `/api/auth/login`; fetch `/api/auth/profile`; guard admin-only routes.

Milestone 1 — Orders (2–3 days)
- Orders list: GET `/api/orders`; filters, search, date range (client-side filtering first; add server queries later if needed).
- Order detail: GET `/api/orders/:id`.
- Status updates: PATCH `/api/orders/:id/status`.
- Timeline: POST `/api/orders/:id/timeline`, GET `/api/orders/:id/timeline`.
- Production: POST `/api/orders/:id/production`, GET `/api/orders/:id/production-updates`.
- Files: upload via `/api/files/upload` (multipart) and list via `/api/files/order/:id`.
- Payments: view via GET `/api/orders/:id/payment`; generate checkout/invoice via payments endpoints.
- Emails: POST `/api/emails/send` from order.
- Realtime: subscribe on detail to `order:{id}`; reflect `order.updated`.

Milestone 2 — Products & Variants (1.5–2 days)
- Products CRUD: `/api/products` endpoints with forms and validation.
- Variants CRUD: `/api/products/:productId/variants` and `/api/variants/:id`.
- Stock/active toggles; image management.

Milestone 3 — Samples & Bookings (1 day)
- Samples: list/detail/update using `/api/samples`.
- Bookings: list/detail/update using `/api/bookings`.

Milestone 4 — Users & Guest Drafts (1–1.5 days)
- Users: list, create admin, toggle active (`/api/auth/users`, `/api/auth/admin`, `/api/auth/users/:userId/toggle-status`).
- Guest drafts: list/detail (`/api/guest-drafts`); surface gap for conversion to order; capture as backlog item.

Milestone 5 — Hardening & NFRs (1–2 days)
- Add loading/error states, optimistic updates where safe.
- Add audit log events (frontend events; backend logging already present for many actions).
- CORS tightening, security headers, route-level guards.
- E2E smoke tests for key flows.

Total Phase 1 estimate: ~7–10 dev-days.

## 10) Acceptance Criteria
- Auth
  - Only `admin` users can access any page beyond login; non-admins are blocked.
- Orders
  - Admin can change status across all allowed values and see changes instantly without refresh.
  - Admin can add timeline and production updates, including uploading at least one file.
  - Admin can view payments and generate a checkout/invoice link.
- Products/Variants
  - Admin can create, edit, delete products and variants; stock and active flags persist.
- Samples/Bookings
  - Admin can view and update status.
- Users
  - Admin can create another admin and toggle user active status; cannot deactivate themselves (backend guard).
- Guest Drafts
  - Admin can find drafts by email, open details.
- Security & Reliability
  - All write endpoints require a valid token and admin role; CORS locked in production.

## 11) Risks & Mitigations
- RBAC gaps (staff role not implemented)
  - Phase 1: admin-only. Phase 2: add `staff` role and gate routes accordingly.
- Guest drafts route chaining (`requireAuth` missing before `requireAdmin`)
  - Backend small fix to chain both; test with a valid token.
- Stripe workflows vary (invoice vs checkout)
  - Provide both flows; clarify in SOPs.
- File storage strategy for production
  - Currently local uploads served under `/uploads`; plan S3 or Supabase storage for production; add a migration plan.
- Real-time coverage
  - Emit events for key changes; ensure subscriptions are room-scoped to avoid noisy global updates.

## 12) Open Questions
- Should we introduce a `staff` role now or in Phase 2?
- Is CSV export required for orders/products in Phase 1?
- Do we need templated emails beyond freeform (e.g., status-specific templates)?
- Should pricing rules be editable in production, or remain read-only?

## 13) Appendix — Endpoint Map (quick reference)
- Auth: `/api/auth/login`, `/api/auth/profile`, `/api/auth/users`, `/api/auth/admin`, `/api/auth/users/:userId/toggle-status`
- Orders: `/api/orders`, `/api/orders/:id`, `/api/orders/:id/status`, `/api/orders/:id/payment`, `/api/orders/:id/timeline`, `/api/orders/:id/production`, `/api/orders/:id/production-updates`
- Products: `/api/products`, `/api/products/:id`
- Variants: `/api/products/:productId/variants`, `/api/variants`, `/api/variants/:id`
- Files: `/api/files/upload`, `/api/files/order/:id`, static `/api/uploads/*`
- Emails: `/api/emails/send`
- Payments: `/api/payments/create-checkout`, `/api/payments/create-invoice`, `/api/webhooks/stripe`
- Samples: `/api/samples`, `/api/samples/:id`
- Bookings: `/api/bookings`, `/api/bookings/:id`
- Profile/Company (for settings reference): `/api/profile`, `/api/company`
- Guest Drafts: `/api/guest-drafts`, `/api/guest-drafts/:id`
