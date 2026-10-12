'use strict';
/*
 * Links no celular (Ajustes → 📱 Controle pelo celular → 🔗 Links): botões que aparecem no celular (músicos e controle)
 * e abrem outra página — ex.: a mesa de som Soundcraft Ui24R (http://192.168.0.20, no roteador do MiguelAngelus).
 * Guardados na config 'links' (vão para os outros computadores pela nuvem). Vêm com a mesa de som já cadastrada.
 * Usa S, DB, $, esc, uid, toast, agendarEstadoCelular (em tempo de execução).
 */
const Links = { lista: [] };
const ICONES_LINK = ['🎚️', '🎛️', '🎤', '🎸', '🎹', '🥁', '🎵', '📖', '📄', '📷', '🌐', '🔗', '💬', '⛪'];
const PARA_LINK = [['todos', 'Todos'], ['musico', 'Só músicos'], ['controle', 'Só o controle (PASCOM)']];
const LINKS_PADRAO = [{ nome: 'Mesa de som', url: 'http://192.168.0.20', icone: '🎚️', para: 'todos' }];

const urlValida = u => /^https?:\/\/[^\s"'<>]+$/i.test(String(u || '').trim());
const salvarLinks = () => DB.salvar('config', { id: 'links', valor: { lista: Links.lista } });

async function carregarLinks() {
  const r = await DB.obter('config', 'links');
  // sem nada gravado: a mesa de som, só na memória (gravar aqui seria "mais novo" que a lista editada em outro computador
  // e passaria por cima dela na sincronização); grava na 1ª mudança
  Links.lista = r ? r.valor?.lista || [] : LINKS_PADRAO.map((l, i) => ({ id: 'padrao' + i, ...l }));
  renderLinks();
}

// Para o celular: só os completos (nome e endereço http/https). img = ícone em imagem (ex.: o logo da mesa), já pequeno
const linksCelular = () => Links.lista.filter(l => l.nome && urlValida(l.url))
  .map(l => ({ nome: l.nome, url: l.url.trim(), icone: l.icone || '🔗', img: /^data:image\//.test(l.img || '') ? l.img : '', para: l.para || 'todos' }));

// Imagem escolhida para o ícone → quadradinho de 96 px (PNG), para não pesar no que vai ao celular
function iconeDeArquivo(arquivo) {
  return new Promise((ok, falha) => {
    const img = new Image(), url = URL.createObjectURL(arquivo);
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = 96;
      const g = c.getContext('2d'), e = Math.min(96 / img.width, 96 / img.height), w = img.width * e, h = img.height * e;
      g.drawImage(img, (96 - w) / 2, (96 - h) / 2, w, h);
      URL.revokeObjectURL(url); ok(c.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('imagem')); };
    img.src = url;
  });
}

function renderLinks() {
  const el = $('#linksCel');
  if (!el) return;
  el.innerHTML = Links.lista.length ? Links.lista.map(l => `
    <div class="link-cel" data-link="${esc(l.id)}">
      ${l.img ? `<button type="button" class="link-img" data-lk-img title="Ícone em imagem — clique para trocar; ✕ volta ao emoji"><img src="${l.img}" alt=""><span data-lk-semimg>✕</span></button>`
        : `<select data-lk="icone" title="Ícone (ou 🖼 uma imagem sua)">${ICONES_LINK.map(i => `<option ${i === l.icone ? 'selected' : ''}>${i}</option>`).join('')}<option value="+img">🖼 Imagem…</option></select>`}
      <input data-lk="nome" value="${esc(l.nome)}" placeholder="Nome (ex.: Mesa de som)" maxlength="40">
      <input data-lk="url" value="${esc(l.url)}" placeholder="http://192.168.0.20" class="${l.url && !urlValida(l.url) ? 'invalido' : ''}"
        title="Endereço completo, começando com http:// ou https://">
      <select data-lk="para" title="Em quais celulares aparece">${PARA_LINK.map(([v, n]) => `<option value="${v}" ${v === (l.para || 'todos') ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <button type="button" data-lk-testar title="Abrir este endereço aqui no computador">Testar</button>
      <button type="button" data-lk-tirar class="perigo" title="Tirar este link">✕</button>
    </div>`).join('') : '<p class="sutil pequeno">Nenhum link. Clique em <b>Adicionar link</b>.</p>';
}

let timerLinks = 0;
function aposMudarLinks(redesenhar) {
  if (redesenhar) renderLinks();
  clearTimeout(timerLinks);
  timerLinks = setTimeout(async () => { await salvarLinks(); if (typeof agendarEstadoCelular === 'function') agendarEstadoCelular(); }, 400);
}

function escolherIconeLink(l) {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    try { l.img = await iconeDeArquivo(f); aposMudarLinks(true); }
    catch (_) { toast('Não consegui abrir esta imagem (use PNG ou JPG).'); }
  };
  inp.click();
}

function ligarLinks() {
  $('#btnLinkNovo').addEventListener('click', () => {
    Links.lista.push({ id: uid(), nome: '', url: 'http://', icone: '🔗', para: 'todos' });
    aposMudarLinks(true);
    $$('#linksCel [data-lk="nome"]').pop()?.focus();
  });
  $('#linksCel').addEventListener('input', e => {
    const row = e.target.closest('[data-link]'), k = e.target.dataset.lk;
    const l = row && Links.lista.find(x => x.id === row.dataset.link);
    if (!l || !k) return;
    if (k === 'icone' && e.target.value === '+img') { e.target.value = l.icone || '🔗'; return escolherIconeLink(l); }
    l[k] = e.target.value;
    if (k === 'url') e.target.classList.toggle('invalido', !!l.url && l.url !== 'http://' && !urlValida(l.url));
    aposMudarLinks(false);
  });
  $('#linksCel').addEventListener('click', e => {
    const row = e.target.closest('[data-link]');
    const l = row && Links.lista.find(x => x.id === row.dataset.link);
    if (!l) return;
    if (e.target.closest('[data-lk-semimg]')) { delete l.img; return aposMudarLinks(true); }
    if (e.target.closest('[data-lk-img]')) return escolherIconeLink(l);
    if (e.target.closest('[data-lk-testar]')) {
      if (!urlValida(l.url)) return toast('Endereço incompleto: comece com http:// ou https://');
      return window.open(l.url.trim(), '_blank');
    }
    if (e.target.closest('[data-lk-tirar]') && confirm(`Tirar o link "${l.nome || l.url}"? (Nos outros computadores também.)`)) {
      Links.lista = Links.lista.filter(x => x !== l);
      aposMudarLinks(true);
    }
  });
  carregarLinks();
}
