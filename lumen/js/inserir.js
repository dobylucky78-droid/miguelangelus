'use strict';
/*
 * (1.8.0, pedido do Lucas, que prefere o teclado) Inserir no roteiro pelo teclado: Ctrl+I (fora das caixas de texto)
 * ou a tecla Insert abre uma lista com tudo o que dá para adicionar — tipos de item, Canto já com o momento,
 * Parte da Missa e Momento já com o nome. Digita um pedaço ("bênção", "comunhão", "pai nosso"), ↑ ↓ escolhe, Enter insere
 * depois do item aberto (o mesmo lugar dos botões "Adicionar").
 * Usa S, $, esc, semAcento, novoItem, adicionarAoRoteiro, abrirItem, adicionarTercoAoRoteiro, Ordinario, momentosCantos,
 * MOMENTOS_MISSA, abrirDialogo, toast (em tempo de execução).
 */
const Inserir = { opcoes: [], vistas: [], sel: 0 };

function opcoesInserir() {
  const o = [];
  const add = (grupo, nome, tipo, extra = {}, dica = '') => o.push({ grupo, nome, tipo, extra, dica });
  add('Item', 'Canto', 'canto', {}, 'escolhe o canto depois');
  add('Item', 'Leitura', 'leitura');
  add('Item', 'Salmo', 'salmo');
  add('Item', 'Antífona', 'antifona', {}, 'de Entrada ou da Comunhão');
  add('Item', 'Intenções da Missa', 'intencoes');
  add('Item', 'Oração', 'oracao');
  add('Item', 'Ângelus', 'angelus');
  add('Item', 'Terço', 'terco', {}, 'abertura, mistérios do dia e encerramento');
  add('Item', 'Ladainha', 'ladainha');
  add('Item', 'Preces (Oração dos Fiéis)', 'preces');
  add('Item', 'Homilia', 'homilia');
  add('Item', 'Texto', 'texto');
  add('Item', 'Imagem (banner, flyer…)', 'imagem', {}, 'só a imagem, ou com texto');
  add('Item', 'Avisos', 'avisos');
  add('Item', 'Mídia (vídeo, áudio, câmera)', 'midia');
  add('Item', 'Momento (slide só com o nome)', 'momento');
  for (const m of (typeof momentosCantos === 'function' ? momentosCantos() : [])) add('Canto', `Canto · ${m}`, 'canto', { momento: m });
  for (const g of Ordinario.grupos) for (const p of g.partes) add('Parte da Missa', `Parte da Missa · ${p.titulo}`, 'ordinario', { parte: p.id }, g.grupo);
  for (const [g, ns] of MOMENTOS_MISSA) for (const n of ns) add('Momento', `Momento · ${n}`, 'momento', { titulo: n }, g);
  return o;
}

function filtrarInserir() {
  const palavras = semAcento($('#insTermo').value.trim()).split(/\s+/).filter(Boolean);
  Inserir.vistas = !palavras.length ? Inserir.opcoes.filter(x => x.grupo === 'Item')
    : Inserir.opcoes.filter(x => { const t = semAcento(`${x.nome} ${x.dica}`); return palavras.every(p => t.includes(p)); });
  // o que começa com o termo vem antes ("missa" não deve trazer primeiro tudo de "Parte da Missa")
  if (palavras.length) {
    const ini = x => semAcento(x.nome.split(' · ').pop()).startsWith(palavras[0]) ? 0 : 1;
    Inserir.vistas = Inserir.vistas.map((x, i) => [x, i]).sort((a, b) => ini(a[0]) - ini(b[0]) || a[1] - b[1]).map(a => a[0]);
  }
  Inserir.sel = 0;
  renderInserir();
}

function renderInserir() {
  const el = $('#insLista');
  el.innerHTML = Inserir.vistas.length
    ? Inserir.vistas.slice(0, 80).map((x, i) => `<button type="button" class="loc-item ${i === Inserir.sel ? 'foco' : ''}" data-ins="${i}">
        <b>${esc(x.nome)}</b>${x.dica ? ` <span class="sutil">${esc(x.dica)}</span>` : ''}</button>`).join('')
    : `<p class="sutil">Nada com "${esc($('#insTermo').value.trim())}".</p>`;
  el.querySelector('.foco')?.scrollIntoView({ block: 'nearest' });
}

function abrirInserir() {
  if (!S.roteiro) return toast('Abra um roteiro primeiro.');
  Inserir.opcoes = opcoesInserir();
  abrirDialogo('dlgInserir');
  const c = $('#insTermo');
  c.value = ''; c.focus();
  filtrarInserir();
}

function inserirEscolhido(x) {
  if (!x) return;
  $('#dlgInserir').close();
  if (x.tipo === 'terco') return adicionarTercoAoRoteiro();
  const it = { ...novoItem(x.tipo), ...x.extra };
  const pos = adicionarAoRoteiro(it);
  abrirItem(it, pos);
  toast(`${x.nome.replace(' · ', ': ')} — inserido na posição ${pos + 1}.`);
  // já pronto para completar: o canto procura pela busca; os demais, o 1º campo
  const alvo = x.tipo === 'canto' ? '#itemCab [data-buscacanto]'
    : it.intencoes || it.antifona ? '#itemCab textarea'
    : x.tipo === 'momento' && it.titulo ? '#itemCab input[data-campo=sub]'
    : '#itemCab input:not([type=checkbox]), #itemCab select, #itemCab textarea';
  setTimeout(() => $(alvo)?.focus(), 0);
}

function ligarInserir() {
  $('#insTermo').addEventListener('input', filtrarInserir);
  $('#insTermo').addEventListener('keydown', e => {
    const n = Math.min(Inserir.vistas.length, 80);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (n) { Inserir.sel = (Inserir.sel + (e.key === 'ArrowDown' ? 1 : -1) + n) % n; renderInserir(); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      inserirEscolhido(Inserir.vistas[Inserir.sel]);
    }
  });
  $('#insLista').addEventListener('click', e => {
    const b = e.target.closest('[data-ins]');
    if (b) inserirEscolhido(Inserir.vistas[+b.dataset.ins]);
  });
  // Ctrl+I fora das caixas de texto (dentro delas é o itálico) e Insert
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]')) return;
    const emCampo = e.target instanceof Element && e.target.matches('input, textarea, select, [contenteditable]');
    const ctrlI = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'i';
    const ins = e.key === 'Insert' && !e.ctrlKey && !e.altKey && !e.shiftKey;
    if ((ctrlI || ins) && !emCampo) { e.preventDefault(); abrirInserir(); }
  });
}
