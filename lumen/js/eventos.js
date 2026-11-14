'use strict';
/*
 * (1.9) Aba 🎉 Eventos do MiguelAngelus.
 * Os eventos são os mesmos da Secretaria MiguelAngelus (pasta "eventos/" da nuvem, um arquivo por evento: sece-<id>).
 * Paróquia sem secretaria: o próprio MiguelAngelus cria e edita (o mesmo formulário da Secretaria, secretariacadastros.js).
 * No telão: um slide com o cartaz à esquerda e o QR grande à direita — quem aponta a câmera do celular salva o evento na agenda.
 * Dá para pôr no roteiro (item "evento"), por exemplo junto dos Avisos.
 * Marcações e intenções (dados pessoais) nunca chegam aqui: só os eventos.
 */

// imagens do slide já montadas (o desenho é assíncrono e gerarSlides não): chave = evento + versão + cores do tema
const EvMA = { imgs: {}, gerando: {} };

const eventoDe = it => Ev.lista.find(e => e.id === it?.eventoId) || null;
const chaveImgEvento = e => `${e.id}:${e.versao || e.alterado || e.criado || 0}:${S.config.corFundo || ''}:${S.config.corTexto || ''}`;

// eventos que um item usa: "evento" (um) ou "eventos" (Apresentar eventos: os marcados, na ordem da data)
function eventosDoItem(it) {
  if (it?.tipo === 'evento') return eventoDe(it) ? [eventoDe(it)] : [];
  if (it?.tipo !== 'eventos') return [];
  const ids = new Set(it.eventoIds || []);
  return Ev.lista.filter(e => ids.has(e.id)).sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
}

// o slide de um evento: a imagem pronta; enquanto ela é montada (1 a 2 s), o título e a data
function slideDoEvento(e) {
  const k = chaveImgEvento(e);
  if (EvMA.imgs[k]) return { img: EvMA.imgs[k], layout: 'so', escurecer: 0, texto: '', rodape: '' };
  if (!EvMA.gerando[k]) {
    EvMA.gerando[k] = imagemEvento(e).then(url => {
      EvMA.imgs[k] = url;
      delete EvMA.gerando[k];
      if (S.atual && eventosDoItem(S.atual.item).includes(e)) atualizarSlides();
      // no ar com o texto provisório: troca pela imagem, sem mexer na contagem da apresentação
      const L = S.live;
      if (L.item && L.idx >= 0 && eventosDoItem(L.item)[L.idx] === e && !L.slide?.img) {
        L.slide = gerarSlides(L.item)[L.idx];
        enviar({ tipo: 'slide', slide: L.slide, direto: true });
      }
    }).catch(() => { delete EvMA.gerando[k]; });
  }
  return { texto: `${e.titulo}\n${quandoEvento(e)}`, rodape: 'Evento' };
}

// slides do item "evento" (app.js → gerarSlidesBase)
function slidesEvento(item) {
  const e = eventoDe(item);
  return e ? [slideDoEvento(e)] : [];
}

function resumoEvento(it) {
  const e = eventoDe(it);
  return { rot: 'Evento', tit: e ? `${e.titulo} · ${dataBR(e.data)}` : 'escolher evento…', vazio: !e };
}

const eventosPorVir = (passados = false) => {
  const hoje = hojeIso();
  return Ev.lista.filter(e => passados || (e.dataFim || e.data) >= hoje)
    .sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
};

// Cabeçalho do item (centro): no roteiro escolhe o evento; aberto pela aba mostra o título
function htmlCabEvento(it, noRoteiro, btnAdd) {
  const e = eventoDe(it);
  const opcoes = () => {
    const lista = eventosPorVir();
    if (e && !lista.includes(e)) lista.unshift(e);
    return `<option value="" ${e ? '' : 'selected'} disabled>— escolha o evento —</option>` +
      lista.map(x => `<option value="${x.id}" ${x === e ? 'selected' : ''}>${esc(dataBR(x.data))} · ${esc(x.titulo)}</option>`).join('');
  };
  return `<div class="cab-linha"><span class="tag t-evento">Evento</span>
      ${noRoteiro ? `<select data-campo="eventoId">${opcoes()}</select>` : `<h2>${esc(e?.titulo || 'Evento apagado')}</h2>`}
      ${e ? `<span class="sutil">${esc(quandoEvento(e))}</span>` : ''}
      <span class="espaco"></span>
      ${e ? `<button data-cmd="eventoEditar" title="Mudar título, data, local, descrição ou cartaz">✎ Editar</button>
      <button data-cmd="eventoImagem" title="Uma imagem Full HD com o cartaz e o QR, gravada na pasta de imagens do Holyrics">🖼 Holyrics</button>
      <button data-cmd="eventoImprimir" title="Folha A4 com o cartaz e o QR grande, para o mural (ou PDF)">🖨 Mural</button>` : ''}
      ${btnAdd}</div>
    <p class="sutil pequeno" style="margin:0">No telão: o cartaz e o QR. Quem aponta a câmera do celular para o QR salva o evento na agenda (Android e iPhone).</p>`;
}

// ---------- o formulário (o mesmo da Secretaria), criado na primeira vez que for usado ----------
function garantirDlgEventos() {
  if ($('#dlgEventos')) return;
  document.body.insertAdjacentHTML('beforeend', HTML_EVENTOS);
  ligarEventosSec();
}

async function abrirEventoNoForm(e) {
  garantirDlgEventos();
  await abrirEventos();
  abrirFormEv(e || null);
}

// imagem para o Holyrics e folha do mural do evento aberto no centro
async function comandoEvento(cmd, it) {
  const e = eventoDe(it);
  if (cmd === 'eventoEditar') return abrirEventoNoForm(e);
  if (!e) return;
  garantirDlgEventos();
  Ev.editando = e.id;
  if (cmd === 'eventoImagem') { $('#evPrevia').innerHTML = ''; return gerarImagemEvento(); }
  if (cmd === 'eventoImprimir') return imprimirEvento();
}

// ---------- a aba ----------
function renderAbaEventos() {
  const el = $('#listaEventos');
  if (!el) return;
  const passados = $('#evAbaPassados')?.checked;
  const lista = eventosPorVir(passados), hoje = hojeIso();
  const aberto = S.atual?.item.tipo === 'evento' ? S.atual.item.eventoId : null;
  el.innerHTML = lista.length ? lista.map(e => `
    <div class="ev-item ${e.id === aberto ? 'editando' : ''} ${(e.dataFim || e.data) < hoje ? 'passado' : ''}" data-ev="${e.id}" title="Clique para abrir no centro (e projetar)">
      ${e.cartaz ? `<img src="${e.cartaz}" alt="">` : '<span class="ev-sem">🎉</span>'}
      <span class="ev-txt"><b>${esc(e.titulo)}</b><small class="sutil">${esc(quandoEvento(e))}${localDoEvento(e) ? ' · ' + esc(localDoEvento(e)) : ''}</small></span>
    </div>`).join('')
    : `<p class="sutil">${Ev.lista.length ? 'Nenhum evento por vir.' : 'Nenhum evento ainda. Clique em ＋ Novo evento, ou faça na Secretaria MiguelAngelus: chega pela nuvem.'}</p>`;
}

function abrirEventoNoCentro(id) {
  abrirItem({ id: uid(), tipo: 'evento', eventoId: id });
  renderAbaEventos();
}

// chamado depois de salvar/apagar um evento ou de chegar coisa da nuvem (secretariacadastros.js → aposMudarEventos)
function aposMudarEventosMA() {
  renderAbaEventos();
  const a = S.atual;
  const comEvento = it => it && ['evento', 'eventos'].includes(it.tipo);
  if (comEvento(a?.item) || S.roteiro?.itens.some(comEvento)) {
    try { renderRoteiroLista(); } catch (_) {}
  }
  if (a?.item.tipo === 'eventos') { atualizarSlides(); renderCabecalho(); return; }
  if (a?.item.tipo === 'evento') {
    if (!eventoDe(a.item) && a.rIdx < 0) { S.atual = null; renderCabecalho(); renderSlides(); return; }
    atualizarSlides(); renderCabecalho();
  }
}

async function iniciarEventosMA() {
  const sec = $('#aba-eventos');
  if (!sec) return;
  $('#btnNovoEvento').addEventListener('click', () => abrirEventoNoForm(null));
  $('#btnGerenciarEventos').addEventListener('click', async () => { garantirDlgEventos(); await abrirEventos(); });
  $('#evAbaPassados').addEventListener('change', renderAbaEventos);
  $('#listaEventos').addEventListener('click', e => { const it = e.target.closest('[data-ev]'); if (it) abrirEventoNoCentro(it.dataset.ev); });
  // "Apresentar eventos": marcar/desmarcar os eventos, todos ou nenhum
  $('#itemCab').addEventListener('change', e => {
    const id = e.target.dataset?.showEv;
    if (id === undefined || S.atual?.item.tipo !== 'eventos') return;
    const it = S.atual.item, ids = new Set(it.eventoIds || []);
    if (e.target.checked) ids.add(id); else ids.delete(id);
    it.eventoIds = [...ids];
    aposMudarShow(false);
  });
  $('#itemCab').addEventListener('click', e => {
    if (e.target.closest('[data-show-audio-arq]') && S.atual?.item.tipo === 'eventos') return escolherArquivoAudioShow(S.atual.item);
    const b = e.target.closest('[data-show-todos]');
    if (!b || S.atual?.item.tipo !== 'eventos') return;
    S.atual.item.eventoIds = b.dataset.showTodos === '1' ? eventosPorVir().map(x => x.id) : [];
    aposMudarShow(true);
  });
  await carregarEventos();
  renderAbaEventos();
  // vira o dia: os que passaram saem da lista
  setInterval(renderAbaEventos, 30 * 60 * 1000);
}

// ======================================================================
// (1.9) Item de roteiro "🎉 Apresentar eventos": os eventos marcados, um slide cada (cartaz + QR), passando sozinhos.
// Cada slide fica `segundos` no telão. No último: recomeça do primeiro (repetir) ou para nele.
// A contagem pausa com o telão congelado e acaba se o operador projetar outra coisa, limpar ou apagar o telão.
// ======================================================================
const Show = { timer: 0, item: null, idx: -1, fim: 0, audioItem: null, audioId: null, fade: 0 };
const segundosShow = it => Math.min(600, Math.max(3, Math.round(+it.segundos || 10)));

function slidesShowEventos(item) { return eventosDoItem(item).map(slideDoEvento); }

function resumoShowEventos(it) {
  const n = eventosDoItem(it).length;
  return { rot: 'Eventos', tit: `${it.titulo || 'Apresentar eventos'} · ${n} evento${n === 1 ? '' : 's'} · ${segundosShow(it)} s${it.repetir ? ' · ↻' : ''}${it.audioId ? ' · 🎵' : ''}`, vazio: !n };
}

function htmlCabShowEventos(it) {
  const marcados = new Set(it.eventoIds || []), hoje = hojeIso();
  // os por vir e os já marcados que passaram (para poder desmarcar)
  const lista = eventosPorVir();
  for (const e of Ev.lista) if (marcados.has(e.id) && !lista.includes(e)) lista.push(e);
  lista.sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
  return `<div class="cab-linha"><span class="tag t-eventos">Eventos</span>
      <input data-campo="titulo" class="estreito" value="${esc(it.titulo || '')}" placeholder="Apresentar eventos" title="Nome no roteiro (não aparece no telão)">
      <label class="check" title="Quanto tempo cada evento fica no telão antes de passar para o próximo">Cada slide
        <input type="number" data-campo="segundos" min="3" max="600" step="1" value="${segundosShow(it)}" style="width:70px"> s</label>
      <label class="check" title="Marcado: depois do último evento, volta para o primeiro (fica rodando). Desmarcado: para no último."><input type="checkbox" data-campo="repetir" ${it.repetir ? 'checked' : ''}> ↻ Recomeçar do início ao terminar</label>
      <span class="espaco"></span><span id="showStatus" class="sutil pequeno"></span></div>
    <div class="cab-linha">
      <label class="check" title="Música que toca neste computador enquanto os eventos passam. Para (abaixando devagar) quando as imagens acabam, ou se você projetar outra coisa, usar Limpar ou apagar o telão.">🎵 Som
        <select data-campo="audioId" style="max-width:260px">${opcoesAudioShow(it.audioId || '')}</select></label>
      <button type="button" data-show-audio-arq title="Escolher um arquivo de áudio do computador (ele fica guardado na aba Áudios)">📂 Arquivo de áudio…</button>
      ${grupoLoop(it).length ? `<span class="sutil pequeno" title="Itens seguidos marcados para repetir passam um depois do outro e o conjunto recomeça">🔁 Repete em grupo: ${grupoLoop(it).map(nomeItemGrupo).map(esc).join(' → ')} → (volta)</span>` : ''}
    </div>
    <div class="cab-linha show-evs">
      ${lista.length ? lista.map(e => `<label class="check show-ev ${(e.dataFim || e.data) < hoje ? 'passado' : ''}" title="${esc(quandoEvento(e))}${localDoEvento(e) ? ' · ' + esc(localDoEvento(e)) : ''}">
        <input type="checkbox" data-show-ev="${e.id}" ${marcados.has(e.id) ? 'checked' : ''}>
        ${e.cartaz ? `<img src="${e.cartaz}" alt="">` : '🎉'} ${esc(dataBR(e.data).slice(0, 5))} · ${esc(e.titulo)}</label>`).join('')
        : '<span class="sutil">Nenhum evento por vir. Cadastre na aba 🎉 Eventos (ou na Secretaria).</span>'}
      ${lista.length > 1 ? `<span class="espaco"></span><button type="button" data-show-todos="1">Marcar todos</button><button type="button" data-show-todos="0">Nenhum</button>` : ''}
    </div>
    <p class="sutil pequeno" style="margin:0">Clique no primeiro slide para começar: os outros passam sozinhos. Para parar, projete outra coisa ou use Limpar.</p>`;
}

function aposMudarShow(cab) {
  if (S.atual.rIdx >= 0) { salvarRoteiro(); renderRoteiroLista(); }
  atualizarSlides();
  if (cab) renderCabecalho();
}

// pausa só a contagem (entre um slide e outro); encerrarShow também abaixa e para o som da apresentação
function pararShow() { clearInterval(Show.timer); Show.timer = 0; Show.item = null; Show.idx = -1; mostrarStatusShow(''); }
function encerrarShow() { pararShow(); pararAudioShow(); }
function mostrarStatusShow(t) { const el = $('#showStatus'); if (el) el.textContent = t; }

// chamado no fim de projetar() (app.js): projetou um slide do "Apresentar eventos" → conta o tempo dele
function aoProjetarShow() {
  pararShow();
  const L = S.live, it = L.item;
  if (!it || it.tipo !== 'eventos' || L.idx < 0) return pararAudioShow();   // projetou outra coisa: o som da apresentação para
  if (Show.audioItem && Show.audioItem !== it) pararAudioShow();
  const n = (S.atual?.item === it ? S.atual.slides : gerarSlides(it)).length;
  if (!n) return;
  const emGrupo = grupoLoop(it).length > 0;
  if (n < 2 && !emGrupo && !it.audioId) return;           // um evento só, sem som e sem grupo: fica parado no telão
  tocarAudioShow(it);
  Show.item = it; Show.idx = L.idx; Show.fim = Date.now() + segundosShow(it) * 1000;
  Show.timer = setInterval(passoShow, 500);
  passoShow();
}

function passoShow() {
  const L = S.live, it = Show.item;
  if (!it || L.item !== it || L.idx !== Show.idx || L.preto) return encerrarShow();   // o operador mudou o telão
  if (S.congelado) { Show.fim += 500; return mostrarStatusShow('❄ Telão congelado: a apresentação espera.'); }
  const slides = S.atual?.item === it ? S.atual.slides : gerarSlides(it), n = slides.length;
  const ultimo = Show.idx + 1 >= n, depois = ultimo ? proximoDoGrupo(it) : null;
  const falta = Math.ceil((Show.fim - Date.now()) / 1000);
  if (falta > 0) return mostrarStatusShow(`▶ Passando sozinho: ${Show.idx + 1} de ${n} · ` +
    (depois ? `depois: 🔁 ${nomeItemGrupo(depois)} em ${falta} s` : ultimo && !it.repetir ? `fim em ${falta} s` : `próximo em ${falta} s`));
  if (depois) { encerrarShow(); iniciarItemDoGrupo(depois, it); return; }   // repetir em grupo: chama o item seguinte
  if (ultimo && !it.repetir) { encerrarShow(); return mostrarStatusShow(`■ Fim: o último evento (${n} de ${n}) fica no telão.`); }
  const prox = ultimo ? 0 : Show.idx + 1;
  if (S.atual?.item === it) return projetar(prox);         // projetar → aoProjetarShow conta o próximo
  porNoTelao(it, slides, prox);
}

// o operador está vendo outro item no centro: a apresentação continua no telão sem mexer no centro
function porNoTelao(it, slides, idx) {
  S.live = { slide: slides[idx], preto: false, item: it, idx };
  enviar({ tipo: 'slide', slide: S.live.slide });
  enviar({ tipo: 'preto', on: false });
  renderRoteiroLista(); renderControles();
  aoProjetarShow();
}

// ---------- 🎵 Som da apresentação: toca enquanto os eventos passam e para quando as imagens acabam ----------
function opcoesAudioShow(sel) {
  const opt = m => `<option value="${esc(m.id)}" ${m.id === sel ? 'selected' : ''}>${esc(m.pasta ? m.caminho : m.nome)}</option>`;
  const pasta = (Midia.pastas.audio?.arquivos || []).filter(m => !m.faltando).sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt-BR', { numeric: true }));
  const guardados = Midia.lista.filter(m => m.tipo === 'audio').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const m = sel ? midiaPorId(sel) : null;
  const sumido = sel && (!m || m.faltando) ? `<option value="${esc(sel)}" selected>(áudio não encontrado neste computador)</option>` : '';
  return `<option value="">— sem som —</option>${sumido}` +
    (pasta.length ? `<optgroup label="Áudios (pasta)">${pasta.map(opt).join('')}</optgroup>` : '') +
    (guardados.length ? `<optgroup label="Áudios guardados">${guardados.map(opt).join('')}</optgroup>` : '');
}

// 📂 Arquivo…: escolhe um áudio do computador; ele fica guardado em Áudios (como no botão "+ Adicionar") e entra na apresentação
function escolherArquivoAudioShow(it) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'audio/*,.mp3,.m4a,.wav,.ogg,.aac,.wma,.flac';
  inp.addEventListener('change', async () => {
    const f = inp.files[0];
    if (!f) return;
    const igual = m => m.tipo === 'audio' && m.arquivo === f.name && m.tamanho === f.size;
    let m = Midia.lista.find(igual);                      // já guardado: não guarda de novo
    if (!m) { await adicionarMidias([f]); m = Midia.lista.filter(igual).pop(); }
    if (!m) return toast(`"${f.name}" não parece ser um áudio que o programa consiga tocar.`);
    if (S.atual?.item !== it) return;
    it.audioId = m.id;
    aposMudarShow(true);
    toast(`🎵 "${m.nome}" vai tocar durante a apresentação.`);
  });
  inp.click();
}

function tocarAudioShow(it) {
  if (Show.audioItem === it) return;                      // já começou nesta apresentação (o operador pode ter pausado de propósito)
  const m = it.audioId ? midiaPorId(it.audioId) : null;
  if (!m || m.tipo !== 'audio') return;
  if (m.faltando || (!m.blob && !m.url)) return toast(`🎵 "${m.nome || m.caminho}" não está neste computador: a apresentação segue sem som.`);
  clearInterval(Show.fade);
  Show.audioItem = it; Show.audioId = m.id;
  const a = Midia.audio;
  if (Midia.audioId === m.id && !a.paused) { a.loop = true; a.volume = volumeMidia(); return; }   // já estava tocando: segue
  tocarPausar(m, { loop: true });                         // em volta: se a música for mais curta que a apresentação, recomeça
  a.loop = true;
}

// abaixa devagar (1,2 s) e para; só mexe se ainda é o som que a apresentação pôs para tocar
function pararAudioShow() {
  const id = Show.audioId;
  Show.audioItem = null; Show.audioId = null;
  if (!id || Midia.audioId !== id) return;
  const a = Midia.audio, v0 = a.volume;
  let k = 0;
  clearInterval(Show.fade);
  Show.fade = setInterval(() => {
    if (Midia.audioId !== id || Show.audioId === id) return clearInterval(Show.fade);   // outro som, ou a apresentação voltou
    a.volume = Math.max(0, v0 * (1 - ++k / 12));
    if (k >= 12) { clearInterval(Show.fade); pararAudio(); a.volume = volumeMidia(); }
  }, 100);
}

// ======================================================================
// (1.9) 🔁 Repetir em grupo: itens SEGUIDOS do roteiro marcados para repetir (vídeo com "Repetir",
// "Apresentar eventos" com ↻) formam um grupo. Cada um passa uma vez e chama o seguinte; depois do último
// volta ao primeiro. Um item marcado sozinho continua repetindo só ele, como antes.
// ======================================================================
function repeteNoGrupo(it) {
  if (!it) return false;
  if (it.tipo === 'eventos') return !!it.repetir && eventosDoItem(it).length > 0;
  if (it.tipo === 'midia') return !!it.loop && midiaDe(it)?.tipo === 'video';
  return false;
}

// grupo (2 itens ou mais) em que o item está; [] se está fora de grupo
function grupoLoop(it) {
  const itens = S.roteiro?.itens || [], i = itens.indexOf(it);
  if (i < 0 || !repeteNoGrupo(it)) return [];
  let a = i, b = i;
  while (a > 0 && repeteNoGrupo(itens[a - 1])) a--;
  while (b + 1 < itens.length && repeteNoGrupo(itens[b + 1])) b++;
  return b > a ? itens.slice(a, b + 1) : [];
}

// marca de cada posição do roteiro para a lista: '' (fora de grupo), 'ini', 'meio', 'fim'
function marcasGrupoLoop(itens) {
  const r = itens.map(() => '');
  for (let i = 0; i < itens.length;) {
    if (!repeteNoGrupo(itens[i])) { i++; continue; }
    let j = i;
    while (j + 1 < itens.length && repeteNoGrupo(itens[j + 1])) j++;
    if (j > i) for (let k = i; k <= j; k++) r[k] = k === i ? 'ini' : k === j ? 'fim' : 'meio';
    i = j + 1;
  }
  return r;
}

const proximoDoGrupo = it => { const g = grupoLoop(it); return g.length ? g[(g.indexOf(it) + 1) % g.length] : null; };
// no grupo o vídeo passa uma vez só (quem repete é o grupo); sozinho, repete como antes
const loopDoVideo = it => !!it?.loop && !grupoLoop(it).length;
const nomeItemGrupo = it => it.tipo === 'eventos' ? `🎉 ${it.titulo || 'Apresentar eventos'}`
  : (it.tipo === 'midia' ? '🎬 ' : '') + tirarMarcas(resumoItem(it).tit || resumoItem(it).rot || '');

// o vídeo do grupo terminou sozinho (receberStatusMidia, midia.js)
function aoAcabarVideoGrupo(it) {
  const prox = proximoDoGrupo(it);
  if (prox) iniciarItemDoGrupo(prox, it);
}

// põe no telão o próximo item do grupo. O centro acompanha só se o operador estava vendo o item que acabou.
function iniciarItemDoGrupo(it, deItem) {
  if (S.congelado) { toast('❄ Telão congelado: o grupo que se repete parou aqui.'); return false; }
  const rIdx = S.roteiro.itens.indexOf(it);
  if (rIdx < 0) return false;
  const seguir = S.atual?.item === deItem;
  if (it.tipo === 'midia') {
    const m = midiaDe(it);
    if (!m || m.faltando || (!m.blob && !m.url)) { toast(`🔁 "${nomeItemGrupo(it)}" não está neste computador: o grupo parou.`); return false; }
    if (seguir) abrirItem(it, rIdx);
    Midia.video.ativo = false;                              // começa do início, mesmo se for o mesmo vídeo
    tocarPausar(m, it);
    return true;
  }
  if (it.tipo === 'eventos') {
    if (seguir) { abrirItem(it, rIdx); projetar(0); return true; }
    const slides = gerarSlides(it);
    if (!slides.length) return false;
    porNoTelao(it, slides, 0);
    return true;
  }
  return false;
}
