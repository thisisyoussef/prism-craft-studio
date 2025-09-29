import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import { ProductVariant } from '../models/ProductVariant';

export const variantRouter = Router();

function serializeVariant(v: any) {
  return {
    id: v._id?.toString?.(),
    productId: v.productId?.toString?.(),
    colorName: v.colorName,
    colorHex: v.colorHex,
    stock: v.stock,
    price: v.price ?? null,
    imageUrl: v.imageUrl ?? null,
    frontImageUrl: v.frontImageUrl ?? null,
    backImageUrl: v.backImageUrl ?? null,
    sleeveImageUrl: v.sleeveImageUrl ?? null,
    active: v.active,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

// Batch fetch: /api/variants?productIds=a,b,c or /api/variants?productId=a
variantRouter.get('/variants', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productIds, productId } = req.query as any;
    const ids: string[] = productIds
      ? String(productIds).split(',').map((s) => s.trim()).filter(Boolean)
      : productId ? [String(productId)] : [];
    const query: any = ids.length ? { productId: { $in: ids } } : {};
    const docs = await ProductVariant.find(query).sort({ colorName: 1 }).lean();
    res.json({ variants: docs.map(serializeVariant) });
  } catch (err) { next(err); }
});

// List variants for a product
variantRouter.get('/products/:productId/variants', optionalAuth, async (req, res, next) => {
  try {
    const docs = await ProductVariant.find({ productId: req.params.productId }).sort({ colorName: 1 }).lean();
    res.json({ variants: docs.map(serializeVariant) });
  } catch (err) { next(err); }
});

// Create variant (admin only)
variantRouter.post('/products/:productId/variants', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const v = await ProductVariant.create({
      productId: req.params.productId,
      colorName: body.colorName,
      colorHex: body.colorHex || '#000000',
      stock: typeof body.stock === 'number' ? body.stock : 0,
      price: typeof body.price === 'number' ? body.price : null,
      imageUrl: body.imageUrl || null,
      frontImageUrl: body.frontImageUrl || null,
      backImageUrl: body.backImageUrl || null,
      sleeveImageUrl: body.sleeveImageUrl || null,
      active: typeof body.active === 'boolean' ? body.active : true,
    });
    res.status(201).json(serializeVariant(v));
  } catch (err) { next(err); }
});

// Update variant (admin only)
variantRouter.patch('/variants/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const fields = ['colorName','colorHex','stock','price','imageUrl','frontImageUrl','backImageUrl','sleeveImageUrl','active'];
    const patch: any = {};
    for (const k of fields) if (k in (req.body || {})) patch[k] = (req.body as any)[k];
    const doc = await ProductVariant.findByIdAndUpdate(req.params.id, patch, { new: true }).lean();
    if (!doc) return res.status(404).json({ error: 'Variant not found' });
    res.json(serializeVariant(doc));
  } catch (err) { next(err); }
});

// Delete variant (admin only)
variantRouter.delete('/variants/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const doc = await ProductVariant.findByIdAndDelete(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: 'Variant not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
