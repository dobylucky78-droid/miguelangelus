'use strict';
/*
 * Localizar em tudo (Editar → Localizar em tudo…, Ctrl+F fora das caixas de texto): uma busca só em cantos (título,
 * autor, letra, nº do cancioneiro), orações, roteiros (nome e textos dos itens), avisos paroquiais e Bíblia.
 * Clicar num resultado abre no painel (canto, oração, versículo) ou troca para o roteiro.
 * Usa S, $, esc, semAcento, debounce, abrirItem, trocarRoteiro, mostrarAba, Oracoes, AvPar, Biblia, refLivro… (em tempo de execução).
 */
const Localizar = { resultados: [] };
const MAX_POR_GRUPO = 25;

// Trecho do texto em volta do termo encontrado (com o termo em destaque)
function trechoCom(texto, termo) {
  const t = tirarMarcas(texto).replace(/\s+/g, ' ');
  const i = semAcento(t).indexOf(termo);
  if (i < 0) return esc(t.slice(0, 90));
  const ini = Math.max(0, i - 40), fim = Math.min(t.length, i + termo.length + 50);
  return (ini > 0 ? '…' : '') + esc(t.slice(ini, i)) + '<mark>' + esc(t.slice(i, i + termo.length)) + '</mark>' +
    esc(t.slice(i + termo.length, fim)) + (fim < t.length ? '…' : '');
}

function textoDoItem(it) {
  return [it.titulo, it.ref, it.texto, it.refrao, it.convite, it.conclusao, it.resposta, it.extras, it.textoRezado,
    it.cantoId ? S.cantos.find(c => c.id === it.cantoId)?.titulo : ''].filter(Boolean).join(' ');
}

function buscarEmTudo(bruto) {
  const termo = semAcento(bruto.trim());
  if (termo.length < 2) return [];
  const grupos = [];
  const add = (nome, lista) => { if (lista.length) grupos.push({ nome, lista: lista.slice(0, MAX_POR_GRUPO), total: lista.length }); };
  const num = termo.replace(/^n[ºo°]?\s*/, '');
  add('🎵 Cantos', S.cantos.filter(c => (/^\d+[a-z]?$/.test(num) && String(c.numero || '').toLowerCase() === num) ||
      semAcento(`${c.titulo} ${c.autor || ''} ${c.refrao || ''} ${c.letra || ''}`).includes(termo))
    .sort((a, b) => (semAcento(b.titulo).includes(termo) - semAcento(a.titulo).includes(termo)) || (!!b.favorito - !!a.favorito) || a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .map(c => ({ tit: c.titulo + (c.favorito ? ' ⭐' : ''), sub: [c.momento, c.autor].filter(Boolean).join(' · '),
      trecho: semAcento(c.titulo).includes(termo) ? '' : trechoCom(`${c.refrao || ''} ${c.letra || ''}`, termo),
      abrir: () => { mostrarAba('cantos'); abrirItem({ tipo: 'canto', cantoId: c.id }); } })));
  add('🙏 Orações', (typeof Oracoes !== 'undefined' ? Oracoes.lista : []).filter(o => semAcento(`${o.titulo} ${o.categoria || ''} ${o.texto}`).includes(termo))
    .map(o => ({ tit: o.titulo, sub: o.categoria || '', trecho: semAcento(o.titulo).includes(termo) ? '' : trechoCom(o.texto, termo),
      abrir: () => { mostrarAba('missa'); abrirItem({ tipo: 'oracao', oracaoId: o.id }); } })));
  add('📋 Roteiros', S.roteiros.map(r => {
    if (semAcento(r.nome).includes(termo)) return { r, trecho: '' };
    const it = (r.itens || []).find(i => semAcento(textoDoItem(i)).includes(termo));
    return it ? { r, trecho: trechoCom(textoDoItem(it), termo) } : null;
  }).filter(Boolean).sort((a, b) => (b.r.atualizado || 0) - (a.r.atualizado || 0))
    .map(({ r, trecho }) => ({ tit: r.nome, sub: '', trecho, abrir: () => { trocarRoteiro(r); mostrarAba('roteiros'); } })));
  if (typeof AvPar !== 'undefined')
    add('📢 Avisos', [...AvPar.lista.map(a => ({ t: a.texto, prog: true })), ...AvPar.convites.map(c => ({ t: c.texto }))]
      .filter(a => semAcento(a.t).includes(termo))
      .map(a => ({ tit: a.prog ? 'Aviso programado' : 'Aviso salvo', sub: '', trecho: trechoCom(a.t, termo),
        abrir: () => a.prog ? abrirAvisosPar() : abrirAviso() })));
  if (S.biblia && termo.length >= 3)
    add('📖 Bíblia', Biblia.buscar(S.biblia, bruto.trim(), 200).map(v => {
      const ref = `${refLivro(S.biblia.livros[v.li])} ${v.c},${v.n}`;
      return { tit: ref, sub: '', trecho: trechoCom(v.t, termo), abrir: () => { mostrarAba('biblia'); abrirItem({ tipo: 'biblia', ref }); } };
    }));
  return grupos;
}

function renderLocalizar() {
  const bruto = $('#locTermo').value;
  const grupos = buscarEmTudo(bruto);
  Localizar.resultados = grupos.flatMap(g => g.lista);
  let k = 0;
  $('#locResultados').innerHTML = bruto.trim().length < 2 ? '<p class="sutil">Digite pelo menos 2 letras.</p>'
    : !grupos.length ? `<p class="sutil">Nada encontrado para "${esc(bruto.trim())}".</p>`
    : grupos.map(g => `<div class="loc-grupo">${g.nome} <span class="sutil">(${g.total}${g.total > g.lista.length ? `, mostrando ${g.lista.length}` : ''})</span></div>` +
      g.lista.map(x => `<button type="button" class="loc-item" data-loc="${k++}"><b>${esc(x.tit)}</b>${x.sub ? ` <span class="sutil">${esc(x.sub)}</span>` : ''}
        ${x.trecho ? `<div class="loc-trecho">${x.trecho}</div>` : ''}</button>`).join('')).join('');
}

function abrirLocalizar() {
  abrirDialogo('dlgLocalizar');
  const c = $('#locTermo');
  c.select(); c.focus();
  renderLocalizar();
}

function ligarLocalizar() {
  $('#locTermo').addEventListener('input', debounce(renderLocalizar, 200));
  $('#locTermo').addEventListener('keydown', e => {
    if (e.key === 'Enter' && Localizar.resultados[0]) { e.preventDefault(); $('#dlgLocalizar').close(); Localizar.resultados[0].abrir(); }
  });
  $('#locResultados').addEventListener('click', e => {
    const b = e.target.closest('[data-loc]');
    if (!b) return;
    $('#dlgLocalizar').close();
    Localizar.resultados[+b.dataset.loc]?.abrir();
  });
  // Ctrl+F fora das caixas de texto (dentro de uma lista, cada busca continua a dela)
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== 'f' || document.querySelector('dialog[open]')) return;
    if (e.target instanceof Element && e.target.matches('input, textarea, select')) return;
    e.preventDefault(); abrirLocalizar();
  });
}
