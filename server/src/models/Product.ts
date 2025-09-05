import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ProductDocument extends Document {
	name: string;
	category: string;
	basePrice: number;
	description?: string;
	images?: string[];
	materials?: string[];
	colors?: string[];
	sizes?: string[];
	moq?: number;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const ProductSchema = new Schema<ProductDocument>({
	name: { type: String, required: true },
	category: { type: String, required: true },
	basePrice: { type: Number, required: true },
	description: { type: String },
	images: [{ type: String }],
	materials: [{ type: String }],
	colors: [{ type: String }],
	sizes: [{ type: String }],
	moq: { type: Number, default: 50 },
	active: { type: Boolean, default: true },
}, { timestamps: true });

export const Product: Model<ProductDocument> = mongoose.models.Product || mongoose.model<ProductDocument>('Product', ProductSchema);