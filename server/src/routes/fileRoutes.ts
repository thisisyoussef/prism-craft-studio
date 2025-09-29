import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth';
import { FileUpload } from '../models/FileUpload';
import { Order } from '../models/Order';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

function sanitizeFilename(original: string): string {
  const base = path.parse(original).name || 'file';
  const ext = (path.extname(original) || '').toLowerCase() || '.bin';
  // Normalize and strip diacritics
  const normalized = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  // Replace non word/.- characters with dashes, collapse repeats
  const cleaned = normalized.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');
  const safeBase = cleaned || 'file';
  return `${safeBase}${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => cb(null, uploadDir),
  filename: (_req: any, file: any, cb: any) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safe = sanitizeFilename(file.originalname || 'upload');
    cb(null, `${unique}-${safe}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

export const fileRouter = Router();

fileRouter.post('/upload', requireAuth, upload.single('file'), async (req: any, res, next) => {
	try {
		if (!req.file) return res.status(400).json({ error: 'No file' });
		const { orderId, bookingId, filePurpose } = req.body;

		// If linked to an order, enforce ownership or admin
		if (orderId) {
			const order = await Order.findById(orderId);
			if (!order) return res.status(404).json({ error: 'Order not found' });
			const isAdmin = req.user?.role === 'admin';
			if (!isAdmin && String(order.customerId) !== String(req.user?.id)) {
				return res.status(403).json({ error: 'Access denied' });
			}
		}
		// Always return the API-scoped path so the FE can fetch via the same origin/proxy
		const fileUrl = `/api/uploads/${req.file.filename}`;
		const created = await FileUpload.create({
			userId: req.user?.id,
			orderId,
			bookingId,
			filePurpose,
			fileName: req.file.originalname,
			fileSize: req.file.size,
			fileType: req.file.mimetype,
			fileUrl,
		});
		res.json({ fileUrl });
	} catch (err) { next(err); }
});

fileRouter.get('/order/:id', requireAuth, async (req, res, next) => {
	try {
		const items = await FileUpload.find({ orderId: req.params.id }).sort({ uploadedAt: -1 }).lean();
		res.json(items.map(i => ({
			id: i._id.toString(),
			fileName: i.fileName,
			fileSize: i.fileSize,
			fileType: i.fileType,
			fileUrl: i.fileUrl,
			filePurpose: i.filePurpose,
			uploadedAt: i.uploadedAt,
		})));
	} catch (err) { next(err); }
});

// List files for a booking
fileRouter.get('/booking/:id', requireAuth, async (req, res, next) => {
	try {
		const items = await FileUpload.find({ bookingId: req.params.id }).sort({ uploadedAt: -1 }).lean();
		res.json(items.map(i => ({
			id: i._id.toString(),
			fileName: i.fileName,
			fileSize: i.fileSize,
			fileType: i.fileType,
			fileUrl: i.fileUrl,
			filePurpose: i.filePurpose,
			uploadedAt: i.uploadedAt,
		})));
	} catch (err) { next(err); }
});

// List files uploaded by current user
fileRouter.get('/me', requireAuth, async (req: any, res, next) => {
	try {
		const items = await FileUpload.find({ userId: req.user?.id }).sort({ uploadedAt: -1 }).lean();
		res.json(items.map(i => ({
			id: i._id.toString(),
			fileName: i.fileName,
			fileSize: i.fileSize,
			fileType: i.fileType,
			fileUrl: i.fileUrl,
			filePurpose: i.filePurpose,
			uploadedAt: i.uploadedAt,
		})));
	} catch (err) { next(err); }
});

// Delete a file by id (owner or admin)
fileRouter.delete('/:id', requireAuth, async (req: any, res, next) => {
	try {
		const rec = await FileUpload.findById(req.params.id);
		if (!rec) return res.status(404).json({ error: 'Not found' });
		const isAdmin = req.user?.role === 'admin';
		const isOwner = String(rec.userId || '') === String(req.user?.id || '');
		if (!isAdmin && !isOwner) return res.status(403).json({ error: 'Access denied' });

		// Try to remove the underlying file (best effort)
		try {
			const filename = path.basename(rec.fileUrl || '');
			if (filename) {
				const fp = path.join(process.cwd(), 'uploads', filename);
				fs.promises.unlink(fp).catch(() => {});
			}
		} catch {}

		await rec.deleteOne();
		res.json({ success: true });
	} catch (err) { next(err); }
});
