import { supabase } from './supabase';

export async function getAccessToken(): Promise<string | undefined> {
	const { data } = await supabase.auth.getSession();
	return data.session?.access_token;
}

export function onAuthTokenChange(callback: (token: string | undefined) => void) {
	const { data: authListener } = supabase.auth.onAuthStateChange(async () => {
		const token = await getAccessToken();
		callback(token);
	});
	return () => authListener.subscription.unsubscribe();
}