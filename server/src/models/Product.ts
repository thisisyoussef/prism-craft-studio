import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ProductDocument extends Document {
	name: string;
	category: string;
	basePrice: number;
	description?: string;
	imageUrl?: string;
	images?: string[];
	materials?: string[];
	colors?: string[];
	sizes?: string[];
	minimumQuantity?: number;
	moq?: number;
	specifications?: Record<string, any>;
	active: boolean;
	// Optional per-product lead time overrides
	leadTimes?: {
		production?: { minDays: number; maxDays: number };
		shipping?: { minDays: number; maxDays: number };
	};
	createdAt: Date;
	updatedAt: Date;
}

const ProductSchema = new Schema<ProductDocument>({
	name: { type: String, required: true },
	category: { type: String, required: true },
	basePrice: { type: Number, required: true },
	description: { type: String },
	imageUrl: { type: String },
	images: [{ type: String }],
	materials: [{ type: String }],
	colors: [{ type: String }],
	sizes: [{ type: String }],
	minimumQuantity: { type: Number, default: 25 },
	moq: { type: Number, default: 50 },
	specifications: { type: Schema.Types.Mixed },
	active: { type: Boolean, default: true },
  // Optional per-product lead time overrides
  leadTimes: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const Product: Model<ProductDocument> = mongoose.models.Product || mongoose.model<ProductDocument>('Product', ProductSchema);