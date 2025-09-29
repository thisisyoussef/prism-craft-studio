import { Router } from 'express';
import { Order } from '../models/Order';
import { requireGuestAccess } from '../middleware/auth';
import { sendEmail } from '../services/emailService';
import { GuestMagicLink } from '../models/GuestMagicLink';
import crypto from 'crypto';

export const guestOrderRouter = Router();

function sanitize(o: any) {
  if (!o) return o;
  return {
    id: o._id?.toString?.() || o.id,
    orderNumber: o.orderNumber,
    productCategory: o.productCategory,
    productName: o.productName,
    quantity: o.quantity,
    unitPrice: o.unitPrice,
    totalAmount: o.totalAmount,
    customization: o.customization,
    colors: o.colors,
    sizes: o.sizes,
    printLocations: o.printLocations,
    status: o.status,
    priority: o.priority,
    labels: o.labels,
    totalPaidAmount: o.totalPaidAmount,
    paidAt: o.paidAt,
    shippingAddress: o.shippingAddress,
    trackingNumber: o.trackingNumber,
    estimatedDelivery: o.estimatedDelivery,
    actualDelivery: o.actualDelivery,
    artworkFiles: o.artworkFiles,
    productionNotes: o.productionNotes,
    customerNotes: o.customerNotes,
    adminNotes: o.adminNotes,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

// List guest orders for current guest token
guestOrderRouter.get('/', requireGuestAccess, async (req, res, next) => {
  try {
    const email = req.guest!.email;
    const list = await Order.find({ guestEmail: email }).sort({ createdAt: -1 }).lean();
    res.json(list.map(sanitize));
  } catch (err) { next(err); }
});

// Get a specific guest order
guestOrderRouter.get('/:id', requireGuestAccess, async (req, res, next) => {
  try {
    const email = req.guest!.email;
    const id = req.params.id;
    const order = await Order.findOne({ _id: id, guestEmail: email }).lean();
    if (!order) return res.status(404).json({ error: 'Not Found' });
    res.json(sanitize(order));
  } catch (err) { next(err); }
});

// Create an order as guest (email required in body)
// Body: { email, productName, productCategory, quantity, unitPrice, totalAmount, customization, colors, sizes, printLocations, shippingAddress }
guestOrderRouter.post('/', async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = String(body.email || '').toLowerCase().trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const now = Date.now();
    const order = await Order.create({
      orderNumber: `ORD-${now}`,
      productCategory: String(body.productCategory || 'custom'),
      productName: String(body.productName || 'Custom Product'),
      quantity: Number(body.quantity || 1),
      unitPrice: Number(body.unitPrice || 0),
      totalAmount: Number(body.totalAmount || 0),
      customization: body.customization || {},
      colors: Array.isArray(body.colors) ? body.colors : [],
      sizes: body.sizes || {},
      printLocations: Array.isArray(body.printLocations) ? body.printLocations : [],
      status: 'submitted',
      totalPaidAmount: 0,
      shippingAddress: body.shippingAddress || undefined,
      guestEmail: email,
      customerEmail: email,
    });

    // Send a magic link automatically for convenience
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await GuestMagicLink.create({ email, tokenHash, orderIds: [order.id], intent: 'order_access', expiresAt, createdByIp: (req.headers['x-forwarded-for'] as string) || req.ip });
      const frontendBase = process.env.FRONTEND_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:5173';
      const link = `${frontendBase}/guest/verify?token=${encodeURIComponent(token)}`;
      await sendEmail({
        to: email,
        subject: 'Access your order at Prism Craft Studio',
        html: `<p>Use the button below to access your order.</p><p><a href="${link}">Access my order</a></p><p>This link expires in 15 minutes.</p>`,
        text: `Access your order: ${link}`,
      });
    } catch {}

    res.status(201).json(sanitize(order));
  } catch (err) { next(err); }
});
