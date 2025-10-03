// frontend/public/_worker.js

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- CRITICAL CONFIGURATION ---
    // The public-facing domain of your backend server.
    const backendDomain = "https://9525.ip-ddns.com";

    // Check if the request is for the API or Socket.IO
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {

      // Create the new URL to proxy to the backend
      const newUrl = new URL(backendDomain + url.pathname + url.search);

      // Create a new request object with the new URL
      const newRequest = new Request(newUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: request.redirect,
      });

      // Forward the request to the backend and return the response
      console.log(`[Worker] Forwarding request from ${url.pathname} to ${newUrl}`);
      return fetch(newRequest);
    }

    // For all other requests, serve the static assets from the Pages build
    console.log(`[Worker] Serving static asset: ${url.pathname}`);
    return env.ASSETS.fetch(request);
  },
};