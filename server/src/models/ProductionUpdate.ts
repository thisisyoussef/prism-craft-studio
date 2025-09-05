import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ProductionUpdateDocument extends Document {
	orderId: Types.ObjectId;
	stage: string;
	status: string;
	description?: string;
	photos?: string[];
	documents?: string[];
	estimatedCompletion?: Date;
	actualCompletion?: Date;
	createdBy?: Types.ObjectId;
	visibleToCustomer?: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const ProductionUpdateSchema = new Schema<ProductionUpdateDocument>({
	orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
	stage: { type: String, required: true },
	status: { type: String, required: true },
	description: { type: String },
	photos: [{ type: String }],
	documents: [{ type: String }],
	estimatedCompletion: { type: Date },
	actualCompletion: { type: Date },
	createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
	visibleToCustomer: { type: Boolean, default: true },
}, { timestamps: true });

export const ProductionUpdate: Model<ProductionUpdateDocument> = mongoose.models.ProductionUpdate || mongoose.model<ProductionUpdateDocument>('ProductionUpdate', ProductionUpdateSchema);

