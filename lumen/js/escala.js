'use strict';
/* (Secretaria 1.6.0) 📋 Escalas — só na Secretaria, só impressas.
 *
 * Como a paróquia do Luciano faz (23/11/2026):
 *  - as equipes (coordenação de liturgia, ministros, liturgia, cantores, projeção…) servem nas Missas que frequentam;
 *  - há pessoas "avulsas", que servem em qualquer Missa quando falta alguém;
 *  - coroinhas e acólitos vão por rodízio — mas "é uma bagunça": o rodízio só SUGERE, e tudo se muda à mão.
 * E o usuário pediu (23/11): a agenda das equipes se programa igual às celebrações — cada equipe tem as suas Missas
 * da Agenda, toda semana ou só na 1ª, 2ª, 3ª, 4ª ou última semana do mês.
 *
 * Registros (store config, prefixo 'secv-', pasta "secretaria/" da nuvem: só entre as Secretarias, nunca no MiguelAngelus):
 *  - secv-cfg            { funcoes: [{ id, nome, vagas, modo: 'equipe' | 'rodizio' }] }
 *  - secv-p-<id>         pessoa { nome, contato, localId, funcoes: [ids], avulso, obs }
 *  - secv-e-<id>         equipe { nome, funcao, membros: 'Ana, Bruno', programacao: [{ regraId, semana }] }
 *                        regraId = celebração recorrente da Agenda (dia, hora e igreja vêm dela); semana como nas celebrações
 *  - secv-m-AAAA-MM      escala do mês { celas: { 'chave da celebração|funcao': 'Equipe Azul' ou 'Ana, Bruno' } }
 *    Cela sem nada gravado = vale a equipe programada. "—" = ninguém. Na cela pode ir o nome de uma equipe ou de pessoas.
 * Usa lerItensSec, gravarItemSec, apagarItemSec, imprimirFolhaSec, ocorrencias, ehMissa, casaSemana, SEMANAS, Agenda,
 * descricaoRegra, textoCelebracao, localDe, nomeCurtoLocal, nomeIgreja, opcoesLocais, DIAS, dataBR, deIso, isoData,
 * semAcento, esc, uid, toast, $ e $$.
 */

const FUNCOES_PADRAO = [
  { id: 'coordenacao', nome: 'Coordenação de liturgia', vagas: 1, modo: 'equipe' },
  { id: 'ministros', nome: 'Ministros', vagas: 2, modo: 'equipe' },
  { id: 'liturgia', nome: 'Liturgia (leitores)', vagas: 3, modo: 'equipe' },
  { id: 'cantores', nome: 'Músicos', vagas: 1, modo: 'equipe' },
  { id: 'projecao', nome: 'Projeção', vagas: 1, modo: 'equipe' },
  { id: 'coroinhas', nome: 'Coroinhas', vagas: 2, modo: 'rodizio' },
  { id: 'acolitos', nome: 'Acólitos e ancilas', vagas: 1, modo: 'rodizio' },
];

const Esc = { cfg: null, pessoas: [], equipes: [], meses: {}, aba: 'mes', mes: '', local: '', editando: null, versaoPessoa: 0, eqEditando: null, versaoEquipe: 0 };
const funcoesEsc = () => Esc.cfg?.funcoes?.length ? Esc.cfg.funcoes : FUNCOES_PADRAO;
const nomeFuncao = id => funcoesEsc().find(f => f.id === id)?.nome || id;
const nomesDe = txt => String(txt || '').split(/[,;\n]/).map(s => s.trim()).filter(s => s && s !== '—' && s !== '-');
const chaveCela = (o, f) => `${o.chave}|${f}`;
const equipePorNome = nome => Esc.equipes.find(e => semAcento(e.nome) === semAcento(nome));
// pessoas de uma cela: o nome de uma equipe vira os membros dela
const pessoasDe = txt => nomesDe(txt).flatMap(n => { const e = equipePorNome(n); return e ? nomesDe(e.membros) : [n]; });

async function carregarEscala() {
  const itens = await lerItensSec('esc');
  Esc.cfg = itens.find(i => i.id === 'cfg') || { id: 'cfg', funcoes: FUNCOES_PADRAO.map(f => ({ ...f })) };
  // "Cantores" virou "Músicos" e "Acólitos" virou "Acólitos e ancilas" (pedido do usuário, 23/11): só se o nome ainda for o padrão antigo
  for (const f of Esc.cfg.funcoes || []) {
    if (f.id === 'cantores' && f.nome === 'Cantores') f.nome = 'Músicos';
    if (f.id === 'acolitos' && f.nome === 'Acólitos') f.nome = 'Acólitos e ancilas';
  }
  Esc.pessoas = itens.filter(i => i.id.startsWith('p-')).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  Esc.equipes = itens.filter(i => i.id.startsWith('e-')).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  Esc.meses = Object.fromEntries(itens.filter(i => i.id.startsWith('m-')).map(i => [i.id.slice(2), i]));
  Esc.arquivos = itens.filter(i => i.id.startsWith('a-'));     // 📎 arquivos da pastoral (escalacarga.js)
  Esc.portal = itens.find(i => i.id === 'portal') || null;     // 🌐 endereço e chave do portal das pastorais (portal.js)
}

// chegou coisa de outro computador da secretaria
async function recarregarEscala() {
  await carregarEscala();
  if ($('#dlgEscala')?.open && !document.activeElement?.closest?.('#dlgEscala input, #dlgEscala select')) { renderEscala(); avisoEscalaMA(); }
  if (SECRETARIA) publicarEscalasMA();     // a chave pode ter sido mudada em outro computador
}

// ---------------------------------------------------------------- Missas, equipes programadas e celas
function missasDoMes(mes, local) {
  const [a, m] = mes.split('-').map(Number), out = [];
  for (let d = new Date(a, m - 1, 1); d.getMonth() === m - 1; d.setDate(d.getDate() + 1))
    for (const o of ocorrencias(new Date(d))) if (!o.cancelada && ehMissa(o.tipo) && (!local || o.localId === local)) out.push(o);
  return out;
}
const regraDe = id => Agenda.dados.regras.find(r => r.id === id);
const regrasDeMissa = () => Agenda.dados.regras.filter(r => r.ativa !== false && ehMissa(r.tipo))
  .sort((a, b) => a.dia - b.dia || a.hora.localeCompare(b.hora) || String(a.localId).localeCompare(String(b.localId)));
const rotuloRegra = r => `${descricaoRegra(r)} · ${textoCelebracao(r.tipo, r.descricao, r.localId)}`;
const textoSemana = s => !s || s === 'todas' ? 'toda semana' : s === 'ultima' ? 'na última semana' : `na ${SEMANAS.find(x => x[0] === String(s))?.[1] || s} semana`;

// equipes programadas para uma Missa (as celebrações avulsas não têm programação: só à mão)
const equipesDaMissa = (o, fid) => o.regraId ? Esc.equipes.filter(e => e.funcao === fid
  && (e.programacao || []).some(p => p.regraId === o.regraId && casaSemana(p.semana, deIso(o.iso)))) : [];
const mesEsc = () => Esc.meses[Esc.mes] || (Esc.meses[Esc.mes] = { id: 'm-' + Esc.mes, celas: {} });
const padraoCela = (o, f) => f.modo === 'equipe' ? equipesDaMissa(o, f.id).map(e => e.nome).join(', ') : '';
// o que vale numa cela: o que foi escrito no mês da Missa; sem nada, a equipe programada
function valorCela(o, f) {
  const v = Esc.meses[o.iso.slice(0, 7)]?.celas?.[chaveCela(o, f.id)];
  return v !== undefined ? v : padraoCela(o, f);
}
// "Equipe Azul" → "Equipe Azul (Ana, Bruno)"
const explicaCela = txt => nomesDe(txt).map(n => { const e = equipePorNome(n); return e && e.membros ? `${e.nome} (${nomesDe(e.membros).join(', ')})` : n; }).join(', ');

// datalist de cada função: as equipes dela e as pessoas que fazem a função
const opcoesDaFuncao = f => Esc.equipes.filter(e => e.funcao === f.id).map(e => `<option value="${esc(e.nome)}">equipe · ${esc(e.membros || '')}</option>`).join('')
  + Esc.pessoas.filter(p => p.funcoes?.includes(f.id)).map(p => `<option value="${esc(p.nome)}">${p.avulso ? 'avulso · qualquer Missa' : esc(nomeCurtoLocal(localDe(p.localId)) || '')}</option>`).join('');
const datalistsEsc = () => funcoesEsc().map(f => `<datalist id="escDl-${esc(f.id)}">${opcoesDaFuncao(f)}</datalist>`).join('');
const datalistPessoas = fid => `<datalist id="escDlP">${Esc.pessoas.filter(p => !fid || p.funcoes?.includes(fid)).map(p => `<option value="${esc(p.nome)}">`).join('')}</datalist>`;

// ---------------------------------------------------------------- janela
const HTML_ESCALA = `
<dialog id="dlgEscala" class="dlg-sec dlg-sec-largo">
  <form method="dialog" class="form">
    <h2>📋 Escalas</h2>
    <p class="sutil pequeno sec-privado">🔒 Só entre os computadores da Secretaria: telefones, igrejas e observações nunca vão para o MiguelAngelus, nem para o telão, nem para o site.</p>
    <div class="esc-abas" role="tablist">
      <button type="button" data-esc-aba="mes">📅 Escala do mês</button>
      <button type="button" data-esc-aba="equipes">👥 Equipes e agenda</button>
      <button type="button" data-esc-aba="pessoas">🙋 Pessoas</button>
      <button type="button" data-esc-aba="funcoes">⚙ Funções</button>
      <button type="button" data-esc-aba="portal" title="Página na internet onde as pastorais escrevem a própria escala">🌐 Portal</button>
    </div>
    <div data-esc-painel="mes">
      <div class="linha">
        <label class="campo">Mês <input type="month" id="escMes"></label>
        <label class="campo">Igreja <select id="escLocal"></select></label>
        <span class="espaco"></span>
        <button type="button" id="escSugerir" title="Preenche as funções de rodízio que estão vazias, dividindo por igual entre quem faz aquela função">🎲 Sugerir o rodízio</button>
        <button type="button" id="escImprimir" class="primario">🖨 Imprimir a escala…</button>
      </div>
      <div class="linha esc-arq-linha">
        <span id="escArquivos" class="esc-arquivos"></span><span class="espaco"></span>
        <button type="button" id="escPlanilha" title="Planilha com as Missas do mês para a pastoral preencher os nomes">⬇ Planilha padrão…</button>
        <button type="button" id="escSubir" title="O arquivo que a pastoral já faz (PDF, imagem) ou a planilha padrão preenchida: fica guardado e, de PDF ou planilha, a Secretaria lê os nomes">📎 Subir arquivo ou planilha…</button>
      </div>
      <p class="sutil pequeno" style="margin:0 0 6px">Em cinza, a equipe programada (aba 👥). Escreva por cima para trocar só nesta Missa (o nome de outra equipe ou de pessoas);
        apague o que escreveu para voltar à programada. <b>—</b> = ninguém. Vários nomes: separe por vírgula. O 🎲 só sugere: mude o que quiser.</p>
      <div id="escTabela" class="esc-tabela"></div>
    </div>
    <div data-esc-painel="equipes" hidden>
      <div class="esc-form">
        <div class="linha">
          <label class="campo">Equipe <input id="esceNome" placeholder="Ex.: Equipe São Miguel · Ministério Jovem"></label>
          <label class="campo">Função <select id="esceFuncao"></select></label>
          <label class="campo" style="flex:1">Membros <input id="esceMembros" list="escDlP" placeholder="Nomes separados por vírgula"></label>
        </div>
        <div class="esc-prog-tit sutil pequeno">Agenda da equipe (como nas celebrações recorrentes): em quais Missas e em quais semanas do mês</div>
        <div id="esceProg"></div>
        <div class="linha">
          <button type="button" id="esceMaisProg">＋ Missa na agenda da equipe</button>
          <span class="espaco"></span>
          <button type="button" id="esceCancelar" hidden>Cancelar</button>
          <button type="button" id="esceSalvar" class="primario">＋ Criar equipe</button>
        </div>
      </div>
      <div class="linha"><label class="campo">Mostrar <select id="esceFiltro"></select></label><span class="espaco"></span><span id="esceAviso" class="pequeno"></span></div>
      <div id="escEquipes" class="esc-tabela"></div>
    </div>
    <div data-esc-painel="pessoas" hidden>
      <div class="esc-form">
        <div class="linha">
          <label class="campo">Nome <input id="escpNome" placeholder="Nome como vai na escala"></label>
          <label class="campo">Telefone <input id="escpContato" placeholder="(fica só na Secretaria)"></label>
          <label class="campo">Igreja <select id="escpLocal"></select></label>
          <label class="campo esc-chk" title="Pode servir em qualquer Missa, quando falta alguém"><input type="checkbox" id="escpAvulso"> Avulso (qualquer Missa)</label>
        </div>
        <div class="linha" id="escpFuncoes"></div>
        <div class="linha">
          <label class="campo" style="flex:1">Observação <input id="escpObs" placeholder="Ex.: só aos domingos de manhã"></label>
          <button type="button" id="escpCancelar" hidden>Cancelar</button>
          <button type="button" id="escpSalvar" class="primario">＋ Adicionar</button>
        </div>
      </div>
      <div id="escPessoas"></div>
    </div>
    <div data-esc-painel="funcoes" hidden>
      <p class="sutil pequeno" style="margin:0 0 6px"><b>Equipes</b>: a escala vem da agenda das equipes (aba 👥). <b>Rodízio</b>: o 🎲 sugere, dividindo por igual entre as pessoas da função. Vagas = quantos nomes o 🎲 põe.</p>
      <div id="escFuncoes"></div>
      <div class="linha"><button type="button" id="escFuncaoNova">＋ Função</button></div>
    </div>
    <div data-esc-painel="portal" hidden></div>
    <div class="linha"><span class="espaco"></span><button value="fechar">Fechar</button></div>
  </form>
</dialog>`;

function renderEscala() {
  $$('#dlgEscala [data-esc-aba]').forEach(b => b.classList.toggle('ativo', b.dataset.escAba === Esc.aba));
  $$('#dlgEscala [data-esc-painel]').forEach(p => p.hidden = p.dataset.escPainel !== Esc.aba);
  if (Esc.aba === 'mes') renderEscalaMes();
  else if (Esc.aba === 'equipes') renderEquipes();
  else if (Esc.aba === 'pessoas') renderPessoasEsc();
  else if (Esc.aba === 'portal') { if (typeof abrirAbaPortal === 'function') abrirAbaPortal(); }   // portal.js
  else renderFuncoesEsc();
}

// ---------------------------------------------------------------- escala do mês
function renderEscalaMes() {
  if (typeof renderArquivosEsc === 'function') renderArquivosEsc();
  const fs = funcoesEsc(), ocs = missasDoMes(Esc.mes, Esc.local);
  if (!ocs.length) { $('#escTabela').innerHTML = '<p class="sutil">Nenhuma Missa na Agenda neste mês' + (Esc.local ? ' nesta igreja' : '') + '.</p>'; return; }
  const variasIgrejas = !Esc.local && new Set(ocs.map(o => o.localId)).size > 1;
  $('#escTabela').innerHTML = datalistsEsc() + `<table class="esc-tab"><thead><tr><th>Dia</th><th>Missa</th>${fs.map(f => `<th>${esc(f.nome)}${f.modo === 'rodizio' ? ' <small class="sutil">🎲</small>' : ''}</th>`).join('')}</tr></thead><tbody>
    ${ocs.map(o => {
      const d = deIso(o.iso);
      return `<tr><td class="esc-dia">${DIAS[d.getDay()].slice(0, 3)} ${dataBR(o.iso).slice(0, 5)}</td>
        <td class="esc-missa">${esc(o.hora)}${variasIgrejas ? ` · ${esc(nomeCurtoLocal(localDe(o.localId)) || o.texto)}` : ''}</td>
        ${fs.map(f => {
          const gravado = mesEsc().celas[chaveCela(o, f.id)], pad = padraoCela(o, f), vale = gravado ?? pad;
          const dica = [pad ? 'Programada: ' + explicaCela(pad) : '', gravado !== undefined && vale ? 'Nesta Missa: ' + explicaCela(vale) : ''].filter(Boolean).join('\n');
          return `<td><input class="esc-cel" data-k="${esc(chaveCela(o, f.id))}" list="escDl-${esc(f.id)}" value="${esc(gravado ?? '')}" placeholder="${esc(pad)}" title="${esc(dica)}"></td>`;
        }).join('')}</tr>`;
    }).join('')}</tbody></table>`;
}

async function gravarMesEsc() {
  const rec = mesEsc();
  if (!await gravarItemSec('esc', rec, { versaoAberta: rec.versao || 0, rotulo: 'a escala deste mês' })) { await carregarEscala(); renderEscala(); }
}

async function mudarCelaEsc(inp) {
  const rec = mesEsc(), v = inp.value.trim();
  if (v) rec.celas[inp.dataset.k] = v; else delete rec.celas[inp.dataset.k];
  await gravarMesEsc();
}

// 🎲 rodízio: só as celas vazias das funções de rodízio; divide por igual (quem serviu menos no mês vem primeiro),
// não repete a pessoa no mesmo dia (em nenhuma função, nem nas equipes) e respeita a igreja de cada um (sem igreja = qualquer uma)
async function sugerirRodizio() {
  const fs = funcoesEsc().filter(f => f.modo === 'rodizio'), ocs = missasDoMes(Esc.mes, Esc.local), rec = mesEsc(), todasDoMes = missasDoMes(Esc.mes, '');
  if (!fs.length) return toast('Nenhuma função de rodízio (veja a aba ⚙ Funções).');
  let postos = 0; const faltam = [];
  const [a, m] = Esc.mes.split('-').map(Number), giro = a * 12 + m;
  for (const f of fs) {
    // nomes repetidos (duas pessoas cadastradas com o mesmo nome) contam uma vez só
    const cands = Esc.pessoas.filter((p, i, ps) => p.funcoes?.includes(f.id) && ps.findIndex(q => q.nome === p.nome && q.funcoes?.includes(f.id)) === i);
    if (!cands.length) { faltam.push(f.nome); continue; }
    const conta = new Map(cands.map(p => [p.nome, 0])), ultimo = new Map();
    // o que já está escrito no mês conta (para dividir por igual com o que foi feito à mão)
    for (const o of todasDoMes) for (const n of pessoasDe(rec.celas[chaveCela(o, f.id)])) if (conta.has(n)) conta.set(n, conta.get(n) + 1);
    const ordem = cands.map((p, i) => ({ p, i: (i - giro % cands.length + cands.length) % cands.length }));
    ocs.forEach((o, k) => {
      const ck = chaveCela(o, f.id);
      if (nomesDe(rec.celas[ck]).length || rec.celas[ck] === '—') return;
      // quem já serve neste dia, em qualquer função (inclusive as equipes programadas e o que foi escrito à mão)
      const noDia = new Set(todasDoMes.filter(x => x.iso === o.iso).flatMap(x => funcoesEsc().flatMap(g => pessoasDe(valorCela(x, g)))));
      const ok = ordem.filter(({ p }) => !noDia.has(p.nome) && (!p.localId || p.avulso || p.localId === o.localId))
        .sort((x, y) => conta.get(x.p.nome) - conta.get(y.p.nome) || (ultimo.get(x.p.nome) ?? -1) - (ultimo.get(y.p.nome) ?? -1) || x.i - y.i)
        .slice(0, Math.max(1, +f.vagas || 1));
      if (!ok.length) return;
      rec.celas[ck] = ok.map(x => x.p.nome).join(', ');
      for (const { p } of ok) { conta.set(p.nome, conta.get(p.nome) + 1); ultimo.set(p.nome, k); }
      postos++;
    });
  }
  if (postos) await gravarMesEsc();
  renderEscalaMes();
  toast(postos ? `🎲 Rodízio sugerido em ${postos} lugar${postos > 1 ? 'es' : ''}. Mude o que quiser.` : 'Nada a sugerir: as celas de rodízio já estão preenchidas.');
  if (faltam.length) setTimeout(() => toast(`Ninguém cadastrado para: ${faltam.join(', ')} (aba 🙋 Pessoas).`), 1800);
}

function imprimirEscala() {
  const fs = funcoesEsc(), ocs = missasDoMes(Esc.mes, Esc.local);
  if (!ocs.length) return toast('Nenhuma Missa neste mês.');
  const [a, m] = Esc.mes.split('-').map(Number);
  const nomeMes = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const usadas = fs.filter(f => ocs.some(o => nomesDe(valorCela(o, f)).length || valorCela(o, f) === '—'));
  const cols = usadas.length ? usadas : fs;
  // equipe: o nome em negrito e os membros embaixo
  const celaHtml = txt => nomesDe(txt).map(n => { const e = equipePorNome(n); return e ? `<b>${esc(e.nome)}</b>${e.membros ? `<br><span style="font-size:8.5pt">${esc(nomesDe(e.membros).join(', '))}</span>` : ''}` : esc(n); }).join('<br>');
  const porIgreja = new Map();
  for (const o of ocs) { const k = o.localId || ''; if (!porIgreja.has(k)) porIgreja.set(k, []); porIgreja.get(k).push(o); }
  const tabela = lista => `<table><thead><tr><th>Dia</th><th>Hora</th>${cols.map(f => `<th>${esc(f.nome)}</th>`).join('')}</tr></thead><tbody>
    ${lista.map(o => { const d = deIso(o.iso); return `<tr><td style="white-space:nowrap">${DIAS[d.getDay()].slice(0, 3)} ${dataBR(o.iso).slice(0, 5)}</td><td>${esc(o.hora.replace(':', 'h'))}</td>
      ${cols.map(f => `<td>${celaHtml(valorCela(o, f)) || '<span class="cinza">—</span>'}</td>`).join('')}</tr>`; }).join('')}</tbody></table>`;
  let corpo = [...porIgreja].map(([lid, lista]) => (porIgreja.size > 1 || !Esc.local ? `<h2>${esc(lid ? nomeIgreja(lid) : lista[0].texto)}</h2>` : '') + tabela(lista)).join('');
  // avulsos: quem pode cobrir qualquer Missa, por função (só o nome; o telefone fica na Secretaria)
  const av = fs.map(f => [f, Esc.pessoas.filter(p => p.avulso && p.funcoes?.includes(f.id))]).filter(([, ps]) => ps.length);
  if (av.length) corpo += `<h2>Avulsos (podem cobrir qualquer Missa)</h2><table><tbody>${av.map(([f, ps]) => `<tr><td style="width:22%"><b>${esc(f.nome)}</b></td><td>${esc(ps.map(p => p.nome).join(', '))}</td></tr>`).join('')}</tbody></table>`;
  corpo += '<p class="cinza" style="font-size:9pt;margin-top:10px">Não pode servir no seu dia? Combine a troca e avise a secretaria.</p>';
  imprimirFolhaSec(`Escalas de ${nomeMes}`, Esc.local ? nomeIgreja(Esc.local) : 'Todas as igrejas', corpo, `Escalas ${Esc.mes}${Esc.local ? ' ' + (nomeCurtoLocal(localDe(Esc.local)) || '') : ''}`, { paisagem: cols.length > 4 });
}

// ---------------------------------------------------------------- equipes e a agenda delas
const Prog = { linhas: [] };   // agenda da equipe no formulário: [{ regraId, semana }]

function renderProgForm() {
  const regras = regrasDeMissa();
  $('#esceProg').innerHTML = !Prog.linhas.length ? '<p class="sutil pequeno" style="margin:2px 0">Sem Missas na agenda (a equipe só entra na escala se for escrita à mão).</p>'
    : Prog.linhas.map((p, i) => `<div class="linha esc-prog" data-i="${i}">
      <select data-prog="regraId">${regras.map(r => `<option value="${esc(r.id)}"${r.id === p.regraId ? ' selected' : ''}>${esc(rotuloRegra(r))}</option>`).join('')}</select>
      <select data-prog="semana">${SEMANAS.map(([v, t]) => `<option value="${v}"${String(p.semana || 'todas') === v ? ' selected' : ''}>${v === 'todas' ? 'Toda semana' : t + ' semana do mês'}</option>`).join('')}</select>
      <button type="button" data-prog-tirar class="perigo" title="Tirar esta Missa da agenda da equipe">✕</button></div>`).join('');
}

// próximas datas de uma equipe (dos próximos 2 meses)
function proximasDaEquipe(e, n = 4) {
  const out = [], hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  for (let d = new Date(hoje), k = 0; k < 62 && out.length < n; k++, d.setDate(d.getDate() + 1))
    for (const o of ocorrencias(new Date(d))) if (!o.cancelada && equipesDaMissa(o, e.funcao).includes(e)) out.push(`${dataBR(o.iso).slice(0, 5)} ${o.hora}`);
  return out.slice(0, n);
}

// duas equipes da mesma função na mesma Missa e na mesma semana
function choquesDe(e) {
  const out = [];
  for (const p of e.programacao || []) for (const o of Esc.equipes) {
    if (o === e || o.funcao !== e.funcao) continue;
    for (const q of o.programacao || []) if (q.regraId === p.regraId && (p.semana === q.semana || [p.semana, q.semana].some(s => !s || s === 'todas')))
      out.push(`${o.nome} (${descricaoRegra(regraDe(p.regraId) || {})})`);
  }
  return [...new Set(out)];
}

function renderEquipes() {
  const fs = funcoesEsc(), filtro = $('#esceFiltro').value;
  const selF = $('#esceFuncao').value;
  $('#esceFuncao').innerHTML = fs.map(f => `<option value="${esc(f.id)}">${esc(f.nome)}</option>`).join('');
  if (selF) $('#esceFuncao').value = selF;
  $('#esceFiltro').innerHTML = '<option value="">Todas as funções</option>' + fs.map(f => `<option value="${esc(f.id)}">${esc(f.nome)}</option>`).join('');
  $('#esceFiltro').value = filtro;
  renderProgForm();
  const lista = Esc.equipes.filter(e => !filtro || e.funcao === filtro)
    .sort((a, b) => fs.findIndex(f => f.id === a.funcao) - fs.findIndex(f => f.id === b.funcao) || a.nome.localeCompare(b.nome, 'pt-BR'));
  let nChoques = 0;
  $('#escEquipes').innerHTML = datalistPessoas($('#esceFuncao').value) + (!lista.length ? '<p class="sutil">Nenhuma equipe ainda. Crie acima: o nome, a função, os membros e as Missas em que ela serve.</p>'
    : `<table class="esc-tab"><thead><tr><th>Equipe</th><th>Função</th><th>Membros</th><th>Agenda</th><th>Próximas</th><th></th></tr></thead><tbody>${lista.map(e => {
      const ch = choquesDe(e); if (ch.length) nChoques++;
      const prog = (e.programacao || []).map(p => { const r = regraDe(p.regraId); return r ? `${esc(rotuloRegra(r))} <small class="sutil">${esc(textoSemana(p.semana))}</small>` : '<span class="sutil">(Missa que saiu da Agenda)</span>'; });
      return `<tr data-id="${esc(e.id)}" class="${Esc.eqEditando === e.id ? 'editando' : ''}"><td><b>${esc(e.nome)}</b></td><td>${esc(nomeFuncao(e.funcao))}</td>
        <td>${esc(nomesDe(e.membros).join(', '))}</td><td>${prog.join('<br>') || '<span class="sutil">—</span>'}${ch.length ? `<br><span class="esc-choque">⚠ mesma Missa e semana que ${esc(ch.join(', '))}</span>` : ''}</td>
        <td class="esc-dia">${esc(proximasDaEquipe(e).join(' · '))}</td>
        <td class="esc-acoes"><button type="button" data-esce-editar title="Editar">✎</button><button type="button" data-esce-apagar class="perigo" title="Apagar">✕</button></td></tr>`;
    }).join('')}</tbody></table>`);
  $('#esceAviso').textContent = nChoques ? '⚠ Há equipes da mesma função na mesma Missa: na escala aparecem as duas.' : '';
}

function limparFormEquipe() {
  Esc.eqEditando = null; Prog.linhas = [];
  $('#esceNome').value = ''; $('#esceMembros').value = '';
  $('#esceSalvar').textContent = '＋ Criar equipe'; $('#esceCancelar').hidden = true;
}

async function salvarEquipe() {
  const nome = $('#esceNome').value.trim();
  if (!nome) { toast('Dê um nome à equipe.'); return $('#esceNome').focus(); }
  const ant = Esc.equipes.find(e => e.id === Esc.eqEditando);
  const mesmo = equipePorNome(nome);
  if (mesmo && mesmo !== ant) return toast(`Já existe a equipe "${mesmo.nome}". Use outro nome.`);
  if (Esc.pessoas.some(p => semAcento(p.nome) === semAcento(nome))) return toast(`"${nome}" é o nome de uma pessoa. Use outro nome para a equipe.`);
  const e = { ...(ant || { id: 'e-' + uid(), criado: Date.now() }), nome, funcao: $('#esceFuncao').value,
    membros: nomesDe($('#esceMembros').value).join(', '), programacao: Prog.linhas.filter(p => p.regraId).map(p => ({ regraId: p.regraId, semana: p.semana || 'todas' })) };
  if (!await gravarItemSec('esc', e, { versaoAberta: ant ? Esc.versaoEquipe : 0, rotulo: 'esta equipe' })) { await carregarEscala(); limparFormEquipe(); return renderEquipes(); }
  if (ant && ant.nome !== nome) await renomearNaEscala(ant.nome, nome);
  if (ant) Object.assign(ant, e); else Esc.equipes.push(e);
  Esc.equipes.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  limparFormEquipe();
  renderEquipes();
  toast(`👥 ${nome}: ${e.programacao.length ? 'agenda salva' : 'salva (sem Missas na agenda)'}.`);
}

async function apagarEquipe(id) {
  const e = Esc.equipes.find(x => x.id === id);
  if (!e || !confirm(`Apagar a equipe "${e.nome}"?\n\nSai da agenda e das escalas que vêm dela. Onde o nome dela foi escrito à mão, fica escrito.`)) return;
  await apagarItemSec('esc', id);
  Esc.equipes = Esc.equipes.filter(x => x !== e);
  if (Esc.eqEditando === id) limparFormEquipe();
  renderEquipes();
}

// ---------------------------------------------------------------- pessoas
function renderPessoasEsc() {
  const fs = funcoesEsc();
  if ($('#escpFuncoes').dataset.pronto !== fs.map(f => f.id).join()) {
    const marcadas = new Set(Esc.editando ? (Esc.pessoas.find(p => p.id === Esc.editando)?.funcoes || []) : []);
    $('#escpFuncoes').innerHTML = '<span class="sutil pequeno">Funções:</span>' + fs.map(f => `<label class="esc-chk"><input type="checkbox" data-escp-f="${esc(f.id)}"${marcadas.has(f.id) ? ' checked' : ''}> ${esc(f.nome)}</label>`).join('');
    $('#escpFuncoes').dataset.pronto = fs.map(f => f.id).join();
  }
  const equipesDe = p => Esc.equipes.filter(e => nomesDe(e.membros).includes(p.nome)).map(e => e.nome);
  $('#escPessoas').innerHTML = !Esc.pessoas.length ? '<p class="sutil">Ninguém cadastrado ainda.</p>'
    : `<table class="esc-tab"><thead><tr><th>Nome</th><th>Funções</th><th>Equipes</th><th>Igreja</th><th>Telefone</th><th></th></tr></thead><tbody>${Esc.pessoas.map(p => `
      <tr data-id="${esc(p.id)}" class="${Esc.editando === p.id ? 'editando' : ''}"><td><b>${esc(p.nome)}</b>${p.obs ? `<br><small class="sutil">${esc(p.obs)}</small>` : ''}</td>
        <td>${esc((p.funcoes || []).map(nomeFuncao).join(', '))}${p.avulso ? ' <span class="esc-avulso">avulso</span>' : ''}</td>
        <td>${esc(equipesDe(p).join(', '))}</td>
        <td>${esc(p.localId ? nomeCurtoLocal(localDe(p.localId)) : 'Qualquer')}</td><td>${esc(p.contato || '')}</td>
        <td class="esc-acoes"><button type="button" data-escp-editar title="Editar">✎</button><button type="button" data-escp-apagar class="perigo" title="Apagar">✕</button></td></tr>`).join('')}</tbody></table>`;
}

function limparFormPessoaEsc() {
  Esc.editando = null;
  for (const id of ['escpNome', 'escpContato', 'escpObs']) $('#' + id).value = '';
  $('#escpLocal').value = ''; $('#escpAvulso').checked = false;
  $$('#escpFuncoes [data-escp-f]').forEach(c => c.checked = false);
  $('#escpSalvar').textContent = '＋ Adicionar'; $('#escpCancelar').hidden = true;
}

async function salvarPessoaEsc() {
  const nome = $('#escpNome').value.trim();
  if (!nome) { toast('Escreva o nome.'); return $('#escpNome').focus(); }
  const funcoes = $$('#escpFuncoes [data-escp-f]:checked').map(c => c.dataset.escpF);
  if (!funcoes.length) return toast('Marque pelo menos uma função.');
  if (equipePorNome(nome)) return toast(`"${nome}" é o nome de uma equipe. Use outro nome.`);
  const ant = Esc.pessoas.find(p => p.id === Esc.editando);
  if (!ant && Esc.pessoas.some(p => semAcento(p.nome) === semAcento(nome)) && !confirm(`Já há "${nome}" cadastrado. Cadastrar outra pessoa com o mesmo nome?`)) return;
  const p = { ...(ant || { id: 'p-' + uid(), criado: Date.now() }), nome, contato: $('#escpContato').value.trim(), localId: $('#escpLocal').value,
    avulso: $('#escpAvulso').checked, funcoes, obs: $('#escpObs').value.trim() };
  if (!await gravarItemSec('esc', p, { versaoAberta: ant ? Esc.versaoPessoa : 0, rotulo: 'esta pessoa' })) { await carregarEscala(); limparFormPessoaEsc(); return renderPessoasEsc(); }
  // trocou o nome: as equipes e as escalas acompanham
  if (ant && ant.nome !== nome) await renomearNaEscala(ant.nome, nome);
  if (ant) Object.assign(ant, p); else Esc.pessoas.push(p);
  Esc.pessoas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  limparFormPessoaEsc();
  renderPessoasEsc();
  $('#escpNome').focus();
}

// troca um nome (de pessoa ou de equipe) nos membros das equipes e nas escalas de agora em diante (o que já passou fica como foi)
async function renomearNaEscala(de, para) {
  const troca = txt => { const ns = String(txt).split(/\s*,\s*/); return ns.includes(de) ? ns.map(n => n === de ? para : n).join(', ') : null; };
  for (const e of Esc.equipes) { const t = troca(e.membros || ''); if (t !== null) { e.membros = t; await gravarItemSec('esc', e); } }
  const hoje = isoData(new Date()).slice(0, 7);
  for (const [mes, rec] of Object.entries(Esc.meses)) {
    if (mes < hoje) continue;
    let mudou = false;
    for (const [k, v] of Object.entries(rec.celas || {})) { const t = troca(v); if (t !== null) { rec.celas[k] = t; mudou = true; } }
    if (mudou) await gravarItemSec('esc', rec);
  }
}

async function apagarPessoaEsc(id) {
  const p = Esc.pessoas.find(x => x.id === id);
  if (!p || !confirm(`Tirar ${p.nome} da lista de pessoas?\n\nO nome continua nas equipes e nas escalas já feitas (mude à mão, se precisar).`)) return;
  await apagarItemSec('esc', id);
  Esc.pessoas = Esc.pessoas.filter(x => x !== p);
  if (Esc.editando === id) limparFormPessoaEsc();
  renderPessoasEsc();
}

// ---------------------------------------------------------------- funções
function renderFuncoesEsc() {
  $('#escFuncoes').innerHTML = `<table class="esc-tab"><thead><tr><th>Função</th><th>Vagas</th><th>Como se escala</th><th></th></tr></thead><tbody>${funcoesEsc().map((f, i) => `
    <tr data-i="${i}"><td><input data-escf="nome" value="${esc(f.nome)}"></td>
      <td><input data-escf="vagas" type="number" min="1" max="9" value="${+f.vagas || 1}" style="width:5em"></td>
      <td><select data-escf="modo"><option value="equipe"${f.modo === 'equipe' ? ' selected' : ''}>👥 Por equipes (agenda das equipes)</option><option value="rodizio"${f.modo === 'rodizio' ? ' selected' : ''}>🎲 Rodízio (sugestão)</option></select></td>
      <td class="esc-acoes"><button type="button" data-escf-subir title="Mais para a esquerda na escala"${i ? '' : ' disabled'}>↑</button><button type="button" data-escf-apagar class="perigo" title="Tirar a função">✕</button></td></tr>`).join('')}</tbody></table>`;
}

async function gravarFuncoesEsc() {
  Esc.cfg.funcoes = funcoesEsc().map(f => ({ ...f }));
  if (!await gravarItemSec('esc', Esc.cfg, { versaoAberta: Esc.cfg.versao || 0, rotulo: 'as funções da escala' })) await carregarEscala();
  renderFuncoesEsc();
}

// ---------------------------------------------------------------- abrir e ligar
async function abrirEscala() {
  await carregarEscala();
  if (!Esc.mes) { const h = new Date(); h.setDate(h.getDate() + 10); Esc.mes = isoData(h).slice(0, 7); }   // perto do fim do mês, já o próximo
  $('#escMes').value = Esc.mes;
  $('#escLocal').innerHTML = opcoesLocais(Esc.local, 'Todas as igrejas');
  $('#escpLocal').innerHTML = opcoesLocais($('#escpLocal').value, 'Qualquer igreja');
  $('#escpFuncoes').dataset.pronto = '';
  limparFormPessoaEsc();
  limparFormEquipe();
  renderEscala();
  avisoEscalaMA();
  abrirDialogo('dlgEscala');
}

function ligarEscala() {
  const dlg = $('#dlgEscala');
  dlg.addEventListener('click', e => {
    const aba = e.target.closest('[data-esc-aba]');
    if (aba) { Esc.aba = aba.dataset.escAba; return renderEscala(); }
    // pessoas
    const tr = e.target.closest('#escPessoas tr[data-id]');
    if (tr && e.target.closest('[data-escp-apagar]')) return apagarPessoaEsc(tr.dataset.id);
    if (tr && e.target.closest('[data-escp-editar]')) {
      const p = Esc.pessoas.find(x => x.id === tr.dataset.id);
      if (!p) return;
      Esc.editando = p.id; Esc.versaoPessoa = p.versao || 0;
      $('#escpNome').value = p.nome; $('#escpContato').value = p.contato || ''; $('#escpLocal').value = p.localId || '';
      $('#escpAvulso').checked = !!p.avulso; $('#escpObs').value = p.obs || '';
      $$('#escpFuncoes [data-escp-f]').forEach(c => c.checked = (p.funcoes || []).includes(c.dataset.escpF));
      $('#escpSalvar').textContent = 'Salvar'; $('#escpCancelar').hidden = false;
      renderPessoasEsc(); return $('#escpNome').focus();
    }
    // equipes
    const tre = e.target.closest('#escEquipes tr[data-id]');
    if (tre && e.target.closest('[data-esce-apagar]')) return apagarEquipe(tre.dataset.id);
    if (tre && e.target.closest('[data-esce-editar]')) {
      const q = Esc.equipes.find(x => x.id === tre.dataset.id);
      if (!q) return;
      Esc.eqEditando = q.id; Esc.versaoEquipe = q.versao || 0;
      Prog.linhas = (q.programacao || []).map(p => ({ ...p }));
      $('#esceNome').value = q.nome; $('#esceMembros').value = q.membros || '';
      $('#esceFuncao').value = q.funcao;
      $('#esceSalvar').textContent = 'Salvar'; $('#esceCancelar').hidden = false;
      renderEquipes(); return $('#esceNome').focus();
    }
    const lp = e.target.closest('#esceProg .esc-prog');
    if (lp && e.target.closest('[data-prog-tirar]')) { Prog.linhas.splice(+lp.dataset.i, 1); return renderProgForm(); }
    // funções
    const trf = e.target.closest('#escFuncoes tr[data-i]');
    if (trf && e.target.closest('[data-escf-apagar]')) {
      const f = funcoesEsc()[+trf.dataset.i];
      if (!confirm(`Tirar a função "${f.nome}" da escala?\n\nO que já foi escrito nela some da tela e da folha.`)) return;
      Esc.cfg.funcoes = funcoesEsc().filter(x => x !== f);
      return gravarFuncoesEsc();
    }
    if (trf && e.target.closest('[data-escf-subir]')) {
      const fs = funcoesEsc().map(f => ({ ...f })), i = +trf.dataset.i;
      [fs[i - 1], fs[i]] = [fs[i], fs[i - 1]];
      Esc.cfg.funcoes = fs;
      return gravarFuncoesEsc();
    }
  });
  dlg.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('.esc-cel')) return mudarCelaEsc(t);
    if (t.matches('[data-prog]')) { Prog.linhas[+t.closest('.esc-prog').dataset.i][t.dataset.prog] = t.value; return; }
    if (t.matches('[data-escf]')) {
      const fs = funcoesEsc().map(f => ({ ...f })), f = fs[+t.closest('tr').dataset.i], campo = t.dataset.escf;
      f[campo] = campo === 'vagas' ? Math.max(1, Math.min(9, +t.value || 1)) : t.value.trim() || f[campo];
      Esc.cfg.funcoes = fs;
      return gravarFuncoesEsc();
    }
  });
  $('#escMes').addEventListener('change', () => { if ($('#escMes').value) { Esc.mes = $('#escMes').value; renderEscalaMes(); } });
  $('#escLocal').addEventListener('change', () => { Esc.local = $('#escLocal').value; renderEscalaMes(); });
  $('#escSugerir').addEventListener('click', sugerirRodizio);
  $('#escImprimir').addEventListener('click', imprimirEscala);
  $('#escpSalvar').addEventListener('click', salvarPessoaEsc);
  $('#escpCancelar').addEventListener('click', () => { limparFormPessoaEsc(); renderPessoasEsc(); });
  $('#esceSalvar').addEventListener('click', salvarEquipe);
  $('#esceCancelar').addEventListener('click', () => { limparFormEquipe(); renderEquipes(); });
  $('#esceFiltro').addEventListener('change', renderEquipes);
  $('#esceFuncao').addEventListener('change', () => { $('#escDlP')?.remove(); $('#escEquipes').insertAdjacentHTML('afterbegin', datalistPessoas($('#esceFuncao').value)); });
  $('#esceMaisProg').addEventListener('click', () => {
    const regras = regrasDeMissa();
    if (!regras.length) return toast('Não há Missas de horário fixo na Agenda (⛪ Celebrações recorrentes).');
    const ult = Prog.linhas.at(-1);
    Prog.linhas.push({ regraId: ult?.regraId || regras[0].id, semana: 'todas' });
    renderProgForm();
  });
  $('#escFuncaoNova').addEventListener('click', () => {
    const nome = prompt('Nome da função (ex.: Acolhida, Comentarista, Ofertório):');
    if (!nome?.trim()) return;
    Esc.cfg.funcoes = [...funcoesEsc().map(f => ({ ...f })), { id: 'f' + uid(), nome: nome.trim(), vagas: 1, modo: 'equipe' }];
    gravarFuncoesEsc();
  });
  dlg.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.matches('input')) return;
    e.preventDefault();
    if (e.target.closest('[data-esc-painel="pessoas"] .esc-form')) salvarPessoaEsc();
    else if (e.target.closest('[data-esc-painel="equipes"] .esc-form')) salvarEquipe();
    else e.target.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

// ---------------------------------------------------------------- (1.6.0) escala de cada Missa no MiguelAngelus
// Chave da paróquia, NASCE DESLIGADA (como as intenções): fica na Agenda (paroquia.escalasMA), que vai para todos os computadores.
// Ligada: para cada Missa dos próximos 45 dias sai um registro secs-<chave> na pasta "escalas/" da nuvem SÓ com a função e os
// NOMES de quem serve (nunca telefone, igreja, observação ou "avulso"). O MiguelAngelus só lê: a 💡 Dica dos celulares mostra
// a escala da Missa do roteiro aberto. Desligada: esses registros são apagados.
const escalasNoMA = () => !!Agenda.dados.paroquia?.escalasMA;
const idPubEsc = chave => 'secs-' + String(chave).replace(/[^\w-]+/g, '_');

async function publicarEscalasMA() {
  const quer = new Map();
  if (escalasNoMA()) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    for (let d = new Date(hoje), k = 0; k < 45; k++, d.setDate(d.getDate() + 1))
      for (const o of ocorrencias(new Date(d))) {
        if (o.cancelada || !ehMissa(o.tipo)) continue;
        const funcoes = funcoesEsc().map(f => ({ nome: f.nome, pessoas: [...new Set(pessoasDe(valorCela(o, f)))] })).filter(x => x.pessoas.length);
        if (funcoes.length) quer.set(idPubEsc(o.chave), { chave: o.chave, data: o.iso, hora: o.hora, funcoes });
      }
  }
  let atuais = [];
  try { atuais = (await DB.todos('config')).filter(r => /^secs-/.test(r.id)); } catch (_) {}
  let mudou = false;
  for (const r of atuais) if (!quer.has(r.id)) { await DB.remover('config', r.id); mudou = true; }
  for (const [id, item] of quer) {
    const a = atuais.find(r => r.id === id);
    if (a && JSON.stringify(a.item) === JSON.stringify(item)) continue;
    await DB.salvar('config', { id, item }); mudou = true;
  }
  if (mudou) avisarMudancaSec();
}
let timerPubEsc = 0;
function aposMudarEscala() { clearTimeout(timerPubEsc); timerPubEsc = setTimeout(() => SECRETARIA && publicarEscalasMA(), 600); }

function avisoEscalaMA() {
  const p = $('#escMaAviso');
  if (!p) return;
  const lig = escalasNoMA();
  p.classList.toggle('ligado', lig);
  p.innerHTML = lig
    ? '📱 <b>A escala de cada Missa vai para o MiguelAngelus</b> (só a função e os nomes), e aparece na 💡 Dica dos celulares. Para parar: <b>Ajustes → 📋 Escalas no MiguelAngelus</b>.'
    : '📱 A escala <b>não vai</b> para o MiguelAngelus: fica só na folha impressa. Para mostrar na 💡 Dica dos celulares: <b>Ajustes → 📋 Escalas no MiguelAngelus</b>.';
}

const HTML_ESC_MA = `
<dialog id="dlgEscMA" class="dlg-sec">
  <form method="dialog" class="form">
    <h2>📋 Escalas no MiguelAngelus (celulares)</h2>
    <label class="chave-forma"><input type="checkbox" id="emLigada"><span class="trilho"></span> Mandar a escala de cada Missa para o MiguelAngelus</label>
    <p class="sutil pequeno">Ligado: a <b>💡 Dica</b> que vai para os celulares (a cola dos coroinhas) mostra quem serve na Missa do roteiro aberto:
      coordenação, ministros, leitores, coroinhas… Vão <b>só a função e os nomes</b>, das Missas dos próximos 45 dias; telefones, igrejas e observações ficam só na Secretaria.</p>
    <p class="sutil pequeno">Os coroinhas costumam ser menores de idade: ligue só se a paróquia concordar em mostrar os nomes deles nos celulares da equipe
      (a Dica só abre nos celulares pareados com o computador da projeção). Vale para todos os computadores da paróquia.</p>
    <div class="linha"><span class="espaco"></span><button value="ok" class="primario">OK</button></div>
  </form>
</dialog>`;

function abrirEscMA() { $('#emLigada').checked = escalasNoMA(); abrirDialogo('dlgEscMA'); }

function iniciarEscala() {
  document.body.insertAdjacentHTML('beforeend', HTML_ESCALA + HTML_ESC_MA + (typeof HTML_ESC_CARGA === 'string' ? HTML_ESC_CARGA : ''));
  $('#escTabela').insertAdjacentHTML('beforebegin', '<p id="escMaAviso" class="pequeno in-telao-aviso"></p>');
  ligarEscala();
  if (typeof ligarCargaEsc === 'function') ligarCargaEsc();      // (1.6.0) 📎 arquivo da pastoral e planilha padrão (escalacarga.js)
  if (typeof ligarPortalEsc === 'function') ligarPortalEsc();    // 🌐 portal das pastorais (portal.js)
  $('#emLigada').addEventListener('change', e => {
    Agenda.dados.paroquia ||= {};
    Agenda.dados.paroquia.escalasMA = e.target.checked;
    salvarAgenda();
    publicarEscalasMA();
    avisoEscalaMA();
    toast(e.target.checked ? '📋 A escala de cada Missa vai para o MiguelAngelus.' : '📋 A escala não vai mais para o MiguelAngelus.');
  });
  carregarEscala().then(publicarEscalasMA);
  $('#dlgAgenda')?.addEventListener('close', aposMudarEscala);     // mudou horário ou cancelou Missa na Agenda
  // as Missas de 45 dias para frente vão entrando (uma vez por dia basta; de hora em hora é barato)
  setInterval(() => publicarEscalasMA(), 3600000);
}
