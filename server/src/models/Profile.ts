import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ProfileDocument extends Document {
	userId: string; // using Supabase user id string
	companyId?: Types.ObjectId;
	firstName?: string;
	lastName?: string;
	role?: string;
	phone?: string;
	createdAt: Date;
	updatedAt: Date;
}

const ProfileSchema = new Schema<ProfileDocument>({
	userId: { type: String, required: true, unique: true },
	companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
	firstName: { type: String },
	lastName: { type: String },
	role: { type: String, default: 'member' },
	phone: { type: String },
}, { timestamps: true });

export const Profile: Model<ProfileDocument> = mongoose.models.Profile || mongoose.model<ProfileDocument>('Profile', ProfileSchema);

