'use strict';
/*
 * Secretaria MiguelAngelus (1.0.0): o mesmo programa aberto como index.html?app=secretaria (SECRETARIA = true).
 * Só a Agenda (paróquia, comunidades, celebrações recorrentes e do dia) e os Avisos paroquiais — um "gerador de
 * conteúdo" para o MiguelAngelus: tudo vai pela nuvem da paróquia (config/agenda.json e config/avisos.json) e aparece
 * nos roteiros e na tela de avisos do MiguelAngelus. Também imprime os avisos de uma celebração (PDF) e gera as
 * imagens deles para o Holyrics.
 * A tela de controle (roteiros, cantos, projeção…) fica escondida pelo CSS (html.app-secretaria).
 * Usa $, $$, S, esc, Agenda, ocorrencias, AvPar, avisosVigentes, abrirAgenda, abrirAvisosPar, abrirAjustes, Sync… (em tempo de execução).
 */
// VERSAO_SECRETARIA fica no <head> do index.html (o splash usa antes deste arquivo carregar)

const NOVIDADES_SECRETARIA = [
  { versao: '1.0.0', data: '2026-11-13', itens: [
    '🎉 Primeira versão da Secretaria MiguelAngelus: a Agenda da paróquia (comunidades, celebrações recorrentes e do dia) e os Avisos paroquiais, sincronizados pela nuvem com o MiguelAngelus.',
    '📢 Avisos com data de início e de fim, para uma, várias ou todas as comunidades.',
    '🖨 Avisos de uma celebração: folha A4 para ler no ambão (ou PDF) e imagens Full HD para o Holyrics, gravadas na pasta de imagens dele.',
  ] },
];

function renderSecretariaSemana() {
  const el = $('#secSemana');
  if (!el) return;
  const hoje = new Date(), dias = [];
  for (let k = 0; k < 7; k++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + k), iso = isoData(d);
    const ocs = ocorrencias(d);
    if (!ocs.length) continue;
    dias.push(`<div class="sec-dia"><div class="sec-dia-tit">${k === 0 ? 'Hoje' : k === 1 ? 'Amanhã' : DIAS[d.getDay()]}, ${dataCurta(d)}</div>
      ${ocs.map(o => {
        const loc = localDe(o.localId), n = o.cancelada ? 0 : avisosVigentes(iso, o.localId).length;
        return `<div class="sec-ev ${o.cancelada ? 'cancelada' : ''}" data-iso="${iso}" data-chave="${esc(o.chave)}" title="${o.cancelada ? 'Cancelada neste dia' : 'Ver os avisos desta celebração'}">
          <span class="sec-hora">${esc(o.hora)}</span>${loc ? `<span class="card-ponto" style="background:${loc.cor}"></span>` : ''}
          <span class="sec-txt">${esc(o.texto)}${o.cancelada ? ' <i>(cancelada)</i>' : ''}</span>
          ${o.cancelada ? '' : `<span class="sec-av">${n ? `📢 ${n} aviso${n > 1 ? 's' : ''}` : 'sem avisos'}</span>`}</div>`;
      }).join('')}</div>`);
  }
  el.innerHTML = dias.length ? dias.join('')
    : `<p class="sutil">Nenhuma celebração nos próximos 7 dias. ${Agenda.dados.locais.length ? 'Cadastre as celebrações em ⛪ Celebrações recorrentes.' : 'Comece pela 🏛 Paróquia e comunidades.'}</p>`;
}

function renderSecretariaNuvem() {
  const el = $('#secNuvem');
  if (!el) return;
  const ligada = ligadaSync();
  const quando = Sync.ultimo ? new Date(Sync.ultimo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  el.className = 'sec-nuvem ' + (!ligada ? 'desligada' : Sync.erro ? 'erro' : 'ok');
  el.innerHTML = !ligada
    ? '☁ <b>Nuvem desligada.</b> Conecte ao Google Drive da paróquia (o mesmo do MiguelAngelus) em <button type="button" data-sec="nuvem">☁ Nuvem da paróquia</button> — senão o que for feito aqui não chega ao MiguelAngelus.'
    : Sync.ocupado ? '☁ Sincronizando…'
    : Sync.erro ? `☁ Não sincronizou: ${esc(Sync.erro)} <button type="button" data-sec-sync>Tentar de novo</button>`
    : `☁ Sincronizado com o MiguelAngelus${quando ? ` às ${quando}` : ''}${Sync.sujo ? ' · <b>há mudanças para enviar</b>' : ''} <button type="button" data-sec-sync>Sincronizar agora</button>`;
}

function renderSecretaria() { renderSecretariaNuvem(); renderSecretariaSemana(); }

// Mexeu na Agenda ou nos Avisos: envia logo (a secretaria quer ver no MiguelAngelus sem esperar)
async function enviarSecretaria() {
  renderSecretaria();
  if (!ligadaSync() || Sync.ocupado) return;
  await sincronizarAgora({ silencioso: true });
  renderSecretaria();
}

function abrirSecretaria(qual) {
  switch (qual) {
    case 'calendario': case 'celebracoes': case 'paroquia': return abrirAgenda(qual);
    case 'avisos': return abrirAvisosPar();
    case 'avisosCel': return abrirAvisosCelebracao();
    case 'nuvem': return abrirAjustes('sync');
  }
}

function iniciarSecretaria() {
  // marca, abertura e Sobre com o nome e o ícone da Secretaria
  $('.marca').innerHTML = '<img src="img/secretaria.svg" alt="" class="logo-mini"> <span class="dourado">Miguel</span>Angelus <span class="marca-sec">Secretaria</span>';
  $('.marca').title = 'Sobre a Secretaria MiguelAngelus';
  // Sobre: o cartão da Secretaria no lugar do logotipo do MiguelAngelus; créditos, brasão e redes continuam os mesmos
  const logo = $('#dlgSobre .logo-boas-vindas');
  if (logo) logo.outerHTML = `<div class="sobre-sec"><img src="img/secretaria.svg" alt="">
      <div><div class="sobre-sec-nome"><span class="dourado">Miguel</span>Angelus <span class="marca-sec">Secretaria</span></div>
      <div class="sobre-sec-sub">Agenda e avisos da paróquia</div></div></div>`;
  const intro = $('#dlgSobre .sobre > p');
  if (intro) intro.innerHTML = 'Programa da família <b>MiguelAngelus</b> para a <b>secretaria paroquial</b>: cadastra a agenda da paróquia ' +
    '(celebrações das comunidades) e os avisos paroquiais, que chegam pela nuvem aos roteiros e ao telão do MiguelAngelus. ' +
    'Também imprime os avisos de cada celebração e gera as imagens para o Holyrics.';
  const versao = `Secretaria MiguelAngelus ${VERSAO_SECRETARIA}`;
  $('#versaoApp').textContent = versao + ' · ' + (NO_APP ? 'aplicativo para Windows' : 'no navegador');
  document.querySelectorAll('[data-versao]').forEach(e => e.textContent = 'Versão ' + VERSAO_SECRETARIA);
  $('#secretaria').hidden = false;
  const explica = $('[data-ajpainel="sync"] > p.sutil.pequeno');
  if (explica) explica.innerHTML = 'Use a <b>mesma</b> nuvem do MiguelAngelus (a conta do Google Drive da paróquia, ou a mesma pasta compartilhada). ' +
    'Ao abrir, a Secretaria pega a Agenda e os Avisos mais novos; o que mudar aqui vai logo para a nuvem. Só a Agenda e os Avisos vão e vêm — ' +
    'roteiros, cantos e o resto continuam só no MiguelAngelus.';

  $('#secretaria').addEventListener('click', e => {
    const b = e.target.closest('[data-sec]');
    if (b) return abrirSecretaria(b.dataset.sec);
    if (e.target.closest('[data-sec-sync]')) return enviarSecretaria();
    const ev = e.target.closest('.sec-ev:not(.cancelada)');
    if (ev) {
      abrirAvisosCelebracao();
      $('#apcData').value = ev.dataset.iso;
      renderAvisosCelebracao();
      const i = AvCel.ocs.findIndex(o => o.chave === ev.dataset.chave);
      if (i >= 0) { $('#apcCel').value = String(i); renderListaCelebracao(); }
    }
  });
  // ao fechar a Agenda, os Avisos ou os Ajustes: atualiza a tela e manda para a nuvem
  for (const id of ['dlgAgenda', 'dlgAvisosPar', 'dlgEvento']) $('#' + id).addEventListener('close', () => setTimeout(enviarSecretaria, 300));
  $('#dlgAjustes').addEventListener('close', renderSecretaria);
  // atalhos da tela de projeção (setas, B, M, A…) não valem aqui
  document.addEventListener('keydown', e => {
    if (e.key === 'F11' || e.ctrlKey || e.target.closest?.('input, textarea, select, [contenteditable="true"], dialog')) return;
    e.stopImmediatePropagation();
  }, true);
  setInterval(() => { if (Sync.sujo && !Sync.ocupado && ligadaSync()) enviarSecretaria(); }, 30000);
  setInterval(renderSecretaria, 15000);   // o que chegou da nuvem aparece na semana sem precisar clicar
  // novidades da Secretaria (as do MiguelAngelus não aparecem aqui)
  try {
    const vista = localStorage.getItem('secretaria.novidades');
    if (vista !== VERSAO_SECRETARIA) {
      localStorage.setItem('secretaria.novidades', VERSAO_SECRETARIA);
      if (vista) setTimeout(() => { $('#novCorpo').innerHTML = htmlVersoes(NOVIDADES_SECRETARIA, VERSAO_SECRETARIA); abrirDialogo('dlgNovidades'); }, 1200);
    }
  } catch (_) {}
  renderSecretaria();
  Promise.resolve(AvPar.pronto).then(renderSecretaria, renderSecretaria);   // conta de novo quando os avisos acabarem de carregar
  // sem nada cadastrado e sem nuvem: começa pela nuvem (a Agenda da paróquia já está lá, feita no MiguelAngelus)
  if (!ligadaSync() && !Agenda.dados.locais.length) setTimeout(() => abrirAjustes('sync'), 1400);
}
