// frontend/src/socket.js
import { io } from 'socket.io-client';

// This file centralizes the socket connection logic so it can be shared across components.

// Dynamically determine the backend URL.
// In production, it connects via the _worker.js proxy by using a relative path.
// In development (if VITE_BACKEND_URL is set), it connects to the specified URL.
const URL = import.meta.env.VITE_BACKEND_URL || '';

export const socket = io(URL, {
  path: '/socket.io/',
  autoConnect: true,
});