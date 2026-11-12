import { io } from 'socket.io-client';
import { TOKEN_KEY } from './apiClient.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function connectSocket() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  if (socket && socket.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default { connectSocket, getSocket, disconnectSocket };
