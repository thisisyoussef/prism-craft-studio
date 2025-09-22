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

### Lean Page-by-Page Dev Checklist (make it work + test it)

- AdminOrders (`src/pages/AdminOrders.tsx`)
  - Wire GET `/api/orders` with filters via query params (status, limit, offset)
  - Verify list renders; clicking a row routes to detail
  - Dev test: filter list; verify network calls and UI update

- AdminOrderDetail (`src/pages/AdminOrderDetail.tsx`)
  - On mount: GET `/api/orders/:id`, `/api/orders/:id/payments`, `/api/orders/:id/production-updates`, `/api/orders/:id/timeline`
  - PATCH `/api/orders/:id` to change status (admin control)
  - POST `/api/orders/:id/production-updates` to add update
  - POST `/api/orders/:id/timeline` to add event
  - Socket: subscribe to `order:<id>`, listen for `order.updated`, update state
  - Files: POST `/api/files/upload` (FormData: orderId, filePurpose, file); GET `/api/files/order/:id` to show list; open URL
  - Dev test: change status → realtime update shows; add production update; add timeline event; upload file and see it listed

- Products/Inventory (`src/pages/AdminInventory.tsx` or equivalent)
  - GET `/api/products` to display catalog
  - (If admin create/edit is needed) POST `/api/products`
  - Dev test: products render from API

- Samples (`src/pages/...` where sample flows live)
  - POST `/api/samples` to create; GET `/api/samples` list; GET `/api/samples/:id` detail; PATCH `/api/samples/:id` for status/tracking
  - Dev test: create sample → appears in list; update status; verify

- Designer Bookings (`src/pages/...` booking flows)
  - POST `/api/bookings` to create; GET `/api/bookings` list; PATCH `/api/bookings/:id` for status
  - Dev test: create booking → list; update status

- Settings (`src/pages/Settings.tsx`)
  - Profile: GET/PATCH `/api/profile`
  - Company: GET/PATCH `/api/company`
  - Dev test: update profile name; see reflected; company rename persists

- Pricing (`src/pages/ProductSpecs.tsx` or pricing view)
  - GET `/api/pricing` to display current rules
  - Dev test: pricing table renders

- Payments actions (from order detail or actions menu)
  - Checkout: POST `/api/payments/create-checkout { orderId, phase }` then redirect to `url`
  - Invoice: POST `/api/payments/create-invoice { orderId }` then open `invoiceUrl`
  - Dev test: mock keys → URLs returned; UI handles redirect/open

- Global app wiring
  - HTTP client uses `VITE_API_BASE_URL`; attaches Supabase access token in `Authorization`
  - Socket client uses `VITE_SOCKET_URL`; connect on login, disconnect on logout; resubscribe on route change as needed
  - Remove Supabase data queries; keep Supabase Auth only
  - Optional feature flag `FEATURE_USE_NODE_API` to toggle
  - Dev test: sign in → requests include Bearer token; socket connects; sign out → socket disconnects

- Full-flow smoke (manual)
  1) Create order → list shows it → open detail
  2) Change status → realtime update appears
  3) Add production update → visible in list
  4) Add timeline event → visible
  5) Upload artwork → appears and opens
  6) Trigger checkout and invoice → URLs handled
  7) Update profile and company → persisted
  8) View products and pricing → rendered