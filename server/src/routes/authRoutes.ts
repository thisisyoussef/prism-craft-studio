import { Router, Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { requireAuth, requireAdmin } from '../middleware/auth';
import jwt from 'jsonwebtoken';

const authRouter = Router();

 
// Register new user
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { email, password, firstName, lastName, role, companyName, phone, address } = req.body;

		// Validate required fields
		if (!email || !password || !firstName || !lastName) {
			return res.status(400).json({ 
				error: 'Email, password, first name, and last name are required' 
			});
		}

		// Check if user already exists
		const existingUser = await User.findOne({ email: email.toLowerCase() });
		if (existingUser) {
			return res.status(409).json({ error: 'User with this email already exists' });
		}

		// Validate role (only admin can create admin users, or if no users exist yet)
		let userRole = 'customer';
		if (role === 'admin') {
			// Check if this is the first user (bootstrap admin) or request from authenticated admin
			const userCount = await User.countDocuments();
			const authHeader = req.headers.authorization;

			if (userCount === 0) {
				// First user can be admin (bootstrap)
				userRole = 'admin';
				console.log('🚀 Creating bootstrap admin user');
			} else {
				// Require a valid admin token
				if (!authHeader || !authHeader.startsWith('Bearer ')) {
					return res.status(403).json({ error: 'Admin token required to create admin users' });
				}
				try {
					const token = authHeader.substring('Bearer '.length);
					const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
					const decoded: any = jwt.verify(token, secret);
					const requester = await User.findById(decoded.id);
					if (!requester || requester.role !== 'admin' || !requester.isActive) {
						return res.status(403).json({ error: 'Only active admins can create admin users' });
					}
					userRole = 'admin';
				} catch (err) {
					console.error('❌ Admin validation failed:', err);
					return res.status(403).json({ error: 'Invalid or expired admin token' });
				}
			}
		}

		// Create new user
		const user = new User({
			email: email.toLowerCase(),
			password,
			firstName,
			lastName,
			role: userRole,
			companyName,
			phone,
			address
		});

		await user.save();

		// Generate token
		const token = user.generateAuthToken();

		console.log(`✅ New user registered: ${user.email} (${user.role})`);

		res.status(201).json({
			message: 'User registered successfully',
			user: user.toJSON(),
			token
		});
	} catch (error) {
		console.error('❌ Registration error:', error);
		next(error);
	}
});

 
// Login user
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { email, password } = req.body;

		if (!email || !password) {
			return res.status(400).json({ error: 'Email and password are required' });
		}

		// Find user by email
		const user = await User.findOne({ email: email.toLowerCase() });
		if (!user) {
			return res.status(401).json({ error: 'Invalid email or password' });
		}

		// Check if user is active
		if (!user.isActive) {
			return res.status(401).json({ error: 'Account is deactivated' });
		}

		// Verify password
		const isMatch = await user.comparePassword(password);
		if (!isMatch) {
			return res.status(401).json({ error: 'Invalid email or password' });
		}

		// Update last login
		user.lastLogin = new Date();
		await user.save();

		// Generate token
		const token = user.generateAuthToken();

		console.log(`🔐 User logged in: ${user.email} (${user.role})`);

		res.json({
			message: 'Login successful',
			user: user.toJSON(),
			token
		});
	} catch (error) {
		console.error('❌ Login error:', error);
		next(error);
	}
});

 
// Get current user profile
authRouter.get('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const user = await User.findById(req.user!.id).select('-password');
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		res.json({
			user: user.toJSON()
		});
	} catch (error) {
		console.error('❌ Profile fetch error:', error);
		next(error);
	}
});

 
// Update user profile
authRouter.put('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { firstName, lastName, companyName, phone, address } = req.body;
		
		const user = await User.findById(req.user!.id);
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Update allowed fields
		if (firstName) user.firstName = firstName;
		if (lastName) user.lastName = lastName;
		if (companyName !== undefined) user.companyName = companyName;
		if (phone !== undefined) user.phone = phone;
		if (address) user.address = { ...user.address, ...address };

		await user.save();

		console.log(`📝 Profile updated: ${user.email}`);

		res.json({
			message: 'Profile updated successfully',
			user: user.toJSON()
		});
	} catch (error) {
		console.error('❌ Profile update error:', error);
		next(error);
	}
});

 
// Change password
authRouter.put('/password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { currentPassword, newPassword } = req.body;

		if (!currentPassword || !newPassword) {
			return res.status(400).json({ error: 'Current password and new password are required' });
		}

		if (newPassword.length < 6) {
			return res.status(400).json({ error: 'New password must be at least 6 characters long' });
		}

		const user = await User.findById(req.user!.id);
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Verify current password
		const isMatch = await user.comparePassword(currentPassword);
		if (!isMatch) {
			return res.status(401).json({ error: 'Current password is incorrect' });
		}

		// Update password
		user.password = newPassword;
		await user.save();

		console.log(`🔒 Password changed: ${user.email}`);

		res.json({ message: 'Password changed successfully' });
	} catch (error) {
		console.error('❌ Password change error:', error);
		next(error);
	}
});

 
// Admin: List all users
authRouter.get('/users', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { page = 1, limit = 20, role, search } = req.query;
		const skip = (Number(page) - 1) * Number(limit);

		// Build query
		const query: any = {};
		if (role && (role === 'admin' || role === 'customer')) {
			query.role = role;
		}
		if (search) {
			query.$or = [
				{ email: { $regex: search, $options: 'i' } },
				{ firstName: { $regex: search, $options: 'i' } },
				{ lastName: { $regex: search, $options: 'i' } },
				{ companyName: { $regex: search, $options: 'i' } }
			];
		}

		const [users, total] = await Promise.all([
			User.find(query)
				.select('-password')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(Number(limit)),
			User.countDocuments(query)
		]);

		res.json({
			users: users.map(user => user.toJSON()),
			pagination: {
				page: Number(page),
				limit: Number(limit),
				total,
				pages: Math.ceil(total / Number(limit))
			}
		});
	} catch (error) {
		console.error('❌ Users list error:', error);
		next(error);
	}
});

 
// Admin: Create admin user
authRouter.post('/admin', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { email, password, firstName, lastName } = req.body;

		if (!email || !password || !firstName || !lastName) {
			return res.status(400).json({ 
				error: 'Email, password, first name, and last name are required' 
			});
		}

		// Check if user already exists
		const existingUser = await User.findOne({ email: email.toLowerCase() });
		if (existingUser) {
			return res.status(409).json({ error: 'User with this email already exists' });
		}

		const user = new User({
			email: email.toLowerCase(),
			password,
			firstName,
			lastName,
			role: 'admin'
		});

		await user.save();

		console.log(`👑 Admin user created: ${user.email} by ${req.user!.email}`);

		res.status(201).json({
			message: 'Admin user created successfully',
			user: user.toJSON()
		});
	} catch (error) {
		console.error('❌ Admin creation error:', error);
		next(error);
	}
});

 
// Admin: Toggle user active status
authRouter.put('/users/:userId/toggle-status', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { userId } = req.params;

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Don't allow deactivating self
		if ((user._id as any).toString() === req.user!.id) {
			return res.status(400).json({ error: 'Cannot deactivate your own account' });
		}

		user.isActive = !user.isActive;
		await user.save();

		console.log(`🔄 User status toggled: ${user.email} -> ${user.isActive ? 'active' : 'inactive'} by ${req.user!.email}`);

		res.json({
			message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
			user: user.toJSON()
		});
	} catch (error) {
		console.error('❌ User status toggle error:', error);
		next(error);
	}
});

export default authRouter;
