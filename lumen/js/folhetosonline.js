'use strict';
/*
 * Folhetos da Arquidiocese (arqrio.org.br/folhetos): lista os folhetos publicados e baixa a versão Celular
 * direto para o MiguelAngelus, que monta os roteiros como sempre (importarFolheto).
 * O download avisa o contador de downloads do site, como um clique normal, para a Arquidiocese seguir contando.
 * Só funciona no aplicativo (o navegador bloqueia ler outro site); no navegador, o botão abre a página do site.
 * Usa NO_APP, S, infoRoteiro, importarFolheto, abrirDialogo, esc, toast… (em tempo de execução).
 */

const URL_FOLHETOS = 'https://arqrio.org.br/folhetos/';
const FolOnline = { pedidos: {}, seq: 0, lista: [], cdf: null };

// Pede um download ao aplicativo (MiguelAngelus.exe) e espera a resposta
function httpApp(url, { metodo = 'GET', corpo = null, binario = false } = {}) {
  return new Promise((ok, falha) => {
    const id = 'h' + (++FolOnline.seq);
    const relogio = setTimeout(() => { delete FolOnline.pedidos[id]; falha(new Error('sem resposta (a internet está ligada?)')); }, 90000);
    FolOnline.pedidos[id] = r => { clearTimeout(relogio); r.ok ? ok(r) : falha(new Error(r.erro || 'erro ' + r.status)); };
    window.chrome.webview.postMessage({ tipo: 'http', id, url, metodo, corpo, binario });
  });
}

const deDataBR = s => { const m = (s || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };

// Página dos folhetos configurada na Paróquia (Agenda → Paróquia); vazia = Arquidiocese do Rio
const siteFolhetos = () => (Agenda.dados.paroquia?.siteFolhetos || '').trim() || URL_FOLHETOS;
const ehSiteRio = () => /(^|\.)arqrio\.org\.br$/i.test(new URL(siteFolhetos(), location.href).hostname);
const nomeDiocese = () => (Agenda.dados.paroquia?.diocese || '').trim() || (ehSiteRio() ? 'Arquidiocese' : 'Diocese');

// Data escrita no texto do link ou no nome do arquivo: 12/10/2026, 12.10.26, 12-10-2026, 2026-10-12, 12 de outubro de 2026
const MESES_EXT = ['janeiro', 'fevereiro', 'mar[cç]o', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function dataNoTexto(s) {
  try { s = decodeURIComponent(s || ''); } catch (_) { s = s || ''; }
  s = s.replace(/[_+]/g, ' ');
  const ano = a => a.length === 2 ? '20' + a : a;
  const ok = (y, m, d) => +m >= 1 && +m <= 12 && +d >= 1 && +d <= 31 ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
  let m = s.match(/(20\d\d)[-.](\d{1,2})[-.](\d{1,2})(?!\d)/);
  if (m) return ok(m[1], m[2], m[3]);
  m = s.match(/(?<!\d)(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d\d|\d\d)(?!\d)/);
  if (m) return ok(ano(m[3]), m[2], m[1]);
  m = s.replace(/-/g, ' ').match(new RegExp(`(?<!\\d)(\\d{1,2})(?:º)?\\s*(?:de\\s*)?(${MESES_EXT.join('|')})\\s*(?:de\\s*)?(20\\d\\d)?`, 'i'));
  if (m) {
    const mes = MESES_EXT.findIndex(x => new RegExp('^' + x + '$', 'i').test(m[2])) + 1;
    let y = m[3];
    if (!y) { const hoje = new Date(); y = hoje.getFullYear() + (mes < hoje.getMonth() - 5 ? 1 : 0); }
    return ok(y, mes, m[1]);
  }
  return '';
}

// Outra diocese: lista todos os PDFs com link na página configurada
function listarPdfsDaPagina(html, base) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const vistos = new Set();
  const lista = [];
  for (const a of doc.querySelectorAll('a[href]')) {
    let url;
    try { url = new URL(a.getAttribute('href'), base).href; } catch (_) { continue; }
    if (!/^https?:/i.test(url) || !/\.pdf($|[?#])|[?&/]pdf\b/i.test(url) || vistos.has(url)) continue;
    vistos.add(url);
    let arquivo = url.split(/[?#]/)[0].split('/').pop() || '';
    try { arquivo = decodeURIComponent(arquivo); } catch (_) { /* nome com % solto */ }
    arquivo = arquivo.replace(/\.pdf$/i, '');
    const texto = (a.getAttribute('title') || textoSeparado(a)).replace(/\s+/g, ' ').trim();
    // partituras, cifras, cadernos de canto e tabelas de preço não montam roteiro
    if (/partitura|cifra|caderno|cancioneiro|pre[cç]os?\b|tabela|assinatura|formul[aá]rio|boleto/i.test(texto + ' ' + arquivo)) continue;
    // o texto em volta do link (a linha da tabela/lista) costuma ter o nome da celebração e a data
    let volta = '';
    for (let el = a.parentElement, n = 0; el && n < 4 && !volta; el = el.parentElement, n++) {
      const t = textoSeparado(el).replace(/\s+/g, ' ').trim();
      if (t.length > texto.length + 5 && t.length < 300) volta = t;
    }
    const generico = !texto || texto.length < 14 || /^(baixar|download|clique aqui|pdf|aqui|ver|abrir|folheto)\b/i.test(texto);
    const titulo = !generico ? texto : volta && volta.length < 120
      ? volta.replace(/\b(folheto|partituras?|baixar|download|pdf)\b/gi, '').replace(/^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*[-–]?\s*/, '').replace(/\s+/g, ' ').trim()
      : arquivo.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    const iso = dataNoTexto(texto) || dataNoTexto(arquivo) || dataNoTexto(volta);
    lista.push({ url, id: '', titulo, iso, nome: titulo,
      versao: /celular/i.test(titulo + arquivo) ? 'celular' : /assembl[eé]ia/i.test(titulo + arquivo) ? 'assembleia' : 'pdf' });
  }
  // datados em ordem de data, só do último mês para a frente (a página pode ter o arquivo de anos);
  // sem data vêm depois, na ordem da página, no máximo 20
  const corte = isoData(new Date(Date.now() - 30 * 864e5));
  const datados = lista.filter(f => f.iso).sort((a, b) => a.iso.localeCompare(b.iso));
  const recentes = datados.filter(f => f.iso >= corte);
  return [...(recentes.length ? recentes : datados.slice(-10)), ...lista.filter(f => !f.iso).slice(0, 20)];
}

// Texto de um elemento com espaço entre os pedaços (textContent junta "12/10/2026" com "Nossa Senhora" sem espaço)
function textoSeparado(el) {
  const partes = [];
  const w = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) partes.push(w.currentNode.nodeValue);
  return partes.join(' ');
}

async function listarFolhetosOnline() {
  if (!ehSiteRio()) {
    const r = await httpApp(siteFolhetos());
    FolOnline.cdf = null;
    FolOnline.lista = listarPdfsDaPagina(r.texto, siteFolhetos());
    return FolOnline.lista;
  }
  const r = await httpApp(URL_FOLHETOS);
  const doc = new DOMParser().parseFromString(r.texto, 'text/html');
  const cdf = r.texto.match(/CDF\s*=\s*(\{[^}]*\})/);
  try { FolOnline.cdf = cdf ? JSON.parse(cdf[1]) : null; } catch (_) { FolOnline.cdf = null; }
  const todos = [...doc.querySelectorAll('a.link-folheto')].map(a => ({
    url: a.getAttribute('href') || '',
    id: a.dataset.folhetoId || '',
    titulo: (a.dataset.folhetoTitulo || a.textContent).replace(/\s+/g, ' ').trim(),
  })).filter(f => /^https:/.test(f.url))
    .map(f => ({ ...f, iso: deDataBR(f.titulo), versao: /\(celular\)\s*$/i.test(f.titulo) ? 'celular' : /\(assembl[eé]ia\)\s*$/i.test(f.titulo) ? 'assembleia' : '',
      nome: f.titulo.replace(/^\d{2}\/\d{2}\/\d{4}\s*-\s*/, '').replace(/\s*\((celular|assembl[eé]ia|celebrante)\)\s*$/i, '') }));
  // a versão Celular é a que monta melhor; quando a Arquidiocese não publica a Celular de uma data, entra a da Assembleia
  // (diagramada em colunas, com as letras dos cantos numa coluna ao lado: folheto.js separa as colunas)
  const celulares = todos.filter(f => f.versao === 'celular');
  const assembleias = todos.filter(f => f.versao === 'assembleia' && !celulares.some(c => c.iso === f.iso && c.nome === f.nome));
  FolOnline.lista = [...celulares, ...assembleias].sort((a, b) => a.iso.localeCompare(b.iso) || a.nome.localeCompare(b.nome, 'pt-BR'));
  return FolOnline.lista;
}

const temRoteiroNoDia = iso => S.roteiros.some(r => infoRoteiro(r).iso === iso && r.itens.length > 3);

function renderFolhetosOnline(estado) {
  const el = $('#folOnlineLista');
  if (estado) { el.innerHTML = `<p class="sutil">${esc(estado)}</p>`; return; }
  if (!FolOnline.lista.length) { el.innerHTML = `<p class="sutil">Nenhum folheto (PDF) encontrado em <b>${esc(siteFolhetos())}</b>. Confira o endereço em Agenda → Paróquia.</p>`; return; }
  const hoje = isoData(new Date());
  const proximo = FolOnline.lista.find(f => f.iso >= hoje);
  el.innerHTML = FolOnline.lista.map(f => {
    const d = f.iso ? deIso(f.iso) : null;
    const quando = d ? `${DIAS_CURTOS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : '';
    const ja = f.iso && temRoteiroNoDia(f.iso);
    return `<div class="fol-item ${f === proximo ? 'proximo' : ''} ${f.iso && f.iso < hoje ? 'passado' : ''}">
      <span class="fol-data">${esc(quando)}</span>
      <span class="fol-nome">${esc(f.nome)}${f === proximo ? ' <b class="fol-tag">próximo</b>' : ''}${ja ? ' <span class="fol-ja">já tem roteiro</span>' : ''}
        ${f.versao === 'assembleia' ? '<span class="fol-assembleia" title="A Arquidiocese ainda não publicou a versão Celular desta data. A da Assembleia (em colunas) também monta o roteiro; dê uma conferida.">versão da assembleia</span>' : ''}</span>
      <button data-fol="${esc(f.url)}" class="${f === proximo && !ja ? 'primario' : ''}">⬇ Baixar e montar</button></div>`;
  }).join('');
}

async function abrirFolhetosOnline() {
  if (!NO_APP) {
    if (confirm(`No navegador o MiguelAngelus não consegue baixar sozinho.\nAbrir a página de folhetos da ${nomeDiocese()}? Baixe o PDF (de preferência a versão "Celular") e use o botão 📄 Folheto.`)) window.open(siteFolhetos(), '_blank');
    return;
  }
  $('#folOnlineTitulo').textContent = `🌐 Folhetos — ${nomeDiocese()}`;
  $('#folOnlineSite').textContent = siteFolhetos().replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
  $('#folOnlineGenerico').hidden = ehSiteRio();
  abrirDialogo('dlgFolhetoOnline');
  renderFolhetosOnline('Procurando os folhetos publicados…');
  try { await listarFolhetosOnline(); renderFolhetosOnline(); }
  catch (e) { renderFolhetosOnline(`Não consegui abrir a página dos folhetos (${siteFolhetos()}): ${e.message}`); }
}

function base64ParaBytes(b64) {
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

async function baixarFolhetoOnline(f, botao) {
  if (botao) { botao.disabled = true; botao.textContent = 'Baixando…'; }
  // alguns sites demoram (o da Arquidiocese de SP leva de 4 a 30 s): o botão conta os segundos para não parecer travado
  const t0 = Date.now();
  const relogio = botao && setInterval(() => { botao.textContent = `Baixando… ${Math.round((Date.now() - t0) / 1000)} s`; }, 1000);
  try {
    const r = await httpApp(f.url, { binario: true }).finally(() => clearInterval(relogio));
    if (botao) botao.textContent = 'Montando o roteiro…';
    let bytes = base64ParaBytes(r.base64);
    // o servidor do site às vezes manda espaços/linhas em branco antes do "%PDF": procura o começo e descarta o resto
    const inicio = String.fromCharCode(...bytes.slice(0, 1024)).indexOf('%PDF');
    if (inicio < 0) throw new Error(r.status >= 400 ? `o site respondeu erro ${r.status}` : 'o site não devolveu um PDF');
    if (inicio > 0) bytes = bytes.slice(inicio);
    // conta o download no site, como um clique no link (sem esperar)
    if (FolOnline.cdf?.ajax_url) httpApp(FolOnline.cdf.ajax_url, { metodo: 'POST', corpo: {
      action: 'cdf_registrar_clique', nonce: FolOnline.cdf.nonce || '', folheto_id: f.id, folheto_titulo: f.titulo, folheto_url: f.url } }).catch(() => {});
    const d = f.iso ? f.iso.split('-').reverse().join('.').replace(/^(\d\d\.\d\d\.)\d\d(\d\d)$/, '$1$2') : '';
    const arquivo = new File([bytes], `A Missa - ${f.nome}_${f.versao === 'assembleia' ? 'ASSEMBLEIA' : f.versao === 'celular' ? 'CELULAR' : 'FOLHETO'} - ${d}.pdf`.replace(/[\\/:*?"<>|]/g, '-'), { type: 'application/pdf' });
    $('#dlgFolhetoOnline').close();
    await importarFolheto(arquivo, { nome: f.nome, data: f.iso });
    if (f.versao === 'assembleia') toast('Montado com a versão da ASSEMBLEIA do folheto (a de celular ainda não saiu). Dê uma conferida no roteiro.');
  } catch (e) {
    alert('Não foi possível baixar o folheto:\n' + e.message);
    if (botao) { botao.disabled = false; botao.textContent = '⬇ Baixar e montar'; }
  }
}

// Ao abrir o app: se já saiu o folheto do próximo domingo/festa e ainda não há roteiro, o botão avisa
async function verificarFolhetoNovo() {
  if (!NO_APP) return;
  try {
    const lista = await listarFolhetosOnline();
    const hoje = isoData(new Date());
    const novo = lista.find(f => f.iso >= hoje && !temRoteiroNoDia(f.iso));
    const b = $('#btnFolhetoOnline');
    b.classList.toggle('tem-novo', !!novo);
    if (novo) { const d = deIso(novo.iso); b.title = `Saiu o folheto de ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}: ${novo.nome}`; }
  } catch (_) { /* sem internet: fica quieto */ }
}

function ligarFolhetosOnline() {
  $('#btnFolhetoOnline').addEventListener('click', abrirFolhetosOnline);
  $('#folOnlineLista').addEventListener('click', e => {
    const b = e.target.closest('button[data-fol]');
    const f = b && FolOnline.lista.find(x => x.url === b.dataset.fol);
    if (f) baixarFolhetoOnline(f, b);
  });
  if (NO_APP) {
    window.chrome.webview.addEventListener('message', e => {
      const r = e.data;
      if (r?.tipo === 'httpResposta' && FolOnline.pedidos[r.id]) { const cb = FolOnline.pedidos[r.id]; delete FolOnline.pedidos[r.id]; cb(r); }
    });
    setTimeout(verificarFolhetoNovo, 4000);
  }
}
