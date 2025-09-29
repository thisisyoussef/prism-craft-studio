import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface OrderTimelineDocument extends Document {
	orderId: Types.ObjectId;
	eventType: string;
	description: string;
	eventData?: Record<string, any>;
	triggerSource?: 'manual' | 'system' | 'webhook' | 'api' | 'admin';
	triggeredBy?: Types.ObjectId;
	createdAt: Date;
}

const OrderTimelineSchema = new Schema<OrderTimelineDocument>({
	orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
	eventType: { type: String, required: true },
	description: { type: String, required: true },
	eventData: { type: Schema.Types.Mixed },
	triggerSource: { type: String, enum: ['manual', 'system', 'webhook', 'api', 'admin'], default: 'manual' },
	triggeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const OrderTimeline: Model<OrderTimelineDocument> = mongoose.models.OrderTimeline || mongoose.model<OrderTimelineDocument>('OrderTimeline', OrderTimelineSchema);

