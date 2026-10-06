'use strict';
/*
 * Câmeras PTZ (mover, zoom, posições prontas) por VISCA na rede — as mesmas do plugin "PTZ Controls" do OBS.
 * Assim dá para mexer na câmera pelo computador do telão (ou pelo celular, ou por um joystick USB) sem ligar o da transmissão.
 * A configuração fica na câmera (Mídia → Câmeras): c.ptz = { ip, porta, protocolo }, c.ptzPosicoes = [{ n, nome }].
 * As posições são gravadas NA PRÓPRIA CÂMERA (presets VISCA 1, 2, 3…); aqui só guardamos os nomes.
 * Usa S, Midia, Camera, DB, toast, esc, renderCameraAtiva, renderSlides… (em tempo de execução).
 */
const PTZ = { mov: '', parada: 0, pad: null, padEstado: '', padTempo: 0, padZoom: 0, padBotoes: [] };

const temPtz = c => !!(c && c.tipo === 'camera' && c.ptz?.ip);
const PORTAS_PTZ = { 'visca-ip': 52381, udp: 1259, tcp: 5678 };

function ptzEnviar(c, bytes) {
  if (!temPtz(c)) return;
  if (!NO_APP) return toast('O controle da câmera funciona só no aplicativo para Windows.');
  window.chrome.webview.postMessage({ tipo: 'ptz', ip: c.ptz.ip.trim(), porta: +c.ptz.porta || PORTAS_PTZ[c.ptz.protocolo || 'visca-ip'], protocolo: c.ptz.protocolo || 'visca-ip', bytes });
}

// Mover: dx/dy de -1 a 1 (esquerda/direita, cima/baixo); força de 0 a 1 vira a velocidade VISCA
function ptzMover(c, dx, dy, forca = 0.5) {
  const vp = Math.max(1, Math.min(0x18, Math.round(1 + forca * 0x17)));
  const vt = Math.max(1, Math.min(0x14, Math.round(1 + forca * 0x13)));
  const x = dx < 0 ? 0x01 : dx > 0 ? 0x02 : 0x03;
  const y = dy < 0 ? 0x01 : dy > 0 ? 0x02 : 0x03;
  ptzEnviar(c, [0x81, 0x01, 0x06, 0x01, vp, vt, x, y, 0xFF]);
}
const ptzParar = c => ptzEnviar(c, [0x81, 0x01, 0x06, 0x01, 0x08, 0x08, 0x03, 0x03, 0xFF]);
// Zoom: z > 0 aproxima, z < 0 afasta, 0 para (velocidade 0–7)
function ptzZoom(c, z, vel = 4) {
  const v = Math.max(0, Math.min(7, vel));
  ptzEnviar(c, [0x81, 0x01, 0x04, 0x07, z > 0 ? 0x20 + v : z < 0 ? 0x30 + v : 0x00, 0xFF]);
}
const ptzHome = c => ptzEnviar(c, [0x81, 0x01, 0x06, 0x04, 0xFF]);
const ptzIrPara = (c, n) => ptzEnviar(c, [0x81, 0x01, 0x04, 0x3F, 0x02, n & 0x7F, 0xFF]);
const ptzGravar = (c, n) => ptzEnviar(c, [0x81, 0x01, 0x04, 0x3F, 0x01, n & 0x7F, 0xFF]);

// Segurança: movimento que veio de longe (celular) para sozinho se o "continua" não chegar a tempo
function ptzMoverPorUmTempo(c, dx, dy, forca, ms = 700) {
  const chave = `${c.id}:${dx}:${dy}`;
  if (PTZ.mov !== chave) { ptzMover(c, dx, dy, forca); PTZ.mov = chave; }
  clearTimeout(PTZ.parada);
  PTZ.parada = setTimeout(() => { ptzParar(c); PTZ.mov = ''; }, ms);
}

// Câmera que o joystick/os atalhos controlam: a que está no telão; senão a aberta no centro; senão a primeira com PTZ
function cameraPtzAlvo() {
  const lista = Midia.lista.filter(temPtz);
  return lista.find(c => c.id === Camera.ativa) || lista.find(c => S.atual?.item && midiaDe(S.atual.item) === c) || lista[0] || null;
}

async function salvarCameraPtz(c) {
  await DB.salvar('midias', c);
  renderCameraAtiva();
  if (typeof agendarEstadoCelular === 'function') agendarEstadoCelular();
}

async function guardarPosicao(c) {
  const nome = (prompt('Nome desta posição (ex.: Altar, Ambão, Coral, Geral):') || '').trim();
  if (!nome) return;
  const usados = new Set((c.ptzPosicoes || []).map(p => p.n));
  let n = 1; while (usados.has(n)) n++;
  ptzGravar(c, n);
  c.ptzPosicoes = [...(c.ptzPosicoes || []), { n, nome }];
  await salvarCameraPtz(c);
  renderSlides();
  toast(`📍 Posição "${nome}" gravada na câmera (nº ${n}).`);
}

async function apagarPosicao(c, n) {
  const p = (c.ptzPosicoes || []).find(x => x.n === n);
  if (!p || !confirm(`Tirar a posição "${p.nome}" da lista?`)) return;
  c.ptzPosicoes = c.ptzPosicoes.filter(x => x.n !== n);
  await salvarCameraPtz(c);
  renderSlides();
}

// ---------- Painel na tela da câmera (centro) ----------
function htmlPtz(c) {
  const p = c.ptz || {};
  const proto = p.protocolo || 'visca-ip';
  const posicoes = (c.ptzPosicoes || []).slice().sort((a, b) => a.n - b.n);
  return `<details class="ptz-cx" ${temPtz(c) ? 'open' : ''}>
    <summary>🎮 Controle PTZ (mover, zoom, posições) <span class="sutil pequeno">— para câmeras PTZ na rede, como no OBS</span></summary>
    <div class="linha ptz-cfg">
      <label class="campo">IP da câmera <input data-ptzcfg="ip" value="${esc(p.ip || '')}" placeholder="192.168.0.50" style="width:140px"></label>
      <label class="campo">Porta <input data-ptzcfg="porta" value="${esc(p.porta || PORTAS_PTZ[proto])}" style="width:70px"></label>
      <label class="campo">Conexão <select data-ptzcfg="protocolo">
        <option value="visca-ip" ${proto === 'visca-ip' ? 'selected' : ''}>VISCA sobre IP (UDP)</option>
        <option value="udp" ${proto === 'udp' ? 'selected' : ''}>VISCA UDP simples</option>
        <option value="tcp" ${proto === 'tcp' ? 'selected' : ''}>VISCA TCP</option></select></label>
      <span class="sutil pequeno">Use o mesmo IP e porta do "PTZ Controls" do OBS.</span>
    </div>
    ${temPtz(c) ? `<div class="ptz-corpo">
      <div class="ptz-pad" title="Segure para mover; solte para parar">
        <span></span><button data-ptzmov="0,-1">▲</button><span></span>
        <button data-ptzmov="-1,0">◀</button><button data-ptz="home" title="Posição inicial">⌂</button><button data-ptzmov="1,0">▶</button>
        <span></span><button data-ptzmov="0,1">▼</button><span></span>
      </div>
      <div class="ptz-zoom"><button data-ptzzoom="1" title="Aproximar">＋ Zoom</button><button data-ptzzoom="-1" title="Afastar">− Zoom</button>
        <label class="campo">Velocidade <input type="range" min="0.1" max="1" step="0.1" value="${PTZ.vel || 0.5}" data-ptzvel></label></div>
      <div class="ptz-pos">
        <div class="sutil pequeno">Posições prontas (um clique leva a câmera até lá):</div>
        <div class="linha" style="flex-wrap:wrap">${posicoes.map(x => `<span class="ptz-p"><button data-ptzir="${x.n}">📍 ${esc(x.nome)}</button><button class="ptz-x" data-ptzdel="${x.n}" title="Tirar da lista">✕</button></span>`).join('')}
          <button data-ptz="guardar" class="primario" title="Grava na câmera a posição em que ela está agora">＋ Guardar posição atual</button></div>
      </div>
    </div>` : '<p class="sutil pequeno">Informe o IP para aparecerem os controles.</p>'}
  </details>`;
}

// ---------- Joystick / controle USB (Gamepad API) ----------
// Analógico esquerdo (ou setas do D-pad) = mover · L1/R1 ou L2/R2 = zoom · botões 1–4 (□ × ○ △ / A B X Y) = posições 1–4
function lerJoystick() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  const gp = pads[0];
  if (!gp) { PTZ.pad = null; return; }
  requestAnimationFrame(lerJoystick);
  const c = cameraPtzAlvo();
  if (!c) return;
  const morto = v => Math.abs(v) < 0.25 ? 0 : v;
  let ax = morto(gp.axes[0] || 0), ay = morto(gp.axes[1] || 0);
  const b = i => !!gp.buttons[i]?.pressed;
  if (!ax && !ay) { ax = b(14) ? -1 : b(15) ? 1 : 0; ay = b(12) ? -1 : b(13) ? 1 : 0; }   // D-pad
  const forca = Math.min(1, Math.hypot(ax, ay));
  const estado = ax || ay ? `${Math.sign(ax)}:${Math.sign(ay)}:${Math.round(forca * 4)}` : '';
  const agora = performance.now();
  if (estado !== PTZ.padEstado && agora - PTZ.padTempo > 120) {
    PTZ.padTempo = agora;
    if (estado) ptzMover(c, Math.sign(ax), Math.sign(ay), Math.max(0.15, forca)); else ptzParar(c);
    PTZ.padEstado = estado;
  }
  const z = b(5) || b(7) ? 1 : b(4) || b(6) ? -1 : 0;
  if (z !== PTZ.padZoom) { ptzZoom(c, z); PTZ.padZoom = z; }
  for (let i = 0; i < 4; i++) {
    const apertado = b(i);
    if (apertado && !PTZ.padBotoes[i]) {
      const p = (c.ptzPosicoes || []).slice().sort((a, b2) => a.n - b2.n)[i];
      if (p) { ptzIrPara(c, p.n); toast(`🎮 ${c.nome}: ${p.nome}`); }
    }
    PTZ.padBotoes[i] = apertado;
  }
}

function ligarPtz() {
  const slides = $('#slides');
  // configuração (IP, porta, conexão) — salva ao sair do campo
  slides.addEventListener('change', async e => {
    const k = e.target.dataset?.ptzcfg;
    const c = cameraDe(S.atual?.item);
    if (!k || !c) return;
    c.ptz = { ...(c.ptz || {}), [k]: e.target.value.trim() };
    if (k === 'protocolo') c.ptz.porta = PORTAS_PTZ[c.ptz.protocolo];
    await salvarCameraPtz(c);
    renderSlides();
  });
  slides.addEventListener('input', e => { if (e.target.matches('[data-ptzvel]')) PTZ.vel = +e.target.value; });
  // setas: segurar move, soltar para
  const parar = () => { const c = cameraDe(S.atual?.item); if (PTZ.mov && c) { ptzParar(c); PTZ.mov = ''; } };
  slides.addEventListener('pointerdown', e => {
    const c = cameraDe(S.atual?.item);
    const m = e.target.closest('[data-ptzmov]'), z = e.target.closest('[data-ptzzoom]');
    if (!c || (!m && !z)) return;
    e.preventDefault();
    if (m) { const [dx, dy] = m.dataset.ptzmov.split(',').map(Number); ptzMover(c, dx, dy, PTZ.vel || 0.5); PTZ.mov = 'tela'; }
    if (z) { ptzZoom(c, +z.dataset.ptzzoom, Math.round((PTZ.vel || 0.5) * 7)); PTZ.mov = 'zoom'; }
  });
  addEventListener('pointerup', () => { const c = cameraDe(S.atual?.item); if (PTZ.mov === 'zoom' && c) { ptzZoom(c, 0); PTZ.mov = ''; } else parar(); });
  slides.addEventListener('click', e => {
    const c = cameraDe(S.atual?.item);
    if (!c) return;
    const b = e.target.closest('[data-ptz],[data-ptzir],[data-ptzdel]');
    if (!b) return;
    if (b.dataset.ptz === 'home') ptzHome(c);
    else if (b.dataset.ptz === 'guardar') guardarPosicao(c);
    else if (b.dataset.ptzir) ptzIrPara(c, +b.dataset.ptzir);
    else if (b.dataset.ptzdel) apagarPosicao(c, +b.dataset.ptzdel);
  });
  // posições no quadro "Câmeras" da tela principal
  $('#cameraAtiva').addEventListener('click', e => {
    const b = e.target.closest('[data-ptzquadro]');
    if (!b) return;
    const [id, n] = b.dataset.ptzquadro.split(':');
    const c = Midia.lista.find(m => m.id === id);
    if (c) ptzIrPara(c, +n);
  });
  // erros de rede voltam do programa
  if (NO_APP) window.chrome.webview.addEventListener('message', e => {
    if (e.data?.tipo === 'ptzStatus' && e.data.erro) toast(`🎮 Câmera ${e.data.ip}: ${e.data.erro}`);
  });
  // joystick: começa a ler quando um controle é conectado (ou tocado)
  addEventListener('gamepadconnected', e => { toast(`🎮 Controle conectado: ${e.gamepad.id.replace(/\(.*\)/, '').trim() || 'joystick'}`); if (!PTZ.pad) { PTZ.pad = true; requestAnimationFrame(lerJoystick); } });
}
