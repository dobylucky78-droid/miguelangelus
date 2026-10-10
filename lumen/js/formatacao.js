'use strict';
/*
 * Negrito, itálico, sublinhado, tamanho e cor em trechos dos textos (cantos, orações, itens do roteiro, apresentações…).
 * Ao editar qualquer caixa de texto aparece uma barrinha "N I S | A+ A− | A" no canto; os botões (ou Ctrl+B / Ctrl+I /
 * Ctrl+U / Ctrl+Shift+> e <) colocam <b>…</b>, <i>…</i>, <u>…</u>, <g>…</g>, <vermelho>…</vermelho>… em volta do trecho
 * selecionado (de novo, tira). O telão, o celular e a impressão mostram formatado.
 */
const Formato = { alvo: null, timer: 0 };
const TAGS = { negrito: 'b', italico: 'i', sublinhado: 'u' };

// Cor e tamanho (1.6.3): <vermelho>…</vermelho>, <g>…</g> (grande), <gg>…</gg> (título), <pq>…</pq> (pequeno).
// Paleta fixa, que lê bem no telão. No HTML viram <font> (cor) e <big>/<small> (tamanho): o navegador conserta
// sozinho quando essas marcas se cruzam com negrito/itálico (como já faz com <b> e <i>).
const CORES_TEXTO = [['vermelho', '#ff5a4f'], ['dourado', '#f2c14e'], ['azul', '#5aa9ff'], ['verde', '#5cc46a'],
  ['roxo', '#b57cf0'], ['branco', '#ffffff'], ['preto', '#111111']];
const TAMANHOS_TEXTO = ['pq', '', 'g', 'gg'];
const RX_MARCAS = /<\/?(?:b|i|u|gg|g|pq|vermelho|dourado|azul|verde|roxo|branco|preto)>/gi;
const tirarMarcas = t => String(t || '').replace(RX_MARCAS, '');
// texto JÁ escapado (esc) → HTML com as marcas
function marcasEmHtml(h) {
  return String(h)
    .replace(/&lt;(\/?)(b|i|u)&gt;/gi, '<$1$2>')
    .replace(/&lt;(vermelho|dourado|azul|verde|roxo|branco|preto)&gt;/gi, (_, c) => `<font class="m-${c.toLowerCase()}">`)
    .replace(/&lt;\/(vermelho|dourado|azul|verde|roxo|branco|preto)&gt;/gi, '</font>')
    .replace(/&lt;(gg|g)&gt;/gi, (_, t) => `<big class="m-${t.toLowerCase()}">`).replace(/&lt;\/(gg|g)&gt;/gi, '</big>')
    .replace(/&lt;pq&gt;/gi, '<small class="m-pq">').replace(/&lt;\/pq&gt;/gi, '</small>');
}

// Liga/desliga como no Word: se o trecho selecionado já está todo formatado, tira; senão, formata o trecho inteiro.
// O texto é lido letra por letra ("esta letra está em negrito?") e as marcas são reescritas do zero, então nunca
// sobram marcas repetidas ou vazias. As marcas fecham no fim de cada linha (uma linha pode ir para outro slide).
// modo: 'alternar' (botões N I S), 'ligar' ou 'tirar' (cor e tamanho, que trocam uma marca pela outra).
function aplicarFormato(ta, tag, modo = 'alternar', avisar = true) {
  const v = ta.value, ini = ta.selectionStart, fim = ta.selectionEnd;
  const abre = `<${tag}>`, fecha = `</${tag}>`;
  ta.focus();
  // cursor sem seleção: "<b></b>" vazio onde está o cursor some; senão, cria um para digitar já formatado
  if (ini === fim) {
    if (modo === 'tirar') return;
    if (v.slice(ini - abre.length, ini) === abre && v.slice(ini, ini + fecha.length) === fecha) {
      if (modo === 'alternar') ta.setRangeText('', ini - abre.length, ini + fecha.length, 'end');
    } else {
      ta.setRangeText(abre + fecha, ini, fim, 'end');
      ta.selectionStart = ta.selectionEnd = ini + abre.length;
    }
    if (avisar) ta.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  // letras (sem as marcas desta formatação) e se cada uma está formatada
  // as OUTRAS marcas (<b>, <vermelho>, <g>…) entram inteiras, como uma "letra" invisível que não se formata
  const letras = [], marcado = [], ehMarca = [];
  const outra = /<\/?(?:b|i|u|gg|g|pq|vermelho|dourado|azul|verde|roxo|branco|preto)>/y;
  let nivel = 0, a = -1, b = -1;
  for (let p = 0; p <= v.length;) {
    if (p === ini && a < 0) a = letras.length;
    if (p === fim && b < 0) b = letras.length;
    if (p === v.length) break;
    if (v.startsWith(abre, p)) { nivel++; p += abre.length; continue; }
    if (v.startsWith(fecha, p)) { nivel = Math.max(0, nivel - 1); p += fecha.length; continue; }
    outra.lastIndex = p;
    const m = outra.exec(v);
    if (m) { letras.push(m[0]); marcado.push(false); ehMarca.push(true); p += m[0].length; continue; }
    if (v[p] === '\n') nivel = 0;
    letras.push(v[p]); marcado.push(nivel > 0); ehMarca.push(false); p++;
  }
  // não formata espaço/quebra de linha das pontas da seleção
  while (a < b && /\s/.test(letras[a])) a++;
  while (b > a && /\s/.test(letras[b - 1])) b--;
  if (a >= b) return;
  const tudo = marcado.slice(a, b).every((m, k) => m || ehMarca[a + k] || /\s/.test(letras[a + k]));
  const novo = modo === 'ligar' ? true : modo === 'tirar' ? false : !tudo;
  for (let k = a; k < b; k++) if (!ehMarca[k]) marcado[k] = novo;
  // outra marca fica dentro desta quando a letra vizinha está formatada: a de abrir olha a letra seguinte; a de fechar, a anterior
  const vizinha = (k, passo) => {
    for (let j = k + passo; j >= 0 && j < letras.length; j += passo) {
      if (letras[j] === '\n') return false;
      if (!ehMarca[j]) return marcado[j];
    }
    return false;
  };
  for (let k = 0; k < letras.length; k++) if (ehMarca[k]) marcado[k] = vizinha(k, letras[k][1] === '/' ? -1 : 1);
  // reescreve o texto com as marcas certas
  let out = '', ligado = false, selIni = 0, selFim = 0;
  for (let k = 0; k <= letras.length; k++) {
    const quer = k < letras.length && letras[k] !== '\n' && marcado[k];
    // espaço solto entre dois trechos formatados fica dentro (não fecha e reabre por causa dele)
    const ponte = !quer && ligado && k < letras.length && (letras[k] === ' ' || ehMarca[k]) && vizinha(k, 1);
    if (k === b) selFim = out.length;
    if (ligado && !quer && !ponte) { out += fecha; ligado = false; }
    if (k === letras.length) break;
    if (!ligado && quer) { out += abre; ligado = true; }
    if (k === a) selIni = out.length;
    out += letras[k];
  }
  ta.setRangeText(out, 0, v.length, 'preserve');
  ta.setSelectionRange(selIni, selFim);
  if (avisar) ta.dispatchEvent(new Event('input', { bubbles: true }));    // salva como se tivesse digitado
}

// Marca de um grupo (cores ou tamanhos) em vigor no começo do trecho selecionado ('' = nenhuma)
function marcaNoInicio(ta, nomes) {
  const v = ta.value;
  let p = ta.selectionStart;
  for (;;) {      // pula espaços e marcas de abertura no começo da seleção ("<g>Título" selecionado inteiro)
    const m = /^<(\w+)>/.exec(v.slice(p, p + 12));
    if (m && nomes.includes(m[1])) return m[1];
    if (m) { p += m[0].length; continue; }
    if (p < ta.selectionEnd && /[ \t]/.test(v[p])) { p++; continue; }
    break;
  }
  const linha = v.slice(v.lastIndexOf('\n', p - 1) + 1, p);
  let achada = '', onde = -1;
  for (const t of nomes) {
    const a = linha.lastIndexOf(`<${t}>`), f = linha.lastIndexOf(`</${t}>`);
    if (a > f && a > onde) { achada = t; onde = a; }
  }
  return achada;
}

// A+ / A−: um passo de tamanho (pequeno → normal → grande → título) no trecho selecionado
function mudarTamanho(ta, passo) {
  const nomes = TAMANHOS_TEXTO.filter(Boolean);
  const atual = TAMANHOS_TEXTO.indexOf(marcaNoInicio(ta, nomes));
  const novo = TAMANHOS_TEXTO[Math.max(0, Math.min(TAMANHOS_TEXTO.length - 1, atual + passo))];
  for (const t of nomes) if (t !== novo) aplicarFormato(ta, t, 'tirar', false);
  if (novo) aplicarFormato(ta, novo, 'ligar', false);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// Cor da paleta no trecho (a mesma cor de novo tira; '' tira qualquer cor)
function aplicarCor(ta, cor) {
  const nomes = CORES_TEXTO.map(c => c[0]);
  for (const c of nomes) if (c !== cor) aplicarFormato(ta, c, 'tirar', false);
  if (cor) aplicarFormato(ta, cor, 'alternar', false);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
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
    '<button type="button" data-fmt="sublinhado" title="Sublinhado (Ctrl+U)"><u>S</u></button>' +
    '<span class="bf-sep"></span>' +
    '<button type="button" data-tam="1" title="Aumentar a letra do trecho (Ctrl+Shift+>): grande, depois título">A<sup>+</sup></button>' +
    '<button type="button" data-tam="-1" title="Diminuir a letra do trecho (Ctrl+Shift+<)">A<sup>−</sup></button>' +
    '<span class="bf-sep"></span>' +
    '<button type="button" data-paleta title="Cor do trecho selecionado" class="bf-cor">A</button>' +
    '<span class="bf-paleta" hidden>' + CORES_TEXTO.map(([n, c]) => `<button type="button" data-cor="${n}" title="${n}" style="background:${c}"></button>`).join('') +
    '<button type="button" data-cor="" title="Sem cor" class="bf-semcor">✕</button></span>';
  document.body.appendChild(b);
  // mousedown com preventDefault: a caixa de texto não perde o foco nem a seleção
  b.addEventListener('mousedown', e => {
    const bt = e.target.closest('button');
    e.preventDefault();
    if (!bt || !Formato.alvo) return;
    const paleta = b.querySelector('.bf-paleta');
    if (bt.dataset.fmt) aplicarFormato(Formato.alvo, TAGS[bt.dataset.fmt]);
    else if (bt.dataset.tam) mudarTamanho(Formato.alvo, +bt.dataset.tam);
    else if ('paleta' in bt.dataset) { paleta.hidden = !paleta.hidden; posicionarBarra(); }
    else if ('cor' in bt.dataset) { aplicarCor(Formato.alvo, bt.dataset.cor); paleta.hidden = true; posicionarBarra(); }
  });
  document.addEventListener('focusin', e => {
    if (e.target.tagName !== 'TEXTAREA') return;
    clearTimeout(Formato.timer); Formato.alvo = e.target;
    // janela aberta (editor de canto, de oração…) fica "por cima de tudo": a barra vai para dentro dela, senão some atrás
    const casa = e.target.closest('dialog[open]') || document.body;
    if (b.parentNode !== casa) casa.appendChild(b);
    posicionarBarra();
  });
  document.addEventListener('focusout', e => {
    if (e.target === Formato.alvo) Formato.timer = setTimeout(() => { Formato.alvo = null; b.hidden = true; }, 150);
  });
  document.addEventListener('keydown', e => {
    if (e.target.tagName !== 'TEXTAREA' || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    // Ctrl+Shift+> / Ctrl+Shift+< aumenta/diminui a letra (como no Word)
    if (e.shiftKey && (e.key === '>' || e.key === '<' || e.code === 'Period' || e.code === 'Comma')) {
      e.preventDefault(); e.stopPropagation();
      return mudarTamanho(e.target, e.key === '>' || e.code === 'Period' ? 1 : -1);
    }
    const tag = { b: 'b', i: 'i', u: 'u' }[e.key.toLowerCase()];
    if (!tag) return;
    e.preventDefault(); e.stopPropagation();
    aplicarFormato(e.target, tag);
  }, true);
  // a barra acompanha a caixa (rolagem, redimensionar, diálogos)
  addEventListener('scroll', () => { if (!b.hidden) posicionarBarra(); }, true);
  addEventListener('resize', () => { if (!b.hidden) posicionarBarra(); });
  // a janela muda de tamanho (abre uma seção, aparece uma lista): a caixa anda e a barra vai junto
  document.addEventListener('toggle', () => { if (!b.hidden) setTimeout(posicionarBarra, 0); }, true);
  setInterval(() => { if (!b.hidden) posicionarBarra(); }, 400);
}
