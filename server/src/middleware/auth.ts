import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserDocument } from '../models/User';

export interface AuthUser {
	id: string;
	email: string;
	role: 'admin' | 'customer';
	firstName: string;
	lastName: string;
}

// guest middleware defined below

declare global {
	namespace Express {
		interface Request {
			user?: AuthUser;
			guest?: { email: string; orderIds?: string[] };
		}
	}
}

// Guest access middleware: verifies a guest token and populates req.guest
export function requireGuestAccess(req: Request, res: Response, next: NextFunction) {
  try {
    // Prefer dedicated header to avoid collision with user auth
    const guestHeader = (req.headers['x-guest-auth'] as string | undefined) || undefined;
    let token = guestHeader;
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) token = authHeader.substring('Bearer '.length);
    }
    if (!token) {
      return res.status(401).json({ error: 'Guest access token required' });
    }

    const secret = process.env.JWT_GUEST_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const decoded = jwt.verify(token, secret) as any;
    if (!decoded || (!decoded.guest && decoded.typ !== 'guest')) {
      return res.status(401).json({ error: 'Invalid guest token' });
    }
    if (!decoded.email) {
      return res.status(401).json({ error: 'Invalid guest token (no email)' });
    }
    (req as any).guest = { email: String(decoded.email).toLowerCase(), orderIds: Array.isArray(decoded.orderIds) ? decoded.orderIds : undefined };
    next();
  } catch (error) {
    console.error('❌ Guest auth error:', error);
    return res.status(401).json({ error: 'Invalid or expired guest token' });
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const authHeader = req.headers.authorization;
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ error: 'Access token required' });
		}

		const token = authHeader.substring('Bearer '.length);
		const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
		
		const decoded = jwt.verify(token, secret) as any;
		
		// Fetch user from database to ensure they still exist and are active
		const user = await User.findById(decoded.id).select('-password');
		if (!user || !user.isActive) {
			return res.status(401).json({ error: 'Invalid or expired token' });
		}

		// Update last login
		user.lastLogin = new Date();
		await user.save();

		req.user = {
			id: (user._id as any).toString(),
			email: user.email,
			role: user.role,
			firstName: user.firstName,
			lastName: user.lastName
		};

		console.log(`🔐 User authenticated: ${user.email} (${user.role})`);
		next();
	} catch (error) {
		console.error('❌ Auth error:', error);
		return res.status(401).json({ error: 'Invalid token' });
	}
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
	if (!req.user) {
		return res.status(401).json({ error: 'Authentication required' });
	}
	
	if (req.user.role !== 'admin') {
		return res.status(403).json({ error: 'Admin access required' });
	}
	
	console.log(`👑 Admin access granted: ${req.user.email}`);
	next();
}

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
	if (!req.user) {
		return res.status(401).json({ error: 'Authentication required' });
	}
	
	if (req.user.role !== 'customer') {
		return res.status(403).json({ error: 'Customer access required' });
	}
	
	console.log(`👤 Customer access granted: ${req.user.email}`);
	next();
}

// Optional auth - doesn't fail if no token, but populates user if valid token
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
	try {
		const authHeader = req.headers.authorization;
		
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return next(); // Continue without user
		}

		const token = authHeader.substring('Bearer '.length);
		const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
		
		const decoded = jwt.verify(token, secret) as any;
		const user = await User.findById(decoded.id).select('-password');
		
		if (user && user.isActive) {
			req.user = {
				id: (user._id as any).toString(),
				email: user.email,
				role: user.role,
				firstName: user.firstName,
				lastName: user.lastName
			};
		}
		
		next();
	} catch (error) {
		// Invalid token, but continue without user
		next();
	}
}