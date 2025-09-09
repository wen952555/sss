// This is a Cloudflare Worker script that intercepts requests.
// It's used here to proxy API requests to the backend.

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // If the request is for our API, proxy it to the backend.
    if (url.pathname.startsWith('/api/')) {
      // We are assuming the backend is on the same origin.
      // In a real setup, you might need to change the origin.
      const backendUrl = new URL(url.pathname, url.origin);

      // Create a new request to the backend, copying the original request's properties.
      const backendRequest = new Request(backendUrl, request);

      // Fetch the response from the backend.
      const response = await fetch(backendRequest);

      // Return the backend's response.
      return response;
    }

    // For all other requests, let the Pages asset server handle it.
    // This will serve the static files of the React application.
    return env.ASSETS.fetch(request);
  },
};
