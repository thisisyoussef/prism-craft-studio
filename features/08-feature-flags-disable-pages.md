# Feature PRD — Feature Flags to Disable Pages in Production

- Owner: Engineering
- Last updated: 2025-09-28
- Status: Planned

## Summary
Introduce lightweight feature flags to selectively disable certain public pages in production builds (e.g., `Designers`, `Find my order`) while keeping them available in development. Flags should affect:
- Route mounting (do not register disabled routes).
- Navigation visibility (hide nav links and menu items).
- Deep-link handling (disabled routes fall back to Not Found).

This is entirely client-side using Vite environment variables; no server-side changes are required.

## Current State
- Routes are defined in `src/App.tsx` and include:
  - `/designers` → `src/pages/Designers.tsx`
  - `/find-order` → `src/pages/FindMyOrder.tsx`
- Navigation links are rendered in `src/components/Navigation.tsx` (desktop and mobile menus include `Designers` and `Find order`).

## Goals
- Provide `VITE` env-based flags, defaulting to enabled in development and easily switchable per environment.
- Hide navigation links and avoid mounting routes when a page is disabled.
- Avoid dead imports (keep static imports acceptable; only the `<Route/>` should be gated). If desired later, convert to lazy imports.

## Non-Goals
- Persisting flags server-side or exposing an admin toggle UI.
- Partial page gating (we either hide the whole page or show it entirely).

## API/Config Surface
- Add the following environment variables (set in `.env`, `.env.production`, or hosting provider env):
  - `VITE_ENABLE_DESIGNERS` → `'1' | '0'` (default: `1` in dev, recommended `0` in prod)
  - `VITE_ENABLE_FIND_ORDER` → `'1' | '0'` (default: `1` in dev, recommended `0` in prod)

## Implementation Details

### 1) Create a feature flags helper
- File: `src/lib/featureFlags.ts` (new)
- Export a small object computed from `import.meta.env` with safe fallbacks:
  ```ts
  export const featureFlags = {
    designers: (import.meta.env.VITE_ENABLE_DESIGNERS ?? '1') !== '0',
    findOrder: (import.meta.env.VITE_ENABLE_FIND_ORDER ?? '1') !== '0',
  };
  ```
- Optionally export a type for flags to keep usage typed.

### 2) Gate routes in `src/App.tsx`
- Import `featureFlags` and conditionally render routes:
  ```tsx
  {featureFlags.designers && <Route path="/designers" element={<Designers />} />}
  {featureFlags.findOrder && <Route path="/find-order" element={<FindMyOrder />} />}
  ```
- Keep catch-all `*` → `NotFound` so deep links to disabled routes 404 gracefully.

### 3) Hide nav links in `src/components/Navigation.tsx`
- Import `featureFlags` and hide menu items:
  ```tsx
  {featureFlags.designers && (
    <Link to="/designers" ...>Designers</Link>
  )}
  {featureFlags.findOrder && (
    <Link to="/find-order" ...>Find order</Link>
  )}
  ```
- Update both desktop and mobile menus accordingly.

### 4) Optional: Add a `<FeatureGate>` utility component
- For any other page or component we may wish to gate later:
  ```tsx
  export function FeatureGate({ when, children }: { when: boolean; children: React.ReactNode }) {
    if (!when) return null;
    return <>{children}</>;
  }
  ```
- Use in layout code if desired. Not required for MVP.

## Dev/Prod Defaults
- In development, leave both flags enabled by default (no `.env` change needed).
- In production, add to hosting environment:
  - `VITE_ENABLE_DESIGNERS=0`
  - `VITE_ENABLE_FIND_ORDER=0`
- Verify that the Vite build picks up these values at compile time.

## QA/Acceptance Criteria
- When `VITE_ENABLE_DESIGNERS=0`, the `Designers` link is hidden in header and mobile menus, the `/designers` route is not mounted, and navigating directly to `/designers` yields the Not Found page.
- When `VITE_ENABLE_FIND_ORDER=0`, the `Find order` link is hidden and the route is unmounted similarly.
- Re-enabling flags (set to `1`) shows links and routes again without code changes.

## Observability
- Console log a masked summary of flags in development on app startup (optional) to ease verification.

## Rollout Plan
- Ship the helper and gated code under dev default enabled.
- Set prod env vars to disable target pages.
- No downtime or migrations.
