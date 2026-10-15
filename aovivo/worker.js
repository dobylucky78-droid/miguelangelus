// MiguelAngelus — "Acompanhar pela internet" (Cloudflare Worker + Durable Object).
// O programa publica o slide que está no telão; quem tem o código do dia acompanha pela página aovivo.html
// (celular, tablet, TV). Só o texto do slide passa por aqui; nada de quem assiste é guardado.
//
//   POST /publicar     Authorization: Bearer <SEGREDO>   {codigo, estado}   → {ok, pessoas}
//   (com "aberto": true no corpo, o código é dispensado: /ao-vivo e /estado sem ?c= também valem)
//   GET  /ao-vivo?c=   WebSocket: recebe o estado na hora (e o último, ao entrar)
//   GET  /estado?c=    o último estado em JSON (para quem não consegue WebSocket)
//
// O SEGREDO fica nas variáveis do Worker (Configurações → Variáveis → Secret "SEGREDO") e nos Ajustes do programa.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS } });
const limpaCodigo = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    if (url.pathname === '/') return json({ ok: true, servico: 'MiguelAngelus ao vivo' });
    // uma sala só (a da paróquia); o código do dia separa as celebrações
    const sala = env.SALA.get(env.SALA.idFromName('paroquia'));
    if (['/publicar', '/ao-vivo', '/estado'].includes(url.pathname)) return sala.fetch(req);
    return json({ ok: false, erro: 'caminho' }, 404);
  },
};

export class Sala {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.ultimo = null; }

  async carregar() {
    if (!this.ultimo) this.ultimo = (await this.ctx.storage.get('ultimo')) || { codigo: '', estado: null, em: 0 };
    return this.ultimo;
  }

  async fetch(req) {
    const url = new URL(req.url);
    const u = await this.carregar();

    if (url.pathname === '/publicar') {
      if (req.method !== 'POST') return json({ ok: false }, 405);
      const chave = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      if (!this.env.SEGREDO || chave !== this.env.SEGREDO) return json({ ok: false, erro: 'chave' }, 401);
      let corpo;
      try { corpo = await req.json(); } catch { return json({ ok: false, erro: 'json' }, 400); }
      const codigo = limpaCodigo(corpo.codigo);
      if (!codigo) return json({ ok: false, erro: 'codigo' }, 400);
      const texto = JSON.stringify(corpo.estado || null);
      if (texto.length > 60000) return json({ ok: false, erro: 'grande' }, 413);
      // código novo (outro dia): quem estava com o código antigo é desligado
      if (u.codigo && u.codigo !== codigo) for (const ws of this.ctx.getWebSockets(u.codigo)) { try { ws.close(4004, 'codigo'); } catch {} }
      // aberto ("sem código" no programa): quem abrir a página sem código também acompanha
      this.ultimo = { codigo, aberto: !!corpo.aberto, estado: corpo.estado || null, em: Date.now() };
      await this.ctx.storage.put('ultimo', this.ultimo);
      const msg = JSON.stringify({ tipo: 'estado', estado: this.ultimo.estado, em: this.ultimo.em });
      const lista = this.ctx.getWebSockets(codigo);
      for (const ws of lista) { try { ws.send(msg); } catch {} }
      return json({ ok: true, pessoas: lista.length });
    }

    const pedido = limpaCodigo(url.searchParams.get('c'));
    const valido = !!u.codigo && (u.aberto || pedido === u.codigo);
    const codigo = valido ? u.codigo : pedido;

    if (url.pathname === '/estado') {
      if (!valido) return json({ ok: false, erro: 'codigo' }, 404);
      return json({ ok: true, estado: u.estado, em: u.em });
    }

    if (url.pathname === '/ao-vivo') {
      if (req.headers.get('Upgrade') !== 'websocket') return json({ ok: false, erro: 'websocket' }, 426);
      const [cliente, servidor] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(servidor, [codigo || '-']);
      if (!valido) { servidor.send(JSON.stringify({ tipo: 'erro', erro: 'codigo' })); servidor.close(4004, 'codigo'); }
      else servidor.send(JSON.stringify({ tipo: 'estado', estado: u.estado, em: u.em }));
      return new Response(null, { status: 101, webSocket: cliente });
    }
    return json({ ok: false }, 404);
  }

  // quem assiste não manda nada (só "ping" para manter a conexão)
  async webSocketMessage(ws, msg) { if (msg === 'ping') { try { ws.send('pong'); } catch {} } }
  async webSocketClose(ws, code) { try { ws.close(code, 'tchau'); } catch {} }
  async webSocketError(ws) { try { ws.close(1011, 'erro'); } catch {} }
}
