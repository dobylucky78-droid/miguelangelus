'use strict';
/*
 * Avisos na tela: faixa por cima do que estiver projetado (letra, leitura, vídeo ou tela preta),
 * sem tirar o slide do ar. Modelos prontos: veículo (placa) e criança; ou texto livre (com os avisos salvos).
 * Some sozinha depois do tempo escolhido. Os avisos recentes ficam só na memória (somem ao fechar o app).
 * Usa $, $$, S, enviar, esc, salvarConfig, abrirDialogo, toast... de app.js/menus.js (em tempo de execução).
 */

const Avisos = { atual: null, timer: 0, tique: 0, recentes: [], tipo: 'veiculo', editado: false };

const semMarcasAviso = t => tirarMarcas(t);
const ICONE_AVISO = { veiculo: '🚗', crianca: '🧒', livre: '📢' };

function textoDoModelo() {
  const local = ($('#avLocal').value.trim() || 'à porta da igreja').replace(/\.$/, '');
  if (Avisos.tipo === 'veiculo') {
    const placa = $('#avPlaca').value.trim().toUpperCase();
    const modelo = $('#avModelo').value.trim();
    if (!placa && !modelo) return '';
    return `Atenção, proprietário do veículo${modelo ? ' ' + modelo : ''}${placa ? ' placa ' + placa : ''}: favor comparecer ${local}.`;
  }
  if (Avisos.tipo === 'crianca') {
    const nome = $('#avCrianca').value.trim();
    return nome ? `Responsável pela criança ${nome}: favor comparecer ${local}.` : '';
  }
  return '';
}

function atualizarTextoAviso() {
  if (Avisos.tipo !== 'livre' && !Avisos.editado) $('#avTexto').value = textoDoModelo();
}

function tipoAviso(tipo) {
  Avisos.tipo = tipo;
  Avisos.editado = false;
  $$('#dlgAviso [data-av]').forEach(b => b.classList.toggle('ativa', b.dataset.av === tipo));
  $('#avCamposVeiculo').hidden = tipo !== 'veiculo';
  $('#avCamposCrianca').hidden = tipo !== 'crianca';
  $('#avCampoLocal').hidden = tipo === 'livre';
  if (tipo === 'livre') $('#avTexto').value = '';
  Avisos.salvoSel = null;
  renderConvites();               // avisos salvos (avisosparoquiais.js): só na aba "Outro aviso"
  atualizarTextoAviso();
  const foco = { veiculo: '#avPlaca', crianca: '#avCrianca', livre: '#avTexto' }[tipo];
  setTimeout(() => $(foco).focus(), 0);
}

function abrirAviso() {
  for (const id of ['#avPlaca', '#avModelo', '#avCrianca']) $(id).value = '';
  $('#avLocal').value = S.config.avisoLocal || 'à porta da igreja';
  $('#avDuracao').value = String(S.config.avisoDuracao ?? 60);
  $('#avPosicao').value = S.config.avisoPosicao || 'alto';
  renderRecentes();
  abrirDialogo('dlgAviso');
  tipoAviso(Avisos.tipo === 'livre' ? 'livre' : Avisos.tipo);
}

function renderRecentes() {
  $('#avRecentes').hidden = !Avisos.recentes.length;
  $('#avRecentesLista').innerHTML = Avisos.recentes.map((a, i) =>
    `<button type="button" class="av-recente" data-rec="${i}" title="Mostrar de novo">${ICONE_AVISO[a.tipo] || '📢'} ${esc(semMarcasAviso(a.texto))}</button>`).join('');
}

// Mostra o aviso na projeção (e na prévia). duracao em segundos; 0 = até retirar.
function mostrarAviso(a) {
  clearTimeout(Avisos.timer);
  Avisos.atual = { ...a, inicio: Date.now(), n: Date.now() };   // n muda a cada envio: a faixa pisca de novo
  enviar({ tipo: 'aviso', aviso: Avisos.atual });
  if (a.duracao > 0) Avisos.timer = setTimeout(retirarAviso, a.duracao * 1000);
  Avisos.recentes = [a, ...Avisos.recentes.filter(x => x.texto !== a.texto)].slice(0, 6);
  renderAvisoAtivo();
}

function retirarAviso() {
  clearTimeout(Avisos.timer);
  Avisos.atual = null;
  enviar({ tipo: 'aviso', aviso: null });
  renderAvisoAtivo();
}

function renderAvisoAtivo() {
  const a = Avisos.atual, box = $('#avisoAtivo');
  clearInterval(Avisos.tique);
  box.hidden = !a;
  if (!a) return;
  const tempo = () => {
    if (!a.duracao) return 'até retirar';
    const s = Math.max(0, Math.ceil(a.duracao - (Date.now() - a.inicio) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  box.innerHTML = `<div class="toc-tit">📢 Aviso na tela <span class="av-tempo">${tempo()}</span></div>
    <div class="av-ativo-txt">${esc(semMarcasAviso(a.texto))}</div>
    <div class="linha"><button data-av-acao="repetir" title="Faz a faixa piscar de novo e reinicia o tempo">↻ Repetir</button>
    <button data-av-acao="retirar" class="perigo">✕ Retirar</button></div>`;
  if (a.duracao) Avisos.tique = setInterval(() => { const t = box.querySelector('.av-tempo'); if (t) t.textContent = tempo(); }, 1000);
}

function enviarEstadoAviso(w) {
  enviar({ tipo: 'aviso', aviso: Avisos.atual }, [w]);
}

function ligarAvisos() {
  $$('#dlgAviso [data-av]').forEach(b => b.addEventListener('click', () => tipoAviso(b.dataset.av)));
  for (const id of ['#avPlaca', '#avModelo', '#avCrianca', '#avLocal']) $(id).addEventListener('input', atualizarTextoAviso);
  $('#avPlaca').addEventListener('input', e => { const p = e.target.selectionStart; e.target.value = e.target.value.toUpperCase(); e.target.setSelectionRange(p, p); });
  $('#avTexto').addEventListener('input', () => { Avisos.editado = Avisos.tipo !== 'livre'; });
  $('#avRecentesLista').addEventListener('click', e => {
    const b = e.target.closest('[data-rec]');
    if (!b) return;
    const a = Avisos.recentes[+b.dataset.rec];
    $('#dlgAviso').close();
    mostrarAviso({ ...a, duracao: +$('#avDuracao').value, pos: $('#avPosicao').value });
  });
  $('#dlgAviso form').addEventListener('submit', e => {
    if (e.submitter?.value !== 'mostrar') return;
    const texto = $('#avTexto').value.trim().replace(/\s*\n\s*/g, ' ');
    if (!texto) { e.preventDefault(); toast('Escreva o aviso (ou preencha a placa / o nome).'); return; }
    S.config.avisoLocal = $('#avLocal').value.trim() || 'à porta da igreja';
    S.config.avisoDuracao = +$('#avDuracao').value;
    S.config.avisoPosicao = $('#avPosicao').value;
    salvarConfig();
    mostrarAviso({ tipo: Avisos.tipo, texto, icone: ICONE_AVISO[Avisos.tipo], duracao: S.config.avisoDuracao, pos: S.config.avisoPosicao });
  });
  // Ctrl+Enter no texto mostra direto
  $('#dlgAviso').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || !e.target.matches('textarea'))) { e.preventDefault(); $('#avMostrar').click(); }
  });
  $('#btnAviso').addEventListener('click', abrirAviso);
  $('#avisoAtivo').addEventListener('click', e => {
    const acao = e.target.closest('[data-av-acao]')?.dataset.avAcao;
    if (acao === 'retirar') retirarAviso();
    if (acao === 'repetir' && Avisos.atual) mostrarAviso(Avisos.atual);
  });
}
