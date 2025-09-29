# Feature PRD — Samples Flow: Designed ($75) and Blank ($50)

- Owner: Engineering
- Last updated: 2025-09-28
- Status: Planned

## Summary
Flesh out the samples flow so customers can:
- Choose a product and color (like other products).
- Choose between two sample types per item:
  - Designed sample — upload a design; priced at $75 each.
  - Blank sample — no design; priced at $50 each.
- Provide shipping address.
- Place the request (MVP: email + backoffice record), with an option to pay online via Stripe in Phase 2.

This extends current components:
- `src/components/SampleOrdering.tsx`
- `src/components/SampleOrderFlow.tsx`

And server model/routes:
- `server/src/models/Sample.ts`
- `server/src/routes/sampleRoutes.ts`

## Current State
- Frontend `SampleOrdering`/`SampleOrderFlow` already list products and variants from the Node APIs (`/products`, `/variants`), allow selecting multiple samples, and collect address.
- Submits guest draft via email using `sendGuestDraftEmail` (no direct payment yet).
- Server `Sample` model supports: `products: any[]`, `totalPrice`, `status`, `shippingAddress`, `trackingNumber`.
- `sampleRouter` has `POST /samples` but is guarded by `requireAuth` (customers only).

## Goals
- Allow per-item type selection: designed vs blank.
- Collect optional design file for designed samples.
- Compute total as `sum(items: designed*$75 + blank*$50) + shipping`.
- Persist a structured sample record to server for logged-in users; continue guest-email path for guests (Phase 1). Phase 2 adds online payment.

## Non-Goals
- Full customizer for samples. We’ll keep a lightweight design upload (single image) for designed samples.
- Complex pricing by garment/material.

## UX/Copy
- On each product card in `SampleOrdering`, when selected, show a small selector:
  - Type: `Designed ($75)` | `Blank ($50)`
  - Color: choose a color variant (use first active variant by default)
  - Design file (only if Designed): file picker + thumbnail
- Summary panel lists each selected sample with type and unit price.

## Data Model
- Store each selected sample item client-side as:
  ```ts
  type SampleItem = {
    productId: string;
    productName: string;
    variantId?: string;
    colorName?: string;
    type: 'designed' | 'blank';
    unitPrice: number; // 75 or 50
    designUrl?: string; // after upload
  }
  ```
- Server `Sample.products` can store these items as mixed objects (already `Schema.Types.Mixed`).

## Frontend Changes

### 1) Product cards with type/color
- File: `src/components/SampleOrdering.tsx`
- For selected sample IDs, render a sub-form beneath each card:
  - `Select` for type (default `designed`).
  - `Select` for color: populate from variants for that product (`variantsData` is already fetched; filter by `productId`).
  - If `type==='designed'`, render a file input to upload a single design image. On selection, upload immediately via `uploadFile(file, { filePurpose: 'sample_design' })` and store the returned URL in local state for that item.
- Compute per-item `unitPrice` based on type.
- Ensure accessibility (labels, keyboard toggling already present).

### 2) Order summary and submission
- File: `src/components/SampleOrderFlow.tsx`
- Replace current totals computation with:
  - `designedUnit = 75`, `blankUnit = 50`
  - `subtotal = items.reduce((a, it) => a + (it.type==='designed' ? designedUnit : blankUnit), 0)`
  - `shipping = subtotal > 50 ? 0 : 9.99` (existing rule)
  - `total = subtotal + shipping`
- Show per-item lines including type and color.
- Submission:
  - If `user` is signed in: call server `POST /samples` with payload `{ products: items, totalPrice: total, shippingAddress }`.
  - If guest: keep emailing via `sendGuestDraftEmail('sample', ...)` with structured payload that includes per-item type and `designUrl`.

### 3) Design uploads for samples
- Use existing Node file upload `POST /files/upload` (`server/src/routes/fileRoutes.ts`) with `filePurpose=sample_design` so they are tracked distinctly.

## Server/API Changes

### Phase 1 (MVP, no payment)
- Keep `POST /samples` guarded by `requireAuth`. For guests, remain on email flow.
- Ensure serialization in `sampleRoutes.ts` returns the submitted `products` array and `totalPrice`.

### Phase 2 (Stripe checkout for samples)
- Extend `server/src/routes/stripeRoutes.ts` to add a checkout for samples:
  ```ts
  stripeRoutes.post('/payments/create-checkout-sample', async (req, res, next) => {
    try {
      const { sampleId } = req.body || {};
      if (!sampleId) return res.status(400).json({ error: 'Missing sampleId' });
      const s = await Sample.findById(sampleId).lean();
      if (!s) return res.status(404).json({ error: 'Sample not found' });
      const amountCents = Math.round(Number(s.totalPrice || 0) * 100);
      if (!amountCents || amountCents <= 0) return res.status(400).json({ error: 'Invalid amount' });

      const frontend = process.env.FRONTEND_URL || 'http://localhost:8081';
      const success_url = `${frontend.replace(/\/$/, '')}/samples?payment=success&sample=${encodeURIComponent(String(sampleId))}`;
      const cancel_url = `${frontend.replace(/\/$/, '')}/samples?payment=cancelled&sample=${encodeURIComponent(String(sampleId))}`;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url,
        cancel_url,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: `Sample ${s.sampleNumber || sampleId}` },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        metadata: { sampleId: String(sampleId) },
      });
      res.json({ id: session.id, url: (session as any).url });
    } catch (err) { next(err); }
  });
  ```
- Optional: change `sampleRoutes.post('/')` auth to `optionalAuth` and capture `guestEmail` to support guest checkout. Or add a dedicated guest endpoint.

## Acceptance Criteria
- Users can select a product and color per sample item.
- Switching between `Designed ($75)` and `Blank ($50)` updates unit price and summary.
- Designed items allow a single design image upload and show a small thumbnail.
- Signed-in users can submit and see a sample record created (listed if a Samples page exists later).
- Guests can still submit via email (structured draft).
- Phase 2: Admin can create a sample and generate a Stripe checkout link; after payment success, the sample status can flip to `processing`.

## QA Notes
- Validate `Sample.products` persistence and ensure `serializeSample()` exposes `products` with `designUrl` when provided.
- Verify uploads are stored and accessible URLs are returned.

## Rollout Plan
- Phase 1: UI + email + server record for signed-in users.
- Phase 2: Stripe checkout endpoint + optional guest checkout.
