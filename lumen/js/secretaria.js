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
  { versao: '1.5.1', data: '2026-11-21', itens: [
    '🏷 A versão do programa aparece na barra de cima da janela ("Secretaria MiguelAngelus 1.5.1") e, pequena, ao lado do nome, como no MiguelAngelus e no Cast.',
  ] },
  { versao: '1.5.0', data: '2026-11-19', itens: [
    '🕯 Intenções no MiguelAngelus (telão): nova chave em Ajustes → 🕯 Intenções no MiguelAngelus. Vem DESLIGADA. Ligada, o operador do MiguelAngelus pode trazer as intenções de cada Missa para o roteiro e mostrar no telão: vão só o tipo e a intenção; o "a pedido de", o responsável, o telefone e a oferta ficam na Secretaria. Deixe desligada se muitas intenções chegam na hora, na entrada da igreja, e são lidas só do papel. A tela de Intenções de Missa mostra se a chave está ligada ou desligada e onde mudar.',
    '🔒 Dados de uma pessoa (LGPD), em Ajustes: procure pelo nome ou pelo telefone e aparecem todas as marcações e intenções onde a pessoa está. "🖨 Relatório para a pessoa" imprime ou salva em PDF tudo o que a secretaria guarda dela; "🗑 Apagar os marcados" apaga de vez, também nos outros computadores da secretaria (a intenção de 7º dia lançada pela marcação vai junto).',
    '📈 Histórico do andamento das campanhas: cada vez que o arrecadado muda, ou a campanha é pausada, encerrada ou reaberta, fica registrado com a data e a hora. O histórico aparece na própria campanha, com quanto entrou entre uma atualização e outra, e dá para imprimir. As campanhas que já existiam começam pelo andamento que tinham.',
  ] },
  { versao: '1.4.1', data: '2026-11-18', itens: [
    '💠 Para quem vai o Pix de cada campanha: embaixo do QR code aparece o recebedor que está dentro do próprio QR (nome, cidade e chave). Ao escolher o QR, o programa pergunta se é para ele mesmo e já preenche a chave, se o campo estiver vazio. Se a chave escrita for diferente da chave do QR, aparece um alerta. Tudo é lido no próprio computador, sem internet.',
  ] },
  { versao: '1.4.0', data: '2026-11-18', itens: [
    '📢 Tipo do aviso: 📢 Aviso, 🎉 Evento ou 💝 Campanha. No de evento ou de campanha, escolha qual dos já cadastrados, ou "Não tem cadastrado", e aí fica só o texto. A folha impressa traz todos os textos nesta ordem: avisos comuns, avisos de evento e avisos de campanha (em cada grupo, primeiro os sem cadastro). No telão do MiguelAngelus, no lugar de cada aviso ligado entra o slide do evento ou da campanha, na mesma ordem em que o leitor lê. As imagens para o Holyrics seguem a mesma sequência.',
  ] },
  { versao: '1.3.0', data: '2026-11-18', itens: [
    '💝 Campanhas de arrecadação (reforma, festa, obra social…): título, descrição, a arte feita no Canva, o QR code do Pix da campanha e a chave, a meta e quanto já foi arrecadado (ou só o percentual). Você escolhe se os valores aparecem no telão ou só o percentual. Botões ⏸ Pausar, ■ Encerrar e ▶ Reabrir; encerrada sai do telão, ou vira um slide "Muito obrigado!" com o resultado, se marcar "🙏 Agradecimento no telão". Vai pela nuvem para o MiguelAngelus, que mostra no item 💝 Campanhas do roteiro; só a Secretaria atualiza o andamento.',
    '🎨 Mostrador da meta de cada campanha: barra, termômetro, círculo, tijolos (cada tijolo = 10%) ou coração enchendo. O slide da campanha tem fundo vinho e faixa dourada "💝 CAMPANHA", com "💠 DOE PELO PIX" no QR; o do evento ganhou a faixa azul "🎉 EVENTO" e "📅 SALVE NA AGENDA" no QR, para ninguém confundir os dois.',
    '🔒 O QR code e a chave Pix de cada campanha ficam protegidos por uma senha de 4 números da própria campanha (criada ao salvar): ninguém troca o Pix da campanha por outro sem a senha. Atualizar o andamento não pede senha.',
  ] },
  { versao: '1.2.0', data: '2026-11-17', itens: [
    '🙏 Eventos de vários dias no mesmo horário (novena, tríduo, semana missionária): marque "Todos os dias, no mesmo horário" e o QR vira um compromisso por dia na agenda do celular (ex.: novena de 15 a 23/12, 19h30 às 21h → 9 compromissos), em vez de um bloco só. Uma dica no formulário explica como preencher cada caso.',
    '📆 (Em teste) Agenda da secretaria: liga a agenda compartilhada do Google da secretaria, numa conta própria, em Ajustes → 📆 Agenda da secretaria. Ver é livre; para criar, mudar ou apagar, a pessoa entra com nome e senha. Quem não liga não vê nada diferente.',
  ] },
  { versao: '1.1.0', data: '2026-11-14', itens: [
    '☰ Menu no alto da janela: Ajustes (nuvem, pasta do Holyrics, paróquia e comunidades, aparência) e Ajuda (Como usar com F1, vídeos, site, e-mail de contato, novidades, atualização, Sobre).',
    '📒 Marcações por igreja: batizados, casamentos, 15 anos, 7º dia, crismas, 1ª comunhão, bênçãos. Visão por dia, semana e mês, filtros, busca, aviso de choque de horário e impressão. O 7º dia escolhe a Missa e já cria a intenção.',
    '🕯 Intenções de Missa: por celebração, agrupadas por tipo. "A pedido de" é lido na Missa; o "Responsável" (quem pediu e fez a oferta) fica só na secretaria. Folha para ler no ambão (sem valores) e relatório de ofertas por período e igreja.',
    '🎉 Eventos com QR code: título, data, local, descrição e cartaz (modelo 1080 × 1350 px). Imagem Full HD para o Holyrics e cartaz A4 para o mural, com o QR que põe o evento na agenda do celular. Os eventos aparecem também no MiguelAngelus.',
    '☁ Duas ou mais secretarias na mesma nuvem: marcações, intenções e eventos vão e voltam sozinhos. Se outro computador mudou ou apagou o mesmo item, o programa pergunta antes de salvar.',
    '📅 Campos de data com o calendário que abre ao clicar.',
  ] },
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
    // (1.1) marcações do dia (só deste computador) e intenções de cada Missa
    const marcs = typeof Marc !== 'undefined' ? Marc.lista.filter(m => m.data === iso && m.situacao !== 'cancelada' && m.tipo !== '7dia') : [];
    if (!ocs.length && !marcs.length) continue;
    dias.push(`<div class="sec-dia"><div class="sec-dia-tit">${k === 0 ? 'Hoje' : k === 1 ? 'Amanhã' : DIAS[d.getDay()]}, ${dataCurta(d)}
        ${marcs.length ? `<span class="sec-marcs" data-sec-marc="${iso}" title="${esc(marcs.map(m => `${m.hora} ${tipoMarc(m.tipo)[1]}: ${m.nomes.split('\n')[0]}`).join('\n'))}">📒 ${marcs.length} marcaç${marcs.length > 1 ? 'ões' : 'ão'}</span>` : ''}</div>
      ${ocs.map(o => {
        const loc = localDe(o.localId), n = o.cancelada ? 0 : avisosVigentes(iso, o.localId).length;
        const ni = !o.cancelada && typeof Int !== 'undefined' && ehMissa(o.tipo) ? intencoesDe(iso, o).length : 0;
        return `<div class="sec-ev ${o.cancelada ? 'cancelada' : ''}" data-iso="${iso}" data-chave="${esc(o.chave)}" title="${o.cancelada ? 'Cancelada neste dia' : 'Ver os avisos desta celebração'}">
          <span class="sec-hora">${esc(o.hora)}</span>${loc ? `<span class="card-ponto" style="background:${loc.cor}"></span>` : ''}
          <span class="sec-txt">${esc(o.texto)}${o.cancelada ? ' <i>(cancelada)</i>' : ''}</span>
          ${ni ? `<span class="sec-int" data-sec-int title="Ver as intenções desta Missa">🕯 ${ni}</span>` : ''}
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
    case 'marcacoes': return abrirMarcacoes();
    case 'intencoes': return abrirIntencoes();
    case 'eventos': return abrirEventos();
    case 'campanhas': return abrirCampanhas();     // (1.9.6) campanhas.js
    case 'agendaG': return abrirAgendaG();
  }
}

function iniciarSecretaria() {
  // marca, abertura e Sobre com o nome e o ícone da Secretaria
  $('.marca').innerHTML = '<img src="img/secretaria.svg" alt="" class="logo-mini"> <span class="dourado">Miguel</span>Angelus <span class="marca-sec">Secretaria</span>';
  $('.marca').title = 'Sobre a Secretaria MiguelAngelus';
  // (1.5.1) versão na barra da janela e ao lado do nome, como no MiguelAngelus e no Cast
  document.title = `Secretaria MiguelAngelus ${VERSAO_SECRETARIA}`;
  $('.marca').insertAdjacentHTML('beforeend', ` <span class="marca-versao">versão ${esc(VERSAO_SECRETARIA)}</span>`);
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
  iniciarCadastrosSecretaria();     // secretariacadastros.js: menu Ajustes/Ajuda, marcações e intenções
  const explica = $('[data-ajpainel="sync"] > p.sutil.pequeno');
  if (explica) explica.innerHTML = 'Use a <b>mesma</b> nuvem do MiguelAngelus (a conta do Google Drive da paróquia, ou a mesma pasta compartilhada). ' +
    'Ao abrir, a Secretaria pega o que há de mais novo; o que mudar aqui vai logo para a nuvem. A Agenda, os Avisos e os Eventos vão e vêm com o MiguelAngelus. ' +
    '🔒 As marcações e as intenções (com nomes, telefones e ofertas) ficam só entre os computadores da Secretaria. Roteiros, cantos e o resto continuam só no MiguelAngelus.';

  $('#secretaria').addEventListener('click', e => {
    const b = e.target.closest('[data-sec]');
    if (b) return abrirSecretaria(b.dataset.sec);
    if (e.target.closest('[data-sec-sync]')) return enviarSecretaria();
    const mc = e.target.closest('[data-sec-marc]');
    if (mc) { Marc.visao = 'dia'; Marc.ref = deIso(mc.dataset.secMarc); return abrirMarcacoes(); }
    const ei = e.target.closest('.sec-ev [data-sec-int]');
    if (ei) { const p = ei.closest('.sec-ev'); return abrirIntencoes(p.dataset.iso, p.dataset.chave); }
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
