## PTRN Product Backlog and Improvement Plan

This document proposes product stories, features, and technical improvements based on the current codebase (Vite + React + TS + shadcn-ui, Supabase backend, React Router, TanStack Query, Zustand, Tailwind). It is grouped by epics and prioritized into Quick Wins, Near-Term, and Later.

### Quick wins (high impact, low effort)
- **Unify Supabase client and types**: Remove `src/lib/supabase.ts`; standardize on `@/integrations/supabase/client` and `@/integrations/supabase/types` everywhere.
- **Fix `profiles` queries in `Settings.tsx`**: Schema uses `profiles.id` (auth user id). Replace `eq("user_id", user.id)` with `eq("id", user.id)` and align selects/updates accordingly.
- **Align Orders model usage**: `useOrderStore.addOrder` inserts columns (`colors`, `sizes`, `customization_details`, etc.) not present in `public.orders`. Either update code to use `customization` JSONB and existing price fields, or extend schema consistently.
- **Add `addresses` table + RLS**: `Settings.tsx` uses `addresses` but it is not in `schema.sql`. Add table, indexes, and RLS policies.
- **Add `product_variants` table**: `ProductCustomizer` queries `product_variants` but schema does not define it. Add table and FK to `products`, plus storage paths for images per view.
- **Provide `.env.example`**: Document required env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, optional Stripe keys).
- **Remove or implement empty scripts**: `*.mjs` files at repo root are empty; either delete or implement.

---

## Epics and User Stories

### 1) Catalog & Discovery
- As a visitor, I can browse products by category with pagination and lazy image loading.
  - Acceptance: `/catalog` shows categories, counts, and product cards with price from `products.base_price`.
- As a visitor, I can filter by size, color, price range, and availability.
  - Acceptance: Multiple filters can combine; URL reflects filters for shareability.
- As a visitor, I can search products by name, category, and tags.
  - Acceptance: Debounced search hitting Supabase `products` with trigram index or `ilike` fallback.
- As a visitor, I can view a product detail page with variant swatches and images per view (front/back/sleeve).
  - Acceptance: PDP loads from `products` + `product_variants`; SEO tags set per product.

### 2) Product Customizer
- As a buyer, I can add multiple print placements (front/back/sleeves) with size, position, and rotation within safe areas.
  - Acceptance: Visual bounds and snapping; prevents overflow; supports sleeve split.
- As a buyer, I see real-time price updates based on `pricing_rules`, quantity, and print methods.
  - Acceptance: Price breakdown shows base, customization, and discounts.
- As a buyer, I get DPI validation and warnings for low-resolution uploads.
  - Acceptance: For raster uploads, show min DPI threshold at requested size.
- As a buyer, I can undo/redo edits to placements and text.
  - Acceptance: History stack with keyboard shortcuts.
- As a buyer, I can export a proof PDF with mockups and line items for approval.
  - Acceptance: Generates PDF with timestamp, product, colors, placements, terms.
- As a buyer, I can autosave and resume my design via shareable link.
  - Acceptance: Designs persisted to `draft_designs` (new table) mapped to user or guest token.
- Later: 3D garment preview; vector upload with spot color handling; Pantone mapping.

### 3) Pricing, Quotes, and Checkout
- As a buyer, I can request a quote and receive an email with a link to review and approve.
  - Acceptance: Creates `orders` row with status `quote_requested`; sends email via Supabase functions.
- As a buyer, I can pay a deposit securely (Stripe) to move to production.
  - Acceptance: Stripe Payment Intent created; order status set to `deposit_paid` with `deposit_amount`.
- As a buyer, I can pay remaining balance when order is `final_payment_due`.
  - Acceptance: Final payment updates `final_payment_paid = true` and status to `in_production`.
- As a buyer, I can see taxes and shipping calculated at checkout.
  - Acceptance: Tax via simple rate by state (near-term) or Stripe Tax (later); shipping via flat rate or carrier API later.
- As a buyer, I can convert my sample order into a full order with one click.
  - Acceptance: `samples.converted_order_id` populated; status becomes `converted_to_order`.

### 4) Orders & Production Tracking
- As a buyer, I can track my order through stages with timestamps and photo updates.
  - Acceptance: `production_updates` timeline visible on `/orders/:id` with stage, status, photos, ETA.
- As a buyer, I receive notifications when the order moves stages or needs attention.
  - Acceptance: Email notifications; optional in-app toasts.
- As an admin, I can post production updates, upload proof/production photos, and adjust ETAs.
  - Acceptance: Admin UI with form to create `production_updates` and upload to Supabase Storage.

### 5) Samples
- As a buyer, I can order a sample kit with selected products and sizes.
  - Acceptance: Creates `samples` row; collects shipping address; status flow `ordered → shipped → delivered`.
- As an admin, I can track and mark sample shipments with tracking links.
  - Acceptance: `samples.tracking_number` recorded; emails sent on status changes.

### 6) Designer Bookings
- As a buyer, I can book a consultation with a designer and pay a fee.
  - Acceptance: Creates `designer_bookings` row; optional Stripe payment; meeting link stored.
- As a buyer, I can reschedule or cancel within policy.
  - Acceptance: Status updates and email notifications triggered.
- As an admin, I can manage designer availability and see a calendar view.
  - Acceptance: Calendar UI; optional Google Calendar integration (later).

### 7) Account & Company Management
- As an owner, I can create and manage my company profile and invite teammates with roles.
  - Acceptance: `companies` CRUD; invites via email; roles in `profiles.role`.
- As a user, I can manage my address book with default shipping/billing addresses.
  - Acceptance: `addresses` table (new) with unique by `user_id + label`; RLS for user-owned rows.
- As a user, I can view my order history, quotes, and saved designs.
  - Acceptance: Paginated lists with filters.
- Later: SSO (Google/Microsoft), 2FA, and audit trails.

### 8) Admin: Catalog, Pricing, and Orders
- As an admin, I can manage products and variants, including images per view and color swatches.
  - Acceptance: `products` CRUD; `product_variants` CRUD with `front/back/sleeve_image_url`.
- As an admin, I can manage tiered pricing rules per product and customization type.
  - Acceptance: `pricing_rules` CRUD UI with validation and active toggle.
- As an admin, I can manage orders, collect balances, and issue refunds.
  - Acceptance: Status transitions validated; Stripe actions; logs captured.
- As an admin, I can manage samples and designer bookings from a unified dashboard.
  - Acceptance: Tabs for Samples/Bookings with search and bulk actions.

### 9) Content & SEO
- As a marketer, I can publish case studies and articles with SEO metadata and OpenGraph images.
  - Acceptance: Slug routes (`/case-studies/:slug`); sitemap.xml and robots updated; structured data.
- Add analytics (Plausible or GA4) to key funnels: customize → quote → deposit.

### 10) Accessibility & UX
- Keyboard navigation and focus management across dialogs and customizer controls.
- Color contrast checks; prefers-reduced-motion; ARIA labels on custom elements.

### 11) Performance
- Route-based code splitting and lazy load admin routes and heavy components (e.g., `ProductCustomizer`).
- Image optimization: use `srcset`, responsive sizes, and CDN-backed storage.
- React Query caching policies and prefetch for PDP and customizer.

### 12) Observability & Quality
- Error boundaries around routes; central error toasts standardized via `use-toast`.
- Add Sentry for client error tracking; add server/edge logs later.
- Testing: unit tests for pricing logic; E2E for customize → quote → deposit; Storybook for UI.

### 13) Security & Data Integrity
- Review and harden RLS policies (orders limited by company, uploads by user, addresses by user).
- Input validation with Zod on all forms; sanitize text (notes/custom text) before storing.
- Storage policies for artwork and proofs; signed URLs where needed.

### 14) DevEx, CI/CD, and Docs
- CI with typecheck, lint, build, and E2E; preview deployments for PRs.
- Staging environment with a staging Supabase project and separate Stripe keys.
- Developer docs: architecture overview, ERD, local setup, and runbook.

---

## Technical Debt & Inconsistencies Found

- Two Supabase clients (`src/lib/supabase.ts` vs `src/integrations/supabase/client.ts`). Remove the former; migrate imports.
- `Settings.tsx` uses `profiles` with a `user_id` column; schema defines `profiles.id` (auth user id) and no `email` column. Align table shape or queries and generated types.
- `addresses` table used in code but missing in schema. Add schema, indexes, and RLS.
- `product_variants` used in code but missing in schema. Add schema with FK to `products` and image URLs per view.
- `useOrderStore.addOrder` references fields not in `orders` schema; refactor to use existing columns (`customization` JSONB, `unit_price`, `total_price`, `status`) or extend schema consistently.
- Several `*.mjs` helper scripts are empty; remove or implement with checks and guards.
- Ensure Storage buckets and policies exist for artwork/proofs; update code to handle signed URLs.
- Add `.env.example` and README sections for configuration (Supabase, Stripe, Analytics, Sentry).

---

## Milestones

### Milestone 1 (2–3 weeks): Stabilize Core Flows
- Unify Supabase client + fix `profiles` queries
- Add `addresses` and `product_variants` tables + RLS
- Align Orders insertion with schema + price calculation from `pricing_rules`
- Customize → Quote flow with proof PDF and email

### Milestone 2 (2–3 weeks): Payments and Tracking
- Deposit and balance payments (Stripe)
- Production updates timeline and notifications
- Admin: pricing rules and variants management

### Milestone 3 (3–4 weeks): UX, Performance, and QA
- Customizer undo/redo, DPI validation, safe areas
- Route-level code splitting, image optimization
- E2E tests, Storybook, basic analytics

---

## Schema Additions (proposed)

Minimal tables to add to match current UI expectations:

```sql
-- Addresses (user-owned)
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text,
  full_name text,
  company text,
  phone text,
  address1 text not null,
  address2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null default 'US',
  is_default_shipping boolean default false,
  is_default_billing boolean default false,
  created_at timestamptz not null default now()
);
alter table public.addresses enable row level security;
create policy "own addresses" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Product variants (colors and images per view)
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade not null,
  color_name text not null,
  color_hex text,
  image_url text,
  front_image_url text,
  back_image_url text,
  sleeve_image_url text,
  active boolean default true,
  created_at timestamptz not null default now()
);
alter table public.product_variants enable row level security;
create policy "variants public read" on public.product_variants for select using (active = true);
```

---

## Tracking

- Owner: Product/Eng
- File: `docs/product-backlog.md`
- Updated: keep this document current as features land

