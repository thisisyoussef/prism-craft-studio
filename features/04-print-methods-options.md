# Feature PRD — Print Methods Options (Embroidery, Screen Printing, DTF)

- Owner: Engineering
- Last updated: 2025-09-28
- Status: Planned

## Summary
Expose and standardize the available print methods across the product customizer and pricing logic with clear options for:
- Screen printing
- Embroidery
- DTF

Ensure UI options, client-side pricing, and order payloads are aligned end-to-end.

## Current State
- Pricing store in `src/lib/store.ts`:
  - `export type PrintMethod = 'screen-print' | 'embroidery' | 'dtf' | 'heat_transfer' | 'vinyl' | 'dtg'`
  - `methodBase` in `usePricingStore.calculatePrice` already includes rate entries for all methods including `dtf` and `heat_transfer`.
- Customizer UI in `src/components/customizer/PlacementEditor.tsx`:
  - Method select lists only: `screen-print`, `embroidery`, `vinyl`, `dtg` (DTF and heat_transfer missing).
- Customizer in `src/components/ProductCustomizer.tsx`:
  - `addPrintForCurrentView()` includes `dtf` and `heat_transfer` in allowed methods.
- Order types in `src/lib/types/order.ts` and `OrderService` map methods through `customization` and `print_locations`.

## Goals
- Show a consistent list of methods in Placement editors and global method select.
- Ensure `DTF` is visible in the UI and costed correctly.
- Keep server payloads unchanged (methods are strings in customization details).

## Non-Goals
- Server-side method validation. We keep client authoritative for now.
- Complex pricing rules per garment/material (future).

## UX/Copy
- Use sentence case labels in selects: `screen print`, `embroidery`, `DTF`, `vinyl`, `DTG`, `heat transfer`.
- Tooltip or helper text in the customizer about included methods: "All methods included in pricing; final method is confirmed during design review."

## Frontend Changes

### 1) Placement method select
- File: `src/components/customizer/PlacementEditor.tsx`
- Update the method list to include and order:
  - `screen-print`
  - `embroidery`
  - `dtf`
  - `dtg`
  - `vinyl`
  - `heat_transfer`
- Keep the stored value as the machine string; presentation can be beautified via `.replace('_', ' ')` if needed.

### 2) Global Customization Method select
- File: `src/components/ProductCustomizer.tsx`
- The global `Customization Method` select currently lists `screen-print`, `embroidery`, `vinyl`, `dtg`.
- Add `DTF` and optionally `heat transfer` to match the placement-level choices.
- Note: The default price calculation uses per-placement methods; the global method can be used as the default for new placements.

### 3) Pricing validation
- File: `src/lib/store.ts` `usePricingStore.calculatePrice()`
- Already supports `dtf` and has surcharges for each method. No change required.

### 4) Visual QA
- Ensure that adding a `DTF` placement reflects in the breakdown (via `printsSurchargeUnit`) and in `Order Summary` unit price/total.

## Acceptance Criteria
- Placement editor shows `DTF` and `heat transfer` in the method dropdown.
- Global method select includes `DTF` as a choice.
- Price updates when switching a placement to `DTF`.
- Created orders carry the selected methods in `customization.printLocations` items.

## Rollout Plan
- No feature flag required.
- Low risk; purely UI choices aligned to existing pricing logic.
