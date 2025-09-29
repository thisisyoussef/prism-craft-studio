# Feature PRD — Pixel-to-Measurement Ratio Fix in Customizer

- Owner: Engineering
- Last updated: 2025-09-28
- Status: Planned

## Summary
Occasionally, when users keep stretching an artwork overlay and it hits printable bounds, the inches-to-pixels ratio drifts. This plan standardizes a single inches↔pixels mapping derived from the view's printable region and clamps sizes before they are turned into CSS percentages, avoiding visually disproportionate scaling.

Relevant code:
- `src/components/ProductCustomizer.tsx`
  - Pointer-handling and resizing logic: lines ~838–866
  - `overlayStyleFor()` converts `PrintPlacement.size` and `position` to CSS percents
  - `getBounds()` defines printable region per garment view
- `src/lib/store.ts` types for `PrintPlacement` and `PrintMethod`

## Current Behavior
- Inches in `PrintPlacement.size.widthIn/heightIn` are mapped to `%` using `overlayStyleFor()` with a heuristic:
  - Hardcoded `baseW=12`, `baseH=16`, `scale=60%` of bounds
  - Resizing converts pointer delta to changes in inches using heuristics and then clamps via a post-style check
- When users push beyond the bounds, a post-hoc correction rewrites the inches from the clamped `%` width/height, which can desync inches↔pixels mapping after repeated attempts.

## Goals
- Define a stable mapping from inches to pixels derived from the actual `bounds` rectangle dimensions on screen.
- Clamp in inches-space before mapping to CSS, so the displayed size always corresponds to the inches stored.
- Maintain aspect-ratio-respecting fit of artwork preview inside the overlay visual box.

## Non-Goals
- True physical calibration to real garment dimensions. We continue using a relative printable area assumption per view.

## Design

### 1) Centralize inch↔pixel conversion
- File: `src/components/ProductCustomizer.tsx`
- Introduce helpers (module-local):
  - `function pxPerIn(bounds: Bounds): { x: number; y: number }`
    - Use the viewer's current bounding client rect to compute px-per-1% then map to bounds width/height. Derive px-per-inch by assuming a base printable area reference in inches per view.
  - `function clampInches(sizeIn: { w: number; h: number }, bounds: Bounds, ppi: { x: number; y: number }): { w: number; h: number }`
    - Compute the max overlay inches so that `overlay px` <= `bounds px`. Return clamped inches before converting to CSS.

Reference base area:
- Keep the existing mental model: a typical front printable area ~ 12×16 in. For sleeves ~ 4×12 in band. We already encode this in `overlayStyleFor()` heuristics; we will formalize it:
  - `referenceFront = { W: 12, H: 16 }`
  - `referenceBack = { W: 12, H: 16 }`
  - `referenceSleeve = { W: 4, H: 12 }`

Compute pixel to inch scaling as:
- Get viewer rect: `viewerRef.current.getBoundingClientRect()`
- Convert `bounds.width` (% of viewer) to `boundsPxW = rect.width * bounds.width/100`
- For chosen view, 100% bounds corresponds to reference inches rectangle; thus `ppi.x = boundsPxW / reference.W`, `ppi.y = boundsPxH / reference.H`

### 2) Clamp during resize before applying style
- In the resizing pointer handler (~838–866):
  - Compute tentative inches `{ newW, newH }`
  - Call `const ppi = pxPerIn(bounds)`
  - Compute the maximum inches that fit in the bounds: `maxWIn = boundsPxW / ppi.x`, `maxHIn = boundsPxH / ppi.y` (with optional padding)
  - Clamp `newW = Math.min(newW, maxWIn)`, `newH = Math.min(newH, maxHIn)`
  - Apply `updatePrint(id, { size: { widthIn: newW, heightIn: newH } })`
- Remove/reduce the post-render style-based clamp at lines 859–865; rely primarily on inches clamp.

### 3) Keep overlayStyleFor purely as a mapper
- Update `overlayStyleFor()` to:
  - Use `ppi.x/ppi.y` to map inches to pixels -> back to % of viewer; do not re-clamp size (just clamp position so overlay stays inside bounds)
  - Avoid recomputing sizes based on arbitrarily chosen constants; use the uniform conversion.

### 4) Edge safeguards
- Min sizes: keep `minIn = { w: 1, h: 1 }`
- When aspect-ratio is extreme or artwork is missing, the overlay box is still sized by inches; the inner artwork preview uses object-fit rules as it does now.

## Implementation Steps
- **Add helpers and reference maps** in `ProductCustomizer.tsx` near other utils.
- **Refactor resizing handler** to clamp in inches using ppi + boundsPx.
- **Refactor overlayStyleFor** to compute width/height % from inches via ppi.
- **Validate position clamping** still uses `%` based on bounds.
- **Remove style-clamp-driven inch rewrites** to avoid feedback loops.

## QA/Acceptance Criteria
- Repeated stretching against bounds keeps the displayed box at a visually consistent inch size (no gradual drift).
- Switching views or zooming does not change the stored inches; only mapping changes.
- Minimum size remains usable (1×1 in).

## Risks & Mitigations
- Slight shifts in visual sizes vs previous heuristic. Mitigate by validating typical sizes (front 12×16) and adjusting reference constants.
- Viewer resize/zoom: `ppi` must recompute on zoom; ensure `overlayStyleFor` derives ppi per render using `viewerRef` and `bounds`.

## Rollout
- No feature flag required.
