import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string | undefined;

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
	? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
	: undefined;

export interface AuthUser {
	id: string;
	email?: string;
}

declare global {
	namespace Express {
		interface Request {
			user?: AuthUser;
		}
	}
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
	// Test bypass
	if (process.env.NODE_ENV === 'test') {
		req.user = { id: 'test-user' };
		return next();
	}

	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'Unauthorized' });
	}

	const token = authHeader.substring('Bearer '.length);
	if (!supabase) {
		return res.status(500).json({ error: 'Auth not configured' });
	}

	supabase.auth.getUser(token).then(({ data, error }) => {
		if (error || !data?.user) return res.status(401).json({ error: 'Unauthorized' });
		req.user = { id: data.user.id, email: data.user.email ?? undefined };
		next();
	}).catch(() => res.status(401).json({ error: 'Unauthorized' }));
}