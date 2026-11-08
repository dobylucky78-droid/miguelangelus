'use strict';
/*
 * Player de áudio e vídeo.
 *  - Vídeo: toca na janela de projeção (com som) e na prévia "Ao vivo" (sem som).
 *    Projetar um slide tira o vídeo da tela.
 *  - Áudio: toca aqui, no computador do operador; dá para projetar textos enquanto toca.
 * Os arquivos ficam guardados no IndexedDB (store "midias") e não entram no backup.
 * As apresentações (apresentacoes.js) moram no mesmo store, com tipo 'apresentacao' — essas entram no backup.
 * Usa S, enviar, toast, esc, uid, semAcento... definidos em app.js (carregado depois; só são usados em tempo de execução).
 */

const EXT_MIDIA = /\.(mp4|m4v|webm|mov|mkv|ogv|mp3|m4a|aac|wav|ogg|oga|opus|flac)$/i;

const Midia = {
  lista: [],
  video: { id: null, t: 0, dur: 0, pausado: true, ativo: false },   // estado do vídeo no telão
  audio: new Audio(),
  audioId: null,
  arrastando: false,
};

const fmtTempo = s => {
  s = Math.max(0, Math.floor(+s || 0));
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
};
const fmtTamanho = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : (b / 1e6).toFixed(b >= 1e8 ? 0 : 1) + ' MB';

// ---------- Pastas de vídeos e áudios (só no aplicativo) ----------
// Cada computador escolhe a sua pasta (ex.: E:\Backup Holyrics\media\video, ou a mesma pasta dentro do Google Drive).
// O programa serve a pasta num endereço próprio; o arquivo é identificado pelo caminho dentro dela
// ("pasta:video:Comunhão/Ave Maria.mp4"), então os roteiros acham o mesmo arquivo em qualquer computador com as mesmas subpastas.
const HOST_MIDIA = { video: 'https://videos.miguelangelus.example/', audio: 'https://audios.miguelangelus.example/' };
const CFG_PASTA = { video: 'pastaVideos', audio: 'pastaAudios' };
Midia.tipoAba = 'video';
Midia.pastas = { video: null, audio: null };      // { raiz, arquivos, mapa, erro, lendo }
const idPasta = (tipo, caminho) => `pasta:${tipo}:${caminho}`;
const nomeSemExt = n => n.replace(/\.[^.]+$/, '');

function midiaDaPasta(id) {
  const m = /^pasta:(video|audio):(.+)$/.exec(id || '');
  if (!m) return null;
  const p = Midia.pastas[m[1]];
  return p?.mapa?.get(m[2]) || { id, tipo: m[1], pasta: true, faltando: true, caminho: m[2], arquivo: m[2].split('/').pop(), nome: nomeSemExt(m[2].split('/').pop()), duracao: 0 };
}
const midiaPorId = id => Midia.lista.find(m => m.id === id) || midiaDaPasta(id);
const midiaDe = it => midiaPorId(it?.midiaId);

async function lerPastaMidia(tipo) {
  if (!NO_APP) return;
  escutarRespostasSync();
  // Sem pasta escolhida: usa a do Holyrics, se o computador tiver (as capelas já recebem as mídias por ele)
  if (!S.config[CFG_PASTA[tipo]] && !Midia.sugeriu?.[tipo]) {
    (Midia.sugeriu ||= {})[tipo] = true;
    try {
      const r = await arqApp('midiaSugerir', { tipoMidia: tipo });
      if (r.pasta) { S.config[CFG_PASTA[tipo]] = r.pasta; salvarConfig(); toast(`${tipo === 'video' ? 'Vídeos' : 'Áudios'}: usando a pasta do Holyrics (${r.pasta}).`); }
    } catch (_) {}
  }
  const raiz = S.config[CFG_PASTA[tipo]];
  if (!raiz) return;
  const antes = Midia.pastas[tipo];
  Midia.pastas[tipo] = { raiz, arquivos: antes?.arquivos || [], mapa: antes?.mapa || new Map(), lendo: true };
  renderMidias();
  try {
    const r = await arqApp('midiaPasta', { tipoMidia: tipo, pasta: raiz });
    if (r.recarregar) {
      // pasta nova: o endereço dela só vale para páginas abertas depois → recarrega (uma vez) operador e telão
      if (S.projWin && !S.projWin.closed) try { S.projWin.location.reload(); } catch {}
      toast('Abrindo a pasta…');
      return setTimeout(() => location.reload(), 800);   // (dá tempo de os ajustes serem gravados)
    }
    const mapa = new Map();
    const arquivos = r.arquivos.map(a => {
      const nome = a.caminho.split('/').pop();
      const m = { id: idPasta(tipo, a.caminho), tipo, pasta: true, caminho: a.caminho, arquivo: nome, nome: nomeSemExt(nome),
        tamanho: a.tamanho, duracao: antes?.mapa?.get(a.caminho)?.duracao || 0,
        url: HOST_MIDIA[tipo] + a.caminho.split('/').map(encodeURIComponent).join('/') };
      mapa.set(a.caminho, m);
      return m;
    });
    Midia.pastas[tipo] = { raiz, arquivos, mapa };
  } catch (e) {
    Midia.pastas[tipo] = { raiz, arquivos: [], mapa: new Map(), erro: e.message };
  }
  renderMidias(); renderRoteiroLista();
  if (S.atual?.item.tipo === 'midia') { renderCabecalho(); renderSlides(); }
}

async function escolherPastaMidia() {
  const tipo = Midia.tipoAba;
  if (!NO_APP) return alert('As pastas de vídeos e áudios funcionam só no aplicativo MiguelAngelus para Windows.');
  escutarRespostasSync();
  try {
    const r = await arqApp('midiaEscolherPasta', { tipoMidia: tipo });
    if (!r.pasta) return;
    S.config[CFG_PASTA[tipo]] = r.pasta;
    salvarConfig();
    Midia.pastas[tipo] = null;
    lerPastaMidia(tipo);
  } catch (e) { if (e.message !== 'cancelado') alert('Não foi possível escolher a pasta: ' + e.message); }
}
const volumeMidia = () => S.config.volumeMidia ?? 1;

// (1.8.0) Abre o Explorer do Windows com o arquivo selecionado (soPasta = só abre a pasta dele)
async function mostrarMidiaNaPasta(tipo, caminho, soPasta) {
  if (!NO_APP) return toast('Abrir a pasta funciona só no aplicativo MiguelAngelus para Windows.');
  escutarRespostasSync();
  try { await arqApp('midiaMostrar', { tipoMidia: tipo, caminho, pasta: !!soPasta }); }
  catch (e) { alert('Não foi possível abrir a pasta: ' + e.message); }
}

// Menu pequeno do botão direito: [{ txt, fazer }]. Fecha com clique fora, Esc ou rolagem; ↑ ↓ e Enter funcionam.
function menuContexto(e, opcoes) {
  document.querySelector('.menu-ctx')?.remove();
  const el = document.createElement('div');
  el.className = 'menu-ctx';
  el.innerHTML = opcoes.map((o, i) => `<button type="button" data-i="${i}">${esc(o.txt)}</button>`).join('');
  document.body.appendChild(el);
  const r = el.getBoundingClientRect();
  el.style.left = Math.min(e.clientX, innerWidth - r.width - 6) + 'px';
  el.style.top = Math.min(e.clientY, innerHeight - r.height - 6) + 'px';
  const fechar = () => { el.remove(); removeEventListener('pointerdown', fora, true); removeEventListener('keydown', tecla, true); removeEventListener('scroll', fechar, true); };
  const fora = ev => { if (!el.contains(ev.target)) fechar(); };
  const tecla = ev => {
    const bs = [...el.querySelectorAll('button')], k = bs.indexOf(document.activeElement);
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopImmediatePropagation(); fechar(); }      // não limpa a projeção
    else if ((ev.key === 'Enter' || ev.key === ' ') && k >= 0) { ev.preventDefault(); ev.stopImmediatePropagation(); bs[k].click(); }   // Espaço não passa o slide
    else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); ev.stopImmediatePropagation(); bs[(k + (ev.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length].focus(); }
  };
  el.addEventListener('click', ev => { const b = ev.target.closest('[data-i]'); if (!b) return; fechar(); opcoes[+b.dataset.i].fazer(); });
  addEventListener('pointerdown', fora, true);
  addEventListener('keydown', tecla, true);
  addEventListener('scroll', fechar, true);
  el.querySelector('button')?.focus();
}

function tipoDoArquivo(f) {
  if (f.type.startsWith('video/')) return 'video';
  if (f.type.startsWith('audio/')) return 'audio';
  return /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)$/i.test(f.name) ? 'audio' : 'video';
}

// Duração do arquivo; -1 se o navegador não consegue tocar esse formato
function duracaoDe(blob, tipo) {
  return new Promise(ok => {
    const el = document.createElement(tipo);
    const url = URL.createObjectURL(blob);
    let feito = false;
    const fim = d => { if (feito) return; feito = true; URL.revokeObjectURL(url); el.removeAttribute('src'); ok(d); };
    el.preload = 'metadata';
    el.onloadedmetadata = () => fim(isFinite(el.duration) ? el.duration : 0);
    el.onerror = () => fim(-1);
    setTimeout(() => fim(0), 10000);
    el.src = url;
  });
}

async function adicionarMidias(arquivos) {
  let n = 0;
  const ruins = [];
  for (const f of arquivos) {
    const tipo = tipoDoArquivo(f);
    toast(`Guardando "${f.name}"…`);
    const duracao = await duracaoDe(f, tipo);
    if (duracao < 0) { ruins.push(f.name); continue; }
    const m = { id: uid(), nome: f.name.replace(/\.[^.]+$/, ''), arquivo: f.name, tipo, mime: f.type, tamanho: f.size, duracao, blob: f, criado: Date.now() };
    try {
      await DB.salvar('midias', m);
    } catch (err) {
      alert(`Não foi possível guardar "${f.name}".\n${err?.message || err}\nTalvez falte espaço no disco.`);
      continue;
    }
    Midia.lista.push(m);
    n++;
    // nuvem ligada: pergunta se esta mídia deve ir para os outros computadores (vídeos são pesados)
    if (ligadaSync() && confirm(`Enviar "${m.nome}" (${fmtTamanho(m.tamanho)}) para a nuvem?\nOs outros computadores verão esta mídia e poderão baixá-la quando quiserem.`))
      enviarMidiaNuvem(m);
  }
  renderMidias();
  renderRoteiroLista();
  if (n) toast(`${n} mídia(s) adicionada(s).`);
  if (ruins.length) alert('O navegador não consegue tocar estes arquivos (formato não suportado):\n\n' + ruins.join('\n') +
    '\n\nConverta para MP4 (vídeo) ou MP3 (áudio).');
}

async function removerMidia(id) {
  const m = Midia.lista.find(x => x.id === id);
  if (!m || !confirm(`Remover "${m.nome}" do MiguelAngelus?\nOs roteiros que usam esta mídia ficarão com o espaço vazio.`)) return;
  if (m.tipo === 'apresentacao') { Apres.editando = false; Apres.sel = -1; }
  if (m.tipo === 'camera' && Camera.ativa === id) pararCamera();
  if (Midia.audioId === id) pararAudio();
  if (Midia.video.id === id && Midia.video.ativo) pararVideo();
  // na nuvem: tirar só deste computador (continua lá para baixar de novo) ou apagar de todos
  if (m.nuvem && ligadaSync() && (m.tipo === 'video' || m.tipo === 'audio')) {
    if (confirm(`"${m.nome}" também está na nuvem.\n\nOK = apagar da nuvem também (some de todos os computadores)\nCancelar = tirar só deste computador`)) {
      try { await conectarArmazem(); await arqApp('apagar', { caminho: `midias/${id}.bin` }); await arqApp('apagar', { caminho: `midias/${id}.json` }); } catch (e) { alert('Não apagou da nuvem: ' + e.message); }
    } else {
      m.blob = null; m.soNuvem = true;
      await DB.salvar('midias', m, { daNuvem: true });
      renderMidias(); renderSlides();
      return;
    }
  }
  await DB.remover('midias', id);
  Midia.lista = Midia.lista.filter(x => x.id !== id);
  // favorita sem apelido sai junto; com apelido fica (apagada) até o apelido passar para o arquivo novo
  const fi = favsMidia().findIndex(f => f.id === id && !f.apelido);
  if (fi >= 0) { favsMidia().splice(fi, 1); salvarConfig(); }
  if (S.atual?.item.tipo === 'midia' && S.atual.item.midiaId === id && S.atual.rIdx < 0) S.atual = null;
  renderMidias(); renderRoteiroLista(); renderCabecalho(); renderSlides();
}

// ---------- (1.8.0) Favoritas ----------
// ⭐ nas mídias mais usadas (ex.: Abertura da transmissão, Seja bem-vindo): ficam no topo da lista e da escolha no roteiro.
// Apelido opcional ("Boas-vindas"): aparece na lista, entra na busca e passa para o arquivo novo quando o vídeo é trocado.
// Fica neste computador (S.config.midiasFav = [{ id, apelido }]).
const favsMidia = () => S.config.midiasFav || (S.config.midiasFav = []);
const favDe = id => favsMidia().find(f => f.id === id);
const ehVideoAudio = m => m && (m.tipo === 'video' || m.tipo === 'audio');

// Favorita "desta capela": o apelido ou o nome do arquivo tem a sigla (ex.: NSC) ou o nome da capela do roteiro aberto.
// Assim, com três "Seja bem-vindo" (SJO, NSF, NSC), o da capela do roteiro aparece primeiro, marcado com 📍.
function favDaCapela(f) {
  const loc = typeof localDe === 'function' && typeof localDoRoteiro === 'function' ? localDe(localDoRoteiro(S.roteiro)) : null;
  if (!loc) return false;
  const m = midiaPorId(f.id);
  const txt = semAcento(`${f.apelido || ''} ${m?.caminho || ''} ${m?.nome || ''}`);
  const sigla = semAcento(loc.sigla || '').replace(/[^a-z0-9]/g, '');
  return (sigla && new RegExp(`(^|[^a-z0-9])${sigla}([^a-z0-9]|$)`).test(txt)) || (!!loc.nome && txt.includes(semAcento(loc.nome)));
}
// Favoritas na ordem de mostrar: as da capela do roteiro primeiro, depois as outras na ordem em que foram marcadas
const favsOrdenadas = () => { const l = favsMidia().map(f => ({ ...f, capela: favDaCapela(f) })); return [...l.filter(f => f.capela), ...l.filter(f => !f.capela)]; };

function alternarFavMidia(id) {
  const l = favsMidia(), i = l.findIndex(f => f.id === id);
  if (i >= 0) l.splice(i, 1); else l.push({ id, apelido: '' });
  salvarConfig(); renderMidias(); renderRoteiroLista();
}

// Itens do roteiro aberto que usam a mídia "de" passam a usar "para" (pergunta antes)
function trocarNoRoteiro(de, para, nomeNovo) {
  const its = S.roteiro?.itens?.filter(it => it.tipo === 'midia' && it.midiaId === de) || [];
  if (!its.length || !confirm(`O roteiro aberto usa o arquivo antigo em ${its.length} lugar(es).\nTrocar por "${nomeNovo}" também no roteiro?`)) return;
  its.forEach(it => { it.midiaId = para; });
  salvarRoteiro(); renderRoteiroLista(); renderSlides();
}

function apelidoFavMidia(id) {
  const m = midiaPorId(id);
  if (!m) return;
  const atual = favDe(id);
  const r = prompt(`Apelido de "${m.nome}" nas favoritas (ex.: Boas-vindas, Abertura).\n` +
    'Quando o vídeo for trocado, dê o mesmo apelido ao arquivo novo: a ⭐ passa para ele. Vazio = sem apelido.', atual?.apelido || '');
  if (r === null) return;
  const ap = r.trim().slice(0, 40);
  const outro = ap && favsMidia().find(f => f.id !== id && f.apelido && semAcento(f.apelido) === semAcento(ap));
  if (outro) {
    const om = midiaPorId(outro.id);
    if (!confirm(`"${ap}" é o apelido de "${om ? om.nome : 'um arquivo que não existe mais'}".\n\n` +
      `OK = passar o apelido e a ⭐ para "${m.nome}" (o antigo sai das favoritas)\nCancelar = deixar como está`)) return;
    favsMidia().splice(favsMidia().indexOf(outro), 1);
    trocarNoRoteiro(outro.id, id, m.nome);
  }
  if (atual) atual.apelido = ap; else favsMidia().push({ id, apelido: ap });
  salvarConfig(); renderMidias(); renderRoteiroLista();
}

// Vídeo/áudio guardado no MiguelAngelus: troca o arquivo e mantém o resto (⭐, apelido e os roteiros que usam esta mídia)
function trocarArquivoMidia(id) {
  const m = Midia.lista.find(x => x.id === id);
  if (!ehVideoAudio(m)) return;
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = m.tipo === 'audio' ? 'audio/*' : 'video/*,.mkv,.mov';
  inp.addEventListener('change', async () => {
    const f = inp.files[0];
    if (!f) return;
    toast(`Trocando por "${f.name}"…`);
    const duracao = await duracaoDe(f, m.tipo);
    if (duracao < 0) return alert(`O navegador não consegue tocar "${f.name}" (formato não suportado).\nConverta para MP4 (vídeo) ou MP3 (áudio).`);
    if (Midia.audioId === id) pararAudio();
    if (Midia.video.id === id && Midia.video.ativo) pararVideo();
    const antes = { ...m };
    Object.assign(m, { nome: nomeSemExt(f.name), arquivo: f.name, mime: f.type, tamanho: f.size, duracao, blob: f, soNuvem: false, atualizado: Date.now() });
    try { await DB.salvar('midias', m); }
    catch (err) { Object.assign(m, antes); return alert(`Não foi possível guardar "${f.name}".\n${err?.message || err}\nTalvez falte espaço no disco.`); }
    renderMidias(); renderRoteiroLista(); renderCabecalho(); renderSlides();
    toast(`Trocado: "${antes.nome}" → "${m.nome}". A ⭐ e os roteiros continuam valendo.`);
    if (m.nuvem && ligadaSync() && confirm(`"${antes.nome}" estava na nuvem. Enviar o arquivo novo para a nuvem no lugar dele?\n` +
      '(Os outros computadores que já tinham baixado o antigo continuam com ele até removerem e baixarem de novo.)'))
      enviarMidiaNuvem(m);
  });
  inp.click();
}

// Linha de uma favorita (topo da lista): apelido em destaque; arquivo que sumiu fica apagado
function linhaFav(f, selId) {
  const m = midiaPorId(f.id);
  const some = !m || m.faltando;
  const nome = m ? (m.pasta ? m.caminho : m.nome) : 'arquivo removido';
  return `<div class="it fav ${some ? 'sumiu' : ''} ${f.id === selId ? 'sel' : ''}" data-id="${esc(f.id)}" data-fav="1" title="${esc(nome)}${some ? ' — não encontrado' : ''}">
      <span class="tit">${f.capela ? '<span title="Desta capela (a do roteiro aberto)">📍</span> ' : ''}${f.apelido ? `<b>${esc(f.apelido)}</b> <span class="sutil pequeno">${esc(m?.nome || nome)}</span>` : esc(m?.nome || nome)}</span>
      ${some ? '<span class="sutil pequeno">não encontrado</span>' : m.duracao ? `<span class="sutil pequeno">${fmtTempo(m.duracao)}</span>` : ''}
      <button data-acao="fav" class="estrela on" title="Tirar das favoritas">★</button></div>`;
}
const botaoFav = m => !ehVideoAudio(m) ? '' : favDe(m.id)
  ? '<button data-acao="fav" class="estrela on" title="Tirar das favoritas">★</button>'
  : '<button data-acao="fav" class="estrela so-hover" title="Marcar como favorita (fica no topo da lista)">☆</button>';

// ---------- Lista (aba Mídia) ----------

// Módulos da esquerda: Vídeos · Áudios · Apresentações · Câmeras (mesma seção, um tipo de cada vez)
const ROT_MIDIA = { video: ['Vídeos', 'Buscar vídeo…'], audio: ['Áudios', 'Buscar áudio…'], apresentacao: ['Apresentações', 'Buscar apresentação…'], camera: ['Câmeras', 'Buscar câmera…'] };

function mostrarTipoMidia(tipo) {
  Midia.tipoAba = tipo;
  $('#midiaTit').textContent = ROT_MIDIA[tipo][0];
  $('#buscaMidia').placeholder = ROT_MIDIA[tipo][1];
  $$('#aba-midia [data-so]').forEach(e => { e.hidden = !e.dataset.so.split(' ').includes(tipo); });
  if (!NO_APP) { $('#btnPastaMidia').hidden = true; $('#btnRelerPasta').hidden = true; }
  $('#arqMidia').accept = tipo === 'audio' ? 'audio/*' : 'video/*,.mkv,.mov';
  if (CFG_PASTA[tipo] && !Midia.pastas[tipo]) lerPastaMidia(tipo);
  renderMidias();
}

// Linha de um vídeo/áudio guardado no MiguelAngelus, apresentação ou câmera (com ✕ e nuvem)
function linhaMidia(m, selId) {
  return `<div class="it ${m.id === selId ? 'sel' : ''}" data-id="${esc(m.id)}">
      <span class="tit">${esc(m.nome)}</span>
      <span class="sutil pequeno">${m.tipo === 'apresentacao' ? `${m.slides.length} slide(s)` : m.tipo === 'camera' ? 'ao vivo' : fmtTempo(m.duracao)}</span>
      ${m.soNuvem ? '<button data-acao="baixar" class="primario" title="Baixar esta mídia da nuvem para este computador">⬇ Baixar</button>'
        : (m.tipo === 'video' || m.tipo === 'audio') && m.nuvem ? '<span class="nuvem-ok" title="Também está na nuvem">☁</span>'
        : (m.tipo === 'video' || m.tipo === 'audio') && ligadaSync() ? '<button data-acao="subir" title="Enviar para a nuvem (outros computadores)">☁↑</button>' : ''}
      ${botaoFav(m)}<span class="acoes"><button data-acao="remover" title="Remover">✕</button></span>
    </div>`;
}
// Linha de um arquivo da pasta (não dá para remover daqui: é o arquivo do computador)
// ☁ = já está na nuvem; ☁↑ = enviar este arquivo para os outros computadores (por demanda)
const botaoNuvemPasta = m => !ligadaSync() ? ''
  : fichaPasta(m) ? '<span class="nuvem-ok" title="Também está na nuvem (os outros computadores podem baixar)">☁</span>'
  : '<button data-acao="subirPasta" class="so-hover" title="Enviar para a nuvem (os outros computadores poderão baixar)">☁↑</button>';
const linhaArquivo = (m, selId, comCaminho) => `<div class="it ${m.id === selId ? 'sel' : ''}" data-id="${esc(m.id)}" title="${esc(m.caminho)}">
      <span class="tit">${esc(m.nome)}</span>${comCaminho && m.caminho.includes('/') ? `<span class="sutil pequeno">${esc(m.caminho.split('/').slice(0, -1).join(' › '))}</span>` : ''}
      ${m.duracao ? `<span class="sutil pequeno">${fmtTempo(m.duracao)}</span>` : ''}${botaoNuvemPasta(m)}${botaoFav(m)}</div>`;
// Arquivo que está na nuvem mas não nesta pasta: ⬇ Baixar grava na mesma subpasta
const linhaSoNuvem = (f, selId) => `<div class="it ${idPasta(f.tipo, f.caminho) === selId ? 'sel' : ''}" data-id="${esc(idPasta(f.tipo, f.caminho))}" title="${esc(f.caminho)}">
      <span class="tit">${esc(f.nome)}</span><span class="sutil pequeno">${esc(f.caminho.split('/').slice(0, -1).join(' › '))}</span>
      <button data-acao="baixarPasta" data-chave="${esc(f.chave)}" class="primario" title="Baixar para a pasta deste computador (${fmtTamanho(f.tamanho || 0)})">⬇ Baixar</button></div>`;

// Árvore de subpastas a partir dos caminhos "A/B/arquivo.mp4"
function arvoreMidia(arquivos) {
  const raiz = { pastas: new Map(), arqs: [], n: 0 };
  for (const a of arquivos) {
    let no = raiz; no.n++;
    for (const p of a.caminho.split('/').slice(0, -1)) {
      if (!no.pastas.has(p)) no.pastas.set(p, { pastas: new Map(), arqs: [], n: 0 });
      no = no.pastas.get(p); no.n++;
    }
    no.arqs.push(a);
  }
  return raiz;
}
function htmlArvore(no, tipo, prefixo, nivel, selId) {
  const pastas = [...no.pastas.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true }));
  return pastas.map(([nome, filho]) => {
    const chave = `m${tipo}:${prefixo}${nome}`;
    const f = Recolher.fechado(chave, true);
    return `<button class="pasta" data-pasta-midia="${esc(chave)}" style="margin-left:${nivel * 10}px"><span class="seta">${f ? '▸' : '▾'}</span>📁 ${esc(nome)}<span class="n">${filho.n}</span></button>
      ${f ? '' : `<div class="pasta-itens" style="margin-left:${nivel * 10}px">${htmlArvore(filho, tipo, prefixo + nome + '/', nivel + 1, selId)}</div>`}`;
  }).join('') + no.arqs.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })).map(m => linhaArquivo(m, selId)).join('');
}

function renderMidias() {
  const el = $('#listaMidias');
  if (!el) return;
  if (typeof renderCameraAtiva === 'function') renderCameraAtiva();   // quadro de câmeras da tela principal
  const tipo = Midia.tipoAba;
  const termo = semAcento($('#buscaMidia').value.trim());
  const selId = S.atual?.item.tipo === 'midia' && S.atual.rIdx < 0 ? S.atual.item.midiaId : null;
  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true });
  const guardados = Midia.lista.filter(m => m.tipo === tipo && (!termo || semAcento(m.nome).includes(termo))).sort(porNome);

  if (tipo === 'apresentacao' || tipo === 'camera') {
    el.innerHTML = guardados.map(m => linhaMidia(m, selId)).join('') || (termo ? '<p class="vazio">Nada encontrado.</p>'
      : tipo === 'camera' ? '<p class="vazio">Nenhuma câmera. Clique em <b>＋ Câmera</b>.</p>'
      : '<p class="vazio">Nenhuma apresentação. Clique em <b>＋ Apresentação</b> (imagem + texto, ou um PDF).</p>');
    return;
  }

  // Vídeos / Áudios: pasta do computador (em subpastas) + os guardados dentro do MiguelAngelus
  const p = Midia.pastas[tipo];
  const nomeTipo = tipo === 'video' ? 'vídeos' : 'áudios';
  $('#pastaMidiaInfo').innerHTML = !NO_APP ? `As pastas de ${nomeTipo} funcionam no aplicativo para Windows.`
    : !p ? `Escolha a pasta de ${nomeTipo} deste computador (ex.: <code>E:\\Backup Holyrics\\media\\${tipo}</code>).`
    : `📁 <span title="${esc(p.raiz)}">${esc(p.raiz)}</span> · ${p.lendo ? 'lendo…' : p.erro ? `<span class="erro">${esc(p.erro)}</span>` : `${p.arquivos.length} arquivo(s)`}`;
  const arquivos = p?.arquivos || [];
  let h = '';
  const favs = favsOrdenadas().filter(f => (midiaPorId(f.id)?.tipo || '') === tipo);
  if (termo) {
    // favoritas primeiro (também pelo apelido); as outras abaixo
    const favAchadas = favs.filter(f => semAcento((f.apelido || '') + ' ' + (midiaPorId(f.id)?.caminho || midiaPorId(f.id)?.nome || '')).includes(termo));
    const ehFav = new Set(favAchadas.map(f => f.id));
    const achados = arquivos.filter(m => !ehFav.has(m.id) && semAcento(m.caminho).includes(termo)).sort(porNome);
    h = favAchadas.map(f => linhaFav(f, selId)).join('') + achados.slice(0, 300).map(m => linhaArquivo(m, selId, true)).join('') +
      (achados.length > 300 ? `<p class="sutil pequeno">… e mais ${achados.length - 300}. Refine a busca.</p>` : '') +
      guardados.filter(m => !ehFav.has(m.id)).map(m => linhaMidia(m, selId)).join('');
    el.innerHTML = h || '<p class="vazio">Nada encontrado.</p>';
    return;
  }
  if (favs.length) {
    const f = Recolher.fechado('m' + tipo + ':#favoritas', false);
    h += `<button class="pasta" data-pasta-midia="m${tipo}:#favoritas"><span class="seta">${f ? '▸' : '▾'}</span>⭐ Favoritas<span class="n">${favs.length}</span></button>
      ${f ? '' : `<div class="pasta-itens">${favs.map(x => linhaFav(x, selId)).join('')}</div>`}`;
  }
  const soNuvem = typeof Sync !== 'undefined' && ligadaSync() ? Object.values(Sync.estado.pastas || {}).filter(f => f.tipo === tipo && !p?.mapa?.has(f.caminho)) : [];
  if (soNuvem.length && !p?.lendo) {
    const f = Recolher.fechado('m' + tipo + ':#nuvem', false);
    h += `<button class="pasta" data-pasta-midia="m${tipo}:#nuvem"><span class="seta">${f ? '▸' : '▾'}</span>☁ Na nuvem, faltam aqui<span class="n">${soNuvem.length}</span></button>
      ${f ? '' : `<div class="pasta-itens">${soNuvem.map(x => linhaSoNuvem(x, selId)).join('')}</div>`}`;
  }
  if (guardados.length) {
    const f = Recolher.fechado('m' + tipo + ':#guardados', false);
    h += `<button class="pasta" data-pasta-midia="m${tipo}:#guardados"><span class="seta">${f ? '▸' : '▾'}</span>📥 Guardados no MiguelAngelus<span class="n">${guardados.length}</span></button>
      ${f ? '' : `<div class="pasta-itens">${guardados.map(m => linhaMidia(m, selId)).join('')}</div>`}`;
  }
  h += htmlArvore(arvoreMidia(arquivos), tipo, '', 0, selId);
  el.innerHTML = h || (p?.lendo ? '<p class="vazio">Lendo a pasta…</p>' : p ? `<p class="vazio">Nenhum ${tipo === 'video' ? 'vídeo' : 'áudio'} nesta pasta.</p>` : '');
}

function opcoesMidias(sel) {
  const opt = m => `<option value="${esc(m.id)}" ${m.id === sel ? 'selected' : ''}>${esc(m.pasta ? m.caminho : m.nome)}</option>`;
  const grupo = (tipo, rot) => {
    const l = Midia.lista.filter(m => m.tipo === tipo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return l.length ? `<optgroup label="${rot}">${l.map(opt).join('')}</optgroup>` : '';
  };
  const grupoPasta = (tipo, rot) => {
    const l = (Midia.pastas[tipo]?.arquivos || []).slice().sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt-BR', { numeric: true }));
    return l.length ? `<optgroup label="${rot}">${l.map(opt).join('')}</optgroup>` : '';
  };
  const faltando = midiaDaPasta(sel)?.faltando ? `<option value="${esc(sel)}" selected>${esc(midiaDaPasta(sel).caminho)} (não encontrado)</option>` : '';
  const favs = favsOrdenadas().map(f => ({ f, m: midiaPorId(f.id) })).filter(x => x.m && !x.m.faltando);
  const grupoFav = favs.length ? `<optgroup label="⭐ Favoritas">${favs.map(({ f, m }) =>
    `<option value="${esc(m.id)}" ${m.id === sel ? 'selected' : ''}>${f.capela ? '📍' : '⭐'} ${esc(f.apelido ? `${f.apelido} — ${m.nome}` : m.nome)}</option>`).join('')}</optgroup>` : '';
  return '<option value="">— escolher mídia —</option>' + faltando + grupoFav + grupo('apresentacao', 'Apresentações') + grupo('camera', 'Câmeras') +
    grupoPasta('video', 'Vídeos (pasta)') + grupo('video', 'Vídeos guardados') + grupoPasta('audio', 'Áudios (pasta)') + grupo('audio', 'Áudios guardados');
}

// ---------- Player (centro) ----------

function htmlPlayer(it) {
  const m = midiaDe(it);
  if (!m) return '<p class="vazio">Escolha uma mídia acima (vídeos e áudios ficam nos módulos <b>Vídeos</b> e <b>Áudios</b>, à esquerda).</p>';
  if (m.faltando) {
    const naNuvem = typeof Sync !== 'undefined' && ligadaSync() && fichaPasta(m);
    return `<p class="vazio">"${esc(m.caminho)}" não foi encontrado na pasta de ${m.tipo === 'video' ? 'vídeos' : 'áudios'} deste computador.<br>
    ${naNuvem ? `Ele está na nuvem da paróquia.<br><br><button class="primario grande" data-pl="baixarPasta">⬇ Baixar da nuvem (${fmtTamanho(naNuvem.tamanho || 0)})</button>`
      : `Confira em <b>${m.tipo === 'video' ? 'Vídeos' : 'Áudios'} → 📁 Escolher pasta</b> (as subpastas precisam ser iguais às do computador onde o roteiro foi feito),
         ou peça para quem tem o arquivo enviá-lo com <b>☁↑</b>.`}</p>`;
  }
  if (!m.pasta && (m.soNuvem || !m.blob)) return `<p class="vazio">"${esc(m.nome)}" está na nuvem e ainda não foi baixada neste computador.<br>Vá em <b>${m.tipo === 'video' ? 'Vídeos' : 'Áudios'}</b> e clique em <b>⬇ Baixar</b> ao lado dela.</p>`;
  const video = m.tipo === 'video';
  return `<div class="player" data-id="${m.id}">
    <div class="pl-topo"><span class="tag t-midia">${video ? 'Vídeo' : 'Áudio'}</span>
      <span class="sutil">${[m.duracao ? fmtTempo(m.duracao) : '', m.tamanho ? fmtTamanho(m.tamanho) : '', esc(m.pasta ? m.caminho : m.arquivo)].filter(Boolean).join(' · ')}</span></div>
    <div class="pl-nome">${esc(m.nome)}</div>
    <input type="range" class="pl-barra" id="plBarra" min="0" max="1000" value="0" aria-label="Posição">
    <div class="pl-tempo"><span id="plTempo">0:00</span><span id="plDur">${fmtTempo(m.duracao)}</span></div>
    <div class="pl-botoes">
      <button class="primario grande" data-pl="tocar" id="plTocar">▶ Tocar</button>
      <button class="grande" data-pl="parar">■ Parar</button>
    </div>
    <div class="linha pl-opcoes">
      <label class="campo">Volume <input type="range" id="plVol" min="0" max="1" step="0.05" value="${volumeMidia()}"></label>
      <label class="check"><input type="checkbox" id="plLoop" ${it.loop ? 'checked' : ''}> Repetir</label>
    </div>
    <p class="sutil pequeno">${video
      ? 'O vídeo aparece no telão com som; a prévia "Ao vivo" fica sem som. Clicar num slide (ou Esc) volta para o texto. Espaço pausa e continua.'
      : 'O áudio toca neste computador. Você pode continuar projetando textos enquanto ele toca. Espaço pausa e continua.'}</p>
  </div>`;
}

// Estado de reprodução de uma mídia (null = parada)
function estadoDe(m) {
  if (!m) return null;
  if (m.tipo === 'audio') {
    const a = Midia.audio;
    return Midia.audioId === m.id && (!a.paused || a.currentTime > 0)
      ? { t: a.currentTime, dur: a.duration || m.duracao, pausado: a.paused } : null;
  }
  const v = Midia.video;
  return v.id === m.id && v.ativo ? v : null;
}

function atualizarPlayerUI() {
  const box = $('#slides .player');
  if (box) {
    const m = midiaPorId(box.dataset.id);
    const e = estadoDe(m);
    const dur = e?.dur || m?.duracao || 0, t = e?.t || 0;
    if (!Midia.arrastando) $('#plBarra').value = dur ? Math.round(t / dur * 1000) : 0;
    $('#plTempo').textContent = fmtTempo(t);
    $('#plDur').textContent = fmtTempo(dur);
    $('#plTocar').textContent = e && !e.pausado ? '❚❚ Pausar' : e ? '▶ Continuar' : m?.tipo === 'video' ? '▶ Tocar no telão' : '▶ Tocar';
  }
  renderTocando();
}

// Faixa "Tocando agora" no painel da direita
function renderTocando() {
  const el = $('#tocando');
  const itens = [];
  if (Midia.audioId) {
    const m = midiaPorId(Midia.audioId), e = estadoDe(m);
    if (e) itens.push({ m, ...e });
  }
  if (Midia.video.ativo) itens.push({ m: midiaPorId(Midia.video.id), ...Midia.video });
  el.hidden = !itens.length;
  // Só recria os botões quando algo muda de verdade (senão cliques se perdem)
  const chave = itens.map(x => `${x.m?.id}:${x.pausado}`).join('|');
  if (el.dataset.chave !== chave) {
    el.dataset.chave = chave;
    el.innerHTML = '<div class="toc-tit">Tocando agora</div>' + itens.map(x => `
      <div class="toc" data-id="${x.m?.id}">
        <span class="tag t-midia">${x.m?.tipo === 'video' ? 'Vídeo' : 'Áudio'}</span>
        <span class="toc-nome">${esc(x.m?.nome || '')}</span>
        <span class="toc-t"></span>
        <button data-toc="alternar" title="${x.pausado ? 'Continuar' : 'Pausar'}">${x.pausado ? '▶' : '❚❚'}</button>
        <button data-toc="parar" title="Parar">■</button>
      </div>`).join('');
  }
  itens.forEach((x, i) => { const t = el.querySelectorAll('.toc-t')[i]; if (t) t.textContent = `${fmtTempo(x.t)} / ${fmtTempo(x.dur)}`; });
}

// ---------- Comandos ----------

function tocarPausar(m, it) {
  if (!m || m.tipo === 'apresentacao' || m.tipo === 'camera') return;
  if (m.faltando) return toast(`"${m.caminho}" não está na pasta deste computador.`);
  if (!m.blob && !m.url) return toast(`"${m.nome}" está na nuvem: baixe primeiro (⬇ Baixar).`);
  if (m.tipo === 'audio') {
    const a = Midia.audio;
    if (Midia.audioId !== m.id) {
      if (a.src.startsWith('blob:')) URL.revokeObjectURL(a.src);
      a.src = m.blob ? URL.createObjectURL(m.blob) : m.url;   // arquivo da pasta: endereço servido pelo programa
      Midia.audioId = m.id;
      a.loop = !!it?.loop;
    }
    a.volume = volumeMidia();
    if (a.paused) a.play().catch(err => toast('Não foi possível tocar: ' + err.message));
    else a.pause();
    return atualizarPlayerUI();
  }
  const v = Midia.video;
  if (v.id === m.id && v.ativo) {
    enviar({ tipo: 'midia', acao: v.pausado ? 'play' : 'pause' });
    v.pausado = !v.pausado;
  } else {
    Object.assign(v, { id: m.id, t: 0, dur: m.duracao, pausado: false, ativo: true, loop: !!it?.loop });
    S.live = { slide: null, preto: false, item: it || null, idx: -1 };
    enviar({ tipo: 'slide', slide: null });      // tira o texto que estava por baixo
    enviar({ tipo: 'preto', on: false });
    pararCamera();                                 // vídeo no telão tira a câmera
    enviar({ tipo: 'midia', acao: 'carregar', id: m.id, blob: m.blob || null, url: m.url || null, loop: v.loop, volume: volumeMidia(), t: 0, tocar: true });
    renderRoteiroLista();
    renderControles();
  }
  atualizarPlayerUI();
}

function pararAudio() {
  const a = Midia.audio;
  a.pause();
  a.currentTime = 0;
  Midia.audioId = null;
  atualizarPlayerUI();
}

function pararVideo() {
  enviar({ tipo: 'midia', acao: 'parar' });
  Midia.video.ativo = false;
  Midia.video.pausado = true;
  if (S.live.item?.tipo === 'midia') S.live.item = null;
  renderRoteiroLista();
  atualizarPlayerUI();
}

function pararMidia(m) {
  if (!m) return;
  if (m.tipo === 'audio') { if (Midia.audioId === m.id) pararAudio(); }
  else if (Midia.video.id === m.id) pararVideo();
}

function buscarPosicao(m, fracao) {
  const e = estadoDe(m);
  const dur = e?.dur || m.duracao || 0;
  const t = fracao * dur;
  if (m.tipo === 'audio') { if (Midia.audioId === m.id) Midia.audio.currentTime = t; }
  else if (Midia.video.id === m.id && Midia.video.ativo) { enviar({ tipo: 'midia', acao: 'seek', t }); Midia.video.t = t; }
  atualizarPlayerUI();
}

// Status que a projeção (ou a prévia, se a projeção estiver fechada) manda enquanto o vídeo toca
function receberStatusMidia(m) {
  const projAberta = S.projWin && !S.projWin.closed;
  if (m.preview && projAberta) return;
  const v = Midia.video;
  if (!m.id || m.id !== v.id) return;
  Object.assign(v, { t: m.t, dur: m.dur || v.dur, pausado: m.pausado });
  const mv = midiaPorId(v.id); if (mv?.pasta && m.dur && !mv.duracao) mv.duracao = m.dur;   // arquivos da pasta: duração só ao tocar
  if (v.ativo && !m.ativo) {                     // terminou ou foi tirado da tela por um slide
    v.ativo = false;
    if (S.live.item?.tipo === 'midia') S.live.item = null;
    renderRoteiroLista();
  }
  atualizarPlayerUI();
}

// Quando a projeção abre (ou reabre) no meio de um vídeo
function enviarEstadoMidia(w) {
  const v = Midia.video;
  if (!v.ativo) return;
  const m = midiaPorId(v.id);
  if (m) enviar({ tipo: 'midia', acao: 'carregar', id: m.id, blob: m.blob || null, url: m.url || null, loop: v.loop, volume: volumeMidia(), t: v.t, tocar: !v.pausado }, [w]);
}

function ligarMidia() {
  const a = Midia.audio;
  ['timeupdate', 'play', 'pause', 'ended', 'loadedmetadata'].forEach(ev => a.addEventListener(ev, atualizarPlayerUI));
  a.addEventListener('loadedmetadata', () => { const m = midiaPorId(Midia.audioId); if (m?.pasta && isFinite(a.duration)) m.duracao = a.duration; });
  a.addEventListener('ended', () => { if (!a.loop) { Midia.audioId = null; atualizarPlayerUI(); } });

  $('#btnAddMidia').addEventListener('click', () => $('#arqMidia').click());
  $('#arqMidia').addEventListener('change', e => { if (e.target.files.length) adicionarMidias([...e.target.files]); e.target.value = ''; });
  $('#buscaMidia').addEventListener('input', renderMidias);
  // A projeção avisa quando o vídeo só tem som para o motor (formato antigo "mp4v"/Xvid)
  window.addEventListener('message', e => {
    if (e.data?.app !== 'lumen' || e.data.tipo !== 'midiaSemImagem') return;
    const m = midiaPorId(e.data.id);
    alert(`"${m?.nome || 'Este vídeo'}" está num formato antigo (MPEG-4 Parte 2 / Xvid) que o MiguelAngelus não consegue mostrar: só o som vai tocar.\n\n` +
      'Converta o arquivo para MP4 (H.264) — por exemplo no HandBrake ou no "Converter/Salvar" do VLC — e coloque o novo no lugar.');
  });
  // (1.8.0) Botão direito numa mídia da pasta (ou numa subpasta, ou num item de mídia do roteiro): mostrar no Explorer
  const ctxMidia = e => {
    const sub = e.target.closest('#listaMidias [data-pasta-midia]');
    if (sub) {
      const [, tipo, cam] = /^m(video|audio):(.*)$/.exec(sub.dataset.pastaMidia) || [];
      if (!tipo || cam.startsWith('#')) return;
      e.preventDefault();
      return menuContexto(e, [{ txt: '📂 Abrir esta pasta', fazer: () => mostrarMidiaNaPasta(tipo, cam, true) }]);
    }
    if (e.target.closest('#pastaMidiaInfo') && Midia.pastas[Midia.tipoAba]?.raiz) {
      e.preventDefault();
      return menuContexto(e, [{ txt: '📂 Abrir a pasta de ' + (Midia.tipoAba === 'audio' ? 'áudios' : 'vídeos'), fazer: () => mostrarMidiaNaPasta(Midia.tipoAba, '', true) }]);
    }
    const row = e.target.closest('#listaMidias .it[data-id], #roteiroItens .it');
    if (!row) return;
    const id = row.dataset.id || (S.roteiro.itens[+row.dataset.i]?.tipo === 'midia' ? S.roteiro.itens[+row.dataset.i].midiaId : null);
    const m = id ? midiaPorId(id) : null;
    if (!m && !(id && favDe(id))) return;                   // favorita cujo arquivo foi removido ainda tem menu
    if (m && !ehVideoAudio(m)) return;
    e.preventDefault();
    const fav = favDe(id);
    const opFav = [
      { txt: fav ? '☆ Tirar das favoritas' : '⭐ Marcar como favorita', fazer: () => alternarFavMidia(id) },
      { txt: fav?.apelido ? `🏷 Apelido: "${fav.apelido}" (mudar…)` : '🏷 Dar um apelido… (ex.: Boas-vindas)', fazer: () => apelidoFavMidia(id) },
    ];
    if (!m) return menuContexto(e, opFav.slice(0, 1));
    const opArq = !m.pasta
      ? [{ txt: '🔁 Trocar o arquivo… (mantém ⭐, apelido e roteiros)', fazer: () => trocarArquivoMidia(id) },
         { txt: 'ℹ Guardado dentro do MiguelAngelus (sem pasta)', fazer: () => toast('Este arquivo foi adicionado ao MiguelAngelus e fica guardado dentro dele, não numa pasta do computador.') }]
      : m.faltando ? [{ txt: '📂 Abrir a pasta (o arquivo não está aqui)', fazer: () => mostrarMidiaNaPasta(m.tipo, m.caminho, true) }]
      : [{ txt: '📂 Mostrar na pasta', fazer: () => mostrarMidiaNaPasta(m.tipo, m.caminho, false) },
         { txt: '🗂 Abrir a pasta', fazer: () => mostrarMidiaNaPasta(m.tipo, m.caminho, true) }];
    menuContexto(e, [...opArq, ...opFav]);
  };
  $('#listaMidias').addEventListener('contextmenu', ctxMidia);
  $('#pastaMidiaInfo').addEventListener('contextmenu', ctxMidia);
  $('#roteiroItens').addEventListener('contextmenu', ctxMidia);
  $('#btnPastaMidia').addEventListener('click', escolherPastaMidia);
  $('#btnRelerPasta').addEventListener('click', () => lerPastaMidia(Midia.tipoAba));
  $('#listaMidias').addEventListener('click', e => {
    const pasta = e.target.closest('[data-pasta-midia]');
    if (pasta) { Recolher.alternar(pasta.dataset.pastaMidia, !/#(guardados|nuvem|favoritas)$/.test(pasta.dataset.pastaMidia)); return renderMidias(); }
    const bx = e.target.closest('[data-acao="baixarPasta"]');
    if (bx) return baixarPastaNuvem(Sync.estado.pastas?.[bx.dataset.chave]);
    const sp = e.target.closest('[data-acao="subirPasta"]');
    if (sp) return enviarPastaNuvem(midiaPorId(sp.closest('.it').dataset.id));
    const row = e.target.closest('.it');
    if (!row) return;
    if (e.target.closest('[data-acao="remover"]')) return removerMidia(row.dataset.id);
    if (e.target.closest('[data-acao="fav"]')) return alternarFavMidia(row.dataset.id);
    const m = midiaPorId(row.dataset.id);
    if (row.dataset.fav && (!m || m.faltando)) return toast('O arquivo desta favorita não foi encontrado. Dê o mesmo apelido ao arquivo novo (botão direito → Apelido) ou tire a ⭐.');
    if (e.target.closest('[data-acao="baixar"]')) return baixarMidiaNuvem(m);
    if (e.target.closest('[data-acao="subir"]')) return enviarMidiaNuvem(m);
    if (m?.soNuvem) return toast('Esta mídia está na nuvem. Clique em ⬇ Baixar para usar neste computador.');
    abrirItem({ tipo: 'midia', midiaId: row.dataset.id, loop: false });
    renderMidias();
  });

  // Controles do player (centro)
  $('#slides').addEventListener('click', e => {
    const b = e.target.closest('[data-pl]');
    if (!b || S.atual?.item.tipo !== 'midia') return;
    const m = midiaDe(S.atual.item);
    if (b.dataset.pl === 'baixarPasta') return baixarPastaNuvem(fichaPasta(m));
    if (b.dataset.pl === 'tocar') tocarPausar(m, S.atual.item);
    else if (b.dataset.pl === 'parar') pararMidia(m);
  });
  $('#slides').addEventListener('input', e => {
    if (S.atual?.item.tipo !== 'midia') return;
    const it = S.atual.item, m = midiaDe(it);
    if (e.target.id === 'plBarra') Midia.arrastando = true;
    else if (e.target.id === 'plVol') {
      S.config.volumeMidia = +e.target.value;
      salvarConfig();
      if (Midia.audioId) Midia.audio.volume = +e.target.value;
      if (Midia.video.ativo) enviar({ tipo: 'midia', acao: 'volume', v: +e.target.value });
    } else if (e.target.id === 'plLoop') {
      it.loop = e.target.checked;
      if (S.atual.rIdx >= 0) salvarRoteiro();
      if (m?.tipo === 'audio' && Midia.audioId === m.id) Midia.audio.loop = it.loop;
      if (m?.tipo === 'video' && Midia.video.id === m.id) { Midia.video.loop = it.loop; enviar({ tipo: 'midia', acao: 'loop', on: it.loop }); }
    }
  });
  $('#slides').addEventListener('change', e => {
    if (e.target.id !== 'plBarra' || S.atual?.item.tipo !== 'midia') return;
    Midia.arrastando = false;
    buscarPosicao(midiaDe(S.atual.item), +e.target.value / 1000);
  });

  // Faixa "Tocando agora"
  $('#tocando').addEventListener('click', e => {
    const b = e.target.closest('[data-toc]');
    if (!b) return;
    const m = midiaPorId(b.closest('.toc').dataset.id);
    if (b.dataset.toc === 'parar') pararMidia(m);
    else tocarPausar(m, m?.tipo === 'video' ? S.live.item : (S.atual?.item.midiaId === m?.id ? S.atual.item : null));
  });
}
