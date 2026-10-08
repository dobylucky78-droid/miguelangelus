'use strict';
/*
 * Desfazer / Refazer (Editar, Ctrl+Z / Ctrl+Y) nas mudanças do roteiro aberto: itens acrescentados, apagados, movidos,
 * canto trocado, textos, nome, data… Cada roteiro tem o seu histórico (até 60 passos), só nesta sessão.
 * Quem grava é salvarRoteiroAgora() (app.js): cada gravação que mudou algo vira um passo (a digitação junta sozinha,
 * porque a gravação espera o fim da digitação). Dentro de uma caixa de texto, Ctrl+Z continua desfazendo a digitação.
 * Usa S, $, $$, toast, salvarRoteiroAgora, abrirItem, render… (em tempo de execução).
 */
const Hist = { porRoteiro: new Map(), aplicando: false };
const CAMPOS_HIST = ['nome', 'data', 'hora', 'responsavel', 'localId', 'corManual', 'itens'];
const fotoRoteiro = r => JSON.stringify(Object.fromEntries(CAMPOS_HIST.map(k => [k, r[k] ?? null])));
const histDe = r => {
  if (!Hist.porRoteiro.has(r.id)) Hist.porRoteiro.set(r.id, { antes: [], depois: [], ultimo: fotoRoteiro(r) });
  return Hist.porRoteiro.get(r.id);
};

// Ao abrir um roteiro: o ponto de partida do histórico dele
function baseHistorico(r) { if (r) histDe(r); atualizarMenuDesfazer(); }

// Chamado a cada gravação do roteiro aberto
function registrarHistorico(r) {
  if (!r || Hist.aplicando) return;
  const h = histDe(r), agora = fotoRoteiro(r);
  if (agora === h.ultimo) return;
  h.antes.push(h.ultimo);
  if (h.antes.length > 60) h.antes.shift();
  h.depois = [];
  h.ultimo = agora;
  atualizarMenuDesfazer();
}

function aplicarFoto(r, foto) {
  const d = JSON.parse(foto);
  for (const k of CAMPOS_HIST) { if (d[k] === null) delete r[k]; else r[k] = d[k]; }
  Hist.aplicando = true;
  salvarRoteiroAgora();
  Hist.aplicando = false;
  // o item aberto foi trocado por uma cópia: abre o da mesma posição (se ainda existir)
  const pos = S.atual && S.atual.rIdx >= 0 ? S.atual.rIdx : -1;
  if (pos >= 0) { const it = r.itens[pos]; if (it) abrirItem(it, pos); else S.atual = null; }
  renderRoteiroCab(); renderRoteiroLista(); renderCabecalho(); renderSlides();
  if (typeof renderLocalRoteiro === 'function') renderLocalRoteiro();
  atualizarMenuDesfazer();
}

function desfazer() {
  const r = S.roteiro;
  if (!r) return;
  registrarHistorico(r);                        // a última mudança que ainda não tinha sido gravada
  const h = histDe(r);
  if (!h.antes.length) return toast('Nada para desfazer neste roteiro.');
  h.depois.push(h.ultimo);
  h.ultimo = h.antes.pop();
  aplicarFoto(r, h.ultimo);
  toast('↶ Desfeito.');
}

function refazer() {
  const r = S.roteiro;
  if (!r) return;
  const h = histDe(r);
  if (!h.depois.length) return toast('Nada para refazer.');
  h.antes.push(h.ultimo);
  h.ultimo = h.depois.pop();
  aplicarFoto(r, h.ultimo);
  toast('↷ Refeito.');
}

function atualizarMenuDesfazer() {
  const h = S.roteiro ? Hist.porRoteiro.get(S.roteiro.id) : null;
  const a = $('[data-menu="desfazer"]'), b = $('[data-menu="refazer"]');
  if (a) a.disabled = !(h && h.antes.length);
  if (b) b.disabled = !(h && h.depois.length);
}

function ligarHistorico() {
  // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z — fora das caixas de texto (lá dentro, desfaz a digitação, como sempre)
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || document.querySelector('dialog[open]')) return;
    if (e.target instanceof Element && e.target.matches('input, textarea, select, [contenteditable]')) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); desfazer(); }
    else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); refazer(); }
  });
  baseHistorico(S.roteiro);
}
