'use strict';
/* Barra de menus (Arquivo, Editar, Exibir, Projeção, Ferramentas, Ajuda) e troca de módulos. */

const MODULOS = ['roteiros', 'cantos', 'biblia', 'missa', 'videos', 'audios', 'apresentacoes', 'cameras', 'calendario'];
// Vídeos, Áudios, Apresentações e Câmeras usam a mesma seção (aba-midia), cada um mostrando só o seu tipo
const MODULO_MIDIA = { videos: 'video', audios: 'audio', apresentacoes: 'apresentacao', cameras: 'camera' };

// Ativa um módulo da coluna da esquerda. `interativo` = o operador escolheu agora (a Bíblia já abre o capítulo).
function mostrarAba(nome, interativo = true) {
  if (nome === 'midia') nome = 'videos';            // módulo antigo "Mídia"
  if (!MODULOS.includes(nome)) return;
  $$('.abas button').forEach(x => x.classList.toggle('ativa', x.dataset.aba === nome));
  const secao = MODULO_MIDIA[nome] ? 'midia' : nome;
  $$('.aba').forEach(a => a.classList.toggle('ativa', a.id === 'aba-' + secao));
  if (MODULO_MIDIA[nome]) mostrarTipoMidia(MODULO_MIDIA[nome]);
  if (S.config.moduloAtivo !== nome) { S.config.moduloAtivo = nome; salvarConfig(); }
  if (interativo && nome === 'biblia' && S.biblia) {
    if (S.atual?.item.tipo !== 'biblia') abrirCapitulo(S.nav.li, S.nav.c);
    else {
      // a Bíblia já estava aberta: só tira os cartões de roteiros / o catálogo de orações da frente
      if (S.modoCards) mostrarCards(false);
      if (S.modoEuc) mostrarEucaristia(false);
      renderCabecalho(); renderSlides();
    }
  }
  if (nome === 'roteiros') mostrarCards(true);   // Roteiros: cards no centro
  if (nome === 'calendario') renderCalLit();
}

function abrirDialogo(id) {
  const d = $('#' + id);
  d.returnValue = '';
  d.showModal();
}

// Grupos que recolhem/expandem (cards por dia, pastas de cantos, quadro de câmeras): lembra o estado neste computador
const Recolher = {
  _m: null,
  mapa() { if (!this._m) { try { this._m = JSON.parse(localStorage.getItem('lumen.recolhidos') || '{}'); } catch { this._m = {}; } } return this._m; },
  fechado(k, padrao = false) { const v = this.mapa()[k]; return v === undefined ? padrao : v; },
  definir(k, fechado) { this.mapa()[k] = fechado; try { localStorage.setItem('lumen.recolhidos', JSON.stringify(this._m)); } catch {} },
  alternar(k, padrao = false) { this.definir(k, !this.fechado(k, padrao)); },
};

// Ajustes: menu à esquerda, só a seção escolhida aparece à direita (lembra a última)
function mostrarAjuste(sec) {
  if (!$(`#dlgAjustes [data-ajpainel="${sec}"]`)) sec = 'aparencia';
  $$('#dlgAjustes [data-ajsec]').forEach(b => b.classList.toggle('ativa', b.dataset.ajsec === sec));
  $$('#dlgAjustes [data-ajpainel]').forEach(p => p.classList.toggle('ativa', p.dataset.ajpainel === sec));
  try { localStorage.setItem('lumen.ajuste', sec); } catch {}
}
function abrirAjustes(sec) {
  let ultima = 'aparencia';
  try { ultima = localStorage.getItem('lumen.ajuste') || ultima; } catch {}
  mostrarAjuste(sec || ultima);
  abrirDialogo('dlgAjustes');
}
document.addEventListener('click', e => {
  const b = e.target.closest('#dlgAjustes [data-ajsec]');
  if (b) mostrarAjuste(b.dataset.ajsec);
});

// Manual (HTML ao lado do programa): no aplicativo abre no navegador padrão do Windows
function abrirManual() {
  if (NO_APP) window.chrome.webview.postMessage({ tipo: 'abrirManual' });
  else window.open('Manual do MiguelAngelus.html', '_blank', 'noopener');
}

function alternarTelaCheiaPainel() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => toast('O navegador não permitiu a tela cheia. Use F11.'));
}

function acaoMenu(acao) {
  if (acao.startsWith('ver-')) return mostrarAba(acao.slice(4));
  switch (acao) {
    case 'novoRoteiro': return $('#btnNovoRoteiro').click();
    case 'duplicarRoteiro': return $('#btnDuplicarRoteiro').click();
    case 'folheto': return $('#arqFolheto').click();
    case 'folhetosLote': return $('#arqFolhetosLote').click();
    case 'biblia': return $('#arqBiblia').click();
    case 'txt': return $('#arqTxt').click();
    case 'midia': return $('#arqMidia').click();
    case 'exportar': return exportarBackup();
    case 'importar': return $('#arqBackup').click();
    case 'novoCanto': return $('#btnNovoCanto').click();
    case 'novaOracao': return $('#btnNovaOracao').click();
    case 'telaCheia': return alternarTelaCheiaPainel();
    case 'projecao': return alternarProjecao();
    case 'proximo': return proximo();
    case 'anterior': return anterior();
    case 'preto': return alternarPreto();
    case 'limpar': return limpar();
    case 'altar': return alternarAltar();
    case 'mensagem': abrirDialogo('dlgMensagem'); return $('#msgRapida').select();
    case 'aviso': return abrirAviso();
    case 'retirarAviso': return retirarAviso();
    case 'ajustes': return abrirAjustes();
    case 'celular': return abrirAjustes('celular');
    case 'folhetoOnline': return abrirFolhetosOnline();
    case 'liturgiaDia': return abrirLiturgiaDoDia();
    case 'agenda-calendario': return abrirAgenda('calendario');
    case 'agenda-celebracoes': return abrirAgenda('celebracoes');
    case 'agenda-paroquia': return abrirAgenda('paroquia');
    case 'manual': return abrirManual();
    case 'atalhos': return abrirDialogo('dlgAtalhos');
    case 'atualizar': return verificarAtualizacao({ silencioso: false });
    case 'sobre': return abrirDialogo('dlgSobre');
  }
}

function ligarMenus() {
  const bar = $('#menubar');
  let aberto = null;
  const fechar = () => { aberto?.classList.remove('aberto'); aberto = null; };
  const abrir = m => { fechar(); m.classList.add('aberto'); aberto = m; };

  bar.addEventListener('click', e => {
    const titulo = e.target.closest('.menu-titulo');
    if (titulo) return aberto === titulo.parentElement ? fechar() : abrir(titulo.parentElement);
    const item = e.target.closest('[data-menu]');
    if (item && !item.disabled) { fechar(); acaoMenu(item.dataset.menu); }
  });
  // Com um menu aberto, passar o mouse sobre outro título troca de menu (como nos programas)
  bar.addEventListener('mouseover', e => {
    const titulo = e.target.closest('.menu-titulo');
    if (aberto && titulo && titulo.parentElement !== aberto) abrir(titulo.parentElement);
  });
  document.addEventListener('click', e => { if (!e.target.closest('#menubar')) fechar(); });
  // Esc com menu aberto só fecha o menu (não limpa a projeção)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && aberto) { fechar(); e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);

  // Alt+1..9 troca de módulo; F11 põe o painel em tela cheia
  document.addEventListener('keydown', e => {
    if (e.altKey && !e.ctrlKey && /^[1-9]$/.test(e.key)) { e.preventDefault(); mostrarAba(MODULOS[+e.key - 1]); }
    if (e.key === 'F1') { e.preventDefault(); abrirManual(); }
  });

  // Clicar no logotipo abre o "Sobre" (ideia do Miguel)
  $('.marca').addEventListener('click', () => abrirDialogo('dlgSobre'));
  $('.marca').addEventListener('keydown', e => { if (e.key === 'Enter') abrirDialogo('dlgSobre'); });

  // Trilho de módulos
  for (const b of $$('.abas button')) b.addEventListener('click', () => mostrarAba(b.dataset.aba));

  // Mensagem rápida: projeta e fecha
  $('#btnMsg').addEventListener('click', () => { if ($('#msgRapida').value.trim()) $('#dlgMensagem').close(); });
  $('#msgRapida').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('#btnMsg').click(); }
  });
}
