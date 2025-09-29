import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ProductVariantDocument extends Document {
  productId: Types.ObjectId;
  colorName: string;
  colorHex: string;
  stock: number;
  price?: number | null;
  imageUrl?: string | null;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  sleeveImageUrl?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new Schema<ProductVariantDocument>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  colorName: { type: String, required: true },
  colorHex: { type: String, required: true, default: '#000000' },
  stock: { type: Number, required: true, default: 0 },
  price: { type: Number, default: null },
  imageUrl: { type: String, default: null },
  frontImageUrl: { type: String, default: null },
  backImageUrl: { type: String, default: null },
  sleeveImageUrl: { type: String, default: null },
  active: { type: Boolean, required: true, default: true },
}, { timestamps: true });

ProductVariantSchema.index({ productId: 1, colorName: 1 }, { unique: false });

export const ProductVariant: Model<ProductVariantDocument> = mongoose.models.ProductVariant || mongoose.model<ProductVariantDocument>('ProductVariant', ProductVariantSchema);
