'use strict';
/*
 * Imprimir roteiro (Arquivo → Imprimir roteiro…, Ctrl+P): o roteiro aberto em papel ou PDF ("Salvar como PDF" na
 * janela de impressão do Windows). Três modelos:
 *  - Resumo: só a ordem (momento + título), uma folha para o padre e a equipe;
 *  - Completo: com os textos (letras dos cantos, orações, leituras, preces, avisos) — o folheto da equipe;
 *  - Músicos: os cantos com a cifra (ou a letra, se não houver cifra) e o tom; os outros itens só para saber a ordem.
 * Monta uma página à parte num quadro escondido e chama a impressão dele (o painel não muda).
 * Usa S, esc, infoRoteiro, liturgiaDoRoteiro, localDe, resumoItem, gerarSlidesBase, letraNaOrdem, fichaCanto… (em tempo de execução).
 */
const Impressao = { modelo: 'completo' };

const fmtTexto = t => marcasEmHtml(esc(t || ''))
  .replace(/^\s*([PTLCD])\.\s+/gm, '<b class="quem">$1.</b> ')
  .replace(/^(\s*—.*)$/gm, '<b>$1</b>')
  .replace(/\n/g, '<br>');

// No papel: sem as tablaturas (linhas "E|---…" e o título "[Tab …]") e sem linhas em branco repetidas
const cifraParaPapel = t => t.split('\n').filter(l => !/^\s*[EBGDAe]\|/.test(l) && !/^\s*\[tab\b[^\]]*\]\s*$/i.test(l)).join('\n')
  .replace(/\n{3,}/g, '\n\n').trim();

// Texto do item para a versão completa (sem repetir o refrão a cada estrofe, como no telão)
function textoParaImprimir(it) {
  if (it.tipo === 'canto') {
    const c = S.cantos.find(x => x.id === it.cantoId);
    if (c) return [it.textoAntes, letraNaOrdem(c), it.textoDepois].filter(t => (t || '').trim()).join('\n\n');
    return [it.refraoRezado, it.textoRezado].filter(Boolean).join('\n\n');
  }
  if (it.tipo === 'homilia' || it.tipo === 'midia') return '';
  if (it.tipo === 'terco') return textoTercoParaPapel(it);
  if (it.tipo === 'avisos') return avisosDoItem(it).join('\n\n');
  if (it.tipo === 'leitura') {
    const sl = gerarSlidesBase(it);
    if (!sl.length) return '';
    const versos = sl.filter(s => s.versos).flatMap(s => s.versos.map(v => `<sup>${esc(v.n)}</sup>${esc(v.t)}`)).join(' ');
    return { html: `${versos}<br><b>${it.evangelho ? 'Palavra da Salvação. — Glória a vós, Senhor.' : 'Palavra do Senhor. — Graças a Deus.'}</b>` };
  }
  return gerarSlidesBase(it).map(s => s.texto).filter(Boolean).join('\n\n');
}

function htmlImpressao(r, modelo) {
  const inf = infoRoteiro(r), lit = liturgiaDoRoteiro(r, inf), loc = localDe(inf.localId);
  const quando = inf.data ? inf.data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + (inf.hora ? ' · ' + inf.hora : '') : '';
  const itens = (r.itens || []).map((it, i) => {
    const res = resumoItem(it), c = it.tipo === 'canto' ? S.cantos.find(x => x.id === it.cantoId) : null;
    const ficha = c ? [fichaCanto(c), c.tom ? 'Tom: ' + c.tom : ''].filter(Boolean).join(' · ') : '';
    const cab = `<div class="cab"><span class="n">${i + 1}</span><span class="rot">${esc(res.rot)}</span>
      <span class="tit">${esc(res.tit)}</span>${ficha ? `<span class="ficha">${esc(ficha)}</span>` : ''}</div>`;
    let corpo = '';
    if (modelo === 'completo') {
      const t = textoParaImprimir(it);
      corpo = t ? `<div class="txt">${typeof t === 'object' ? t.html : fmtTexto(t)}</div>` : '';
    } else if (modelo === 'musicos' && it.tipo === 'canto' && c) {
      corpo = c.cifra ? `<pre class="cifra">${esc(cifraParaPapel(c.cifra))}</pre>` : `<div class="txt">${fmtTexto(letraNaOrdem(c))}</div>`;
    }
    return `<section class="item ${corpo ? 'com-txt' : ''} ${it.tipo === 'canto' ? 'canto' : ''}">${cab}${corpo}</section>`;
  }).join('');
  const titModelo = { resumo: 'Ordem da celebração', completo: 'Roteiro completo', musicos: 'Cantos e cifras' }[modelo];
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(r.nome)}</title><style>
    @page { size: A4; margin: 14mm 14mm 16mm; }
    body { font: 11pt/1.4 Georgia, "Times New Roman", serif; color: #111; margin: 0; }
    header { border-bottom: 2px solid ${lit.corHex || '#444'}; padding-bottom: 6px; margin-bottom: 10px; }
    header h1 { font: 700 16pt "Segoe UI", Arial, sans-serif; margin: 0; }
    header .lit { font: 600 11pt "Segoe UI", Arial, sans-serif; color: #333; margin-top: 2px; }
    header .info { font: 9.5pt "Segoe UI", Arial, sans-serif; color: #555; margin-top: 2px; }
    header .modelo { float: right; font: 9pt "Segoe UI", Arial, sans-serif; color: #777; }
    .item { padding: 4px 0; border-bottom: 1px solid #ddd; }
    .item.com-txt { break-inside: avoid-page; padding: 6px 0 8px; }
    .musicos .item.canto.com-txt { break-inside: auto; }
    .cab { display: flex; gap: 8px; align-items: baseline; font-family: "Segoe UI", Arial, sans-serif; }
    .n { color: #888; font-size: 9pt; min-width: 18px; text-align: right; }
    .rot { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em; color: #7a1c1c; min-width: 110px; }
    .tit { font-weight: 600; }
    .ficha { color: #666; font-size: 9pt; margin-left: auto; text-align: right; }
    .txt { margin: 4px 0 0 26px; }
    .txt .quem { color: #b01c1c; }
    font.m-vermelho { color: #c62828; } font.m-dourado { color: #9a6b00; } font.m-azul { color: #1d5fb0; } font.m-verde { color: #2e7d32; }
    font.m-roxo { color: #6a2c91; } font.m-branco, font.m-preto { color: inherit; }
    big.m-g { font-size: 1.2em; } big.m-gg { font-size: 1.45em; font-weight: 700; } small.m-pq { font-size: .8em; }
    pre.cifra { margin: 6px 0 0 26px; font: 10pt/1.25 Consolas, "Courier New", monospace; white-space: pre-wrap; }
    footer { margin-top: 10px; font: 8pt "Segoe UI", Arial, sans-serif; color: #999; text-align: right; }
  </style></head><body class="${modelo}">
    <header><span class="modelo">${titModelo}</span><h1>${esc(r.nome)}</h1>
      ${lit.titulo ? `<div class="lit">${esc(lit.titulo)}${lit.cor ? ` · cor ${esc(lit.cor)}` : ''}</div>` : ''}
      <div class="info">${[quando, loc ? `${loc.tipo} ${loc.nome}` : '', r.responsavel ? 'Responsável: ' + r.responsavel : ''].filter(Boolean).map(esc).join(' · ')}</div></header>
    ${itens || '<p>Roteiro vazio.</p>'}
    <footer>MiguelAngelus · impresso em ${new Date().toLocaleDateString('pt-BR')}</footer>
  </body></html>`;
}

function imprimirRoteiro(modelo = Impressao.modelo) {
  if (!S.roteiro) return toast('Abra um roteiro para imprimir.');
  Impressao.modelo = modelo;
  try { localStorage.setItem('lumen.impressao', modelo); } catch {}
  $('#quadroImpressao')?.remove();
  const f = document.createElement('iframe');
  f.id = 'quadroImpressao';
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  f.srcdoc = htmlImpressao(S.roteiro, modelo);
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('Não consegui abrir a impressão: ' + e.message); } };
  document.body.appendChild(f);
}

function abrirImpressao() {
  if (!S.roteiro) return toast('Abra um roteiro para imprimir.');
  try { Impressao.modelo = localStorage.getItem('lumen.impressao') || Impressao.modelo; } catch {}
  $$('#dlgImprimir [name=modeloImp]').forEach(r => { r.checked = r.value === Impressao.modelo; });
  $('#impRoteiro').textContent = S.roteiro.nome;
  abrirDialogo('dlgImprimir');
}

function ligarImpressao() {
  $('#dlgImprimir form').addEventListener('submit', e => {
    if (e.submitter?.value !== 'imprimir') return;
    imprimirRoteiro($('#dlgImprimir [name=modeloImp]:checked')?.value || 'completo');
  });
  // Ctrl+P: imprime o roteiro (e não a tela do programa)
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); e.stopPropagation(); abrirImpressao(); }
  }, true);
}
