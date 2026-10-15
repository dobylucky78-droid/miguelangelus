'use strict';
/*
 * 🌐 Acompanhar pela internet (Ajustes → Transmissão): o slide que está no telão vai, só como texto, para um serviço na
 * nuvem (Cloudflare Worker, pasta aovivo\ do projeto) e quem tem o código do dia acompanha em
 * pascom-sjo.github.io/aovivo.html — celular (4G), tablet ou TV. Sem imagens, sem dados de quem assiste.
 * A chave secreta só existe neste computador e no serviço; o código muda todo dia (ou no botão "Trocar código").
 * Usa S, Avisos, categoriaAoVivo, configTelao, qrcode, enviar, toast, salvarConfig, $, $$, esc (em tempo de execução).
 */
const AoVivo = { ultimo: '', timer: 0, pessoas: null, erro: '', enviando: false, pendente: false, qrNoTelao: false };
const PAGINA_AOVIVO = 'https://pascom-sjo.github.io/aovivo.html';
const SERVICO_AOVIVO = 'https://miguelangelus-aovivo.pascom-sjo.workers.dev';   // o serviço da paróquia (pasta aovivo\ do projeto)
const cfgAV = () => (S.config.aovivo = S.config.aovivo || { ligado: false, servico: '', segredo: '', cantos: true, respostas: true, leituras: true, avisos: true });

// código do dia: 5 letras/números fáceis de ler (sem O/0, I/1)
const LETRAS_AV = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// "Sem código" (link aberto): o serviço aceita quem abrir só o link; o código fica fixo e ninguém precisa digitar
const CODIGO_ABERTO = 'ABERTO';
function codigoAoVivo(trocar = false) {
  if (cfgAV().semCodigo) return CODIGO_ABERTO;
  const hoje = isoData(new Date());
  let c = S.config.aovivoCodigo;
  if (trocar || !c || c.dia !== hoje) {
    const n = crypto.getRandomValues(new Uint8Array(5));
    c = S.config.aovivoCodigo = { dia: hoje, codigo: [...n].map(x => LETRAS_AV[x % LETRAS_AV.length]).join('') };
    salvarConfig();
  }
  return c.codigo;
}
const servicoAV = () => (cfgAV().servico || SERVICO_AOVIVO).trim().replace(/\/+$/, '');
function linkAoVivo() {
  const p = new URLSearchParams();
  if (!cfgAV().semCodigo) p.set('c', codigoAoVivo());
  if (servicoAV() !== SERVICO_AOVIVO) p.set('s', servicoAV());      // outro serviço (testes): a página precisa saber
  const q = p.toString();
  return PAGINA_AOVIVO + (q ? '?' + q : '');
}

// O que está no telão, como a página "ao vivo" mostra (mesmas regras da faixa do OBS, com as escolhas daqui)
function estadoAoVivo(fim = false) {
  const c = cfgAV(), t = configTelao();
  const tema = { fundo: t.corFundo || '#000000', texto: t.corTexto || '#ffffff', rotulo: t.corRotulo || '#ffd166', fonte: t.fonte || '',
    maiusculas: !!t.maiusculas, negrito: !!t.negrito, mostrarRotulos: t.mostrarRotulos !== false };
  const base = { v: 1, celebracao: S.roteiro?.nome || '', tema, fim };
  if (fim || S.live?.preto || S.mudo) return { ...base, slide: null };
  if (Avisos.atual && c.avisos) return { ...base, slide: { texto: tirarMarcas(Avisos.atual.texto || ''), refrao: true } };
  const s = S.live?.slide;
  if (!s || (s.img && (s.layout === 'so' || !s.texto))) return { ...base, slide: null };
  const cat = categoriaAoVivo(), campo = { cantos: 'cantos', respostas: 'respostas', leituras: 'leituras', avisos: 'avisos' }[cat];
  if (!s.secao && (!campo || !c[campo])) return { ...base, slide: null };
  if (s.avisos) return { ...base, slide: { texto: [s.avisos.titulo, ...s.avisos.itens].join('\n'), rodape: '' } };
  return { ...base, slide: { texto: s.texto || '', versos: s.versos ? s.versos.map(v => ({ n: v.n, t: v.t })) : null, refrao: !!s.refrao,
    numerado: !!s.numerado, rodape: s.rodape || '' } };
}

// chamada sempre que algo vai para o telão; junta chamadas seguidas e só manda quando muda
function atualizarAoVivo(forcar = false, fim = false) {
  const c = cfgAV();
  if ((!c.ligado && !fim) || !servicoAV() || !c.segredo) return;
  clearTimeout(AoVivo.timer);
  AoVivo.timer = setTimeout(() => publicarAoVivo(estadoAoVivo(fim), forcar), 150);
}
async function publicarAoVivo(estado, forcar) {
  const corpo = JSON.stringify({ codigo: codigoAoVivo(), aberto: !!cfgAV().semCodigo, estado });
  if (!forcar && corpo === AoVivo.ultimo) return;
  if (AoVivo.enviando) { AoVivo.pendente = { estado, forcar }; return; }   // um envio por vez; o mais novo (até o "fim") vai em seguida
  AoVivo.enviando = true; AoVivo.ultimo = corpo;
  try {
    const r = await fetch(servicoAV() + '/publicar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfgAV().segredo }, body: corpo });
    const d = await r.json().catch(() => ({}));
    AoVivo.erro = r.ok ? '' : r.status === 401 ? 'a chave não confere com a do serviço' : 'o serviço respondeu ' + r.status;
    if (r.ok) AoVivo.pessoas = d.pessoas ?? 0;
  } catch (_) { AoVivo.erro = 'sem conexão com o serviço (internet?)'; AoVivo.ultimo = ''; }
  AoVivo.enviando = false;
  renderAoVivoStatus(); renderSeloAoVivo();
  if (AoVivo.pendente) { const p = AoVivo.pendente; AoVivo.pendente = false; publicarAoVivo(p.estado, p.forcar); }
}

// ---------- QR code no telão (cartão no canto, por cima de tudo) ----------
function qrAoVivoImagem() { const q = qrcode(0, 'M'); q.addData(linkAoVivo()); q.make(); return q.createDataURL(8, 2); }
const msgQrAoVivo = () => ({ tipo: 'qrAoVivo', on: AoVivo.qrNoTelao && cfgAV().ligado, qr: AoVivo.qrNoTelao ? qrAoVivoImagem() : '',
  codigo: cfgAV().semCodigo ? '' : codigoAoVivo(), link: PAGINA_AOVIVO.replace(/^https:\/\//, '') });
function enviarQrAoVivo() { enviar(msgQrAoVivo()); }
function alternarQrAoVivo(on = !AoVivo.qrNoTelao) {
  if (on && !cfgAV().ligado) { toast('Ligue antes o "Acompanhar pela internet" (Ajustes → Transmissão).'); abrirAjustes('ndi'); return; }
  AoVivo.qrNoTelao = on; enviarQrAoVivo(); renderAoVivo();
  if (typeof agendarEstadoCelular === 'function') agendarEstadoCelular();
}

// ---------- no painel: selo "🌐 N" no topo e botão "📱 QR" junto do Pix ----------
function renderSeloAoVivo() {
  const c = cfgAV(), el = $('#estadoAoVivo'), bt = $('#btnQrAoVivo');
  if (el) {
    el.hidden = !c.ligado;
    el.classList.toggle('conectado', c.ligado && !AoVivo.erro && AoVivo.pessoas != null);
    el.textContent = AoVivo.erro ? '🌐 ⚠' : '🌐 ' + (AoVivo.pessoas ?? '…');
    el.title = AoVivo.erro ? 'Acompanhar pela internet: ' + AoVivo.erro : `Acompanhar pela internet — ${AoVivo.pessoas ?? 0} pessoa(s) agora. Clique para os ajustes.`;
  }
  if (bt) { bt.hidden = !c.ligado; bt.classList.toggle('ligado', AoVivo.qrNoTelao); }
}

// ---------- Ajustes ----------
function renderAoVivoStatus() {
  const el = $('#avStatus'), c = cfgAV();
  if (!el) return;
  el.className = 'status ' + (AoVivo.erro ? 'erro' : c.ligado ? 'ok' : '');
  el.textContent = !c.ligado ? 'Desligado.' : !servicoAV() || !c.segredo ? 'Falta o endereço do serviço ou a chave.' :
    AoVivo.erro ? '⚠ ' + AoVivo.erro : AoVivo.pessoas == null ? '● Ligado — esperando o primeiro slide.' : `● Ao vivo — ${AoVivo.pessoas} pessoa(s) acompanhando agora.`;
}
function renderAoVivo() {
  const el = $('#aoVivoPainel');
  if (!el) return;
  const c = cfgAV(), cod = codigoAoVivo(), pronto = servicoAV() && c.segredo;
  el.innerHTML = `
    <label class="check"><input type="checkbox" data-av="ligado" ${c.ligado ? 'checked' : ''} ${pronto ? '' : 'disabled'}> Mandar os slides para quem acompanha pela internet</label>
    <div id="avStatus" class="status"></div>
    <div class="av-grade">
      <div class="av-qr">${pronto ? qrSvg(linkAoVivo()) : '<span class="sutil pequeno">O QR code aparece depois de configurar o serviço.</span>'}</div>
      <div>
        <label class="check"><input type="checkbox" data-av="semCodigo" ${c.semCodigo ? 'checked' : ''}> Sem código (link aberto)</label>
        ${c.semCodigo ? `<p class="sutil pequeno">Quem abrir <b>pascom-sjo.github.io/aovivo.html</b> (ou ler o QR code) já acompanha, sem digitar nada.</p>`
        : `<div class="campo">Código de hoje <span class="av-cod">${esc(cod)}</span> <button type="button" data-av-acao="trocar" title="Gera outro código (quem estava acompanhando precisa ler o QR de novo)">↻ Trocar</button></div>
        <p class="sutil pequeno">Muda sozinho todo dia. Quem acompanha lê o QR code ou abre <b>pascom-sjo.github.io/aovivo.html</b> e digita o código.</p>`}
        <div class="linha" style="flex-wrap:wrap;gap:6px">
          <button type="button" data-av-acao="qr" ${pronto && c.ligado ? '' : 'disabled'} class="${AoVivo.qrNoTelao ? 'ligado' : ''}">📺 ${AoVivo.qrNoTelao ? 'Tirar o QR do telão' : 'Mostrar o QR no telão'}</button>
          <button type="button" data-av-acao="copiar" ${pronto ? '' : 'disabled'}>📋 Copiar o link</button>
          <button type="button" data-av-acao="abrir" ${pronto ? '' : 'disabled'}>🌐 Abrir a página</button>
        </div>
      </div>
    </div>
    <div class="campo">Mandar:</div>
    <div class="linha" style="flex-wrap:wrap;gap:4px 14px">
      <label class="check"><input type="checkbox" data-av="cantos" ${c.cantos ? 'checked' : ''}> Cantos e salmo</label>
      <label class="check"><input type="checkbox" data-av="respostas" ${c.respostas ? 'checked' : ''}> Respostas e orações</label>
      <label class="check"><input type="checkbox" data-av="leituras" ${c.leituras ? 'checked' : ''}> Leituras</label>
      <label class="check"><input type="checkbox" data-av="avisos" ${c.avisos ? 'checked' : ''}> Avisos</label>
    </div>
    <p class="sutil pequeno">Letras de cantos e textos litúrgicos têm direitos autorais: a página não aparece no Google e${c.semCodigo ? ', sem código, abre para quem tiver o link.' : ' só abre com o código do dia.'}</p>
    <details class="av-config" ${pronto ? '' : 'open'}><summary>⚙ Serviço na nuvem (configurar uma vez)</summary>
      <label class="campo">Endereço do serviço <input data-av="servico" value="${esc(c.servico || '')}" placeholder="${SERVICO_AOVIVO}"></label>
      <div class="campo">Chave secreta
        <span class="linha" style="gap:6px"><input type="password" data-av="segredo" value="${esc(c.segredo || '')}" placeholder="clique em Gerar" style="flex:1">
        <button type="button" data-av-acao="gerar">Gerar</button><button type="button" data-av-acao="copiarChave" ${c.segredo ? '' : 'disabled'}>Copiar</button></span></div>
      <p class="sutil pequeno">A mesma chave vai no serviço (Cloudflare → o Worker → Configurações → Variáveis → Secret <b>SEGREDO</b>). Fica só neste computador.</p>
    </details>`;
  renderAoVivoStatus(); renderSeloAoVivo();
}

function ligarAoVivo() {
  const el = $('#aoVivoPainel');
  if (!el) return;
  el.addEventListener('change', e => {
    const k = e.target.dataset.av, c = cfgAV();
    if (!k) return;
    c[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value.trim();
    salvarConfig();
    if (k === 'ligado') {
      AoVivo.ultimo = ''; AoVivo.pessoas = null; AoVivo.erro = '';
      if (c.ligado) atualizarAoVivo(true); else { atualizarAoVivo(true, true); AoVivo.qrNoTelao = false; enviarQrAoVivo(); }
      if (typeof agendarEstadoCelular === 'function') agendarEstadoCelular();
    } else atualizarAoVivo(true);
    if (k === 'semCodigo' && AoVivo.qrNoTelao) enviarQrAoVivo();       // o QR do telão muda de link
    renderAoVivo();
  });
  el.addEventListener('click', async e => {
    const a = e.target.closest('[data-av-acao]')?.dataset.avAcao;
    if (!a) return;
    if (a === 'trocar' && confirm('Gerar outro código? Quem estiver acompanhando precisa ler o QR code de novo.')) { codigoAoVivo(true); AoVivo.ultimo = ''; atualizarAoVivo(true); if (AoVivo.qrNoTelao) enviarQrAoVivo(); }
    if (a === 'qr') alternarQrAoVivo();
    if (a === 'copiar') { try { await navigator.clipboard.writeText(linkAoVivo()); toast('Link copiado.'); } catch (_) { prompt('Link para acompanhar:', linkAoVivo()); } }
    if (a === 'abrir') window.open(linkAoVivo(), '_blank');
    if (a === 'gerar') {
      if (cfgAV().segredo && !confirm('Gerar uma chave nova? Depois é preciso colar a nova no serviço da nuvem também.')) return;
      cfgAV().segredo = [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join(''); salvarConfig();
    }
    if (a === 'copiarChave') { try { await navigator.clipboard.writeText(cfgAV().segredo); toast('Chave copiada (cole no serviço da Cloudflare).'); } catch (_) { prompt('Chave secreta:', cfgAV().segredo); } }
    renderAoVivo();
  });
  $('#estadoAoVivo')?.addEventListener('click', () => abrirAjustes('ndi'));
  $('#btnQrAoVivo')?.addEventListener('click', () => alternarQrAoVivo());
  renderAoVivo();
  // um dia novo com o programa aberto: troca o código (quem acompanhava precisa ler o QR de novo)
  setInterval(() => { const antes = S.config.aovivoCodigo?.codigo; if (codigoAoVivo() !== antes) { AoVivo.ultimo = ''; atualizarAoVivo(true); renderAoVivo(); } }, 60000);
  if (cfgAV().ligado) atualizarAoVivo(true);
}
