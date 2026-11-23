'use strict';
/*
 * Secretaria MiguelAngelus (1.1, em desenvolvimento): menu do topo (Ajustes e Ajuda), Agenda de marcações por igreja
 * e Intenções de Missa. Só roda no modo Secretaria (iniciarCadastrosSecretaria é chamada por iniciarSecretaria).
 *
 * Regra geral (BACKLOG da Secretaria): o que sai da Secretaria para o MiguelAngelus e para os celulares são só os avisos
 * e os eventos (e, desde a 1.5.0, os nomes das intenções, só se a paróquia ligar a chave). As marcações, intenções e eventos são COMPARTILHADOS entre
 * os computadores da secretaria pela nuvem da paróquia, numa pasta só da Secretaria ("secretaria/", ver sincronia.js),
 * que o MiguelAngelus não lê. Um registro por item no store "config":
 *  - { id: 'secm-<id>', item: {…} } marcação · { id: 'seci-<id>', item } intenção · { id: 'sece-<id>', item } evento
 * Item por item: duas pessoas mexendo em itens diferentes não se atrapalham; no mesmo item vale o mais novo, e quem vai
 * salvar por cima de uma mudança feita em outro computador (ou de um item apagado lá) é avisado antes (gravarItemSec).
 * Usa $, $$, esc, uid, toast, S, DB, Agenda, ocorrencias, localDe, nomeCurtoLocal, opcoesLocais, isoData, deIso, hojeIso,
 * dataBR, DIAS, MESES, ehMissa, abrirDialogo, abrirAjustes, abrirAgenda, escolherPastaImagens, verificarAtualizacao,
 * htmlVersoes, NOVIDADES_SECRETARIA, aplicarTemaApp, salvarConfig, NO_APP (em tempo de execução).
 */

// ---------------------------------------------------------------- menu do topo
const MENU_SECRETARIA = `
  <div class="menu"><button class="menu-titulo">Ajustes</button>
    <div class="menu-itens">
      <button data-menu="sec-nuvem">☁ Nuvem da paróquia (Google Drive)…</button>
      <button data-menu="sec-agendaG">📆 Agenda da secretaria (conta própria)…</button>
      <button data-menu="sec-pasta">🖼 Pasta das imagens do Holyrics…</button>
      <hr>
      <button data-menu="sec-paroquia">🏛 Paróquia e comunidades…</button>
      <button data-menu="sec-intTelao">🕯 Intenções no MiguelAngelus (telão)…</button>
      <button data-menu="sec-escMA">📋 Escalas no MiguelAngelus (celulares)…</button>
      <button data-menu="sec-lgpd">🔒 Dados de uma pessoa (LGPD)…</button>
      <hr>
      <button data-menu="sec-tema">🌓 Tema claro / escuro</button>
      <button data-menu="sec-aparencia">🖥️ Aparência do aplicativo…</button>
    </div>
  </div>
  <div class="menu"><button class="menu-titulo">Ajuda</button>
    <div class="menu-itens">
      <button data-menu="sec-comoUsar">📘 Como usar a Secretaria… <span class="atalho">F1</span></button>
      <button data-menu="sec-videos">▶ Vídeos tutoriais (YouTube)</button>
      <button data-menu="sec-site">🌐 Site do MiguelAngelus</button>
      <button data-menu="sec-email">✉ Dúvidas e sugestões por e-mail</button>
      <hr>
      <button data-menu="sec-novidades">📋 Novidades da Secretaria…</button>
      <button data-menu="atualizar">Procurar atualizações…</button>
      <hr>
      <button data-menu="sobre">Sobre a Secretaria MiguelAngelus…</button>
    </div>
  </div>`;

function abrirEndereco(url) {
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}

function acaoMenuSecretaria(acao) {
  switch (acao) {
    case 'nuvem': return abrirAjustes('sync');
    case 'agendaG': return abrirAgendaG();
    case 'pasta':
      if (!NO_APP) return toast('A pasta das imagens se escolhe só no aplicativo para Windows.');
      return escolherPastaImagens().then(ok => ok && toast('🖼 Pasta das imagens: ' + S.config.avisosPastaImagens));
    case 'paroquia': return abrirAgenda('paroquia');
    case 'intTelao': return abrirIntTelao();
    case 'escMA': return abrirEscMA();     // (1.6.0) escala.js
    case 'lgpd': return abrirLgpd();
    case 'tema':
      S.config.temaApp = S.config.temaApp === 'claro' ? 'escuro' : 'claro';
      aplicarTemaApp(); salvarConfig();
      return toast(S.config.temaApp === 'claro' ? '☀ Tema claro' : '🌙 Tema escuro');
    case 'aparencia': return abrirAjustes('app');
    case 'comoUsar': return abrirDialogo('dlgComoUsarSec');
    case 'videos': return abrirEndereco('https://www.youtube.com/@MiguelAngelusapp');
    case 'site': return abrirEndereco('https://pascom-sjo.github.io/');
    case 'email': return abrirEndereco('mailto:contato.miguelangelus@gmail.com?subject=Secretaria%20MiguelAngelus');
    case 'novidades':
      $('#novTitulo').textContent = '📋 Novidades da Secretaria MiguelAngelus';
      $('#novCorpo').innerHTML = htmlVersoes(NOVIDADES_SECRETARIA);
      return abrirDialogo('dlgNovidades');
  }
}

const HTML_COMO_USAR_SEC = `
<dialog id="dlgComoUsarSec" class="dlg-sec">
  <form method="dialog" class="form">
    <h2>📘 Como usar a Secretaria MiguelAngelus</h2>
    <div class="sec-ajuda">
      <h3>1. A nuvem da paróquia</h3>
      <p>Em <b>Ajustes → Nuvem da paróquia</b>, conecte a mesma conta do Google Drive usada no MiguelAngelus. Assim a Agenda
        e os Avisos feitos aqui chegam sozinhos ao computador da projeção.</p>
      <h3>2. Agenda e avisos (vão para o MiguelAngelus)</h3>
      <p><b>📅 Calendário</b> e <b>⛪ Celebrações recorrentes</b> cuidam das Missas de cada comunidade.
        <b>📢 Avisos paroquiais</b>: o texto, de quando até quando vale e em quais comunidades.
        Clicando numa celebração dos <b>Próximos 7 dias</b>, sai a folha para o ambão (ou PDF) e as imagens para o Holyrics.</p>
      <h3>3. Marcações e intenções (só entre as Secretarias)</h3>
      <p><b>📒 Agenda de marcações</b>: batizados, casamentos, 15 anos, Missas de 7º dia, crisma, 1ª comunhão e outras, por igreja,
        com aviso quando dois horários se chocam. <b>🕯 Intenções de Missa</b>: as intenções de cada celebração, a folha para ler
        na Missa e o relatório das ofertas.</p>
      <p class="sutil">Nomes, telefones e ofertas são dados pessoais: vão pela nuvem da paróquia só para os outros computadores da secretaria, não vão para o MiguelAngelus,
        nem para o telão, nem para o site.</p>
      <p class="sutil">Se uma pessoa pedir para ver ou apagar os dados dela (LGPD): <b>Ajustes → 🔒 Dados de uma pessoa</b> procura pelo nome ou telefone,
        imprime o relatório e apaga o que for marcado.</p>
      <h3>📋 Escalas (só entre as Secretarias)</h3>
      <p>Comece por <b>⚙ Funções</b> (quais existem, quantas vagas, por equipes ou rodízio) e <b>🙋 Pessoas</b>. Em <b>👥 Equipes e agenda</b>, cada equipe
        com os membros e a agenda dela, como nas celebrações recorrentes: a Missa e a semana do mês (toda semana, 1ª, 2ª… última).
        Em <b>📅 Escala do mês</b> aparece tudo: escreva por cima para trocar numa Missa só, use <b>🎲 Sugerir o rodízio</b> para
        coroinhas e acólitos e <b>🖨 Imprimir</b> a folha do mês.</p>
      <p>Se a equipe já faz a escala dela: <b>⬇ Planilha padrão…</b> baixa a planilha do mês com as Missas da Agenda para o coordenador
        preencher (uma coluna por vaga). Quando ela voltar, <b>📎 Subir arquivo ou planilha…</b> guarda o arquivo no mês, lê os nomes
        e mostra a prévia: diga qual coluna é qual função, confira e clique em <b>Pôr na escala</b>. PDF também é lido (quando tem texto,
        não foto); imagem fica só guardada para consulta.</p>
      <h3>4. Eventos com QR code</h3>
      <p><b>🎉 Eventos</b>: título, data, local, descrição e o cartaz. Quem aponta a câmera do celular para o QR salva o evento na agenda.
        A Secretaria monta a <b>imagem para o Holyrics</b> (cartaz à esquerda, QR à direita) e o <b>cartaz A4 com QR</b> para o mural.</p>
      <p><b>Cartaz no Canva:</b> faça em pé, no tamanho <b>1080 × 1350 px</b> (use o modelo da paróquia: Arquivo → Fazer uma cópia),
        baixe em <b>PNG</b> e escolha o arquivo em <b>🖼 Escolher cartaz…</b>. Não ponha QR no cartaz: a Secretaria já coloca.</p>
      <h3>5. Campanhas de arrecadação</h3>
      <p><b>💝 Campanhas</b>: a arte do Canva, o QR code do Pix da campanha (salve a imagem do QR que o banco gera) e a chave,
        a meta e quanto já foi arrecadado. Atualize o "Arrecadado até agora" sempre que quiser: o telão do MiguelAngelus mostra o andamento novo.
        Desmarque "Mostrar os valores" para aparecer só o percentual. <b>⏸ Pausar</b> tira do telão por um tempo; <b>■ Encerrar</b> tira de vez
        (ou deixa o slide de agradecimento, se marcado); <b>▶ Reabrir</b> volta.</p>
      <p>O QR e a chave de cada campanha têm uma <b>senha de 4 números</b>, criada ao salvar: guarde com a coordenação. Sem ela ninguém troca o Pix da campanha.</p>
      <h3>Dúvidas e sugestões</h3>
      <p>Escreva para <b>contato.miguelangelus@gmail.com</b> (Ajuda → Dúvidas e sugestões por e-mail).</p>
    </div>
    <div class="linha"><span class="espaco"></span><button value="ok" class="primario">OK</button></div>
  </form>
</dialog>`;

// ---------------------------------------------------------------- utilidades comuns
const minutos = h => { const m = /^(\d{1,2}):(\d{2})/.exec(h || ''); return m ? +m[1] * 60 + +m[2] : null; };
const hm = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
const reais = v => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const lerReais = s => { const n = parseFloat(String(s || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isFinite(n) ? Math.round(n * 100) / 100 : 0; };
const nomeIgreja = id => { const l = localDe(id); return l ? `${l.tipo} ${l.nome}` : '—'; };

// ---------------------------------------------------------------- itens compartilhados entre as Secretarias
const PREF_SEC = { marc: 'secm-', int: 'seci-', ev: 'sece-', usu: 'secu-', camp: 'secc-', esc: 'secv-' };   // esc: 📋 escala de voluntários (escala.js)   // usu: pessoas da 📆 agenda (secretariaagendag.js); camp: 💝 campanhas (campanhas.js)
const horaCurta = t => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// versao = quando o item foi gravado pela última vez (o "atualizado" do registro), para conferir conflitos
async function lerItensSec(tipo) {
  const p = PREF_SEC[tipo];
  try { return (await DB.todos('config')).filter(r => r.id.startsWith(p) && r.item).map(r => ({ ...r.item, versao: r.atualizado || 0 })); }
  catch (_) { return []; }
}

// Grava um item. `versaoAberta` = a versão que estava aqui quando a pessoa abriu para editar: se outro computador da
// secretaria mudou ou apagou o item depois disso, pergunta antes de passar por cima. Devolve false se a pessoa desistiu.
async function gravarItemSec(tipo, item, { versaoAberta = 0, rotulo = 'este item' } = {}) {
  const id = PREF_SEC[tipo] + item.id;
  if (versaoAberta) {
    const atual = await DB.obter('config', id);
    const outro = SECRETARIA ? 'Outro computador da secretaria' : 'Outro computador';
    if (!atual && !confirm(`${outro} apagou ${rotulo} enquanto você editava.\n\nOK = salvar mesmo assim (volta a existir)\nCancelar = deixar apagado`)) return false;
    if (atual && (atual.atualizado || 0) > versaoAberta && !confirm(`${outro} mudou ${rotulo} (${horaCurta(atual.atualizado)}), depois que você abriu.\n\nOK = salvar as suas mudanças por cima\nCancelar = descartar as suas e ver a versão nova`)) return false;
  }
  const { versao, ...limpo } = item;
  const reg = { id, item: limpo };
  await DB.salvar('config', reg);
  item.versao = reg.atualizado;
  avisarMudancaSec();
  if (tipo === 'int') aposMudarIntencoes();
  if (tipo === 'esc' && typeof aposMudarEscala === 'function') aposMudarEscala();   // (1.6.0) escala.js
  return true;
}
async function apagarItemSec(tipo, id) {
  await DB.remover('config', PREF_SEC[tipo] + id); avisarMudancaSec();
  if (tipo === 'int') aposMudarIntencoes();
  if (tipo === 'esc' && typeof aposMudarEscala === 'function') aposMudarEscala();
}
// (1.5.0) intenção nova, mudada ou apagada: refaz o que vai para o MiguelAngelus (só se a chave estiver ligada)
let timerPubInt = 0;
function aposMudarIntencoes() { clearTimeout(timerPubInt); timerPubInt = setTimeout(() => SECRETARIA && publicarIntencoesTelao(), 400); }

// manda logo para a nuvem (os outros computadores da secretaria recebem em até 2 minutos)
let timerSec = 0;
function avisarMudancaSec() { clearTimeout(timerSec); timerSec = setTimeout(() => typeof enviarSecretaria === 'function' && enviarSecretaria(), 1200); }

// chegou coisa de outro computador (sincronia.js → recarregarDadosDaNuvem): atualiza as listas abertas, sem mexer no formulário
async function recarregarCadastrosSecretaria() {
  await Promise.all([carregarMarcacoes(), carregarIntencoes(), carregarEventos(), carregarCampanhas()]);
  if ($('#dlgMarcacoes')?.open) renderMarcacoes();
  if ($('#dlgIntencoes')?.open) { renderCelebracoesInt(); renderResumoInt(); avisoIntTelao(); }
  if (SECRETARIA) publicarIntencoesTelao();      // (1.5.0) a chave pode ter sido mudada em outro computador
  if ($('#dlgEventos')?.open) renderEventos();
  if ($('#dlgCampanhas')?.open) renderCampanhas();
  if (typeof recarregarEscala === 'function') await recarregarEscala();   // (1.6.0) escala.js
  aposMudarEventos();
  aposMudarCampanhas();      // (1.9.6) campanhas.js: o item 💝 Campanhas do roteiro mostra o andamento novo
}

// MiguelAngelus (aba 🎉 Eventos, eventos.js): a lista da aba e o slide aberto/no ar acompanham as mudanças
function aposMudarEventos() { if (typeof aposMudarEventosMA === 'function') aposMudarEventosMA(); }

// Folha A4 (mesmo jeito da folha dos avisos): título, linha da paróquia e "Página X de Y"
// (1.6.0) { paisagem: true } = A4 deitada (escala do mês, com uma coluna por função)
function imprimirFolhaSec(titulo, subtitulo, corpo, arquivo, { paisagem = false } = {}) {
  const par = Agenda.dados.paroquia || {};
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(arquivo || titulo)}</title><style>
    @page { size: A4${paisagem ? ' landscape' : ''}; margin: ${paisagem ? '12mm 12mm 14mm' : '16mm 15mm 18mm'};
      @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 8pt "Segoe UI", Arial, sans-serif; color: #999; } }
    body { font: 11pt/1.4 "Segoe UI", Arial, sans-serif; color: #111; margin: 0; }
    header { border-bottom: 3px solid #b98507; padding-bottom: 6px; margin-bottom: 12px; }
    header .par { font-size: 9.5pt; color: #555; }
    header h1 { font-size: 18pt; margin: 2px 0; }
    header .sub { font-size: 10.5pt; color: #333; }
    h2 { font-size: 12.5pt; margin: 14px 0 4px; border-bottom: 1px solid #ccc; padding-bottom: 2px; break-after: avoid; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
    th, td { text-align: left; vertical-align: top; padding: 4px 5px; border-bottom: 1px solid #ddd; }
    th { background: #f3efe4; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .03em; }
    tr { break-inside: avoid; }
    .num { text-align: right; white-space: nowrap; }
    .grande { font: 14pt/1.45 Georgia, "Times New Roman", serif; }
    .grande li { margin: 0 0 .35em; }
    .total td { font-weight: 700; border-top: 2px solid #999; }
    .cinza { color: #777; }
    footer { margin-top: 16px; font-size: 8pt; color: #999; text-align: right; }
  </style></head><body>
    <header>${par.nome ? `<div class="par">${esc(par.nome)}</div>` : ''}<h1>${esc(titulo)}</h1>${subtitulo ? `<div class="sub">${esc(subtitulo)}</div>` : ''}</header>
    ${corpo}
    <footer>Secretaria MiguelAngelus · impresso em ${new Date().toLocaleDateString('pt-BR')}</footer>
  </body></html>`;
  $('#quadroImpressao')?.remove();
  const f = document.createElement('iframe');
  f.id = 'quadroImpressao';
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  f.srcdoc = html;
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (err) { toast('Não consegui abrir a impressão: ' + err.message); } };
  document.body.appendChild(f);
}

// ================================================================ AGENDA DE MARCAÇÕES
const TIPOS_MARC = [
  ['batizado', 'Batizado', '💧', 60], ['casamento', 'Casamento', '💍', 60], ['15anos', '15 anos', '🌸', 60],
  ['7dia', 'Missa de 7º dia', '🕯', 60], ['crisma', 'Crisma', '🔥', 120], ['comunhao', '1ª comunhão', '🍞', 90],
  ['bencao', 'Bênção', '✋', 30], ['outra', 'Outra', '📌', 60],
];
const SITUACOES_MARC = [['pre', 'Pré-marcada'], ['confirmada', 'Confirmada'], ['realizada', 'Realizada'], ['cancelada', 'Cancelada']];
const tipoMarc = id => TIPOS_MARC.find(t => t[0] === id) || TIPOS_MARC[TIPOS_MARC.length - 1];

const Marc = { lista: [], visao: 'semana', ref: null, filtroLocal: '', filtroTipo: '', busca: '', editando: null };

async function carregarMarcacoes() { Marc.lista = await lerItensSec('marc'); }

// período mostrado: [início, fim] em ISO
function periodoMarc() {
  const r = Marc.ref || new Date();
  let a, b;
  if (Marc.visao === 'dia') a = b = new Date(r);
  else if (Marc.visao === 'semana') { a = new Date(r.getFullYear(), r.getMonth(), r.getDate() - r.getDay()); b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6); }
  else { a = new Date(r.getFullYear(), r.getMonth(), 1); b = new Date(r.getFullYear(), r.getMonth() + 1, 0); }
  return { ini: isoData(a), fim: isoData(b), a, b };
}
function rotuloPeriodoMarc() {
  const { a, b } = periodoMarc();
  if (Marc.visao === 'dia') return `${DIAS[a.getDay()]}, ${dataBR(isoData(a))}`;
  if (Marc.visao === 'mes') return `${MESES[a.getMonth()]} de ${a.getFullYear()}`;
  return `${dataBR(isoData(a))} a ${dataBR(isoData(b))}`;
}

// Choques de horário: outra marcação na mesma igreja e hora, ou uma celebração da Agenda (a Missa de 7º dia acontece DENTRO de uma Missa)
function conflitosMarc(m) {
  if (m.situacao === 'cancelada' || !m.data || !m.hora) return [];
  const ini = minutos(m.hora), fim = minutos(m.horaFim) || ini + tipoMarc(m.tipo)[3], out = [];
  for (const o of Marc.lista) {
    if (o.id === m.id || o.situacao === 'cancelada' || o.data !== m.data || (o.localId || '') !== (m.localId || '')) continue;
    if (m.tipo === '7dia' && o.tipo === '7dia') continue;           // várias intenções de 7º dia na mesma Missa: normal
    const oi = minutos(o.hora), of = minutos(o.horaFim) || oi + tipoMarc(o.tipo)[3];
    if (oi < fim && ini < of) out.push(`${tipoMarc(o.tipo)[1]} às ${o.hora}${o.nomes ? ` (${o.nomes.split('\n')[0]})` : ''}`);
  }
  if (m.tipo !== '7dia' && m.localId) {
    for (const c of ocorrencias(deIso(m.data))) {
      if (c.cancelada || c.localId !== m.localId) continue;
      const ci = minutos(c.hora), cf = ci + 60;
      if (ci < fim && ini < cf) out.push(`${c.texto} às ${c.hora} (Agenda)`);
    }
  }
  return out;
}

function marcacoesFiltradas(ini, fim) {
  const q = semAcento(Marc.busca.trim());
  return Marc.lista.filter(m => (!ini || (m.data >= ini && m.data <= fim))
      && (!Marc.filtroLocal || m.localId === Marc.filtroLocal)
      && (!Marc.filtroTipo || m.tipo === Marc.filtroTipo)
      && (!q || semAcento([m.nomes, m.celebrante, m.contato, m.obs].join(' ')).includes(q)))
    .sort((x, y) => (x.data + x.hora).localeCompare(y.data + y.hora));
}

const HTML_MARCACOES = `
<dialog id="dlgMarcacoes" class="dlg-sec dlg-sec-largo">
  <form method="dialog" class="form">
    <h2>📒 Agenda de marcações</h2>
    <p class="sutil pequeno sec-privado">🔒 Compartilhada só entre os computadores da Secretaria (pela nuvem da paróquia). Não vai para o MiguelAngelus, nem para o telão.</p>
    <div class="linha sec-filtros">
      <select id="mcLocal" title="Igreja"></select>
      <select id="mcTipo" title="Tipo"></select>
      <span class="sec-visoes"><button type="button" data-mc-visao="dia">Dia</button><button type="button" data-mc-visao="semana">Semana</button><button type="button" data-mc-visao="mes">Mês</button></span>
      <span class="sec-nav"><button type="button" data-mc-nav="-1" title="Anterior">◀</button><button type="button" data-mc-nav="0">Hoje</button><button type="button" data-mc-nav="1" title="Próximo">▶</button></span>
      <b id="mcPeriodo" class="sec-periodo"></b>
      <span class="espaco"></span>
      <input id="mcBusca" type="search" placeholder="🔎 Procurar nome, telefone…" autocomplete="off">
    </div>
    <div id="mcLista" class="mc-lista"></div>
    <div id="mcForm" class="mc-form" hidden>
      <h3 id="mcFormTit">Nova marcação</h3>
      <div class="linha">
        <label class="campo">Tipo <select id="mcfTipo"></select></label>
        <label class="campo">Igreja <select id="mcfLocal"></select></label>
        <label class="campo">Dia <input type="date" id="mcfData"></label>
        <label class="campo">Início <input type="time" id="mcfHora"></label>
        <label class="campo" title="Opcional. Sem o término, o choque de horário considera a duração comum do tipo (1 hora; crisma 2 horas)">Término <input type="time" id="mcfHoraFim"></label>
        <label class="campo mc-missa" hidden>Em qual Missa <select id="mcfMissa"></select></label>
      </div>
      <div class="linha">
        <label class="campo mc-larga">Nomes <textarea id="mcfNomes" data-sem-formato rows="2" placeholder="Noivos, batizandos, aniversariante, falecido(a)…"></textarea></label>
        <label class="campo">Celebrante <input id="mcfCelebrante" placeholder="Pe. …"></label>
      </div>
      <div class="linha">
        <label class="campo">Contato <input id="mcfContato" placeholder="Nome e telefone de quem marcou"></label>
        <label class="campo">Situação <select id="mcfSituacao">${SITUACOES_MARC.map(s => `<option value="${s[0]}">${s[1]}</option>`).join('')}</select></label>
        <label class="campo mc-larga">Observações <input id="mcfObs" placeholder="Documentos entregues, curso de preparação, taxa paga…"></label>
      </div>
      <label class="check mc-int" hidden><input type="checkbox" id="mcfIntencao" checked> Lançar também em <b>🕯 Intenções de Missa</b> (Falecidos, 7º dia)</label>
      <div id="mcfConflito" class="mc-conflito" hidden></div>
      <div class="linha"><span class="espaco"></span>
        <button type="button" id="mcfCancelar">Cancelar</button>
        <button type="button" id="mcfSalvar" class="primario">Salvar marcação</button></div>
    </div>
    <div class="linha">
      <button type="button" id="mcNova" class="primario">＋ Nova marcação</button>
      <button type="button" id="mcImprimir" title="Lista do período escolhido, com os filtros (para o padre e o sacristão)">🖨 Imprimir lista…</button>
      <label class="check pequeno" title="Na folha impressa, mostrar também a coluna Contato"><input type="checkbox" id="mcImpContato"> com contatos</label>
      <span class="espaco"></span><button value="fechar">Fechar</button>
    </div>
  </form>
</dialog>`;

function renderFiltrosMarc() {
  $('#mcLocal').innerHTML = opcoesLocais(Marc.filtroLocal, 'Todas as igrejas');
  $('#mcTipo').innerHTML = '<option value="">Todos os tipos</option>' + TIPOS_MARC.map(t => `<option value="${t[0]}" ${t[0] === Marc.filtroTipo ? 'selected' : ''}>${t[2]} ${t[1]}</option>`).join('');
  $$('[data-mc-visao]').forEach(b => b.classList.toggle('ativa', b.dataset.mcVisao === Marc.visao));
}

function renderMarcacoes() {
  const { ini, fim, a, b } = periodoMarc();
  $('#mcPeriodo').textContent = Marc.busca.trim() ? `Procurando em todas as datas` : rotuloPeriodoMarc();
  const lista = Marc.busca.trim() ? marcacoesFiltradas() : marcacoesFiltradas(ini, fim);
  const porDia = new Map();
  for (const m of lista) { if (!porDia.has(m.data)) porDia.set(m.data, []); porDia.get(m.data).push(m); }
  // na visão de dia e de semana, mostra também os dias vazios com as celebrações da Agenda (para ver onde cabe)
  if (!Marc.busca.trim() && Marc.visao !== 'mes') {
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) if (!porDia.has(isoData(d))) porDia.set(isoData(d), []);
  }
  const dias = [...porDia.keys()].sort();
  $('#mcLista').innerHTML = dias.length ? dias.map(iso => {
    const d = deIso(iso), ms = porDia.get(iso);
    const cels = ocorrencias(d).filter(c => !c.cancelada && (!Marc.filtroLocal || c.localId === Marc.filtroLocal));
    return `<div class="mc-dia ${ms.length ? '' : 'vazio'}"><div class="mc-dia-tit">${DIAS[d.getDay()]}, ${dataBR(iso)}
        ${cels.length ? `<span class="mc-cels" title="Celebrações da Agenda neste dia">⛪ ${cels.map(c => `${esc(c.hora)} ${esc(c.texto)}`).join(' · ')}</span>` : ''}</div>
      ${ms.length ? ms.map(m => {
        const t = tipoMarc(m.tipo), loc = localDe(m.localId), conf = conflitosMarc(m);
        return `<div class="mc-item sit-${m.situacao || 'pre'}" data-id="${m.id}">
          <span class="mc-hora">${esc(m.hora || '--:--')}${m.horaFim ? `<small>–${esc(m.horaFim)}</small>` : ''}</span>
          ${loc ? `<span class="card-ponto" style="background:${loc.cor}" title="${esc(nomeIgreja(m.localId))}"></span>` : ''}
          <span class="mc-tipo">${t[2]} ${esc(t[1])}</span>
          <span class="mc-txt"><b>${esc((m.nomes || '').replace(/\n/g, ' · ') || '(sem nomes)')}</b>
            <small class="sutil">${[loc ? nomeCurtoLocal(loc) : '', m.celebrante, m.contato, m.obs].filter(Boolean).map(esc).join(' · ')}</small></span>
          ${conf.length ? `<span class="mc-alerta" title="Choca com: ${esc(conf.join('; '))}">⚠ choque</span>` : ''}
          <span class="mc-sit">${esc(SITUACOES_MARC.find(s => s[0] === (m.situacao || 'pre'))[1])}</span>
          <button type="button" data-mc-editar title="Editar">✎</button>
          <button type="button" data-mc-apagar class="perigo" title="Apagar">✕</button>
        </div>`;
      }).join('') : ''}</div>`;
  }).join('') : `<p class="sutil">${Marc.busca.trim() ? 'Nada encontrado.' : 'Nenhuma marcação neste período.'}</p>`;
}

function preencherMissasMarc(chaveSel) {
  const data = $('#mcfData').value, local = $('#mcfLocal').value;
  const cels = data ? ocorrencias(deIso(data)).filter(c => !c.cancelada && ehMissa(c.tipo) && (!local || c.localId === local)) : [];
  $('#mcfMissa').innerHTML = cels.map(c => `<option value="${esc(c.chave)}" data-hora="${esc(c.hora)}" data-local="${esc(c.localId || '')}">${esc(c.hora)} · ${esc(c.texto)}</option>`).join('')
    + '<option value="">Outro horário (escrevo ao lado)</option>';
  if (chaveSel !== undefined && [...$('#mcfMissa').options].some(o => o.value === chaveSel)) $('#mcfMissa').value = chaveSel;
}

function ajustarFormMarc(ev) {
  const sete = $('#mcfTipo').value === '7dia';
  $('.mc-missa').hidden = !sete;
  $('.mc-int').hidden = !sete;
  if (sete) {
    // mudou o dia, a igreja ou o tipo: as Missas daquele dia (fica a mesma, se ainda existir; senão a primeira).
    // Escolheu "Outro horário": a hora escrita à mão não é trocada.
    const mudouBase = !ev || ['mcfData', 'mcfLocal', 'mcfTipo'].includes(ev.target?.id);
    if (mudouBase) preencherMissasMarc($('#mcfMissa').value || undefined);
    const op = $('#mcfMissa').selectedOptions[0];
    if (op?.value && (mudouBase || ev.target?.id === 'mcfMissa')) {
      $('#mcfHora').value = op.dataset.hora;
      if (op.dataset.local && !$('#mcfLocal').value) $('#mcfLocal').value = op.dataset.local;
    }
  }
  const m = { ...lerFormMarc(), id: Marc.editando || '' };
  const conf = conflitosMarc(m);
  $('#mcfConflito').hidden = !conf.length;
  $('#mcfConflito').innerHTML = conf.length ? `⚠ <b>Atenção, choque de horário</b> na mesma igreja: ${conf.map(esc).join('; ')}.` : '';
}

function lerFormMarc() {
  return { tipo: $('#mcfTipo').value, localId: $('#mcfLocal').value, data: $('#mcfData').value, hora: $('#mcfHora').value,
    horaFim: $('#mcfHoraFim').value, nomes: $('#mcfNomes').value.trim(), celebrante: $('#mcfCelebrante').value.trim(),
    contato: $('#mcfContato').value.trim(), situacao: $('#mcfSituacao').value, obs: $('#mcfObs').value.trim(),
    missaChave: $('#mcfTipo').value === '7dia' ? $('#mcfMissa').value : '' };
}

function abrirFormMarc(m) {
  Marc.editando = m?.id || null;
  Marc.versaoAberta = m?.versao || 0;
  $('#mcFormTit').textContent = m ? 'Editar marcação' : 'Nova marcação';
  $('#mcfTipo').innerHTML = TIPOS_MARC.map(t => `<option value="${t[0]}">${t[2]} ${t[1]}</option>`).join('');
  $('#mcfLocal').innerHTML = opcoesLocais(m?.localId ?? Marc.filtroLocal, '— escolha a igreja —');
  $('#mcfTipo').value = m?.tipo || Marc.filtroTipo || 'batizado';
  $('#mcfData').value = m?.data || (Marc.visao === 'dia' ? isoData(Marc.ref || new Date()) : hojeIso());
  $('#mcfHora').value = m?.hora || '';
  $('#mcfHoraFim').value = m?.horaFim || '';
  $('#mcfNomes').value = m?.nomes || '';
  $('#mcfCelebrante').value = m?.celebrante || '';
  $('#mcfContato').value = m?.contato || '';
  $('#mcfSituacao').value = m?.situacao || 'pre';
  $('#mcfObs').value = m?.obs || '';
  $('#mcfIntencao').checked = m ? !!Int.lista.find(i => i.marcacaoId === m.id) : true;
  $('#mcfMissa').innerHTML = '';
  preencherMissasMarc(m?.missaChave);
  $('#mcForm').hidden = false;
  ajustarFormMarc(m ? { target: { id: 'abrir' } } : undefined);   // editando: mantém a Missa e a hora que estavam
  $('#mcForm').scrollIntoView({ block: 'nearest' });
  $('#mcfNomes').focus();
}

async function salvarFormMarc() {
  const dados = lerFormMarc();
  if (!dados.data) { toast('Escolha o dia.'); return $('#mcfData').focus(); }
  if (!dados.localId && Agenda.dados.locais.length) { toast('Escolha a igreja.'); return $('#mcfLocal').focus(); }
  if (!dados.nomes) { toast('Escreva os nomes (noivos, batizandos, falecido…).'); return $('#mcfNomes').focus(); }
  const antigo = Marc.lista.find(x => x.id === Marc.editando);
  const m = antigo ? { ...antigo, ...dados, alterado: Date.now() } : { id: uid(), criado: Date.now(), ...dados };
  if (!await gravarItemSec('marc', m, { versaoAberta: antigo ? Marc.versaoAberta : 0, rotulo: 'esta marcação' })) {
    await Promise.all([carregarMarcacoes(), carregarIntencoes()]);       // desistiu: mostra a versão da nuvem
    $('#mcForm').hidden = true; Marc.editando = null;
    return renderMarcacoes();
  }
  if (antigo) Object.assign(antigo, m); else Marc.lista.push(m);
  // Missa de 7º dia: a intenção vai junto (e acompanha as mudanças da marcação)
  const ligada = Int.lista.find(i => i.marcacaoId === m.id);
  if (m.tipo === '7dia' && $('#mcfIntencao').checked && m.situacao !== 'cancelada') {
    const cel = $('#mcfMissa').selectedOptions[0];
    const base = { data: m.data, hora: m.hora, localId: m.localId, chave: m.missaChave || '', tipo: 'falecidos',
      texto: m.nomes.split('\n').map(s => s.trim()).filter(Boolean).join(', ') + ' (7º dia)', pedidoPor: m.contato, marcacaoId: m.id };
    // "a pedido da família" vem pronto na primeira vez; depois fica o que a secretaria escrever
    const it = ligada ? Object.assign(ligada, base) : { id: uid(), criado: Date.now(), oferta: 0, aPedidoDe: 'da família', ...base };
    if (!ligada) Int.lista.push(it);
    await gravarItemSec('int', it);
    toast(`📒 Marcação salva e 🕯 intenção lançada${cel?.value ? ` na Missa das ${cel.textContent.split(' · ')[0]}` : ''}.`);
  } else {
    if (ligada) { Int.lista = Int.lista.filter(i => i !== ligada); await apagarItemSec('int', ligada.id); }
    toast('📒 Marcação salva.');
  }
  $('#mcForm').hidden = true;
  Marc.editando = null;
  Marc.ref = deIso(m.data);
  renderMarcacoes();
}

async function apagarMarc(id) {
  const m = Marc.lista.find(x => x.id === id);
  if (!m || !confirm(`Apagar a marcação?\n\n${tipoMarc(m.tipo)[1]} · ${dataBR(m.data)} ${m.hora || ''}\n${m.nomes}\n\n(Para guardar o histórico, prefira mudar a situação para "Cancelada".)`)) return;
  Marc.lista = Marc.lista.filter(x => x !== m);
  await apagarItemSec('marc', id);
  const lig = Int.lista.find(i => i.marcacaoId === id);
  if (lig && confirm('Apagar também a intenção de 7º dia lançada por esta marcação?')) { Int.lista = Int.lista.filter(i => i !== lig); await apagarItemSec('int', lig.id); }
  renderMarcacoes();
}

function imprimirMarcacoes() {
  const { ini, fim } = periodoMarc();
  const busca = Marc.busca.trim();
  const lista = (busca ? marcacoesFiltradas() : marcacoesFiltradas(ini, fim)).filter(m => m.situacao !== 'cancelada');
  if (!lista.length) return toast('Nenhuma marcação para imprimir.');
  const comContato = $('#mcImpContato').checked;
  const filtros = [Marc.filtroLocal ? nomeIgreja(Marc.filtroLocal) : 'Todas as igrejas', Marc.filtroTipo ? tipoMarc(Marc.filtroTipo)[1] : '',
    busca ? `procura: "${busca}"` : ''].filter(Boolean).join(' · ');
  const linhas = lista.map(m => `<tr><td>${esc(DIAS[deIso(m.data).getDay()].slice(0, 3))} ${dataBR(m.data)}</td><td>${esc(m.hora || '')}${m.horaFim ? '–' + esc(m.horaFim) : ''}</td>
      <td>${esc(nomeCurtoLocal(localDe(m.localId)) || '—')}</td><td>${esc(tipoMarc(m.tipo)[1])}</td>
      <td>${esc(m.nomes).replace(/\n/g, '<br>')}</td><td>${esc(m.celebrante || '')}</td>
      ${comContato ? `<td>${esc(m.contato || '')}</td>` : ''}<td>${esc(m.obs || '')}${m.situacao === 'pre' ? ' <span class="cinza">(pré-marcada)</span>' : ''}</td></tr>`).join('');
  const corpo = `<table><thead><tr><th>Dia</th><th>Hora</th><th>Igreja</th><th>Tipo</th><th>Nomes</th><th>Celebrante</th>${comContato ? '<th>Contato</th>' : ''}<th>Obs.</th></tr></thead>
    <tbody>${linhas}</tbody></table>`;
  imprimirFolhaSec('Agenda de marcações', `${busca ? 'Todas as datas' : rotuloPeriodoMarc()} · ${filtros}`, corpo, `Marcações ${busca ? 'procura' : ini + ' a ' + fim}`);
}

async function abrirMarcacoes() {
  await Promise.all([carregarMarcacoes(), carregarIntencoes()]);
  Marc.ref ||= new Date();
  $('#mcForm').hidden = true;
  renderFiltrosMarc();
  renderMarcacoes();
  abrirDialogo('dlgMarcacoes');
}

function ligarMarcacoes() {
  const dlg = $('#dlgMarcacoes');
  $('#mcLocal').addEventListener('change', e => { Marc.filtroLocal = e.target.value; renderMarcacoes(); });
  $('#mcTipo').addEventListener('change', e => { Marc.filtroTipo = e.target.value; renderMarcacoes(); });
  $('#mcBusca').addEventListener('input', e => { Marc.busca = e.target.value; renderMarcacoes(); });
  dlg.addEventListener('click', e => {
    const v = e.target.closest('[data-mc-visao]');
    if (v) { Marc.visao = v.dataset.mcVisao; renderFiltrosMarc(); return renderMarcacoes(); }
    const n = e.target.closest('[data-mc-nav]');
    if (n) {
      const k = +n.dataset.mcNav, r = Marc.ref || new Date();
      Marc.ref = !k ? new Date() : Marc.visao === 'dia' ? new Date(r.getFullYear(), r.getMonth(), r.getDate() + k)
        : Marc.visao === 'semana' ? new Date(r.getFullYear(), r.getMonth(), r.getDate() + 7 * k) : new Date(r.getFullYear(), r.getMonth() + k, 1);
      return renderMarcacoes();
    }
    const it = e.target.closest('.mc-item');
    if (it && e.target.closest('[data-mc-apagar]')) return apagarMarc(it.dataset.id);
    if (it) return abrirFormMarc(Marc.lista.find(m => m.id === it.dataset.id));
  });
  $('#mcNova').addEventListener('click', () => abrirFormMarc(null));
  $('#mcfCancelar').addEventListener('click', () => { $('#mcForm').hidden = true; Marc.editando = null; });
  $('#mcfSalvar').addEventListener('click', salvarFormMarc);
  $('#mcImprimir').addEventListener('click', imprimirMarcacoes);
  for (const id of ['mcfTipo', 'mcfLocal', 'mcfData', 'mcfHora', 'mcfHoraFim', 'mcfMissa']) $('#' + id).addEventListener('change', ajustarFormMarc);
  // Enter num campo de uma linha não fecha a janela (o form é method=dialog)
  dlg.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) e.preventDefault(); });
}

// ================================================================ INTENÇÕES DE MISSA
const TIPOS_INT = [
  ['falecidos', 'Pelos falecidos', '🕯', 'Falecidos'], ['gracas', 'Em ação de graças', '🙏', 'Ação de graças'],
  ['aniversario', 'Pelos aniversariantes', '🎂', 'Aniversário'], ['saude', 'Pela saúde', '💚', 'Saúde'], ['outras', 'Outras intenções', '✝', 'Outras'],
];
const tipoInt = id => TIPOS_INT.find(t => t[0] === id) || TIPOS_INT[TIPOS_INT.length - 1];

const Int = { lista: [], ocs: [], editando: null };

async function carregarIntencoes() { Int.lista = await lerItensSec('int'); }

// ---- (Secretaria 1.5.0) nomes das intenções no MiguelAngelus: chave da paróquia, NASCE DESLIGADA
// Fica na Agenda (paroquia.intencoesTelao), que já vai para todos os computadores da Secretaria e do MiguelAngelus.
// Ligada: para cada Missa de hoje em diante sai um registro secn-<chave> na pasta "intencoes/" da nuvem SÓ com o tipo e o
// texto da intenção (nunca o "a pedido de", o responsável, o telefone ou a oferta). Desligada: esses registros são apagados.
// Toda Secretaria calcula o mesmo conteúdo; só grava quando muda, então dois computadores não brigam.
const intencoesNoTelao = () => !!Agenda.dados.paroquia?.intencoesTelao;
const idPubInt = chave => 'secn-' + String(chave).replace(/[^\w-]+/g, '_');

async function publicarIntencoesTelao() {
  const hoje = hojeIso(), quer = new Map();
  if (intencoesNoTelao()) {
    const porMissa = new Map();
    for (const i of Int.lista) if (i.chave && i.data >= hoje) (porMissa.get(i.chave) || porMissa.set(i.chave, []).get(i.chave)).push(i);
    for (const [chave, its] of porMissa) {
      const grupos = TIPOS_INT.map(t => ({ titulo: t[1], nomes: its.filter(i => i.tipo === t[0]).sort((a, b) => (a.criado || 0) - (b.criado || 0)).map(i => i.texto) }))
        .filter(g => g.nomes.length);
      quer.set(idPubInt(chave), { chave, data: its[0].data, hora: its[0].hora || '', grupos });
    }
  }
  let atuais = [];
  try { atuais = (await DB.todos('config')).filter(r => /^secn-/.test(r.id)); } catch (_) {}
  let mudou = false;
  for (const r of atuais) if (!quer.has(r.id)) { await DB.remover('config', r.id); mudou = true; }
  for (const [id, item] of quer) {
    const a = atuais.find(r => r.id === id);
    if (a && JSON.stringify(a.item) === JSON.stringify(item)) continue;
    await DB.salvar('config', { id, item }); mudou = true;
  }
  if (mudou) avisarMudancaSec();
}

function avisoIntTelao() {
  const p = $('#inTelaoAviso');
  if (!p) return;
  const lig = intencoesNoTelao();
  p.classList.toggle('ligado', lig);
  p.innerHTML = lig
    ? '📺 <b>Os nomes das intenções vão para o MiguelAngelus</b> (só o tipo e a intenção; sem "a pedido de", responsável ou oferta). Para parar: <b>Ajustes → 🕯 Intenções no MiguelAngelus</b>.'
    : '📺 Os nomes das intenções <b>não vão</b> para o MiguelAngelus: ficam só na folha impressa. Para mandar ao telão: <b>Ajustes → 🕯 Intenções no MiguelAngelus</b>.';
}

const HTML_INT_TELAO = `
<dialog id="dlgIntTelao" class="dlg-sec">
  <form method="dialog" class="form">
    <h2>🕯 Intenções no MiguelAngelus (telão)</h2>
    <label class="chave-forma"><input type="checkbox" id="itTelao"><span class="trilho"></span> Mandar os nomes das intenções para o MiguelAngelus</label>
    <p class="sutil pequeno">Ligado: o operador do MiguelAngelus pode trazer as intenções de cada Missa para o item <b>Intenções da Missa</b> do roteiro
      e mostrar no telão. Vão <b>só o tipo e a intenção</b> (ex.: "Pelos falecidos: João da Silva"); o "a pedido de", o responsável,
      o telefone e a oferta ficam só na Secretaria.</p>
    <p class="sutil pequeno">Deixe desligado se muitas intenções chegam na hora, na entrada da igreja, e são lidas só do papel:
      assim o telão não mostra uma parte e esquece a outra. Vale para todos os computadores da paróquia.</p>
    <div class="linha"><span class="espaco"></span><button value="ok" class="primario">OK</button></div>
  </form>
</dialog>`;

function abrirIntTelao() {
  $('#itTelao').checked = intencoesNoTelao();
  abrirDialogo('dlgIntTelao');
}

function ligarIntTelao() {
  $('#itTelao').addEventListener('change', e => {
    Agenda.dados.paroquia ||= {};
    Agenda.dados.paroquia.intencoesTelao = e.target.checked;
    salvarAgenda();
    publicarIntencoesTelao();
    avisoIntTelao();
    toast(e.target.checked ? '🕯 Os nomes das intenções vão para o MiguelAngelus.' : '🕯 Os nomes das intenções não vão mais para o MiguelAngelus.');
  });
}

const HTML_INTENCOES = `
<dialog id="dlgIntencoes" class="dlg-sec dlg-sec-largo">
  <form method="dialog" class="form">
    <h2>🕯 Intenções de Missa</h2>
    <p class="sutil pequeno sec-privado">🔒 Compartilhadas só entre os computadores da Secretaria. O responsável e o valor da oferta nunca vão para o MiguelAngelus;
      na folha para ler na Missa vão só as intenções e o "a pedido de".</p>
    <p id="inTelaoAviso" class="pequeno in-telao-aviso"></p>
    <div class="linha">
      <label class="campo">Dia <input type="date" id="inData"></label>
      <label class="campo in-cel-campo">Celebração <select id="inCel"></select></label>
    </div>
    <div id="inLista" class="in-lista"></div>
    <div class="in-form">
      <div class="linha">
        <label class="campo">Tipo <select id="infTipo">${TIPOS_INT.map(t => `<option value="${t[0]}">${t[2]} ${t[1]}</option>`).join('')}</select></label>
        <label class="campo in-larga">Intenção <input id="infTexto" placeholder="Ex.: João da Silva · Família Souza · Maria (60 anos)"></label>
      </div>
      <div class="linha">
        <label class="campo" title="É lido na Missa. Não ponha telefone nem dados pessoais.">A pedido de <input id="infAPedido" placeholder="da família, dos filhos… (é lido)"></label>
        <label class="campo" title="Quem pediu e fez a oferta. Fica só na Secretaria: não sai na folha da Missa.">Responsável <input id="infPedido" placeholder="Nome e telefone (não é lido)"></label>
        <label class="campo">Oferta (R$) <input id="infOferta" inputmode="decimal" placeholder="0,00" size="8"></label>
        <span class="espaco"></span>
        <button type="button" id="infCancelar" hidden>Cancelar</button>
        <button type="button" id="infAdicionar" class="primario">＋ Adicionar</button>
      </div>
      <p class="sutil pequeno" style="margin:0">Dica: <kbd>Enter</kbd> adiciona. Para lançar várias do mesmo tipo de uma vez, cole uma lista (uma por linha) no campo Intenção.</p>
    </div>
    <details class="in-rel">
      <summary>📊 Relatório das ofertas</summary>
      <div class="linha">
        <label class="campo">De <input type="date" id="inrIni"></label>
        <label class="campo">Até <input type="date" id="inrFim"></label>
        <label class="campo">Igreja <select id="inrLocal"></select></label>
        <span class="espaco"></span>
        <button type="button" id="inrImprimir">🖨 Imprimir relatório…</button>
      </div>
      <div id="inrResumo" class="in-resumo"></div>
    </details>
    <div class="linha">
      <button type="button" id="inImprimir" class="primario" title="Folha A4 com as intenções desta celebração, para ler na Missa (com o "a pedido de"; sem o responsável e sem valores)">🖨 Imprimir para ler na Missa…</button>
      <span class="espaco"></span><button value="fechar">Fechar</button>
    </div>
  </form>
</dialog>`;

// "da família" → "a pedido da família"; "Maria" → "a pedido de Maria"
function aPedidoTxt(i) {
  const t = (i.aPedidoDe || '').trim().replace(/^a pedido\s+/i, '');
  return !t ? '' : /^(de|da|do|das|dos)\s/i.test(t) ? 'a pedido ' + t : 'a pedido de ' + t;
}
const textoLidoInt = i => i.texto + (aPedidoTxt(i) ? ` — ${aPedidoTxt(i)}` : '');

function celebracaoInt() {
  const iso = $('#inData').value || hojeIso();
  const o = Int.ocs[+$('#inCel').value] || null;
  return { iso, o };
}

// intenções de uma celebração: pela chave da Agenda; as sem chave (lançadas para um horário) pelo dia + hora + igreja
function intencoesDe(iso, o) {
  return Int.lista.filter(i => i.data === iso && (o ? (i.chave ? i.chave === o.chave : i.hora === o.hora && (!i.localId || i.localId === o.localId)) : !i.chave && !i.hora));
}

function renderCelebracoesInt() {
  if (!$('#inData').value) $('#inData').value = hojeIso();
  const antes = Int.ocs[+$('#inCel').value]?.chave;
  Int.ocs = ocorrencias(deIso($('#inData').value)).filter(o => !o.cancelada && ehMissa(o.tipo));
  $('#inCel').innerHTML = Int.ocs.map((o, i) => {
    const n = intencoesDe(o.iso, o).length;
    return `<option value="${i}">${esc(o.hora)} · ${esc(o.texto)}${n ? ` — ${n} intenç${n > 1 ? 'ões' : 'ão'}` : ''}</option>`;
  }).join('') || '<option value="-1">Nenhuma Missa na Agenda neste dia</option>';
  const k = Int.ocs.findIndex(o => o.chave === antes);
  if (k >= 0) $('#inCel').value = String(k);
  renderListaInt();
}

function renderListaInt() {
  const { iso, o } = celebracaoInt(), lista = o ? intencoesDe(iso, o) : [];
  $('#infAdicionar').disabled = !o;
  $('#inImprimir').disabled = !lista.length;
  $('#inLista').innerHTML = !o ? '<p class="sutil">Escolha um dia com Missa na Agenda.</p>'
    : !lista.length ? '<p class="sutil">Nenhuma intenção para esta Missa ainda.</p>'
    : TIPOS_INT.map(t => {
      const its = lista.filter(i => i.tipo === t[0]);
      return its.length ? `<div class="in-grupo"><div class="in-grupo-tit">${t[2]} ${esc(t[1])}</div>${its.map(i => `
        <div class="in-item ${Int.editando === i.id ? 'editando' : ''}" data-id="${i.id}"><span class="in-txt">${esc(textoLidoInt(i))}</span>
          <small class="sutil">${[i.pedidoPor ? 'responsável: ' + i.pedidoPor : '', i.oferta ? reais(i.oferta) : '', i.marcacaoId ? '📒 da Agenda de marcações' : ''].filter(Boolean).map(esc).join(' · ')}</small>
          <button type="button" data-in-editar title="Editar">✎</button><button type="button" data-in-apagar class="perigo" title="Apagar">✕</button></div>`).join('')}</div>` : '';
    }).join('');
}

function limparFormInt() {
  Int.editando = null;
  $('#infTexto').value = ''; $('#infAPedido').value = ''; $('#infPedido').value = ''; $('#infOferta').value = '';
  $('#infAdicionar').textContent = '＋ Adicionar';
  $('#infCancelar').hidden = true;
}

async function adicionarInt(varias) {
  const { iso, o } = celebracaoInt();
  if (!o) return toast('Escolha a Missa.');
  const textos = Array.isArray(varias) ? varias : [$('#infTexto').value.trim()].filter(Boolean);
  if (!textos.length) { toast('Escreva a intenção.'); return $('#infTexto').focus(); }
  const base = { data: iso, hora: o.hora, localId: o.localId || '', chave: o.chave, tipo: $('#infTipo').value,
    aPedidoDe: $('#infAPedido').value.trim(), pedidoPor: $('#infPedido').value.trim(), oferta: lerReais($('#infOferta').value) };
  const ed = Int.lista.find(i => i.id === Int.editando);
  if (ed) {
    const novo = { ...ed, ...base, texto: textos.join(', ') };
    if (!await gravarItemSec('int', novo, { versaoAberta: Int.versaoAberta, rotulo: 'esta intenção' })) { await carregarIntencoes(); limparFormInt(); return renderCelebracoesInt(); }
    Object.assign(ed, novo);
  } else {
    // várias de uma vez: a oferta conta uma vez só (na primeira)
    for (const [k, t] of textos.entries()) {
      const it = { id: uid(), criado: Date.now(), ...base, texto: t, oferta: k === 0 ? base.oferta : 0 };
      Int.lista.push(it);
      await gravarItemSec('int', it);
    }
  }
  limparFormInt();
  renderCelebracoesInt();
  $('#infTexto').focus();
}

async function apagarInt(id) {
  const i = Int.lista.find(x => x.id === id);
  if (!i || !confirm(`Apagar a intenção?\n\n${tipoInt(i.tipo)[1]}: ${i.texto}`)) return;
  Int.lista = Int.lista.filter(x => x !== i);
  await apagarItemSec('int', id);
  if (Int.editando === id) limparFormInt();
  renderCelebracoesInt();
}

function imprimirIntencoes() {
  const { iso, o } = celebracaoInt(), lista = o ? intencoesDe(iso, o) : [];
  if (!lista.length) return toast('Nenhuma intenção para imprimir.');
  const d = deIso(iso);
  const corpo = TIPOS_INT.map(t => {
    const its = lista.filter(i => i.tipo === t[0]);
    return its.length ? `<h2>${esc(t[1])}</h2><ul class="grande">${its.map(i => `<li>${esc(textoLidoInt(i))}</li>`).join('')}</ul>` : '';
  }).join('');
  imprimirFolhaSec('Intenções da Missa', `${DIAS[d.getDay()]}, ${dataBR(iso)} · ${o.hora.replace(':', 'h')} · ${o.texto}`, corpo,
    `Intenções ${iso} ${o.hora.replace(':', 'h')} ${nomeCurtoLocal(localDe(o.localId)) || o.texto}`);
}

function intencoesDoPeriodo() {
  const ini = $('#inrIni').value, fim = $('#inrFim').value, loc = $('#inrLocal').value;
  return Int.lista.filter(i => (!ini || i.data >= ini) && (!fim || i.data <= fim) && (!loc || i.localId === loc))
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
}

function renderResumoInt() {
  const lista = intencoesDoPeriodo(), total = lista.reduce((s, i) => s + (+i.oferta || 0), 0);
  $('#inrResumo').innerHTML = `<table class="in-tab"><thead><tr><th>Tipo</th><th class="num">Intenções</th><th class="num">Ofertas</th></tr></thead><tbody>
    ${TIPOS_INT.map(t => { const its = lista.filter(i => i.tipo === t[0]); return its.length ? `<tr><td>${t[2]} ${esc(t[1])}</td><td class="num">${its.length}</td><td class="num">${reais(its.reduce((s, i) => s + (+i.oferta || 0), 0))}</td></tr>` : ''; }).join('')}
    <tr class="total"><td>Total</td><td class="num">${lista.length}</td><td class="num">${reais(total)}</td></tr></tbody></table>`;
}

function imprimirRelatorioInt() {
  const lista = intencoesDoPeriodo();
  if (!lista.length) return toast('Nenhuma intenção no período.');
  const total = lista.reduce((s, i) => s + (+i.oferta || 0), 0);
  const resumo = `<table><thead><tr><th>Tipo</th><th class="num">Intenções</th><th class="num">Ofertas</th></tr></thead><tbody>
    ${TIPOS_INT.map(t => { const its = lista.filter(i => i.tipo === t[0]); return its.length ? `<tr><td>${esc(t[1])}</td><td class="num">${its.length}</td><td class="num">${reais(its.reduce((s, i) => s + (+i.oferta || 0), 0))}</td></tr>` : ''; }).join('')}
    <tr class="total"><td>Total</td><td class="num">${lista.length}</td><td class="num">${reais(total)}</td></tr></tbody></table>`;
  const det = `<h2>Lançamentos</h2><table><thead><tr><th>Dia</th><th>Missa</th><th>Tipo</th><th>Intenção</th><th>Responsável</th><th class="num">Oferta</th></tr></thead><tbody>
    ${lista.map(i => `<tr><td>${dataBR(i.data)}</td><td>${esc(i.hora || '')} ${esc(nomeCurtoLocal(localDe(i.localId)))}</td><td>${esc(tipoInt(i.tipo)[3])}</td>
      <td>${esc(textoLidoInt(i))}</td><td>${esc(i.pedidoPor || '')}</td><td class="num">${i.oferta ? reais(i.oferta) : '—'}</td></tr>`).join('')}</tbody></table>`;
  const ini = $('#inrIni').value, fim = $('#inrFim').value, loc = $('#inrLocal').value;
  imprimirFolhaSec('Relatório das intenções e ofertas', `${ini ? dataBR(ini) : 'início'} a ${fim ? dataBR(fim) : 'hoje'} · ${loc ? nomeIgreja(loc) : 'Todas as igrejas'}`,
    `<h2>Resumo</h2>${resumo}${det}`, `Relatório intenções ${ini} a ${fim}`);
}

async function abrirIntencoes(iso, chave) {
  await carregarIntencoes();
  if (iso) $('#inData').value = iso;
  limparFormInt();
  renderCelebracoesInt();
  if (chave) { const k = Int.ocs.findIndex(o => o.chave === chave); if (k >= 0) { $('#inCel').value = String(k); renderListaInt(); } }
  // relatório: o mês corrente
  const h = new Date();
  if (!$('#inrIni').value) $('#inrIni').value = isoData(new Date(h.getFullYear(), h.getMonth(), 1));
  if (!$('#inrFim').value) $('#inrFim').value = isoData(new Date(h.getFullYear(), h.getMonth() + 1, 0));
  $('#inrLocal').innerHTML = opcoesLocais($('#inrLocal').value, 'Todas as igrejas');
  renderResumoInt();
  avisoIntTelao();
  abrirDialogo('dlgIntencoes');
  $('#infTexto').focus();
}

function ligarIntencoes() {
  const dlg = $('#dlgIntencoes');
  $('#inData').addEventListener('change', () => { limparFormInt(); renderCelebracoesInt(); });
  $('#inCel').addEventListener('change', () => { limparFormInt(); renderListaInt(); });
  $('#infAdicionar').addEventListener('click', () => adicionarInt());
  $('#infCancelar').addEventListener('click', () => { limparFormInt(); renderListaInt(); });
  $('#inImprimir').addEventListener('click', imprimirIntencoes);
  $('#inrImprimir').addEventListener('click', imprimirRelatorioInt);
  for (const id of ['inrIni', 'inrFim', 'inrLocal']) $('#' + id).addEventListener('change', renderResumoInt);
  $('#infTexto').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); adicionarInt(); } });
  dlg.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) e.preventDefault(); });
  // colar várias linhas no campo Intenção (input de uma linha): vira várias intenções
  $('#infTexto').addEventListener('paste', e => {
    const t = e.clipboardData?.getData('text') || '';
    if (!t.includes('\n')) return;
    e.preventDefault();
    const linhas = t.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (confirm(`Lançar ${linhas.length} intenções (${tipoInt($('#infTipo').value)[1]})?\n\n${linhas.slice(0, 8).join('\n')}${linhas.length > 8 ? '\n…' : ''}`)) {
      adicionarInt(linhas);
    }
  });
  dlg.addEventListener('click', e => {
    const it = e.target.closest('.in-item');
    if (!it) return;
    if (e.target.closest('[data-in-apagar]')) return apagarInt(it.dataset.id);
    if (e.target.closest('[data-in-editar]')) {
      const i = Int.lista.find(x => x.id === it.dataset.id);
      if (!i) return;
      Int.editando = i.id;
      Int.versaoAberta = i.versao || 0;
      $('#infTipo').value = i.tipo; $('#infTexto').value = i.texto; $('#infAPedido').value = i.aPedidoDe || ''; $('#infPedido').value = i.pedidoPor || '';
      $('#infOferta').value = i.oferta ? String(i.oferta).replace('.', ',') : '';
      $('#infAdicionar').textContent = 'Salvar';
      $('#infCancelar').hidden = false;
      renderListaInt();
      $('#infTexto').focus();
    }
  });
  dlg.addEventListener('close', () => setTimeout(() => typeof renderSecretaria === 'function' && renderSecretaria(), 100));
}

// ================================================================ (1.5.0) LGPD: DADOS DE UMA PESSOA
// Procura uma pessoa (nome ou telefone) nas marcações e nas intenções; imprime/salva em PDF tudo o que há dela (para entregar
// a quem pediu) e apaga o que for marcado. Apagar aqui apaga nos outros computadores da secretaria (pela nuvem).
// As pessoas com login na 📆 Agenda da secretaria aparecem só como aviso (são removidas lá, pelo responsável).
const Lgpd = { achados: [] };
const soDigitos = s => String(s || '').replace(/\D/g, '');

function casaLgpd(q, campos) {
  const qd = soDigitos(q), soNumero = qd.length >= 4 && !/[a-zà-ÿ]/i.test(q);
  if (soNumero) return campos.some(c => soDigitos(c).includes(qd));
  const qa = semAcento(q.trim());
  return qa.length >= 3 && campos.some(c => semAcento(c).includes(qa));
}
// destaca o trecho achado (só para mostrar)
function marcarLgpd(txt, q) {
  const t = esc(txt || '');
  const qa = semAcento(q.trim());
  if (qa.length < 3 || /^[\d\s()+-]+$/.test(q)) return t;
  const i = semAcento(txt || '').indexOf(qa);
  return i < 0 ? t : esc(txt.slice(0, i)) + '<mark>' + esc(txt.slice(i, i + qa.length)) + '</mark>' + esc(txt.slice(i + qa.length));
}

const HTML_LGPD = `
<dialog id="dlgLgpd" class="dlg-sec dlg-sec-largo">
  <form method="dialog" class="form">
    <h2>🔒 Dados de uma pessoa (LGPD)</h2>
    <p class="sutil pequeno">Quando alguém pede para ver ou apagar os próprios dados: procure pelo nome ou pelo telefone. Aparecem as marcações e as intenções
      onde a pessoa está (nomes, contato, observações, "a pedido de", responsável). <b>🖨 Relatório</b> imprime ou salva em PDF para entregar a ela;
      <b>🗑 Apagar</b> apaga os itens marcados neste e nos outros computadores da secretaria.</p>
    <div class="linha">
      <input id="lgBusca" type="search" placeholder="🔎 Nome (3 letras ou mais) ou telefone (4 números ou mais)" autocomplete="off" style="flex:1">
      <button type="button" id="lgProcurar" class="primario">Procurar</button>
    </div>
    <div id="lgLista" class="lg-lista"><p class="sutil">Digite um nome ou telefone.</p></div>
    <p class="sutil pequeno">Não entram aqui: folhas já impressas, cópias de segurança (backup), os textos de avisos e eventos e os arquivos 📎 das escalas (PDF, imagem, planilha) — confira e corrija esses à mão.</p>
    <div class="linha">
      <button type="button" id="lgTodos">Marcar todos</button>
      <button type="button" id="lgImprimir" title="Folha com tudo o que foi achado (só os itens marcados)">🖨 Relatório para a pessoa…</button>
      <button type="button" id="lgApagar" class="perigo">🗑 Apagar os marcados…</button>
      <span class="espaco"></span><button value="fechar">Fechar</button>
    </div>
  </form>
</dialog>`;

async function procurarLgpd() {
  const q = $('#lgBusca').value;
  const qd = soDigitos(q);
  if (semAcento(q.trim()).length < 3 && qd.length < 4) { $('#lgLista').innerHTML = '<p class="sutil">Digite pelo menos 3 letras do nome ou 4 números do telefone.</p>'; Lgpd.achados = []; return; }
  await Promise.all([carregarMarcacoes(), carregarIntencoes()]);
  const marc = Marc.lista.filter(m => casaLgpd(q, [m.nomes, m.contato, m.obs, m.celebrante]))
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  const ints = Int.lista.filter(i => casaLgpd(q, [i.texto, i.aPedidoDe, i.pedidoPor]))
    .sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
  const pessoas = (await lerItensSec('usu')).filter(p => casaLgpd(q, [p.nome]));
  // (1.6.0) voluntários da 📋 escala
  const vols = (await lerItensSec('esc')).filter(p => p.id.startsWith('p-') && casaLgpd(q, [p.nome, p.contato, p.obs]));
  Lgpd.achados = [...marc.map(m => ({ tipo: 'marc', item: m })), ...ints.map(i => ({ tipo: 'int', item: i })), ...vols.map(p => ({ tipo: 'esc', item: p }))];
  const linhaVol = p => `<label class="lg-item"><input type="checkbox" data-lg="esc:${p.id}" checked><span>
      <b>📋 Pessoa das escalas</b>
      <small>Nome: ${marcarLgpd(p.nome, q)}${p.contato ? ` · Telefone: ${marcarLgpd(p.contato, q)}` : ''}${p.obs ? ` · Obs.: ${marcarLgpd(p.obs, q)}` : ''} · o nome continua nas escalas já feitas</small></span></label>`;
  const linhaMarc = m => `<label class="lg-item"><input type="checkbox" data-lg="marc:${m.id}" checked><span>
      <b>${tipoMarc(m.tipo)[2]} ${esc(tipoMarc(m.tipo)[1])} · ${dataBR(m.data)} ${esc(m.hora || '')} · ${esc(nomeIgreja(m.localId))}</b>
      <small>Nomes: ${marcarLgpd((m.nomes || '').replace(/\n/g, ' · '), q)}${m.contato ? ` · Contato: ${marcarLgpd(m.contato, q)}` : ''}${m.obs ? ` · Obs.: ${marcarLgpd(m.obs, q)}` : ''}${m.celebrante ? ` · Celebrante: ${marcarLgpd(m.celebrante, q)}` : ''}</small></span></label>`;
  const linhaInt = i => `<label class="lg-item"><input type="checkbox" data-lg="int:${i.id}" checked><span>
      <b>🕯 ${esc(tipoInt(i.tipo)[1])} · ${dataBR(i.data)} ${esc(i.hora || '')} · ${esc(nomeIgreja(i.localId))}</b>
      <small>Intenção: ${marcarLgpd(i.texto, q)}${i.aPedidoDe ? ` · ${marcarLgpd(aPedidoTxt(i), q)}` : ''}${i.pedidoPor ? ` · Responsável: ${marcarLgpd(i.pedidoPor, q)}` : ''}${i.oferta ? ` · Oferta: ${reais(i.oferta)}` : ''}${i.marcacaoId ? ' · 📒 lançada por uma marcação' : ''}</small></span></label>`;
  $('#lgLista').innerHTML = (!Lgpd.achados.length && !pessoas.length) ? '<p class="sutil">Nada encontrado com esse nome ou telefone.</p>'
    : (marc.length ? `<div class="lg-grupo-tit">📒 Marcações (${marc.length})</div>${marc.map(linhaMarc).join('')}` : '')
    + (ints.length ? `<div class="lg-grupo-tit">🕯 Intenções de Missa (${ints.length})</div>${ints.map(linhaInt).join('')}` : '')
    + (vols.length ? `<div class="lg-grupo-tit">📋 Escalas (${vols.length})</div>${vols.map(linhaVol).join('')}` : '')
    + (pessoas.length ? `<div class="lg-grupo-tit">📆 Login na Agenda da secretaria</div><p class="sutil pequeno">${pessoas.map(p => esc(p.nome)).join(', ')}: o nome e a senha (guardada só como código) servem para entrar na agenda. Quem é responsável remove em 📆 Agenda da secretaria → Pessoas.</p>` : '');
  $('#lgImprimir').disabled = $('#lgApagar').disabled = $('#lgTodos').disabled = !Lgpd.achados.length;
}

const marcadosLgpd = () => $$('#lgLista [data-lg]:checked').map(c => { const [tipo, id] = c.dataset.lg.split(':'); return Lgpd.achados.find(a => a.tipo === tipo && a.item.id === id); }).filter(Boolean);

function imprimirLgpd() {
  const sel = marcadosLgpd();
  if (!sel.length) return toast('Marque pelo menos um item.');
  const q = $('#lgBusca').value.trim();
  const ms = sel.filter(a => a.tipo === 'marc').map(a => a.item), is = sel.filter(a => a.tipo === 'int').map(a => a.item);
  const corpo = `<p>Dados guardados pela secretaria paroquial encontrados na procura por "<b>${esc(q)}</b>", em ${dataBR(hojeIso())}.</p>`
    + (ms.length ? `<h2>Marcações</h2><table><thead><tr><th>Dia</th><th>Tipo</th><th>Igreja</th><th>Nomes</th><th>Contato</th><th>Observações</th><th>Situação</th></tr></thead><tbody>${ms.map(m =>
      `<tr><td>${dataBR(m.data)} ${esc(m.hora || '')}</td><td>${esc(tipoMarc(m.tipo)[1])}</td><td>${esc(nomeIgreja(m.localId))}</td><td>${esc((m.nomes || '').replace(/\n/g, ', '))}</td><td>${esc(m.contato || '')}</td><td>${esc(m.obs || '')}</td><td>${esc(SITUACOES_MARC.find(s => s[0] === (m.situacao || 'pre'))?.[1] || '')}</td></tr>`).join('')}</tbody></table>` : '')
    + (is.length ? `<h2>Intenções de Missa</h2><table><thead><tr><th>Dia</th><th>Igreja</th><th>Tipo</th><th>Intenção</th><th>A pedido de</th><th>Responsável</th><th class="num">Oferta</th></tr></thead><tbody>${is.map(i =>
      `<tr><td>${dataBR(i.data)} ${esc(i.hora || '')}</td><td>${esc(nomeIgreja(i.localId))}</td><td>${esc(tipoInt(i.tipo)[3])}</td><td>${esc(i.texto)}</td><td>${esc(i.aPedidoDe || '')}</td><td>${esc(i.pedidoPor || '')}</td><td class="num">${i.oferta ? reais(i.oferta) : '—'}</td></tr>`).join('')}</tbody></table>` : '')
    + ((vs => vs.length ? `<h2>Escalas</h2><table><thead><tr><th>Nome</th><th>Telefone</th><th>Observação</th></tr></thead><tbody>${vs.map(p =>
      `<tr><td>${esc(p.nome)}</td><td>${esc(p.contato || '')}</td><td>${esc(p.obs || '')}</td></tr>`).join('')}</tbody></table>` : '')(sel.filter(a => a.tipo === 'esc').map(a => a.item)));
  imprimirFolhaSec('Dados pessoais guardados pela secretaria', `Procura por "${q}" · ${sel.length} registro${sel.length > 1 ? 's' : ''}`, corpo, `Dados LGPD ${q}`);
}

async function apagarLgpd() {
  const sel = marcadosLgpd();
  if (!sel.length) return toast('Marque pelo menos um item.');
  const nm = sel.filter(a => a.tipo === 'marc').length, ni = sel.filter(a => a.tipo === 'int').length, nv = sel.filter(a => a.tipo === 'esc').length;
  // intenções de 7º dia lançadas por uma marcação apagada vão junto
  const extras = Int.lista.filter(i => i.marcacaoId && sel.some(a => a.tipo === 'marc' && a.item.id === i.marcacaoId) && !sel.some(a => a.tipo === 'int' && a.item.id === i.id));
  const txt = [nm ? `${nm} marcaç${nm > 1 ? 'ões' : 'ão'}` : '', ni ? `${ni} intenç${ni > 1 ? 'ões' : 'ão'}` : '', nv ? `${nv} pessoa${nv > 1 ? 's' : ''} das escalas` : '', extras.length ? `${extras.length} intenção(ões) de 7º dia ligada(s) a essas marcações` : ''].filter(Boolean).join(', ');
  if (!confirm(`Apagar de vez: ${txt}?\n\nSome também dos outros computadores da secretaria e NÃO dá para desfazer.\nSugestão: antes, imprima ou salve o relatório em PDF.`)) return;
  for (const a of sel) await apagarItemSec(a.tipo, a.item.id);
  for (const i of extras) await apagarItemSec('int', i.id);
  await Promise.all([carregarMarcacoes(), carregarIntencoes(), typeof carregarEscala === 'function' && carregarEscala()]);
  toast(`🗑 Apagado: ${txt}.`);
  procurarLgpd();
}

function abrirLgpd() {
  $('#lgBusca').value = '';
  $('#lgLista').innerHTML = '<p class="sutil">Digite um nome ou telefone.</p>';
  Lgpd.achados = [];
  $('#lgImprimir').disabled = $('#lgApagar').disabled = $('#lgTodos').disabled = true;
  abrirDialogo('dlgLgpd');
  $('#lgBusca').focus();
}

function ligarLgpd() {
  $('#lgProcurar').addEventListener('click', procurarLgpd);
  $('#lgBusca').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); procurarLgpd(); } });
  $('#lgImprimir').addEventListener('click', imprimirLgpd);
  $('#lgApagar').addEventListener('click', apagarLgpd);
  $('#lgTodos').addEventListener('click', () => { const cs = $$('#lgLista [data-lg]'); const todos = cs.every(c => c.checked); cs.forEach(c => c.checked = !todos); });
}

// ================================================================ EVENTOS COM QR CODE
// O QR leva o próprio evento no formato de agenda (BEGIN:VEVENT … END:VEVENT): a câmera do Android e a do iPhone
// oferecem "Adicionar à agenda", sem internet e sem servidor. O cartaz não vai no QR (não cabe): vai na imagem e na folha.
// Vão pela nuvem numa pasta própria ("eventos/", um arquivo por evento: sece-<id>), entre as Secretarias e o MiguelAngelus,
// que tem a aba 🎉 Eventos (eventos.js) e também cria e edita eventos (paróquia sem secretaria), como nos avisos.
const Ev = { lista: [], editando: null, cartaz: '', versaoAberta: 0 };

async function carregarEventos() { Ev.lista = await lerItensSec('ev'); }

const escIcs = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const dataIcs = (iso, h) => iso.replace(/-/g, '') + (h ? 'T' + h.replace(':', '') + '00' : '');
function somaHoras(iso, h, mais) {
  const d = deIso(iso), m = minutos(h) + mais * 60;
  d.setMinutes(m);
  return { iso: isoData(d), hora: hm(d.getHours() * 60 + d.getMinutes()) };
}

function localDoEvento(e) {
  if (e.localTexto) return e.localTexto;
  const l = localDe(e.localId);
  return l ? [`${l.tipo} ${l.nome}`, l.endereco].filter(Boolean).join(', ') : '';
}

// (1.9.5) Evento de vários dias no mesmo horário (novena, semana missionária): cada dia das "hora" às "horaFim"
const eventoDiario = e => !!(e.diario && e.dataFim && e.dataFim > e.data);
const diasDoEvento = e => Math.round((deIso(e.dataFim) - deIso(e.data)) / 864e5) + 1;
const hTxt = h => h.replace(':', 'h').replace(/h00$/, 'h');

// Texto que vai dentro do QR (horário local, sem fuso: o celular usa o dele, que é o mesmo da paróquia)
function veventDe(e) {
  const diario = eventoDiario(e);
  // no diário o fim é no mesmo dia (a repetição leva aos outros dias)
  const fim = diario ? (e.horaFim && e.horaFim > e.hora ? { iso: e.data, hora: e.horaFim } : e.hora ? somaHoras(e.data, e.hora, 1) : null)
    : e.dataFim && e.horaFim ? { iso: e.dataFim, hora: e.horaFim } : e.hora ? somaHoras(e.data, e.hora, 2) : null;
  const par = Agenda.dados.paroquia?.nome || '';
  const linhas = ['BEGIN:VEVENT', 'SUMMARY:' + escIcs(e.titulo)];
  if (e.hora) { linhas.push('DTSTART:' + dataIcs(e.data, e.hora)); linhas.push('DTEND:' + dataIcs(fim.iso, fim.hora)); }
  else { linhas.push('DTSTART;VALUE=DATE:' + dataIcs(e.data)); const d = deIso(diario ? e.data : (e.dataFim || e.data)); d.setDate(d.getDate() + 1); linhas.push('DTEND;VALUE=DATE:' + dataIcs(isoData(d))); }
  if (diario) linhas.push('RRULE:FREQ=DAILY;COUNT=' + diasDoEvento(e));
  const loc = localDoEvento(e);
  if (loc) linhas.push('LOCATION:' + escIcs(loc));
  // no diário, a descrição começa dizendo que é todo dia (o celular que ignorar a repetição grava só o 1º dia, mas a pessoa lê)
  const desc = [diario ? `Todos os dias, de ${dataBR(e.data).slice(0, 5)} a ${dataBR(e.dataFim).slice(0, 5)}${e.hora ? ', ' + hTxt(e.hora) : ''}.` : '', e.descricao || (diario ? '' : par)].filter(Boolean).join(' ');
  if (desc) linhas.push('DESCRIPTION:' + escIcs(desc));
  linhas.push('END:VEVENT');
  return linhas.join('\r\n');
}

function qrEvento(texto) {
  const antes = qrcode.stringToBytes;
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];    // acentos (ç, ã, é) certos na agenda do celular
  // nível L: menos quadradinhos (maiores), lê melhor de longe no telão; o telão não "risca" o QR como um papel no mural
  try { const q = qrcode(0, 'L'); q.addData(texto); q.make(); return q; }
  finally { qrcode.stringToBytes = antes; }
}
// desenha o QR num canvas (quadrado de lado `lado`, com a margem branca obrigatória)
function desenharQr(g, q, x, y, lado) {
  const n = q.getModuleCount(), m = 4, cel = lado / (n + 2 * m);
  g.fillStyle = '#fff'; g.fillRect(x, y, lado, lado);
  g.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(Math.floor(x + (c + m) * cel), Math.floor(y + (r + m) * cel), Math.ceil(cel), Math.ceil(cel));
}
function qrDataUrl(texto, lado = 600) {
  const c = document.createElement('canvas'); c.width = c.height = lado;
  desenharQr(c.getContext('2d'), qrEvento(texto), 0, 0, lado);
  return c.toDataURL('image/png');
}

function quandoEvento(e) {
  const d = deIso(e.data);
  if (eventoDiario(e))
    return `Todos os dias, de ${DIAS[d.getDay()].toLowerCase()}, ${dataBR(e.data).slice(0, 5)} a ${DIAS[deIso(e.dataFim).getDay()].toLowerCase()}, ${dataBR(e.dataFim).slice(0, 5)}` +
      (e.hora ? ` · ${hTxt(e.hora)}${e.horaFim && e.horaFim > e.hora ? ' às ' + hTxt(e.horaFim) : ''}` : '');
  let t = `${DIAS[d.getDay()]}, ${dataBR(e.data)}${e.hora ? ' · ' + e.hora.replace(':', 'h') : ''}`;
  if (e.dataFim && e.dataFim !== e.data) t += ` a ${DIAS[deIso(e.dataFim).getDay()].toLowerCase()}, ${dataBR(e.dataFim)}${e.horaFim ? ' · ' + e.horaFim.replace(':', 'h') : ''}`;
  else if (e.horaFim) t += ` às ${e.horaFim.replace(':', 'h')}`;
  return t;
}

const carregarImagem = src => new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = falha; i.src = src; });

// Imagem Full HD para o Holyrics / telão: o cartaz à esquerda; título, data, local e o QR grande à direita
async function imagemEvento(e) {
  const W = 1920, H = 1080, FONTE = '"Segoe UI", "Segoe UI Emoji", Arial, sans-serif';
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const fundo = S.config.corFundo || '#0f2742', corTxt = S.config.corTexto || '#ffffff';
  g.fillStyle = fundo; g.fillRect(0, 0, W, H);
  try { await document.fonts?.ready; } catch (_) {}
  // (1.9.6) faixa azul "🎉 EVENTO" e QR com moldura azul e "📅 SALVE NA AGENDA": não confunde com o QR do Pix das campanhas
  const AZUL = '#2f80ed', FX = 76;
  g.fillStyle = AZUL; g.fillRect(0, 0, W, FX);
  g.fillStyle = '#fff'; g.textBaseline = 'middle';
  g.font = `800 42px ${FONTE}`; g.textAlign = 'left'; g.fillText('🎉 EVENTO', 50, FX / 2 + 2);
  g.font = `600 32px ${FONTE}`; g.textAlign = 'right'; g.fillText('Salve na agenda do celular', W - 50, FX / 2 + 2);
  g.textBaseline = 'alphabetic';
  let xTexto = 110, largTexto = W - 110 - 110 - 620;
  if (e.cartaz) {
    try {
      const img = await carregarImagem(e.cartaz);
      const maxW = 820, maxH = H - FX - 70, k = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * k, h = img.height * k, x = 70, y = FX + (H - FX - h) / 2;
      g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
      g.drawImage(img, x, y, w, h); g.restore();
      xTexto = x + w + 70; largTexto = W - xTexto - 70;
    } catch (_) {}
  }
  g.textAlign = 'center'; g.fillStyle = corTxt;
  const cx = xTexto + largTexto / 2;
  let f = 70;
  g.font = `800 ${f}px ${FONTE}`;
  let ls = linhasCanvas(g, e.titulo, largTexto);
  while ((ls.length > 2 || ls.some(l => g.measureText(l).width > largTexto)) && f > 36) { f *= .92; g.font = `800 ${f}px ${FONTE}`; ls = linhasCanvas(g, e.titulo, largTexto); }
  let y = FX + 30 + f;
  for (const l of ls.slice(0, 3)) { g.fillText(l, cx, y); y += f * 1.12; }
  g.font = `600 ${Math.round(f * .5)}px ${FONTE}`; g.fillStyle = corComAlfa(corTxt, .9);
  for (const l of linhasCanvas(g, quandoEvento(e), largTexto).slice(0, 2)) { g.fillText(l, cx, y); y += f * .62; }
  const loc = localDoEvento(e);
  if (loc) { g.font = `400 ${Math.round(f * .42)}px ${FONTE}`; g.fillStyle = corComAlfa(corTxt, .75); for (const l of linhasCanvas(g, '📍 ' + loc, largTexto).slice(0, 2)) { g.fillText(l, cx, y); y += f * .55; } }
  // QR: o maior que couber embaixo do texto (precisa ser lido do fundo da igreja); a sombra só na moldura,
  // nunca nos quadradinhos (borrados, o celular não lê)
  const B = 16, yQr = y + 66, ladoQr = Math.max(280, Math.min(600, largTexto - 2 * B, H - yQr - B - 52)), xQr = cx - ladoQr / 2;
  g.font = `800 44px ${FONTE}`; g.fillStyle = '#7db8ff'; g.fillText('📅 SALVE NA AGENDA', cx, yQr - B - 14);
  g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 24; g.fillStyle = AZUL;
  g.beginPath(); g.roundRect(xQr - B, yQr - B, ladoQr + 2 * B, ladoQr + 2 * B, 18); g.fill(); g.restore();
  g.fillStyle = '#fff'; g.fillRect(xQr, yQr, ladoQr, ladoQr);
  desenharQr(g, qrEvento(veventDe(e)), xQr, yQr, ladoQr);
  g.font = `600 28px ${FONTE}`; g.fillStyle = corTxt;
  g.fillText('📱 Aponte a câmera do celular', cx, Math.min(H - 16, yQr + ladoQr + B + 36));
  return c.toDataURL('image/png');
}

const HTML_EVENTOS = `
<dialog id="dlgEventos" class="dlg-sec dlg-sec-largo">
  <form method="dialog" class="form">
    <h2>🎉 Eventos com QR code</h2>
    <p class="sutil pequeno sec-privado">Quem aponta a câmera do celular para o QR recebe o evento na agenda (Android e iPhone, sem internet).
      Gere a imagem para o Holyrics ou imprima o cartaz com o QR para o mural.</p>
    <div class="ev-grade">
      <div>
        <div id="evLista" class="ev-lista"></div>
        <div class="linha"><button type="button" id="evNovo" class="primario">＋ Novo evento</button>
          <label class="check pequeno"><input type="checkbox" id="evPassados"> mostrar os que já passaram</label></div>
      </div>
      <div id="evForm" class="ev-form" hidden>
        <label class="campo">Título <input id="evfTitulo" maxlength="80" placeholder="Ex.: Retiro de Advento, Festa de São José, Curso de batismo"></label>
        <div class="linha">
          <label class="campo">Começa <input type="date" id="evfData"></label>
          <label class="campo">às <input type="time" id="evfHora"></label>
          <label class="campo">Termina <input type="date" id="evfDataFim"></label>
          <label class="campo">às <input type="time" id="evfHoraFim"></label>
        </div>
        <p class="sutil pequeno ev-dica">💡 <b>Novena, tríduo, semana missionária</b> (um encontro por dia, no mesmo horário): em <b>Começa</b>, o 1º dia e a hora
          de início; em <b>Termina</b>, o último dia e a hora em que <b>cada encontro</b> acaba; e deixe marcado "Todos os dias, no mesmo horário".
          Ex.: novena de 15 a 23/11, 19h30 às 21h → 9 compromissos no celular.<br>
          <b>Retiro, acampamento, festa de vários dias seguidos</b> (sem parar à noite): desmarque — vira um bloco só, do começo ao fim.
          <b>Evento de um dia:</b> deixe "Termina" em branco ou no mesmo dia.</p>
        <label class="check pequeno" id="evfDiarioRot" hidden><input type="checkbox" id="evfDiario">
          <span><b>Todos os dias, no mesmo horário</b> (novena, semana missionária…): no celular vira um compromisso por dia, das <span id="evfDiarioHoras"></span>.</span></label>
        <div class="linha">
          <label class="campo">Igreja <select id="evfLocal"></select></label>
          <label class="campo ev-larga">ou outro local <input id="evfLocalTexto" placeholder="Ex.: Salão paroquial, Rua …"></label>
        </div>
        <label class="campo">Descrição curta <small class="sutil" id="evfConta"></small>
          <textarea id="evfDescricao" data-sem-formato rows="2" maxlength="200" placeholder="Ex.: Inscrições na secretaria até dia 20. Traga 1 kg de alimento."></textarea></label>
        <div class="linha ev-cartaz-linha">
          <div id="evfCartaz" class="ev-cartaz">sem cartaz</div>
          <div class="ev-cartaz-bt"><button type="button" id="evfCartazEscolher">🖼 Escolher cartaz…</button>
            <button type="button" id="evfCartazTirar" hidden>Tirar o cartaz</button>
            <input type="file" id="evfArquivo" accept="image/*" hidden>
            <span class="sutil pequeno">Dica: faça no Canva em pé, 1080 × 1350 px, e baixe em PNG (JPG também serve). Sem QR no cartaz: o programa coloca o QR ao lado.</span></div>
          <span class="espaco"></span>
          <div class="ev-qr"><img id="evfQr" alt="QR code do evento"><span class="sutil pequeno">Teste com a câmera do celular</span></div>
        </div>
        <div class="linha"><span class="espaco"></span>
          <button type="button" id="evfCancelar">Cancelar</button>
          <button type="button" id="evfSalvar" class="primario">Salvar evento</button></div>
      </div>
    </div>
    <div id="evPrevia" class="apc-previa"></div>
    <div class="linha">
      <button type="button" id="evImagem" title="Uma imagem Full HD com o cartaz e o QR, gravada na pasta de imagens do Holyrics">🖼 Imagem para o Holyrics</button>
      <button type="button" id="evImprimir" title="Folha A4 com o cartaz e o QR grande, para o mural (ou PDF)">🖨 Cartaz com QR para o mural…</button>
      <span class="espaco"></span><button value="fechar">Fechar</button>
    </div>
  </form>
</dialog>`;

const eventoAberto = () => Ev.lista.find(e => e.id === Ev.editando) || null;

function renderEventos() {
  const hoje = hojeIso(), passados = $('#evPassados').checked;
  const lista = Ev.lista.filter(e => passados || (e.dataFim || e.data) >= hoje).sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
  $('#evLista').innerHTML = lista.length ? lista.map(e => `
    <div class="ev-item ${e.id === Ev.editando ? 'editando' : ''} ${(e.dataFim || e.data) < hoje ? 'passado' : ''}" data-id="${e.id}">
      ${e.cartaz ? `<img src="${e.cartaz}" alt="">` : '<span class="ev-sem">🎉</span>'}
      <span class="ev-txt"><b>${esc(e.titulo)}</b><small class="sutil">${esc(quandoEvento(e))}${localDoEvento(e) ? ' · ' + esc(localDoEvento(e)) : ''}</small></span>
      <button type="button" data-ev-apagar class="perigo" title="Apagar">✕</button>
    </div>`).join('') : `<p class="sutil">${Ev.lista.length ? 'Nenhum evento por vir.' : 'Nenhum evento ainda. Clique em ＋ Novo evento.'}</p>`;
  const e = eventoAberto();
  $('#evImagem').disabled = $('#evImprimir').disabled = !e;
}

function lerFormEv() {
  return { titulo: $('#evfTitulo').value.trim(), data: $('#evfData').value, hora: $('#evfHora').value,
    dataFim: $('#evfDataFim').value, horaFim: $('#evfHoraFim').value, localId: $('#evfLocal').value,
    diario: $('#evfDiario').checked && !!$('#evfDataFim').value && $('#evfDataFim').value > $('#evfData').value,
    localTexto: $('#evfLocalTexto').value.trim(), descricao: $('#evfDescricao').value.trim(), cartaz: Ev.cartaz };
}

function atualizarPreviaEv() {
  const varios = !!$('#evfDataFim').value && $('#evfDataFim').value > $('#evfData').value;
  $('#evfDiarioRot').hidden = !varios;
  const h = $('#evfHora').value, hf = $('#evfHoraFim').value;
  $('#evfDiarioHoras').textContent = h ? `${hTxt(h)} às ${hf && hf > h ? hTxt(hf) : hTxt(somaHoras($('#evfData').value || hojeIso(), h, 1).hora) + ' (ponha a hora em que termina)'}` : '(sem horário: dia inteiro)';
  const e = lerFormEv();
  $('#evfConta').textContent = `(${e.descricao.length}/200)`;
  $('#evfCartaz').innerHTML = Ev.cartaz ? `<img src="${Ev.cartaz}" alt="cartaz">` : 'sem cartaz';
  $('#evfCartazTirar').hidden = !Ev.cartaz;
  $('#evfQr').src = e.titulo && e.data ? qrDataUrl(veventDe(e), 360) : '';
  $('#evfQr').style.visibility = e.titulo && e.data ? '' : 'hidden';
}

function abrirFormEv(e) {
  Ev.editando = e?.id || null;
  Ev.versaoAberta = e?.versao || 0;
  Ev.cartaz = e?.cartaz || '';
  $('#evfTitulo').value = e?.titulo || '';
  $('#evfData').value = e?.data || '';
  $('#evfHora').value = e?.hora || '';
  $('#evfDataFim').value = e?.dataFim || '';
  $('#evfHoraFim').value = e?.horaFim || '';
  $('#evfDiario').checked = !!e?.diario;
  $('#evfLocal').innerHTML = opcoesLocais(e?.localId || '', '— outro local —');
  $('#evfLocalTexto').value = e?.localTexto || '';
  $('#evfDescricao').value = e?.descricao || '';
  $('#evForm').hidden = false;
  $('#evPrevia').innerHTML = '';
  atualizarPreviaEv();
  renderEventos();
  $('#evfTitulo').focus();
}

async function salvarFormEv() {
  const d = lerFormEv();
  if (!d.titulo) { toast('Escreva o título do evento.'); return $('#evfTitulo').focus(); }
  if (!d.data) { toast('Escolha a data.'); return $('#evfData').focus(); }
  if (d.dataFim && d.dataFim < d.data) { toast('O fim não pode ser antes do começo.'); return $('#evfDataFim').focus(); }
  const antigo = eventoAberto();
  const e = antigo ? { ...antigo, ...d, alterado: Date.now() } : { id: uid(), criado: Date.now(), ...d };
  if (!await gravarItemSec('ev', e, { versaoAberta: antigo ? Ev.versaoAberta : 0, rotulo: 'este evento' })) {
    await carregarEventos(); $('#evForm').hidden = true; Ev.editando = null; return renderEventos();
  }
  if (antigo) Object.assign(antigo, e); else { Ev.lista.push(e); Ev.editando = e.id; }
  Ev.versaoAberta = e.versao;
  toast('🎉 Evento salvo.');
  renderEventos();
  aposMudarEventos();
}

// cartaz: reduz para no máximo 1200 px (JPEG) para não pesar no banco
async function escolherCartaz(arq) {
  if (!arq) return;
  try {
    const url = await new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = falha; r.readAsDataURL(arq); });
    const img = await carregarImagem(url), k = Math.min(1, 1200 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    Ev.cartaz = c.toDataURL('image/jpeg', .86);
    atualizarPreviaEv();
  } catch (err) { toast('Não consegui abrir essa imagem.'); }
}

async function gerarImagemEvento() {
  const e = eventoAberto();
  if (!e) return toast('Salve o evento primeiro.');
  const b = $('#evImagem'); b.disabled = true;
  try {
    const url = await imagemEvento(e);
    const nome = `Evento ${e.data} ${e.titulo}`.replace(/[\\/:*?"<>|]/g, '-').slice(0, 90);
    $('#evPrevia').innerHTML = `<img src="${url}" alt="${esc(nome)}" title="${esc(nome)}">`;
    if (!NO_APP) { const a = document.createElement('a'); a.href = url; a.download = nome + '.png'; a.click(); return toast('Imagem baixada.'); }
    if (!S.config.avisosPastaImagens) {
      const sug = await arqApp('midiaSugerir', { tipoMidia: 'image' }).catch(() => ({}));
      if (sug.pasta && confirm(`Salvar a imagem na pasta de imagens do Holyrics?\n\n${sug.pasta}\n\n(Cancelar = escolher outra pasta)`)) { S.config.avisosPastaImagens = sug.pasta; salvarConfig(); }
      else if (!await escolherPastaImagens()) return;
    }
    const r = await arqApp('imagensSalvar', { pasta: S.config.avisosPastaImagens, prefixo: nome, arquivos: [{ nome: nome + '.png', base64: url.split(',')[1] }] });
    toast(`🖼 Imagem salva em ${r.pasta}`);
  } catch (err) { alert('Não foi possível gerar a imagem:\n' + err.message); }
  finally { b.disabled = false; }
}

function imprimirEvento() {
  const e = eventoAberto();
  if (!e) return toast('Salve o evento primeiro.');
  const loc = localDoEvento(e);
  const corpo = `<div style="text-align:center">
      ${e.cartaz ? `<img src="${e.cartaz}" style="max-width:100%;max-height:118mm;border-radius:3mm;margin:2mm 0 5mm">` : ''}
      <div style="font:700 20pt/1.2 'Segoe UI',Arial,sans-serif">${esc(quandoEvento(e))}</div>
      ${loc ? `<div style="font-size:13pt;color:#444;margin-top:2mm">📍 ${esc(loc)}</div>` : ''}
      ${e.descricao ? `<p style="font-size:13pt;margin:4mm 10mm">${esc(e.descricao)}</p>` : ''}
      <img src="${qrDataUrl(veventDe(e), 900)}" style="width:${e.cartaz ? 62 : 95}mm;height:${e.cartaz ? 62 : 95}mm;margin-top:3mm">
      <div style="font:600 13pt 'Segoe UI',Arial,sans-serif">📱 Aponte a câmera do celular e salve o evento na sua agenda</div>
    </div>`;
  imprimirFolhaSec(e.titulo, '', corpo, `Evento ${e.data} ${e.titulo}`);
}

async function abrirEventos() {
  await carregarEventos();
  $('#evForm').hidden = true;
  Ev.editando = null;
  $('#evPrevia').innerHTML = '';
  renderEventos();
  abrirDialogo('dlgEventos');
}

function ligarEventosSec() {
  const dlg = $('#dlgEventos');
  $('#evNovo').addEventListener('click', () => abrirFormEv(null));
  $('#evPassados').addEventListener('change', renderEventos);
  $('#evfSalvar').addEventListener('click', salvarFormEv);
  $('#evfCancelar').addEventListener('click', () => { $('#evForm').hidden = true; Ev.editando = null; renderEventos(); });
  $('#evfCartazEscolher').addEventListener('click', () => $('#evfArquivo').click());
  $('#evfArquivo').addEventListener('change', e => { escolherCartaz(e.target.files[0]); e.target.value = ''; });
  $('#evfCartazTirar').addEventListener('click', () => { Ev.cartaz = ''; atualizarPreviaEv(); });
  $('#evImagem').addEventListener('click', gerarImagemEvento);
  $('#evImprimir').addEventListener('click', imprimirEvento);
  for (const id of ['evfTitulo', 'evfData', 'evfHora', 'evfDataFim', 'evfHoraFim', 'evfLocal', 'evfLocalTexto', 'evfDescricao', 'evfDiario'])
    $('#' + id).addEventListener('input', atualizarPreviaEv);
  // (1.9.5) data fim noutro dia com horário: já marca "todos os dias" (o caso comum: novena); dá para desmarcar
  $('#evfDataFim').addEventListener('change', () => {
    const v = $('#evfDataFim').value;
    if (v && v > $('#evfData').value && $('#evfHora').value && !Ev.editando) { $('#evfDiario').checked = true; atualizarPreviaEv(); }
  });
  dlg.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) e.preventDefault(); });
  dlg.addEventListener('click', e => {
    const it = e.target.closest('.ev-item');
    if (!it) return;
    const ev = Ev.lista.find(x => x.id === it.dataset.id);
    if (e.target.closest('[data-ev-apagar]')) {
      if (ev && confirm(`Apagar o evento?\n\n${ev.titulo}\n${quandoEvento(ev)}`)) {
        Ev.lista = Ev.lista.filter(x => x !== ev);
        if (Ev.editando === ev.id) { Ev.editando = null; $('#evForm').hidden = true; }
        apagarItemSec('ev', ev.id).then(() => { renderEventos(); aposMudarEventos(); });
      }
      return;
    }
    abrirFormEv(ev);
  });
}

// ================================================================ início
function iniciarCadastrosSecretaria() {
  $('#menubar').innerHTML = MENU_SECRETARIA;
  document.body.insertAdjacentHTML('beforeend', HTML_COMO_USAR_SEC + HTML_MARCACOES + HTML_INTENCOES + HTML_EVENTOS + HTML_CAMPANHAS + HTML_INT_TELAO + HTML_LGPD);
  ligarMarcacoes();
  ligarIntencoes();
  ligarIntTelao();          // (1.5.0) chave "Intenções no MiguelAngelus" (nasce desligada)
  ligarLgpd();              // (1.5.0) 🔒 dados de uma pessoa: procurar, relatório, apagar
  ligarEventosSec();
  ligarCampanhasSec();      // (1.9.6) 💝 campanhas de arrecadação (campanhas.js)
  if (typeof iniciarAgendaG === 'function') iniciarAgendaG();   // (protótipo) 📆 agenda da secretaria numa conta própria
  if (typeof iniciarEscala === 'function') iniciarEscala();     // (1.6.0) 📋 escala de voluntários (escala.js)
  // F1 abre o "Como usar" da Secretaria (o manual do MiguelAngelus não serve aqui)
  document.addEventListener('keydown', e => {
    if (e.key !== 'F1') return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!$('#dlgComoUsarSec').open) abrirDialogo('dlgComoUsarSec');
  }, true);
  Promise.all([carregarMarcacoes(), carregarIntencoes(), carregarEventos(), carregarCampanhas()]).then(() => { if (typeof renderSecretaria === 'function') renderSecretaria(); publicarIntencoesTelao(); });
  // as mudanças dos outros computadores da secretaria chegam sozinhas (a cada 2 minutos, se a nuvem estiver ligada)
  setInterval(() => { if (ligadaSync() && !Sync.ocupado) sincronizarAgora({ silencioso: true }).then(() => renderSecretaria()); }, 120000);
}
