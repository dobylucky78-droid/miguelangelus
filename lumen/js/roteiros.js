'use strict';
/*
 * Módulo Roteiros (preparação): cards dos roteiros salvos no centro da tela.
 * Cada card mostra a cor do tempo litúrgico, o nome, data/hora e local (da Agenda ou preenchidos à mão).
 * Clicar num card abre o roteiro na coluna da direita (condução).
 * Usa $, $$, esc, S, Liturgia, Agenda, localDe, deIso, DIAS_CURTOS, resumoItem, trocarRoteiro… (em tempo de execução).
 */

const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Data de um texto como "27 de setembro de 2026" (nome dos folhetos) → "2026-09-27"
function dataDoTexto(t) {
  const m = semAcento(t || '').match(/(\d{1,2}) de ([a-z]+) de (\d{4})/);
  if (!m) return '';
  const mes = MESES_NOME.findIndex(x => semAcento(x) === m[2]);
  return mes < 0 ? '' : `${m[3]}-${String(mes + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// Celebração da Agenda ligada a um roteiro (se houver)
function ocorrenciaPorChave(chave) {
  if (!chave) return null;
  if (chave.startsWith('a|')) {
    const a = Agenda.dados.avulsos.find(x => x.id === chave.slice(2));
    return a ? ocorrencias(deIso(a.data)).find(o => o.chave === chave) : null;
  }
  const iso = chave.split('|')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? ocorrencias(deIso(iso)).find(o => o.chave === chave) || null : null;
}

// Data, hora e local de um roteiro: o que foi preenchido à mão tem prioridade sobre a Agenda
function infoRoteiro(r) {
  const oc = ocorrenciaPorChave(r.celebracao);
  // mesmo que a celebração tenha saído da Agenda, a chave guarda a data ("2026-09-27|…") e o nome guarda a hora
  const isoChave = /^\d{4}-\d{2}-\d{2}\|/.test(r.celebracao || '') ? r.celebracao.slice(0, 10) : '';
  const iso = r.data || oc?.iso || isoChave || dataDoTexto(r.nome);
  const horaNome = (r.nome.match(/\b([01]\d|2[0-3]):[0-5]\d\b/) || [''])[0];
  return { data: iso ? deIso(iso) : null, iso, hora: r.hora || oc?.hora || horaNome,
    localId: r.localId || oc?.localId || localPorTexto(r.nome), cancelada: !!oc?.cancelada };
}

function mostrarCards(sim) {
  if (sim && S.modoEuc) { S.modoEuc = false; $('.centro').classList.remove('modo-euc'); }
  S.modoCards = !!sim;
  $('.centro').classList.toggle('modo-cards', S.modoCards);
  if (S.modoCards) renderCardsRoteiros();
}

// Celebração e cor do card, em ordem de prioridade: cor escolhida à mão › o que veio do folheto/Paulus
// (só se o roteiro ainda está na data daquele folheto) › calendário litúrgico.
function liturgiaDoRoteiro(r, inf = infoRoteiro(r)) {
  const lit = inf.data ? Liturgia.info(inf.data) : null;
  const doFolheto = r.liturgiaDe && r.liturgiaDe === inf.iso;
  const titulo = (doFolheto && r.tituloLiturgico) || lit?.titulo || '';
  const cor = r.corManual || (doFolheto && r.cor) || lit?.cor || '';
  return { titulo, cor, corHex: Liturgia.CORES[cor] || '#5a606b' };
}

function htmlCard(r) {
  const inf = infoRoteiro(r);
  const lit = liturgiaDoRoteiro(r, inf);
  const loc = localDe(inf.localId);
  const pend = r.itens.filter(it => resumoItem(it).vazio).length;
  const quando = inf.data
    ? `${DIAS_CURTOS[inf.data.getDay()]}, ${String(inf.data.getDate()).padStart(2, '0')}/${String(inf.data.getMonth() + 1).padStart(2, '0')}/${inf.data.getFullYear()}${inf.hora ? ' · ' + inf.hora : ''}`
    : 'sem data';
  const textoFaixa = lit.cor === 'branco' ? '#2a2a2a' : '#fff';   // faixa branca (Páscoa, Natal…) pede texto escuro
  return `<div class="card-rot ${r === S.roteiro ? 'aberto' : ''}" data-id="${r.id}" style="--cor-lit:${lit.corHex};--cor-faixa-txt:${textoFaixa}">
    <div class="card-faixa">${esc(lit.titulo || 'Sem data definida')}</div>
    <div class="card-corpo">
      <div class="card-nome">${esc(r.nome)}</div>
      <div class="card-linha">📅 ${esc(quando)}${inf.cancelada ? ' <b class="card-cancelada">cancelada na agenda</b>' : ''}</div>
      <div class="card-linha">${loc ? `<span class="card-ponto" style="background:${loc.cor}"></span>${esc(loc.tipo)} ${esc(loc.nome)}` : '<span class="sutil">📍 local não definido</span>'}</div>
      ${r.responsavel ? `<div class="card-linha">👤 ${esc(r.responsavel)}</div>` : ''}
      <div class="card-rodape">
        <span>${r.itens.length} item(ns)</span>
        ${pend ? `<span class="card-pend">${pend} a preencher</span>` : r.itens.length ? '<span class="card-ok">pronto ✓</span>' : ''}
        ${r === S.roteiro ? '<span class="card-aberto">aberto →</span>' : ''}
      </div>
    </div>
  </div>`;
}

function renderCardsRoteiros() {
  if (!S.modoCards) return;
  const termo = semAcento($('#buscaRoteiro')?.value.trim() || '');
  const hoje = isoData(new Date());
  const todos = S.roteiros.filter(r => !termo || semAcento(r.nome).includes(termo)).map(r => ({ r, inf: infoRoteiro(r) }));
  // Filtro por comunidade (Matriz, capelas): cada computador lembra o seu ("" = todas; "-" = sem local definido)
  const capela = filtroCapela();
  const lista = todos.filter(x => !capela || (capela === '-' ? !localDe(x.inf.localId) : x.inf.localId === capela));
  const chips = htmlFiltroCapelas(todos, capela);
  const proximas = lista.filter(x => x.inf.iso && x.inf.iso >= hoje)
    .sort((a, b) => (a.inf.iso + a.inf.hora).localeCompare(b.inf.iso + b.inf.hora));
  const semData = lista.filter(x => !x.inf.iso).sort((a, b) => b.r.atualizado - a.r.atualizado);
  const anteriores = lista.filter(x => x.inf.iso && x.inf.iso < hoje)
    .sort((a, b) => (b.inf.iso + b.inf.hora).localeCompare(a.inf.iso + a.inf.hora));
  // Agrupa por dia: "Domingo, 27/09" com as celebrações daquele dia lado a lado; dias e seções recolhem (▸/▾).
  // Com busca digitada mostra tudo aberto.
  const fechado = (k, padrao) => !termo && Recolher.fechado(k, padrao);
  const seta = f => `<span class="seta">${f ? '▸' : '▾'}</span>`;
  const porDia = l => {
    const grupos = [];
    for (const x of l) {
      const g = grupos[grupos.length - 1];
      if (g && g.iso === x.inf.iso) g.itens.push(x); else grupos.push({ iso: x.inf.iso, itens: [x] });
    }
    return grupos.map(g => {
      const d = g.iso ? deIso(g.iso) : null;
      const tit = d ? `${DIAS[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : '';
      const f = tit && fechado('dia:' + g.iso, false);
      return `${tit ? `<button class="cards-dia" data-recolher="dia:${g.iso}">${seta(f)}${tit} <span class="sutil">· ${g.itens.length} roteiro(s)</span></button>` : ''}
        ${f ? '' : `<div class="cards-grade">${g.itens.map(x => htmlCard(x.r)).join('')}</div>`}`;
    }).join('');
  };
  // "Anteriores" começa recolhida
  const secao = (tit, l, padrao = false) => {
    if (!l.length) return '';
    const f = fechado('sec:' + tit, padrao);
    return `<button class="cards-sec" data-recolher="sec:${tit}" data-padrao="${padrao ? 1 : ''}">${seta(f)}${tit} <span class="sutil">(${l.length})</span></button>${f ? '' : porDia(l)}`;
  };
  $('#cardsRoteiros').innerHTML = `
    <div class="cards-topo"><h2>Roteiros</h2><span class="sutil">Clique num roteiro para abri-lo na coluna da direita.</span>
      <span class="espaco"></span>
      <button data-recolher-tudo="1" title="Recolher todos os dias">▸ Recolher tudo</button>
      <button data-recolher-tudo="0" title="Expandir todos os dias">▾ Expandir tudo</button></div>
    ${chips}
    <div class="cards-grade">
      <button class="card-novo" data-card-novo><span>＋</span>Novo roteiro</button>
      <button class="card-novo" data-card-folheto><span>📄</span>Do folheto (PDF, Word, TXT)</button>
      <button class="card-novo" data-card-agenda><span>📅</span>Pela Agenda</button>
    </div>
    ${secao('Próximas', proximas)}${secao('Sem data', semData)}${secao('Anteriores', anteriores, true)}
    ${!lista.length && (termo || capela) ? `<p class="vazio">Nenhum roteiro${capela ? ' desta comunidade' : ''} encontrado.</p>` : ''}`;
}

// ---------- filtro por comunidade nos cards ----------
function filtroCapela() {
  let f = '';
  try { f = localStorage.getItem('lumen.filtroCapela') || ''; } catch {}
  return f && f !== '-' && !localDe(f) ? '' : f;     // comunidade apagada: volta para "Todas"
}
function htmlFiltroCapelas(todos, sel) {
  const locais = [...Agenda.dados.locais].sort((a, b) => TIPOS_LOCAL.indexOf(a.tipo) - TIPOS_LOCAL.indexOf(b.tipo) || a.nome.localeCompare(b.nome, 'pt-BR'));
  if (locais.length < 2) return '';
  const conta = id => todos.filter(x => id === '-' ? !localDe(x.inf.localId) : x.inf.localId === id).length;
  const semLocal = conta('-');
  const chip = (id, nome, cor, n) => `<button class="capela-chip ${sel === id ? 'sel' : ''}" data-capela="${id}" ${cor ? `style="--cor-capela:${cor}"` : ''}>` +
    `${cor ? '<i></i>' : ''}${esc(nome)}<span class="n">${n}</span></button>`;
  return `<div class="capelas-filtro" title="Mostrar só os roteiros de uma comunidade (este computador lembra a escolha)">` +
    chip('', 'Todas', '', todos.length) +
    locais.map(l => chip(l.id, nomeCurtoLocal(l), l.cor, conta(l.id))).join('') +
    (semLocal ? chip('-', 'Sem local', '#888', semLocal) : '') + '</div>';
}

// Campos de preparação do roteiro aberto (coluna da esquerda)
function renderPreparacao() {
  if (!S.roteiro) return;
  const inf = infoRoteiro(S.roteiro);
  $('#nomeRoteiro').value = S.roteiro.nome;
  $('#dataRoteiro').value = S.roteiro.data || inf.iso || '';
  $('#horaRoteiro').value = S.roteiro.hora || inf.hora || '';
  $('#respRoteiro').value = S.roteiro.responsavel || '';
  $('#corRoteiro').value = S.roteiro.corManual || '';
  const auto = liturgiaDoRoteiro({ ...S.roteiro, corManual: '' }, inf);
  $('#corRoteiro').options[0].textContent = `Automática${auto.cor ? ` (${auto.cor})` : ''}`;
  $('#corRoteiro').title = auto.titulo;
  // cabeçalho da coluna da direita
  const loc = localDe(inf.localId);
  $('#roteiroAtualNome').textContent = S.roteiro.nome;
  $('#roteiroAtualInfo').innerHTML = [
    inf.data ? `${DIAS_CURTOS[inf.data.getDay()]} ${String(inf.data.getDate()).padStart(2, '0')}/${String(inf.data.getMonth() + 1).padStart(2, '0')}${inf.hora ? ' · ' + inf.hora : ''}` : '',
    loc ? `<span class="card-ponto" style="background:${loc.cor}"></span>${esc(loc.tipo)} ${esc(loc.sigla || loc.nome)}` : '',
    S.roteiro.responsavel ? `👤 ${esc(S.roteiro.responsavel)}` : '',
  ].filter(Boolean).join(' · ') || '<span class="sutil">sem data e local — preencha em 📋 Roteiros</span>';
}

function ligarRoteiros() {
  $('#buscaRoteiro').addEventListener('input', () => { if (!S.modoCards) mostrarCards(true); else renderCardsRoteiros(); });
  $('#cardsRoteiros').addEventListener('click', e => {
    if (e.target.closest('[data-card-novo]')) return $('#btnNovoRoteiro').click();
    if (e.target.closest('[data-card-folheto]')) return $('#arqFolheto').click();
    if (e.target.closest('[data-card-agenda]')) return abrirAgenda('calendario');
    const cap = e.target.closest('[data-capela]');
    if (cap) { try { localStorage.setItem('lumen.filtroCapela', cap.dataset.capela); } catch {} return renderCardsRoteiros(); }
    const rec = e.target.closest('[data-recolher]');
    if (rec) { Recolher.alternar(rec.dataset.recolher, !!rec.dataset.padrao); return renderCardsRoteiros(); }
    const tudo = e.target.closest('[data-recolher-tudo]');
    if (tudo) {
      const f = tudo.dataset.recolherTudo === '1';
      for (const r of S.roteiros) { const iso = infoRoteiro(r).iso; if (iso) Recolher.definir('dia:' + iso, f); }
      // recolher: só as datas (fica a lista de dias); "Anteriores" fecha inteira. Expandir: abre tudo.
      Recolher.definir('sec:Próximas', false); Recolher.definir('sec:Sem data', false); Recolher.definir('sec:Anteriores', f);
      return renderCardsRoteiros();
    }
    const card = e.target.closest('.card-rot');
    if (!card) return;
    const r = S.roteiros.find(x => x.id === card.dataset.id);
    if (r && r !== S.roteiro) trocarRoteiro(r);
  });
  $('#dataRoteiro').addEventListener('input', e => { S.roteiro.data = e.target.value; salvarRoteiro(); renderPreparacao(); renderCardsRoteiros(); });
  $('#respRoteiro').addEventListener('input', e => { S.roteiro.responsavel = e.target.value.trim(); salvarRoteiro(); renderPreparacao(); renderCardsRoteiros(); });
  $('#horaRoteiro').addEventListener('input', e => { S.roteiro.hora = e.target.value; salvarRoteiro(); renderPreparacao(); renderCardsRoteiros(); });
  $('#corRoteiro').addEventListener('change', e => { S.roteiro.corManual = e.target.value; salvarRoteiro(); renderPreparacao(); renderCardsRoteiros(); });
  $('#btnVerRoteiros').addEventListener('click', () => mostrarAba('roteiros'));
}
