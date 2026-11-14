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
  AvPar.apagados = v.apagados || {};
  AvPar.estiloEm = v.estiloEm || 0;
  AvPar.convitesEm = v.convitesEm || 0;
  // os dois convites de exemplo: avisos salvos comuns (editar, salvar por cima, apagar). Só são gravados quando alguém
  // mexe em algo — gravar já ao abrir faria um computador novo passar por cima, na nuvem, dos avisos da paróquia.
  AvPar.convites = v.convites || CONVITES_PADRAO.map((texto, i) => ({ id: 'convite-' + (i + 1), texto }));
}

async function salvarAvisosPar() {
  // apagados há mais de 6 meses já chegaram a todos os computadores
  const limite = Date.now() - 180 * 864e5;
  for (const [id, q] of Object.entries(AvPar.apagados || {})) if (q < limite) delete AvPar.apagados[id];
  await DB.salvar('config', { id: 'avisos', valor: { lista: AvPar.lista, convites: AvPar.convites, estilo: AvPar.estilo,
    apagados: AvPar.apagados || {}, estiloEm: AvPar.estiloEm || 0, convitesEm: AvPar.convitesEm || 0 } });
}

// (1.8.10) Junta os avisos de dois computadores (ou da Secretaria) AVISO POR AVISO: vale a versão mais nova de cada um
// (campo "em"); apagado de um lado sai do outro (se não foi mexido depois). Aparência e avisos salvos: vale o lado mais novo.
// Devolve { valor, mudouBase } — mudouBase: o resultado tem algo que não estava em `base`.
function juntarAvisos(base, outra) {
  base ||= {}; outra ||= {};
  const apagados = { ...(outra.apagados || {}) };
  for (const [id, q] of Object.entries(base.apagados || {})) apagados[id] = Math.max(apagados[id] || 0, q);
  const porId = new Map();
  for (const a of [...(base.lista || []), ...(outra.lista || [])]) {
    const x = porId.get(a.id);
    if (!x || (a.em || 0) > (x.em || 0)) porId.set(a.id, a);
  }
  const lista = [...porId.values()].filter(a => !(apagados[a.id] >= (a.em || 0)));
  const maisNovo = (k, kEm) => (outra[kEm] || 0) > (base[kEm] || 0) ? outra[k] : base[k];
  const valor = { ...base, lista, apagados,
    estilo: maisNovo('estilo', 'estiloEm'), estiloEm: Math.max(base.estiloEm || 0, outra.estiloEm || 0),
    convites: maisNovo('convites', 'convitesEm') ?? base.convites ?? outra.convites, convitesEm: Math.max(base.convitesEm || 0, outra.convitesEm || 0) };
  const assinatura = v => JSON.stringify([(v.lista || []).map(a => a.id + ':' + (a.em || 0)).sort(), v.estiloEm || 0, v.convitesEm || 0,
    Object.keys(v.apagados || {}).sort()]);
  return { valor, mudouBase: assinatura(valor) !== assinatura(base) };
}

// ---------- avisos programados ----------
const hojeIso = () => isoData(new Date());
// (1.8.10) um aviso pode valer para várias comunidades (locais); antes era uma só (localId). Nenhuma = todas.
const locaisDoAviso = a => a.locais?.length ? a.locais : a.localId ? [a.localId] : [];
const vigente = (a, iso, localId) => (!a.inicio || a.inicio <= iso) && (!a.fim || iso <= a.fim) &&
  (!localId || !locaisDoAviso(a).length || locaisDoAviso(a).includes(localId));

// Avisos programados que valem numa data e comunidade, na ordem de entrada
const avisosVigentes = (iso, localId) => AvPar.lista.filter(a => vigente(a, iso, localId))
  .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || (a.inicio || '').localeCompare(b.inicio || '')).map(a => a.texto.trim()).filter(Boolean);

// Reparte os avisos em páginas (slides): até N por página e não muito texto numa só
function paginarAvisos(textos) {
  const N = Math.max(1, Math.min(6, +estiloAvisos().porSlide || 3)), MAX = 330;
  const paginas = [];
  for (const t of textos) {
    const p = paginas[paginas.length - 1];
    const tam = p ? p.reduce((s, x) => s + x.length, 0) : 0;
    if (!p || p.length >= N || (tam + t.length > MAX && p.length)) paginas.push([t]); else p.push(t);
  }
  return paginas;
}

// Data e comunidade do roteiro onde o item está (sem data: hoje)
function quandoDoItem(item) {
  const r = S.roteiro?.itens.includes(item) ? S.roteiro : null;
  const info = r ? infoRoteiro(r) : {};
  return { iso: info.iso || hojeIso(), localId: info.localId || '' };
}

function avisosDoItem(item) {
  const { iso, localId } = quandoDoItem(item);
  const prog = item.programados === false ? [] : avisosVigentes(iso, localId);
  return [...prog, ...dividir(item.extras)].filter(Boolean);
}

// Slides do item: o título em todos; os avisos repartidos (até N por slide, e não muito texto num slide só)
function slidesAvisos(item) {
  const e = estiloAvisos(), textos = avisosDoItem(item);
  const titulo = (item.titulo || '').trim() || e.titulo;
  const visual = { titulo, icone: e.icone, corTitulo: e.corTitulo, corTituloTexto: e.corTituloTexto,
    fundo: e.fundo === 'cor' ? e.corFundo : '', corTexto: e.fundo === 'cor' ? e.corTexto : '' };
  const paginas = paginarAvisos(textos);
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
    const [cls, txt] = situacao(a), locs = locaisDoAviso(a).map(localDe).filter(Boolean);
    return `<div class="ap-item ${cls} ${AvPar.editando === a.id ? 'sel' : ''}" data-id="${a.id}">
      <div class="ap-txt">${htmlAviso(a.texto)}</div>
      <div class="ap-info"><span class="ap-sit">${esc(txt)}</span> · ${locs.length ? locs.map(l => `<span class="card-ponto" style="background:${l.cor}"></span> ${esc(l.nome)}`).join(', ') : 'todas as comunidades'}</div>
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
  renderLocaisAviso([]);
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
  if (SECRETARIA) modoAvisosPar('cad');
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
  renderLocaisAviso(locaisDoAviso(a));
  $('#apAdicionar').textContent = 'Salvar alteração';
  $('#apCancelar').hidden = false;
  renderAvisosPar();
  $('#apTexto').focus();
}

async function aposMudarAvisosPar() {
  await salvarAvisosPar();
  renderAvisosPar();
  if ($('#apCel')?.open) renderListaCelebracao();
  // o item Avisos aberto (ou no ar) mostra a lista nova
  if (S.atual?.item?.tipo === 'avisos') atualizarSlides();
  if (typeof renderRoteiroLista === 'function') renderRoteiroLista();
}

async function salvarAvisoParDoForm() {
  const texto = $('#apTexto').value.replace(/\r/g, '').trim();
  if (!texto) return toast('Escreva o aviso.');
  const inicio = $('#apInicio').value, fim = $('#apFim').value;
  if (inicio && fim && fim < inicio) return toast('A data final é antes da inicial.');
  const locais = $$('#apLocais input[data-loc]:checked').map(el => el.dataset.loc);
  // localId: para os computadores ainda na versão antiga (uma comunidade só; várias = todas)
  const dados = { texto, inicio, fim, locais, localId: locais.length === 1 ? locais[0] : '', em: Date.now() };
  if (AvPar.editando) Object.assign(AvPar.lista.find(a => a.id === AvPar.editando) || {}, dados);
  else AvPar.lista.push({ id: uid(), ...dados });
  limparFormAvisoPar();
  await aposMudarAvisosPar();
  toast('Aviso guardado.');
}

// Comunidades do aviso: "Todas" ou as marcadas (várias)
function renderLocaisAviso(sel) {
  const ordem = [...Agenda.dados.locais].sort((a, b) => TIPOS_LOCAL.indexOf(a.tipo) - TIPOS_LOCAL.indexOf(b.tipo) || a.nome.localeCompare(b.nome, 'pt-BR'));
  $('#apLocais').innerHTML = `<label class="check"><input type="checkbox" data-todas ${sel.length ? '' : 'checked'}> <b>Todas as comunidades</b></label>` +
    ordem.map(l => `<label class="check"><input type="checkbox" data-loc="${l.id}" ${sel.includes(l.id) ? 'checked' : ''}>
      <span class="card-ponto" style="background:${l.cor}"></span> ${esc(l.tipo)} ${esc(l.nome)}</label>`).join('');
}

async function salvarEstiloDoForm() {
  AvPar.estiloEm = Date.now();
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
  AvPar.convitesEm = Date.now();
  await salvarAvisosPar();
  renderConvites();
  toast(sel ? 'Aviso salvo (por cima).' : 'Aviso salvo.');
}

async function apagarConvite() {
  const c = AvPar.convites.find(x => x.id === Avisos.salvoSel);
  if (!c || !confirm(`Apagar o aviso salvo?\n\n"${c.texto}"`)) return;
  AvPar.convites = AvPar.convites.filter(x => x !== c);
  AvPar.convitesEm = Date.now();
  Avisos.salvoSel = null;
  $('#avTexto').value = '';
  await salvarAvisosPar();
  renderConvites();
}

// ---------- (1.8.10 / Secretaria) Avisos de UMA celebração: papel (PDF) e imagens (Holyrics) ----------
const AvCel = { ocs: [], previas: [] };

function celebracaoEscolhida() {
  const iso = $('#apcData').value || hojeIso();
  const o = AvCel.ocs[+$('#apcCel').value] || null;
  return { iso, o, localId: o?.localId || '' };
}

function renderAvisosCelebracao() {
  if (!$('#apcData').value) $('#apcData').value = hojeIso();
  const antes = $('#apcCel').value;
  AvCel.ocs = ocorrencias(deIso($('#apcData').value)).filter(o => !o.cancelada);
  $('#apcCel').innerHTML = AvCel.ocs.map((o, i) => `<option value="${i}">${o.hora} · ${esc(o.texto)}</option>`).join('')
    + '<option value="-1">Sem celebração: avisos de todas as comunidades</option>';
  if ([...$('#apcCel').options].some(op => op.value === antes)) $('#apcCel').value = antes;
  renderListaCelebracao();
}

function renderListaCelebracao() {
  const { iso, localId } = celebracaoEscolhida(), textos = avisosVigentes(iso, localId);
  $('#apcLista').innerHTML = textos.length
    ? `<ol>${textos.map(t => `<li>${htmlAviso(t)}</li>`).join('')}</ol>`
    : '<p class="sutil">Nenhum aviso programado vale para essa celebração.</p>';
  $('#apcImprimir').disabled = $('#apcImagens').disabled = !textos.length;
  $('#apcPasta').textContent = S.config.avisosPastaImagens || '(ainda não escolhida)';
  $('#apcAbrirPasta').hidden = !NO_APP || !S.config.avisosPastaImagens;
  AvCel.previas = [];
  $('#apcPrevia').innerHTML = '';
}

// "Domingo, 15/11/2026 · 19h00 · Matriz SJO" e o começo do nome dos arquivos
function descricaoCelebracao({ iso, o }) {
  const d = deIso(iso), loc = o ? localDe(o.localId) : null;
  const quando = `${DIAS[d.getDay()]}, ${dataBR(iso)}`;
  return { titulo: [quando, o ? o.hora.replace(':', 'h') : '', o ? (o.texto || nomeCurtoLocal(loc)) : 'todas as comunidades'].filter(Boolean).join(' · '),
    arquivo: `Avisos ${iso}${o ? ' ' + o.hora.replace(':', 'h') : ''} ${o ? (nomeCurtoLocal(loc) || o.texto) : 'Todas'}`.trim() };
}

function imprimirAvisosCelebracao() {
  const cel = celebracaoEscolhida(), textos = avisosVigentes(cel.iso, cel.localId);
  if (!textos.length) return toast('Nenhum aviso para imprimir.');
  const par = Agenda.dados.paroquia || {}, desc = descricaoCelebracao(cel), e = estiloAvisos();
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(desc.arquivo)}</title><style>
    @page { size: A4; margin: 18mm 18mm 18mm;
      @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 8pt "Segoe UI", Arial, sans-serif; color: #999; } }
    body { font: 15pt/1.45 Georgia, "Times New Roman", serif; color: #111; margin: 0; }
    header { border-bottom: 3px solid ${e.corTitulo}; padding-bottom: 8px; margin-bottom: 14px; font-family: "Segoe UI", Arial, sans-serif; }
    header .par { font-size: 10.5pt; color: #555; }
    header h1 { font-size: 21pt; margin: 2px 0; }
    header .quando { font-size: 12pt; color: #333; }
    ol { padding-left: 1.3em; margin: 0; }
    li { margin: 0 0 .85em; padding-left: .2em; break-inside: avoid; }
    footer { margin-top: 18px; font: 8pt "Segoe UI", Arial, sans-serif; color: #999; text-align: right; }
  </style></head><body>
    <header>${par.nome ? `<div class="par">${esc(par.nome)}</div>` : ''}<h1>${esc(e.titulo)}</h1><div class="quando">${esc(desc.titulo)}</div></header>
    <ol>${textos.map(t => `<li>${esc(tirarMarcas(t)).replace(/\n/g, '<br>')}</li>`).join('')}</ol>
    <footer>${SECRETARIA ? 'Secretaria ' : ''}MiguelAngelus · impresso em ${new Date().toLocaleDateString('pt-BR')}</footer>
  </body></html>`;
  $('#quadroImpressao')?.remove();
  const f = document.createElement('iframe');
  f.id = 'quadroImpressao';
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  f.srcdoc = html;
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (err) { toast('Não consegui abrir a impressão: ' + err.message); } };
  document.body.appendChild(f);
}

const corComAlfa = (hex, a) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return `rgba(255,255,255,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

// Quebra um texto em linhas que cabem na largura (com a fonte já escolhida no contexto)
function linhasCanvas(g, texto, largura) {
  const out = [];
  for (const par of texto.split('\n')) {
    let linha = '';
    for (const p of par.split(/\s+/).filter(Boolean)) {
      const tenta = linha ? linha + ' ' + p : p;
      if (g.measureText(tenta).width <= largura || !linha) linha = tenta;
      else { out.push(linha); linha = p; }
    }
    out.push(linha);
  }
  return out;
}

// Imagens Full HD (1920×1080) dos avisos, no mesmo jeito da tela de Avisos do telão: título numa faixa e um cartão por aviso
async function imagensDosAvisos(textos) {
  const e = estiloAvisos(), W = 1920, H = 1080, FONTE = '"Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
  const fundo = e.fundo === 'cor' ? e.corFundo : (S.config.corFundo || '#0f2742');
  const corTxt = e.fundo === 'cor' ? e.corTexto : (S.config.corTexto || '#ffffff');
  try { await document.fonts?.ready; } catch (_) {}
  const paginas = paginarAvisos(textos.map(t => tirarMarcas(t)));
  let fUnica = 65;   // a mesma letra em todas as imagens: a menor que coube em cada uma (1ª passada mede, 2ª desenha)
  const desenhar = (itens, pi, soMedir) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = fundo; g.fillRect(0, 0, W, H);
    // título
    const tit = ((e.icone ? e.icone + '  ' : '') + e.titulo).toUpperCase();
    let ft = 92;
    const fonteTit = () => { g.font = `800 ${ft}px ${FONTE}`; g.letterSpacing = (ft * .05) + 'px'; };
    fonteTit();
    while (g.measureText(tit).width + ft * 2.2 > W * .9 && ft > 30) { ft *= .95; fonteTit(); }
    const ph = ft * 1.66, pw = g.measureText(tit).width + ft * 2.2, px = (W - pw) / 2, py = 48;
    g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 28; g.shadowOffsetY = 9;
    g.fillStyle = e.corTitulo; g.beginPath(); g.roundRect(px, py, pw, ph, ph / 2); g.fill(); g.restore();
    g.fillStyle = e.corTituloTexto; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(tit, W / 2, py + ph / 2 + ft * .04);
    g.letterSpacing = '0px';
    // avisos: a maior letra (até 65 px) em que todos cabem
    const topo = py + ph + 38, base = H - 65, x0 = 96, larg = W - 2 * x0;
    const medir = f => {
      g.font = `500 ${f}px ${FONTE}`;
      const borda = .32 * f, pl = 1.1 * f, pr = .8 * f, pv = .45 * f, lh = 1.22 * f, gap = .55 * f;
      const blocos = itens.map(t => { const ls = linhasCanvas(g, t, larg - borda - pl - pr); return { ls, h: ls.length * lh + 2 * pv }; });
      return { f, borda, pl, pv, lh, gap, blocos, altura: blocos.reduce((s, b) => s + b.h, 0) + gap * Math.max(0, blocos.length - 1) };
    };
    let L = medir(soMedir ? 65 : fUnica);
    while (L.altura > base - topo && L.f > 22) L = medir(L.f * .95);
    if (soMedir) { fUnica = Math.min(fUnica, L.f); return; }
    let y = topo + Math.max(0, (base - topo - L.altura) / 2);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    for (const b of L.blocos) {
      g.fillStyle = corComAlfa(corTxt, .1);
      g.beginPath(); g.roundRect(x0, y, larg, b.h, .35 * L.f); g.fill();
      g.fillStyle = e.corTitulo;
      g.beginPath(); g.roundRect(x0, y, L.borda, b.h, [.35 * L.f, 0, 0, .35 * L.f]); g.fill();
      g.fillStyle = corTxt;
      b.ls.forEach((l, k) => g.fillText(l, x0 + L.borda + L.pl, y + L.pv + k * L.lh + L.f * .95));
      y += b.h + L.gap;
    }
    if (paginas.length > 1) {
      g.font = `400 28px ${FONTE}`; g.fillStyle = corComAlfa(corTxt, .65); g.textAlign = 'right';
      g.fillText(`${pi + 1}/${paginas.length}`, W - 48, H - 22);
    }
    return c.toDataURL('image/png');
  };
  paginas.forEach((itens, pi) => desenhar(itens, pi, true));
  return paginas.map((itens, pi) => desenhar(itens, pi, false));
}

async function escolherPastaImagens() {
  const r = await arqApp('imagensEscolherPasta', { atual: S.config.avisosPastaImagens || '' });
  if (!r.pasta) return false;
  S.config.avisosPastaImagens = r.pasta;       // só neste computador
  salvarConfig();
  renderListaCelebracao();
  return true;
}

async function gerarImagensCelebracao() {
  const cel = celebracaoEscolhida(), textos = avisosVigentes(cel.iso, cel.localId);
  if (!textos.length) return toast('Nenhum aviso para essa celebração.');
  const b = $('#apcImagens');
  b.disabled = true;
  try {
    const urls = await imagensDosAvisos(textos);
    const prefixo = descricaoCelebracao(cel).arquivo + ' (';
    const nomes = urls.map((_, i) => `${prefixo}${i + 1} de ${urls.length}).png`);
    $('#apcPrevia').innerHTML = urls.map((u, i) => `<img src="${u}" alt="${esc(nomes[i])}" title="${esc(nomes[i])}">`).join('');
    if (!NO_APP) {          // no navegador: baixa os arquivos
      urls.forEach((u, i) => { const a = document.createElement('a'); a.href = u; a.download = nomes[i]; a.click(); });
      return toast(`${urls.length} imagem(ns) baixada(s).`);
    }
    if (!S.config.avisosPastaImagens) {
      // primeira vez: a pasta de imagens do Holyrics, se este computador tiver; senão, pergunta
      const sug = await arqApp('midiaSugerir', { tipoMidia: 'image' }).catch(() => ({}));
      if (sug.pasta && confirm(`Salvar as imagens dos avisos na pasta de imagens do Holyrics?\n\n${sug.pasta}\n\n(Cancelar = escolher outra pasta)`)) {
        S.config.avisosPastaImagens = sug.pasta; salvarConfig();
      } else if (!await escolherPastaImagens()) return;
    }
    const r = await arqApp('imagensSalvar', { pasta: S.config.avisosPastaImagens, prefixo,
      arquivos: urls.map((u, i) => ({ nome: nomes[i], base64: u.split(',')[1] })) });
    renderListaCelebracao();
    $('#apcPrevia').innerHTML = urls.map((u, i) => `<img src="${u}" alt="${esc(nomes[i])}" title="${esc(nomes[i])}">`).join('');
    toast(`🖼 ${r.gravados} imagem(ns) salva(s) em ${r.pasta}`);
  } catch (err) {
    alert('Não foi possível gerar as imagens:\n' + err.message);
  } finally { b.disabled = false; }
}

// (Secretaria) a mesma janela em dois modos: 'cad' = cadastro dos avisos; 'cel' = só os avisos de uma celebração
// (papel/PDF e imagens). No MiguelAngelus fica tudo junto, como sempre (sem modo).
function modoAvisosPar(modo) {
  const dlg = $('#dlgAvisosPar');
  dlg.classList.toggle('modo-cad', modo === 'cad');
  dlg.classList.toggle('modo-cel', modo === 'cel');
  $('#apTitulo').textContent = modo === 'cel' ? '🖨 Avisos de uma celebração' : '📢 Avisos paroquiais';
  if (modo === 'cel') { $('#apCel').open = true; renderAvisosCelebracao(); dlg.querySelector('form').scrollTop = 0; }
  else if (modo === 'cad') setTimeout(() => $('#apTexto').focus(), 30);
}

function abrirAvisosCelebracao() {
  abrirAvisosPar();
  $('#apCel').open = true;
  renderAvisosCelebracao();
  if (SECRETARIA) return modoAvisosPar('cel');
  setTimeout(() => $('#apCel').scrollIntoView({ block: 'start' }), 50);
}

function ligarAvisosCelebracao() {
  $('#apCel').addEventListener('toggle', () => { if ($('#apCel').open) renderAvisosCelebracao(); });
  $('#apcData').addEventListener('change', renderAvisosCelebracao);
  $('#apcCel').addEventListener('change', renderListaCelebracao);
  $('#apcImprimir').addEventListener('click', imprimirAvisosCelebracao);
  $('#apcImagens').addEventListener('click', gerarImagensCelebracao);
  $('#apcEscolher').addEventListener('click', () => NO_APP ? escolherPastaImagens() : toast('Escolher a pasta só no programa (no navegador as imagens são baixadas).'));
  $('#apcAbrirPasta').addEventListener('click', () => arqApp('imagensMostrar', { pasta: S.config.avisosPastaImagens }));
  $('#apIrCadastro').addEventListener('click', () => modoAvisosPar('cad'));
  $('#apIrCel').addEventListener('click', () => modoAvisosPar('cel'));
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
      (AvPar.apagados ||= {})[a.id] = Date.now();
      if (AvPar.editando === a.id) limparFormAvisoPar();
      await aposMudarAvisosPar();
    }
  });
  $('#apLimpar').addEventListener('click', async () => {
    const venc = AvPar.lista.filter(a => situacao(a)[0] === 'vencido');
    if (!venc.length || !confirm(`Apagar ${venc.length} aviso(s) vencido(s)?`)) return;
    AvPar.lista = AvPar.lista.filter(a => !venc.includes(a));
    for (const a of venc) (AvPar.apagados ||= {})[a.id] = Date.now();
    await aposMudarAvisosPar();
  });
  // "Todas" desmarca as comunidades; marcar uma comunidade desmarca "Todas"
  $('#apLocais').addEventListener('change', e => {
    const box = $('#apLocais');
    if (e.target.matches('[data-todas]') && e.target.checked) box.querySelectorAll('[data-loc]').forEach(x => x.checked = false);
    else if (e.target.matches('[data-loc]')) box.querySelector('[data-todas]').checked = !box.querySelector('[data-loc]:checked');
  });
  ligarAvisosCelebracao();
  for (const id of ['apeTitulo', 'apeIcone', 'apeCorTitulo', 'apeCorTituloTexto', 'apeFundo', 'apeCorFundo', 'apeCorTexto', 'apePorSlide', 'apeNoRoteiro'])
    $('#' + id).addEventListener('change', salvarEstiloDoForm);
  $('#apeTitulo').addEventListener('input', debounce(salvarEstiloDoForm, 500));
  $('#apePadrao').addEventListener('click', async () => { AvPar.estilo = { noRoteiro: estiloAvisos().noRoteiro }; AvPar.estiloEm = Date.now(); renderEstiloAvisos(); await aposMudarAvisosPar(); });
  // ao fechar a janela: o item Avisos aberto mostra a contagem nova
  $('#dlgAvisosPar').addEventListener('close', () => { if (S.atual?.item?.tipo === 'avisos') { renderCabecalho(); atualizarSlides(); } });
  AvPar.pronto = carregarAvisosPar();   // a Secretaria espera por isto antes de contar os avisos da semana
}
