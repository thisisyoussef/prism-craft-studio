# Feature PRD — Admin: Categories Dropdown

- Owner: Engineering
- Last updated: 2025-09-28
- Status: Planned

## Summary
Add a first-class category dropdown in the admin dashboard to:
- Filter the products list by category in `admin/src/pages/Products.tsx`.
- Edit a product's `category` via a dropdown in `admin/src/pages/ProductDetail.tsx` while still allowing a custom entry.

This builds on the existing `category: string` field in the server model `server/src/models/Product.ts` and the admin UIs already wired to `/products` APIs (`server/src/routes/productRoutes.ts`).

## Current State
- Server model: `server/src/models/Product.ts` has `category: { type: String, required: true }`.
- Server routes: `server/src/routes/productRoutes.ts`
  - `GET /products` returns `{ products: [...] }` with `category` values.
  - `PATCH /products/:id` accepts `category` and persists it.
- Admin list UI: `admin/src/pages/Products.tsx` shows a search input but no category filter.
- Admin product form: `admin/src/pages/ProductDetail.tsx` shows a free-text input for category.

## Goals
- Provide a quick category filter in the products listing page.
- Standardize categories usage by encouraging selection from existing categories, while retaining the ability to enter a new category.

## Non-Goals
- Category taxonomy management UI (create/rename/delete with audit). We’ll derive categories from existing products initially.
- Back-end distinct categories endpoint (optional enhancement below).

## UX/Copy
- Products list: add a dropdown labeled `Category` next to the search input. Default value `All`.
- Product detail: show a select populated with existing categories and a `Custom…` option that toggles a text input.

## Data Model
- No schema changes. Continue using `category: string` on `Product`.

## API
- Reuse existing endpoints:
  - `GET /products` (already used by `Products.tsx`)
  - `PATCH /products/:id`
- Optional (Phase 2): add `GET /products/categories` to return `distinct` categories (implementation:
  ```ts
  // server/src/routes/productRoutes.ts
  productRouter.get('/categories', optionalAuth, async (_req, res, next) => {
    try {
      const categories = await Product.distinct('category');
      res.json({ categories: (categories || []).filter(Boolean).sort() });
    } catch (err) { next(err); }
  });
  ```
  )

## Frontend Changes

### 1) Products list filter
- File: `admin/src/pages/Products.tsx`
- Add state `selectedCategory: string` and compute `categories` from the fetched `products`.
- UI: Insert a `select` next to the search box.
- Filtering logic: Amend `filteredProducts` memo to also filter when `selectedCategory` is not `All`.
- Notes: Derive categories from `products` to avoid a new API for now.

Implementation outline:
- Compute categories set:
  - `const categories = useMemo(() => Array.from(new Set((products ?? []).map(p => p.category).filter(Boolean))).sort(), [products]);`
- Add a dropdown:
  - Label: `Category`
  - Options: `All` + `categories.map(c => <option key={c}>{c}</option>)`
- Filter:
  - `if (selectedCategory && selectedCategory !== 'All') return list.filter(p => p.category === selectedCategory)`

### 2) Product detail category select
- File: `admin/src/pages/ProductDetail.tsx`
- Fetch categories similarly (from `variantsQ` or a new small fetch in this component) or accept a prop via route state.
- Replace the category text input with:
  - A select listing existing categories.
  - A final option `Custom…` that toggles a text input for manual entry.
- Persist with existing `updateProduct` mutation (already calls `PATCH /products/:id`).

### 3) Optional Phase 2 (backend distinct endpoint)
- If categories become large or if admins want to manage categories centrally, ship the `GET /products/categories` route and use it in both `Products.tsx` and `ProductDetail.tsx`.

## Performance & Security
- Filtering is client-side; impact is negligible for current dataset size. If product list grows large, consider server-side filter `GET /products?category=T-Shirts`.
- No new PII or auth changes. Admin routes remain protected by `requireAuth` + `requireAdmin` on server.

## Telemetry/Logging
- Not required. Optionally log selected category to help understand popular categories.

## QA/Acceptance Criteria
- Products page shows a `Category` dropdown with `All` + all existing categories.
- Selecting a category filters the table accordingly and the URL doesn’t need to change.
- Product detail page shows a category select with existing categories.
- Choosing `Custom…` reveals a text input; saving persists and new category appears in the products list filter.
- Refreshing after edits preserves the persisted category values from the API.

## Rollout Plan
- Ship behind no feature flag; risk is minimal.
- Monitor admin success in setting categories; gather feedback for managed taxonomy if needed.
