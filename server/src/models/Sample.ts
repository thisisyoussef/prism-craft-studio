import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface SampleDocument extends Document {
	companyId?: Types.ObjectId;
	userId?: Types.ObjectId;
	sampleNumber: string;
	products: any[];
	totalPrice: number;
	status: 'ordered' | 'processing' | 'shipped' | 'delivered' | 'converted_to_order';
	shippingAddress?: Record<string, any>;
	trackingNumber?: string;
	convertedOrderId?: Types.ObjectId;
	stripePaymentIntentId?: string;
	createdAt: Date;
	updatedAt: Date;
}

const SampleSchema = new Schema<SampleDocument>({
	companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
	userId: { type: Schema.Types.ObjectId, ref: 'User' },
	sampleNumber: { type: String, required: true, unique: true },
	products: [{ type: Schema.Types.Mixed }],
	totalPrice: { type: Number, required: true },
	status: { type: String, enum: ['ordered', 'processing', 'shipped', 'delivered', 'converted_to_order'], default: 'ordered' },
	shippingAddress: { type: Schema.Types.Mixed },
	trackingNumber: { type: String },
	convertedOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
	stripePaymentIntentId: { type: String },
}, { timestamps: true });

export const Sample: Model<SampleDocument> = mongoose.models.Sample || mongoose.model<SampleDocument>('Sample', SampleSchema);

