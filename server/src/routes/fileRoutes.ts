import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth';
import { FileUpload } from '../models/FileUpload';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
	destination: (_req: any, _file: any, cb: any) => cb(null, uploadDir),
	filename: (_req: any, file: any, cb: any) => {
		const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		cb(null, `${unique}-${file.originalname}`);
	},
});

const upload = multer({ storage });

export const fileRouter = Router();

fileRouter.post('/upload', requireAuth, upload.single('file'), async (req: any, res, next) => {
	try {
		if (!req.file) return res.status(400).json({ error: 'No file' });
		const { orderId, bookingId, filePurpose } = req.body;
		const fileUrl = `/uploads/${req.file.filename}`;
		await FileUpload.create({
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

