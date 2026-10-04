'use strict';
/*
 * Negrito, itálico e sublinhado em trechos dos textos (cantos, orações, itens do roteiro, apresentações…).
 * Ao editar qualquer caixa de texto aparece uma barrinha "N I S" no canto; os botões (ou Ctrl+B / Ctrl+I / Ctrl+U)
 * colocam <b>…</b>, <i>…</i> ou <u>…</u> em volta do trecho selecionado (de novo, tira). O telão mostra formatado.
 */
const Formato = { alvo: null, timer: 0 };
const TAGS = { negrito: 'b', italico: 'i', sublinhado: 'u' };

function aplicarFormato(ta, tag) {
  const ini = ta.selectionStart, fim = ta.selectionEnd, v = ta.value;
  const abre = `<${tag}>`, fecha = `</${tag}>`;
  const sel = v.slice(ini, fim);
  ta.focus();
  if (v.slice(ini - abre.length, ini) === abre && v.slice(fim, fim + fecha.length) === fecha) {
    // já formatado em volta da seleção: tira
    ta.setRangeText(sel, ini - abre.length, fim + fecha.length, 'select');
  } else if (sel.startsWith(abre) && sel.endsWith(fecha) && sel.length >= abre.length + fecha.length) {
    ta.setRangeText(sel.slice(abre.length, sel.length - fecha.length), ini, fim, 'select');
  } else if (ini === fim) {
    ta.setRangeText(abre + fecha, ini, fim, 'end');
    ta.selectionStart = ta.selectionEnd = ini + abre.length;   // cursor no meio, para digitar já formatado
  } else {
    // não formata o espaço/quebra de linha das pontas da seleção
    const esq = sel.match(/^\s*/)[0].length, dir = sel.match(/\s*$/)[0].length;
    const miolo = sel.slice(esq, sel.length - dir);
    ta.setRangeText(sel.slice(0, esq) + abre + miolo + fecha + sel.slice(sel.length - dir), ini, fim, 'select');
  }
  ta.dispatchEvent(new Event('input', { bubbles: true }));    // salva como se tivesse digitado
}

function posicionarBarra() {
  const b = $('#barraFormato'), ta = Formato.alvo;
  if (!ta || !document.body.contains(ta)) { b.hidden = true; return; }
  const r = ta.getBoundingClientRect();
  b.hidden = false;
  const larg = b.offsetWidth;
  b.style.left = Math.max(4, Math.min(innerWidth - larg - 4, r.right - larg)) + 'px';
  b.style.top = Math.max(4, r.top - b.offsetHeight - 2) + 'px';
}

function ligarFormatacao() {
  const b = document.createElement('div');
  b.id = 'barraFormato'; b.className = 'barra-formato'; b.hidden = true;
  b.innerHTML = '<button type="button" data-fmt="negrito" title="Negrito (Ctrl+B)"><b>N</b></button>' +
    '<button type="button" data-fmt="italico" title="Itálico (Ctrl+I)"><i>I</i></button>' +
    '<button type="button" data-fmt="sublinhado" title="Sublinhado (Ctrl+U)"><u>S</u></button>';
  document.body.appendChild(b);
  // mousedown com preventDefault: a caixa de texto não perde o foco nem a seleção
  b.addEventListener('mousedown', e => {
    const bt = e.target.closest('[data-fmt]');
    e.preventDefault();
    if (bt && Formato.alvo) aplicarFormato(Formato.alvo, TAGS[bt.dataset.fmt]);
  });
  document.addEventListener('focusin', e => {
    if (e.target.tagName === 'TEXTAREA') { clearTimeout(Formato.timer); Formato.alvo = e.target; posicionarBarra(); }
  });
  document.addEventListener('focusout', e => {
    if (e.target === Formato.alvo) Formato.timer = setTimeout(() => { Formato.alvo = null; b.hidden = true; }, 150);
  });
  document.addEventListener('keydown', e => {
    if (e.target.tagName !== 'TEXTAREA' || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    const tag = { b: 'b', i: 'i', u: 'u' }[e.key.toLowerCase()];
    if (!tag) return;
    e.preventDefault(); e.stopPropagation();
    aplicarFormato(e.target, tag);
  }, true);
  // a barra acompanha a caixa (rolagem, redimensionar, diálogos)
  addEventListener('scroll', () => { if (!b.hidden) posicionarBarra(); }, true);
  addEventListener('resize', () => { if (!b.hidden) posicionarBarra(); });
}
