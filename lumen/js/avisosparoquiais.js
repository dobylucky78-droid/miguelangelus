'use strict';
/*
 * Avisos paroquiais (1.5.8)
 *  - Item "📢 Avisos paroquiais" no roteiro: tela própria no telão, com o título chamativo ("Avisos Paroquiais") numa
 *    faixa colorida e cada aviso num cartão. Puxa sozinho os AVISOS PROGRAMADOS válidos na data (e na comunidade) do
 *    roteiro, mais os avisos escritos só para aquela Missa. Muitos avisos: vira mais de um slide.
 *  - Avisos programados: texto + de / até (datas) + comunidade (ou todas). Ferramentas → 📢 Avisos paroquiais.
 *  - Aparência: título, ícone, cor da faixa do título, fundo (o do tema ou uma cor), cor da letra, avisos por slide.
 *  - Avisos salvos (convites: aniversariantes, crianças ao presbitério…): na aba "Outro aviso" do botão Aviso.
 * Tudo numa config só ('avisos'), que vai para os outros computadores pela nuvem (como a Agenda).
 * Usa $, $$, S, esc, uid, dividir, DB, toast, abrirDialogo, opcoesLocais, localDe, infoRoteiro… (em tempo de execução).
 */
const AvPar = { lista: [], convites: [], estilo: {}, editando: null };

const ESTILO_AVISOS = { titulo: 'Avisos Paroquiais', icone: '📢', corTitulo: '#c8102e', corTituloTexto: '#ffffff',
  fundo: 'tema', corFundo: '#0f2742', corTexto: '#ffffff', porSlide: 3, noRoteiro: true };
const ICONES_AVISOS = ['📢', '📣', '🔔', '⛪', '✝️', '🕊️', '📌', '⭐', ''];
const CONVITES_PADRAO = [
  'Convidamos os aniversariantes da semana a virem ao presbitério.',
  'Convidamos as crianças a virem ao presbitério.',
];

const estiloAvisos = () => ({ ...ESTILO_AVISOS, ...AvPar.estilo });

async function carregarAvisosPar() {
  const r = await DB.obter('config', 'avisos');
  const v = r?.valor || {};
  AvPar.lista = v.lista || [];
  AvPar.estilo = v.estilo || {};
  // os dois convites de exemplo: avisos salvos comuns (editar, salvar por cima, apagar). Só são gravados quando alguém
  // mexe em algo — gravar já ao abrir faria um computador novo passar por cima, na nuvem, dos avisos da paróquia.
  AvPar.convites = v.convites || CONVITES_PADRAO.map((texto, i) => ({ id: 'convite-' + (i + 1), texto }));
}

async function salvarAvisosPar() {
  await DB.salvar('config', { id: 'avisos', valor: { lista: AvPar.lista, convites: AvPar.convites, estilo: AvPar.estilo } });
}

// ---------- avisos programados ----------
const hojeIso = () => isoData(new Date());
const vigente = (a, iso, localId) => (!a.inicio || a.inicio <= iso) && (!a.fim || iso <= a.fim) &&
  (!a.localId || !localId || a.localId === localId);

// Data e comunidade do roteiro onde o item está (sem data: hoje)
function quandoDoItem(item) {
  const r = S.roteiro?.itens.includes(item) ? S.roteiro : null;
  const info = r ? infoRoteiro(r) : {};
  return { iso: info.iso || hojeIso(), localId: info.localId || '' };
}

function avisosDoItem(item) {
  const { iso, localId } = quandoDoItem(item);
  const prog = item.programados === false ? [] : AvPar.lista.filter(a => vigente(a, iso, localId))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || (a.inicio || '').localeCompare(b.inicio || '')).map(a => a.texto.trim());
  return [...prog, ...dividir(item.extras)].filter(Boolean);
}

// Slides do item: o título em todos; os avisos repartidos (até N por slide, e não muito texto num slide só)
function slidesAvisos(item) {
  const e = estiloAvisos(), textos = avisosDoItem(item);
  const titulo = (item.titulo || '').trim() || e.titulo;
  const visual = { titulo, icone: e.icone, corTitulo: e.corTitulo, corTituloTexto: e.corTituloTexto,
    fundo: e.fundo === 'cor' ? e.corFundo : '', corTexto: e.fundo === 'cor' ? e.corTexto : '' };
  const N = Math.max(1, Math.min(6, +e.porSlide || 3)), MAX = 330;
  const paginas = [];
  for (const t of textos) {
    const p = paginas[paginas.length - 1];
    const tam = p ? p.reduce((s, x) => s + x.length, 0) : 0;
    if (!p || p.length >= N || (tam + t.length > MAX && p.length)) paginas.push([t]); else p.push(t);
  }
  if (!paginas.length) paginas.push([]);
  return paginas.map((itens, i) => ({
    texto: itens.join('\n\n'), rodape: '',
    avisos: { ...visual, itens, pag: paginas.length > 1 ? `${i + 1}/${paginas.length}` : '' },
  }));
}

// Item "Avisos" no roteiro novo, antes da bênção final (se a paróquia quiser e o roteiro ainda não tiver)
function comAvisos(itens) {
  if (!estiloAvisos().noRoteiro || itens.some(i => i.tipo === 'avisos')) return itens;
  let k = itens.findIndex(i => (i.tipo === 'ordinario' && i.parte === 'bencao-final') ||
    (i.tipo === 'texto' && /^b[eê]n[cç][aã]o|^ritos finais|^despedida/i.test(i.titulo || '')));
  if (k < 0) k = itens.length;
  const novo = itens.slice();
  novo.splice(k, 0, { id: uid(), tipo: 'avisos', titulo: '', extras: '', programados: true });
  return novo;
}

// ---------- janela "📢 Avisos paroquiais" ----------
function situacao(a) {
  const h = hojeIso();
  if (a.fim && a.fim < h) return ['vencido', 'venceu em ' + dataBR(a.fim)];
  if (a.inicio && a.inicio > h) return ['agendado', 'começa em ' + dataBR(a.inicio) + (a.fim ? ', até ' + dataBR(a.fim) : '')];
  return ['ativo', 'valendo ' + (a.fim ? (a.fim === h ? 'só hoje' : 'até ' + dataBR(a.fim)) : 'sem data para sair')];
}
const htmlAviso = t => marcasEmHtml(esc(t));

function renderAvisosPar() {
  const lista = [...AvPar.lista].sort((a, b) => {
    const o = { ativo: 0, agendado: 1, vencido: 2 };
    return o[situacao(a)[0]] - o[situacao(b)[0]] || (a.inicio || '').localeCompare(b.inicio || '');
  });
  $('#apLista').innerHTML = lista.length ? lista.map(a => {
    const [cls, txt] = situacao(a), loc = a.localId ? localDe(a.localId) : null;
    return `<div class="ap-item ${cls} ${AvPar.editando === a.id ? 'sel' : ''}" data-id="${a.id}">
      <div class="ap-txt">${htmlAviso(a.texto)}</div>
      <div class="ap-info"><span class="ap-sit">${esc(txt)}</span> · ${loc ? `<span class="card-ponto" style="background:${loc.cor}"></span> ${esc(loc.nome)}` : 'todas as comunidades'}</div>
      <div class="ap-bts"><button type="button" data-ap="editar">Editar</button><button type="button" data-ap="apagar" class="perigo">🗑</button></div>
    </div>`;
  }).join('') : '<p class="sutil">Nenhum aviso programado. Escreva um aviso abaixo, escolha até quando ele vale e clique em Adicionar.</p>';
  const n = AvPar.lista.filter(a => situacao(a)[0] === 'vencido').length;
  $('#apLimpar').hidden = !n;
  $('#apLimpar').textContent = `Apagar ${n} vencido(s)`;
}

function limparFormAvisoPar() {
  AvPar.editando = null;
  $('#apTexto').value = '';
  $('#apInicio').value = hojeIso();
  $('#apFim').value = '';
  $('#apLocal').innerHTML = opcoesLocais('', 'Todas as comunidades');
  $('#apAdicionar').textContent = '+ Adicionar';
  $('#apCancelar').hidden = true;
}

function renderEstiloAvisos() {
  const e = estiloAvisos();
  $('#apeTitulo').value = e.titulo;
  $('#apeIcone').innerHTML = ICONES_AVISOS.map(i => `<option value="${i}" ${i === e.icone ? 'selected' : ''}>${i || '(sem ícone)'}</option>`).join('');
  $('#apeCorTitulo').value = e.corTitulo;
  $('#apeCorTituloTexto').value = e.corTituloTexto;
  $('#apeFundo').value = e.fundo;
  $('#apeCorFundo').value = e.corFundo;
  $('#apeCorTexto').value = e.corTexto;
  $('#apeCoresFundo').hidden = e.fundo !== 'cor';
  $('#apePorSlide').value = String(e.porSlide);
  $('#apeNoRoteiro').checked = e.noRoteiro !== false;
  // amostra do título
  const am = $('#apeAmostra');
  am.style.background = e.fundo === 'cor' ? e.corFundo : '#1b1e24';
  am.innerHTML = `<span class="ape-faixa" style="background:${e.corTitulo};color:${e.corTituloTexto}">${esc(e.icone)} ${esc(e.titulo)}</span>
    <span class="ape-cartao" style="color:${e.fundo === 'cor' ? e.corTexto : '#fff'};border-color:${e.corTitulo}">Exemplo de aviso no telão.</span>`;
}

function abrirAvisosPar(editarId) {
  renderAvisosPar();
  limparFormAvisoPar();
  renderEstiloAvisos();
  abrirDialogo('dlgAvisosPar');
  if (editarId) editarAvisoPar(editarId);
  else $('#apTexto').focus();
}

function editarAvisoPar(id) {
  const a = AvPar.lista.find(x => x.id === id);
  if (!a) return;
  AvPar.editando = id;
  $('#apTexto').value = a.texto;
  $('#apInicio').value = a.inicio || '';
  $('#apFim').value = a.fim || '';
  $('#apLocal').innerHTML = opcoesLocais(a.localId || '', 'Todas as comunidades');
  $('#apAdicionar').textContent = 'Salvar alteração';
  $('#apCancelar').hidden = false;
  renderAvisosPar();
  $('#apTexto').focus();
}

async function aposMudarAvisosPar() {
  await salvarAvisosPar();
  renderAvisosPar();
  // o item Avisos aberto (ou no ar) mostra a lista nova
  if (S.atual?.item?.tipo === 'avisos') atualizarSlides();
  if (typeof renderRoteiroLista === 'function') renderRoteiroLista();
}

async function salvarAvisoParDoForm() {
  const texto = $('#apTexto').value.replace(/\r/g, '').trim();
  if (!texto) return toast('Escreva o aviso.');
  const inicio = $('#apInicio').value, fim = $('#apFim').value;
  if (inicio && fim && fim < inicio) return toast('A data final é antes da inicial.');
  const dados = { texto, inicio, fim, localId: $('#apLocal').value };
  if (AvPar.editando) Object.assign(AvPar.lista.find(a => a.id === AvPar.editando) || {}, dados);
  else AvPar.lista.push({ id: uid(), ...dados });
  limparFormAvisoPar();
  await aposMudarAvisosPar();
  toast('Aviso guardado.');
}

async function salvarEstiloDoForm() {
  AvPar.estilo = {
    titulo: $('#apeTitulo').value.trim() || ESTILO_AVISOS.titulo, icone: $('#apeIcone').value,
    corTitulo: $('#apeCorTitulo').value, corTituloTexto: $('#apeCorTituloTexto').value,
    fundo: $('#apeFundo').value, corFundo: $('#apeCorFundo').value, corTexto: $('#apeCorTexto').value,
    porSlide: +$('#apePorSlide').value || 3, noRoteiro: $('#apeNoRoteiro').checked,
  };
  renderEstiloAvisos();
  await aposMudarAvisosPar();
}

// ---------- avisos salvos (aba "Outro aviso" do botão Aviso) ----------
function renderConvites() {
  const livre = Avisos.tipo === 'livre';
  $('#avSalvos').hidden = !livre;
  $('#avSalvarLinha').hidden = !livre;
  if (!livre) return;
  $('#avSalvosLista').innerHTML = AvPar.convites.length ? AvPar.convites.map(c =>
    `<div class="av-salvo ${Avisos.salvoSel === c.id ? 'sel' : ''}" data-salvo="${c.id}">
      <button type="button" class="av-salvo-txt" title="Usar este aviso (dá para editar o texto antes de mostrar)">${esc(c.texto)}</button>
      <button type="button" class="av-salvo-ir" data-ir title="Mostrar na tela agora">▶</button></div>`).join('')
    : '<span class="sutil pequeno">Nenhum aviso salvo. Escreva um aviso e clique em "💾 Salvar este aviso".</span>';
  const sel = AvPar.convites.find(c => c.id === Avisos.salvoSel);
  $('#avSalvar').textContent = sel ? '💾 Salvar por cima' : '💾 Salvar este aviso';
  $('#avSalvarNovo').hidden = !sel;
  $('#avApagarSalvo').hidden = !sel;
}

async function salvarConvite(comoNovo) {
  const texto = $('#avTexto').value.trim().replace(/\s*\n\s*/g, ' ');
  if (!texto) return toast('Escreva o aviso para salvar.');
  const sel = !comoNovo && AvPar.convites.find(c => c.id === Avisos.salvoSel);
  if (sel) sel.texto = texto;
  else { const c = { id: uid(), texto }; AvPar.convites.push(c); Avisos.salvoSel = c.id; }
  await salvarAvisosPar();
  renderConvites();
  toast(sel ? 'Aviso salvo (por cima).' : 'Aviso salvo.');
}

async function apagarConvite() {
  const c = AvPar.convites.find(x => x.id === Avisos.salvoSel);
  if (!c || !confirm(`Apagar o aviso salvo?\n\n"${c.texto}"`)) return;
  AvPar.convites = AvPar.convites.filter(x => x !== c);
  Avisos.salvoSel = null;
  $('#avTexto').value = '';
  await salvarAvisosPar();
  renderConvites();
}

function ligarAvisosPar() {
  $('#avSalvosLista').addEventListener('click', e => {
    const box = e.target.closest('[data-salvo]');
    if (!box) return;
    const c = AvPar.convites.find(x => x.id === box.dataset.salvo);
    if (!c) return;
    if (e.target.closest('[data-ir]')) {
      $('#dlgAviso').close();
      mostrarAviso({ tipo: 'livre', texto: c.texto, icone: ICONE_AVISO.livre, duracao: +$('#avDuracao').value, pos: $('#avPosicao').value });
      return;
    }
    Avisos.salvoSel = c.id;
    $('#avTexto').value = c.texto;
    renderConvites();
    $('#avTexto').focus();
  });
  $('#avSalvar').addEventListener('click', () => salvarConvite(false));
  $('#avSalvarNovo').addEventListener('click', () => salvarConvite(true));
  $('#avApagarSalvo').addEventListener('click', apagarConvite);

  $('#apAdicionar').addEventListener('click', salvarAvisoParDoForm);
  $('#apCancelar').addEventListener('click', () => { limparFormAvisoPar(); renderAvisosPar(); });
  $('#apLista').addEventListener('click', async e => {
    const row = e.target.closest('.ap-item'), acao = e.target.closest('[data-ap]')?.dataset.ap;
    if (!row || !acao) return;
    const a = AvPar.lista.find(x => x.id === row.dataset.id);
    if (acao === 'editar') return editarAvisoPar(a.id);
    if (acao === 'apagar' && confirm(`Apagar o aviso?\n\n"${a.texto}"`)) {
      AvPar.lista = AvPar.lista.filter(x => x !== a);
      if (AvPar.editando === a.id) limparFormAvisoPar();
      await aposMudarAvisosPar();
    }
  });
  $('#apLimpar').addEventListener('click', async () => {
    const venc = AvPar.lista.filter(a => situacao(a)[0] === 'vencido');
    if (!venc.length || !confirm(`Apagar ${venc.length} aviso(s) vencido(s)?`)) return;
    AvPar.lista = AvPar.lista.filter(a => !venc.includes(a));
    await aposMudarAvisosPar();
  });
  for (const id of ['apeTitulo', 'apeIcone', 'apeCorTitulo', 'apeCorTituloTexto', 'apeFundo', 'apeCorFundo', 'apeCorTexto', 'apePorSlide', 'apeNoRoteiro'])
    $('#' + id).addEventListener('change', salvarEstiloDoForm);
  $('#apeTitulo').addEventListener('input', debounce(salvarEstiloDoForm, 500));
  $('#apePadrao').addEventListener('click', async () => { AvPar.estilo = { noRoteiro: estiloAvisos().noRoteiro }; renderEstiloAvisos(); await aposMudarAvisosPar(); });
  // ao fechar a janela: o item Avisos aberto mostra a contagem nova
  $('#dlgAvisosPar').addEventListener('close', () => { if (S.atual?.item?.tipo === 'avisos') { renderCabecalho(); atualizarSlides(); } });
  carregarAvisosPar();
}
