'use strict';
/*
 * Joysticks (até 2): câmeras PTZ e telão pelo controle (Ajustes → 🎮 Joysticks).
 * - Leitura: o programa lê os controles direto do Windows (XInput, app\Joystick.cs → mensagens {tipo:'joy'}), o que funciona
 *   com o MiguelAngelus minimizado ou atrás do OBS; sem isso (no navegador, ou controle que não é XInput), pela API Gamepad.
 * - Botões na ordem do "controle padrão" (Xbox): 0 A · 1 B · 2 X · 3 Y · 4 LB · 5 RB · 6 LT · 7 RT · 8 Back · 9 Start ·
 *   10/11 clique das alavancas · 12–15 setas · 16 central.
 * - Configuração em S.config.joysticks[0|1] (deste computador: os controles são deste computador; as câmeras e posições
 *   vêm da nuvem). Cada joystick: câmera (fixa ou "a do telão"), o que fazem as alavancas e as setas, e a função de cada botão.
 * Usa S, Midia, Camera, temPtz, ptzMover, ptzParar, ptzZoom, ptzIrPara, ptzHome, cameraPtzAlvo, mostrarCamera, pararCamera,
 * proximo, anterior, alternarMudo, limpar, alternarAltar, alternarPix, definirLetraCamera, toast, salvarConfig, $, $$, esc.
 */
const BOTOES_JOY = [
  ['A', 'A'], ['B', 'B'], ['X', 'X'], ['Y', 'Y'], ['LB', 'LB (ombro esquerdo)'], ['RB', 'RB (ombro direito)'],
  ['LT', 'LT (gatilho esquerdo)'], ['RT', 'RT (gatilho direito)'], ['Back', 'Back / Select'], ['Start', 'Start'],
  ['L3', 'Clique da alavanca esquerda'], ['R3', 'Clique da alavanca direita'],
  ['▲', 'Seta para cima'], ['▼', 'Seta para baixo'], ['◀', 'Seta para a esquerda'], ['▶', 'Seta para a direita'], ['⌂', 'Botão central'],
];
const SETAS_JOY = [12, 13, 14, 15];
const SEGURAR_JOY = ['zoomMais', 'zoomMenos', 'focoPerto', 'focoLonge'];      // agem enquanto o botão está apertado
const ACOES_JOY = [
  ['', '— nada —'],
  ['zoomMais', '🔍 Zoom + (aproximar, enquanto segura)'], ['zoomMenos', '🔍 Zoom − (afastar, enquanto segura)'],
  ['pos', '📍 Posição da câmera do joystick…'], ['preset', '📍 Posição de uma câmera…'], ['home', '⌂ Posição inicial da câmera'],
  ['trocarCam', '🔄 Trocar a câmera controlada (próxima)'], ['cam', '🎯 Controlar a câmera…'], ['camTelao', '📷 Pôr a câmera controlada no telão'], ['tirarCam', '📷 Tirar a câmera do telão'],
  ['focoPerto', '🎯 Foco perto (enquanto segura)'], ['focoLonge', '🎯 Foco longe (enquanto segura)'],
  ['focoAuto', '🎯 Foco automático / manual (alterna)'], ['focoToque', '🎯 Focar agora (um toque)'],
  ['brilhoMais', '☀ Brilho +'], ['brilhoMenos', '☀ Brilho −'], ['brilhoNormal', '☀ Brilho normal'], ['contraluz', '🌗 Contraluz (liga/desliga)'],
  ['velMais', '⚡ Velocidade do movimento +'], ['velMenos', '⚡ Velocidade do movimento −'],
  ['zoomVelMais', '⚡ Velocidade do zoom +'], ['zoomVelMenos', '⚡ Velocidade do zoom −'],
  ['letra', '🔤 Letra por cima da câmera (liga/desliga)'],
  ['proximo', '▶ Próximo slide'], ['anterior', '◀ Slide anterior'], ['mudo', '🔇 Mudo'], ['limpar', 'Limpar o telão'],
  ['altar', '⛪ Altar'], ['pix', '💠 Pix'],
];
const DIRECOES_JOY = [['mover', 'Mover a câmera'], ['fino', 'Mover a câmera devagar (ajuste fino)'], ['zoom', 'Zoom (para cima aproxima)'], ['', '— nada —']];
const JOY_PADRAO = () => ({
  camera: '', folga: 0.25, esq: 'mover', dir: 'fino', setas: 'fino', velMov: 1, velZoom: 7,
  botoes: { 0: { acao: 'pos', n: 1 }, 1: { acao: 'pos', n: 2 }, 2: { acao: 'pos', n: 3 }, 3: { acao: 'pos', n: 4 },
    4: { acao: 'zoomMenos' }, 5: { acao: 'zoomMais' }, 6: { acao: 'zoomMenos' }, 7: { acao: 'zoomMais' },
    8: { acao: 'trocarCam' }, 9: { acao: 'proximo' }, 10: { acao: 'velMenos' }, 11: { acao: 'velMais' } },
});
const JOY = { fonteApp: 0, pads: [null, null], est: [{}, {}], testar: true, painel: false };

// Perfis dos joysticks (ex.: "Missa das crianças", com um botão para a posição do teatrinho): os dois joysticks juntos,
// guardados na config 'joyPerfis' — vão para os outros computadores pela nuvem. Escolher um perfil copia para a
// configuração deste computador (S.config.joysticks); mexer depois não muda o perfil até "Gravar por cima".
const JoyPerfis = { lista: [] };
const copiaJoy = v => JSON.parse(JSON.stringify(v || []));
async function carregarJoyPerfis() {
  const r = await DB.obter('config', 'joyPerfis');
  JoyPerfis.lista = r?.valor?.lista || [];
  if (S.config.joyPerfil && !JoyPerfis.lista.some(p => p.id === S.config.joyPerfil)) { S.config.joyPerfil = ''; salvarConfig(); }
  if (JOY.painel) renderJoyPainel();
}
const salvarJoyPerfis = () => DB.salvar('config', { id: 'joyPerfis', valor: { lista: JoyPerfis.lista } });
function aplicarJoyPerfil(id) {
  const p = JoyPerfis.lista.find(x => x.id === id);
  if (!p) return;
  JOY.pads.forEach((pd, n) => pd && soltarTudo(n));
  S.config.joysticks = copiaJoy(p.joys); S.config.joyPerfil = p.id; salvarConfig();
  JOY.est.forEach(e => { e.alvo = null; });
  toast(`🎮 Perfil dos joysticks: ${p.nome}`);
  renderCameraAtiva(); if (JOY.painel) renderJoyPainel();
}
async function acaoJoyPerfil(acao) {
  const atual = JoyPerfis.lista.find(p => p.id === S.config.joyPerfil);
  if (acao === 'novo') {
    const nome = (prompt('Nome do perfil dos joysticks (ex.: Missa das 10:30 — crianças, Adoração):') || '').trim();
    if (!nome) return;
    const igual = JoyPerfis.lista.find(p => p.nome.toLowerCase() === nome.toLowerCase());
    if (igual && !confirm(`Já existe "${igual.nome}". Gravar por cima?`)) return;
    const p = igual || { id: uid(), nome };
    p.joys = copiaJoy([cfgJoy(0), cfgJoy(1)]);
    if (!igual) JoyPerfis.lista.push(p);
    S.config.joyPerfil = p.id; salvarConfig();
    await salvarJoyPerfis(); toast(`🎮 Perfil "${nome}" salvo (vai para os outros computadores pela nuvem).`);
  } else if (acao === 'gravar' && atual && confirm(`Gravar a configuração atual dos joysticks em "${atual.nome}"?`)) {
    atual.joys = copiaJoy([cfgJoy(0), cfgJoy(1)]); await salvarJoyPerfis(); toast(`🎮 Perfil "${atual.nome}" atualizado.`);
  } else if (acao === 'apagar' && atual && confirm(`Apagar o perfil "${atual.nome}"? (Nos outros computadores também.)\nA configuração atual dos joysticks não muda.`)) {
    JoyPerfis.lista = JoyPerfis.lista.filter(p => p !== atual); S.config.joyPerfil = ''; salvarConfig(); await salvarJoyPerfis();
  }
  renderJoyPainel();
}

const cfgJoy = n => {
  if (!Array.isArray(S.config.joysticks)) S.config.joysticks = [];
  if (!S.config.joysticks[n]) S.config.joysticks[n] = JOY_PADRAO();
  return S.config.joysticks[n];
};

// ---------- entrada: XInput (programa) ou API Gamepad ----------
// XInput → formato do "controle padrão": botões {p, v} e eixos de −1 a 1 (y para baixo positivo)
const BITS_XINPUT = { 0x1000: 0, 0x2000: 1, 0x4000: 2, 0x8000: 3, 0x100: 4, 0x200: 5, 0x20: 8, 0x10: 9, 0x40: 10, 0x80: 11, 0x1: 12, 0x2: 13, 0x4: 14, 0x8: 15 };
function padDoXinput(p) {
  const botoes = Array.from({ length: 17 }, () => ({ p: false, v: 0 }));
  for (const [bit, i] of Object.entries(BITS_XINPUT)) if (p.b & +bit) botoes[i] = { p: true, v: 1 };
  botoes[6] = { p: p.lt > 30, v: p.lt / 255 }; botoes[7] = { p: p.rt > 30, v: p.rt / 255 };
  const ax = v => Math.max(-1, Math.min(1, v / 32767));
  return { id: 'Controle ' + (p.i + 1) + ' (Xbox / XInput)', botoes, eixos: [ax(p.lx), -ax(p.ly), ax(p.rx), -ax(p.ry)] };
}
function aoReceberJoy(m) {
  JOY.fonteApp = performance.now();
  const pads = (m.pads || []).sort((a, b) => a.i - b.i).slice(0, 2).map(padDoXinput);
  JOY.appTem = pads.length > 0;
  processarPads(pads);
}
// API Gamepad (sem o programa lendo, ou controle que não é XInput). O programa só manda quando algo muda: com um
// controle XInput conectado, ele manda e a API Gamepad fica de fora (senão "apagaria" o controle parado)
function lerGamepads() {
  requestAnimationFrame(lerGamepads);
  if (JOY.appTem) return;
  const lista = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean).slice(0, 2) : [];
  if (!lista.length && !JOY.pads.some(Boolean)) return;
  processarPads(lista.map(g => ({ id: g.id, botoes: g.buttons.map(b => ({ p: b.pressed, v: b.value })), eixos: [...g.axes] })));
}

function processarPads(pads) {
  const antes = JOY.pads.map(Boolean).join();
  for (let n = 0; n < 2; n++) {
    JOY.pads[n] = pads[n] || null;
    if (pads[n]) aplicarPad(n, pads[n]); else soltarTudo(n);
  }
  if (antes !== JOY.pads.map(Boolean).join()) { PTZ.pad = JOY.pads.some(Boolean); renderCameraAtiva(); if (JOY.painel) renderJoyPainel(); }
  if (JOY.painel) desenharEstadoJoy();
}

// ---------- ações ----------
function cameraDoJoy(n) {
  const cfg = cfgJoy(n), lista = Midia.lista.filter(temPtz);
  return lista.find(c => c.id === cfg.camera) || lista.find(c => c.id === JOY.est[n].alvo) || cameraPtzAlvo();
}
function soltarTudo(n) {
  const e = JOY.est[n], c = e.cam && Midia.lista.find(m => m.id === e.cam);
  if (c && e.mov) ptzParar(c);
  if (c && e.zoom) ptzZoom(c, 0);
  if (c && e.foco) ptzFoco(c, 0);
  JOY.est[n] = { alvo: e.alvo };
}
function trocarCameraDoJoy(n) {
  const cfg = cfgJoy(n);
  if (cfg.camera) return toast(`🎮 O joystick ${n + 1} está fixo na câmera "${Midia.lista.find(c => c.id === cfg.camera)?.nome || '?'}" (Ajustes → Joysticks).`);
  const lista = Midia.lista.filter(temPtz).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (!lista.length) return;
  soltarTudo(n);
  const atual = cameraDoJoy(n), prox = lista[(lista.indexOf(atual) + 1) % lista.length];
  JOY.est[n].alvo = prox.id; PTZ.alvo = prox.id;
  toast(`🎮 Joystick ${n + 1} controlando: ${prox.nome}${prox.id === Camera.ativa ? ' (no telão)' : ''}`);
  renderCameraAtiva();
}
// "Posição da câmera do joystick": cada câmera pode ter a sua (porCam[id] = nº do preset; 0 = nenhuma);
// sem escolha para a câmera, vale a da mesma ordem da lista dela (cfgB.n: 1ª, 2ª…)
function posicaoDoBotao(cfgB, c) {
  const lista = (c.ptzPosicoes || []).slice().sort((a, b) => a.n - b.n);
  const escolhida = cfgB.porCam?.[c.id];
  if (escolhida === 0) return null;
  if (escolhida != null) return lista.find(p => p.n === +escolhida) || { n: +escolhida, nome: `posição ${escolhida}` };
  return lista[(+cfgB.n || 1) - 1] || null;
}

function executarBotao(n, cfgB) {
  const c = cameraDoJoy(n);
  switch (cfgB.acao) {
    case 'pos': {
      if (!c) break;
      const p = posicaoDoBotao(cfgB, c);
      if (p) { ptzIrPara(c, p.n); toast(`🎮 ${c.nome}: ${p.nome}`); }
      else toast(`🎮 ${c.nome}: este botão não tem posição para esta câmera (Ajustes → Joysticks).`);
      break;
    }
    case 'preset': {
      const cam = Midia.lista.find(m => m.id === cfgB.cam && temPtz(m)), p = cam?.ptzPosicoes?.find(x => x.n === +cfgB.n);
      if (cam && p) { ptzIrPara(cam, p.n); toast(`🎮 ${cam.nome}: ${p.nome}`); }
      break;
    }
    case 'home': if (c) ptzHome(c); break;
    case 'focoAuto': if (c) { JOY.focoManual = { ...JOY.focoManual, [c.id]: !JOY.focoManual?.[c.id] }; ptzFocoModo(c, JOY.focoManual[c.id] ? 'manual' : 'auto'); toast(`🎮 ${c.nome}: foco ${JOY.focoManual[c.id] ? 'manual' : 'automático'}`); } break;
    case 'focoToque': if (c) { ptzFocoUmToque(c); toast(`🎮 ${c.nome}: focando`); } break;
    case 'brilhoMais': case 'brilhoMenos': case 'brilhoNormal': if (c) ptzBrilho(c, cfgB.acao === 'brilhoMais' ? 1 : cfgB.acao === 'brilhoMenos' ? -1 : 0); break;
    case 'contraluz': if (c) { JOY.contraluz = { ...JOY.contraluz, [c.id]: !JOY.contraluz?.[c.id] }; ptzContraluz(c, JOY.contraluz[c.id]); toast(`🎮 ${c.nome}: contraluz ${JOY.contraluz[c.id] ? 'ligada' : 'desligada'}`); } break;
    case 'trocarCam': trocarCameraDoJoy(n); break;
    case 'cam': {      // um controle só para várias câmeras: este botão passa a controlar a câmera escolhida
      const cam = Midia.lista.find(m => m.id === cfgB.cam && temPtz(m));
      if (!cam) break;
      if (cfgJoy(n).camera) { toast(`🎮 O joystick ${n + 1} está fixo numa câmera (Ajustes → Joysticks → Câmera deste joystick).`); break; }
      soltarTudo(n); JOY.est[n].alvo = cam.id; PTZ.alvo = cam.id;
      toast(`🎮 Joystick ${n + 1} controlando: ${cam.nome}`); renderCameraAtiva();
      break;
    }
    case 'camTelao': if (c) mostrarCamera(c, null); break;
    case 'tirarCam': pararCamera(); break;
    case 'velMais': case 'velMenos': case 'zoomVelMais': case 'zoomVelMenos': {
      const cfg = cfgJoy(n), mov = cfgB.acao.startsWith('vel'), mais = cfgB.acao.endsWith('Mais');
      if (mov) { cfg.velMov = Math.round(Math.max(0.1, Math.min(1, (+cfg.velMov || 1) + (mais ? 0.1 : -0.1))) * 10) / 10; toast(`🎮 Velocidade do movimento: ${Math.round(cfg.velMov * 100)}%`); }
      else { cfg.velZoom = Math.max(1, Math.min(7, (+cfg.velZoom || 7) + (mais ? 1 : -1))); toast(`🎮 Velocidade do zoom: ${cfg.velZoom} de 7`); }
      salvarConfig(); if (JOY.painel) renderJoyPainel();
      break;
    }
    case 'letra': definirLetraCamera(!Camera.letra); break;
    case 'proximo': proximo(); break;
    case 'anterior': anterior(); break;
    case 'mudo': alternarMudo(); break;
    case 'limpar': limpar(); break;
    case 'altar': alternarAltar(); break;
    case 'pix': alternarPix(); break;
  }
}

function aplicarPad(n, pad) {
  const cfg = cfgJoy(n), e = JOY.est[n], ant = e.botoes || [];
  e.botoes = pad.botoes.map(b => !!b.p);
  if (JOY.painel && JOY.testar) return;                          // configurando: só mostra, não mexe em nada
  // botões: age ao apertar (as setas, quando movem a câmera, ficam com o movimento)
  pad.botoes.forEach((b, i) => {
    if (!b.p || ant[i]) return;
    if (SETAS_JOY.includes(i) && cfg.setas) return;
    const cb = cfg.botoes?.[i];
    if (cb?.acao && !SEGURAR_JOY.includes(cb.acao)) executarBotao(n, cb);
  });
  const c = cameraDoJoy(n);
  if (!c) return;
  if (e.cam && e.cam !== c.id) soltarTudo(n), JOY.est[n].botoes = e.botoes;
  const est = JOY.est[n]; est.cam = c.id;
  // movimento: a 1ª direção ativa entre alavanca esquerda, direita e setas, cada uma no seu modo
  const folga = Math.max(0.1, Math.min(0.6, +cfg.folga || 0.25));
  const morto = v => Math.abs(v) < folga ? 0 : (v - Math.sign(v) * folga) / (1 - folga);
  const fontes = [['esq', morto(pad.eixos[0] || 0), morto(pad.eixos[1] || 0)], ['dir', morto(pad.eixos[2] || 0), morto(pad.eixos[3] || 0)],
    ['setas', pad.botoes[14]?.p ? -1 : pad.botoes[15]?.p ? 1 : 0, pad.botoes[12]?.p ? -1 : pad.botoes[13]?.p ? 1 : 0]];
  const velM = Math.max(0.1, Math.min(1, +cfg.velMov || 1)), velZ = Math.max(1, Math.min(7, +cfg.velZoom || 7));
  let mov = null, zoomDir = 0, zoomVel = 0;
  for (const [k, x, y] of fontes) {
    const modo = cfg[k];
    if (!modo || (!x && !y)) continue;
    if (modo === 'zoom') { if (y && !zoomDir) { zoomDir = y < 0 ? 1 : -1; zoomVel = Math.max(1, Math.round(Math.abs(y) * velZ)); } continue; }
    if (!mov) mov = { x, y, forca: modo === 'fino' ? 0.02 + Math.min(1, Math.hypot(x, y)) * 0.13 : Math.max(0.05, Math.min(1, Math.hypot(x, y)) * velM) };
  }
  const agora = performance.now();
  const chave = mov ? `${Math.sign(mov.x)}:${Math.sign(mov.y)}:${Math.round(mov.forca * 8)}` : '';
  if (chave !== (est.mov || '') && agora - (est.movEm || 0) > 110) {
    est.movEm = agora;
    if (mov) ptzMover(c, Math.sign(mov.x), Math.sign(mov.y), mov.forca); else ptzParar(c);
    est.mov = chave;
  }
  // zoom: botões/gatilhos com Zoom + / − (gatilho: quanto mais aperta, mais rápido) ou alavanca no modo Zoom
  if (!zoomDir) pad.botoes.forEach((b, i) => {
    const a = cfg.botoes?.[i]?.acao;
    if (!b.p || (a !== 'zoomMais' && a !== 'zoomMenos') || (SETAS_JOY.includes(i) && cfg.setas)) return;
    const v = i === 6 || i === 7 ? Math.max(1, Math.round(b.v * velZ)) : velZ;
    if (v > zoomVel) { zoomDir = a === 'zoomMais' ? 1 : -1; zoomVel = v; }
  });
  const z = zoomDir ? `${zoomDir}:${zoomVel}` : '';
  if (z !== (est.zoom || '')) { ptzZoom(c, zoomDir, zoomVel); est.zoom = z; }
  // foco perto/longe enquanto segura (passa a câmera para o foco manual; "Foco automático" volta)
  let foco = 0;
  pad.botoes.forEach((b, i) => {
    const a = cfg.botoes?.[i]?.acao;
    if (b.p && (a === 'focoPerto' || a === 'focoLonge') && !(SETAS_JOY.includes(i) && cfg.setas)) foco = a === 'focoLonge' ? 1 : -1;
  });
  if (foco !== (est.foco || 0)) {
    if (foco && !JOY.focoManual?.[c.id]) { JOY.focoManual = { ...JOY.focoManual, [c.id]: true }; ptzFocoModo(c, 'manual'); toast(`🎮 ${c.nome}: foco manual (use "Foco automático" para voltar)`); }
    ptzFoco(c, foco); est.foco = foco;
  }
}

// ---------- Ajustes → 🎮 Joysticks ----------
// Desenho de um controle no formato do Xbox (cada peça com data-jb = nº do botão)
function svgControle() {
  const bt = (i, x, y, r, txt, cor) => `<g class="jb" data-jb="${i}"><circle cx="${x}" cy="${y}" r="${r}" ${cor ? `style="--cor:${cor}"` : ''}/><text x="${x}" y="${y + 5}">${txt}</text></g>`;
  const ret = (i, x, y, w, h, rx, txt) => `<g class="jb" data-jb="${i}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/><text x="${x + w / 2}" y="${y + h / 2 + 5}">${txt}</text></g>`;
  const gat = (i, x, txt) => `<g class="jb gat" data-jb="${i}"><rect x="${x}" y="6" width="96" height="30" rx="10"/><rect class="enche" x="${x}" y="6" width="0" height="30" rx="10"/><text x="${x + 48}" y="27">${txt}</text></g>`;
  const alav = (k, x, y, i) => `<g class="jb alav" data-jb="${i}" data-alav="${k}"><circle cx="${x}" cy="${y}" r="38"/><circle class="pino" cx="${x}" cy="${y}" r="18"/><text x="${x}" y="${y + 62}" class="leg">${k === 'esq' ? 'alavanca esq.' : 'alavanca dir.'}</text></g>`;
  return `<svg viewBox="0 0 540 350" class="joy-svg" role="img" aria-label="Desenho do joystick">
    ${gat(6, 64, 'LT')}${gat(7, 380, 'RT')}
    ${ret(4, 54, 44, 116, 24, 12, 'LB')}${ret(5, 370, 44, 116, 24, 12, 'RB')}
    <path class="corpo" d="M120 74 H420 C482 74 520 120 532 190 C546 270 528 336 478 340 C440 343 418 312 398 284 C384 264 370 258 350 258 H190 C170 258 156 264 142 284 C122 312 100 343 62 340 C12 336 -6 270 8 190 C20 120 58 74 120 74 Z"/>
    ${alav('esq', 128, 150, 10)}${alav('dir', 340, 222, 11)}
    ${ret(12, 186, 184, 26, 30, 5, '▲')}${ret(13, 186, 240, 26, 30, 5, '▼')}${ret(14, 156, 212, 30, 26, 5, '◀')}${ret(15, 212, 212, 30, 26, 5, '▶')}
    ${ret(8, 220, 140, 36, 20, 10, '⧉')}${ret(9, 284, 140, 36, 20, 10, '≡')}
    ${bt(16, 270, 102, 18, '⌂')}
    ${bt(3, 412, 112, 18, 'Y', '#e8b923')}${bt(2, 378, 146, 18, 'X', '#3b82f6')}${bt(1, 446, 146, 18, 'B', '#e0463c')}${bt(0, 412, 180, 18, 'A', '#2e9e4f')}
    <text x="238" y="176" class="leg">Back</text><text x="302" y="176" class="leg">Start</text>
  </svg>`;
}

function opcoesPosicoes(cfgB, camFixa) {
  if (cfgB.acao === 'cam') {
    const cams = Midia.lista.filter(temPtz).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return cams.length ? `<select data-joycam><option value="">— qual câmera? —</option>${cams.map(c => `<option value="${esc(c.id)}" ${cfgB.cam === c.id ? 'selected' : ''}>📷 ${esc(c.nome)}</option>`).join('')}</select>`
      : '<span class="sutil pequeno">Nenhuma câmera PTZ cadastrada.</span>';
  }
  if (cfgB.acao === 'pos') {
    // uma lista por câmera (com o nome das posições gravadas): o mesmo botão leva cada câmera à sua posição
    const cams = Midia.lista.filter(m => temPtz(m) && (!camFixa || m.id === camFixa)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (!cams.length)
      return `<select data-joyn title="Nº da posição na lista da câmera do joystick">${Array.from({ length: 12 }, (_, k) => `<option value="${k + 1}" ${+cfgB.n === k + 1 ? 'selected' : ''}>${k + 1}ª da lista</option>`).join('')}</select>`;
    return `<div class="joy-poscams">${cams.map(c => {
      const lista = (c.ptzPosicoes || []).slice().sort((a, b) => a.n - b.n), atual = posicaoDoBotao(cfgB, c);
      return `<label class="joy-poscam"><span>📷 ${esc(c.nome)}</span>${lista.length
        ? `<select data-joyposcam="${esc(c.id)}"><option value="0" ${!atual ? 'selected' : ''}>— nenhuma —</option>${lista.map(p => `<option value="${p.n}" ${atual?.n === p.n ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>`
        : '<span class="sutil pequeno">sem posições gravadas (Mídia → Câmeras → 📍)</span>'}</label>`;
    }).join('')}</div>`;
  }
  if (cfgB.acao !== 'preset') return '';
  const cams = Midia.lista.filter(m => temPtz(m) && m.ptzPosicoes?.length).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (!cams.length) return '<span class="sutil pequeno">Nenhuma câmera com posições (Mídia → Câmeras → 📍 Posições).</span>';
  return `<select data-joypreset><option value="">— qual posição? —</option>${cams.map(c => `<optgroup label="📷 ${esc(c.nome)}">${c.ptzPosicoes.slice().sort((a, b) => a.n - b.n)
    .map(p => `<option value="${esc(c.id)}:${p.n}" ${cfgB.cam === c.id && +cfgB.n === p.n ? 'selected' : ''}>${esc(c.nome)} — ${esc(p.nome)}</option>`).join('')}</optgroup>`).join('')}</select>`;
}

function renderJoyPainel() {
  const el = $('#joyPainel');
  if (!el) return;
  // o Joystick 2 só aparece com ele conectado (o 1 aparece sempre, para configurar antes de ligar)
  if (JOY.aba === 1 && !JOY.pads[1]) JOY.aba = 0;
  const n = JOY.aba || 0, cfg = cfgJoy(n), pad = JOY.pads[n];
  const cams = Midia.lista.filter(temPtz).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const sel = (k, lista, v) => `<select data-joycfg="${k}">${lista.map(([val, nome]) => `<option value="${val}" ${val === (v ?? '') ? 'selected' : ''}>${nome}</option>`).join('')}</select>`;
  const perfil = JoyPerfis.lista.find(p => p.id === S.config.joyPerfil);
  el.innerHTML = `
    <div class="joy-perfis" title="Perfil: a configuração dos joysticks guardada com um nome (ex.: Missa das crianças, com a posição do teatrinho). Vai para os outros computadores pela nuvem.">
      <label class="campo">Perfil dos joysticks
        <select data-joyperfil><option value="">${perfil ? '— escolha para aplicar —' : 'Configuração atual (sem perfil)'}</option>${[...JoyPerfis.lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
          .map(p => `<option value="${esc(p.id)}" ${p === perfil ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select></label>
      <button type="button" data-joyperfilacao="novo">💾 Salvar como perfil…</button>
      ${perfil ? `<button type="button" data-joyperfilacao="gravar">Gravar por cima de "${esc(perfil.nome)}"</button><button type="button" data-joyperfilacao="apagar" class="perigo" title="Apagar o perfil (nos outros computadores também)">🗑</button>` : ''}
    </div>
    ${JOY.pads[1] ? `<div class="joy-abas">${[0, 1].map(k => `<button type="button" data-joyaba="${k}" class="${k === n ? 'sel' : ''}">🎮 Joystick ${k + 1}
      <span class="sutil pequeno">${JOY.pads[k] ? '● conectado' : 'não conectado'}</span></button>`).join('')}</div>`
      : `<p class="joy-um"><b>🎮 Joystick</b> <span class="sutil pequeno">${pad ? '● conectado' : 'não conectado'} — ligando um segundo, aparece a aba dele.</span></p>`}
    <p class="sutil pequeno joy-id">${pad ? esc(pad.id) : 'Conecte o joystick e aperte um botão. Com dois, o 1º conectado é o Joystick 1.'}</p>
    <div class="joy-grade">
      <div class="joy-desenho">${svgControle()}
        <label class="check" title="Enquanto esta tela está aberta, os botões só acendem no desenho (não mexem na câmera nem no telão)"><input type="checkbox" data-joytestar ${JOY.testar ? 'checked' : ''}> Só testar (não mexe na câmera nem no telão)</label>
        <p class="sutil pequeno">Aperte um botão: ele acende aqui e na lista. Clique numa peça do desenho para ir até ela.</p></div>
      <div class="joy-cfg">
        <label class="campo">Câmera deste joystick
          <select data-joycfg="camera"><option value="">A do telão (Back troca)</option>${cams.map(c => `<option value="${esc(c.id)}" ${c.id === cfg.camera ? 'selected' : ''}>📷 ${esc(c.nome)} (sempre esta)</option>`).join('')}</select></label>
        <div class="joy-linha" data-jbl="10"><b>Alavanca esquerda</b>${sel('esq', DIRECOES_JOY, cfg.esq)}</div>
        <div class="joy-linha" data-jbl="11"><b>Alavanca direita</b>${sel('dir', DIRECOES_JOY, cfg.dir)}</div>
        <div class="joy-linha" data-jbl="12"><b>Setas</b>${sel('setas', [DIRECOES_JOY[0], DIRECOES_JOY[1], ['', 'Cada seta com a sua função (abaixo)']], cfg.setas)}</div>
        <div class="joy-vel">
          <label class="campo">⚡ Velocidade máxima do movimento <b data-joyvalor="velMov">${Math.round((+cfg.velMov || 1) * 100)}%</b><input type="range" min="0.1" max="1" step="0.1" data-joycfg="velMov" value="${+cfg.velMov || 1}"></label>
          <label class="campo">⚡ Velocidade do zoom <b data-joyvalor="velZoom">${+cfg.velZoom || 7} de 7</b><input type="range" min="1" max="7" step="1" data-joycfg="velZoom" value="${+cfg.velZoom || 7}"></label>
          <label class="campo">Folga das alavancas (ignora movimentos pequenos) <input type="range" min="0.1" max="0.6" step="0.05" data-joycfg="folga" value="${+cfg.folga || 0.25}"></label>
        </div>
        <p class="sutil pequeno">Alavanca: quanto mais empurra, mais rápido (até a velocidade máxima). Gatilho no zoom: quanto mais aperta, mais rápido.</p>
        <div class="joy-botoes">${BOTOES_JOY.map(([curto, nome], i) => {
          if (SETAS_JOY.includes(i) && cfg.setas) return '';
          const cb = cfg.botoes?.[i] || { acao: '' };
          return `<div class="joy-linha" data-jbl="${i}"><span class="jb-nome"><i>${curto}</i>${nome === curto ? '' : esc(nome)}</span>
            <select data-joyacao="${i}">${ACOES_JOY.map(([v, t]) => `<option value="${v}" ${v === (cb.acao || '') ? 'selected' : ''}>${t}</option>`).join('')}</select>
            ${opcoesPosicoes(cb, cfg.camera)}</div>`;
        }).join('')}</div>
        <button type="button" data-joypadrao>Voltar ao padrão</button>
      </div>
    </div>`;
  desenharEstadoJoy();
}

// acende no desenho e na lista o que está apertado (e mexe as alavancas e os gatilhos)
function desenharEstadoJoy() {
  const el = $('#joyPainel');
  if (!el || !el.offsetParent) return;
  const pad = JOY.pads[JOY.aba || 0];
  el.querySelectorAll('[data-jb]').forEach(g => g.classList.toggle('on', !!pad?.botoes[+g.dataset.jb]?.p));
  el.querySelectorAll('[data-jbl]').forEach(r => r.classList.toggle('on', !!pad?.botoes[+r.dataset.jbl]?.p));
  for (const [k, i] of [['esq', 0], ['dir', 2]]) {
    const g = el.querySelector(`[data-alav="${k}"]`), pino = g?.querySelector('.pino'), base = g?.querySelector('circle');
    if (!pino) continue;
    const x = pad ? pad.eixos[i] || 0 : 0, y = pad ? pad.eixos[i + 1] || 0 : 0;
    pino.setAttribute('cx', +base.getAttribute('cx') + x * 20); pino.setAttribute('cy', +base.getAttribute('cy') + y * 20);
    g.classList.toggle('mexendo', Math.hypot(x, y) >= (+cfgJoy(JOY.aba || 0).folga || 0.25));
    el.querySelector(`[data-jbl="${k === 'esq' ? 10 : 11}"]`)?.classList.toggle('on', Math.hypot(x, y) >= (+cfgJoy(JOY.aba || 0).folga || 0.25) || !!pad?.botoes[k === 'esq' ? 10 : 11]?.p);
  }
  for (const i of [6, 7]) {
    const r = el.querySelector(`[data-jb="${i}"] .enche`);
    if (r) r.setAttribute('width', Math.round(96 * (pad?.botoes[i]?.v || 0)));
  }
}

function ligarJoystick() {
  if (NO_APP) {
    window.chrome.webview.addEventListener('message', e => { if (e.data?.tipo === 'joy') aoReceberJoy(e.data); });
    window.chrome.webview.postMessage({ tipo: 'joyLigar' });
  }
  carregarJoyPerfis();
  requestAnimationFrame(lerGamepads);
  addEventListener('gamepadconnected', e => toast(`🎮 Controle conectado: ${e.gamepad.id.replace(/\(.*\)/, '').trim() || 'joystick'}`));
  const el = $('#joyPainel');
  // a tela de Ajustes → Joysticks: aberta = "só testar" ligado (dá para desligar); fechar os Ajustes volta ao normal
  new MutationObserver(() => {
    const aberto = !!el.offsetParent;
    if (aberto === JOY.painel) return;
    JOY.painel = aberto;
    if (aberto) { JOY.testar = true; JOY.pads.forEach((p, n) => p && soltarTudo(n)); renderJoyPainel(); }
  }).observe($('#dlgAjustes'), { attributes: true, subtree: true, attributeFilter: ['class', 'open'] });
  el.addEventListener('click', e => {
    const pa = e.target.closest('[data-joyperfilacao]');
    if (pa) return acaoJoyPerfil(pa.dataset.joyperfilacao);
    const aba = e.target.closest('[data-joyaba]');
    if (aba) { JOY.aba = +aba.dataset.joyaba; return renderJoyPainel(); }
    if (e.target.closest('[data-joypadrao]') && confirm(`Voltar o Joystick ${(JOY.aba || 0) + 1} ao padrão?`)) {
      S.config.joysticks[JOY.aba || 0] = JOY_PADRAO(); salvarConfig(); return renderJoyPainel();
    }
    const peca = e.target.closest('[data-jb]');
    if (peca) {
      const i = +peca.dataset.jb, alvo = el.querySelector(`[data-jbl="${SETAS_JOY.includes(i) && cfgJoy(JOY.aba || 0).setas ? 12 : i}"]`);
      if (alvo) { alvo.scrollIntoView({ block: 'center', behavior: 'smooth' }); alvo.classList.add('piscar'); setTimeout(() => alvo.classList.remove('piscar'), 1200); alvo.querySelector('select')?.focus(); }
    }
  });
  // os números das réguas de velocidade mudam enquanto arrasta
  el.addEventListener('input', e => {
    const k = e.target.dataset.joycfg, b = k && el.querySelector(`[data-joyvalor="${k}"]`);
    if (b) b.textContent = k === 'velMov' ? Math.round(+e.target.value * 100) + '%' : e.target.value + ' de 7';
  });
  el.addEventListener('change', e => {
    const cfg = cfgJoy(JOY.aba || 0), t = e.target;
    if (t.matches('[data-joyperfil]')) { if (t.value) aplicarJoyPerfil(t.value); return; }
    if (t.matches('[data-joytestar]')) { JOY.testar = t.checked; JOY.pads.forEach((p, n) => p && soltarTudo(n)); return; }
    if (t.dataset.joycfg) { cfg[t.dataset.joycfg] = ['folga', 'velMov', 'velZoom'].includes(t.dataset.joycfg) ? +t.value : t.value; if (t.dataset.joycfg === 'camera') JOY.est[JOY.aba || 0].alvo = null; }
    const row = t.closest('[data-jbl]'), i = row ? +row.dataset.jbl : -1;
    if (t.dataset.joyacao) { cfg.botoes = cfg.botoes || {}; cfg.botoes[+t.dataset.joyacao] = { acao: t.value, ...(t.value === 'pos' ? { n: 1 } : {}) }; }
    if (t.matches('[data-joyn]')) cfg.botoes[i].n = +t.value;
    if (t.matches('[data-joycam]')) cfg.botoes[i].cam = t.value;
    if (t.matches('[data-joyposcam]')) cfg.botoes[i].porCam = { ...(cfg.botoes[i].porCam || {}), [t.dataset.joyposcam]: +t.value };
    if (t.matches('[data-joypreset]')) { const [cam, nn] = t.value.split(':'); Object.assign(cfg.botoes[i], { cam, n: +nn }); }
    salvarConfig();
    if (t.dataset.joyacao || t.dataset.joycfg === 'setas' || t.dataset.joycfg === 'camera') renderJoyPainel();
  });
}

