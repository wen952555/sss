// frontend/functions/proxymacau/[[path]].js

/**
 * Cloudflare Pages function for proxying requests under the `/proxymacau/` path.
 * This will catch all requests to `/proxymacau/*` and forward them to macaujc.com.
 */
export async function onRequest(context) {
  // Get the incoming request URL
  const url = new URL(context.request.url);

  // Strip the `/proxymacau` prefix from the pathname
  if (url.pathname.startsWith('/proxymacau')) {
    url.pathname = url.pathname.substring('/proxymacau'.length);
  }

  // Define the destination host and protocol.
  const destinationHostname = 'macaujc.com';
  const destinationProtocol = 'https:';

  // Rewrite the URL to point to the destination.
  url.hostname = destinationHostname;
  url.protocol = destinationProtocol;

  // Create a new request object with the rewritten URL.
  const newRequest = new Request(url.toString(), context.request);

  // Fetch and return the response from the destination.
  return fetch(newRequest);
}
