import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface PaymentDocument extends Document {
	orderId: Types.ObjectId;
	phase: 'deposit' | 'balance';
	amountCents: number;
	currency: string;
	status: 'pending' | 'requires_action' | 'paid' | 'failed';
	stripePaymentIntentId?: string;
	stripeCheckoutSessionId?: string;
	stripeChargeId?: string;
	paidAt?: Date;
	metadata?: Record<string, any>;
	createdAt: Date;
	updatedAt: Date;
}

const PaymentSchema = new Schema<PaymentDocument>({
	orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
	phase: { type: String, enum: ['deposit', 'balance'], required: true },
	amountCents: { type: Number, required: true },
	currency: { type: String, default: 'usd' },
	status: { type: String, enum: ['pending', 'requires_action', 'paid', 'failed'], default: 'pending' },
	stripePaymentIntentId: { type: String },
	stripeCheckoutSessionId: { type: String },
	stripeChargeId: { type: String },
	paidAt: { type: Date },
	metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });

export const Payment: Model<PaymentDocument> = mongoose.models.Payment || mongoose.model<PaymentDocument>('Payment', PaymentSchema);

