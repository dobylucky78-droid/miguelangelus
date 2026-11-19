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
// (1.9.11) também abreviado, como no nome dos arquivos de Goiânia: "22-nov-26"
const MESES_EXT = ['jan(?:eiro)?', 'fev(?:ereiro)?', 'mar(?:[cç]o)?', 'abr(?:il)?', 'mai(?:o)?', 'jun(?:ho)?', 'jul(?:ho)?', 'ago(?:sto)?', 'set(?:embro)?', 'out(?:ubro)?', 'nov(?:embro)?', 'dez(?:embro)?'];
function dataNoTexto(s) {
  try { s = decodeURIComponent(s || ''); } catch (_) { s = s || ''; }
  s = s.replace(/[_+]/g, ' ');
  const ano = a => a.length === 2 ? '20' + a : a;
  const ok = (y, m, d) => +m >= 1 && +m <= 12 && +d >= 1 && +d <= 31 ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
  let m = s.match(/(20\d\d)[-.](\d{1,2})[-.](\d{1,2})(?!\d)/);
  if (m) return ok(m[1], m[2], m[3]);
  m = s.match(/(?<!\d)(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d\d|\d\d)(?!\d)/);
  if (m) return ok(ano(m[3]), m[2], m[1]);
  m = s.replace(/-/g, ' ').match(new RegExp(`(?<!\\d)(\\d{1,2})(?:º)?\\s*(?:de\\s*)?(${MESES_EXT.join('|')})(?![a-zç])\\s*(?:de\\s*)?(20\\d\\d|\\d\\d(?!\\d))?`, 'i'));
  if (m) {
    const mes = MESES_EXT.findIndex(x => new RegExp('^' + x + '$', 'i').test(m[2])) + 1;
    let y = m[3] && ano(m[3]);
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
    if (!/^https?:/i.test(url) || !/\.pdf($|[?#])|[?&/]pdf\b/i.test(url)) continue;
    // (1.9.11) Santo André: dois links para o mesmo PDF (imagem e "Folheto"); só um deles tem a data por perto — o
    // repetido entra no lugar do primeiro se este ficou sem data
    const jaVisto = vistos.has(url) ? lista.findIndex(f => f.url === url) : -1;
    if (vistos.has(url) && (jaVisto < 0 || lista[jaVisto].iso)) continue;
    vistos.add(url);
    let arquivo = url.split(/[?#]/)[0].split('/').pop() || '';
    try { arquivo = decodeURIComponent(arquivo); } catch (_) { /* nome com % solto */ }
    arquivo = arquivo.replace(/\.pdf$/i, '');
    const texto = (a.getAttribute('title') || textoSeparado(a)).replace(/\s+/g, ' ').trim();
    // partituras, cifras, cadernos de canto e tabelas de preço não montam roteiro
    if (/partitura|cifra|caderno|cancioneiro|pre[cç]os?\b|tabela|assinatura|formul[aá]rio|boleto/i.test(texto + ' ' + arquivo)) continue;
    // o texto em volta do link (a linha da tabela/lista) costuma ter o nome da celebração e a data
    let volta = '';
    // (1.9.11) Santo André: lista do Elementor — a data fica 5–6 níveis acima do link "Folheto"
    for (let el = a.parentElement, n = 0; el && n < 7 && !volta; el = el.parentElement, n++) {
      const t = textoSeparado(el).replace(/\s+/g, ' ').trim();
      if (t.length > texto.length + 5 && t.length < 300) volta = t;
    }
    const generico = !texto || texto.length < 14 || /^(baixar|download|clique aqui|pdf|aqui|ver|abrir|folheto)\b/i.test(texto);
    const titulo = !generico ? texto : volta && volta.length < 120
      ? volta.replace(/\b(folheto|partituras?|baixar|download|pdf)\b/gi, '').replace(/^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s*[-–]?\s*/, '')
        .replace(new RegExp(`\\s*\\d{1,2}º?\\s+de\\s+(${MESES_EXT.join('|')})\\s+de\\s+20\\d\\d\\s*`, 'i'), ' ').replace(/[\s.|]+$/, '').replace(/\s+/g, ' ').trim()
      : arquivo.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
        // (1.9.11) Goiânia: "54 Sol. Todos os Santos Ano A n. 2482 1 nov 26" → "Sol. Todos os Santos Ano A"
        .replace(/^\d{1,3}\s+(?=\d{1,2}[ºoª]\s|\D)/, '').replace(/\s+n\.?\s*\d{3,5}\b/i, '')
        .replace(new RegExp(`\\s+\\d{1,2}\\s+(${MESES_EXT.join('|')})(?![a-zç])\\s*(20\\d\\d|\\d\\d)?\\s*\\d?$`, 'i'), '')
        // (1.9.11) Campanha: "Folheto II DOMINGO DO ADVENTO ANO B 06 12 2026" → "II Domingo do Advento Ano B"
        .replace(/^folheto\s+/i, '').replace(/\s+\d{1,2}\s+\d{1,2}\s+(?:20)?\d\d(?:\s+\d)?$/, '')
        // São José dos Campos: "22 de novembro de 2026 Solenidade de…" → "Solenidade de…"
        .replace(new RegExp(`^(?:\\d{1,2}\\s+)?de\\s+(${MESES_EXT.join('|')})\\s+de\\s+20\\d\\d\\s+`, 'i'), '').trim();
    const tituloFinal = (/[a-zà-ÿ]/.test(titulo) ? titulo : titulo.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, s, l) => s + l.toUpperCase())
      .replace(/\s(De|Da|Do|Das|Dos|E|Em|Na|No|Os|As)(?=\s)/g, m => m.toLowerCase()).replace(/(^|\s)([IVXL][ivxl]*)(?=\s|$)/g, (m, s, r) => s + r.toUpperCase()))
      // "– II Domingo do Advento – Ano B – 06-12-2026" → "II Domingo do Advento – Ano B"
      .replace(/^[\s–—.|-]+/, '').replace(/\s*[–—-]\s*\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\s*$/, '').trim() || titulo;
    const iso = dataNoTexto(texto) || dataNoTexto(arquivo) || dataNoTexto(volta);
    const item = { url, id: '', titulo: tituloFinal, iso, nome: tituloFinal,
      versao: /celular/i.test(titulo + arquivo) ? 'celular' : /assembl[eé]ia/i.test(titulo + arquivo) ? 'assembleia' : 'pdf' };
    if (jaVisto >= 0) { if (iso) lista[jaVisto] = item; } else lista.push(item);
  }
  // datados em ordem de data, só do último mês para a frente (a página pode ter o arquivo de anos);
  // sem data vêm depois, na ordem da página, no máximo 20
  // (1.9.11) Campanha: na mesma data, o "Folheto-…pdf" e outro PDF (partituras sem a palavra no nome) — fica o folheto
  for (let i = lista.length - 1; i >= 0; i--) {
    const f = lista[i];
    if (f.iso && !/folheto/i.test(f.url) && lista.some(g => g !== f && g.iso === f.iso && /folheto/i.test(g.url))) lista.splice(i, 1);
    // o mesmo arquivo enviado de novo ("…-01-11-2026-1.pdf", "…-Comum-.pdf"): mesma data e mesmo nome — fica o primeiro
    else if (f.iso && lista.some((g, j) => j < i && g.iso === f.iso && g.nome.toLowerCase().replace(/\W+/g, '') === f.nome.toLowerCase().replace(/\W+|\d$/g, ''))) lista.splice(i, 1);
  }
  const corte = isoData(new Date(Date.now() - 30 * 864e5));
  const datados = lista.filter(f => f.iso).sort((a, b) => a.iso.localeCompare(b.iso));
  const recentes = datados.filter(f => f.iso >= corte);
  return [...(recentes.length ? recentes : datados.slice(-10)), ...lista.filter(f => !f.iso).slice(0, 20)];
}

// (1.9.11) Brasília: a página é um calendário (Elementor) — os folhetos vêm nos dados do calendário, um por data:
// {"title":"TODOS OS SANTOS | SOLENIDADE","description":"<a href=…pdf>DOWNLOAD DO FOLHETO</a>…<a …>VERSÃO EM TELÃO</a>…",
// "start":"2026-11-01"}. A versão do folheto e a de celular são imagem (sem texto): vai a de telão; sem ela, a de celular.
function listarPdfsDoCalendario(html) {
  const des = s => { try { return JSON.parse('"' + s + '"'); } catch (_) { return s; } };
  const lista = [];
  for (const m of html.matchAll(/"title":"((?:[^"\\]|\\.)*)","description":"((?:[^"\\]|\\.)*)","start":"(\d{4}-\d\d-\d\d)"/g)) {
    const links = [...des(m[2]).matchAll(/href="([^"]+\.pdf)"[^>]*>([^<]*)</gi)].map(x => ({ url: x[1], rot: x[2] }))
      .filter(l => !/partitura|caderno|cifra/i.test(l.rot));
    const l = links.find(x => /tel[aã]o/i.test(x.rot)) || links.find(x => /celular/i.test(x.rot)) || links[0];
    if (!l) continue;
    const titulo = des(m[1]).replace(/\s*\|\s*/g, ' — ').replace(/\s+/g, ' ').trim();
    lista.push({ url: l.url, id: '', titulo, iso: m[3], nome: titulo, versao: /celular/i.test(l.rot) ? 'celular' : 'pdf' });
  }
  const corte = isoData(new Date(Date.now() - 30 * 864e5));
  lista.sort((a, b) => a.iso.localeCompare(b.iso));
  const recentes = lista.filter(f => f.iso >= corte);
  return recentes.length ? recentes : lista.slice(-10);
}

// (1.9.11) Campanha (MG) e outros sites WordPress: a página só tem links para páginas de download (com um visualizador),
// sem o PDF. A API pública de mídia do WordPress lista os PDFs enviados com "folheto" no nome — direto, com a data no nome.
async function listarPdfsDoWordPress(site) {
  const u = new URL(site);
  let itens;
  try {
    const r = await httpApp(`${u.origin}/wp-json/wp/v2/media?search=folheto&mime_type=application/pdf&per_page=50&_fields=source_url`);
    itens = JSON.parse(r.texto);
  } catch (_) { return []; }
  if (!Array.isArray(itens)) return [];
  const html = lst => lst.filter(i => typeof i?.source_url === 'string').map(i => `<a href="${esc(i.source_url)}"></a>`).join('');
  let lista = listarPdfsDaPagina(html(itens), u.origin);
  // São José dos Campos: os folhetos não têm "folheto" no nome, mas têm a data ("22-de-novembro-de-2026-Solenidade…"):
  // os últimos PDFs enviados, só os que têm data no nome
  if (lista.filter(f => f.iso).length < 3) {
    try {
      const r = await httpApp(`${u.origin}/wp-json/wp/v2/media?mime_type=application/pdf&per_page=60&_fields=source_url`);
      const recentes = listarPdfsDaPagina(html(JSON.parse(r.texto) || []), u.origin).filter(f => f.iso && !/informativo|boletim|agenda|calend[aá]rio|escala|missas-/i.test(f.url));
      if (recentes.length >= 3) lista = recentes;
    } catch (_) { /* fica a lista anterior */ }
  }
  return lista;
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
    if (!FolOnline.lista.length && /"start":"\d{4}-\d\d-\d\d"/.test(r.texto)) FolOnline.lista = listarPdfsDoCalendario(r.texto);
    // sem nenhum folheto com data na página (só um PDF solto, como "folheto-Eleicoes-municipais"): tenta a API do WordPress
    if (!FolOnline.lista.some(f => f.iso) && /wp-content|wp-json/.test(r.texto)) {
      const wp = await listarPdfsDoWordPress(siteFolhetos());
      if (wp.some(f => f.iso)) FolOnline.lista = wp;
    }
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
    await importarFolheto(arquivo, { nome: f.nome, data: f.iso, url: f.url });
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
    await listarFolhetosOnline();
    atualizarEtiquetaFolheto();
  } catch (_) { /* sem internet: fica quieto */ }
}
// A etiqueta "novo" do botão (com a lista já baixada): some assim que o roteiro do dia é montado (1.7.4; antes, só ao reabrir)
function atualizarEtiquetaFolheto() {
  const hoje = isoData(new Date());
  const novo = FolOnline.lista.find(f => f.iso >= hoje && !temRoteiroNoDia(f.iso));
  const b = $('#btnFolhetoOnline');
  if (!b) return;
  b.classList.toggle('tem-novo', !!novo);
  if (novo) { const d = deIso(novo.iso); b.title = `Saiu o folheto de ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}: ${novo.nome}`; }
  else b.title = '';
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
