// frontend/functions/proxy/[[path]].js

/**
 * Cloudflare Pages function for proxying requests under the `/proxy/` path.
 * This will catch all requests to `/proxy/*` and forward them to the destination URL.
 */
export async function onRequest(context) {
  // Get the incoming request URL
  const url = new URL(context.request.url);

  // Strip the `/proxy` prefix from the pathname
  if (url.pathname.startsWith('/proxy')) {
    url.pathname = url.pathname.substring('/proxy'.length);
  }

  // Define the destination host and protocol.
  // NOTE: SSL certificate is only valid for the non-www domain.
  const destinationHostname = '49916a.com';
  const destinationProtocol = 'https:';

  // Rewrite the URL to point to the destination.
  url.hostname = destinationHostname;
  url.protocol = destinationProtocol;
  // url.port is intentionally not set to use the protocol's default (443 for https).

  // Create a new request object with the rewritten URL, but preserve the original
  // method, headers, and body from the incoming request.
  const newRequest = new Request(url.toString(), context.request);

  // Fetch the response from the destination and return it to the user.
  // The response (including headers and body) from the destination will be streamed back.
  return fetch(newRequest);
}
