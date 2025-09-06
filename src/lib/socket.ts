import { onAuthTokenChange, getAccessToken } from './authToken';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const io = require('socket.io-client');

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string;

let socket: any;
let currentToken: string | undefined;
let isConnected = false;

export async function connectSocket() {
	if (socket && isConnected) return socket;
	currentToken = await getAccessToken();
	socket = io(SOCKET_URL, { autoConnect: false, auth: { token: currentToken } });
	socket.on('connect', () => { isConnected = true; });
	socket.on('disconnect', () => { isConnected = false; });
	socket.connect();
	return socket;
}

export function disconnectSocket() {
	if (socket) socket.disconnect();
}

export async function subscribe(room: string, event: string, handler: (payload: any) => void) {
	await connectSocket();
	socket.emit('subscribe', { room });
	socket.on(event, handler);
	return () => socket.off(event, handler);
}

// Refresh token on auth changes
onAuthTokenChange(async (token) => {
	currentToken = token;
	if (socket) {
		socket.auth = { token };
		if (!isConnected) socket.connect();
	}
});