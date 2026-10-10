'use strict';
/*
 * Agenda: paróquia + celebrações recorrentes + calendário do mês.
 *  - paroquia: dados da paróquia (nome, padroeiro, diocese, endereço…)
 *  - locais: matriz e capelas/comunidades ({ id, tipo, nome, sigla, endereco, cor })
 *  - regras: celebrações que se repetem (dia da semana, semana do mês, hora, tipo, local, descrição)
 *  - excecoes[chave]: mudanças num dia específico ({ cancelada, hora, descricao, localId })
 *  - avulsos: celebrações de um dia só (casamento, batizado, adoração extra…)
 *  - vinculos[chave] = id do roteiro daquela celebração
 * Chave de uma ocorrência: "AAAA-MM-DD|idDaRegra" (recorrente) ou "a|idDoAvulso" (avulsa).
 * Tudo fica num único registro { id: 'agenda' } no store "config" (entra no backup).
 * Usa $, $$, esc, uid, toast, S, DB, Liturgia, Ordinario, novoRoteiro, trocarRoteiro... de app.js (em tempo de execução).
 */

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const TIPOS_CELEBRACAO = ['Missa', 'Adoração', 'Celebração da Palavra', 'Terço', 'Batizado', 'Casamento', 'Confissões', 'Outro'];
const TIPOS_LOCAL = ['Matriz', 'Capela', 'Comunidade', 'Santuário', 'Outro'];
const SEMANAS = [['todas', 'Todas'], ['1', '1ª'], ['2', '2ª'], ['3', '3ª'], ['4', '4ª'], ['ultima', 'Última']];
const CORES_LOCAL = ['#d4a93a', '#4f95ec', '#57b36f', '#e0609a', '#b784e6', '#e67e3a', '#3ac2c2', '#c0c0c0'];
const CAMPOS_PAROQUIA = ['nome', 'padroeiro', 'diocese', 'siteFolhetos', 'endereco', 'telefone', 'contato', 'paroco'];

const Agenda = {
  dados: { paroquia: {}, locais: [], regras: [], excecoes: {}, avulsos: [], vinculos: {} },
  mes: null,              // Date no dia 1 do mês exibido
  filtroLocal: '',        // '' = todas as comunidades
  editandoRegra: null,    // id da regra carregada no formulário
  editandoLocal: null,    // id do local carregado no formulário
  evento: null,           // ocorrência aberta no diálogo de evento
};

const isoData = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const deIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dataCurta = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

async function carregarAgenda() {
  const reg = await DB.obter('config', 'agenda');
  if (reg?.valor) Object.assign(Agenda.dados, reg.valor);
  Agenda.dados.paroquia ||= {};
  Agenda.dados.locais ||= [];
  // antes da 1.6.2 os folhetos vinham sempre da Arquidiocese do Rio: quem já usava fica com ela preenchida
  const p = Agenda.dados.paroquia;
  if (p.siteFolhetos === undefined && reg?.valor) {
    p.siteFolhetos = 'https://arqrio.org.br/folhetos/';
    p.diocese ||= 'Arquidiocese de São Sebastião do Rio de Janeiro';
    salvarAgenda();
  }
}

let timerAgenda = 0;
function salvarAgenda() {
  clearTimeout(timerAgenda);
  timerAgenda = setTimeout(() => DB.salvar('config', { id: 'agenda', valor: Agenda.dados }), 200);
}

// ---------- Locais ----------

const localDe = id => Agenda.dados.locais.find(l => l.id === id) || null;
const nomeCurtoLocal = l => l ? [l.tipo !== 'Outro' ? l.tipo : '', l.sigla || l.nome].filter(Boolean).join(' ') : '';
// Texto exibido de uma celebração: a descrição, ou "Tipo + Local" (ex.: "Missa Matriz SJO")
const textoCelebracao = (tipo, descricao, localId) => descricao || [tipo, nomeCurtoLocal(localDe(localId))].filter(Boolean).join(' ');

function opcoesLocais(sel, rotuloVazio = '— sem local —') {
  const ordem = [...Agenda.dados.locais].sort((a, b) => TIPOS_LOCAL.indexOf(a.tipo) - TIPOS_LOCAL.indexOf(b.tipo) || a.nome.localeCompare(b.nome, 'pt-BR'));
  return `<option value="">${rotuloVazio}</option>` +
    ordem.map(l => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${esc(l.tipo)} ${esc(l.nome)}${l.sigla ? ` (${esc(l.sigla)})` : ''}</option>`).join('');
}

// ---------- Regras de repetição ----------

function casaSemana(semana, d) {
  if (!semana || semana === 'todas') return true;
  if (semana === 'ultima') return d.getDate() + 7 > new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.ceil(d.getDate() / 7) === +semana;
}

function descricaoRegra(r) {
  const sem = r.semana && r.semana !== 'todas' ? `${SEMANAS.find(s => s[0] === String(r.semana))?.[1]} ` : '';
  return `${sem}${DIAS[r.dia]} – ${r.hora}`;
}

// Local reconhecido pela descrição (celebrações cadastradas antes de existir o campo Local):
// "Missa Matriz SJO" → comunidade de sigla SJO; também vale o nome ("… Nossa Senhora de Fátima")
function localPorTexto(t) {
  const txt = semAcento(t || '');
  if (!txt) return '';
  const l = Agenda.dados.locais.find(l => l.sigla && new RegExp(`\\b${semAcento(l.sigla)}\\b`).test(txt))
    || Agenda.dados.locais.find(l => l.nome && txt.includes(semAcento(l.nome)));
  return l ? l.id : '';
}

// Celebrações de um dia (recorrentes + avulsas), em ordem de horário
function ocorrencias(d) {
  const iso = isoData(d), out = [];
  for (const r of Agenda.dados.regras) {
    if (r.ativa === false || r.dia !== d.getDay() || !casaSemana(r.semana, d)) continue;
    const chave = `${iso}|${r.id}`, ex = Agenda.dados.excecoes[chave] || {};
    const descricao = ex.descricao || r.descricao || '';
    const localId = ex.localId || r.localId || localPorTexto(descricao);
    out.push({ chave, iso, regraId: r.id, tipo: r.tipo, hora: ex.hora || r.hora, localId, descricao,
      texto: textoCelebracao(r.tipo, descricao, localId), cancelada: !!ex.cancelada,
      alterada: !!(ex.hora || ex.descricao || ex.localId !== undefined) });
  }
  for (const a of Agenda.dados.avulsos) {
    if (a.data !== iso) continue;
    out.push({ chave: 'a|' + a.id, iso, avulsoId: a.id, tipo: a.tipo, hora: a.hora, localId: a.localId || localPorTexto(a.descricao),
      descricao: a.descricao || '', texto: textoCelebracao(a.tipo, a.descricao, a.localId), avulsa: true });
  }
  return out.sort((a, b) => a.hora.localeCompare(b.hora));
}

// ---------- Aba Paróquia ----------

function renderParoquia() {
  const p = Agenda.dados.paroquia;
  for (const c of CAMPOS_PAROQUIA) { const el = $(`[data-par="${c}"]`); if (el && document.activeElement !== el) el.value = p[c] || ''; }
  const locais = [...Agenda.dados.locais].sort((a, b) => TIPOS_LOCAL.indexOf(a.tipo) - TIPOS_LOCAL.indexOf(b.tipo) || a.nome.localeCompare(b.nome, 'pt-BR'));
  $('#parLocais').innerHTML = locais.length ? locais.map(l => {
    const usos = Agenda.dados.regras.filter(r => r.localId === l.id).length;
    return `<div class="par-local ${Agenda.editandoLocal === l.id ? 'editando' : ''}" data-id="${l.id}">
      <span class="par-cor" style="background:${l.cor}"></span>
      <div class="par-local-txt">
        <div><b>${esc(l.tipo)} ${esc(l.nome)}</b>${l.sigla ? ` <span class="sutil">(${esc(l.sigla)})</span>` : ''}</div>
        <div class="sutil pequeno">${esc(l.endereco || 'sem endereço')} · ${usos} celebração(ões) na semana${l.padroeiro ? ` · padroeiro(a): ${esc(l.padroeiro.nome)} (${l.padroeiro.dia.split('-').reverse().join('/')})` : ''}</div>
      </div>
      <button data-par-layout title="Apresentação desta comunidade (imagens nos cantos)" ${l.layout && Object.keys(l.layout).length ? 'class="on"' : ''}>🖼</button>
      <button data-par-editar title="Editar">✎</button>
      <button data-par-excluir class="perigo" title="Excluir">✕</button>
    </div>`;
  }).join('') : '<p class="vazio">Cadastre a matriz e as capelas. Exemplo: Matriz · "São José Operário" · sigla SJO.</p>';
}

function limparFormLocal() {
  Agenda.editandoLocal = null;
  for (const id of ['parLocNome', 'parLocSigla', 'parLocEndereco', 'parLocPadroeiro', 'parLocPadDia']) $('#' + id).value = '';
  $('#parLocPadCor').value = 'branco';
  $('#parLocTipo').value = Agenda.dados.locais.some(l => l.tipo === 'Matriz') ? 'Capela' : 'Matriz';
  $('#parLocCor').value = CORES_LOCAL[Agenda.dados.locais.length % CORES_LOCAL.length];
  $('#btnParLocal').textContent = 'Adicionar';
  $('#btnParLocalCancelar').hidden = true;
  renderParoquia();
}

function salvarLocalDoForm() {
  const nome = $('#parLocNome').value.trim();
  if (!nome) { toast('Escreva o nome (ex.: Nossa Senhora de Fátima).'); $('#parLocNome').focus(); return; }
  // padroeiro: nome + dia (dd/mm) → { nome, dia: 'MM-DD', cor } — no dia, os roteiros desta comunidade ficam Solenidade
  const padNome = $('#parLocPadroeiro').value.trim(), padDia = $('#parLocPadDia').value.trim();
  const md = /^(\d{1,2})\/(\d{1,2})$/.exec(padDia);
  if (padNome && (!md || +md[1] < 1 || +md[1] > 31 || +md[2] < 1 || +md[2] > 12)) { toast('Dia do padroeiro: use dd/mm (ex.: 01/05).'); $('#parLocPadDia').focus(); return; }
  const padroeiro = padNome ? { nome: padNome, dia: `${md[2].padStart(2, '0')}-${md[1].padStart(2, '0')}`, cor: $('#parLocPadCor').value } : null;
  const l = { tipo: $('#parLocTipo').value, nome, sigla: $('#parLocSigla').value.trim().toUpperCase(),
    endereco: $('#parLocEndereco').value.trim(), cor: $('#parLocCor').value, padroeiro };
  if (Agenda.editandoLocal) Object.assign(localDe(Agenda.editandoLocal), l);
  else Agenda.dados.locais.push({ id: uid(), ...l });
  salvarAgenda();
  toast(Agenda.editandoLocal ? 'Comunidade alterada.' : 'Comunidade adicionada.');
  limparFormLocal();
  atualizarSelectsLocal();
  renderCelebracoes();
  renderCalendario();
}

function atualizarSelectsLocal() {
  $('#agLocal').innerHTML = opcoesLocais($('#agLocal').value);
  $('#calFiltroLocal').innerHTML = opcoesLocais(Agenda.filtroLocal, 'Todas as comunidades');
  renderLocalRoteiro();
}

// ---------- Aba Celebrações ----------

function renderCelebracoes() {
  const l = [...Agenda.dados.regras].sort((a, b) =>
    a.dia - b.dia || String(a.semana).localeCompare(String(b.semana)) || a.hora.localeCompare(b.hora));
  $('#agLista').innerHTML = l.length ? l.map(r => {
    const loc = localDe(r.localId);
    return `<div class="ag-regra ${r.ativa === false ? 'inativa' : ''} ${Agenda.editandoRegra === r.id ? 'editando' : ''}" data-id="${r.id}">
      <label class="check" title="Ativa"><input type="checkbox" data-ag-ativa ${r.ativa === false ? '' : 'checked'}></label>
      <span class="ag-regra-txt">${esc(descricaoRegra(r))} <b>(${esc(textoCelebracao(r.tipo, r.descricao, r.localId))})</b></span>
      ${loc ? `<span class="pilula-local" style="--cor-local:${loc.cor}" title="${esc(loc.endereco || '')}">${esc(loc.tipo)} ${esc(loc.nome)}</span>` : ''}
      <span class="tag t-cel-${classeTipo(r.tipo)}">${esc(r.tipo)}</span>
      <button data-ag-editar title="Editar">✎</button>
      <button data-ag-excluir class="perigo" title="Excluir">✕</button>
    </div>`;
  }).join('')
    : '<p class="vazio">Nenhuma celebração cadastrada. Preencha acima e clique em <b>Adicionar</b>. Exemplo: Domingo · 07:00 · Missa · Matriz.</p>';
  atualizarDicaDescricao();
}

const classeTipo = t => ({ 'Missa': 'missa', 'Adoração': 'adoracao', 'Terço': 'terco' }[t] || 'outro');

function atualizarDicaDescricao() {
  const auto = textoCelebracao($('#agTipo').value, '', $('#agLocal').value);
  $('#agDescricao').placeholder = $('#agLocal').value ? `Automático: ${auto}` : 'Ex.: Missa Matriz';
}

function limparFormRegra() {
  Agenda.editandoRegra = null;
  $('#agDescricao').value = '';
  $('#btnAgAdicionar').textContent = 'Adicionar';
  $('#btnAgCancelarEdicao').hidden = true;
  renderCelebracoes();
}

function salvarRegraDoForm() {
  const descricao = $('#agDescricao').value.trim(), localId = $('#agLocal').value;
  if (!descricao && !localId) { toast('Escolha o local ou escreva a descrição.'); $('#agLocal').focus(); return; }
  const r = { dia: +$('#agDia').value, semana: $('#agSemana').value, hora: $('#agHora').value || '19:00',
    tipo: $('#agTipo').value, localId, descricao, ativa: true };
  if (Agenda.editandoRegra) Object.assign(Agenda.dados.regras.find(x => x.id === Agenda.editandoRegra), r);
  else Agenda.dados.regras.push({ id: uid(), ...r });
  salvarAgenda();
  toast(Agenda.editandoRegra ? 'Celebração alterada.' : 'Celebração adicionada.');
  limparFormRegra();
  renderParoquia();
  renderCalendario();
}

// ---------- Aba Calendário ----------

function renderCalendario() {
  if (!Agenda.mes) { const h = new Date(); Agenda.mes = new Date(h.getFullYear(), h.getMonth(), 1); }
  const m = Agenda.mes, hoje = isoData(new Date());
  $('#calTitulo').textContent = `${MESES[m.getMonth()]} / ${m.getFullYear()}`;
  const inicio = new Date(m.getFullYear(), m.getMonth(), 1 - m.getDay());
  const cab = DIAS_CURTOS.map(d => `<div class="cal-cab">${d}</div>`).join('');
  let celulas = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    const iso = isoData(d), lit = Liturgia.info(d);
    const evs = ocorrencias(d).filter(o => !Agenda.filtroLocal || o.localId === Agenda.filtroLocal).map(o => {
      const loc = localDe(o.localId);
      const rot = !!roteiroDaCelebracao(o);
      const dica = [o.tipo + (o.avulsa ? ' (avulsa)' : ''), loc ? `${loc.tipo} ${loc.nome}${loc.endereco ? ' — ' + loc.endereco : ''}` : '',
        o.alterada ? 'alterada neste dia' : '', o.cancelada ? 'CANCELADA neste dia' : ''].filter(Boolean).join('\n');
      return `<div class="ev ${o.cancelada ? 'cancelada' : ''} ${o.alterada ? 'alterada' : ''} ${o.avulsa ? 'avulsa' : ''}"
          style="--cor-cel:${loc?.cor || '#7f8793'}" data-chave="${esc(o.chave)}" data-iso="${iso}" title="${esc(dica)}">
        <span class="ev-txt" data-ev-editar>${esc(o.hora)} ${esc(o.texto)}</span>
        <button class="ev-rot ${rot ? 'on' : ''}" data-ev-roteiro title="${rot ? 'Abrir o roteiro desta celebração' : 'Criar o roteiro desta celebração'}" ${o.cancelada ? 'disabled' : ''}>📋</button>
        <button class="ev-mais" data-ev-editar title="Editar neste dia">⋮</button>
      </div>`;
    }).join('');
    celulas += `<div class="cal-dia ${d.getMonth() !== m.getMonth() ? 'fora' : ''} ${iso === hoje ? 'hoje' : ''}" data-iso="${iso}">
      <div class="cal-dia-topo">
        <span class="cal-num">${d.getDate()}</span>
        <span class="cor-lit" style="background:${lit.corHex}" title="${esc(lit.titulo)} · cor ${esc(lit.cor)}"></span>
        <span class="espaco"></span>
        <button class="cal-mais" data-cal-add title="Adicionar celebração neste dia">+</button>
      </div>
      <div class="cal-evs">${evs}</div>
    </div>`;
  }
  $('#calGrade').innerHTML = cab + celulas;
}

// ---------- Diálogo de um evento (editar / cancelar neste dia / avulso) ----------

function abrirEvento(ocorrencia, isoNovo) {
  const f = $('#formEvento');
  Agenda.evento = ocorrencia || null;
  const novo = !ocorrencia;
  const d = deIso(ocorrencia?.iso || isoNovo);
  const regra = ocorrencia?.regraId ? Agenda.dados.regras.find(r => r.id === ocorrencia.regraId) : null;
  const avulso = ocorrencia?.avulsoId ? Agenda.dados.avulsos.find(a => a.id === ocorrencia.avulsoId) : null;

  $('#evTitulo').textContent = novo ? `Nova celebração — ${DIAS[d.getDay()]}, ${dataCurta(d)}` : `${DIAS[d.getDay()]}, ${dataCurta(d)}`;
  f.data.value = isoData(d);
  f.data.disabled = !!regra;                     // recorrente: só muda neste dia
  f.hora.value = ocorrencia?.hora || '19:00';
  f.tipo.innerHTML = TIPOS_CELEBRACAO.map(t => `<option>${t}</option>`).join('');
  f.tipo.value = ocorrencia?.tipo || 'Missa';
  f.tipo.disabled = !!regra;
  f.local.innerHTML = opcoesLocais(ocorrencia ? ocorrencia.localId : (Agenda.filtroLocal || ''));
  f.descricao.value = ocorrencia?.descricao || '';
  $('#evInfo').textContent = regra
    ? `Celebração recorrente (${descricaoRegra(regra)}). As mudanças valem só para este dia.`
    : avulso ? 'Celebração avulsa (só neste dia).' : 'Celebração avulsa: acontece só neste dia.';
  $('#btnEvCancelarDia').hidden = !regra;
  $('#btnEvCancelarDia').textContent = ocorrencia?.cancelada ? 'Restaurar neste dia' : 'Cancelar neste dia';
  $('#btnEvRestaurar').hidden = !(regra && ocorrencia?.alterada);
  $('#btnEvExcluir').hidden = !avulso;
  atualizarDicaEvento();
  const dlg = $('#dlgEvento');
  dlg.returnValue = '';
  dlg.showModal();
  f.descricao.focus();
}

function atualizarDicaEvento() {
  const f = $('#formEvento');
  f.descricao.placeholder = f.local.value ? `Automático: ${textoCelebracao(f.tipo.value, '', f.local.value)}` : 'Ex.: Missa de 7º dia, Casamento de Ana e João…';
}

function salvarEvento() {
  const f = $('#formEvento'), o = Agenda.evento;
  const hora = f.hora.value || '19:00', descricao = f.descricao.value.trim(), localId = f.local.value;
  if (!descricao && !localId) return toast('Escolha o local ou escreva a descrição.');
  if (o?.regraId) {
    const r = Agenda.dados.regras.find(x => x.id === o.regraId);
    const ex = { ...(Agenda.dados.excecoes[o.chave] || {}) };
    ex.hora = hora !== r.hora ? hora : undefined;
    ex.descricao = descricao && descricao !== (r.descricao || '') ? descricao : undefined;
    ex.localId = localId !== (r.localId || '') ? localId : undefined;
    guardarExcecao(o.chave, ex);
  } else if (o?.avulsoId) {
    Object.assign(Agenda.dados.avulsos.find(a => a.id === o.avulsoId), { data: f.data.value, hora, tipo: f.tipo.value, localId, descricao });
  } else {
    Agenda.dados.avulsos.push({ id: uid(), data: f.data.value, hora, tipo: f.tipo.value, localId, descricao });
  }
  salvarAgenda();
  renderCalendario();
}

function guardarExcecao(chave, ex) {
  Object.keys(ex).forEach(k => ex[k] === undefined && delete ex[k]);
  if (Object.keys(ex).length) Agenda.dados.excecoes[chave] = ex;
  else delete Agenda.dados.excecoes[chave];
}

// ---------- Roteiro da celebração ----------

// O quanto um roteiro já foi trabalhado: cantos escolhidos, depois itens, depois o mais recente
const pesoRoteiro = r => [(r.itens || []).filter(i => i.tipo === 'canto' && i.cantoId).length, (r.itens || []).length, r.atualizado || 0];
function melhorRoteiro(lista) {
  return [...lista].sort((a, b) => {
    const pa = pesoRoteiro(a), pb = pesoRoteiro(b);
    for (let i = 0; i < pa.length; i++) if (pa[i] !== pb[i]) return pb[i] - pa[i];
    return a.id < b.id ? -1 : 1;                 // empate: o de menor id (todos os computadores escolhem o mesmo)
  })[0];
}

// O roteiro de uma celebração: pelo vínculo da Agenda ou, se o vínculo se perdeu (a Agenda de outro computador
// sobrescreveu a lista de vínculos na nuvem), pela celebração gravada no próprio roteiro. Sem isso, o programa
// "esquecia" o roteiro e criava outro igual ao importar o folheto.
function roteiroDaCelebracao(o) {
  const v = S.roteiros.find(x => x.id === Agenda.dados.vinculos[o.chave]);
  if (v) return v;
  const doMesmo = S.roteiros.filter(x => x.celebracao === o.chave);
  if (!doMesmo.length) return null;
  const r = melhorRoteiro(doMesmo);
  Agenda.dados.vinculos[o.chave] = r.id;         // refaz o vínculo
  salvarAgenda();
  return r;
}

// Roteiros repetidos: mais de um roteiro para a mesma celebração da Agenda
function roteirosRepetidos() {
  const grupos = new Map();
  for (const r of S.roteiros) if (r.celebracao) (grupos.get(r.celebracao) || grupos.set(r.celebracao, []).get(r.celebracao)).push(r);
  return [...grupos.values()].filter(g => g.length > 1).map(g => {
    const fica = melhorRoteiro(g);
    return { fica, saem: g.filter(r => r !== fica) };
  });
}

// Fica o mais trabalhado de cada celebração; as cópias são apagadas aqui e na nuvem (senão voltavam)
async function juntarRoteirosRepetidos(grupos = roteirosRepetidos()) {
  let n = 0;
  for (const { fica, saem } of grupos) {
    Agenda.dados.vinculos[fica.celebracao] = fica.id;
    for (const r of saem) {
      await DB.remover('roteiros', r.id);
      if (typeof Sync !== 'undefined' && typeof ligadaSync === 'function' && ligadaSync() &&
          !Sync.estado.removidos.some(x => x.store === 'roteiros' && x.id === r.id)) {
        Sync.estado.removidos.push({ store: 'roteiros', id: r.id, quando: Date.now() });
        Sync.sujo = true;
      }
      if (S.roteiro === r) S.roteiro = fica;
      n++;
    }
  }
  if (!n) return 0;
  const sair = new Set(grupos.flatMap(g => g.saem));
  S.roteiros = S.roteiros.filter(r => !sair.has(r));
  if (typeof salvarEstadoSync === 'function') salvarEstadoSync();
  salvarAgenda();
  trocarRoteiro(S.roteiro);
  return n;
}

// Mostra os repetidos e pergunta antes de apagar (roteiro é trabalho de alguém)
let avisouRepetidos = false;
async function oferecerJuntarRoteiros(pedido) {
  const grupos = roteirosRepetidos();
  if (!grupos.length) { if (pedido) toast('Nenhum roteiro repetido.'); return; }
  if (!pedido && avisouRepetidos) return;      // já disse "não" nesta sessão: só pelo menu
  const resumo = r => `${(r.itens || []).filter(i => i.tipo === 'canto' && i.cantoId).length} cantos, ${(r.itens || []).length} itens`;
  const linhas = grupos.slice(0, 12).map(g => `• ${g.fica.nome}\n   fica: ${resumo(g.fica)} · sai(em): ${g.saem.map(resumo).join(' / ')}`);
  const nSaem = grupos.reduce((s, g) => s + g.saem.length, 0);
  if (!confirm(`Há ${grupos.length} celebração(ões) com mais de um roteiro (cópias criadas em outro computador).\n\n` +
    linhas.join('\n') + (grupos.length > 12 ? `\n… e mais ${grupos.length - 12}` : '') +
    `\n\nJuntar? Fica o roteiro com mais cantos escolhidos de cada uma; ${nSaem} cópia(s) serão apagadas aqui e na nuvem.\n` +
    '(Também em Ferramentas → Juntar roteiros repetidos.)')) { avisouRepetidos = true; return; }
  const n = await juntarRoteirosRepetidos(grupos);
  toast(`${n} roteiro(s) repetido(s) apagado(s).`);
}

// Cria o roteiro de uma celebração (ligado a ela na Agenda). Sem `itens`, usa o modelo de Missa.
async function criarRoteiroDaCelebracao(o, itens) {
  const d = deIso(o.iso);
  const r = novoRoteiro(`${DIAS_CURTOS[d.getDay()]} ${dataCurta(d)} ${o.hora} — ${o.texto}`);
  if (itens) r.itens = itens.map(x => ({ ...structuredClone(x), id: uid() }));
  else {
    // Missa: modelo dominical aos domingos, semanal nos outros dias; outras celebrações começam vazias
    const modelo = o.tipo === 'Missa' ? (d.getDay() === 0 ? 'dominical' : 'semanal') : null;
    r.itens = modelo ? Ordinario.modelos[modelo].map(x => ({ id: uid(), ...structuredClone(x) })) : [];
  }
  if (o.tipo === 'Missa' && typeof comAvisos === 'function') r.itens = comAvisos(r.itens);   // item Avisos antes da bênção
  r.celebracao = o.chave;
  r.data = o.iso;
  r.hora = o.hora;
  r.localId = o.localId || '';            // define a apresentação (imagens nos cantos) no telão
  S.roteiros.push(r);
  await DB.salvar('roteiros', r);
  Agenda.dados.vinculos[o.chave] = r.id;
  salvarAgenda();
  return r;
}

async function abrirRoteiroDaCelebracao(o) {
  let r = roteiroDaCelebracao(o);
  if (!r) { r = await criarRoteiroDaCelebracao(o); toast(`Roteiro criado: ${r.nome}`); }
  else toast(`Roteiro aberto: ${r.nome}`);
  trocarRoteiro(r);
  $('#dlgAgenda').close();
}

// ---------- Abertura e eventos ----------

function abrirAgenda(aba) {
  // Sem nenhuma comunidade cadastrada, começa pela Paróquia
  mostrarAbaAgenda(aba || (Agenda.dados.locais.length ? 'calendario' : 'paroquia'));
  atualizarSelectsLocal();
  renderParoquia();
  renderCelebracoes();
  renderCalendario();
  const dlg = $('#dlgAgenda');
  if (!dlg.open) dlg.showModal();
}

function mostrarAbaAgenda(aba) {
  $$('.agenda-abas button').forEach(b => b.classList.toggle('ativa', b.dataset.ag === aba));
  $$('.ag-sec').forEach(s => s.classList.toggle('ativa', s.id === 'ag-' + aba));
}

function acharOcorrencia(el) {
  const ev = el.closest('.ev');
  return ev ? ocorrencias(deIso(ev.dataset.iso)).find(o => o.chave === ev.dataset.chave) : null;
}

function ligarAgenda() {
  $('#agDia').innerHTML = DIAS.map((d, i) => `<option value="${i}">${d}</option>`).join('');
  $('#agSemana').innerHTML = SEMANAS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  $('#agTipo').innerHTML = TIPOS_CELEBRACAO.map(t => `<option>${t}</option>`).join('');
  $('#parLocTipo').innerHTML = TIPOS_LOCAL.map(t => `<option>${t}</option>`).join('');

  $$('.agenda-abas button').forEach(b => b.addEventListener('click', () => mostrarAbaAgenda(b.dataset.ag)));
  $('#btnFecharAgenda').addEventListener('click', () => $('#dlgAgenda').close());
  $('#btnAgenda').addEventListener('click', () => abrirAgenda());

  // Paróquia
  for (const c of CAMPOS_PAROQUIA) {
    $(`[data-par="${c}"]`).addEventListener('input', e => { Agenda.dados.paroquia[c] = e.target.value.trim(); salvarAgenda(); });
  }
  $('#btnParLocal').addEventListener('click', salvarLocalDoForm);
  $('#btnLayoutParoquia').addEventListener('click', () => abrirEditorLayout({}));
  // ao fechar o editor de apresentação, atualiza os 🖼 da lista
  $('#dlgLayout').addEventListener('close', renderParoquia);
  $('#btnParLocalCancelar').addEventListener('click', limparFormLocal);
  for (const id of ['parLocNome', 'parLocSigla', 'parLocEndereco', 'parLocPadroeiro', 'parLocPadDia']) {
    $('#' + id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); salvarLocalDoForm(); } });
  }
  $('#parLocais').addEventListener('click', e => {
    const row = e.target.closest('.par-local');
    if (!row) return;
    const l = localDe(row.dataset.id);
    if (e.target.closest('[data-par-layout]')) return abrirEditorLayout({ localId: l.id });
    if (e.target.closest('[data-par-excluir]')) {
      const usos = Agenda.dados.regras.filter(r => r.localId === l.id).length;
      if (!confirm(`Excluir "${l.tipo} ${l.nome}"?${usos ? `\n${usos} celebração(ões) usam este local e ficarão sem local.` : ''}`)) return;
      Agenda.dados.locais = Agenda.dados.locais.filter(x => x !== l);
      for (const r of Agenda.dados.regras) if (r.localId === l.id) r.localId = '';
      for (const a of Agenda.dados.avulsos) if (a.localId === l.id) a.localId = '';
      if (Agenda.filtroLocal === l.id) Agenda.filtroLocal = '';
      salvarAgenda(); limparFormLocal(); atualizarSelectsLocal(); renderCelebracoes(); renderCalendario();
    } else if (e.target.closest('[data-par-editar]')) {
      Agenda.editandoLocal = l.id;
      $('#parLocTipo').value = l.tipo; $('#parLocNome').value = l.nome; $('#parLocSigla').value = l.sigla || '';
      $('#parLocEndereco').value = l.endereco || ''; $('#parLocCor').value = l.cor || CORES_LOCAL[0];
      $('#parLocPadroeiro').value = l.padroeiro?.nome || '';
      $('#parLocPadDia').value = l.padroeiro?.dia ? l.padroeiro.dia.split('-').reverse().join('/') : '';
      $('#parLocPadCor').value = l.padroeiro?.cor || 'branco';
      $('#btnParLocal').textContent = 'Salvar alteração';
      $('#btnParLocalCancelar').hidden = false;
      renderParoquia();
      $('#parLocNome').focus();
    }
  });

  // Celebrações
  $('#btnAgAdicionar').addEventListener('click', salvarRegraDoForm);
  $('#agDescricao').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); salvarRegraDoForm(); } });
  $('#agTipo').addEventListener('change', atualizarDicaDescricao);
  $('#agLocal').addEventListener('change', atualizarDicaDescricao);
  $('#btnAgCancelarEdicao').addEventListener('click', limparFormRegra);
  $('#agLista').addEventListener('click', e => {
    const row = e.target.closest('.ag-regra');
    if (!row) return;
    const r = Agenda.dados.regras.find(x => x.id === row.dataset.id);
    if (e.target.closest('[data-ag-excluir]')) {
      if (!confirm(`Excluir "${descricaoRegra(r)} (${textoCelebracao(r.tipo, r.descricao, r.localId)})"?\nEla sai de todos os dias do calendário.`)) return;
      Agenda.dados.regras = Agenda.dados.regras.filter(x => x !== r);
      for (const k of Object.keys(Agenda.dados.excecoes)) if (k.endsWith('|' + r.id)) delete Agenda.dados.excecoes[k];
      salvarAgenda(); renderCelebracoes(); renderParoquia(); renderCalendario();
    } else if (e.target.closest('[data-ag-editar]')) {
      Agenda.editandoRegra = r.id;
      $('#agDia').value = r.dia; $('#agSemana').value = r.semana || 'todas'; $('#agHora').value = r.hora;
      $('#agTipo').value = r.tipo; $('#agLocal').value = r.localId || ''; $('#agDescricao').value = r.descricao || '';
      $('#btnAgAdicionar').textContent = 'Salvar alteração';
      $('#btnAgCancelarEdicao').hidden = false;
      renderCelebracoes();
      $('#agDescricao').focus();
    }
  });
  $('#agLista').addEventListener('change', e => {
    if (!e.target.matches('[data-ag-ativa]')) return;
    const r = Agenda.dados.regras.find(x => x.id === e.target.closest('.ag-regra').dataset.id);
    r.ativa = e.target.checked;
    salvarAgenda(); renderCelebracoes(); renderCalendario();
  });

  // Calendário
  const mudarMes = n => { Agenda.mes = new Date(Agenda.mes.getFullYear(), Agenda.mes.getMonth() + n, 1); renderCalendario(); };
  $('#calAnt').addEventListener('click', () => mudarMes(-1));
  $('#calProx').addEventListener('click', () => mudarMes(1));
  $('#calHoje').addEventListener('click', () => { Agenda.mes = null; renderCalendario(); });
  $('#calFiltroLocal').addEventListener('change', e => { Agenda.filtroLocal = e.target.value; renderCalendario(); });
  $('#calGrade').addEventListener('click', e => {
    if (e.target.closest('[data-cal-add]')) return abrirEvento(null, e.target.closest('.cal-dia').dataset.iso);
    const o = acharOcorrencia(e.target);
    if (!o) return;
    if (e.target.closest('[data-ev-roteiro]')) abrirRoteiroDaCelebracao(o);
    else if (e.target.closest('[data-ev-editar]')) abrirEvento(o);
  });

  // Diálogo do evento (salva no envio do formulário)
  $('#formEvento').addEventListener('submit', e => { if (e.submitter?.value === 'salvar') salvarEvento(); });
  $('#formEvento').local.addEventListener('change', atualizarDicaEvento);
  $('#formEvento').tipo.addEventListener('change', atualizarDicaEvento);
  $('#btnEvCancelarDia').addEventListener('click', () => {
    const o = Agenda.evento;
    guardarExcecao(o.chave, { ...(Agenda.dados.excecoes[o.chave] || {}), cancelada: o.cancelada ? undefined : true });
    salvarAgenda(); renderCalendario(); $('#dlgEvento').close();
  });
  $('#btnEvRestaurar').addEventListener('click', () => {
    const o = Agenda.evento;
    guardarExcecao(o.chave, { cancelada: Agenda.dados.excecoes[o.chave]?.cancelada });
    salvarAgenda(); renderCalendario(); $('#dlgEvento').close();
  });
  $('#btnEvExcluir').addEventListener('click', () => {
    const o = Agenda.evento;
    if (!confirm('Excluir esta celebração avulsa?')) return;
    Agenda.dados.avulsos = Agenda.dados.avulsos.filter(a => a.id !== o.avulsoId);
    delete Agenda.dados.vinculos[o.chave];
    salvarAgenda(); renderCalendario(); $('#dlgEvento').close();
  });

  limparFormLocal();
}
