// frontend/functions/proxy49/[[path]].js

const ORIGIN_HOST = '49916a.com';
const PROXY_PATH = '/proxy49';

/**
 * A class to handle rewriting HTML elements to keep them within the proxy.
 */
class AttributeRewriter {
  constructor(originHost, proxyPath) {
    this.originHost = originHost;
    this.proxyPath = proxyPath;
  }

  element(element) {
    const attributes = ['href', 'src', 'action', 'data-original']; // Added data-original for lazy loaded images
    for (const attr of attributes) {
      const value = element.getAttribute(attr);
      if (value) {
        // Ignore data URIs, javascript: links, mailto: links, etc.
        if (value.startsWith('data:') || value.startsWith('javascript:') || value.startsWith('#') || value.startsWith('mailto:')) {
            continue;
        }

        // Replace absolute URLs with proxied URLs
        const absoluteUrlPattern = new RegExp(`https?://${this.originHost}`, 'g');
        if (absoluteUrlPattern.test(value)) {
            element.setAttribute(attr, value.replace(absoluteUrlPattern, this.proxyPath));
        }
        // Handle root-relative paths by prepending the proxy path
        else if (value.startsWith('/')) {
            element.setAttribute(attr, `${this.proxyPath}${value}`);
        }
        // Handle path-relative URLs that should be treated as root-relative
        else {
            element.setAttribute(attr, `${this.proxyPath}/${value}`);
        }
      }
    }
  }
}

/**
 * Cloudflare Pages function for proxying requests under the `/proxy49/` path.
 * This will catch all requests to `/proxy49/*` and forward them to 49916a.com.
 */
export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);

  // Strip the proxy path prefix to get the path for the origin server
  if (requestUrl.pathname.startsWith(PROXY_PATH)) {
    requestUrl.pathname = requestUrl.pathname.substring(PROXY_PATH.length);
  }

  // Rewrite the URL to point to the destination origin
  requestUrl.hostname = ORIGIN_HOST;
  requestUrl.protocol = 'https:';

  // Create a new request object to send to the origin
  const newRequest = new Request(requestUrl.toString(), context.request);

  // Fetch the response from the origin
  const response = await fetch(newRequest);

  // If the response is not HTML, return it directly
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  // Otherwise, rewrite the HTML to fix links and asset paths
  const rewriter = new HTMLRewriter().on('*', new AttributeRewriter(ORIGIN_HOST, PROXY_PATH));

  return rewriter.transform(response);
}
