// frontend/src/socket.js
import { io } from 'socket.io-client';

// This file centralizes the socket connection logic so it can be shared across components.

// This will connect to the backend via the _worker.js proxy by default.
// If VITE_BACKEND_URL is set in a .env file for local development, it will use that instead.
const URL = import.meta.env.VITE_BACKEND_URL || '';

export const socket = io(URL, {
  path: '/socket.io/',
  autoConnect: false, // We will connect manually when the user is authenticated.
});