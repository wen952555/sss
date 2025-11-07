export default {
  // 1. Añadir 'context' a los argumentos de la función
  async fetch(request, env, context) {
    try {
      const url = new URL(request.url);

      // Especialmente manejar la solicitud /favicon.ico, devolver 204 No Content
      if (url.pathname === '/favicon.ico') {
        return new Response(null, { status: 204 });
      }

      // Solo solicitudes de proxy que comiencen con /api/
      if (url.pathname.startsWith('/api/')) {
        // Nombre de dominio del backend
        const backendUrl = 'https://9525.ip-ddns.com'; 
        
        const newUrl = new URL(backendUrl + url.pathname + url.search);

        // Construir una nueva solicitud para enviar al backend
        const newRequest = new Request(newUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: 'follow',
        });
        
        // Añadir alguna información de cabecera personalizada, opcional
        newRequest.headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP'));

        try {
          const response = await fetch(newRequest);
          
          // Se necesita crear una nueva Response para modificar las cabeceras CORS
          const newHeaders = new Headers(response.headers);
          newHeaders.set('Access-Control-Allow-Origin', url.origin);
          newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });

        } catch (e) {
          console.error('Inner catch (API proxy) error:', e);
          return new Response(`Backend server error: ${e.message}`, { status: 502 });
        }
      }

      // 2. Para solicitudes que no son de /api/, usar context.next() para que Cloudflare Pages maneje los archivos estáticos
      return context.next(request);

    } catch (e) {
      // Este es un bloque catch global para capturar cualquier excepción no capturada
      console.error('Global catch (Worker top-level) error:', e);
      return new Response(`A critical error occurred in the Worker: ${e.message}`, { status: 500 });
    }
  },
};