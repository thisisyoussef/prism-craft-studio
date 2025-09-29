import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';
import { Product } from '../models/Product';

const productRouter = Router();

// Helper to normalize API shape
function serializeProduct(p: any) {
    return {
        id: p._id?.toString?.(),
        name: p.name,
        category: p.category,
        basePrice: p.basePrice,
        description: p.description,
        imageUrl: p.imageUrl,
        images: p.images || [],
        materials: p.materials || [],
        colors: p.colors || [],
        sizes: p.sizes || [],
        minimumQuantity: p.minimumQuantity,
        moq: p.moq,
        specifications: p.specifications || {},
        active: p.active,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    };
}

// Get all products (public endpoint with optional auth for admin features)
productRouter.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query = req.user?.role === 'admin' ? {} : { active: true };
        const products = await Product.find(query).sort({ createdAt: -1 }).lean();
        console.log(`📦 Retrieved ${products.length} products for ${req.user?.role || 'public'}`);
        res.json({ products: products.map(serializeProduct) });
    } catch (error) {
        console.error('❌ Error fetching products:', error);
        next(error);
    }
});

// Create new product (admin only)
productRouter.post('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, category, basePrice } = req.body;
        if (!name || !category || typeof basePrice !== 'number') {
            return res.status(400).json({ error: 'name, category, basePrice required' });
        }
        const product = await Product.create({
            name,
            category,
            basePrice,
            description: req.body?.description,
            imageUrl: req.body?.imageUrl,
            images: req.body?.images,
            materials: req.body?.materials,
            colors: req.body?.colors,
            sizes: req.body?.sizes,
            minimumQuantity: req.body?.minimumQuantity,
            moq: req.body?.moq,
            specifications: req.body?.specifications,
            active: typeof req.body?.active === 'boolean' ? req.body.active : true,
        });
        console.log(`✅ Product created: ${product.name} - ID: ${product._id}`);
        res.status(201).json(serializeProduct(product));
    } catch (err) { next(err); }
});

// Get product by ID
productRouter.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const p = await Product.findById(req.params.id).lean();
        if (!p) return res.status(404).json({ error: 'Product not found' });
        if (!p.active && req.user?.role !== 'admin') {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(serializeProduct(p));
    } catch (err) { next(err); }
});

// Update product (admin only)
productRouter.patch('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const allowed: Record<string, any> = {};
        const fields = ['name','category','basePrice','description','imageUrl','images','materials','colors','sizes','minimumQuantity','moq','specifications','active'];
        for (const k of fields) {
            if (typeof (req.body ?? {})[k] !== 'undefined') allowed[k] = (req.body as any)[k];
        }
        const updated = await Product.findByIdAndUpdate(req.params.id, allowed, { new: true }).lean();
        if (!updated) return res.status(404).json({ error: 'Product not found' });
        res.json(serializeProduct(updated));
    } catch (err) { next(err); }
});

// Delete product (admin only)
productRouter.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id).lean();
        if (!deleted) return res.status(404).json({ error: 'Product not found' });
        res.json({ ok: true });
    } catch (err) { next(err); }
});

export { productRouter };