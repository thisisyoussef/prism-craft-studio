import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface OrderDocument extends Document {
	companyId?: Types.ObjectId;
	userId?: Types.ObjectId;
	orderNumber: string;
	productCategory: string;
	productId?: Types.ObjectId;
	productName: string;
	quantity: number;
	unitPrice: number;
	totalAmount: number;
	customization?: Record<string, any>;
	colors?: string[];
	sizes?: Record<string, any>;
	printLocations?: string[];
	status: string;
	priority?: string;
	labels?: string[];
	depositAmount: number;
	balanceAmount: number;
	depositPaidAt?: Date;
	balancePaidAt?: Date;
	shippingAddress?: Record<string, any>;
	trackingNumber?: string;
	estimatedDelivery?: Date;
	actualDelivery?: Date;
	artworkFiles?: string[];
	productionNotes?: string;
	customerNotes?: string;
	adminNotes?: string;
	stripeDepositPaymentIntent?: string;
	stripeBalancePaymentIntent?: string;
	createdAt: Date;
	updatedAt: Date;
}

const OrderSchema = new Schema<OrderDocument>({
	companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
	userId: { type: Schema.Types.ObjectId, ref: 'User' },
	orderNumber: { type: String, required: true, unique: true },
	productCategory: { type: String, required: true },
	productId: { type: Schema.Types.ObjectId, ref: 'Product' },
	productName: { type: String, required: true },
	quantity: { type: Number, required: true },
	unitPrice: { type: Number, required: true },
	totalAmount: { type: Number, required: true },
	customization: { type: Schema.Types.Mixed },
	colors: [{ type: String }],
	sizes: { type: Schema.Types.Mixed },
	printLocations: [{ type: String }],
	status: { type: String, default: 'deposit_pending' },
	priority: { type: String },
	labels: [{ type: String }],
	depositAmount: { type: Number, required: true },
	balanceAmount: { type: Number, required: true },
	depositPaidAt: { type: Date },
	balancePaidAt: { type: Date },
	shippingAddress: { type: Schema.Types.Mixed },
	trackingNumber: { type: String },
	estimatedDelivery: { type: Date },
	actualDelivery: { type: Date },
	artworkFiles: [{ type: String }],
	productionNotes: { type: String },
	customerNotes: { type: String },
	adminNotes: { type: String },
	stripeDepositPaymentIntent: { type: String },
	stripeBalancePaymentIntent: { type: String },
}, { timestamps: true });

export const Order: Model<OrderDocument> = mongoose.models.Order || mongoose.model<OrderDocument>('Order', OrderSchema);

