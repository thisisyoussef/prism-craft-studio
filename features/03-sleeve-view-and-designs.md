# Feature PRD — Sleeve View and Sleeve Designs

- Owner: Engineering
- Last updated: 2025-09-28
- Status: Planned

## Summary
Enable users to add designs to sleeves from the customizer by introducing a dedicated Sleeve view backed by per-variant sleeve images. Ensure the order captures and attaches sleeve mockup images to the order record.

This leverages existing fields and components:
- Model `ProductVariant`: `sleeveImageUrl?: string` already exists in `server/src/models/ProductVariant.ts` and is surfaced in `server/src/routes/variantRoutes.ts`.
- Admin UI already supports uploading `Sleeve View` for variants in `admin/src/pages/ProductDetail.tsx`.
- Customizer has internal support for a `sleeve` view (`getBounds()` implements sleeve bounds; `GarmentMockup` accepts `sleeveUrl`). Missing piece is the UI tab and capture.

## Current State
- `src/components/ProductCustomizer.tsx`
  - State `selectedView` supports `'front' | 'back' | 'sleeve'`.
  - UI tabs only render Front/Back.
  - `getBounds(garmentType, 'sleeve')` returns sleeve printable area.
  - `addPrintForCurrentView()` defaults to `right_sleeve` when in `sleeve` view (and user can switch the location to `left_sleeve`/`right_sleeve` in `PlacementEditor`).
  - Mockup capture after order creation currently saves `front` and `back` only.
- `src/components/GarmentMockups.tsx`
  - `GarmentMockup` resolves `frontUrl|backUrl|sleeveUrl` and renders base image.
- Server
  - `Order` model allows `mockupImages?: { front? back? sleeve? composite? }`.
  - `orderServiceNode.attachMockups()` calls `PATCH /orders/:id/mockups`, but the route is not implemented; only `GET /:id/mockups` exists.

## Goals
- Add Sleeve tab in the customizer view switcher.
- Allow users to add/edit sleeve placements easily.
- Capture sleeve mockup image on order creation and attach to order.
- Implement server route to persist mockup URLs.

## Non-Goals
- Auto-generating composite images. (Optional future work.)

## UX/Copy
- Tabs: `Front`, `Back`, `Sleeve`.
- Sleeve view prints show both sleeve placements if added (left/right) within a long horizontal printable band.

## Data Model
- No schema changes required. Ensure `mockupImages.sleeve` is persisted on `Order`.

## API/Server Changes
- File: `server/src/routes/orderRoutes.ts`
  - Add endpoint:
    - `PATCH /orders/:id/mockups` (auth: `requireAuth`)
    - Body: `{ mockupImages: { front?: string; back?: string; sleeve?: string; composite?: string } }`
    - Update the order document's `mockupImages` with provided keys, return `serializeOrder(order)`.
  - Keep existing `GET /orders/:id/mockups` returning `[]` until a Mockups collection is introduced.

Implementation sketch:
```ts
orderRouter.patch('/:id/mockups', requireAuth, async (req, res, next) => {
  try {
    const { mockupImages } = req.body || {};
    if (!mockupImages || typeof mockupImages !== 'object') {
      return res.status(400).json({ error: 'mockupImages object required' });
    }
    const update: any = {};
    for (const k of ['front','back','sleeve','composite']) {
      if (typeof mockupImages[k] === 'string') {
        update[`mockupImages.${k}`] = mockupImages[k];
      }
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(serializeOrder(order));
  } catch (err) { next(err); }
});
```

## Frontend Changes

### 1) Add Sleeve tab in ProductCustomizer
- File: `src/components/ProductCustomizer.tsx`
  - In the Tabs near `Mockup Viewer`, add `<TabsTrigger value="sleeve">Sleeve</TabsTrigger>`.
  - Ensure `GarmentMockup` receives `sleeveUrl={selectedVariant?.sleeve_image_url || undefined}` (already wired).
  - Ensure `placements` list includes sleeve options (already: `left_sleeve`, `right_sleeve`).

### 2) Sleeve mockup capture and upload
- File: `src/components/ProductCustomizer.tsx`
  - In the post-create capture block, add the `sleeve` capture similar to front/back, using the same `html-to-image` blob workflow.
  - Upload via `uploadFile(file, { orderId: created.id, filePurpose: 'mockup' })`.
  - Call `OrderService.attachMockups(created.id, { sleeve: sleeveUrl, ...existingFrontBack })`.

### 3) Admin variant image upload (already supported)
- File: `admin/src/pages/ProductDetail.tsx`
  - Variant image grid already includes `Sleeve View` slot mapped to `sleeveImageUrl`. No changes required aside from QA.

## Acceptance Criteria
- Customizer shows a Sleeve tab. Switching to Sleeve displays the sleeve base image if uploaded for the selected variant; otherwise shows the muted placeholder.
- Users can add a sleeve print and switch between `left_sleeve` and `right_sleeve` in `PlacementEditor`.
- Creating an order captures and uploads a sleeve mockup when the Sleeve tab contains any active print; the order record includes `mockup_images.sleeve` URL.
- Admin can upload/replace the sleeve image per variant in `ProductDetail` and see it reflected in the customizer.
- `PATCH /orders/:id/mockups` persists `mockupImages` and returns the updated order.

## QA Notes
- Verify bounds used by `getBounds(..., 'sleeve')` keep overlays fully clamped inside the sleeve band.
- Verify missing sleeve images gracefully degrade (no crash, only overlays rendered atop empty background).

## Rollout Plan
- No feature flag required; low risk.
