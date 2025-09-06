## Frontend Integration Plan: Wire to Node API + Socket.io

### 0) Assumptions
- Frontend is Vite + React/TS located in `src/`.
- Current data access relies on Supabase client in `src/integrations/supabase/client.ts` and services like `src/lib/services/orderService.ts`.
- We keep Supabase Auth for now (token source remains Supabase), but all data moves to REST API.
- Env vars to add: `VITE_API_BASE_URL`, `VITE_SOCKET_URL`.

---

### 1) Environment and Configuration
- Add to `.env`:
  - `VITE_API_BASE_URL=http://localhost:4000`
  - `VITE_SOCKET_URL=http://localhost:4000`
- Create `src/lib/api.ts`:
  - Export a configured `fetchJson` wrapper using `VITE_API_BASE_URL` and attaching `Authorization: Bearer <supabase_access_token>` from `supabase.auth.getSession()`.
  - Handle 401 by prompting re-auth (optionally refresh or sign-in redirect).
- Test Plan:
  - Unit: mock `supabase.auth.getSession()` and assert headers.
  - Integration: run dev server + backend; open network tab; verify Authorization header present and API base path correct.

---

### 2) Auth Token Source (Supabase)
- Keep `src/integrations/supabase/client.ts` to obtain session.
- Add `src/lib/authToken.ts` helper to return current access token; subscribe to auth changes to keep the token current.
- Test Plan:
  - Unit: mock auth events to ensure token updates.
  - Manual: login flow; ensure subsequent API requests include token.

---

### 3) API Client Layer
- Create `src/lib/http.ts` with:
  - `request(method, url, { body?, query?, headers? })` building full URL with query params, JSON encoding, and error handling (HTTP errors map to exceptions with `error.code`).
  - Convenience methods: `get`, `post`, `patch`.
- Ensure centralized error logging and Sentry hooks (optional).
- Test Plan:
  - Unit: test query param encoding, JSON body, error thrown on 4xx/5xx.

---

### 4) Replace Supabase Data Access in Services
- Update or replace services under `src/lib/services/` to call REST API:
  - Orders (`orderService.ts`):
    - createOrder → POST `/api/orders`
    - getOrders → GET `/api/orders?status=&limit=&offset=`
    - getOrder → GET `/api/orders/:id`
    - updateOrder → PATCH `/api/orders/:id`
    - getPayments → GET `/api/orders/:id/payments`
    - createProductionUpdate → POST `/api/orders/:id/production-updates`
    - getProductionUpdates → GET `/api/orders/:id/production-updates`
    - getTimeline → GET `/api/orders/:id/timeline`
    - createTimelineEvent → POST `/api/orders/:id/timeline`
  - Products: GET `/api/products`, POST `/api/products` (admin only)
  - Samples: CRUD `/api/samples`
  - Bookings: CRUD `/api/bookings`
  - Profile/Company: GET/PATCH `/api/profile`, GET/PATCH `/api/company`
  - Pricing: GET `/api/pricing`
  - Files: POST `/api/files/upload` (multipart), GET `/api/files/order/:id`
  - Payments/Stripe: POST `/api/payments/create-checkout`, `/api/payments/create-invoice`
- Leave Supabase-only code reachable behind feature flags if needed, else remove references.
- Test Plan:
  - Unit: stub http layer and verify correct endpoints and payloads called.
  - Integration: with backend running, verify most common flows (create order, list, update). 

---

### 5) Socket.io Client Integration
- Add `src/lib/socket.ts`:
  - Create lazy socket using `io(VITE_SOCKET_URL, { autoConnect: false, auth: { token: <supabase_access_token> } })`
  - Export helpers: `connectSocket()`, `disconnectSocket()`, `subscribe(room, event, handler)` (emits `subscribe` with `{room}` then attaches listener), `unsubscribe(event, handler)`.
- Initialize socket connection upon login and on app mount if session exists; disconnect on logout.
- Test Plan:
  - Unit: mock `socket.io-client` to assert `subscribe` emits and handlers register.
  - Manual: open two tabs; update order status in one; observe event in the other.

---

### 6) Realtime Wiring per Feature
- Orders page (`src/pages/AdminOrders.tsx`):
  - On row click, navigate to detail; no realtime here unless bulk updates desired.
- Order detail (`src/pages/AdminOrderDetail.tsx`):
  - On mount: fetch order, payments, production updates, timeline via API.
  - Subscribe: `subscribe('order:<orderId>', 'order.updated', handler)` to patch local state.
  - Also subscribe optionally to production or timeline rooms/events if you emit those server-side later.
- Production updates view: refresh on `production.created`/`production.updated` if implemented.
- Payments view: refresh on `payment.updated` if implemented in the backend.
- Test Plan:
  - Manual: update order status in another tab/admin panel and verify the detail view updates without refresh.

---

### 7) UI Forms and Uploads
- Replace any Supabase storage calls with:
  - `POST /api/files/upload` using `FormData`
    - Fields: `orderId`, `filePurpose`, `file`
    - Receive: `{ fileUrl }`
  - Display uploaded files via returned URLs (`/uploads/...` in dev).
- Update forms using existing validation; ensure server error messages are surfaced.
- Test Plan:
  - Manual: upload file on order detail; verify list shows uploaded file; link opens.

---

### 8) Payments and Checkout
- On order actions that create Stripe checkout/invoice:
  - Call `POST /api/payments/create-checkout { orderId, phase }` then redirect to returned `url`.
  - Call `POST /api/payments/create-invoice { orderId }` and show `invoiceUrl` in UI.
- Handle return routes for success/cancel (show status, refresh order/payments).
- Test Plan:
  - Integration (mock): intercept calls and assert redirect URL handling.
  - Manual: with mock keys, confirm URL produced and navigation attempts.

---

### 9) Navigation and State
- Ensure global store (`src/lib/store.ts`) is updated to work with API responses rather than Supabase rows.
- Normalize IDs and fields according to API serializers (e.g., `id`, `orderNumber`, `depositAmount`).
- Remove real-time Supabase channels usage (`subscribeToOrderUpdates`) and replace with socket helpers.
- Test Plan:
  - Unit: reducers/selectors updated for new shapes.
  - Manual: flows across pages remain consistent.

---

### 10) Feature Flagging/Cutover
- Add `FEATURE_USE_NODE_API=true` in `.env`.
- Condition service instantiation based on flag, enabling quick fallback if needed.
- Test Plan:
  - Toggle off and ensure legacy (if kept) is reachable; toggle on for the new API.

---

### 11) Error Handling & Toasts
- Centralize fetch error parsing. Surface messages via toasts/snackbars.
- For 401, route to sign-in; for 403/404 show friendly messages.
- Test Plan:
  - Unit: map server errors to UI toasts.
  - Manual: simulate failures with dev tools or by stopping backend.

---

### 12) E2E Test Flows (Happy Paths)
- Flow A: Create Order
  - Login
  - Create order (POST)
  - Assert order card appears in list (GET)
  - Open detail (GET) and see payments (GET)
  - Update status (PATCH) and observe socket update
- Flow B: Production Update
  - Add production update (POST)
  - See update in list (GET) and via realtime (if wired)
- Flow C: Upload Artwork
  - Upload file (POST multipart)
  - See file in list (GET) and open via URL
- Flow D: Pricing Fetch
  - Load pricing page; see public rules (GET)
- Flow E: Company/Profile
  - Update profile (PATCH), see company (GET), update company (PATCH)
- Flow F: Checkout/Invoice
  - Trigger checkout (POST), verify redirect URL
  - Create invoice, verify URL

---

### 13) E2E Test Flows (Failure Paths)
- Expired token: API returns 401 → re-auth prompt
- Network error: show retry CTA
- 400 on invalid payload: show inline field errors
- File upload too big/invalid type: surface error

---

### 14) Rollout Checklist
- Set `VITE_API_BASE_URL`, `VITE_SOCKET_URL` in all environments
- Ensure CORS allows frontend origin
- Confirm CSR/SSR hydration unaffected
- Update docs and developer onboarding steps

---

### 15) Task Breakdown (Frontend Tickets)
- Add API client, auth token helper, and socket client
- Replace order service endpoints + realtime wiring
- Replace products, samples, bookings, pricing, profile/company services
- Implement file upload UI integration
- Implement payments actions (checkout/invoice) UI
- Add error handling & toasts integration
- Add feature flag and fallback pathways
- Write unit tests for client and services; add minimal integration tests

---

### 16) Success Criteria
- All pages function with API-only data access
- Realtime order status updates appear without manual refresh
- File uploads work and render
- Payments actions produce URLs and are handled by UI
- No Supabase data calls remain outside auth

---

### 17) TypeScript Models, DTOs, and Mappers
- Create `src/types/api.ts` mirroring server serializers (Order, Payment, ProductionUpdate, TimelineEvent, Sample, DesignerBooking, Product, PricingRule, Company, Profile, FileUpload).
- Create `src/types/forms.ts` for client-side payloads (e.g., `CreateOrderPayload`).
- Add mapper utilities in `src/lib/mappers.ts` if any transformation is required between UI models and API DTOs.
- Test Plan:
  - Type-only: ensure no `any` in service public APIs.
  - Unit: mappers tested for round-trip consistency where applicable.

---

### 18) Testing: MSW and Contract Tests
- Add MSW (`msw`) and define handlers for each endpoint under `src/tests/msw/handlers.ts`.
- Use MSW in unit/integration tests to simulate API responses and error cases.
- Contract tests: define JSON schemas (Zod) for critical responses and validate at runtime in dev/test.
- Test Plan:
  - Unit: services call correct endpoints and parse responses via Zod.
  - Integration: page-level tests mount components with MSW handlers.

---

### 19) API Definition and Client Generation (optional)
- Define OpenAPI spec for the backend (or generate from routes).
- Use `openapi-typescript` to produce types; optionally generate a typed client.
- Wire generated types into `api.ts` to ensure request/response shapes.
- Test Plan:
  - Type checks compile; drift detection in CI (generate and diff).

---

### 20) Data Fetching, Caching, and Optimistic UI
- Adopt React Query (or SWR) for data fetching:
  - Create `src/lib/queryClient.ts` with default stale times and retry policy.
  - Wrap app in `QueryClientProvider`.
- Orders:
  - Query keys: `['orders', filters]`, `['order', id]`, `['order', id, 'payments']`, `['order', id, 'production']`, `['order', id, 'timeline']`.
  - On socket `order.updated`, update `['order', id]` cache via `queryClient.setQueryData` and invalidate list.
- Optimistic updates: for `PATCH /api/orders/:id`, optimistically set cache then rollback on error.
- Test Plan:
  - Unit: cache updates on socket event.
  - Integration: optimistic UI shows updated status immediately; reverts if API fails.

---

### 21) Pagination, Sorting, Filtering
- Standardize list fetching with query params and a shared helper to serialize filters.
- UI tables receive `total` (if added later) or use cursor/offset strategy.
- Preserve filters in URL (querystring) for shareable views.
- Test Plan:
  - Unit: correct query param serialization.
  - Manual: filter + pagination navigation preserves state.

---

### 22) Socket Auth Lifecycle, Reconnection, and Token Refresh
- Pass access token in `auth` when creating socket; on Supabase token refresh, call `socket.auth = { token: newToken }; socket.connect()`.
- Enable auto-reconnect with exponential backoff; surface connection state in a tiny indicator.
- On reconnect, re-emit room subscriptions maintained in memory.
- Test Plan:
  - Simulate token refresh: verify new token used and connection restored.
  - Manual: stop/start backend; socket reconnects and resubscribes.

---

### 23) Performance and Monitoring
- Network:
  - Batch parallel requests on detail pages with `Promise.all`.
  - Use HTTP/2 keep-alive and GZIP/Brotli (server default).
- UI:
  - Code-split admin pages; lazy-load heavy components.
  - Virtualize long lists.
- Monitoring:
  - Add web vitals reporting; optional Sentry for frontend.
- Test Plan:
  - Lighthouse baseline; ensure no regressions after wiring.

---

### 24) Accessibility and UX
- Ensure live updates are accessible: announce order status changes via ARIA live regions.
- Provide focus management and keyboard navigation for modals and forms.
- Use semantic HTML for tables/lists; alt text for uploaded images.
- Test Plan:
  - Axe checks in CI; manual screen reader spot checks on key pages.

---

### 25) QA Matrix (Browsers/Devices)
- Browsers: Chrome, Firefox, Safari, Edge latest 2 versions.
- Devices: Desktop, common mobile viewport.
- Scenarios: login, product list, order create, order update (realtime), production update, upload, checkout invoice, profile/company edit, pricing fetch.
- Test Plan:
  - Checklist-based verification; record video on first pass for future reference.

---

### 26) Rollout Strategy and Feature Flags
- Phased rollout using `FEATURE_USE_NODE_API`:
  1) Internal team only.
  2) 10% cohort.
  3) 50% cohort.
  4) 100% rollout; keep fallback for 1-2 weeks.
- Observability: track API error rates and socket disconnects.
- Test Plan:
  - Toggle flag in staging; confirm immediate switch-over and fallback.

---

### 27) Security Considerations
- Never store access tokens in localStorage beyond Supabase’s own storage; pass token in Authorization header only.
- Sanitize user-provided content before render (e.g., production notes) or render as text only.
- Ensure file links are scoped and not world-writable in prod (S3 presigned URLs in production phase).
- Test Plan:
  - Manual: verify no secrets in client bundle; CORS configured correctly.

---

### 28) Error Boundaries and Fallbacks
- Add error boundaries at page level; render retry button and diagnostics (request ID if provided by server).
- Implement global offline indicator for network down scenarios.
- Test Plan:
  - Integration: mock 500s; assert boundaries render fallback UI.

---

### 29) Telemetry and Logging
- Centralize API error logging with correlation IDs from server responses.
- Track socket connection events and room joins (debug mode only).
- Optional: add user action analytics for create/update flows.
- Test Plan:
  - Unit: logger invoked on error; includes endpoint and status.

---

### 30) CI Enhancements for Frontend
- Add type-check, lint, unit tests with MSW, and minimal Playwright E2E for key flows (create order, update status realtime, upload file).
- Cache node_modules and Playwright browsers.
- Test Plan:
  - Green CI with all checks; artifacts include videos on failure.

---

### 31) Developer Ergonomics
- Add `npm run dev:all` to start backend + frontend concurrently.
- Provide `scripts/mock-api.ts` to run MSW in dev for isolated UI work (optional).
- Update README with new environment variables and workflows.

---

### 32) Risks and Mitigations
- Token drift between fetch and socket: subscribe to auth changes; refresh socket on change.
- Inconsistent data after optimistic updates: reconcile on server response and on socket event confirmation.
- Large file uploads: add size/type checks client-side; show progress; consider chunking.

---

### 33) Cutover Rehearsal and Post-Cutover Validation
- Rehearsal in staging: complete all E2E test flows across 2 browsers.
- Post-cutover: monitor logs, error rates, and socket stability for 48 hours; maintain rollback flag.

---

### 34) Page-by-Page Checklist (Concrete Edits)
- `src/pages/AdminOrders.tsx`:
  - Replace list fetch with GET `/api/orders` via http client
  - Add filters → query params
  - Remove Supabase realtime here (optional)
- `src/pages/AdminOrderDetail.tsx`:
  - Replace all Supabase data calls with REST endpoints
  - Initialize socket and subscribe to `order:<id>` for `order.updated`
  - Update state on event; invalidate React Query caches
  - Replace file uploads with FormData to `/api/files/upload`
- `src/pages/AdminInventory.tsx` / Product pages:
  - Fetch products from `/api/products`
  - Admin create via POST (if needed)
- `src/pages/Settings.tsx`:
  - Profile: GET/PATCH `/api/profile`
  - Company: GET/PATCH `/api/company`
- `src/pages/ProductSpecs.tsx`:
  - Fetch `/api/pricing`
- Global:
  - Remove references to `src/lib/supabase.ts` and channel subscriptions in UI code; keep auth client.
  - Add socket client, http client, and query provider