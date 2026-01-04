export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname.startsWith('/api/')) {
            // 重写URL以指向后端API
            const newUrl = new URL(request.url.replace(url.origin, 'https://your-backend-api.com'));
            return fetch(new Request(newUrl, request));
        }
        // 否则，提供静态文件
        return env.ASSETS.fetch(request);
    }
};