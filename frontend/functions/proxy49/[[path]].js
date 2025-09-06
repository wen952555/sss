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
    const attributes = ['href', 'src', 'action', 'data-original'];
    for (const attr of attributes) {
      const value = element.getAttribute(attr);
      if (value) {
        if (value.startsWith('data:') || value.startsWith('javascript:') || value.startsWith('#') || value.startsWith('mailto:')) {
            continue;
        }
        const absoluteUrlPattern = new RegExp(`https?://${this.originHost}`, 'g');
        if (absoluteUrlPattern.test(value)) {
            element.setAttribute(attr, value.replace(absoluteUrlPattern, this.proxyPath));
        } else if (value.startsWith('/')) {
            element.setAttribute(attr, `${this.proxyPath}${value}`);
        } else {
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

  if (requestUrl.pathname.startsWith(PROXY_PATH)) {
    requestUrl.pathname = requestUrl.pathname.substring(PROXY_PATH.length);
  }

  requestUrl.hostname = ORIGIN_HOST;
  requestUrl.protocol = 'https:';

  const newRequest = new Request(requestUrl.toString(), context.request);
  const response = await fetch(newRequest);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  const rewriter = new HTMLRewriter().on('*', new AttributeRewriter(ORIGIN_HOST, PROXY_PATH));

  return rewriter.transform(response);
}
