import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface FileUploadDocument extends Document {
	userId?: string;
	orderId?: Types.ObjectId;
	bookingId?: Types.ObjectId;
	fileName: string;
	fileSize: number;
	fileType: string;
	fileUrl: string;
	filePurpose: 'artwork' | 'tech_pack' | 'reference' | 'proof' | 'final_design';
	uploadedAt: Date;
}

const FileUploadSchema = new Schema<FileUploadDocument>({
	userId: { type: String },
	orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
	bookingId: { type: Schema.Types.ObjectId, ref: 'DesignerBooking' },
	fileName: { type: String, required: true },
	fileSize: { type: Number, required: true },
	fileType: { type: String, required: true },
	fileUrl: { type: String, required: true },
	filePurpose: { type: String, enum: ['artwork', 'tech_pack', 'reference', 'proof', 'final_design'], required: true },
	uploadedAt: { type: Date, default: Date.now },
});

export const FileUpload: Model<FileUploadDocument> = mongoose.models.FileUpload || mongoose.model<FileUploadDocument>('FileUpload', FileUploadSchema);

