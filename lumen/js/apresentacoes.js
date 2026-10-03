'use strict';
/*
 * Apresentações (módulo Mídia): sequência de slides personalizados — imagem, texto ou os dois —
 * montada aqui e reaproveitada em qualquer roteiro (item de mídia).
 * Também importa um PDF (PowerPoint/Canva/Google Slides "salvar como PDF"): cada página vira um slide.
 * Ficam no store "midias" com tipo 'apresentacao' e entram no backup.
 * Usa S, $, esc, uid, toast, abrirItem, renderCabecalho, atualizarSlides, reduzirImagem, LAYOUTS_IMG... (em tempo de execução).
 */

const Apres = { editando: false, sel: -1 };

const apresDe = it => { const m = midiaDe(it); return m?.tipo === 'apresentacao' ? m : null; };
const ehApresentacao = it => it?.tipo === 'midia' && !!apresDe(it);
// vídeo/áudio (ou mídia ainda não escolhida): usa o player; apresentações e câmeras têm tela própria
const ehPlayer = it => { if (it?.tipo !== 'midia') return false; const m = midiaDe(it); return !m || m.tipo === 'video' || m.tipo === 'audio'; };

// Slides de projeção de uma apresentação
function slidesDaApresentacao(ap) {
  return ap.slides.map(sl => sl.imagem
    ? { img: sl.imagem, layout: sl.layout || 'so', escurecer: +(sl.escurecer ?? 45), texto: sl.layout === 'so' ? '' : sl.texto || '', rodape: '' }
    : { texto: sl.texto || '', rodape: '' });
}

const novoSlideAp = (extra = {}) => ({ id: uid(), imagem: '', layout: 'esquerda', escurecer: 45, texto: '', ...extra });

let timerSalvarAp = 0;
function salvarApresentacao(ap, jaAgora = false) {
  ap.atualizado = Date.now();
  clearTimeout(timerSalvarAp);
  const f = () => DB.salvar('midias', ap).catch(e => alert('Não foi possível salvar a apresentação: ' + e.message));
  if (jaAgora) return f();
  timerSalvarAp = setTimeout(f, 400);
}

async function novaApresentacao() {
  const nome = prompt('Nome da apresentação:', 'Nova apresentação');
  if (nome === null) return;
  const ap = { id: uid(), tipo: 'apresentacao', nome: nome.trim() || 'Nova apresentação', slides: [novoSlideAp()], criado: Date.now() };
  Midia.lista.push(ap);
  await salvarApresentacao(ap, true);
  abrirItem({ tipo: 'midia', midiaId: ap.id, loop: false });
  Apres.editando = true; Apres.sel = 0;
  renderCabecalho(); renderSlides(); renderMidias();
}

// Depois de mudar a apresentação: slides, cabeçalho e listas em dia
function aposMudarAp(ap, cab = true) {
  salvarApresentacao(ap);
  if (S.atual) S.atual.slides = gerarSlides(S.atual.item);
  if (cab) renderCabecalho();
  renderSlides();
  renderMidias();
  renderRoteiroLista();
}

// ---------- Cabeçalho (centro) ----------

function htmlCabApresentacao(it, noRoteiro, btnAdd) {
  const ap = apresDe(it);
  const ed = Apres.editando;
  let h = `<div class="cab-linha"><span class="tag t-apres">Apresentação</span>
      ${ed ? `<input data-ap="nome" value="${esc(ap.nome)}" placeholder="Nome da apresentação">` : `<h2>${esc(ap.nome)}</h2>`}
      <span class="sutil">${ap.slides.length} slide(s)</span>
      ${noRoteiro ? `<select data-campo="midiaId" class="estreito" title="Trocar a mídia deste item">${opcoesMidias(it.midiaId)}</select>` : ''}
      <span class="espaco"></span>
      <button data-cmd="apEditar" class="${ed ? 'ligado' : ''}" title="No modo edição, clicar num slide abre ele para editar (não projeta)">✎ ${ed ? 'Editando' : 'Editar'}</button>
      ${btnAdd}</div>`;
  if (!ed) return h;
  h += `<div class="cab-linha">
      <button data-cmd="apNovo">＋ Slide</button>
      <button data-cmd="apImagens" title="Cada imagem vira um slide">🖼 Adicionar imagens…</button>
      <button data-cmd="apPdf" title="Salve a apresentação do PowerPoint, Canva ou Google Slides como PDF: cada página vira um slide">📄 Importar PDF…</button>
      <span class="espaco"></span>
      <button data-cmd="apExcluir" class="perigo">Excluir apresentação</button></div>`;
  const sl = ap.slides[Apres.sel];
  if (!sl) return h + '<p class="sutil pequeno" style="margin:4px 0">Clique num slide abaixo para editar. Também dá para colar (Ctrl+V) ou arrastar imagens para a janela.</p>';
  const lay = sl.layout || 'esquerda';
  h += `<div class="cab-linha ap-slide-barra"><b>Slide ${Apres.sel + 1}</b>
      <select data-ap="layout" class="estreito" ${sl.imagem ? '' : 'disabled title="Sem imagem: slide só de texto"'}>${LAYOUTS_IMG.map(([v, n]) => `<option value="${v}" ${v === lay ? 'selected' : ''}>${n}</option>`).join('')}</select>
      ${sl.imagem && lay === 'fundo' ? `<label class="check">Escurecer <input type="range" data-ap="escurecer" min="0" max="85" value="${+(sl.escurecer ?? 45)}" style="width:100px"></label>` : ''}
      ${sl.imagem ? '<button data-cmd="apTirarImg">Remover imagem</button>' : ''}
      <span class="espaco"></span>
      <button data-cmd="apSubir" title="Mover para trás">←</button><button data-cmd="apDescer" title="Mover para frente">→</button>
      <button data-cmd="apDuplicar">Duplicar</button><button data-cmd="apRemover" class="perigo">Excluir slide</button></div>
    <div class="cab-img">
      <div class="cab-img-prev" data-cmd="apImg" title="Clique para escolher; também dá para colar (Ctrl+V) ou arrastar">
        ${sl.imagem ? `<img src="${sl.imagem}" alt="">` : '<span>Sem imagem.<br>Clique, cole (Ctrl+V)<br>ou arraste aqui.</span>'}</div>
      <textarea data-ap="texto" rows="5" ${sl.imagem && lay === 'so' ? 'disabled placeholder="Só a imagem: sem texto. Troque a disposição para escrever."' : 'placeholder="Texto do slide (a letra se ajusta para caber)."'}>${esc(sl.texto)}</textarea>
    </div>`;
  return h;
}

// ---------- Imagens e PDF ----------

async function imagensParaApresentacao(arquivos) {
  const ap = apresDe(S.atual?.item);
  if (!ap) return;
  const imgs = arquivos.filter(f => f.type.startsWith('image/'));
  // uma imagem com um slide aberto: troca a imagem dele; senão cada imagem vira um slide novo
  if (imgs.length === 1 && ap.slides[Apres.sel]) {
    const sl = ap.slides[Apres.sel];
    try { sl.imagem = await reduzirImagem(imgs[0], 1920, 0.88); } catch (e) { return toast(e.message); }
    if (!sl.texto && sl.layout === 'esquerda') sl.layout = 'so';
    return aposMudarAp(ap);
  }
  let pos = Apres.sel >= 0 ? Apres.sel + 1 : ap.slides.length;
  for (const f of imgs) {
    try { ap.slides.splice(pos++, 0, novoSlideAp({ imagem: await reduzirImagem(f, 1920, 0.88), layout: 'so' })); }
    catch (e) { toast(`${f.name}: ${e.message}`); }
  }
  Apres.sel = pos - 1;
  aposMudarAp(ap);
}

async function pdfParaApresentacao(arquivo) {
  const ap = apresDe(S.atual?.item);
  if (!ap || !arquivo) return;
  try {
    await Folheto.carregarPdfjs();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
    // se a apresentação só tem o slide vazio inicial, ele sai
    if (ap.slides.length === 1 && !ap.slides[0].imagem && !ap.slides[0].texto) ap.slides = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      toast(`Lendo o PDF: página ${p} de ${pdf.numPages}…`);
      const pg = await pdf.getPage(p);
      const vp1 = pg.getViewport({ scale: 1 });
      const vp = pg.getViewport({ scale: Math.min(4, 1920 / Math.max(vp1.width, vp1.height)) });
      const c = document.createElement('canvas');
      c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: ctx, viewport: vp }).promise;
      ap.slides.push(novoSlideAp({ imagem: c.toDataURL('image/webp', 0.88), layout: 'so' }));
      pg.cleanup();
    }
    if (/^nova apresenta/i.test(ap.nome)) ap.nome = arquivo.name.replace(/\.pdf$/i, '');
    Apres.sel = -1;
    await salvarApresentacao(ap, true);
    aposMudarAp(ap);
    toast(`${pdf.numPages} página(s) importada(s).`);
  } catch (e) {
    alert('Não foi possível ler este PDF:\n' + e.message);
  }
}

// ---------- Comandos ----------

async function comandoApresentacao(cmd) {
  const ap = apresDe(S.atual?.item);
  if (!ap) return;
  const sl = ap.slides[Apres.sel];
  switch (cmd) {
    case 'apEditar':
      Apres.editando = !Apres.editando;
      if (Apres.editando && Apres.sel < 0 && ap.slides.length) Apres.sel = 0;
      renderCabecalho(); renderSlides();
      return;
    case 'apNovo':
      ap.slides.splice(Apres.sel + 1, 0, novoSlideAp());
      Apres.sel++;
      aposMudarAp(ap);
      setTimeout(() => $('#itemCab textarea[data-ap="texto"]')?.focus(), 0);
      return;
    case 'apImagens': return $('#arqApImagens').click();
    case 'apPdf': return $('#arqApPdf').click();
    case 'apImg': return $('#arqApImagem').click();
    case 'apExcluir': {
      if (!confirm(`Excluir a apresentação "${ap.nome}"?\nOs roteiros que usam esta apresentação ficarão com o espaço vazio.`)) return;
      await DB.remover('midias', ap.id);
      Midia.lista = Midia.lista.filter(m => m !== ap);
      Apres.editando = false; Apres.sel = -1;
      if (S.atual.rIdx < 0) S.atual = null;
      renderMidias(); renderRoteiroLista(); renderCabecalho(); renderSlides();
      return;
    }
  }
  if (!sl) return;
  const i = Apres.sel;
  if (cmd === 'apTirarImg') { sl.imagem = ''; sl.layout = 'esquerda'; }
  else if (cmd === 'apDuplicar') { ap.slides.splice(i + 1, 0, { ...structuredClone(sl), id: uid() }); Apres.sel++; }
  else if (cmd === 'apRemover') {
    if (!confirm(`Excluir o slide ${i + 1}?`)) return;
    ap.slides.splice(i, 1);
    Apres.sel = Math.min(i, ap.slides.length - 1);
  } else if (cmd === 'apSubir' || cmd === 'apDescer') {
    const j = cmd === 'apSubir' ? i - 1 : i + 1;
    if (j < 0 || j >= ap.slides.length) return;
    [ap.slides[i], ap.slides[j]] = [ap.slides[j], ap.slides[i]];
    Apres.sel = j;
  } else return;
  aposMudarAp(ap);
}

function ligarApresentacoes() {
  $('#btnNovaApres').addEventListener('click', novaApresentacao);
  $('#arqApImagens').addEventListener('change', e => { const a = [...e.target.files]; e.target.value = ''; if (a.length) { if (!Apres.editando) Apres.sel = -1; imagensParaApresentacao(a); } });
  $('#arqApImagem').addEventListener('change', e => { const a = [...e.target.files]; e.target.value = ''; if (a.length) imagensParaApresentacao(a.slice(0, 1)); });
  $('#arqApPdf').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; pdfParaApresentacao(f); });

  // campos do slide / nome
  $('#itemCab').addEventListener('input', e => {
    const campo = e.target.dataset.ap;
    const ap = apresDe(S.atual?.item);
    if (!campo || !ap) return;
    if (campo === 'nome') { ap.nome = e.target.value; salvarApresentacao(ap); renderMidias(); renderRoteiroLista(); return; }
    const sl = ap.slides[Apres.sel];
    if (!sl) return;
    sl[campo] = campo === 'escurecer' ? +e.target.value : e.target.value;
    aposMudarAp(ap, e.target.tagName === 'SELECT');
  });
}
