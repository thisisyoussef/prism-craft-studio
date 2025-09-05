import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface DesignerBookingDocument extends Document {
	companyId?: Types.ObjectId;
	userId?: Types.ObjectId;
	designerId: string;
	consultationType: string;
	scheduledDate: Date;
	durationMinutes: number;
	status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
	price: number;
	meetingLink?: string;
	notes?: string;
	projectFiles?: string[];
	stripePaymentIntentId?: string;
	createdAt: Date;
	updatedAt: Date;
}

const DesignerBookingSchema = new Schema<DesignerBookingDocument>({
	companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
	userId: { type: Schema.Types.ObjectId, ref: 'User' },
	designerId: { type: String, required: true },
	consultationType: { type: String, required: true },
	scheduledDate: { type: Date, required: true },
	durationMinutes: { type: Number, default: 60 },
	status: { type: String, enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'], default: 'scheduled' },
	price: { type: Number, required: true },
	meetingLink: { type: String },
	notes: { type: String },
	projectFiles: [{ type: String }],
	stripePaymentIntentId: { type: String },
}, { timestamps: true });

export const DesignerBooking: Model<DesignerBookingDocument> = mongoose.models.DesignerBooking || mongoose.model<DesignerBookingDocument>('DesignerBooking', DesignerBookingSchema);

