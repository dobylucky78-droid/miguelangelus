'use strict';
/*
 * Câmera no telão (módulo Mídia → ＋ Câmera).
 * Câmeras NDI chegam pelo "NDI Webcam" (NDI Tools), que as transforma em webcams do Windows
 * ("NDI Webcam Video 1"…); webcams comuns também servem. A câmera aparece no telão em tela cheia;
 * com "Letra por cima" ligada, os slides passam a aparecer numa faixa na parte de baixo, sem tirar a câmera.
 * Guardadas no store "midias" com tipo 'camera' (só o nome do dispositivo; nada de vídeo é gravado).
 * Usa S, Midia, enviar, midiaDe, abrirItem, renderMidias, toast, esc, uid, DB… (em tempo de execução).
 */

const Camera = { ativa: null, letra: false, previa: null, previaId: null };

const cameraDe = it => { const m = midiaDe(it); return m?.tipo === 'camera' ? m : null; };
const ehCamera = it => it?.tipo === 'midia' && !!cameraDe(it);

async function listarCameras() {
  let lista = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
  if (lista.length && !lista[0].label) {
    // os nomes só aparecem depois da permissão de câmera (no aplicativo ela é automática).
    // Uma câmera sem imagem (ex.: NDI Webcam sem câmera escolhida) pode não responder: segue mesmo assim.
    try {
      const s = await Promise.race([navigator.mediaDevices.getUserMedia({ video: true }),
        new Promise((_, falha) => setTimeout(() => falha(new Error('tempo')), 6000))]);
      s.getTracks().forEach(t => t.stop());
    } catch (_) {}
    lista = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
  }
  return lista.map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Câmera ${i + 1}` }));
}

async function novaCamera() {
  let lista;
  try { lista = await listarCameras(); }
  catch (e) { return alert('Não consegui acessar as câmeras deste computador.\n' + e.message); }
  if (!lista.length) return alert('Nenhuma câmera encontrada.\n\nPara câmeras NDI: abra o "NDI Webcam" (vem no NDI Tools), escolha a câmera NDI e tente de novo.');
  $('#camDispositivo').innerHTML = lista.map(d => `<option value="${esc(d.label)}" data-id="${esc(d.deviceId)}">${esc(d.label)}</option>`).join('');
  $('#camNome').value = lista[0].label.replace(/^NDI Webcam Video/i, 'Câmera NDI');
  abrirDialogo('dlgCamera');
}

async function salvarNovaCamera() {
  const rotulo = $('#camDispositivo').value;
  if (!rotulo) return;
  const dispositivo = $('#camDispositivo').selectedOptions[0]?.dataset.id || '';
  const c = { id: uid(), tipo: 'camera', nome: $('#camNome').value.trim() || rotulo, rotulo, dispositivo, criado: Date.now() };
  await DB.salvar('midias', c);
  Midia.lista.push(c);
  renderMidias();
  abrirItem({ tipo: 'midia', midiaId: c.id, loop: false });
}

// Trocar o nome (ex.: "Câmera NDI 1" → "Câmera do altar"): o dispositivo (rótulo do NDI/webcam) continua o mesmo
async function renomearCamera(c) {
  const nome = (prompt('Nome da câmera (ex.: Câmera do altar, Câmera do coro):', c.nome) || '').trim();
  if (!nome || nome === c.nome) return;
  c.nome = nome;
  await DB.salvar('midias', c);
  if (typeof renderMidias === 'function') renderMidias();
  renderCameraAtiva();
  renderCabecalho(); renderSlides();
  if (typeof agendarEstadoCelular === 'function') agendarEstadoCelular();
}

// ---------- Centro: prévia local + botões ----------

function htmlCamera(it) {
  const c = cameraDe(it), noAr = Camera.ativa === c.id;
  return `<div class="player camera" data-id="${c.id}">
    <div class="pl-topo"><span class="tag t-midia">Câmera</span><span class="sutil">${esc(c.rotulo)}</span></div>
    <div class="pl-nome">${esc(c.nome)} <button class="pl-renomear" data-cam="renomear" title="Trocar o nome da câmera">✎</button></div>
    <video id="camPrevia" class="cam-previa" autoplay muted playsinline></video>
    <div class="pl-botoes">
      <button class="primario grande" data-cam="mostrar">${noAr ? '📷 No telão' : '📷 Mostrar no telão'}</button>
      <button class="grande" data-cam="parar" ${noAr ? '' : 'disabled'}>■ Tirar do telão</button>
    </div>
    <label class="check"><input type="checkbox" data-cam="letra" ${Camera.letra ? 'checked' : ''}> Letra por cima (faixa na parte de baixo)</label>
    <p class="sutil pequeno">Com a câmera no telão: ligada, os slides aparecem numa faixa embaixo, por cima da câmera;
      desligada, clicar num slide tira a câmera e mostra o slide. Para câmeras NDI, o <b>NDI Webcam</b> (NDI Tools) precisa estar aberto.</p>
    ${typeof htmlPtz === 'function' ? htmlPtz(c) : ''}
  </div>`;
}

async function iniciarPrevia(c) {
  // a tela do centro é redesenhada a toda hora: reaproveita a câmera já aberta em vez de abrir de novo
  if (Camera.previa && Camera.previaId === c.id) { const v = $('#camPrevia'); if (v) v.srcObject = Camera.previa; return; }
  pararPrevia();
  Camera.previaId = c.id;
  try {
    const lista = await listarCameras();
    const d = lista.find(x => x.label === c.rotulo) || lista.find(x => x.deviceId === c.dispositivo);
    if (!d) throw new Error('câmera não encontrada (o NDI Webcam está aberto?)');
    Camera.previa = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: d.deviceId } }, audio: false });
    const v = $('#camPrevia');
    if (v) v.srcObject = Camera.previa; else pararPrevia();
  } catch (e) { toast('Prévia da câmera: ' + e.message); }
}

function pararPrevia() {
  if (Camera.previa) { Camera.previa.getTracks().forEach(t => t.stop()); Camera.previa = null; }
  Camera.previaId = null;
}

// ---------- Telão ----------

// Câmera NDI precisa do "NDI Webcam" (NDI Tools) aberto: o programa abre sozinho se estiver fechado.
// Ao abrir o MiguelAngelus (se houver câmera NDI cadastrada) e ao pôr uma câmera NDI no telão.
const ehCameraNdi = c => /ndi/i.test(`${c?.rotulo || ''} ${c?.nome || ''}`);
function garantirNdiWebcam(avisar) {
  if (!NO_APP) return;
  Camera.avisarNdi = !!avisar;
  window.chrome.webview.postMessage({ tipo: 'ndiWebcam' });
}

function mostrarCamera(c, it) {
  if (ehCameraNdi(c)) garantirNdiWebcam(true);
  Camera.ativa = c.id;
  if (typeof PTZ !== 'undefined') PTZ.alvo = null;   // o joystick volta a seguir a câmera do telão
  S.live = { slide: null, preto: false, item: it || null, idx: -1 };
  enviar({ tipo: 'slide', slide: null });
  enviar({ tipo: 'preto', on: false });
  enviarConfigTelao(); renderTemasRapidos();      // câmera no telão = tema Escuro (temas.js)
  enviar({ tipo: 'camera', acao: 'mostrar', rotulo: c.rotulo, dispositivo: c.dispositivo, letra: Camera.letra });
  renderCameraAtiva(); renderSlides(); renderRoteiroLista(); renderControles();
}

function pararCamera() {
  if (!Camera.ativa) return;
  Camera.ativa = null;
  enviar({ tipo: 'camera', acao: 'parar' });
  enviarConfigTelao(); renderTemasRapidos();      // volta o tema que estava
  renderCameraAtiva();
  if (ehCamera(S.atual?.item)) renderSlides();
}

function definirLetraCamera(on) {
  Camera.letra = !!on;
  S.config.cameraLetra = Camera.letra; salvarConfig();
  if (Camera.ativa) enviar({ tipo: 'camera', acao: 'letra', on: Camera.letra });
  renderCameraAtiva();
  const cb = $('#slides [data-cam="letra"]'); if (cb) cb.checked = Camera.letra;
}

// Um slide indo para o telão com a câmera no ar e sem "letra por cima": a câmera sai
function cameraAntesDoSlide(msg) {
  if (msg.tipo === 'slide' && msg.slide && Camera.ativa && !Camera.letra) pararCamera();
}

function enviarEstadoCamera(w) {
  const c = Midia.lista.find(m => m.id === Camera.ativa);
  if (c) enviar({ tipo: 'camera', acao: 'mostrar', rotulo: c.rotulo, dispositivo: c.dispositivo, letra: Camera.letra }, [w]);
}

// Quadro "Câmeras" na tela principal (aparece quando há câmeras em Mídia): pôr/tirar do telão sem ir até Mídia
function renderCameraAtiva() {
  const el = $('#cameraAtiva');
  const cams = Midia.lista.filter(m => m.tipo === 'camera').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  el.hidden = !cams.length;
  if (!cams.length) return;
  const ativa = cams.find(c => c.id === Camera.ativa);
  const fechado = Recolher.fechado('quadro:cameras', false);
  el.classList.toggle('no-ar', !!ativa);
  // com joystick conectado, marca 🎮 a câmera que ele está controlando (Select troca)
  const joy = typeof PTZ !== 'undefined' && PTZ.pad ? cameraPtzAlvo()?.id : null;
  el.innerHTML = `<button class="toc-tit cam-cab" data-camativa="recolher" title="Recolher / expandir">
      <span class="seta">${fechado ? '▸' : '▾'}</span>📷 Câmeras${ativa ? ` · <span class="cam-noar">● ${esc(ativa.nome)} no telão</span>` : ''}</button>
    ${fechado ? '' : `<div class="cam-lista">${cams.map(c => `
      <button class="cam-bt ${c.id === Camera.ativa ? 'ativa' : ''}" data-camquadro="${c.id}" title="${c.id === Camera.ativa ? 'No telão' : 'Mostrar no telão'}">
        ${c.id === Camera.ativa ? '●' : '📷'} ${esc(c.nome)}${c.id === joy ? '<span class="cam-joy" title="O joystick está controlando esta câmera (Select troca)">🎮</span>' : ''}</button>`).join('')}</div>
    ${cams.filter(c => c.ptz?.ip && c.ptzPosicoes?.length).map(c => `<div class="cam-ptz" title="Posições prontas da câmera PTZ (um clique leva a câmera até lá)">
      <span class="sutil pequeno">🎮 ${esc(c.nome)}:</span>${c.ptzPosicoes.slice().sort((a, b) => a.n - b.n).map(p => `<button data-ptzquadro="${c.id}:${p.n}">${esc(p.nome)}</button>`).join('')}</div>`).join('')}
    <div class="toc">
      <label class="check" title="Letra dos slides numa faixa embaixo, por cima da câmera"><input type="checkbox" data-camativa="letra" ${Camera.letra ? 'checked' : ''}> Letra por cima</label>
      <span class="toc-nome"></span>
      <button data-camativa="parar" ${ativa ? '' : 'disabled'} title="Tirar a câmera do telão">✕ Tirar do telão</button></div>`}`;
}

function ligarCamera() {
  Camera.letra = !!S.config.cameraLetra;
  $('#btnNovaCamera').addEventListener('click', novaCamera);
  $('#dlgCamera form').addEventListener('submit', e => { if (e.submitter?.value === 'ok') salvarNovaCamera(); });
  $('#slides').addEventListener('click', e => {
    const b = e.target.closest('button[data-cam]');
    const c = cameraDe(S.atual?.item);
    if (!b || !c) return;
    if (b.dataset.cam === 'mostrar') mostrarCamera(c, S.atual.item);
    else if (b.dataset.cam === 'parar') pararCamera();
    else if (b.dataset.cam === 'renomear') renomearCamera(c);
  });
  $('#slides').addEventListener('change', e => { if (e.target.dataset?.cam === 'letra') definirLetraCamera(e.target.checked); });
  $('#cameraAtiva').addEventListener('change', e => { if (e.target.dataset?.camativa === 'letra') definirLetraCamera(e.target.checked); });
  $('#cameraAtiva').addEventListener('click', e => {
    if (e.target.closest('[data-camativa="parar"]')) return pararCamera();
    if (e.target.closest('[data-camativa="recolher"]')) { Recolher.alternar('quadro:cameras'); return renderCameraAtiva(); }
    const b = e.target.closest('[data-camquadro]');
    const c = b && Midia.lista.find(m => m.id === b.dataset.camquadro);
    if (c && c.id !== Camera.ativa) mostrarCamera(c, null);
  });
  // a projeção avisa se não achou a câmera
  window.addEventListener('message', e => {
    if (e.data?.app === 'lumen' && e.data.tipo === 'cameraStatus' && e.data.erro && !e.data.preview) toast('Câmera no telão: ' + e.data.erro);
  });
  // NDI Webcam: abre junto com o MiguelAngelus quando há câmera NDI cadastrada
  if (NO_APP) {
    window.chrome.webview.addEventListener('message', e => {
      const est = e.data?.tipo === 'ndiWebcamStatus' ? e.data.estado : null;
      if (est === 'abrindo') toast('📷 Abrindo o NDI Webcam (para as câmeras NDI)…');
      else if (est === 'naoInstalado' && Camera.avisarNdi) toast('📷 O NDI Webcam não está instalado neste computador (vem no NDI Tools).');
    });
    if (Midia.lista.some(m => m.tipo === 'camera' && ehCameraNdi(m))) garantirNdiWebcam(false);
  }
}
