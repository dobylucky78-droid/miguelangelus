'use strict';
/*
 * PROTÓTIPO (15/11/2026) — 📆 Agenda da secretaria: a agenda compartilhada do Google que a secretaria já usa, vista e
 * editada dentro da Secretaria MiguelAngelus, numa CONTA PRÓPRIA (pode ser diferente da conta do Drive da nuvem).
 *  - O aplicativo (app\GoogleAgenda.cs) faz o login e as chamadas à API do Google Agenda (ação 'agendaApi').
 *  - Os compromissos NÃO ficam guardados aqui: são lidos do Google cada vez (nada disso vai para a nuvem, nem para o MiguelAngelus).
 *  - Ver é livre. Para criar, mudar ou apagar, a pessoa ENTRA com nome e senha (cadastro de pessoas, 'secu-<id>' no store
 *    config, que vai pela pasta "secretaria/" da nuvem para os outros computadores da secretaria; a senha nunca vai, só o
 *    hash PBKDF2). O compromisso guarda quem mexeu (extendedProperties.private.secretariaPor).
 *  - Na primeira vez que o programa abre, pergunta se quer ligar a agenda a uma conta (não na atualização: fica marcado).
 * Usa $, $$, esc, uid, toast, DB, NO_APP, arqApp, isoData, deIso, dataBR, hojeIso, DIAS, MESES, semAcento, abrirDialogo,
 * lerItensSec, gravarItemSec, apagarItemSec, imprimirFolhaSec (em tempo de execução).
 */

// cores de compromisso do Google Agenda (colorId 1–11)
const CORES_AG = [['', 'Cor da agenda'], ['1', 'Lavanda', '#7986cb'], ['2', 'Sálvia', '#33b679'], ['3', 'Uva', '#8e24aa'], ['4', 'Flamingo', '#e67c73'],
  ['5', 'Banana', '#f6bf26'], ['6', 'Tangerina', '#f4511e'], ['7', 'Pavão', '#039be5'], ['8', 'Grafite', '#616161'], ['9', 'Mirtilo', '#3f51b5'],
  ['10', 'Manjericão', '#0b8043'], ['11', 'Tomate', '#d50000']];
const REPETE_AG = [['', 'Não se repete'], ['DAILY', 'Todo dia'], ['WEEKLY', 'Toda semana'], ['MONTHLY', 'Todo mês (mesmo dia)'], ['YEARLY', 'Todo ano']];
const MINUTOS_SESSAO_AG = 15;   // sem mexer por 15 minutos, a pessoa sai sozinha

const AG = { temCliente: false, conectado: false, email: '', cals: [], calId: '', eventos: [], visao: 'semana', ref: null, busca: '',
  editando: null, abertoAtualizado: '', descOriginal: '', carregando: false, erro: '', pedido: 0 };
const Pessoas = { lista: [], atual: null, ultimoUso: 0, editando: null };

const agApi = (metodo, caminho, corpo) => arqApp('agendaApi', { metodo, caminho, corpo: corpo || null }, 60000).then(r => r.dados);
const calPathAg = () => 'calendars/' + encodeURIComponent(AG.calId);
const calAtualAg = () => AG.cals.find(c => c.id === AG.calId) || null;
const podeEscreverAg = () => ['owner', 'writer'].includes(calAtualAg()?.accessRole);
const hhmm = d => d.toTimeString().slice(0, 5);
const lsAg = (k, v) => { try { if (v === undefined) return localStorage.getItem('secretaria.agendaG.' + k); localStorage.setItem('secretaria.agendaG.' + k, v); } catch (_) {} return null; };

// ---------------------------------------------------------------- pessoas (login para mexer)
const b64Ag = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deB64Ag = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function hashSenhaAg(senha, sal, iter) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  return b64Ag(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: deB64Ag(sal), iterations: iter }, chave, 256));
}
async function carregarPessoas() {
  Pessoas.lista = (await lerItensSec('usu')).filter(p => p.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (Pessoas.atual && !Pessoas.lista.some(p => p.id === Pessoas.atual.id)) Pessoas.atual = null;   // desativada em outro computador
}
function sessaoAg() {
  if (Pessoas.atual && Date.now() - Pessoas.ultimoUso > MINUTOS_SESSAO_AG * 60000) { Pessoas.atual = null; renderLoginAg(); }
  return Pessoas.atual;
}
// Para criar, mudar ou apagar: a pessoa precisa ter entrado. Devolve false (e mostra onde entrar) se não.
function exigirLoginAg() {
  if (sessaoAg()) { Pessoas.ultimoUso = Date.now(); return true; }
  renderLoginAg();
  const box = $('#sgaLogin');
  box.classList.remove('sga-piscar'); void box.offsetWidth; box.classList.add('sga-piscar');
  toast(Pessoas.lista.length ? '🔒 Para mexer na agenda, entre com o seu nome e a sua senha.' : '🔒 Cadastre primeiro quem vai mexer na agenda (👥 Pessoas).');
  (Pessoas.lista.length ? $('#sgalSenha') : $('#sgalCadastrar'))?.focus();
  return false;
}
async function entrarAg() {
  const p = Pessoas.lista.find(x => x.id === $('#sgalPessoa').value), senha = $('#sgalSenha').value;
  if (!p || !senha) return toast('Escolha o seu nome e digite a senha.');
  if (await hashSenhaAg(senha, p.sal, p.iter) !== p.hash) {
    await new Promise(r => setTimeout(r, 900));
    $('#sgalSenha').value = ''; $('#sgalSenha').focus();
    return toast('Senha errada.');
  }
  Pessoas.atual = { id: p.id, nome: p.nome, admin: !!p.admin };
  Pessoas.ultimoUso = Date.now();
  lsAg('ultimaPessoa', p.id);
  toast(`✎ Olá, ${p.nome}! Pode mexer na agenda.`);
  renderLoginAg(); renderListaAg();
}
function sairAg() { Pessoas.atual = null; renderLoginAg(); renderListaAg(); $('#sgaForm').hidden = true; $('#sgaPessoas').hidden = true; }

function renderLoginAg() {
  const el = $('#sgaLogin');
  if (!el) return;
  const at = sessaoAg();
  if (!Pessoas.lista.length) {
    el.innerHTML = `🔒 Ver a agenda é livre. Para mexer, cada pessoa entra com a sua senha — ninguém foi cadastrado ainda.
      <button type="button" id="sgalCadastrar" data-sga="pessoas">👥 Cadastrar a primeira pessoa</button>`;
  } else if (!at) {
    const ult = lsAg('ultimaPessoa');
    el.innerHTML = `🔒 Ver é livre. Para mexer:
      <select id="sgalPessoa">${Pessoas.lista.map(p => `<option value="${esc(p.id)}" ${p.id === ult ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>
      <input id="sgalSenha" type="password" placeholder="senha" autocomplete="current-password">
      <button type="button" data-sga="entrar" class="primario">Entrar</button>`;
  } else {
    el.innerHTML = `✎ Mexendo como <b>${esc(at.nome)}</b>${at.admin ? ' <small class="sutil">(responsável)</small>' : ''}
      <span class="sutil pequeno">— sai sozinho depois de ${MINUTOS_SESSAO_AG} min parado</span>
      <button type="button" data-sga="sair">Sair</button>
      <button type="button" data-sga="pessoas">👥 ${at.admin ? 'Pessoas' : 'Trocar minha senha'}</button>`;
  }
  el.classList.toggle('sga-logado', !!at);
}

// ---- cadastro de pessoas (responsável cadastra; cada um troca a própria senha; a primeira pessoa é responsável)
function abrirPessoasAg() {
  const at = sessaoAg();
  if (Pessoas.lista.length && !at) return exigirLoginAg();
  $('#sgaForm').hidden = true;
  $('#sgaPessoas').hidden = false;
  limparFormPessoaAg(at && !at.admin ? Pessoas.lista.find(p => p.id === at.id) : null);
  renderPessoasAg();
  $('#sgaPessoas').scrollIntoView({ block: 'nearest' });
}
function renderPessoasAg() {
  const at = sessaoAg(), admin = !Pessoas.lista.length || at?.admin;
  $('#sgapTit').textContent = !Pessoas.lista.length ? '👥 Primeira pessoa (vai ser a responsável, que cadastra as outras)' : admin ? '👥 Quem pode mexer na agenda' : '🔑 Trocar a minha senha';
  $('#sgapLista').innerHTML = admin && Pessoas.lista.length ? Pessoas.lista.map(p => `<div class="mc-item" data-p="${esc(p.id)}">
      <span class="mc-txt"><b>${esc(p.nome)}</b> ${p.admin ? '<small class="sutil">responsável</small>' : ''}</span>
      <button type="button" data-sgap="senha" title="Trocar a senha / responsável">🔑</button>
      ${p.id === at?.id ? '' : '<button type="button" data-sgap="tirar" class="perigo" title="Tirar o acesso">✕</button>'}</div>`).join('') : '';
  $('#sgapAdminLinha').hidden = !admin;
}
function limparFormPessoaAg(p) {
  Pessoas.editando = p?.id || null;
  $('#sgapNome').value = p?.nome || ''; $('#sgapNome').readOnly = !!p;
  $('#sgapSenha').value = ''; $('#sgapSenha2').value = '';
  $('#sgapAdmin').checked = !Pessoas.lista.length || !!p?.admin;
  $('#sgapAdmin').disabled = !Pessoas.lista.length;
  $('#sgapSalvar').textContent = p ? 'Salvar a nova senha' : 'Cadastrar pessoa';
  (p ? $('#sgapSenha') : $('#sgapNome')).focus();
}
async function salvarPessoaAg() {
  const primeira = !Pessoas.lista.length, at = sessaoAg();
  if (!primeira && !at) return exigirLoginAg();
  const nome = $('#sgapNome').value.trim(), s1 = $('#sgapSenha').value, s2 = $('#sgapSenha2').value;
  if (!nome) { toast('Escreva o nome.'); return $('#sgapNome').focus(); }
  if (s1.length < 4) { toast('A senha precisa de pelo menos 4 caracteres.'); return $('#sgapSenha').focus(); }
  if (s1 !== s2) { toast('As duas senhas não estão iguais.'); return $('#sgapSenha2').focus(); }
  const antigo = Pessoas.lista.find(p => p.id === Pessoas.editando);
  if (!primeira && !at.admin && antigo?.id !== at.id) return toast('Só a pessoa responsável cadastra outras pessoas.');
  if (!antigo && Pessoas.lista.some(p => semAcento(p.nome).toLowerCase() === semAcento(nome).toLowerCase())) return toast('Já existe uma pessoa com esse nome.');
  const sal = b64Ag(crypto.getRandomValues(new Uint8Array(16))), iter = 150000;
  const p = { ...(antigo || { id: uid(), criado: Date.now(), criadoPor: at?.nome || '' }), nome, sal, iter, hash: await hashSenhaAg(s1, sal, iter),
    admin: primeira || (at?.admin ? $('#sgapAdmin').checked : !!antigo?.admin), ativo: true, alterado: Date.now() };
  if (antigo?.admin && !p.admin && !Pessoas.lista.some(x => x.admin && x.id !== p.id)) { p.admin = true; toast('Fica responsável: precisa haver pelo menos uma pessoa responsável.'); }
  await gravarItemSec('usu', p, { rotulo: 'esta pessoa' });
  await carregarPessoas();
  if (primeira) { Pessoas.atual = { id: p.id, nome: p.nome, admin: true }; Pessoas.ultimoUso = Date.now(); lsAg('ultimaPessoa', p.id); }
  toast(antigo ? `🔑 Senha de ${p.nome} trocada.` : `👥 ${p.nome} cadastrada.`);
  renderLoginAg();
  if (at && !at.admin) { $('#sgaPessoas').hidden = true; return; }
  limparFormPessoaAg(null); renderPessoasAg();
}
async function tirarPessoaAg(id) {
  const p = Pessoas.lista.find(x => x.id === id);
  if (!p || !exigirLoginAg() || !sessaoAg().admin) return;
  if (p.admin && !Pessoas.lista.some(x => x.admin && x.id !== p.id)) return toast('Precisa haver pelo menos uma pessoa responsável.');
  if (!confirm(`Tirar o acesso de ${p.nome} à agenda?\n\n(Os compromissos que ela criou continuam na agenda.)`)) return;
  await apagarItemSec('usu', id);
  await carregarPessoas();
  renderPessoasAg(); renderLoginAg();
}

// ---------------------------------------------------------------- conta e agenda escolhida
async function statusAg() {
  if (!NO_APP) return;
  try { const r = await arqApp('agendaStatus'); Object.assign(AG, { temCliente: r.temCliente, conectado: r.conectado, email: r.email || '' }); }
  catch (err) { AG.erro = err.message; }
}
async function carregarCalsAg() {
  const d = await agApi('GET', 'users/me/calendarList?minAccessRole=reader&maxResults=250');
  AG.cals = (d?.items || []).map(c => ({ id: c.id, nome: c.summaryOverride || c.summary || c.id, cor: c.backgroundColor || '#888', accessRole: c.accessRole, tz: c.timeZone, primaria: !!c.primary }))
    .sort((a, b) => (b.primaria - a.primaria) || a.nome.localeCompare(b.nome, 'pt-BR'));
  const salvo = lsAg('cal');
  AG.calId = AG.cals.some(c => c.id === salvo) ? salvo : (AG.cals.find(c => !c.primaria && podeEscreverC(c)) || AG.cals[0])?.id || '';
}
const podeEscreverC = c => ['owner', 'writer'].includes(c.accessRole);

function renderContaAg() {
  const el = $('#sgaConta');
  if (!NO_APP) { el.innerHTML = '<span class="sutil">A agenda do Google só funciona no aplicativo para Windows.</span>'; return; }
  if (!AG.conectado) {
    el.innerHTML = `<span>📆 A agenda ainda não está ligada a uma conta.</span>
      ${AG.temCliente ? '' : '<button type="button" data-sga="cliente" title="O mesmo arquivo JSON usado na nuvem da paróquia (Google Cloud → Clientes → Fazer download do JSON)">📄 Carregar o ID do cliente…</button>'}
      <button type="button" data-sga="conectar" class="primario" ${AG.temCliente ? '' : 'disabled'}>🔗 Ligar a uma conta do Google…</button>`;
    return;
  }
  const c = calAtualAg();
  el.innerHTML = `<span>Conta: <b>${esc(AG.email || '(conta do Google)')}</b></span>
    <label class="campo-inline">Agenda <select id="sgaCal">${AG.cals.map(k => `<option value="${esc(k.id)}" ${k.id === AG.calId ? 'selected' : ''}>${k.primaria ? '★ ' : ''}${esc(k.nome)}${podeEscreverC(k) ? '' : ' (só leitura)'}</option>`).join('')}</select></label>
    ${c ? `<span class="card-ponto" style="background:${esc(c.cor)}"></span>` : ''}
    ${c && !podeEscreverAg() ? '<span class="mc-alerta" title="Esta conta só pode ver esta agenda. Peça para a dona da agenda dar a permissão Fazer alterações nos eventos.">só leitura</span>' : ''}
    <span class="espaco"></span>
    <button type="button" data-sga="conectar" title="Ligar outra conta do Google">Trocar de conta…</button>
    <button type="button" data-sga="desligar" title="Desliga a agenda neste computador (não apaga nada no Google)">Desligar</button>`;
}

async function conectarAg() {
  if (AG.conectado && Pessoas.lista.length && !exigirLoginAg()) return;
  toast('🌐 Abrindo o navegador: entre com a conta da agenda e autorize.');
  try {
    const r = await arqApp('agendaConectar', {}, 330000);
    AG.conectado = true; AG.email = r.email || '';
    await carregarCalsAg();
    toast(`📆 Agenda ligada${AG.email ? ' à conta ' + AG.email : ''}.`);
  } catch (err) { toast('Não ligou: ' + err.message); }
  mostrarCartaoAgendaG();
  renderContaAg(); await buscarEventosAg();
}
async function desligarAg() {
  if (Pessoas.lista.length && !exigirLoginAg()) return;
  if (!confirm('Desligar a agenda do Google neste computador?\n\nNada é apagado no Google; para ver de novo, é só ligar outra vez.')) return;
  await arqApp('agendaDesconectar');
  Object.assign(AG, { conectado: false, email: '', cals: [], calId: '', eventos: [] });
  mostrarCartaoAgendaG();
  renderContaAg(); renderListaAg();
}

// ---------------------------------------------------------------- compromissos
function periodoAg() {
  const r = AG.ref || new Date();
  let a, b;
  if (AG.visao === 'dia') a = b = new Date(r.getFullYear(), r.getMonth(), r.getDate());
  else if (AG.visao === 'semana') { a = new Date(r.getFullYear(), r.getMonth(), r.getDate() - r.getDay()); b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6); }
  else { a = new Date(r.getFullYear(), r.getMonth(), 1); b = new Date(r.getFullYear(), r.getMonth() + 1, 0); }
  return { a, b, fimEx: new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1) };
}
function rotuloPeriodoAg() {
  const { a, b } = periodoAg();
  if (AG.visao === 'dia') return `${DIAS[a.getDay()]}, ${dataBR(isoData(a))}`;
  if (AG.visao === 'mes') return `${MESES[a.getMonth()]} de ${a.getFullYear()}`;
  return `${dataBR(isoData(a))} a ${dataBR(isoData(b))}`;
}

// a descrição do Google pode vir com HTML (<br>, <a>…): para mostrar e editar, só o texto
function textoSimplesAg(s) {
  if (!s || !/[<&]/.test(s)) return s || '';
  const t = document.createElement('textarea');
  t.innerHTML = s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n').replace(/<[^>]+>/g, '');
  return t.value.trim();
}
function lerEventoAg(g) {
  const dia = !!g.start?.date;
  const ini = dia ? deIso(g.start.date) : new Date(g.start?.dateTime);
  const fim = dia ? deIso(g.end?.date || g.start.date) : new Date(g.end?.dateTime || g.start?.dateTime);
  const pv = g.extendedProperties?.private || {};
  return { id: g.id, titulo: g.summary || '(sem título)', ini, fim, diaInteiro: dia, local: g.location || '', desc: textoSimplesAg(g.description),
    descBruta: g.description || '', cor: g.colorId || '', serie: g.recurringEventId || '', por: pv.secretariaPor || '', quando: pv.secretariaQuando || '',
    atualizado: g.updated || '', criador: g.creator?.email || '',
    // mudado direto no Google (celular, site) DEPOIS da última mudança pela Secretaria: o "✎ fulano" não é mais a última palavra
    foraDepois: !!(pv.secretariaQuando && g.updated && new Date(g.updated) - new Date(pv.secretariaQuando) > 60000) };
}
// dias (ISO) em que o compromisso aparece: o de vários dias aparece em cada um
function diasDoEventoAg(e) {
  const lim = new Date(e.fim.getTime() - 1), out = [];
  for (let d = new Date(e.ini.getFullYear(), e.ini.getMonth(), e.ini.getDate()); d <= lim && out.length < 62; d.setDate(d.getDate() + 1)) out.push(isoData(d));
  return out.length ? out : [isoData(e.ini)];
}

async function buscarEventosAg() {
  if (!AG.conectado || !AG.calId) { AG.eventos = []; return renderListaAg(); }
  const busca = AG.busca.trim(), { a, fimEx } = periodoAg(), hoje = new Date();
  const ini = busca ? new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1) : a, fim = busca ? new Date(hoje.getFullYear() + 2, 0, 1) : fimEx;
  const pedido = ++AG.pedido;
  AG.carregando = true; AG.erro = ''; renderListaAg();
  try {
    let itens = [], pagina = '';
    do {
      const q = `singleEvents=true&orderBy=startTime&maxResults=2500&timeMin=${encodeURIComponent(ini.toISOString())}&timeMax=${encodeURIComponent(fim.toISOString())}`
        + (busca ? '&q=' + encodeURIComponent(busca) : '') + (pagina ? '&pageToken=' + encodeURIComponent(pagina) : '');
      const d = await agApi('GET', `${calPathAg()}/events?${q}`);
      itens = itens.concat(d?.items || []);
      pagina = d?.nextPageToken || '';
    } while (pagina && itens.length < 10000);
    if (pedido !== AG.pedido) return;      // a pessoa já mudou de período: vale o pedido mais novo
    AG.eventos = itens.filter(g => g.status !== 'cancelled').map(lerEventoAg);
  } catch (err) { if (pedido === AG.pedido) { AG.erro = err.message; AG.eventos = []; } }
  if (pedido !== AG.pedido) return;
  AG.carregando = false;
  renderListaAg();
}

function renderListaAg() {
  const el = $('#sgaLista');
  if (!el) return;
  $$('[data-sga-visao]').forEach(b => b.classList.toggle('ativa', b.dataset.sgaVisao === AG.visao));
  const busca = AG.busca.trim();
  $('#sgaPeriodo').textContent = busca ? 'Procurando (de 1 ano atrás a 2 anos à frente)' : rotuloPeriodoAg();
  const pode = podeEscreverAg();
  $('#sgaNovo').disabled = !AG.conectado || !pode;
  if (!AG.conectado) { el.innerHTML = '<p class="sutil">Ligue a agenda a uma conta do Google (no alto) para ver os compromissos aqui.</p>'; return; }
  if (AG.erro) { el.innerHTML = `<p class="mc-conflito">⚠ ${esc(AG.erro)} <button type="button" data-sga="recarregar">Tentar de novo</button></p>`; return; }
  if (AG.carregando && !AG.eventos.length) { el.innerHTML = '<p class="sutil">Carregando a agenda…</p>'; return; }
  const { a, b } = periodoAg(), porDia = new Map();
  if (!busca && AG.visao !== 'mes') for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) porDia.set(isoData(d), []);
  for (const e of AG.eventos) for (const iso of diasDoEventoAg(e)) {
    if (!busca && (iso < isoData(a) || iso > isoData(b))) continue;
    if (!porDia.has(iso)) porDia.set(iso, []);
    porDia.get(iso).push(e);
  }
  const cal = calAtualAg(), dias = [...porDia.keys()].sort(), hojeI = hojeIso();
  el.innerHTML = dias.length ? dias.map(iso => {
    const d = deIso(iso), es = porDia.get(iso).sort((x, y) => (y.diaInteiro - x.diaInteiro) || (x.ini - y.ini));
    return `<div class="mc-dia ${es.length ? '' : 'vazio'} ${iso === hojeI ? 'sga-hoje' : ''}"><div class="mc-dia-tit">${DIAS[d.getDay()]}, ${dataBR(iso)}${iso === hojeI ? ' · <b>hoje</b>' : ''}</div>
      ${es.map(e => {
        const cor = CORES_AG.find(c => c[0] === e.cor)?.[2] || cal?.cor || '#888';
        const hora = e.diaInteiro ? 'dia todo' : `${hhmm(e.ini)}<small>–${hhmm(e.fim)}</small>`;
        const extra = [e.local, e.desc.split('\n')[0]].filter(Boolean).map(esc).join(' · ');
        const curto = t => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const por = e.por ? `✎ ${esc(e.por)}${e.quando ? ' · ' + curto(e.quando) : ''}${e.foraDepois ? ` · mudado depois no Google (${curto(e.atualizado)})` : ''}` : '';
        return `<div class="mc-item sga-item" data-id="${esc(e.id)}" title="${esc([e.titulo, e.local, e.desc].filter(Boolean).join('\n'))}">
          <span class="mc-hora">${hora}</span><span class="card-ponto" style="background:${esc(cor)}"></span>
          <span class="mc-txt"><b>${esc(e.titulo)}</b>${e.serie ? ' <span class="sutil" title="Compromisso que se repete">🔁</span>' : ''}
            <small class="sutil">${extra}${extra && por ? ' · ' : ''}${por}</small></span>
          ${pode ? '<button type="button" data-sga-editar title="Abrir / editar">✎</button><button type="button" data-sga-apagar class="perigo" title="Apagar">✕</button>' : '<button type="button" data-sga-editar title="Ver">👁</button>'}
        </div>`;
      }).join('')}</div>`;
  }).join('') : `<p class="sutil">${busca ? 'Nada encontrado.' : 'Nenhum compromisso neste período.'}</p>`;
  if (AG.carregando) el.insertAdjacentHTML('afterbegin', '<p class="sutil pequeno">↻ atualizando…</p>');
}

// ---- formulário do compromisso (os mesmos campos do Google Agenda: título, dia todo, início, término, local, descrição, cor, repetição)
function ajustarFormAg(ev) {
  const dia = $('#sgafDia').checked;
  $('#sgafHora').hidden = $('#sgafHoraFim').hidden = dia;
  if (ev?.target?.id === 'sgafData' && (!$('#sgafDataFim').value || $('#sgafDataFim').value < $('#sgafData').value)) $('#sgafDataFim').value = $('#sgafData').value;
  if (ev?.target?.id === 'sgafHora' && $('#sgafHora').value && $('#sgafData').value === $('#sgafDataFim').value) {
    const m = minutos($('#sgafHora').value) + 60;
    if (!$('#sgafHoraFim').value || minutos($('#sgafHoraFim').value) <= minutos($('#sgafHora').value)) $('#sgafHoraFim').value = hm(Math.min(m, 23 * 60 + 59));
  }
  const c = CORES_AG.find(k => k[0] === $('#sgafCor').value);
  $('#sgafCorPonto').style.background = c?.[2] || calAtualAg()?.cor || '#888';
}
function abrirFormAg(e) {
  const pode = podeEscreverAg();
  AG.editando = e?.id || null;
  AG.abertoAtualizado = e?.atualizado || '';
  AG.descOriginal = e?.desc || '';
  $('#sgaPessoas').hidden = true;
  $('#sgafTit').textContent = !e ? 'Novo compromisso' : pode ? 'Editar compromisso' : 'Compromisso';
  const base = AG.visao === 'dia' ? (AG.ref || new Date()) : new Date();
  $('#sgafTitulo').value = e?.titulo || '';
  $('#sgafDia').checked = !!e?.diaInteiro;
  $('#sgafData').value = isoData(e?.ini || base);
  $('#sgafDataFim').value = e ? isoData(e.diaInteiro ? new Date(e.fim.getTime() - 1) : e.fim) : isoData(base);
  $('#sgafHora').value = e && !e.diaInteiro ? hhmm(e.ini) : '09:00';
  $('#sgafHoraFim').value = e && !e.diaInteiro ? hhmm(e.fim) : '10:00';
  $('#sgafLocal').value = e?.local || '';
  $('#sgafDesc').value = e?.desc || '';
  $('#sgafCor').innerHTML = CORES_AG.map(c => `<option value="${c[0]}">${c[1]}</option>`).join('');
  $('#sgafCor').value = e?.cor || '';
  $('#sgafRepetir').innerHTML = REPETE_AG.map(r => `<option value="${r[0]}">${r[1]}</option>`).join('');
  $('#sgafRepetir').value = '';
  $('#sgafRepetirCampo').hidden = !!e;
  $('#sgafSerie').hidden = !e?.serie;
  $('#sgafQuem').textContent = e ? [e.por ? `Última mudança pela Secretaria: ${e.por}${e.quando ? ' em ' + new Date(e.quando).toLocaleString('pt-BR') : ''}` : '',
    e.foraDepois ? `Mudado depois direto no Google em ${new Date(e.atualizado).toLocaleString('pt-BR')}` : '',
    e.criador ? `Criado no Google por ${e.criador}` : ''].filter(Boolean).join(' · ') : '';
  for (const x of $$('#sgaForm input, #sgaForm textarea, #sgaForm select')) x.disabled = !pode;
  $('#sgafSalvar').hidden = !pode;
  $('#sgaForm').hidden = false;
  ajustarFormAg();
  $('#sgaForm').scrollIntoView({ block: 'nearest' });
  if (pode) $('#sgafTitulo').focus();
}
function quandoGoogleAg(data, hora, tz) { return { dateTime: `${data}T${hora}:00`, timeZone: tz || 'America/Sao_Paulo' }; }

async function salvarFormAg() {
  if (!exigirLoginAg()) return;
  const titulo = $('#sgafTitulo').value.trim(), dia = $('#sgafDia').checked;
  const data = $('#sgafData').value, dataFim = $('#sgafDataFim').value || data, hora = $('#sgafHora').value, horaFim = $('#sgafHoraFim').value;
  if (!titulo) { toast('Escreva o título.'); return $('#sgafTitulo').focus(); }
  if (!data) { toast('Escolha o dia.'); return $('#sgafData').focus(); }
  if (dataFim < data) { toast('O término está antes do início.'); return $('#sgafDataFim').focus(); }
  if (!dia && (!hora || !horaFim)) { toast('Escreva a hora de início e de término (ou marque "dia todo").'); return $('#sgafHora').focus(); }
  if (!dia && dataFim === data && horaFim <= hora) { toast('O término precisa ser depois do início.'); return $('#sgafHoraFim').focus(); }
  const tz = calAtualAg()?.tz, corpo = { summary: titulo, location: $('#sgafLocal').value.trim() };
  const desc = $('#sgafDesc').value.trim();
  if (!AG.editando || desc !== AG.descOriginal) corpo.description = desc;        // sem mudar: mantém a formatação que veio do Google
  if (dia) { const f = deIso(dataFim); f.setDate(f.getDate() + 1); corpo.start = { date: data }; corpo.end = { date: isoData(f) }; }
  else { corpo.start = quandoGoogleAg(data, hora, tz); corpo.end = quandoGoogleAg(dataFim, horaFim, tz); }
  const cor = $('#sgafCor').value;
  if (cor || AG.editando) corpo.colorId = cor || null;
  corpo.extendedProperties = { private: { secretariaPor: Pessoas.atual.nome, secretariaQuando: new Date().toISOString() } };
  if (!AG.editando && $('#sgafRepetir').value) corpo.recurrence = ['RRULE:FREQ=' + $('#sgafRepetir').value];
  const bt = $('#sgafSalvar'); bt.disabled = true;
  try {
    if (AG.editando) {
      // outra pessoa mudou ou apagou o compromisso depois que este foi aberto? (como nas marcações)
      const caminho = `${calPathAg()}/events/${encodeURIComponent(AG.editando)}`;
      let atual = null;
      try { atual = await agApi('GET', caminho); } catch (_) {}
      if (!atual || atual.status === 'cancelled') { if (!confirm('Este compromisso foi apagado na agenda enquanto você editava.\n\nOK = criar de novo com o que está aqui\nCancelar = deixar apagado')) return fecharFormAg(true);
        corpo.description = desc; if (!cor) delete corpo.colorId;
        await agApi('POST', `${calPathAg()}/events`, corpo); }
      else {
        if (atual.updated !== AG.abertoAtualizado) {
          const quem = atual.extendedProperties?.private?.secretariaPor;
          if (!confirm(`Alguém${quem ? ` (${quem})` : ''} mudou este compromisso depois que você abriu (${new Date(atual.updated).toLocaleString('pt-BR')}).\n\nOK = salvar as suas mudanças por cima\nCancelar = descartar as suas e ver a versão nova`)) return fecharFormAg(true);
        }
        await agApi('PATCH', caminho, corpo);
      }
    } else await agApi('POST', `${calPathAg()}/events`, corpo);
    toast(AG.editando ? '📆 Compromisso salvo na agenda.' : '📆 Compromisso criado na agenda.');
    AG.ref = deIso(data);
    fecharFormAg(true);
  } catch (err) { toast('Não salvou: ' + err.message); }
  finally { bt.disabled = false; }
}
function fecharFormAg(recarregar) { $('#sgaForm').hidden = true; AG.editando = null; if (recarregar) buscarEventosAg(); }

async function apagarAg(id) {
  const e = AG.eventos.find(x => x.id === id);
  if (!e || !exigirLoginAg()) return;
  const quando = e.diaInteiro ? dataBR(isoData(e.ini)) : `${dataBR(isoData(e.ini))} ${hhmm(e.ini)}`;
  let alvo = e.id;
  if (e.serie) {
    const tudo = confirm(`"${e.titulo}" se repete.\n\nOK = apagar SÓ o de ${quando}\nCancelar = escolher outra coisa`);
    if (!tudo) {
      if (!confirm(`Apagar TODA a série "${e.titulo}" (todos os dias em que se repete)?\n\nIsso não tem volta pela Secretaria (no Google Agenda, a lixeira guarda por 30 dias).`)) return;
      alvo = e.serie;
    }
  } else if (!confirm(`Apagar da agenda?\n\n${e.titulo}\n${quando}${e.local ? '\n' + e.local : ''}\n\n(No Google Agenda, a lixeira guarda por 30 dias.)`)) return;
  try {
    await agApi('DELETE', `${calPathAg()}/events/${encodeURIComponent(alvo)}`);
    toast('🗑 Apagado da agenda.');
    fecharFormAg(true);
  } catch (err) { toast('Não apagou: ' + err.message); }
}

function imprimirAg() {
  if (!AG.eventos.length) return toast('Nada para imprimir neste período.');
  const busca = AG.busca.trim(), { a, b } = periodoAg();
  const lista = AG.eventos.filter(e => busca || (e.fim > a && e.ini < new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1)));
  const linhas = lista.map(e => `<tr><td>${esc(DIAS[e.ini.getDay()].slice(0, 3))} ${dataBR(isoData(e.ini))}</td><td>${e.diaInteiro ? 'dia todo' : hhmm(e.ini) + '–' + hhmm(e.fim)}</td>
    <td><b>${esc(e.titulo)}</b></td><td>${esc(e.local)}</td><td>${esc(e.desc).replace(/\n/g, '<br>')}</td></tr>`).join('');
  imprimirFolhaSec('Agenda da secretaria', `${calAtualAg()?.nome || ''} · ${busca ? `procura: "${busca}"` : rotuloPeriodoAg()}`,
    `<table><thead><tr><th>Dia</th><th>Hora</th><th>Compromisso</th><th>Local</th><th>Observações</th></tr></thead><tbody>${linhas}</tbody></table>`, 'Agenda da secretaria');
}

// ---------------------------------------------------------------- janela
const HTML_AGENDA_G = `
<dialog id="dlgAgendaG" class="dlg-sec dlg-sec-largo">
  <form method="dialog" class="form">
    <h2>📆 Agenda da secretaria <small class="sutil pequeno">· Google Agenda · protótipo</small></h2>
    <div id="sgaConta" class="linha sga-conta"></div>
    <div id="sgaLogin" class="linha sga-login"></div>
    <div class="linha sec-filtros">
      <span class="sec-visoes"><button type="button" data-sga-visao="dia">Dia</button><button type="button" data-sga-visao="semana">Semana</button><button type="button" data-sga-visao="mes">Mês</button></span>
      <span class="sec-nav"><button type="button" data-sga-nav="-1" title="Anterior">◀</button><button type="button" data-sga-nav="0">Hoje</button><button type="button" data-sga-nav="1" title="Próximo">▶</button></span>
      <b id="sgaPeriodo" class="sec-periodo"></b>
      <span class="espaco"></span>
      <input id="sgaBusca" type="search" placeholder="🔎 Procurar na agenda…" autocomplete="off">
      <button type="button" data-sga="recarregar" title="Buscar de novo no Google (mudanças feitas no celular ou no site)">↻</button>
    </div>
    <div id="sgaLista" class="mc-lista"></div>
    <div id="sgaForm" class="mc-form" hidden>
      <h3 id="sgafTit">Novo compromisso</h3>
      <div class="linha"><label class="campo mc-larga">Título <input id="sgafTitulo" placeholder="Ex.: Batizado — família Silva · Reunião do CPP · Padre fora"></label>
        <label class="campo">Cor <span class="sga-cor"><span id="sgafCorPonto" class="card-ponto"></span><select id="sgafCor"></select></span></label></div>
      <div class="linha">
        <label class="check"><input type="checkbox" id="sgafDia"> dia todo</label>
        <label class="campo">Início <span class="sga-quando"><input type="date" id="sgafData"><input type="time" id="sgafHora"></span></label>
        <label class="campo">Término <span class="sga-quando"><input type="date" id="sgafDataFim"><input type="time" id="sgafHoraFim"></span></label>
        <label class="campo" id="sgafRepetirCampo">Repetir <select id="sgafRepetir"></select></label>
      </div>
      <p id="sgafSerie" class="sutil pequeno" hidden>🔁 Este compromisso se repete: o que você mudar aqui vale <b>só para este dia</b>.</p>
      <div class="linha"><label class="campo mc-larga">Local <input id="sgafLocal" placeholder="Matriz, salão paroquial, sala 2…"></label></div>
      <div class="linha"><label class="campo mc-larga">Descrição <textarea id="sgafDesc" data-sem-formato rows="3" placeholder="O que a secretaria costuma anotar: quem, telefone, documentos, observações…"></textarea></label></div>
      <p id="sgafQuem" class="sutil pequeno"></p>
      <div class="linha"><span class="espaco"></span>
        <button type="button" id="sgafCancelar">Fechar</button>
        <button type="button" id="sgafSalvar" class="primario">Salvar na agenda</button></div>
    </div>
    <div id="sgaPessoas" class="mc-form" hidden>
      <h3 id="sgapTit">👥 Quem pode mexer na agenda</h3>
      <p class="sutil pequeno">Ver a agenda é livre. Para criar, mudar ou apagar, a pessoa entra com o nome e a senha dela, e o compromisso guarda quem mexeu.
        O cadastro vai pela nuvem da paróquia só para os outros computadores da secretaria; a senha não vai (só uma "impressão digital" dela, que não dá para desfazer).</p>
      <div id="sgapLista"></div>
      <div class="linha">
        <label class="campo">Nome <input id="sgapNome" placeholder="Ex.: Daisy"></label>
        <label class="campo">Senha <input id="sgapSenha" type="password" autocomplete="new-password"></label>
        <label class="campo">Repita a senha <input id="sgapSenha2" type="password" autocomplete="new-password"></label>
        <label class="check" id="sgapAdminLinha"><input type="checkbox" id="sgapAdmin"> responsável (cadastra e tira pessoas)</label>
      </div>
      <div class="linha"><span class="espaco"></span><button type="button" id="sgapNovo">Limpar</button><button type="button" id="sgapFechar">Fechar</button>
        <button type="button" id="sgapSalvar" class="primario">Cadastrar pessoa</button></div>
    </div>
    <div class="linha">
      <button type="button" id="sgaNovo" class="primario">＋ Novo compromisso</button>
      <button type="button" id="sgaImprimir" title="Lista do período (ou da procura)">🖨 Imprimir…</button>
      <span class="espaco"></span><button value="fechar">Fechar</button>
    </div>
  </form>
</dialog>
<dialog id="dlgAgendaGPergunta" class="dlg-sec">
  <form method="dialog" class="form">
    <h2>📆 Ligar a agenda da secretaria?</h2>
    <p>A Secretaria pode mostrar e editar a <b>agenda que vocês já usam</b> (por exemplo, a agenda compartilhada do Google).</p>
    <p class="sutil">A conta da agenda pode ser <b>diferente</b> da conta da nuvem da paróquia (a que leva os avisos para o MiguelAngelus).
      Ver a agenda é livre; para mexer, cada pessoa entra com a sua senha.</p>
    <div class="sga-opcoes">
      <button value="google" class="primario">🔗 Ligar com uma conta do Google</button>
      <button value="outro" disabled title="Em estudo: Outlook, iCloud e outras agendas pelo endereço da agenda (só para ver)">Outro serviço (em breve)</button>
    </div>
    <p class="sutil pequeno">Dá para fazer isso depois em <b>Ajustes → 📆 Agenda da secretaria</b>.</p>
    <div class="linha"><span class="espaco"></span><button value="nao">Agora não</button></div>
  </form>
</dialog>
<style>
  .sga-conta, .sga-login { align-items: center; gap: 8px; flex-wrap: wrap; padding: 6px 10px; border-radius: 8px; background: rgba(127,127,127,.08); }
  .sga-login.sga-logado { background: rgba(60,160,90,.14); }
  .sga-login input[type=password] { width: 140px; }
  .sga-piscar { animation: agPiscar .9s ease 2; }
  @keyframes agPiscar { 50% { box-shadow: 0 0 0 3px #d9a41b; } }
  .campo-inline { display: inline-flex; align-items: center; gap: 6px; }
  .sga-quando, .sga-cor { display: inline-flex; gap: 6px; align-items: center; }
  .sga-hoje .mc-dia-tit { color: var(--dourado, #d9a41b); }
  .sga-item { cursor: pointer; }
  #dlgAgendaG:has(#sgaForm:not([hidden])) .mc-lista, #dlgAgendaG:has(#sgaPessoas:not([hidden])) .mc-lista { max-height: 20vh; }
  .sga-opcoes { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
</style>`;

async function abrirAgendaG() {
  if (!$('#dlgAgendaG')) return;
  AG.ref ||= new Date();
  $('#sgaForm').hidden = true; $('#sgaPessoas').hidden = true;
  abrirDialogo('dlgAgendaG');
  await Promise.all([statusAg(), carregarPessoas()]);
  renderLoginAg();
  if (AG.conectado && !AG.cals.length) { try { await carregarCalsAg(); } catch (err) { AG.erro = err.message; } }
  renderContaAg();
  if (AG.erro && !AG.cals.length) return renderListaAg();
  await buscarEventosAg();
}

function ligarAgendaG() {
  const dlg = $('#dlgAgendaG');
  dlg.addEventListener('click', async e => {
    const b = e.target.closest('[data-sga]');
    if (b) {
      switch (b.dataset.sga) {
        case 'cliente':
          try { const r = await arqApp('agendaCarregarCliente'); AG.temCliente = r.temCliente; } catch (err) { if (err.message !== 'cancelado') toast(err.message); }
          return renderContaAg();
        case 'conectar': return conectarAg();
        case 'desligar': return desligarAg();
        case 'entrar': return entrarAg();
        case 'sair': return sairAg();
        case 'pessoas': return abrirPessoasAg();
        case 'recarregar': AG.erro = ''; if (AG.conectado && !AG.cals.length) { try { await carregarCalsAg(); renderContaAg(); } catch (err) { AG.erro = err.message; return renderListaAg(); } } return buscarEventosAg();
      }
    }
    const v = e.target.closest('[data-sga-visao]');
    if (v) { AG.visao = v.dataset.sgaVisao; return buscarEventosAg(); }
    const n = e.target.closest('[data-sga-nav]');
    if (n) {
      const k = +n.dataset.sgaNav, r = AG.ref || new Date();
      AG.ref = !k ? new Date() : AG.visao === 'dia' ? new Date(r.getFullYear(), r.getMonth(), r.getDate() + k)
        : AG.visao === 'semana' ? new Date(r.getFullYear(), r.getMonth(), r.getDate() + 7 * k) : new Date(r.getFullYear(), r.getMonth() + k, 1);
      return buscarEventosAg();
    }
    const it = e.target.closest('.sga-item');
    if (it && e.target.closest('[data-sga-apagar]')) return apagarAg(it.dataset.id);
    if (it) return abrirFormAg(AG.eventos.find(x => x.id === it.dataset.id));
    const p = e.target.closest('#sgapLista [data-p]');
    if (p && e.target.closest('[data-sgap="tirar"]')) return tirarPessoaAg(p.dataset.p);
    if (p && e.target.closest('[data-sgap="senha"]')) return limparFormPessoaAg(Pessoas.lista.find(x => x.id === p.dataset.p));
  });
  dlg.addEventListener('change', e => {
    if (e.target.id === 'sgaCal') { AG.calId = e.target.value; lsAg('cal', AG.calId); renderContaAg(); fecharFormAg(false); return buscarEventosAg(); }
    if (e.target.closest('#sgaForm')) ajustarFormAg(e);
  });
  let tBusca = 0;
  $('#sgaBusca').addEventListener('input', e => { AG.busca = e.target.value; clearTimeout(tBusca); tBusca = setTimeout(buscarEventosAg, 500); });
  $('#sgaNovo').addEventListener('click', () => { if (exigirLoginAg()) abrirFormAg(null); });
  $('#sgaImprimir').addEventListener('click', imprimirAg);
  $('#sgafSalvar').addEventListener('click', salvarFormAg);
  $('#sgafCancelar').addEventListener('click', () => fecharFormAg(false));
  $('#sgapSalvar').addEventListener('click', salvarPessoaAg);
  $('#sgapNovo').addEventListener('click', () => limparFormPessoaAg(null));
  $('#sgapFechar').addEventListener('click', () => { $('#sgaPessoas').hidden = true; });
  // Enter: na senha do login entra; nos outros campos de uma linha não fecha a janela (form method=dialog)
  dlg.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.matches('input')) return;
    e.preventDefault();
    if (e.target.id === 'sgalSenha') entrarAg();
    else if (e.target.closest('#sgaPessoas')) salvarPessoaAg();
  });
  dlg.addEventListener('input', () => { if (sessaoAg()) Pessoas.ultimoUso = Date.now(); });
  dlg.addEventListener('close', () => { $('#sgaForm').hidden = true; $('#sgaPessoas').hidden = true; });

  const pergunta = $('#dlgAgendaGPergunta');
  pergunta.addEventListener('close', async () => {
    lsAg('perguntou', '1');
    if (pergunta.returnValue !== 'google') return;
    await abrirAgendaG();
    if (!AG.conectado && AG.temCliente) conectarAg();
  });
}

// Primeira vez que o programa abre neste computador: pergunta (na atualização não, porque já fica marcado).
// Espera a tela de abertura e a janela da nuvem (que abre sozinha numa Secretaria nova) fecharem.
function perguntarAgendaGNaPrimeiraVez() {
  if (!NO_APP || lsAg('perguntou')) return;
  const tentar = async () => {
    if ($('#splash') && !$('#splash').hidden && getComputedStyle($('#splash')).display !== 'none') return setTimeout(tentar, 1500);
    if ([...document.querySelectorAll('dialog')].some(d => d.open)) return setTimeout(tentar, 2000);
    await statusAg();
    if (AG.conectado) return lsAg('perguntou', '1');     // já ligada (ex.: dados de outra instalação)
    abrirDialogo('dlgAgendaGPergunta');
  };
  setTimeout(tentar, 3000);
}

// O cartão "📆 Agenda da secretaria" da tela inicial só aparece depois que a agenda é ligada (Ajustes → 📆 Agenda da secretaria).
// Quem não liga vê a Secretaria exatamente como antes (sem cartão e sem pergunta).
function mostrarCartaoAgendaG() {
  const c = document.querySelector('#secretaria [data-sec="agendaG"]');
  if (c) c.hidden = !AG.conectado;
}

function iniciarAgendaG() {
  document.body.insertAdjacentHTML('beforeend', HTML_AGENDA_G);
  ligarAgendaG();
  carregarPessoas();
  statusAg().then(mostrarCartaoAgendaG);
  // (decidido 15/11) sem a pergunta na primeira vez: liga-se só pelo menu Ajustes. perguntarAgendaGNaPrimeiraVez() fica guardada.
}
