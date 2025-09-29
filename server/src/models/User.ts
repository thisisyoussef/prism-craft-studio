import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface UserDocument extends Document {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	role: 'admin' | 'customer';
	companyName?: string;
	phone?: string;
	address?: {
		street?: string;
		city?: string;
		state?: string;
		zipCode?: string;
		country?: string;
	};
	isActive: boolean;
	lastLogin?: Date;
	createdAt: Date;
	updatedAt: Date;
	
	// Methods
	comparePassword(candidatePassword: string): Promise<boolean>;
	generateAuthToken(): string;
	toJSON(): any;
}

const UserSchema = new Schema<UserDocument>({
	email: { 
		type: String, 
		required: true, 
		unique: true, 
		lowercase: true,
		trim: true
	},
	password: { 
		type: String, 
		required: true, 
		minlength: 6 
	},
	firstName: { 
		type: String, 
		required: true,
		trim: true
	},
	lastName: { 
		type: String, 
		required: true,
		trim: true
	},
	role: { 
		type: String, 
		enum: ['admin', 'customer'], 
		default: 'customer' 
	},
	companyName: { 
		type: String,
		trim: true
	},
	phone: { 
		type: String,
		trim: true
	},
	address: {
		street: { type: String, trim: true },
		city: { type: String, trim: true },
		state: { type: String, trim: true },
		zipCode: { type: String, trim: true },
		country: { type: String, trim: true, default: 'US' }
	},
	isActive: { 
		type: Boolean, 
		default: true 
	},
	lastLogin: { 
		type: Date 
	}
}, { 
	timestamps: true,
	toJSON: { virtuals: true }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
	const user = this as UserDocument;
	
	if (!user.isModified('password')) return next();
	
	try {
		const salt = await bcrypt.genSalt(12);
		user.password = await bcrypt.hash(user.password, salt);
		next();
	} catch (error) {
		next(error as Error);
	}
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
	return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
UserSchema.methods.generateAuthToken = function(): string {
	const user = this as UserDocument;
	const payload = {
		id: user._id,
		email: user.email,
		role: user.role,
		firstName: user.firstName,
		lastName: user.lastName
	};
	
	const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
	return jwt.sign(payload, secret, { expiresIn: '7d' });
};

// Override toJSON to exclude password
UserSchema.methods.toJSON = function() {
	const user = this.toObject();
	delete user.password;
	return user;
};

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
	return `${this.firstName} ${this.lastName}`;
});

// Index for performance
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });

export const User: Model<UserDocument> = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);
