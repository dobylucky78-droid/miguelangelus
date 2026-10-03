'use strict';
/*
 * Orações Eucarísticas e Prefácios.
 *  - Catálogo com os nomes (baseado no Missal Romano, 3ª edição — confira com o Missal da paróquia)
 *    e as regras de combinação (quais prefácios cada oração aceita).
 *  - Os TEXTOS não vêm prontos: são guardados automaticamente quando um folheto traz a oração/prefácio
 *    do dia, ou colados à mão (✎). Assim o texto é sempre o oficial.
 *  - No roteiro: item "prefacio" (depois do Diálogo do Prefácio) e item "eucaristica" (depois do Santo).
 * Registro { id: 'eucaristia' } no store "config" (entra no backup).
 */

// pref: 'livre' = aceita os prefácios do Missal | 'fixo' = só o próprio | 'fixo-flex' = próprio ou de tema penitencial
const OES = [
  { id: 'oe1', nome: 'Oração Eucarística I (Cânon Romano)', pref: 'livre' },
  { id: 'oe2', nome: 'Oração Eucarística II', pref: 'livre', proprio: 'p-oe2', obs: 'Tem prefácio próprio, que pode ser trocado por outro.' },
  { id: 'oe3', nome: 'Oração Eucarística III', pref: 'livre' },
  { id: 'oe4', nome: 'Oração Eucarística IV', pref: 'fixo', proprio: 'p-oe4', obs: 'O prefácio faz parte da oração e não se troca.' },
  { id: 'oe5', nome: 'Oração Eucarística V', pref: 'fixo', proprio: 'p-oe5', obs: 'Tem prefácio próprio.' },
  { id: 'rec1', nome: 'Oração Eucarística sobre a Reconciliação I', pref: 'fixo-flex', proprio: 'p-rec1', obs: 'Tem prefácio próprio; as rubricas admitem outros de tema penitencial (Quaresma). Confira no Missal.' },
  { id: 'rec2', nome: 'Oração Eucarística sobre a Reconciliação II', pref: 'fixo-flex', proprio: 'p-rec2', obs: 'Tem prefácio próprio; as rubricas admitem outros de tema penitencial (Quaresma). Confira no Missal.' },
  { id: 'dc1', nome: 'Oração Eucarística para Diversas Circunstâncias I — A Igreja a caminho da unidade', pref: 'fixo', proprio: 'p-dc1', obs: 'Prefácio próprio.' },
  { id: 'dc2', nome: 'Oração Eucarística para Diversas Circunstâncias II — Deus conduz a sua Igreja', pref: 'fixo', proprio: 'p-dc2', obs: 'Prefácio próprio.' },
  { id: 'dc3', nome: 'Oração Eucarística para Diversas Circunstâncias III — Jesus, caminho para o Pai', pref: 'fixo', proprio: 'p-dc3', obs: 'Prefácio próprio.' },
  { id: 'dc4', nome: 'Oração Eucarística para Diversas Circunstâncias IV — Jesus, que passa fazendo o bem', pref: 'fixo', proprio: 'p-dc4', obs: 'Prefácio próprio.' },
];

const GRUPO_PROPRIOS = 'Próprios das Orações Eucarísticas';
const romanos = n => ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'].slice(0, n);
const GRUPOS_PREF = [
  { grupo: GRUPO_PROPRIOS, itens: [['p-oe2', 'Prefácio da Oração Eucarística II'], ['p-oe4', 'Prefácio da Oração Eucarística IV'], ['p-oe5', 'Prefácio da Oração Eucarística V'],
    ['p-rec1', 'Prefácio da Reconciliação I'], ['p-rec2', 'Prefácio da Reconciliação II'],
    ['p-dc1', 'Prefácio das Diversas Circunstâncias I'], ['p-dc2', 'Prefácio das Diversas Circunstâncias II'],
    ['p-dc3', 'Prefácio das Diversas Circunstâncias III'], ['p-dc4', 'Prefácio das Diversas Circunstâncias IV']] },
  { grupo: 'Advento', itens: romanos(2).map((r, i) => [`adv${i + 1}`, `Advento ${r}`]) },
  { grupo: 'Natal', itens: [...romanos(3).map((r, i) => [`nat${i + 1}`, `Natal ${r}`]), ['epif', 'Epifania do Senhor']] },
  { grupo: 'Quaresma', itens: romanos(4).map((r, i) => [`qua${i + 1}`, `Quaresma ${r}`]) },
  { grupo: 'Domingos da Quaresma', itens: [['qd1', '1º Domingo da Quaresma — A tentação do Senhor'], ['qd2', '2º Domingo da Quaresma — A Transfiguração'],
    ['qd3', '3º Domingo da Quaresma — A samaritana'], ['qd4', '4º Domingo da Quaresma — O cego de nascença'], ['qd5', '5º Domingo da Quaresma — Lázaro']] },
  { grupo: 'Paixão do Senhor', itens: [['pai1', 'Paixão do Senhor I'], ['pai2', 'Paixão do Senhor II'], ['ramos', 'Domingo de Ramos e da Paixão']] },
  { grupo: 'Páscoa', itens: [...romanos(5).map((r, i) => [`pas${i + 1}`, `Páscoa ${r}`]), ['asc1', 'Ascensão do Senhor I'], ['asc2', 'Ascensão do Senhor II'], ['pent', 'Pentecostes']] },
  { grupo: 'Domingos do Tempo Comum', itens: romanos(10).map((r, i) => [`tc${i + 1}`, `Domingos do Tempo Comum ${r}`]) },
  { grupo: 'Comuns', itens: romanos(6).map((r, i) => [`com${i + 1}`, `Comum ${r}`]) },
  { grupo: 'Solenidades e festas do Senhor', itens: [['trin', 'Santíssima Trindade'], ['batismo', 'Batismo do Senhor'], ['apres', 'Apresentação do Senhor'],
    ['anunc', 'Anunciação do Senhor'], ['transf', 'Transfiguração do Senhor'], ['cruz', 'Exaltação da Santa Cruz'], ['corac', 'Sagrado Coração de Jesus'],
    ['cristorei', 'Cristo Rei do Universo'], ['euc1', 'Santíssima Eucaristia I'], ['euc2', 'Santíssima Eucaristia II']] },
  { grupo: 'Espírito Santo', itens: [['es1', 'Espírito Santo I'], ['es2', 'Espírito Santo II']] },
  { grupo: 'Nossa Senhora', itens: [['nsra1', 'Virgem Maria I'], ['nsra2', 'Virgem Maria II'], ['imac', 'Imaculada Conceição'], ['assun', 'Assunção de Nossa Senhora']] },
  { grupo: 'Santos', itens: [['jose', 'São José'], ['joaob', 'São João Batista'], ['pedropaulo', 'São Pedro e São Paulo'], ['apost1', 'Apóstolos I'], ['apost2', 'Apóstolos II'],
    ['santos1', 'Santos I'], ['santos2', 'Santos II'], ['martires', 'Santos Mártires'], ['pastores', 'Santos Pastores'], ['virgens', 'Santas Virgens e Santos Religiosos'], ['anjos', 'Anjos']] },
  { grupo: 'Outras ocasiões', itens: [['unidade', 'Unidade dos Cristãos'], ['ded1', 'Dedicação de uma igreja I'], ['ded2', 'Dedicação de uma igreja II']] },
  { grupo: 'Defuntos', itens: romanos(5).map((r, i) => [`def${i + 1}`, `Defuntos ${r}`]) },
];

const Euc = { dados: { textos: {}, extras: [] }, sel: { oe: 'oe3', pref: null }, filtro: '', editando: null };

// ---------- Dados ----------

async function carregarEucaristia() {
  const reg = await DB.obter('config', 'eucaristia');
  if (reg?.valor) Object.assign(Euc.dados, reg.valor);
}
let timerEuc = 0;
function salvarEucaristia() {
  clearTimeout(timerEuc);
  timerEuc = setTimeout(() => DB.salvar('config', { id: 'eucaristia', valor: Euc.dados }), 200);
}

const listaOEs = () => [...OES, ...Euc.dados.extras.filter(x => x.tipo === 'oe').map(x => ({ ...x, pref: 'livre', extra: true }))];
function listaPrefacios() {
  const base = GRUPOS_PREF.flatMap(g => g.itens.map(([id, nome]) => ({ id, nome, grupo: g.grupo })));
  return [...base, ...Euc.dados.extras.filter(x => x.tipo === 'pref').map(x => ({ ...x, extra: true }))];
}
const oeDe = id => listaOEs().find(o => o.id === id) || null;
const prefDe = id => listaPrefacios().find(p => p.id === id) || null;
const nomeEuc = id => (oeDe(id) || prefDe(id))?.nome || '?';
const temTexto = id => !!Euc.dados.textos[id]?.texto;

// Prefácios que podem ser usados com uma oração eucarística
function prefaciosPermitidos(oe) {
  if (!oe) return [];
  const livres = listaPrefacios().filter(p => p.grupo !== GRUPO_PROPRIOS);
  if (oe.pref === 'fixo') return [prefDe(oe.proprio)].filter(Boolean);
  if (oe.pref === 'fixo-flex') return [prefDe(oe.proprio), ...livres.filter(p => /quaresma/i.test(p.grupo))].filter(Boolean);
  return [...(oe.proprio ? [prefDe(oe.proprio)] : []), ...livres];
}

// Grupos sugeridos pelo tempo litúrgico da data do roteiro aberto (ou de hoje)
function gruposSugeridos() {
  const d = (S.roteiro && infoRoteiro(S.roteiro).data) || new Date();
  const lit = Liturgia.info(d);
  const mapa = {
    'Advento': ['Advento'], 'Natal': ['Natal'], 'Quaresma': ['Quaresma', 'Domingos da Quaresma', 'Paixão do Senhor'],
    'Tríduo Pascal': ['Paixão do Senhor', 'Páscoa'], 'Páscoa': ['Páscoa'],
    'Comum': d.getDay() === 0 ? ['Domingos do Tempo Comum'] : ['Comuns'],
  };
  return { titulo: lit.titulo, grupos: mapa[lit.tempo] || [] };
}

// ---------- Captura automática pelos folhetos ----------

const normEuc = s => semAcento(s || '').replace(/\([^)]*\)/g, ' ').replace(/\bprefacio\b/g, ' ')
  .replace(/\b(dos|das|do|da|de|o|a|os|as|e|para|sobre)\b/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Prefácios de festas reconhecidos pelo tema ("A glória da Assunção de Maria" → Assunção)
const TEMAS_PREF = [[/assun[cç][aã]o/i, 'assun'], [/imaculada/i, 'imac'], [/trindade/i, 'trin'], [/pentecostes/i, 'pent'],
  [/cristo,? rei|rei do universo/i, 'cristorei'], [/ramos/i, 'ramos'], [/epifania/i, 'epif'], [/batismo do senhor/i, 'batismo'],
  [/apresenta[cç][aã]o do senhor/i, 'apres'], [/transfigura/i, 'transf'], [/santa cruz/i, 'cruz'], [/sagrado cora/i, 'corac'],
  [/s[aã]o jos[eé]/i, 'jose'], [/jo[aã]o batista/i, 'joaob'], [/pedro e (s[aã]o )?paulo/i, 'pedropaulo'], [/anuncia[cç][aã]o/i, 'anunc']];
const prefPorTema = nome => { const t = TEMAS_PREF.find(([re]) => re.test(nome || '')); return t ? prefDe(t[1]) : null; };

function criarExtra(tipo, nome) {
  const x = { id: 'x-' + uid(), tipo, nome, grupo: 'Outros (vindos dos folhetos)' };
  Euc.dados.extras.push(x);
  return tipo === 'oe' ? { ...x, pref: 'livre' } : x;
}

// cap = { oe: { nome, texto }, pref: { nome, texto } } (vem do folheto). Só guarda o que ainda não tem texto.
function capturarEucaristia(cap) {
  if (!cap) return '';
  const salvos = [];
  const guardar = (item, texto) => {
    if (!item || !texto || temTexto(item.id)) return;
    Euc.dados.textos[item.id] = { texto, origem: 'folheto', data: isoData(new Date()) };
    salvos.push(item.nome);
  };
  let oe = null;
  if (cap.oe?.texto) {
    // compara também sem o subtítulo do catálogo ("… Diversas Circunstâncias III — Jesus, caminho para o Pai")
    oe = listaOEs().find(o => [o.nome, o.nome.split(' — ')[0]].some(n => normEuc(n) === normEuc(cap.oe.nome))) || criarExtra('oe', cap.oe.nome);
    guardar(oe, cap.oe.texto);
  }
  if (cap.pref?.texto) {
    let p = null;
    // "Prefácio dos Domingos do Tempo Comum VII – A salvação pela…" → "Domingos do Tempo Comum VII"
    const nomeFolheto = (cap.pref.nome || '').split(/\s+[–—-]\s+/)[0].trim();
    if (oe?.proprio && oe.pref !== 'livre') p = prefDe(oe.proprio);          // oração com prefácio próprio
    else if (nomeFolheto) {
      const nome = nomeFolheto.replace(/^pref[aá]cio\s+/i, '').replace(/^(dos|das|do|da|de)\s+/i, '');
      p = listaPrefacios().find(x => normEuc(x.nome) === normEuc(nomeFolheto))
        || prefPorTema(cap.pref.nome)
        || criarExtra('pref', nome.charAt(0).toUpperCase() + nome.slice(1));
    }
    guardar(p, cap.pref.texto);
  }
  if (salvos.length) salvarEucaristia();
  return salvos.length ? ` Guardado em Orações Eucarísticas: ${salvos.join(' e ')}.` : '';
}

// Lê folhetos (um ou vários) só para guardar a oração eucarística e o prefácio de cada um
async function lerOracoesDeFolhetos(arquivos) {
  const achados = [], semOracao = [];
  for (let i = 0; i < arquivos.length; i++) {
    toast(`Lendo folheto ${i + 1} de ${arquivos.length}…`);
    try {
      const r = await Folheto.importar(arquivos[i]);
      const antes = new Set(Object.keys(Euc.dados.textos));
      capturarEucaristia(r.eucaristia);
      const novos = Object.keys(Euc.dados.textos).filter(id => !antes.has(id)).map(nomeEuc);
      if (!r.eucaristia) semOracao.push(arquivos[i].name);
      achados.push(...novos);
    } catch (err) {
      semOracao.push(`${arquivos[i].name} (${err.message})`);
    }
  }
  renderEucaristia();
  renderRoteiroLista();
  const msg = achados.length ? `Guardados ${achados.length} texto(s):\n• ${achados.join('\n• ')}` : 'Nenhum texto novo: as orações desses folhetos já estavam no catálogo.';
  alert(msg + (semOracao.length ? `\n\nSem oração eucarística encontrada em:\n• ${semOracao.join('\n• ')}` : ''));
}

// ---------- Painel (centro) ----------

function mostrarEucaristia(sim) {
  S.modoEuc = !!sim;
  if (sim && S.modoCards) mostrarCards(false);
  $('.centro').classList.toggle('modo-euc', S.modoEuc);
  if (S.modoEuc) renderEucaristia();
}

function linhaEuc(item, tipo, sel) {
  const tem = temTexto(item.id);
  const regra = tipo === 'oe' ? ({ livre: 'prefácio à escolha', fixo: 'prefácio próprio', 'fixo-flex': 'próprio ou penitencial' }[item.pref]) : '';
  return `<div class="euc-it ${sel ? 'sel' : ''}" data-${tipo}="${item.id}" title="${esc(item.obs || '')}">
    <span class="euc-status ${tem ? 'ok' : ''}" title="${tem ? 'Texto cadastrado' : 'Texto ainda não cadastrado'}">${tem ? '✓' : '—'}</span>
    <span class="tit">${esc(item.nome)}</span>
    ${regra ? `<span class="tag">${regra}</span>` : ''}
    <button data-euc-editar="${item.id}" title="${tem ? 'Ver / editar o texto' : 'Colar o texto'}">✎</button>
  </div>`;
}

function renderEucaristia() {
  const el = $('#painelEucaristia');
  if (!S.modoEuc) return;
  const oes = listaOEs(), oe = oeDe(Euc.sel.oe) || oes[0];
  const permitidos = prefaciosPermitidos(oe);
  if (Euc.sel.pref && !permitidos.some(p => p.id === Euc.sel.pref)) Euc.sel.pref = null;
  if (!Euc.sel.pref && oe.pref !== 'livre') Euc.sel.pref = oe.proprio || null;
  const termo = semAcento(Euc.filtro);
  const filtrados = permitidos.filter(p => !termo || semAcento(`${p.nome} ${p.grupo}`).includes(termo));
  const sug = gruposSugeridos();
  const sugeridos = filtrados.filter(p => sug.grupos.includes(p.grupo));
  const grupos = [...new Set(filtrados.map(p => p.grupo))];
  const total = oes.length + listaPrefacios().length;
  const comTexto = [...oes, ...listaPrefacios()].filter(x => temTexto(x.id)).length;

  el.innerHTML = `
    <div class="euc-topo">
      <h2>Orações Eucarísticas e Prefácios</h2>
      <span class="sutil">${comTexto} de ${total} textos cadastrados · lista baseada no Missal Romano (confira com o Missal da paróquia)</span>
      <span class="espaco"></span>
      <button data-euc-folhetos title="Lê um ou vários folhetos em PDF e guarda só a oração eucarística e o prefácio (não cria roteiros)">📄 Ler orações de folhetos…</button>
    </div>
    <p class="sutil pequeno euc-ajuda">Os textos entram sozinhos quando um <b>folheto</b> traz a oração e o prefácio do dia. Os que faltarem (—), clique em ✎ e cole do Missal.
      No texto, linha em branco separa os slides e linha começando com <b>—</b> é resposta do povo.</p>
    <div class="euc-grade">
      <section class="euc-col">
        <div class="euc-tit">1. Oração Eucarística</div>
        <div class="euc-lista">${oes.map(o => linhaEuc(o, 'oe', o.id === oe.id)).join('')}</div>
        ${oe.obs ? `<p class="euc-nota">ℹ ${esc(oe.obs)}</p>` : ''}
      </section>
      <section class="euc-col">
        <div class="euc-tit">2. Prefácio <span class="sutil">(${permitidos.length} possível(is) com esta oração)</span></div>
        ${oe.pref === 'fixo' ? '' : `<input type="search" id="eucFiltro" placeholder="Buscar prefácio…" value="${esc(Euc.filtro)}">`}
        <div class="euc-lista">
          ${sugeridos.length && !termo ? `<div class="grupo-ord euc-sug">Sugeridos para ${esc(sug.titulo)}</div>${sugeridos.map(p => linhaEuc(p, 'pref', p.id === Euc.sel.pref)).join('')}` : ''}
          ${grupos.map(g => `<div class="grupo-ord">${esc(g)}</div>${filtrados.filter(p => p.grupo === g).map(p => linhaEuc(p, 'pref', p.id === Euc.sel.pref)).join('')}`).join('')}
        </div>
      </section>
    </div>
    <div class="euc-barra">
      <span>Selecionado: <b>${esc(oe.nome)}</b>${Euc.sel.pref ? ` + <b>${esc(nomeEuc(Euc.sel.pref))}</b>` : ' <span class="sutil">(escolha o prefácio)</span>'}</span>
      <span class="espaco"></span>
      <button data-euc-ver="pref" ${Euc.sel.pref ? '' : 'disabled'}>Ver prefácio</button>
      <button data-euc-ver="oe">Ver oração</button>
      <button data-euc-add class="primario">+ Adicionar ao roteiro</button>
    </div>`;
}

// Encaixa prefácio (depois do Diálogo do Prefácio) e oração (depois do Santo) numa lista de itens de roteiro.
// Se já houver itens do catálogo, só troca a escolha. Com o texto da oração cadastrado, tira o "Mistério da Fé"
// e a doxologia avulsos (o texto da oração já traz a aclamação e o "Por Cristo…").
function inserirEucaristia(itens, oeId, prefId) {
  const pos = achou => { const i = itens.findIndex(achou); return i >= 0 ? i + 1 : itens.length; };
  const iPref = itens.findIndex(i => i.tipo === 'prefacio'), iOE = itens.findIndex(i => i.tipo === 'eucaristica');
  if (prefId) {
    if (iPref >= 0) itens[iPref].prefId = prefId;
    else itens.splice(pos(i => i.tipo === 'ordinario' && i.parte === 'prefacio'), 0, { id: uid(), tipo: 'prefacio', prefId });
  }
  if (iOE >= 0) itens[iOE].oeId = oeId;
  else itens.splice(pos(i => (i.tipo === 'canto' && i.momento === 'Santo') || (i.tipo === 'ordinario' && i.parte === 'santo')), 0, { id: uid(), tipo: 'eucaristica', oeId });
  let removidos = 0;
  if (temTexto(oeId)) {
    for (let i = itens.length - 1; i >= 0; i--) {
      if (itens[i].tipo === 'ordinario' && ['misterio-fe', 'doxologia'].includes(itens[i].parte)) { itens.splice(i, 1); removidos++; }
    }
  }
  return { trocou: iOE >= 0, removidos };
}

function adicionarEucaristiaAoRoteiro() {
  const itens = S.roteiro.itens, oe = oeDe(Euc.sel.oe), pref = Euc.sel.pref;
  if (itens.some(i => i.tipo === 'texto' && /ora[cç][aã]o eucar[ií]stica/i.test(i.titulo || ''))
    && !confirm('Este roteiro já tem a Oração Eucarística do folheto. Adicionar esta também?')) return;
  const { trocou, removidos } = inserirEucaristia(itens, oe.id, pref);
  if (S.atual?.rIdx >= 0) S.atual.rIdx = itens.indexOf(S.atual.item);
  salvarRoteiro();
  renderRoteiroLista();
  toast(`${trocou ? 'Trocado' : 'Adicionado'} no roteiro: ${oe.nome}${pref ? ' + ' + nomeEuc(pref) : ''}.` +
    (removidos ? ' O "Mistério da Fé" avulso saiu, porque a oração já traz a aclamação.' : ''));
}

// ---------- Editor de texto ----------

function abrirEditorEuc(id) {
  Euc.editando = id;
  const reg = Euc.dados.textos[id];
  $('#eucTitulo').textContent = nomeEuc(id);
  $('#formTextoEuc').texto.value = reg?.texto || '';
  $('#eucOrigem').textContent = reg ? `Texto ${reg.origem === 'folheto' ? 'vindo de um folheto' : 'colado à mão'} em ${reg.data?.split('-').reverse().join('/') || '—'}.` : 'Ainda sem texto: cole aqui o texto do Missal (ou importe um folheto que traga esta oração).';
  $('#btnEucApagar').hidden = !reg;
  const dlg = $('#dlgTextoEuc');
  dlg.returnValue = '';
  dlg.showModal();
  $('#formTextoEuc').texto.focus();
}

function aposMudarEuc() {
  renderEucaristia();
  renderRoteiroLista();
  if (S.atual && ['prefacio', 'eucaristica'].includes(S.atual.item.tipo)) { atualizarSlides(); renderCabecalho(); }
}

function ligarEucaristia() {
  $('#btnAbrirEuc').addEventListener('click', () => mostrarEucaristia(true));
  const painel = $('#painelEucaristia');
  painel.addEventListener('click', e => {
    const ed = e.target.closest('[data-euc-editar]');
    if (ed) return abrirEditorEuc(ed.dataset.eucEditar);
    const o = e.target.closest('[data-oe]');
    if (o) { Euc.sel.oe = o.dataset.oe; Euc.sel.pref = null; return renderEucaristia(); }
    const p = e.target.closest('[data-pref]');
    if (p) { Euc.sel.pref = p.dataset.pref; return renderEucaristia(); }
    const ver = e.target.closest('[data-euc-ver]');
    if (ver) return abrirItem(ver.dataset.eucVer === 'pref' ? { tipo: 'prefacio', prefId: Euc.sel.pref } : { tipo: 'eucaristica', oeId: Euc.sel.oe });
    if (e.target.closest('[data-euc-add]')) adicionarEucaristiaAoRoteiro();
    if (e.target.closest('[data-euc-folhetos]')) $('#arqFolhetosEuc').click();
  });
  $('#arqFolhetosEuc').addEventListener('change', async e => {
    const arquivos = [...e.target.files];
    e.target.value = '';
    if (arquivos.length) await lerOracoesDeFolhetos(arquivos);
  });
  painel.addEventListener('input', e => {
    if (e.target.id !== 'eucFiltro') return;
    Euc.filtro = e.target.value;
    renderEucaristia();     // redesenha a lista e devolve o cursor para a busca
    const f = $('#eucFiltro'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
  });
  $('#formTextoEuc').addEventListener('submit', e => {
    if (e.submitter?.value !== 'salvar') return;
    const texto = $('#formTextoEuc').texto.value.replace(/\r/g, '').trim();
    if (texto) Euc.dados.textos[Euc.editando] = { texto, origem: 'manual', data: isoData(new Date()) };
    else delete Euc.dados.textos[Euc.editando];
    salvarEucaristia(); aposMudarEuc(); toast('Texto salvo.');
  });
  $('#btnEucApagar').addEventListener('click', () => {
    if (!confirm('Apagar o texto desta oração/prefácio?')) return;
    delete Euc.dados.textos[Euc.editando];
    salvarEucaristia(); $('#dlgTextoEuc').close(); aposMudarEuc();
  });
}

function opcoesEuc(tipo, sel) {
  if (tipo === 'oe') return listaOEs().map(o => `<option value="${o.id}" ${o.id === sel ? 'selected' : ''}>${temTexto(o.id) ? '✓ ' : '— '}${esc(o.nome)}</option>`).join('');
  const l = listaPrefacios();
  return [...new Set(l.map(p => p.grupo))].map(g => `<optgroup label="${esc(g)}">${l.filter(p => p.grupo === g)
    .map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${temTexto(p.id) ? '✓ ' : '— '}${esc(p.nome)}</option>`).join('')}</optgroup>`).join('');
}
