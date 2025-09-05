import mongoose, { Schema, Document, Model } from 'mongoose';

export interface PricingRuleDocument extends Document {
	productType: string;
	customizationType: string;
	quantityMin: number;
	quantityMax?: number;
	basePrice: number;
	customizationCost: number;
	discountPercentage: number;
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

const PricingRuleSchema = new Schema<PricingRuleDocument>({
	productType: { type: String, required: true },
	customizationType: { type: String, required: true },
	quantityMin: { type: Number, required: true },
	quantityMax: { type: Number },
	basePrice: { type: Number, required: true },
	customizationCost: { type: Number, required: true },
	discountPercentage: { type: Number, default: 0 },
	active: { type: Boolean, default: true },
}, { timestamps: true });

export const PricingRule: Model<PricingRuleDocument> = mongoose.models.PricingRule || mongoose.model<PricingRuleDocument>('PricingRule', PricingRuleSchema);

