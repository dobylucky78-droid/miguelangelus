'use strict';
/*
 * 🏷 Classificações dos cantos (aba Cantos → ⚙, ou Editar → Classificações dos cantos…): criar, renomear, apagar e pôr em ordem.
 * As da Missa (MOMENTOS) não mudam de nome nem são apagadas (o folheto, o roteiro e o "rezado" dependem delas), mas mudam de lugar.
 * Guardadas na config 'classificacoes' { lista: [nomes, na ordem] } — vão para os outros computadores pela nuvem.
 * Usa S, MOMENTOS, DB, renderCantos, renderRoteiroLista, abrirDialogo, toast, $, esc (em tempo de execução).
 */
const Classif = { lista: null };
const ehDaMissa = m => MOMENTOS.includes(m);

async function carregarClassificacoes() {
  const r = await DB.obter('config', 'classificacoes');
  Classif.lista = Array.isArray(r?.valor?.lista) ? r.valor.lista.filter(x => typeof x === 'string' && x.trim()) : null;
  preencherMomentos();
}
const salvarClassificacoes = () => DB.salvar('config', { id: 'classificacoes', valor: { lista: Classif.lista } });

// A lista na ordem escolhida: a guardada + as da Missa que faltarem (versão nova) + as que vierem de cantos importados; "Outros" no fim
function momentosCantos() {
  const base = (Classif.lista || MOMENTOS).filter((m, i, a) => a.indexOf(m) === i && m !== 'Outros');
  MOMENTOS.forEach((m, i) => {
    if (m === 'Outros' || base.includes(m)) return;
    const ant = MOMENTOS.slice(0, i).reverse().find(x => base.includes(x));
    base.splice(ant ? base.indexOf(ant) + 1 : 0, 0, m);
  });
  const extras = [...new Set((S.cantos || []).map(c => c.momento || 'Outros'))].filter(m => m !== 'Outros' && !base.includes(m))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return [...base, ...extras, 'Outros'];
}

// Os <select> fixos da tela (filtro da aba Cantos e o editor de canto) acompanham a lista
// (renderCantos chama sempre: só refaz quando a lista mudou — canto importado com classificação nova, nuvem…)
function preencherMomentos() {
  const f = $('#filtroMomento'), e = $('#formCanto')?.momento, l = momentosCantos(), chave = l.join('|');
  if (chave === Classif.preenchida) return;
  Classif.preenchida = chave;
  const ops = l.map(m => `<option>${esc(m)}</option>`).join('');
  if (f) { const v = f.value; f.innerHTML = '<option value="">Todos os momentos</option>' + ops; f.value = l.includes(v) ? v : ''; }
  if (e) { const v = e.value; e.innerHTML = ops; if (v) e.value = v; }
}

// ---------- tela ----------
function abrirClassificacoes() {
  renderClassificacoes();
  $('#classifNova').value = '';
  abrirDialogo('dlgClassif');
}
function renderClassificacoes() {
  const l = momentosCantos(), n = m => S.cantos.filter(c => (c.momento || 'Outros') === m).length;
  $('#classifLista').innerHTML = l.map((m, i) => {
    const fixa = ehDaMissa(m), outros = m === 'Outros';
    return `<div class="classif-it" data-m="${esc(m)}">
      <span class="classif-nome">${fixa ? '🔒 ' : '🏷 '}${esc(m)}</span><span class="sutil pequeno">${n(m)} canto(s)</span>
      <span class="espaco"></span>
      <button type="button" data-cl="subir" ${i === 0 || outros ? 'disabled' : ''} title="Mais para cima">▲</button>
      <button type="button" data-cl="descer" ${outros || i >= l.length - 2 ? 'disabled' : ''} title="Mais para baixo">▼</button>
      <button type="button" data-cl="renomear" ${fixa ? 'disabled title="As da Missa não mudam de nome"' : 'title="Renomear (os cantos vão junto)"'}>✏️</button>
      <button type="button" data-cl="apagar" ${fixa ? 'disabled title="As da Missa não são apagadas"' : 'title="Apagar (os cantos vão para Outros)"'}>🗑</button>
    </div>`;
  }).join('');
}
async function guardarOrdem(l) {
  Classif.lista = l.filter(m => m !== 'Outros');
  await salvarClassificacoes();
  preencherMomentos(); renderClassificacoes();
  try { renderCantos(); } catch (_) {}
}

// troca o nome nos cantos e nos itens dos roteiros (de → para; para = 'Outros' ao apagar)
async function moverCantos(de, para) {
  for (const c of S.cantos.filter(c => (c.momento || 'Outros') === de)) { c.momento = para; await DB.salvar('cantos', c); }
  for (const r of S.roteiros) {
    let mudou = false;
    for (const it of r.itens || []) if (it.momento === de) { it.momento = para; mudou = true; }
    if (mudou) await DB.salvar('roteiros', r);
  }
}
const limparNome = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 40);

async function criarClassificacao() {
  const nome = limparNome($('#classifNova').value), l = momentosCantos();
  if (!nome) return $('#classifNova').focus();
  const igual = l.find(m => m.toLowerCase() === nome.toLowerCase());
  if (igual) return toast(`Já existe a classificação "${igual}".`);
  l.splice(l.length - 1, 0, nome);                 // antes de "Outros"
  $('#classifNova').value = '';
  await guardarOrdem(l);
  toast(`🏷 Classificação "${nome}" criada.`);
}

async function acaoClassificacao(acao, m) {
  const l = momentosCantos(), i = l.indexOf(m);
  if (i < 0) return;
  if (acao === 'subir' || acao === 'descer') {
    const j = acao === 'subir' ? i - 1 : i + 1;
    if (j < 0 || j >= l.length - 1) return;
    [l[i], l[j]] = [l[j], l[i]];
    return guardarOrdem(l);
  }
  if (ehDaMissa(m)) return;
  const qtd = S.cantos.filter(c => (c.momento || 'Outros') === m).length;
  if (acao === 'renomear') {
    const novo = limparNome(prompt(`Novo nome para "${m}":`, m));
    if (!novo || novo === m) return;
    const igual = l.find(x => x !== m && x.toLowerCase() === novo.toLowerCase());
    if (igual && !confirm(`Já existe "${igual}". Juntar os ${qtd} canto(s) de "${m}" em "${igual}"?`)) return;
    await moverCantos(m, igual || novo);
    if (igual) l.splice(i, 1); else l[i] = novo;
    await guardarOrdem(l);
    try { renderRoteiroLista(); } catch (_) {}
    toast(igual ? `🏷 "${m}" juntada em "${igual}".` : `🏷 "${m}" agora é "${novo}".`);
  }
  if (acao === 'apagar') {
    if (!confirm(qtd ? `Apagar a classificação "${m}"? Os ${qtd} canto(s) dela vão para "Outros" (nenhum canto é apagado).` : `Apagar a classificação "${m}"?`)) return;
    await moverCantos(m, 'Outros');
    l.splice(i, 1);
    await guardarOrdem(l);
    try { renderRoteiroLista(); } catch (_) {}
    toast(`🏷 Classificação "${m}" apagada.`);
  }
}

function ligarClassificacoes() {
  $('#btnClassif').addEventListener('click', abrirClassificacoes);
  $('#btnClassifNova').addEventListener('click', criarClassificacao);
  $('#classifNova').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); criarClassificacao(); } });
  $('#classifLista').addEventListener('click', e => {
    const b = e.target.closest('[data-cl]');
    if (b) acaoClassificacao(b.dataset.cl, b.closest('[data-m]').dataset.m);
  });
}
