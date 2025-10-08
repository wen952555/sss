// frontend/src/socket.js
import { io } from 'socket.io-client';

// This file centralizes the socket connection logic so it can be shared across components.

// Use a relative path for the socket connection. This will ensure it works
// correctly in any environment, whether local development or production.
const URL = '';

export const socket = io(URL, {
  path: '/socket.io/',
  autoConnect: false, // We will connect manually when the user is authenticated.
});