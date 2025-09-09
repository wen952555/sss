// This is a Cloudflare Pages function that acts as a proxy.
// It forwards any request from /proxymacau/* to a target API.

// The target URL should be replaced with the actual API endpoint.
const TARGET_URL = 'https://placeholder.macau.api/';

export async function onRequest(context) {
  const { request, params } = context;

  // The 'path' parameter is a catch-all for the path segments.
  // We join them to form the full path.
  const path = params.path.join('/');

  // Construct the new URL to proxy to.
  const url = new URL(path, TARGET_URL);

  // Create a new request with the same method, headers, and body.
  const newRequest = new Request(url, request);

  // Fetch the response from the target API.
  const response = await fetch(newRequest);

  // Return the response to the client.
  return response;
}
