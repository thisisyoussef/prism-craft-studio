import { Server as IOServer } from 'socket.io';

let io: IOServer | undefined;

export function attachIo(server: any) {
	io = new IOServer(server, { cors: { origin: '*' } });
	io.on('connection', (socket) => {
		socket.on('subscribe', ({ room }) => socket.join(room));
	});
}

export function emitToRoom(room: string, event: string, payload: any) {
	if (!io) return;
	io.to(room).emit(event, payload);
}

