export default {
  async fetch(request, env) {
    const url = new URL(request);
    if (url.pathname.startsWith('/api/')) {
      const backendUrl = 'https://wen76674.serv00.net' + url.pathname.replace('/api/', '/') + url.search;
      const newRequest = new Request(backendUrl, request);
      return fetch(newRequest);
    }
    return env.ASSETS.fetch(request);
  }
}
