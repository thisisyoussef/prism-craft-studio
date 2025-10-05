import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import { Settings, getGlobalLeadTimes } from '../models/Settings';
import { Product } from '../models/Product';

export const leadTimeRouter = Router();

// GET global defaults (public)
leadTimeRouter.get('/defaults', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const lt = await getGlobalLeadTimes();
    res.json(lt);
  } catch (err) { next(err); }
});

// PUT global defaults (admin)
leadTimeRouter.put('/defaults', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { production, shipping, businessCalendar } = req.body || {};
    const doc = await Settings.findOneAndUpdate({}, {
      $set: { leadTimes: { production, shipping, businessCalendar, updatedAt: new Date(), updatedByUserId: req.user!.id } }
    }, { new: true, upsert: true });
    res.json(doc?.leadTimes || {});
  } catch (err) { next(err); }
});

// GET effective lead times for a product (public)
leadTimeRouter.get('/products/:id/effective', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    const global = await getGlobalLeadTimes();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const override = (product as any).leadTimes || {};
    const effective = {
      production: override.production || global.production,
      shipping: override.shipping || global.shipping,
      businessCalendar: global.businessCalendar,
    };
    res.json(effective);
  } catch (err) { next(err); }
});

// PUT per-product overrides (admin)
leadTimeRouter.put('/products/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { production, shipping, useGlobal } = req.body || {};
    const set: any = {};
    const unset: any = {};

    if (useGlobal === true || (production === null && shipping === null)) {
      unset['leadTimes'] = '';
    } else {
      if (typeof production === 'object') set['leadTimes.production'] = production;
      if (production === null) unset['leadTimes.production'] = '';

      if (typeof shipping === 'object') set['leadTimes.shipping'] = shipping;
      if (shipping === null) unset['leadTimes.shipping'] = '';
    }

    const update: any = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;
    if (!Object.keys(update).length) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    const updated = await Product.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Product not found' });
    res.json({ ok: true, leadTimes: (updated as any).leadTimes || {} });
  } catch (err) { next(err); }
});
