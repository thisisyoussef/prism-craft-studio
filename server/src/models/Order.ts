import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface OrderDocument extends Document {
	companyId?: Types.ObjectId;
	userId?: Types.ObjectId;
	customerId?: string;
	customerEmail?: string;
	customerName?: string;
	companyName?: string;
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
	status: 'submitted' | 'paid' | 'in_production' | 'shipping' | 'delivered';
	priority?: string;
	labels?: string[];
	totalPaidAmount: number;
	paidAt?: Date;
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
	// Design preview mockups
	mockupImages?: {
		front?: string;
		back?: string;
		sleeve?: string;
		composite?: string;
	};
	// Lead time snapshot and ETA fields (v1)
	leadTimeSnapshot?: {
		production?: { minDays: number; maxDays: number };
		shipping?: { minDays: number; maxDays: number };
		businessCalendar?: { timezone: string; workingDays: string[] };
		capturedAt?: Date;
	};
	expectedSchedule?: {
		in_production?: { expectedStartAt?: Date; expectedEndAt?: Date };
		shipping?: { expectedStartAt?: Date; expectedEndAt?: Date };
	};
	estimatedDeliveryWindow?: { start?: Date; end?: Date };
	// Guest access fields
	guestEmail?: string;
	guestVerifiedAt?: Date;
	claimedByUserId?: Types.ObjectId;
	accessRevokedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

const OrderSchema = new Schema<OrderDocument>({
	companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
	userId: { type: Schema.Types.ObjectId, ref: 'User' },
	customerId: { type: String },
	customerEmail: { type: String },
	customerName: { type: String },
	companyName: { type: String },
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
	status: { 
		type: String, 
		enum: ['submitted', 'paid', 'in_production', 'shipping', 'delivered'],
		default: 'submitted' 
	},
	priority: { type: String },
	labels: [{ type: String }],
	totalPaidAmount: { type: Number, required: true, default: 0 },
	paidAt: { type: Date },
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
  // Store URLs for design preview images
  mockupImages: { type: Schema.Types.Mixed },
	// Lead time snapshot + schedule
	leadTimeSnapshot: { type: Schema.Types.Mixed },
	expectedSchedule: { type: Schema.Types.Mixed },
	estimatedDeliveryWindow: { type: Schema.Types.Mixed },
	// Guest access fields
	guestEmail: { type: String, lowercase: true, index: true },
	guestVerifiedAt: { type: Date },
	claimedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
	accessRevokedAt: { type: Date },
}, { timestamps: true });

export const Order: Model<OrderDocument> = mongoose.models.Order || mongoose.model<OrderDocument>('Order', OrderSchema);

