'use strict';
/*
 * Câmeras PTZ (mover, zoom, posições prontas) por VISCA na rede — as mesmas do plugin "PTZ Controls" do OBS.
 * Assim dá para mexer na câmera pelo computador do telão (ou pelo celular, ou por um joystick USB) sem ligar o da transmissão.
 * A configuração fica na câmera (Mídia → Câmeras): c.ptz = { ip, porta, protocolo }, c.ptzPosicoes = [{ n, nome }].
 * As posições são gravadas NA PRÓPRIA CÂMERA (presets VISCA, por número); aqui só guardamos os nomes. As que já estão
 * na câmera (as do OBS usam 0–15) entram pelo "Trazer posições da câmera", só para chamar; as novas gravam do nº 20 em diante.
 * Usa S, Midia, Camera, DB, toast, esc, renderCameraAtiva, renderSlides… (em tempo de execução).
 */
const PTZ = { mov: '', parada: 0, pad: null, padEstado: '', padTempo: 0, padZoom: 0, padBotoes: [], alvo: null };

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
// Foco: f > 0 longe, f < 0 perto, 0 para (velocidade 0–7); só funciona no foco manual (ptzFocoModo)
function ptzFoco(c, f, vel = 3) {
  const v = Math.max(0, Math.min(7, vel));
  ptzEnviar(c, [0x81, 0x01, 0x04, 0x08, f > 0 ? 0x20 + v : f < 0 ? 0x30 + v : 0x00, 0xFF]);
}
const ptzFocoModo = (c, modo) => ptzEnviar(c, [0x81, 0x01, 0x04, 0x38, { auto: 0x02, manual: 0x03, alternar: 0x10 }[modo] || 0x02, 0xFF]);
const ptzFocoUmToque = c => ptzEnviar(c, [0x81, 0x01, 0x04, 0x18, 0x01, 0xFF]);       // foca uma vez e fica (one push AF)
const ptzContraluz = (c, on) => ptzEnviar(c, [0x81, 0x01, 0x04, 0x33, on ? 0x02 : 0x03, 0xFF]);
// Brilho: compensação de exposição (liga e sobe/desce um degrau; 0 volta ao normal)
function ptzBrilho(c, d) {
  ptzEnviar(c, [0x81, 0x01, 0x04, 0x3E, 0x02, 0xFF]);
  ptzEnviar(c, [0x81, 0x01, 0x04, 0x0E, d > 0 ? 0x02 : d < 0 ? 0x03 : 0x00, 0xFF]);
}
const ptzIrPara = (c, n) => ptzEnviar(c, [0x81, 0x01, 0x04, 0x3F, 0x02, n & 0x7F, 0xFF]);
const ptzGravar = (c, n) => ptzEnviar(c, [0x81, 0x01, 0x04, 0x3F, 0x01, n & 0x7F, 0xFF]);

// Segurança: movimento que veio de longe (celular) para sozinho se o "continua" não chegar a tempo
function ptzMoverPorUmTempo(c, dx, dy, forca, ms = 700) {
  const chave = `${c.id}:${dx}:${dy}`;
  if (PTZ.mov !== chave) { ptzMover(c, dx, dy, forca); PTZ.mov = chave; }
  clearTimeout(PTZ.parada);
  PTZ.parada = setTimeout(() => { ptzParar(c); PTZ.mov = ''; }, ms);
}

// Câmera que o joystick controla (quando não está fixo numa câmera): a escolhida com Back; senão a que está no telão; senão a aberta no centro; senão a primeira com PTZ
function cameraPtzAlvo() {
  const lista = Midia.lista.filter(temPtz);
  return lista.find(c => c.id === PTZ.alvo) || lista.find(c => c.id === Camera.ativa) || lista.find(c => S.atual?.item && midiaDe(S.atual.item) === c) || lista[0] || null;
}

async function salvarCameraPtz(c) {
  await DB.salvar('midias', c);
  renderCameraAtiva();
  if (typeof agendarEstadoCelular === 'function') agendarEstadoCelular();
}

// Posições novas gravam a partir do nº 20: os números baixos costumam ser os do OBS (ele usa 0–15) e gravar por cima
// apagaria a posição de lá. 95–99 ficam de fora (em muitas câmeras chamam o menu da própria câmera).
const PTZ_PRIMEIRA_NOVA = 20;
async function guardarPosicao(c) {
  const usados = new Set((c.ptzPosicoes || []).map(p => p.n));
  let n = PTZ_PRIMEIRA_NOVA; while (usados.has(n) || (n >= 95 && n <= 99)) n++;
  if (n > 127) return toast('A câmera não tem mais números livres para posições.');
  const nome = (prompt(`Gravar NA CÂMERA a posição em que ela está agora, no nº ${n}.\n` +
    `(As posições que já estavam na câmera, como as do OBS, não são tocadas.)\n\nNome desta posição (ex.: Altar, Ambão, Coral, Geral):`) || '').trim();
  if (!nome) return;
  ptzGravar(c, n);
  c.ptzPosicoes = [...(c.ptzPosicoes || []), { n, nome }];
  await salvarCameraPtz(c);
  renderSlides();
  toast(`📍 Posição "${nome}" gravada na câmera (nº ${n}).`);
}

// Posições que JÁ estão gravadas na câmera (ex.: as do OBS): entram na lista só para chamar — nada é gravado
async function trazerPosicoes(c) {
  const r = prompt('Quais posições já estão gravadas na câmera (por exemplo, pelo OBS)?\n' +
    'Elas entram na lista só para chamar — nada é gravado na câmera. Depois, ✎ troca o nome.\n\nNúmeros (ex.: 0-15 ou 1, 2, 5):', '0-15');
  if (!r) return;
  const nums = new Set();
  for (const parte of r.split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(parte);
    if (!m) return toast(`Não entendi "${parte}". Use, por exemplo, 0-15 ou 1, 2, 5.`);
    for (let k = +m[1]; k <= +(m[2] ?? m[1]) && k <= 127; k++) nums.add(k);
  }
  const usados = new Set((c.ptzPosicoes || []).map(p => p.n));
  const novas = [...nums].filter(n => !usados.has(n)).sort((a, b) => a - b).map(n => ({ n, nome: `Posição ${n}` }));
  if (!novas.length) return toast('Essas posições já estão na lista.');
  c.ptzPosicoes = [...(c.ptzPosicoes || []), ...novas];
  await salvarCameraPtz(c);
  renderSlides();
  toast(`📍 ${novas.length} posição(ões) da câmera na lista. Clique em ✎ para dar nome.`);
}

async function renomearPosicao(c, n) {
  const p = (c.ptzPosicoes || []).find(x => x.n === n);
  if (!p) return;
  const nome = (prompt(`Nome da posição nº ${n} (ex.: Altar, Ambão, Coral, Geral):`, p.nome) || '').trim();
  if (!nome || nome === p.nome) return;
  p.nome = nome;
  await salvarCameraPtz(c);
  renderSlides();
}

async function apagarPosicao(c, n) {
  const p = (c.ptzPosicoes || []).find(x => x.n === n);
  if (!p || !confirm(`Tirar a posição "${p.nome}" da lista?`)) return;
  c.ptzPosicoes = c.ptzPosicoes.filter(x => x.n !== n);
  await salvarCameraPtz(c);
  renderSlides();
}

// ---------- Painel na tela da câmera (centro) ----------
// Blocos que recolhem na tela da câmera (notebook de 14"): o aberto/fechado fica guardado neste computador, por câmera
// (a tela do centro é redesenhada a toda hora)
function blocoAberto(chave, padrao) {
  try { const v = localStorage.getItem('lumen.cam.' + chave); return v === null ? padrao : v === '1'; } catch { return padrao; }
}
document.addEventListener('toggle', e => {
  const k = e.target?.dataset?.recolherCam;
  if (k) try { localStorage.setItem('lumen.cam.' + k, e.target.open ? '1' : '0'); } catch {}
}, true);

function htmlPtz(c) {
  const p = c.ptz || {};
  const proto = p.protocolo || 'visca-ip';
  const posicoes = (c.ptzPosicoes || []).slice().sort((a, b) => a.n - b.n);
  const abertoPtz = blocoAberto(c.id + '.ptz', temPtz(c));
  const abertoCon = blocoAberto(c.id + '.conexao', !temPtz(c));
  const abertoPos = blocoAberto(c.id + '.posicoes', true);
  return `<details class="ptz-cx" data-recolher-cam="${esc(c.id)}.ptz" ${abertoPtz ? 'open' : ''}>
    <summary>🎮 Controle PTZ (mover, zoom, posições) <span class="sutil pequeno">— para câmeras PTZ na rede, como no OBS</span></summary>
    <details class="ptz-sub" data-recolher-cam="${esc(c.id)}.conexao" ${abertoCon ? 'open' : ''}>
    <summary>⚙ Conexão${p.ip ? ` <span class="sutil pequeno">${esc(p.ip)}:${esc(p.porta || PORTAS_PTZ[proto])}</span>` : ''}</summary>
    <div class="linha ptz-cfg">
      <label class="campo">IP da câmera <input data-ptzcfg="ip" value="${esc(p.ip || '')}" placeholder="192.168.0.50" style="width:140px"></label>
      <label class="campo">Porta <input data-ptzcfg="porta" value="${esc(p.porta || PORTAS_PTZ[proto])}" style="width:70px"></label>
      <label class="campo">Conexão <select data-ptzcfg="protocolo">
        <option value="visca-ip" ${proto === 'visca-ip' ? 'selected' : ''}>VISCA sobre IP (UDP)</option>
        <option value="udp" ${proto === 'udp' ? 'selected' : ''}>VISCA UDP simples</option>
        <option value="tcp" ${proto === 'tcp' ? 'selected' : ''}>VISCA TCP</option></select></label>
      <span class="sutil pequeno">Use o mesmo IP e porta do "PTZ Controls" do OBS.</span>
    </div>
    </details>
    ${temPtz(c) ? `<div class="ptz-corpo">
      <div class="ptz-pad" title="Segure para mover; solte para parar">
        <span></span><button data-ptzmov="0,-1">▲</button><span></span>
        <button data-ptzmov="-1,0">◀</button><button data-ptz="home" title="Posição inicial">⌂</button><button data-ptzmov="1,0">▶</button>
        <span></span><button data-ptzmov="0,1">▼</button><span></span>
      </div>
      <div class="ptz-zoom"><button data-ptzzoom="1" title="Aproximar">＋ Zoom</button><button data-ptzzoom="-1" title="Afastar">− Zoom</button>
        <label class="campo">Velocidade <input type="range" min="0.1" max="1" step="0.1" value="${PTZ.vel || 0.5}" data-ptzvel></label></div>
      <details class="ptz-pos ptz-sub" data-recolher-cam="${esc(c.id)}.posicoes" ${abertoPos ? 'open' : ''}>
        <summary>📍 Posições prontas <span class="sutil pequeno">(${posicoes.length}) — um clique leva a câmera até lá</span></summary>
        <div class="linha ptz-lista-pos">${posicoes.map(x => `<span class="ptz-p"><button data-ptzir="${x.n}" title="Posição nº ${x.n} da câmera">📍 ${esc(x.nome)}</button><button class="ptz-x" data-ptzren="${x.n}" title="Trocar o nome">✎</button><button class="ptz-x" data-ptzdel="${x.n}" title="Tirar da lista (a câmera continua com ela)">✕</button></span>`).join('')}
          <button data-ptz="trazer" title="As posições que já estão gravadas na câmera (ex.: pelo OBS) entram na lista, só para chamar">📥 Trazer da câmera</button>
          <button data-ptz="guardar" class="primario" title="Grava na câmera a posição em que ela está agora (a partir do nº ${PTZ_PRIMEIRA_NOVA}, sem tocar nas do OBS)">＋ Guardar atual</button></div>
      </details>
    </div>` : '<p class="sutil pequeno">Informe o IP para aparecerem os controles.</p>'}
  </details>`;
}

// Joystick: joystick.js (Ajustes → 🎮 Joysticks)

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
    const b = e.target.closest('[data-ptz],[data-ptzir],[data-ptzdel],[data-ptzren]');
    if (!b) return;
    if (b.dataset.ptz === 'home') ptzHome(c);
    else if (b.dataset.ptz === 'guardar') guardarPosicao(c);
    else if (b.dataset.ptz === 'trazer') trazerPosicoes(c);
    else if (b.dataset.ptzren) renomearPosicao(c, +b.dataset.ptzren);
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
}
