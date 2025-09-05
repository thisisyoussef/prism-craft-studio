import mongoose, { Schema, Document, Model } from 'mongoose';

export interface CompanyDocument extends Document {
	name: string;
	industry?: string;
	size?: string;
	address?: string;
	phone?: string;
	logoUrl?: string;
	billingAddress?: Record<string, any>;
	createdAt: Date;
	updatedAt: Date;
}

const CompanySchema = new Schema<CompanyDocument>({
	name: { type: String, required: true },
	industry: { type: String },
	size: { type: String },
	address: { type: String },
	phone: { type: String },
	logoUrl: { type: String },
	billingAddress: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const Company: Model<CompanyDocument> = mongoose.models.Company || mongoose.model<CompanyDocument>('Company', CompanySchema);

