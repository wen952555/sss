/* frontend/public/_worker.js */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api')) {
      const backendUrl = "https://wen76674.serv00.net" + url.pathname + url.search;
      const init = {
        method: request.method,
        headers: request.headers,
        body: request.method === 'GET' ? undefined : await request.text()
      };
      const response = await fetch(backendUrl, init);
      const newResponse = new Response(response.body, response);
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
      return newResponse;
    }
    return env.ASSETS.fetch(request);
  }
};
