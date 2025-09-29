import { Router } from 'express';
import { GuestDraft } from '../models/GuestDraft';
import { requireAuth, requireAdmin } from '../middleware/auth';

export const guestDraftRouter = Router();

// List guest drafts (admin only)
guestDraftRouter.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { email, type, limit } = req.query as any;
    const q: any = {};
    if (email) q['info.email'] = String(email);
    if (type) q.type = String(type);
    const lim = Math.min(200, Number(limit) || 50);
    const docs = await GuestDraft.find(q).sort({ createdAt: -1 }).limit(lim).lean();
    res.json(docs.map(serialize));
  } catch (err) { next(err); }
});

// Create a guest draft (no auth required)
guestDraftRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const doc = await GuestDraft.create({
      type: body.type || 'quote',
      info: body.info || {},
      address: body.address || {},
      draft: body.draft || {},
      totals: body.totals || {},
      pricing: body.pricing || {},
      metadata: body.metadata || {},
    });
    res.status(201).json(serialize(doc));
  } catch (err) { next(err); }
});

// Optionally fetch a draft (admin or with token could be added later)
guestDraftRouter.get('/:id', async (req, res, next) => {
  try {
    const doc = await GuestDraft.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: 'Not Found' });
    res.json(serialize(doc));
  } catch (err) { next(err); }
});

function serialize(d: any) {
  return {
    id: d._id?.toString?.() || d._id,
    type: d.type,
    info: d.info,
    address: d.address,
    draft: d.draft,
    totals: d.totals,
    pricing: d.pricing,
    metadata: d.metadata,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}
