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

async function listarFolhetosOnline() {
  const r = await httpApp(URL_FOLHETOS);
  const doc = new DOMParser().parseFromString(r.texto, 'text/html');
  const cdf = r.texto.match(/CDF\s*=\s*(\{[^}]*\})/);
  try { FolOnline.cdf = cdf ? JSON.parse(cdf[1]) : null; } catch (_) { FolOnline.cdf = null; }
  FolOnline.lista = [...doc.querySelectorAll('a.link-folheto')].map(a => ({
    url: a.getAttribute('href') || '',
    id: a.dataset.folhetoId || '',
    titulo: (a.dataset.folhetoTitulo || a.textContent).replace(/\s+/g, ' ').trim(),
  })).filter(f => /\(celular\)\s*$/i.test(f.titulo) && /^https:/.test(f.url))
    .map(f => ({ ...f, iso: deDataBR(f.titulo), nome: f.titulo.replace(/^\d{2}\/\d{2}\/\d{4}\s*-\s*/, '').replace(/\s*\(celular\)\s*$/i, '') }))
    .sort((a, b) => a.iso.localeCompare(b.iso));
  return FolOnline.lista;
}

const temRoteiroNoDia = iso => S.roteiros.some(r => infoRoteiro(r).iso === iso && r.itens.length > 3);

function renderFolhetosOnline(estado) {
  const el = $('#folOnlineLista');
  if (estado) { el.innerHTML = `<p class="sutil">${esc(estado)}</p>`; return; }
  if (!FolOnline.lista.length) { el.innerHTML = '<p class="sutil">Nenhum folheto "Celular" encontrado na página da Arquidiocese.</p>'; return; }
  const hoje = isoData(new Date());
  const proximo = FolOnline.lista.find(f => f.iso >= hoje);
  el.innerHTML = FolOnline.lista.map(f => {
    const d = f.iso ? deIso(f.iso) : null;
    const quando = d ? `${DIAS_CURTOS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : '';
    const ja = f.iso && temRoteiroNoDia(f.iso);
    return `<div class="fol-item ${f === proximo ? 'proximo' : ''} ${f.iso && f.iso < hoje ? 'passado' : ''}">
      <span class="fol-data">${esc(quando)}</span>
      <span class="fol-nome">${esc(f.nome)}${f === proximo ? ' <b class="fol-tag">próximo</b>' : ''}${ja ? ' <span class="fol-ja">já tem roteiro</span>' : ''}</span>
      <button data-fol="${esc(f.url)}" class="${f === proximo && !ja ? 'primario' : ''}">⬇ Baixar e montar</button></div>`;
  }).join('');
}

async function abrirFolhetosOnline() {
  if (!NO_APP) {
    if (confirm('No navegador o MiguelAngelus não consegue baixar sozinho.\nAbrir a página de folhetos da Arquidiocese? Baixe a versão "Celular" e use o botão 📄 Folheto.')) window.open(URL_FOLHETOS, '_blank');
    return;
  }
  abrirDialogo('dlgFolhetoOnline');
  renderFolhetosOnline('Procurando os folhetos publicados…');
  try { await listarFolhetosOnline(); renderFolhetosOnline(); }
  catch (e) { renderFolhetosOnline('Não consegui abrir a página da Arquidiocese: ' + e.message); }
}

function base64ParaBytes(b64) {
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

async function baixarFolhetoOnline(f, botao) {
  if (botao) { botao.disabled = true; botao.textContent = 'Baixando…'; }
  try {
    const r = await httpApp(f.url, { binario: true });
    let bytes = base64ParaBytes(r.base64);
    // o servidor do site às vezes manda espaços/linhas em branco antes do "%PDF": procura o começo e descarta o resto
    const inicio = String.fromCharCode(...bytes.slice(0, 1024)).indexOf('%PDF');
    if (inicio < 0) throw new Error('o site não devolveu um PDF');
    if (inicio > 0) bytes = bytes.slice(inicio);
    // conta o download no site, como um clique no link (sem esperar)
    if (FolOnline.cdf?.ajax_url) httpApp(FolOnline.cdf.ajax_url, { metodo: 'POST', corpo: {
      action: 'cdf_registrar_clique', nonce: FolOnline.cdf.nonce || '', folheto_id: f.id, folheto_titulo: f.titulo, folheto_url: f.url } }).catch(() => {});
    const d = f.iso ? f.iso.split('-').reverse().join('.').replace(/^(\d\d\.\d\d\.)\d\d(\d\d)$/, '$1$2') : '';
    const arquivo = new File([bytes], `A Missa - ${f.nome}_CELULAR - ${d}.pdf`.replace(/[\\/:*?"<>|]/g, '-'), { type: 'application/pdf' });
    $('#dlgFolhetoOnline').close();
    await importarFolheto(arquivo);
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
