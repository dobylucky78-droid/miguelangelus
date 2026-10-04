'use strict';
/*
 * Negrito, itálico e sublinhado em trechos dos textos (cantos, orações, itens do roteiro, apresentações…).
 * Ao editar qualquer caixa de texto aparece uma barrinha "N I S" no canto; os botões (ou Ctrl+B / Ctrl+I / Ctrl+U)
 * colocam <b>…</b>, <i>…</i> ou <u>…</u> em volta do trecho selecionado (de novo, tira). O telão mostra formatado.
 */
const Formato = { alvo: null, timer: 0 };
const TAGS = { negrito: 'b', italico: 'i', sublinhado: 'u' };

// Liga/desliga como no Word: se o trecho selecionado já está todo formatado, tira; senão, formata o trecho inteiro.
// O texto é lido letra por letra ("esta letra está em negrito?") e as marcas são reescritas do zero, então nunca
// sobram marcas repetidas ou vazias. As marcas fecham no fim de cada linha (uma linha pode ir para outro slide).
function aplicarFormato(ta, tag) {
  const v = ta.value, ini = ta.selectionStart, fim = ta.selectionEnd;
  const abre = `<${tag}>`, fecha = `</${tag}>`;
  ta.focus();
  // cursor sem seleção: "<b></b>" vazio onde está o cursor some; senão, cria um para digitar já formatado
  if (ini === fim) {
    if (v.slice(ini - abre.length, ini) === abre && v.slice(ini, ini + fecha.length) === fecha) {
      ta.setRangeText('', ini - abre.length, ini + fecha.length, 'end');
    } else {
      ta.setRangeText(abre + fecha, ini, fim, 'end');
      ta.selectionStart = ta.selectionEnd = ini + abre.length;
    }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // letras (sem as marcas desta formatação) e se cada uma está formatada
  const letras = [], marcado = [];
  let nivel = 0, a = -1, b = -1;
  for (let p = 0; p <= v.length;) {
    if (p === ini && a < 0) a = letras.length;
    if (p === fim && b < 0) b = letras.length;
    if (p === v.length) break;
    if (v.startsWith(abre, p)) { nivel++; p += abre.length; continue; }
    if (v.startsWith(fecha, p)) { nivel = Math.max(0, nivel - 1); p += fecha.length; continue; }
    if (v[p] === '\n') nivel = 0;
    letras.push(v[p]); marcado.push(nivel > 0); p++;
  }
  // não formata espaço/quebra de linha das pontas da seleção
  while (a < b && /\s/.test(letras[a])) a++;
  while (b > a && /\s/.test(letras[b - 1])) b--;
  if (a >= b) return;
  const tudo = marcado.slice(a, b).every((m, k) => m || /\s/.test(letras[a + k]));
  for (let k = a; k < b; k++) marcado[k] = !tudo;
  // reescreve o texto com as marcas certas
  let out = '', ligado = false, selIni = 0, selFim = 0;
  for (let k = 0; k <= letras.length; k++) {
    const quer = k < letras.length && letras[k] !== '\n' && marcado[k];
    // espaço solto entre dois trechos formatados fica dentro (não fecha e reabre por causa dele)
    const ponte = !quer && ligado && k < letras.length && letras[k] === ' ' && marcado[k + 1] && letras[k + 1] !== '\n';
    if (k === b) selFim = out.length;
    if (ligado && !quer && !ponte) { out += fecha; ligado = false; }
    if (k === letras.length) break;
    if (!ligado && quer) { out += abre; ligado = true; }
    if (k === a) selIni = out.length;
    out += letras[k];
  }
  ta.setRangeText(out, 0, v.length, 'preserve');
  ta.setSelectionRange(selIni, selFim);
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
