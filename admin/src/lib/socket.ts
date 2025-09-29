import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io('/', { withCredentials: false, transports: ['websocket'] });
  }
  return socket;
}

export function joinOrderRoom(orderId: string) {
  const s = getSocket();
  s.emit('subscribe', { room: `order:${orderId}` });
}
