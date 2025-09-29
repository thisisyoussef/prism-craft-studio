import mongoose, { Schema, Document, Model } from 'mongoose';

export interface GuestMagicLinkDocument extends Document {
  email: string;
  tokenHash: string;
  orderIds?: string[];
  intent: 'auth' | 'order_access';
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
  createdByIp?: string;
}

const GuestMagicLinkSchema = new Schema<GuestMagicLinkDocument>({
  email: { type: String, required: true, lowercase: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  orderIds: [{ type: String }],
  intent: { type: String, enum: ['auth', 'order_access'], default: 'order_access' },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  usedAt: { type: Date },
  createdByIp: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const GuestMagicLink: Model<GuestMagicLinkDocument> = mongoose.models.GuestMagicLink || mongoose.model<GuestMagicLinkDocument>('GuestMagicLink', GuestMagicLinkSchema);
