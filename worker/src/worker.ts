interface Env {
  BACKEND_URL: string;
  CORS_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = new Headers({
      'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const incoming = new URL(request.url);
    const path = incoming.pathname.replace(/^\/api(?=\/|$)/, '');
    const allowed = request.method === 'GET'
      ? /^\/(health|preview|status\/[a-f0-9-]{36}|download\/[a-f0-9-]{36})$/i.test(path)
      : request.method === 'POST' && path === '/download';
    if (!allowed) return Response.json({ error: 'Rota não encontrada.' }, { status: 404, headers });
    if (!env.BACKEND_URL) return Response.json({ error: 'Servidor de processamento não configurado.' }, { status: 503, headers });
    try {
      const target = new URL(env.BACKEND_URL.replace(/\/$/, '') + path);
      target.search = incoming.search;
      const upstream = await fetch(target.toString(), {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        body: request.method === 'POST' ? await request.text() : undefined,
        redirect: 'manual',
      });
      for (const name of ['content-type', 'content-disposition', 'content-length', 'retry-after']) {
        const value = upstream.headers.get(name);
        if (value) headers.set(name, value);
      }
      return new Response(upstream.body, { status: upstream.status, headers });
    } catch {
      return Response.json({ error: 'Servidor de processamento indisponível.' }, { status: 502, headers });
    }
  },
};
