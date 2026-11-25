'use strict';
/* (Secretaria — protótipo, 24/11/2026) 🌐 Portal das pastorais, aba das 📋 Escalas.
 *
 * O portal é um Google Apps Script na conta da paróquia (pasta portal/ do projeto). As pastorais entram com login e senha
 * do portal e escrevem a escala da função que a secretaria deu a elas; os dados ficam no Drive da paróquia.
 * A Secretaria NÃO lê o Drive do portal (o escopo drive.file só enxerga os arquivos dela): conversa com o portal pela
 * internet, com a chave da secretaria. A Secretaria cria o portal sozinha (🌐 Criar o portal: Apps Script API pelo
 * programa, app\GooglePortal.cs) e põe no código só o resumo da chave (CHAVE_HASH).
 *
 * Registro (store 'esc', pasta "secretaria/" da nuvem, só entre as Secretarias): secv-portal { url, chave, scriptId, deploymentId }
 *
 * O que vai ao portal (📤): as Missas do mês (dia, hora, igreja), as funções, o que está na escala de cada Missa,
 * as equipes (nome e membros) e os nomes de cada função. Nunca telefone, observação ou "avulso".
 * Funções de menores (coroinhas, acólitos): os nomes vão com o 1º nome e a inicial ("Ana S."); na volta, viram o nome
 * completo de novo quando só uma pessoa da função combina.
 * O que volta (📥): só o que as pastorais mudaram; a secretaria confere numa prévia e aplica (ou descarta).
 */

const Portal = { usuarios: null, previa: null, situacao: '', mes: '' };

const ehMenores = f => !!f && (/^(coroinhas|acolitos)$/.test(f.id) || /coroinha|ac[oó]lit/i.test(f.nome || ''));
const nomeCurtoPortal = n => { const p = String(n).trim().split(/\s+/); return p.length < 2 ? p[0] : `${p[0]} ${p.at(-1)[0].toUpperCase()}.`; };
const ehEquipe = n => !!equipePorNome(n);
// nomes de uma cela para o portal (menores: curto)
const celaParaPortal = (txt, f) => !ehMenores(f) ? String(txt || '') : nomesDe(txt).map(n => ehEquipe(n) ? n : nomeCurtoPortal(n)).join(', ');
// nomes que voltam do portal (menores: o nome completo, se só uma pessoa da função combina)
function celaDoPortal(txt, f) {
  const t = String(txt || '').trim();
  if (!t) return '—';
  if (!ehMenores(f)) return t;
  return nomesDe(t).map(n => {
    if (ehEquipe(n)) return n;
    const ps = [...new Set(Esc.pessoas.filter(p => p.funcoes?.includes(f.id) && (p.nome === n || nomeCurtoPortal(p.nome) === n)).map(p => p.nome))];
    return ps.length === 1 ? ps[0] : n;
  }).join(', ') || t;
}

async function chamarPortal(acao, dados = {}) {
  const c = Esc.portal;
  if (!c?.url || !c?.chave) throw new Error('Preencha o endereço e a chave do portal.');
  let r;
  try { r = await fetch(c.url, { method: 'POST', body: JSON.stringify({ acao, chave: c.chave, ...dados }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, redirect: 'follow' }); }
  catch (_) { throw new Error('Sem conexão com o portal (internet? endereço certo?).'); }
  if (!r.ok) throw new Error(`O portal respondeu ${r.status}.`);
  let j;
  try { j = await r.json(); } catch (_) {
    const e = new Error('O portal ainda não foi autorizado: clique em ↗ Abrir o portal, entre com a conta da paróquia e clique em Permitir.');
    e.semAutorizar = true; throw e;
  }
  if (!j.ok && /googleapis\.com\/auth\//.test(j.erro || '')) {          // código novo pedindo uma permissão que o dono ainda não deu
    const e = new Error('O código novo do portal precisa de uma permissão a mais.');
    e.semAutorizar = e.reautorizar = true; throw e;
  }
  if (!j.ok) throw new Error(j.erro || 'O portal recusou.');
  return j;
}

// ---------------------------------------------------------------- pacote do mês
function pacotePortal(mes) {
  const fs = funcoesEsc(), ocs = missasDoMes(mes, '');
  const missas = ocs.map(o => ({ chave: o.chave, iso: o.iso, hora: o.hora, texto: o.texto }));    // "Missa Matriz SJO"
  const base = {}, equipes = {}, pessoas = {};
  for (const o of ocs) for (const f of fs) { const v = valorCela(o, f); if (v) base[chaveCela(o, f.id)] = celaParaPortal(v, f); }
  for (const f of fs) {
    equipes[f.id] = Esc.equipes.filter(e => e.funcao === f.id).map(e => ({ nome: e.nome, membros: nomesDe(e.membros).map(n => ehMenores(f) ? nomeCurtoPortal(n) : n).join(', ') }));
    pessoas[f.id] = [...new Set(Esc.pessoas.filter(p => p.funcoes?.includes(f.id)).map(p => ehMenores(f) ? nomeCurtoPortal(p.nome) : p.nome))];
  }
  return { mes, funcoes: fs.map(f => ({ id: f.id, nome: f.nome, vagas: +f.vagas || 1, menores: ehMenores(f) })), missas, base, equipes, pessoas };
}

// ---------------------------------------------------------------- 🌐 criar o portal (a Secretaria faz tudo)
// O código do portal vai dentro do programa (web/portal). A Secretaria cria o projeto do Apps Script na conta da paróquia
// (app\GooglePortal.cs, ações portalStatus/portalConectar/portalApi), põe o código, publica como app da Web e gera a chave.
// A secretária só escolhe a conta, clica em Permitir e, no fim, abre o portal uma vez para o Google autorizar o Drive.
const ptApi = (metodo, caminho, corpo) => arqApp('portalApi', { metodo, caminho, corpo: corpo || null }, 120000).then(r => r.dados);

// (1.7.1) três lugares: ⚙ Ajustes → 🌐 Portal (conta Google, criar e atualizar), 📋 Escalas → 🌐 Portal (só escala)
// e o card 📆 Calendário pastoral (calendário, quem mexe nele, pastorais e 📝 relatórios do mês)
const HTML_LINK_PORTAL = `
  <div class="linha pt-link-linha"><span class="pequeno" data-pt-sit></span><span class="espaco"></span>
    <button type="button" data-pt-link title="Copia o link com um recado pronto para mandar pelo WhatsApp">📋 Copiar o link (WhatsApp)</button>
    <button type="button" data-pt-abrir>↗ Abrir o portal</button>
    <button type="button" data-pt-cfg title="Conta Google, criar e atualizar o portal">⚙ Portal e conta…</button></div>`;

const HTML_PORTAL_CFG = `
<dialog id="dlgPortalCfg" class="dlg-sec dlg-sec-largo">
  <form method="dialog" class="form">
    <h2>🌐 Portal das pastorais e conta Google</h2>
    <p class="sutil pequeno" style="margin:0 0 6px">Uma página na internet, com login e senha do próprio portal, com duas partes:
      <b>📆 Calendário pastoral</b> (cada coordenação põe os eventos e o relatório do mês da sua pastoral) e <b>📋 Escala das Missas</b> (só quem a secretaria liberou).
      Os dados ficam no <b>Google Drive da conta escolhida</b>. Aqui fica só a conta e o portal; quem entra e o que pode mudar fica nos cards <b>📆 Calendário pastoral</b> e <b>📋 Escalas</b>.</p>
    <div class="esc-pt-conta">
      <b class="pequeno">Conta Google do portal e das agendas</b>
      <label class="pequeno"><input type="radio" name="ptConta" value="nuvem"> A mesma da ☁ nuvem (a que sincroniza com os outros MiguelAngelus)</label>
      <label class="pequeno"><input type="radio" name="ptConta" value="propria"> Uma conta à parte, só para o portal e as agendas (escalas, calendário pastoral)</label>
      <div class="linha pequeno"><span id="ptContaInfo" class="sutil"></span><span class="espaco"></span>
        <button type="button" id="ptContaArq" hidden title="O arquivo JSON do ID do cliente, baixado no Google Cloud da conta à parte">📄 Trocar o arquivo do Google…</button>
        <button type="button" id="ptContaTrocar" hidden title="Na próxima vez o Google pergunta de novo qual conta usar">🔄 Entrar com outra conta</button></div>
    </div>
    <div id="ptCriar" class="esc-pt-criar" hidden>
      <button type="button" id="ptCriarBt" class="primario">🌐 Criar o portal da paróquia</button>
      <p class="sutil pequeno">A Secretaria cria o portal sozinha na <b>conta Google escolhida acima</b>. Ela pede o <b>arquivo do Google (JSON)</b>
        baixado no Google Cloud, se ainda não tiver. O Google vai pedir para escolher a conta e <b>Permitir</b>; no fim,
        o portal abre uma vez para você clicar em <b>Permitir</b> de novo. De graça, uns 2 minutos.</p>
      <ol id="ptPassos" class="esc-pt-passos" hidden></ol>
    </div>
    <div id="ptPronto" class="linha" hidden>
      <span id="ptLink" class="pequeno"></span><span class="espaco"></span>
      <button type="button" data-pt-link>📋 Copiar o link (WhatsApp)</button>
      <button type="button" data-pt-abrir>↗ Abrir o portal</button>
      <button type="button" id="ptAtualizarCod" hidden title="Põe o código novo do portal (o link e os dados continuam os mesmos)">⬆ Atualizar o portal</button>
    </div>
    <p id="ptSituacao" class="pequeno"></p>
    <details class="esc-pt-avancado"><summary class="pequeno sutil">Avançado: endereço e chave do portal</summary>
      <p class="sutil pequeno">Só para quem já tem um portal criado de outro jeito (ou para trocar de portal). Normalmente a Secretaria preenche sozinha.</p>
      <div class="linha">
        <label class="campo" style="flex:2">Endereço do portal <input id="ptUrl" placeholder="https://script.google.com/macros/s/…/exec" spellcheck="false"></label>
        <label class="campo">Chave da secretaria <input id="ptChave" type="password" placeholder="MA-XXXX-XXXX-…" spellcheck="false"></label>
        <button type="button" id="ptSalvar">Salvar e testar</button>
      </div>
      <p class="sutil pequeno">Código do portal, para montar à mão no Apps Script:
        <button type="button" data-pt-copiar="Codigo.gs">📋 Código.gs</button> <button type="button" data-pt-copiar="Portal.html">📋 Portal (HTML)</button>
        <button type="button" data-pt-copiar="appsscript.json">📋 appsscript.json</button></p>
    </details>
    <div class="linha"><span class="espaco"></span><button value="fechar">Fechar</button></div>
  </form>
</dialog>`;

// 📋 Escalas → 🌐 Portal: só o que é da escala
const HTML_PORTAL = `
  <p class="sutil pequeno" style="margin:0 0 6px">🌐 No portal, cada coordenação escreve a escala das funções que você liberar. O que elas mudam passa por uma prévia aqui, para pôr na escala ou descartar.</p>
  <p class="pequeno esc-pt-sem" data-pt-sem hidden>O portal ainda não foi criado. <button type="button" data-pt-cfg class="primario">⚙ Criar o portal…</button></p>
  <div data-pt-com hidden>${HTML_LINK_PORTAL}
  <div id="ptCorpo" hidden>
    <h3 class="esc-pt-tit">🙋 Pedidos de acesso à escala <button type="button" data-pt-atualizar class="pequeno">↻ Atualizar</button></h3>
    <div id="ptPedidos"></div>
    <h3 class="esc-pt-tit">🔑 Quem pode mudar a escala</h3>
    <div id="ptUsuarios"></div>
    <h3 class="esc-pt-tit">📅 Escala do mês no portal</h3>
    <div class="linha">
      <label class="campo">Mês <input type="month" id="ptMes"></label>
      <button type="button" id="ptEnviar" title="Manda as Missas do mês, o que já está na escala, as equipes e os nomes de cada função">📤 Mandar o mês ao portal</button>
      <button type="button" id="ptTrazer" class="primario">📥 Ver o que as pastorais mudaram</button>
    </div>
    <div id="ptPrevia"></div>
  </div></div>`;

// card 📆 Calendário pastoral
const HTML_CAL_PASTORAL = `
<dialog id="dlgCalPastoral" class="dlg-sec dlg-sec-largo">
  <form method="dialog" class="form">
    <h2>📆 Calendário pastoral</h2>
    <p class="sutil pequeno" style="margin:0 0 6px">No portal, cada coordenação põe os eventos da sua pastoral (em qualquer dia; todos veem tudo) e o 📝 resumo das atividades do mês.
      Os 🎉 eventos com cartaz da Secretaria entram sozinhos, como da paróquia.</p>
    <p class="pequeno esc-pt-sem" data-pt-sem hidden>O portal ainda não foi criado. <button type="button" data-pt-cfg class="primario">⚙ Criar o portal…</button></p>
    <div data-pt-com hidden>${HTML_LINK_PORTAL}
    <div class="esc-abas" role="tablist">
      <button type="button" data-cp-aba="cal">📅 Calendário</button>
      <button type="button" data-cp-aba="acesso">🙋 Quem pode mexer</button>
      <button type="button" data-cp-aba="pastorais">⛪ Pastorais e programação</button>
      <button type="button" data-cp-aba="rel">📝 Relatórios do mês</button>
    </div>
    <div data-cp-painel="cal">
      <div class="linha">
        <button type="button" id="calAnt" title="Mês anterior">◀</button><b id="calMesNome" class="cp-mes"></b><button type="button" id="calProx" title="Próximo mês">▶</button>
        <label class="campo">Pastoral <select id="calFiltro"></select></label>
        <span class="espaco"></span>
        <button type="button" id="calImprimir">🖨 Imprimir o mês…</button>
        <button type="button" id="calNovo" class="primario">＋ Novo evento</button>
      </div>
      <div id="calForm" class="esc-form" hidden>
        <div class="linha">
          <label class="campo" style="flex:2">Nome do evento <input id="calfTitulo" maxlength="120"></label>
          <label class="campo">Pastoral <select id="calfPastoral"></select></label>
        </div>
        <div class="linha">
          <label class="campo">Dia <input type="date" id="calfIni"></label>
          <label class="campo">Até (se for mais de um dia) <input type="date" id="calfFim"></label>
          <label class="campo">Hora <input type="time" id="calfHora"></label>
          <label class="campo" style="flex:2">Local <input id="calfLocal" maxlength="120"></label>
        </div>
        <label class="campo">Detalhes <textarea id="calfDesc" maxlength="1000" rows="2"></textarea></label>
        <p id="calfAviso" class="pequeno"></p>
        <div class="linha"><span id="calfQuem" class="sutil pequeno"></span><span class="espaco"></span>
          <button type="button" id="calfApagar" class="perigo" hidden>🗑 Apagar</button>
          <button type="button" id="calfCancelar">Cancelar</button><button type="button" id="calfSalvar" class="primario">Salvar no portal</button></div>
      </div>
      <div id="calLista" class="cp-lista"></div>
    </div>
    <div data-cp-painel="acesso" hidden>
      <h3 class="esc-pt-tit">🙋 Pedidos de acesso ao calendário <button type="button" data-pt-atualizar class="pequeno">↻ Atualizar</button></h3>
      <div id="calPedidos"></div>
      <h3 class="esc-pt-tit">🔑 Quem pode pôr e mudar eventos</h3>
      <p class="sutil pequeno" style="margin:0 0 6px">Cada um muda só os eventos (e o relatório) das pastorais marcadas. <b>“muda tudo”</b> = muda qualquer evento, inclusive os da paróquia (secretaria, você).
        Quem entra no portal sem nada marcado aqui só vê o calendário.</p>
      <div id="calUsuarios"></div>
    </div>
    <div data-cp-painel="pastorais" hidden>
      <label class="pequeno esc-chk"><input type="checkbox" id="ptAgAberta"> Qualquer pessoa com o link pode <b>ver</b> o calendário sem entrar (só ver: sem mudar nada e sem os nomes de quem lançou). A escala nunca abre sem entrar.</label>
      <div class="linha">
        <label class="campo" style="flex:2">Pastorais e movimentos (um por linha; a “Paróquia (secretaria)” já vem sempre)
          <textarea id="ptPastorais" rows="8" spellcheck="false" placeholder="Catequese&#10;ECC&#10;Pastoral do Batismo"></textarea></label>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button type="button" id="ptPastSalvar">💾 Salvar as pastorais</button>
          <button type="button" id="ptAgImportar" title="Um arquivo .json com a programação (ex.: o calendário do ano da paróquia); o que já está lá não se repete">📥 Trazer uma programação…</button>
          <input type="file" id="ptAgArq" accept=".json,application/json" hidden>
        </div>
      </div>
      <p id="ptAgInfo" class="sutil pequeno"></p>
      <div class="linha cp-logo2">
        <span class="pequeno"><b>Logo da Pascom</b> (opcional): aparece no portal ao lado do brasão da paróquia, num fundo escuro.</span>
        <span id="ptLogo2Previa" class="cp-logo2-previa"></span><span class="espaco"></span>
        <button type="button" id="ptLogo2Escolher">🖼 Escolher a imagem…</button>
        <button type="button" id="ptLogo2Tirar" hidden>✕ Tirar</button>
        <input type="file" id="ptLogo2Arq" accept="image/png,image/jpeg,image/webp" hidden>
      </div>
    </div>
    <div data-cp-painel="rel" hidden>
      <div class="linha">
        <label class="campo">De <input type="month" id="calrDe"></label>
        <label class="campo">Até <input type="month" id="calrAte"></label>
        <button type="button" id="calrVer">Ver</button>
        <span class="espaco"></span>
        <button type="button" id="calrImprimir" class="primario">🖨 Imprimir o relatório…</button>
      </div>
      <div id="calrLista"></div>
    </div>
    </div>
    <div class="linha"><span class="espaco"></span><button value="fechar">Fechar</button></div>
  </form>
</dialog>`;

function renderPortalEsc() {
  const c = Esc.portal || {};
  if (document.activeElement?.id !== 'ptUrl') $('#ptUrl').value = c.url || '';
  if (document.activeElement?.id !== 'ptChave') $('#ptChave').value = c.chave || '';
  $('#ptMes').value = Portal.mes || Esc.mes;
  $('#ptCriar').hidden = !!(c.url && c.chave);
  $('#ptPronto').hidden = !(c.url && c.chave);
  $('#ptLink').textContent = c.url ? '🔗 ' + c.url.replace(/^https:\/\//, '').slice(0, 60) + '…' : '';
  $('#ptAtualizarCod').hidden = !(c.scriptId && Portal.versaoNova && Portal.versao && cmpVersao(Portal.versaoNova, Portal.versao) > 0);
  $('#ptPassos').hidden = !Portal.passos;
  if (Portal.passos) $('#ptPassos').innerHTML = Portal.passos.map(p => `<li class="${p.ok ? 'ok' : p.erro ? 'erro' : p.ag ? 'ag' : ''}">${p.ok ? '✔' : p.erro ? '⚠' : p.ag ? '⏳' : '·'} ${p.txt}</li>`).join('');
  $('#ptCriarBt').disabled = !!Portal.criando;
  // (1.7.1) conta do portal: a da nuvem ou uma à parte
  const ct = Portal.conta;
  if (ct) {
    $$('input[name=ptConta]').forEach(r => { r.checked = r.value === (ct.proprio ? 'propria' : 'nuvem'); r.disabled = !!Portal.criando; });
    $('#ptContaInfo').textContent = !ct.temCliente ? (ct.proprio ? 'Falta o arquivo do Google da conta à parte.' : 'A ☁ nuvem ainda não tem o arquivo do Google: ele é pedido ao criar o portal.')
      : ct.conectado ? 'Entrou como ' + (ct.email || '?') : 'Ainda não entrou: o Google pergunta a conta ao criar o portal.';
    $('#ptContaArq').hidden = !ct.proprio;
    $('#ptContaTrocar').hidden = !ct.conectado;
  }
  $('#ptAgAberta').checked = c.agendaAberta !== false;
  if (document.activeElement?.id !== 'ptPastorais') $('#ptPastorais').value = pastoraisPortal().map(p => p.nome).join('\n');
  $('#ptSituacao').innerHTML = Portal.situacao || '';
  // nas Escalas e no Calendário: o portal existe? a situação, o link e o resto
  const tem = !!(c.url && c.chave);
  $$('[data-pt-sem]').forEach(e => e.hidden = tem);
  $$('[data-pt-com]').forEach(e => e.hidden = !tem);
  $$('[data-pt-sit]').forEach(e => e.innerHTML = Portal.situacao || '');
  $('#ptLogo2Previa').innerHTML = c.logo2 ? `<img src="${c.logo2}" alt="">` : '<span class="sutil pequeno">sem logo</span>';
  $('#ptLogo2Tirar').hidden = !c.logo2;
  $('#ptCorpo').hidden = !Portal.usuarios || !tem;
  if (Portal.usuarios) { renderUsuariosPortal('escala'); renderUsuariosPortal('calendario'); }
  renderPreviaPortal();
}

const quandoBR = iso => { try { const d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (_) { return iso || ''; } };
const chkFuncoesPortal = (marcadas, pedida = '') => `<span class="esc-pt-funcs">${funcoesEsc().map(f => {
  const sim = marcadas.includes(f.id) || (!marcadas.length && pedida && semAcento(pedida) === semAcento(f.nome));
  return `<label class="esc-chk"><input type="checkbox" data-pt-f="${esc(f.id)}"${sim ? ' checked' : ''}> ${esc(f.nome)}</label>`;
}).join('')}</span>`;

// (1.7.1) agenda pastoral: de quais pastorais a pessoa muda os eventos, ou "muda tudo" (secretaria)
const pastoraisPortal = () => (Esc.portal?.pastorais || Portal.pastoraisDoPortal || []);
const chkPastoraisPortal = (u, pedida = '') => `<span class="esc-pt-funcs">${pastoraisPortal().map(p => {
  const sim = (u.pastorais || []).includes(p.id) || (!(u.pastorais || []).length && pedida && semAcento(pedida) === semAcento(p.nome));
  return `<label class="esc-chk"><input type="checkbox" data-pt-p="${esc(p.id)}"${sim ? ' checked' : ''}> ${esc(p.nome)}</label>`;
}).join('')}<label class="esc-chk" title="Muda qualquer evento da agenda, inclusive os da paróquia"><input type="checkbox" data-pt-adm${u.admin ? ' checked' : ''}> <b>muda tudo</b></label></span>`;

// (1.7.1) cada card aprova a sua parte: 'escala' (📋 Escalas) ou 'calendario' (📆 Calendário pastoral)
const querPortal = (u, area) => !Array.isArray(u.pedido?.quer) || u.pedido.quer.includes(area);   // pedidos antigos: os dois
const temAreaPortal = (u, area) => area === 'escala' ? (u.funcoes || []).length > 0 : (u.pastorais || []).length > 0 || !!u.admin;
function renderUsuariosPortal(area) {
  const esc_ = area === 'escala', elPed = esc_ ? '#ptPedidos' : '#calPedidos', elUs = esc_ ? '#ptUsuarios' : '#calUsuarios';
  if (!$(elPed)) return;
  const us = Portal.usuarios || [];
  const chk = (u, pedida) => esc_ ? chkFuncoesPortal(pedida === undefined ? u.funcoes || [] : [], pedida) : chkPastoraisPortal(u, pedida);
  const pend = us.filter(u => u.situacao === 'pendente' && querPortal(u, area));
  // quem já entra: primeiro quem tem acesso a esta parte; depois quem pediu e ainda não tem; depois o resto
  const outros = us.filter(u => u.situacao === 'ativo' || u.situacao === 'desativado')
    .map(u => ({ u, ord: temAreaPortal(u, area) ? 0 : querPortal(u, area) && Array.isArray(u.pedido?.quer) ? 1 : 2 }))
    .sort((a, b) => a.ord - b.ord || a.u.nome.localeCompare(b.u.nome, 'pt-BR'));
  $(elPed).innerHTML = !pend.length ? '<p class="sutil pequeno">Nenhum pedido esperando.</p>'
    : `<table class="esc-tab"><thead><tr><th>Nome</th><th>E-mail</th><th>Pediu</th><th>${esc_ ? 'Pode mudar a escala de' : 'Pode pôr eventos de'}</th><th></th></tr></thead><tbody>${pend.map(u => `
      <tr data-pt-id="${esc(u.id)}" data-pt-area="${area}"><td><b>${esc(u.nome)}</b><br><small class="sutil">${esc(quandoBR(u.criado))}</small></td><td>${esc(u.email)}</td>
        <td>${esc(u.pedido?.funcao || '')}${Array.isArray(u.pedido?.quer) && u.pedido.quer.length > 1 ? '<br><small class="sutil">(escala e calendário)</small>' : ''}${u.pedido?.recado ? `<br><small class="sutil">“${esc(u.pedido.recado)}”</small>` : ''}</td>
        <td>${chk(u, u.pedido?.funcao || '')}</td>
        <td class="esc-acoes"><button type="button" class="primario" data-pt="aprovar">✔ Aprovar</button><button type="button" class="perigo" data-pt="recusar" title="Recusa o acesso ao portal">Recusar</button></td></tr>`).join('')}</tbody></table>`;
  $(elUs).innerHTML = !outros.length ? '<p class="sutil pequeno">Ninguém ainda.</p>'
    : `<table class="esc-tab"><thead><tr><th>Nome</th><th>E-mail</th><th>${esc_ ? 'Pode mudar a escala de' : 'Pode pôr e mudar eventos de'}</th><th>Último acesso</th><th></th></tr></thead><tbody>${outros.map(({ u, ord }) => `
      <tr data-pt-id="${esc(u.id)}" data-pt-area="${area}" class="${u.situacao === 'desativado' ? 'esc-pt-off' : ''} ${ord === 2 ? 'esc-pt-sem-area' : ''}"><td><b>${esc(u.nome)}</b>${u.situacao === 'desativado' ? '<br><small class="sutil">⏸ desativado</small>' : ''}${u.trocarSenha ? '<br><small class="sutil">senha provisória</small>' : ''}${ord === 1 ? '<br><small class="esc-pt-pediu">🙋 pediu acesso a esta parte</small>' : ''}</td><td>${esc(u.email)}</td>
        <td>${chk(u)} <button type="button" data-pt="funcoes" class="pequeno">Salvar</button></td>
        <td>${u.ultimo ? esc(quandoBR(u.ultimo)) : '<span class="sutil">nunca</span>'}</td>
        <td class="esc-acoes"><button type="button" data-pt="zerarSenha" title="Cria uma senha provisória para a pessoa entrar e escolher outra">🔑 Senha provisória</button>
          ${u.situacao === 'ativo' ? '<button type="button" data-pt="desativar" title="Desativa o acesso ao portal inteiro">⏸ Desativar</button>' : '<button type="button" data-pt="reativar">▶ Reativar</button>'}
          <button type="button" class="perigo" data-pt="apagar" title="Apaga o cadastro (LGPD)">✕</button></td></tr>`).join('')}</tbody></table>`;
}
function renderPreviaPortal() {
  const p = Portal.previa;
  if (!p) return $('#ptPrevia').innerHTML = '';
  const extras = Object.entries(p.extras || {}).flatMap(([fid, ns]) => {
    const f = funcoesEsc().find(x => x.id === fid);
    return f ? ns.filter(n => !Esc.pessoas.some(q => q.funcoes?.includes(fid) && (q.nome === n || nomeCurtoPortal(q.nome) === n))).map(n => `${n} <small class="sutil">(${esc(f.nome)})</small>`) : [];
  });
  $('#ptPrevia').innerHTML = (p.linhas.length
    ? `<p class="pequeno">Mudanças das pastorais em <b>${esc(p.nomeMes)}</b> que ainda não estão na escala (mandado ao portal em ${esc(quandoBR(p.enviado))}):</p>
      <table class="esc-tab"><thead><tr><th></th><th>Missa</th><th>Função</th><th>Na Secretaria</th><th>No portal</th><th>Quem mudou</th></tr></thead><tbody>${p.linhas.map((l, i) => `
        <tr><td><input type="checkbox" data-pt-l="${i}" checked></td><td>${esc(l.missa)}</td><td>${esc(l.funcao)}</td>
          <td class="sutil">${esc(l.aqui || '—')}</td><td><b>${esc(l.la)}</b></td><td><small>${esc(l.porNome)}<br>${esc(quandoBR(l.em))}</small></td></tr>`).join('')}</tbody></table>
      <div class="linha"><span class="espaco"></span>
        <button type="button" id="ptDescartar" title="As desmarcadas somem do portal (volta o que está na Secretaria)">✖ Descartar as desmarcadas</button>
        <button type="button" id="ptAplicar" class="primario">✔ Pôr as marcadas na escala</button></div>`
    : `<p class="sutil pequeno">Nada novo das pastorais em ${esc(p.nomeMes)}${p.enviado ? '' : ' (o mês ainda não foi mandado ao portal: use 📤)'}.</p>`)
    + (p.fora ? `<p class="sutil pequeno">${p.fora} mudança(s) de Missas que não estão mais na Agenda foram ignoradas.</p>` : '')
    + (extras.length ? `<p class="pequeno">🙋 Nomes que as pastorais acrescentaram e ainda não estão em 🙋 Pessoas: ${extras.join(', ')}</p>` : '');
}

// ---------------------------------------------------------------- ações
async function testarPortal() {
  Portal.situacao = '⏳ Falando com o portal…'; renderPortalEsc();
  try {
    const r = await chamarPortal('ping');
    await chamarPortal('configurar', cfgParaPortal(await brasaoParaPortal()));
    enviarEventosSecPortal().catch(() => {});      // 🎉 eventos com cartaz → calendário pastoral
    // pastorais da agenda: se esta Secretaria ainda não tem a lista, mostra a que está no portal (portal 0.2.0+)
    if (!Array.isArray(Esc.portal?.pastorais) && cmpVersao(r.versao || '0', '0.2.0') >= 0)
      try { Portal.pastoraisDoPortal = (await chamarPortal('agendaLer')).pastorais.filter(p => p.id !== 'paroquia'); } catch (_) {}
    Portal.usuarios = (await chamarPortal('usuarios')).usuarios;
    Portal.versao = r.versao;
    if (Portal.versaoNova === undefined) await versaoDoCodigoPortal();
    situacaoPortal();
  } catch (e) {
    Portal.usuarios = null;
    Portal.situacao = '⚠ ' + esc(e.message) + (e.reautorizar ? htmlReautorizar() : e.semAutorizar ? ' Depois clique em <button type="button" id="ptJaPermiti" class="primario">✔ Já permiti</button>' : '');
  }
  renderPortalEsc();
}
const cfgParaPortal = brasao => ({ paroquia: Agenda.dados.paroquia?.nome || '', ...(brasao !== undefined ? { brasao } : {}),
  funcoes: funcoesEsc().map(f => ({ id: f.id, nome: f.nome })), agendaAberta: Esc.portal?.agendaAberta !== false,
  ...(Array.isArray(Esc.portal?.pastorais) ? { pastorais: Esc.portal.pastorais } : {}),    // sem lista aqui: não apaga a do portal
  ...(typeof Esc.portal?.logo2 === 'string' ? { logo2: Esc.portal.logo2 } : {}) });

// logo da Pascom: reduzido para 160 px de altura (PNG, com o fundo transparente)
async function escolherLogo2Portal(arq) {
  try {
    const url = await new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = falha; r.readAsDataURL(arq); });
    const img = await carregarImagem(url), h = Math.min(160, img.naturalHeight), w = Math.round(img.naturalWidth * h / img.naturalHeight);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, w, h);
    const png = c.toDataURL('image/png');
    if (png.length > 300000) return toast('Imagem grande demais, mesmo reduzida.');
    await gravarCfgPortal({ logo2: png });
    await chamarPortal('configurar', cfgParaPortal());
    toast('Logo mandado ao portal.'); renderPortalEsc();
  } catch (e) { toast('⚠ ' + (e.message || 'Não deu para ler essa imagem.')); }
}
async function tirarLogo2Portal() {
  try { await gravarCfgPortal({ logo2: '' }); await chamarPortal('configurar', cfgParaPortal()); toast('Logo tirado do portal.'); renderPortalEsc(); }
  catch (e) { toast('⚠ ' + e.message); }
}

// 🗓 pastorais da agenda: uma por linha; quem já existia fica com o mesmo id (os eventos continuam dela)
const idPastoral = nome => semAcento(nome).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'pastoral';
function pastoraisDoTexto(txt) {
  const ant = pastoraisPortal(), out = [];
  for (const nome of String(txt || '').split(/\r?\n/).map(s => s.trim().slice(0, 80)).filter(Boolean)) {
    if (/^par[oó]quia( \(secretaria\))?$/i.test(nome) || out.some(p => semAcento(p.nome).toLowerCase() === semAcento(nome).toLowerCase())) continue;
    const velho = ant.find(p => semAcento(p.nome).toLowerCase() === semAcento(nome).toLowerCase());
    let id = velho ? velho.id : idPastoral(nome);
    while (!velho && (id === 'paroquia' || out.some(p => p.id === id) || ant.some(p => p.id === id))) id += '-2';
    out.push({ id, nome });
  }
  return out;
}
async function salvarPastoraisPortal(lista, aberta) {
  await gravarCfgPortal({ pastorais: lista ?? pastoraisDoTexto($('#ptPastorais').value), agendaAberta: aberta ?? Esc.portal?.agendaAberta !== false });
  await chamarPortal('configurar', cfgParaPortal());
}
async function importarAgendaPortal(arq) {
  let j;
  try { j = JSON.parse(await arq.text()); } catch (_) { return toast('Esse arquivo não é uma programação (.json) da agenda.'); }
  const evs = Array.isArray(j?.eventos) ? j.eventos : null;
  if (!evs || !evs.length) return toast('O arquivo não tem eventos.');
  // pastorais do arquivo que ainda não estão na lista entram nela
  const lista = [...pastoraisPortal()];
  for (const p of (Array.isArray(j.pastorais) ? j.pastorais : [])) if (p?.id && p?.nome && p.id !== 'paroquia' && !lista.some(q => q.id === p.id)) lista.push({ id: String(p.id).slice(0, 40), nome: String(p.nome).slice(0, 80) });
  const ids = new Set(['paroquia', ...lista.map(p => p.id)]), sem = evs.filter(e => !ids.has(e?.pastoral)).length;
  if (!confirm(`Trazer ${evs.length} evento(s) de "${arq.name}" para a agenda pastoral do portal?${sem ? `\n\n${sem} sem pastoral conhecida ficam de fora.` : ''}\n\nO que já está lá (mesmo nome, dia e pastoral) não se repete.`)) return;
  try {
    $('#ptAgInfo').textContent = '⏳ Mandando ao portal…';
    await salvarPastoraisPortal(lista);
    const r = await chamarPortal('agendaImportar', { eventos: evs.filter(e => ids.has(e?.pastoral)) });
    $('#ptAgInfo').textContent = `✔ ${r.novos} evento(s) novo(s) na agenda${r.iguais ? `; ${r.iguais} já estavam lá` : ''}.`;
    renderPortalEsc();
  } catch (e) { $('#ptAgInfo').textContent = ''; toast('⚠ ' + e.message); }
}

// brasão da paróquia para o cabeçalho do portal: o mesmo da ⬇ planilha (canto superior esquerdo do telão), PNG pequeno
async function brasaoParaPortal() {
  try {
    const b = await brasaoParaPlanilha(64);           // 64 px de altura × 3 = nítido no celular
    if (!b) return '';
    let s = ''; for (let i = 0; i < b.png.length; i += 0x8000) s += String.fromCharCode(...b.png.subarray(i, i + 0x8000));
    const url = 'data:image/png;base64,' + btoa(s);
    return url.length > 300000 ? '' : url;
  } catch (_) { return ''; }
}
function situacaoPortal() {
  const us = Portal.usuarios || [], at = us.filter(u => u.situacao === 'ativo').length, pe = us.filter(u => u.situacao === 'pendente').length;
  Portal.situacao = `✅ Portal ${esc(Portal.versao || '')} respondendo: ${at} com acesso, ${pe ? `<b>${pe} pedido${pe === 1 ? '' : 's'} esperando</b>` : 'nenhum pedido esperando'}.`
    + (Portal.versaoNova && Portal.versao && cmpVersao(Portal.versaoNova, Portal.versao) > 0
      ? `<br>⬆ <b>Há código novo do portal (${esc(Portal.versaoNova)})</b>: ${Esc.portal?.scriptId ? 'clique em ⬆ Atualizar o portal' : 'copie o código novo em Avançado'} (o link e os dados continuam os mesmos).` : '');
}
const cmpVersao = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };

// o código do portal vai junto com a Secretaria (pasta portal/), para a paróquia copiar e colar no Apps Script
async function textoDoPortal(arq) {
  const r = await fetch('portal/' + arq, { cache: 'no-store' });
  if (!r.ok) throw new Error('arquivo do portal não encontrado: ' + arq);
  return r.text();
}
async function copiarArquivoPortal(arq, botao) {
  try {
    await navigator.clipboard.writeText(await textoDoPortal(arq));
    const t = botao.textContent; botao.textContent = '✔ Copiado: agora cole lá'; setTimeout(() => { botao.textContent = t; }, 4000);
  } catch (e) { toast('⚠ Não deu para copiar: ' + e.message); }
}
async function versaoDoCodigoPortal() {
  try { Portal.versaoNova = ((await textoDoPortal('Codigo.gs')).match(/VERSAO_PORTAL\s*=\s*'([\d.]+)'/) || [])[1] || ''; } catch (_) { Portal.versaoNova = ''; }
}

// ---------------------------------------------------------------- 🌐 criar / ⬆ atualizar (Apps Script API, pelo programa)
const novaChavePortal = () => 'MA-' + Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase().match(/.{4}/g).join('-');
async function resumoChave(chave) {               // = resumo_() do Codigo.gs: SHA-256 do texto UTF-8, em base64
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(chave)));
  return btoa(String.fromCharCode(...d));
}
async function arquivosPortal(chave) {
  const [cod, html, man] = await Promise.all(['Codigo.gs', 'Portal.html', 'appsscript.json'].map(textoDoPortal));
  const h = await resumoChave(chave), cod2 = cod.replace(/const CHAVE_HASH = '[^']*';/, `const CHAVE_HASH = '${h}';`);
  if (cod2 === cod) throw new Error('o código do portal desta Secretaria está estranho (sem CHAVE_HASH)');
  return { versao: (cod.match(/VERSAO_PORTAL\s*=\s*'([\d.]+)'/) || [])[1] || '', files: [
    { name: 'Codigo', type: 'SERVER_JS', source: cod2 }, { name: 'Portal', type: 'HTML', source: html }, { name: 'appsscript', type: 'JSON', source: man }] };
}
async function gravarCfgPortal(mudar) {
  const ant = Esc.portal, item = { ...(ant || {}), id: 'portal', ...mudar };
  if (!await gravarItemSec('esc', item, { versaoAberta: ant?.versao || 0, rotulo: 'o portal' })) { await carregarEscala(); throw new Error('outro computador mudou o portal agora; tente de novo'); }
  Esc.portal = item;
}
// erros do programa → o que fazer
function erroApiPortal(e) {
  const m = String(e.message || e);
  if (m.includes('[API_USUARIO]')) return `Falta um sim na conta Google: abra <a href="https://script.google.com/home/usersettings" target="_blank">script.google.com/home/usersettings</a>
    (com a conta da paróquia), ligue a <b>API do Google Apps Script</b> e clique de novo em 🌐 Criar o portal.`;
  const c = /\[API_CLOUD\](\S+)/.exec(m);
  if (c) return `Falta ativar a <b>Apps Script API</b> no projeto do Google Cloud do arquivo do Google ${Portal.conta?.proprio ? 'da conta à parte' : 'da ☁ nuvem'}:
    abra <a href="${esc(c[1])}" target="_blank">esta página</a> <b>com a conta dona desse projeto</b>, clique em <b>Ativar</b>, espere 1 minuto e clique de novo em 🌐 Criar o portal.
    ${Portal.conta?.proprio ? '' : 'Se a conta dona da nuvem estiver travada, escolha acima <b>Uma conta à parte</b>.'}`;
  return esc(m.replace(/\[API_\w+\]/g, ''));
}

async function criarPortal() {
  if (Portal.criando) return;
  Portal.criando = true;
  const passos = Portal.passos = [
    { txt: 'Arquivo e conta Google da paróquia' }, { txt: 'Criar o projeto do portal' }, { txt: 'Pôr o código' }, { txt: 'Publicar o portal' }, { txt: 'Autorizar (você clica em Permitir)' }];
  let i = 0;
  const vai = () => { passos[i].ag = true; renderPortalEsc(); };
  const feito = (extra = '') => { passos[i].ag = false; passos[i].ok = true; if (extra) passos[i].txt += ': ' + extra; i++; };
  Portal.situacao = '';
  try {
    vai();
    let st = await arqApp('portalStatus');
    if (!st.temCliente) {
      // sem a ☁ nuvem: o portal só precisa do arquivo do Google, não precisa ligar a sincronização.
      // (1.7.1) conta à parte: o arquivo vai só para o portal e as agendas, nunca para a nuvem
      toast('Escolha o arquivo do Google (JSON) baixado no Google Cloud: Clientes → App para computador → Baixar o JSON.');
      try { await arqApp(st.proprio ? 'portalCarregarCliente' : 'googleCarregarCliente', {}, 600000); }
      catch (e) { throw new Error(e.message === 'cancelado' ? 'Falta o arquivo do Google (JSON) para criar o portal.' : e.message); }
      st = await arqApp('portalStatus');
      if (!st.temCliente) throw new Error('O arquivo do Google não foi aceito.');
    }
    if (!st.conectado) { toast('O navegador vai abrir: escolha a conta Google e clique em Permitir.'); st = { ...st, ...(await arqApp('portalConectar', {}, 600000)) }; }
    Portal.conta = { ...st, conectado: true };
    feito(st.email || '');

    vai();
    let c = Esc.portal || {};
    // (1.7.1) o projeto guardado é de outra conta: começa um portal novo nesta
    if (c.scriptId && c.conta && st.email && c.conta !== st.email) { await gravarCfgPortal({ scriptId: '', chave: '', url: '', deploymentId: '', conta: '' }); c = Esc.portal; }
    const chave = c.chave && c.scriptId ? c.chave : novaChavePortal();
    let scriptId = c.scriptId;
    if (!scriptId) {
      const nome = 'Portal das pastorais' + (Agenda.dados.paroquia?.nome ? ' · ' + Agenda.dados.paroquia.nome : '');
      scriptId = (await ptApi('POST', 'projects', { title: nome })).scriptId;
      await gravarCfgPortal({ scriptId, chave, url: '', deploymentId: '', conta: st.email || '' });       // se cair no meio, a próxima tentativa usa o mesmo projeto
    }
    feito();

    vai();
    const arq = await arquivosPortal(chave);
    await ptApi('PUT', `projects/${scriptId}/content`, { files: arq.files });
    feito('versão ' + arq.versao);

    vai();
    const v = await ptApi('POST', `projects/${scriptId}/versions`, { description: 'Portal ' + arq.versao });
    const dep = await ptApi('POST', `projects/${scriptId}/deployments`, { versionNumber: v.versionNumber, manifestFileName: 'appsscript', description: 'Portal das pastorais ' + arq.versao });
    const url = (dep.entryPoints || []).map(p => p.webApp?.url).find(Boolean);
    if (!url) throw new Error('o Google publicou, mas não devolveu o endereço do portal');
    await gravarCfgPortal({ scriptId, chave, url, deploymentId: dep.deploymentId });
    Portal.versao = arq.versao;
    feito();

    vai();
    window.open(url, '_blank');
    Portal.situacao = `🔓 O portal abriu no navegador. Se o Google pedir, clique em <b>Revisar permissões</b>, escolha a conta da paróquia e <b>Permitir</b>
      (se aparecer "o Google não verificou este app": <b>Avançado → Acessar</b>; o app é o da própria paróquia).
      Depois volte aqui e clique em <button type="button" id="ptJaPermiti" class="primario">✔ Já permiti</button>`;
  } catch (e) {
    if (passos[i]) { passos[i].ag = false; passos[i].erro = true; }
    Portal.situacao = '⚠ ' + erroApiPortal(e);
  } finally { Portal.criando = false; renderPortalEsc(); }
}

// permissão nova depois de um ⬆ Atualizar: o Google só pergunta no editor do Apps Script
function htmlReautorizar() {
  const id = Esc.portal?.scriptId;
  const ed = id ? `<a href="https://script.google.com/d/${esc(id)}/edit" target="_blank">abra o editor do portal</a>` : 'abra o projeto do portal em script.google.com';
  return `<ol class="esc-pt-passos"><li>${ed} (com a conta da paróquia);</li>
    <li>no alto, escolha a função <b>autorizar</b> e clique em <b>▶ Executar</b>;</li>
    <li>o Google pede autorização: <b>Revisar permissões</b> → a conta → (se aparecer "não verificado": <b>Avançado → Acessar</b>) → <b>Permitir</b>;</li>
    <li>volte aqui e clique em <button type="button" id="ptJaPermiti" class="primario">✔ Já permiti</button></li></ol>`;
}

async function jaPermitiPortal() {
  Portal.situacao = '⏳ Conferindo o portal…'; renderPortalEsc();
  try { await chamarPortal('ping'); }
  catch (e) {
    Portal.situacao = e.reautorizar ? '⚠ Ainda falta a permissão nova.' + htmlReautorizar() : (e.semAutorizar ?'⚠ O Google ainda não deixou o portal funcionar: abra o portal (↗), clique em Permitir e tente de novo. '
      : '⚠ ' + esc(e.message) + ' ') + '<button type="button" id="ptJaPermiti">✔ Já permiti</button>';
    return renderPortalEsc();
  }
  if (Portal.passos) { const p = Portal.passos.at(-1); p.ag = false; p.ok = true; }
  toast('✅ Portal pronto! Copie o link e mande às coordenações das pastorais.');
  await testarPortal();
  Portal.passos = null; renderPortalEsc();
}

async function atualizarCodigoPortal() {
  const c = Esc.portal;
  if (!c?.scriptId || !c?.deploymentId) return toast('Este portal não foi criado pela Secretaria: atualize o código à mão (Avançado).');
  if (!confirm('Pôr o código novo no portal? O link, os cadastros e as escalas continuam os mesmos.')) return;
  Portal.situacao = '⏳ Atualizando o portal…'; renderPortalEsc();
  try {
    const arq = await arquivosPortal(c.chave);
    await ptApi('PUT', `projects/${c.scriptId}/content`, { files: arq.files });
    const v = await ptApi('POST', `projects/${c.scriptId}/versions`, { description: 'Portal ' + arq.versao });
    await ptApi('PUT', `projects/${c.scriptId}/deployments/${c.deploymentId}`, { deploymentConfig: {
      scriptId: c.scriptId, versionNumber: v.versionNumber, manifestFileName: 'appsscript', description: 'Portal das pastorais ' + arq.versao } });
    toast('⬆ Portal atualizado para a ' + arq.versao + '.');
    Portal.versaoNova = arq.versao;
    await testarPortal();
    // código novo com permissão nova: o Google pede para o dono autorizar de novo, abrindo o portal
    if (!Portal.usuarios && /autorizado/.test(Portal.situacao)) window.open(c.url, '_blank');
  } catch (e) { Portal.situacao = '⚠ ' + erroApiPortal(e); renderPortalEsc(); }
}

async function salvarCfgPortal() {
  const url = $('#ptUrl').value.trim(), chave = $('#ptChave').value.trim();
  if (url && !/^https:\/\/script\.google\.com\/(a\/macros\/[\w.-]+|macros)\/s\/[\w-]+\/exec$/.test(url) && !/^http:\/\/127\.0\.0\.1:\d+\/exec$/.test(url))
    return toast('O endereço do portal começa com https://script.google.com/macros/s/ e termina em /exec.');
  const ant = Esc.portal, item = { ...(ant || {}), id: 'portal', url, chave };
  if (!ant || ant.url !== url || ant.chave !== chave) {
    if (!await gravarItemSec('esc', item, { versaoAberta: ant?.versao || 0, rotulo: 'o portal' })) { await carregarEscala(); return renderPortalEsc(); }
    Esc.portal = item;
  }
  if (url && chave) await testarPortal();
}

async function acaoUsuarioPortal(acao, tr) {
  const id = tr.dataset.ptId, u = Portal.usuarios.find(x => x.id === id);
  const funcoes = [...tr.querySelectorAll('[data-pt-f]:checked')].map(c => c.dataset.ptF);
  const pastorais = [...tr.querySelectorAll('[data-pt-p]:checked')].map(c => c.dataset.ptP), admin = !!tr.querySelector('[data-pt-adm]:checked');
  const area = tr.dataset.ptArea;
  if (acao === 'aprovar' && (area === 'escala' ? !funcoes.length : !pastorais.length && !admin))
    return toast(area === 'escala' ? 'Marque ao menos uma função que a pessoa pode mudar.' : 'Marque ao menos uma pastoral (ou "muda tudo").');
  if (acao === 'recusar' && !confirm(`Recusar o pedido de ${u.nome}?`)) return;
  if (acao === 'apagar' && !confirm(`Apagar o cadastro de ${u.nome} no portal?\n\nA pessoa perde o acesso; o que ela já escreveu na escala continua.`)) return;
  if (acao === 'zerarSenha' && !confirm(`Criar uma senha provisória para ${u.nome}?\n\nA senha atual deixa de valer.`)) return;
  try {
    // cada card manda só a sua parte; a outra fica como está no portal
    const r = await chamarPortal(acao, { id, ...(acao === 'aprovar' || acao === 'funcoes' ? (area === 'escala' ? { funcoes } : { pastorais, admin }) : {}) });
    if (acao === 'zerarSenha') prompt(`Senha provisória de ${u.nome} (passe para a pessoa; no 1º acesso ela escolhe outra):`, r.senha);
    else toast({ aprovar: `✔ ${u.nome} já pode entrar no portal.`, recusar: 'Pedido recusado.', funcoes: 'Acesso salvo.', desativar: '⏸ Acesso desativado.', reativar: '▶ Acesso reativado.', apagar: 'Cadastro apagado.' }[acao] || 'Feito.');
    Portal.usuarios = (await chamarPortal('usuarios')).usuarios;
    situacaoPortal();
    renderPortalEsc();
  } catch (e) { toast('⚠ ' + e.message); }
}

async function enviarMesPortal() {
  const mes = $('#ptMes').value;
  if (!mes) return;
  const pac = pacotePortal(mes);
  if (!pac.missas.length) return toast('Nenhuma Missa na Agenda neste mês.');
  try {
    const r = await chamarPortal('enviarMes', pac);
    toast(`📤 ${pac.missas.length} Missas de ${nomeMesPortal(mes)} no portal.` + (r.pendentes ? ` Há ${r.pendentes} mudança(s) das pastorais para conferir (📥).` : ''));
  } catch (e) { toast('⚠ ' + e.message); }
}

const nomeMesPortal = mes => { const [a, m] = mes.split('-').map(Number); return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); };

async function trazerPortal() {
  const mes = $('#ptMes').value;
  if (!mes) return;
  try {
    const r = await chamarPortal('lerMes', { mes });
    const ocs = new Map(missasDoMes(mes, '').map(o => [o.chave, o])), linhas = [];
    let fora = 0;
    for (const [k, p] of Object.entries(r.portal || {})) {
      const i = k.lastIndexOf('|'), o = ocs.get(k.slice(0, i)), f = funcoesEsc().find(x => x.id === k.slice(i + 1));
      if (!o || !f) { fora++; continue; }
      const aqui = valorCela(o, f), la = celaDoPortal(p.valor, f);
      if (la === aqui || (la === '—' && !aqui)) continue;           // já está igual
      const d = deIso(o.iso);
      linhas.push({ k, o, f, aqui, la, porNome: p.porNome, em: p.em,
        missa: `${DIAS[d.getDay()].slice(0, 3)} ${dataBR(o.iso).slice(0, 5)} · ${o.hora} · ${nomeCurtoLocal(localDe(o.localId)) || o.texto}`, funcao: f.nome });
    }
    linhas.sort((a, b) => a.o.iso.localeCompare(b.o.iso) || a.o.hora.localeCompare(b.o.hora) || a.funcao.localeCompare(b.funcao));
    Portal.previa = { mes, nomeMes: nomeMesPortal(mes), enviado: r.enviado, linhas, fora, extras: r.extras };
  } catch (e) { Portal.previa = null; toast('⚠ ' + e.message); }
  renderPreviaPortal();
}

async function aplicarPortal() {
  const p = Portal.previa, marcadas = [...$$('#ptPrevia [data-pt-l]:checked')].map(c => p.linhas[+c.dataset.ptL]);
  if (!marcadas.length) return toast('Nada marcado.');
  const rec = Esc.meses[p.mes] || (Esc.meses[p.mes] = { id: 'm-' + p.mes, celas: {} });
  for (const l of marcadas) {
    const k = chaveCela(l.o, l.f.id);
    if (l.la === padraoCela(l.o, l.f)) delete rec.celas[k]; else rec.celas[k] = l.la;
  }
  if (!await gravarItemSec('esc', rec, { versaoAberta: rec.versao || 0, rotulo: 'a escala deste mês' })) { await carregarEscala(); return toast('Outro computador mudou a escala; confira e tente de novo.'); }
  aposMudarEscala();
  toast(`✔ ${marcadas.length} mudança${marcadas.length > 1 ? 's' : ''} na escala de ${p.nomeMes}.`);
  try { await chamarPortal('enviarMes', pacotePortal(p.mes)); } catch (e) { toast('A escala foi salva, mas o portal não recebeu a atualização: ' + e.message); }
  await trazerPortal();
}

async function descartarPortal() {
  const p = Portal.previa, ks = [...$$('#ptPrevia [data-pt-l]:not(:checked)')].map(c => p.linhas[+c.dataset.ptL].k);
  if (!ks.length) return toast('Desmarque as mudanças que não quer.');
  if (!confirm(`Descartar ${ks.length} mudança(s) das pastorais? No portal volta o que está na Secretaria.`)) return;
  try { await chamarPortal('descartar', { mes: p.mes, ks }); toast('Descartadas.'); await trazerPortal(); } catch (e) { toast('⚠ ' + e.message); }
}

// (1.7.1) conta Google do portal e das agendas: a mesma da ☁ nuvem ou uma à parte (outro arquivo do Google, outra conta)
async function lerContaPortal() {
  try { Portal.conta = await arqApp('portalStatus'); } catch (_) { Portal.conta = null; }
  try { renderPortalEsc(); } catch (_) { }           // a aba ainda pode não estar montada (Esc carrega depois)
}
// trocar de conta com um portal já criado: o projeto fica na conta antiga, a Secretaria cria outro na nova
async function esquecerPortalDaConta() {
  const c = Esc.portal || {};
  if (!c.scriptId && !c.url) return true;
  if (!confirm('O portal atual fica na conta Google anterior. Com outra conta, a Secretaria cria um portal novo (o link muda e as coordenações '
    + 'se cadastram de novo; o portal antigo continua na conta anterior até alguém apagar).\n\nContinuar?')) return false;
  await gravarCfgPortal({ scriptId: '', chave: '', url: '', deploymentId: '', conta: '' });
  Portal.usuarios = null; Portal.previa = null; Portal.versao = undefined; Portal.situacao = '';
  return true;
}
async function escolherContaPortal(valor) {
  const atual = Portal.conta?.proprio ? 'propria' : 'nuvem';
  if (valor === atual) return;
  try {
    if (!await esquecerPortalDaConta()) return renderPortalEsc();
    if (valor === 'propria') {
      toast('Escolha o arquivo do Google (JSON) da conta à parte: Google Cloud dessa conta → Clientes → App para computador → Baixar o JSON.');
      await arqApp('portalCarregarCliente', {}, 600000);
      toast('Pronto: o portal e as agendas vão usar a conta à parte. A ☁ nuvem continua como estava.');
    } else {
      await arqApp('portalUsarNuvem');
      toast('O portal e as agendas voltam a usar o arquivo do Google da ☁ nuvem.');
    }
  } catch (e) { if (e.message !== 'cancelado') toast('⚠ ' + e.message); }
  await lerContaPortal();
}
async function trocarArquivoContaPortal() {
  try {
    if (!await esquecerPortalDaConta()) return;
    await arqApp('portalCarregarCliente', {}, 600000);
    toast('Arquivo do Google trocado.');
  } catch (e) { if (e.message !== 'cancelado') toast('⚠ ' + e.message); }
  await lerContaPortal();
}
async function entrarOutraContaPortal() {
  if (!await esquecerPortalDaConta()) return;
  await arqApp('portalDesconectar');
  toast('Saiu da conta. Clique em 🌐 Criar o portal para entrar com a conta certa.');
  await lerContaPortal();
}

// ---------------------------------------------------------------- 📋 copiar o link com um recado para o WhatsApp
async function copiarLinkPortal() {
  const url = Esc.portal?.url;
  if (!url) return toast('O portal ainda não foi criado.');
  const par = Agenda.dados.paroquia?.nome || 'a paróquia';
  const txt = `📅 Calendário pastoral e portal das pastorais — ${par}\n\n${url}\n\n`
    + `Para ver o calendário, é só abrir o link e tocar em "Ver a agenda".\n`
    + `Coordenadores: entrem com o seu e-mail e senha (primeira vez: "Pedir acesso"; a secretaria libera).`;
  try { await navigator.clipboard.writeText(txt); toast('📋 Link copiado com o recado. É só colar no WhatsApp.'); }
  catch (_) { prompt('Copie o link do portal:', url); }
}

// a configuração do portal (endereço, chave, pastorais) vem junto com as escalas; quem abre outro card lê só ela
async function garantirCfgPortal() {
  if (Portal.cfgLida && Esc.portal !== undefined) return;
  try { Esc.portal = (await lerItensSec('esc')).find(i => i.id === 'portal') || null; } catch (_) {}
  Portal.cfgLida = true;
}

// ---------------------------------------------------------------- 🎉 eventos com cartaz → calendário pastoral (como da paróquia)
let timerEvPortal = null;
function enviarEventosSecPortalLogo() { clearTimeout(timerEvPortal); timerEvPortal = setTimeout(() => enviarEventosSecPortal().catch(() => {}), 2500); }
async function enviarEventosSecPortal() {
  await garantirCfgPortal();
  if (!Esc.portal?.url || !Esc.portal?.chave) return null;
  if (typeof carregarEventos === 'function') await carregarEventos();
  const desde = new Date(); desde.setFullYear(desde.getFullYear() - 1);
  const corte = isoData(desde);
  const eventos = (Ev.lista || []).filter(e => e.titulo && e.data && (e.dataFim || e.data) >= corte).map(e => ({
    ref: e.id, titulo: e.titulo, ini: e.data, fim: e.dataFim && e.dataFim > e.data ? e.dataFim : '', hora: e.hora || '',
    local: localDoEvento(e).slice(0, 120),
    desc: [eventoDiario(e) ? `Todos os dias${e.hora ? ', ' + hTxt(e.hora) : ''}${e.horaFim && e.horaFim > e.hora ? ' às ' + hTxt(e.horaFim) : ''}.` : '', e.descricao || ''].filter(Boolean).join(' ') }));
  try { return await chamarPortal('agendaSecretaria', { eventos }); }
  catch (e) { if (/desconhecida/.test(e.message)) return null; throw e; }    // portal antigo (antes do 0.2.0)
}

// ---------------------------------------------------------------- 📆 card do calendário pastoral
const CP = { aba: 'cal', mes: '', dados: null, filtro: '', editando: null, rel: null };
const CORES_CP = ['#d4a93a', '#4f95ec', '#57b36f', '#e0473a', '#a46be0', '#e08a2e', '#2bb3b3', '#d45b9a', '#8a9a3a', '#6b7fd4', '#c27a4a', '#3aa37a'];
const pastoraisCP = () => CP.dados?.pastorais || [{ id: 'paroquia', nome: 'Paróquia (secretaria)' }, ...pastoraisPortal()];
const corCP = pid => CORES_CP[Math.max(0, pastoraisCP().findIndex(p => p.id === pid)) % CORES_CP.length];
const nomeCP = pid => (pastoraisCP().find(p => p.id === pid) || {}).nome || pid;
const nomeMesCP = m => { const [a, n] = m.split('-').map(Number); return `${MESES[n - 1]} de ${a}`; };
const somaMesCP = (m, n) => { const [a, x] = m.split('-').map(Number), d = new Date(a, x - 1 + n, 1); return isoData(d).slice(0, 7); };
const diaCurtoCP = iso => { const d = deIso(iso); return `${DIAS[d.getDay()].slice(0, 3)} ${dataBR(iso).slice(0, 5)}`; };
const periodoCP = e => e.fim ? `${diaCurtoCP(e.ini)} a ${diaCurtoCP(e.fim)}` : diaCurtoCP(e.ini);

async function carregarCalPastoral() {
  const lista = $('#calLista');
  if (lista && !CP.dados) lista.innerHTML = '<p class="sutil">⏳ Lendo o calendário do portal…</p>';
  try {
    await enviarEventosSecPortal();
    CP.dados = await chamarPortal('agendaLer');
  } catch (e) { CP.dados = null; if (lista) lista.innerHTML = `<p class="pequeno">⚠ ${esc(e.message)}</p>`; return; }
  renderCalPastoral();
}

function eventosMesCP() {
  const ini = CP.mes + '-01', fim = CP.mes + '-31';
  return (CP.dados?.eventos || []).filter(e => e.ini <= fim && (e.fim || e.ini) >= ini && (!CP.filtro || e.pastoral === CP.filtro))
    .sort((a, b) => (a.ini + (a.hora || '99')).localeCompare(b.ini + (b.hora || '99')) || a.titulo.localeCompare(b.titulo, 'pt-BR'));
}

function renderCalPastoral() {
  if (!$('#dlgCalPastoral')) return;
  $$('#dlgCalPastoral [data-cp-aba]').forEach(b => b.classList.toggle('ativo', b.dataset.cpAba === CP.aba));
  $$('#dlgCalPastoral [data-cp-painel]').forEach(p => p.hidden = p.dataset.cpPainel !== CP.aba);
  renderPortalEsc();
  if (CP.aba === 'cal') renderCpLista();
  if (CP.aba === 'rel') renderCpRel();
}

function renderCpLista() {
  $('#calMesNome').textContent = nomeMesCP(CP.mes);
  $('#calFiltro').innerHTML = '<option value="">Todas</option>' + pastoraisCP().map(p => `<option value="${esc(p.id)}"${p.id === CP.filtro ? ' selected' : ''}>${esc(p.nome)}</option>`).join('');
  if (!CP.dados) return;
  const evs = eventosMesCP();
  // dias com mais de uma pastoral (⚠: pode, mas vale combinar)
  const porDia = {};
  for (const e of CP.dados.eventos || []) for (let d = e.ini; d <= (e.fim || e.ini); d = isoData(new Date(deIso(d).getTime() + 864e5))) (porDia[d] ||= new Set()).add(e.pastoral);
  $('#calLista').innerHTML = !evs.length ? `<p class="sutil">Nada marcado em ${nomeMesCP(CP.mes)}${CP.filtro ? ' para esta pastoral' : ''}.</p>`
    : `<table class="esc-tab cp-tab"><thead><tr><th>Dia</th><th>Hora</th><th>Evento</th><th>Pastoral</th><th>Local</th><th>Quem pôs</th><th></th></tr></thead><tbody>${evs.map(e => `
      <tr data-cp-id="${esc(e.id)}"><td class="cp-dia">${esc(periodoCP(e))}${porDia[e.ini]?.size > 1 ? ' <span title="Mais de uma pastoral neste dia">⚠</span>' : ''}</td>
        <td>${esc(e.hora || '')}</td><td><b>${e.origem === 'sec' ? '🎉 ' : ''}${esc(e.titulo)}</b>${e.desc ? `<br><small class="sutil">${esc(e.desc.slice(0, 140))}${e.desc.length > 140 ? '…' : ''}</small>` : ''}</td>
        <td><span class="cp-cor" style="background:${corCP(e.pastoral)}"></span>${esc(nomeCP(e.pastoral))}</td><td>${esc(e.local || '')}</td>
        <td><small class="sutil">${esc(e.porNome || e.autorNome || '')}</small></td>
        <td class="esc-acoes">${e.origem === 'sec' ? '<button type="button" data-cp-sec title="Este vem dos 🎉 Eventos com QR code: mude por lá">🎉 Mudar em Eventos</button>' : '<button type="button" data-cp-ed>Mudar</button>'}</td></tr>`).join('')}</tbody></table>`;
}

function abrirFormCP(e) {
  CP.editando = e?.id || null;
  $('#calfPastoral').innerHTML = pastoraisCP().map(p => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('');
  $('#calfTitulo').value = e?.titulo || '';
  $('#calfPastoral').value = e?.pastoral || CP.filtro || 'paroquia';
  $('#calfIni').value = e?.ini || (CP.mes === hojeIso().slice(0, 7) ? hojeIso() : CP.mes + '-01');
  $('#calfFim').value = e?.fim || '';
  $('#calfHora').value = e?.hora || '';
  $('#calfLocal').value = e?.local || '';
  $('#calfDesc').value = e?.desc || '';
  $('#calfApagar').hidden = !e;
  $('#calfQuem').textContent = e ? `Posto por ${e.autorNome || '—'}${e.porNome && e.em ? ` · última mudança: ${e.porNome}, ${quandoBR(e.em)}` : ''}` : '';
  $('#calForm').hidden = false;
  avisoFormCP();
  $('#calfTitulo').focus();
}
function avisoFormCP() {
  const ini = $('#calfIni').value, fim = $('#calfFim').value || ini, pid = $('#calfPastoral').value;
  const outros = (CP.dados?.eventos || []).filter(e => e.id !== CP.editando && e.pastoral !== pid && e.ini <= fim && (e.fim || e.ini) >= ini).slice(0, 8);
  $('#calfAviso').innerHTML = outros.length ? `⚠ Já marcado: ${outros.map(e => `<b>${esc(e.titulo)}</b> (${esc(nomeCP(e.pastoral))})`).join('; ')}. Pode pôr assim mesmo.` : '';
}
async function salvarFormCP() {
  const ev = { id: CP.editando || '', titulo: $('#calfTitulo').value.trim(), pastoral: $('#calfPastoral').value, ini: $('#calfIni').value,
    fim: $('#calfFim').value, hora: $('#calfHora').value, local: $('#calfLocal').value.trim(), desc: $('#calfDesc').value.trim() };
  if (!ev.titulo) return toast('Escreva o nome do evento.');
  if (!ev.ini) return toast('Escolha o dia.');
  try {
    await chamarPortal('agendaSalvar', { evento: ev });
    toast('📆 Evento salvo no portal.');
    $('#calForm').hidden = true; CP.editando = null; CP.mes = ev.ini.slice(0, 7);
    await carregarCalPastoral();
  } catch (e) { toast('⚠ ' + e.message); }
}
async function apagarFormCP() {
  const e = (CP.dados?.eventos || []).find(x => x.id === CP.editando);
  if (!e || !confirm(`Apagar "${e.titulo}" do calendário pastoral?`)) return;
  try { await chamarPortal('agendaExcluir', { id: e.id }); toast('Evento apagado.'); $('#calForm').hidden = true; CP.editando = null; await carregarCalPastoral(); }
  catch (x) { toast('⚠ ' + x.message); }
}
function imprimirMesCP() {
  const evs = eventosMesCP();
  if (!evs.length) return toast('Nada marcado neste mês.');
  const linhas = evs.map(e => `<tr><td>${esc(periodoCP(e))}</td><td>${esc(e.hora || '')}</td><td><b>${esc(e.titulo)}</b>${e.desc ? `<br><small>${esc(e.desc)}</small>` : ''}</td><td>${esc(nomeCP(e.pastoral))}</td><td>${esc(e.local || '')}</td></tr>`).join('');
  imprimirFolhaSec('Calendário pastoral', nomeMesCP(CP.mes) + (CP.filtro ? ' · ' + nomeCP(CP.filtro) : ''),
    `<table><thead><tr><th>Dia</th><th>Hora</th><th>Evento</th><th>Pastoral</th><th>Local</th></tr></thead><tbody>${linhas}</tbody></table>`, 'Calendário pastoral ' + CP.mes);
}

// 📝 relatórios do mês (o que as coordenações escrevem no portal)
async function verRelatoriosCP() {
  const de = $('#calrDe').value, ate = $('#calrAte').value || de;
  if (!de) return toast('Escolha o mês.');
  if (ate < de) return toast('O "até" vem antes do "de".');
  $('#calrLista').innerHTML = '<p class="sutil">⏳ Lendo os relatórios…</p>';
  try { CP.rel = { de, ate, ...(await chamarPortal('relatoriosLer', { de, ate })) }; }
  catch (e) { CP.rel = null; return $('#calrLista').innerHTML = `<p class="pequeno">⚠ ${esc(e.message)}</p>`; }
  renderCpRel();
}
function mesesCP(de, ate) { const out = []; for (let m = de; m <= ate && out.length < 24; m = somaMesCP(m, 1)) out.push(m); return out; }
function htmlRelatoriosCP(imprimir) {
  const r = CP.rel; if (!r) return '';
  const ps = (r.pastorais || []).filter(p => p.id !== 'paroquia');
  return mesesCP(r.de, r.ate).map(m => {
    const doMes = r.relatorios.filter(x => x.mes === m).sort((a, b) => nomeCP(a.pastoral).localeCompare(nomeCP(b.pastoral), 'pt-BR'));
    const faltam = ps.filter(p => !doMes.some(x => x.pastoral === p.id)).map(p => p.nome);
    return `<h3 class="${imprimir ? '' : 'esc-pt-tit'}" style="text-transform:none">${esc(nomeMesCP(m)[0].toUpperCase() + nomeMesCP(m).slice(1))}</h3>`
      + (doMes.length ? doMes.map(x => `<div class="cp-rel"><b>${esc(nomeCP(x.pastoral))}</b>${x.participantes ? ` · ${esc(x.participantes)} pessoas` : ''}
          <div style="white-space:pre-wrap">${esc(x.texto || '')}</div><small class="sutil">${esc(x.porNome || '')}${x.em ? ', ' + esc(quandoBR(x.em)) : ''}</small></div>`).join('')
        : '<p class="sutil pequeno">Nenhum relatório neste mês.</p>')
      + (faltam.length ? `<p class="sutil pequeno">Ainda sem relatório: ${faltam.map(esc).join(', ')}.</p>` : '');
  }).join('');
}
function renderCpRel() {
  if (!$('#calrDe').value) { const m = somaMesCP(hojeIso().slice(0, 7), new Date().getDate() <= 15 ? -1 : 0); $('#calrDe').value = $('#calrAte').value = m; }
  if (!CP.rel) { if (Esc.portal?.url) verRelatoriosCP(); return; }
  $('#calrLista').innerHTML = htmlRelatoriosCP(false) || '<p class="sutil">Nenhum relatório.</p>';
}
function imprimirRelatoriosCP() {
  if (!CP.rel) return toast('Clique em Ver primeiro.');
  const r = CP.rel;
  imprimirFolhaSec('Relatório de atividades das pastorais', r.de === r.ate ? nomeMesCP(r.de) : `${nomeMesCP(r.de)} a ${nomeMesCP(r.ate)}`,
    htmlRelatoriosCP(true), 'Relatório das pastorais ' + r.de + (r.ate !== r.de ? ' a ' + r.ate : ''));
}

async function abrirCalPastoral() {
  await carregarEscala();
  Portal.cfgLida = true;
  if (!CP.mes) CP.mes = hojeIso().slice(0, 7);
  $('#calForm').hidden = true; CP.editando = null; CP.rel = null;
  renderCalPastoral();
  abrirDialogo('dlgCalPastoral');
  if (!Esc.portal?.url || !Esc.portal?.chave) return;
  if (!Portal.usuarios && !Portal.testando) { Portal.testando = true; testarPortal().finally(() => { Portal.testando = false; renderCalPastoral(); }); }
  await carregarCalPastoral();
}

async function abrirPortalCfg() {
  await carregarEscala();
  Portal.cfgLida = true;
  lerContaPortal();
  renderPortalEsc();
  abrirDialogo('dlgPortalCfg');
  if (Esc.portal?.url && Esc.portal?.chave && !Portal.usuarios && !Portal.testando) {
    Portal.testando = true;
    testarPortal().finally(() => { Portal.testando = false; });
  }
}

// ---------------------------------------------------------------- ligar (uma vez, junto com as escalas)
function ligarPortalEsc() {
  const painel = $('#dlgEscala [data-esc-painel="portal"]');
  if (!painel) return;
  painel.innerHTML = HTML_PORTAL;
  document.body.insertAdjacentHTML('beforeend', HTML_PORTAL_CFG + HTML_CAL_PASTORAL);
  // ⚙ Ajustes → 🌐 Portal
  $('#ptSalvar').addEventListener('click', salvarCfgPortal);
  $('#ptCriarBt').addEventListener('click', criarPortal);
  $$('input[name=ptConta]').forEach(r => r.addEventListener('change', () => r.checked && escolherContaPortal(r.value)));
  $('#ptContaArq').addEventListener('click', trocarArquivoContaPortal);
  $('#ptContaTrocar').addEventListener('click', entrarOutraContaPortal);
  lerContaPortal();
  $('#ptAtualizarCod').addEventListener('click', atualizarCodigoPortal);
  // 📋 Escalas → 🌐 Portal
  $('#ptMes').addEventListener('change', () => { Portal.mes = $('#ptMes').value; Portal.previa = null; renderPreviaPortal(); });
  $('#ptEnviar').addEventListener('click', enviarMesPortal);
  $('#ptTrazer').addEventListener('click', trazerPortal);
  // 📆 Calendário pastoral
  $('#ptPastSalvar').addEventListener('click', async () => {
    try { await salvarPastoraisPortal(); toast('Pastorais salvas no portal.'); CP.dados = null; renderPortalEsc(); carregarCalPastoral(); } catch (e) { toast('⚠ ' + e.message); }
  });
  $('#ptAgAberta').addEventListener('change', async e => {
    try { await salvarPastoraisPortal(pastoraisPortal(), e.target.checked); toast(e.target.checked ? 'O calendário pode ser visto sem entrar.' : 'O calendário agora só abre para quem entra.'); }
    catch (x) { e.target.checked = !e.target.checked; toast('⚠ ' + x.message); }
  });
  $('#ptAgImportar').addEventListener('click', () => $('#ptAgArq').click());
  $('#ptAgArq').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importarAgendaPortal(f).then(() => carregarCalPastoral()); });
  $('#calAnt').addEventListener('click', () => { CP.mes = somaMesCP(CP.mes, -1); renderCpLista(); });
  $('#calProx').addEventListener('click', () => { CP.mes = somaMesCP(CP.mes, 1); renderCpLista(); });
  $('#calFiltro').addEventListener('change', e => { CP.filtro = e.target.value; renderCpLista(); });
  $('#calNovo').addEventListener('click', () => abrirFormCP(null));
  $('#calImprimir').addEventListener('click', imprimirMesCP);
  $('#calfSalvar').addEventListener('click', salvarFormCP);
  $('#calfApagar').addEventListener('click', apagarFormCP);
  $('#calfCancelar').addEventListener('click', () => { $('#calForm').hidden = true; CP.editando = null; });
  ['calfIni', 'calfFim', 'calfPastoral'].forEach(id => $('#' + id).addEventListener('change', avisoFormCP));
  $('#ptLogo2Escolher').addEventListener('click', () => $('#ptLogo2Arq').click());
  $('#ptLogo2Arq').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) escolherLogo2Portal(f); });
  $('#ptLogo2Tirar').addEventListener('click', tirarLogo2Portal);
  $('#calrVer').addEventListener('click', verRelatoriosCP);
  $('#calrImprimir').addEventListener('click', imprimirRelatoriosCP);
  // botões que aparecem nos três lugares
  for (const raiz of [painel, $('#dlgPortalCfg'), $('#dlgCalPastoral')]) raiz.addEventListener('click', e => {
    const cp = e.target.closest('[data-pt-copiar]');
    if (cp) return copiarArquivoPortal(cp.dataset.ptCopiar, cp);
    if (e.target.closest('[data-pt-link]')) return copiarLinkPortal();
    if (e.target.closest('[data-pt-abrir]')) return Esc.portal?.url && window.open(Esc.portal.url, '_blank');
    if (e.target.closest('[data-pt-cfg]')) return abrirPortalCfg();
    if (e.target.closest('[data-pt-atualizar]')) return testarPortal();
    const b = e.target.closest('[data-pt]');
    if (b) return acaoUsuarioPortal(b.dataset.pt, b.closest('tr'));
    if (e.target.id === 'ptJaPermiti') return jaPermitiPortal();
    if (e.target.id === 'ptAplicar') return aplicarPortal();
    if (e.target.id === 'ptDescartar') return descartarPortal();
    const aba = e.target.closest('[data-cp-aba]');
    if (aba) { CP.aba = aba.dataset.cpAba; return renderCalPastoral(); }
    const tr = e.target.closest('#calLista tr[data-cp-id]');
    if (tr && e.target.closest('[data-cp-ed]')) return abrirFormCP((CP.dados?.eventos || []).find(x => x.id === tr.dataset.cpId));
    if (tr && e.target.closest('[data-cp-sec]')) { $('#dlgCalPastoral').close(); return abrirEventos(); }
  });
}

// ao abrir a aba 🌐 Portal das Escalas: se já tem portal, testa uma vez (mostra os pedidos novos)
function abrirAbaPortal() {
  renderPortalEsc();
  if (Esc.portal?.url && Esc.portal?.chave && !Portal.usuarios && !Portal.testando) {
    Portal.testando = true;
    testarPortal().finally(() => { Portal.testando = false; });
  }
}
