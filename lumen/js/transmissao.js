'use strict';
/*
 * Transmissão (NDI): faixa de letras para o OBS.
 * A página decide O QUE vai na faixa (conforme o que está no ar e os liga/desliga de cada tipo em Ajustes)
 * e manda para o aplicativo (MiguelAngelus.exe), que desenha a faixa com fundo transparente e transmite por NDI.
 * No navegador (sem o aplicativo) o NDI não existe: a seção dos Ajustes avisa.
 * Usa S, NO_APP, Avisos, salvarConfig, $… (em tempo de execução).
 */

const Transmissao = { ultimo: '', status: { ativo: false, conexoes: 0, erro: null }, timer: 0 };

function paraApp(msg) {
  try { if (NO_APP) window.chrome.webview.postMessage(msg); } catch (_) {}
}

// Tipo do que está no ar: cantos | respostas | leituras | avisos | null (imagens, vídeos…)
function categoriaAoVivo() {
  if (S.live.altar || (!S.live.item && S.live.slide)) return 'avisos';   // botão Altar, mensagem rápida
  const it = S.live.item;
  if (!it) return null;
  switch (it.tipo) {
    case 'canto': case 'salmo': return 'cantos';
    case 'leitura': case 'biblia': return 'leituras';
    case 'texto': return /leitura|evangelho/i.test(it.titulo || '') ? 'leituras' : 'respostas';
    case 'ordinario': case 'oracao': case 'preces': case 'prefacio': case 'eucaristica': return 'respostas';
    default: return null;
  }
}

const CAMPO_CATEGORIA = { cantos: 'faixaCantos', respostas: 'faixaRespostas', leituras: 'faixaLeituras', avisos: 'faixaAvisos' };

// Linhas da faixa a partir do slide: respostas do povo ("— …") e refrões em negrito
function linhasDoSlide(s) {
  const maius = t => S.config.maiusculas ? t.toLocaleUpperCase('pt-BR') : t;
  if (s.versos) return { linhas: [maius(s.versos.map(v => v.t).join(' '))], negrito: [false] };
  let povo = false;
  const linhas = [], negrito = [];
  for (const [i, l] of (s.texto || '').split('\n').entries()) {
    if (!l.trim()) continue;
    povo = povoDaLinha(l, povo);
    const sem = (i === 0 && s.numerado ? l.replace(/^\s*\d+\.\s+/, '') : l).replace(/<\/?[biu]>/gi, '');   // sem o nº da prece/estrofe e sem as marcas de negrito/itálico
    linhas.push(maius(sem.replace(/^\s*—\s*/, '').replace(RX_QUEM, '').trim()));   // … e sem "P."/"T."
    negrito.push(povo || !!s.refrao);
  }
  return { linhas, negrito };
}

function conteudoFaixa() {
  if (S.live.preto) return { linhas: [], negrito: [] };
  // aviso na tela (placa, criança…) tem prioridade, se estiver ligado para a transmissão
  if (Avisos.atual && S.config.faixaAvisos) return { linhas: [Avisos.atual.texto], negrito: [true] };
  const cat = categoriaAoVivo();
  if (!cat || !S.config[CAMPO_CATEGORIA[cat]] || !S.live.slide) return { linhas: [], negrito: [] };
  if (S.live.slide.img && S.live.slide.layout === 'so') return { linhas: [], negrito: [] };
  return linhasDoSlide(S.live.slide);
}

// Chamado sempre que algo vai para o telão (slide, tela preta, aviso). Junta chamadas seguidas numa só.
function atualizarFaixa(forcar = false) {
  if (!NO_APP || !S.config.ndiLigado) return;
  clearTimeout(Transmissao.timer);
  Transmissao.timer = setTimeout(() => {
    const c = conteudoFaixa();
    const msg = { tipo: 'faixa', ...c, fonte: primeiraFonte(S.config.fonte), tamanho: +S.config.faixaTamanho || 4.6,
      opacidade: +(S.config.faixaOpacidade ?? 0.6), corTexto: S.config.corTexto || '#ffffff' };
    const chave = JSON.stringify(msg);
    if (!forcar && chave === Transmissao.ultimo) return;
    Transmissao.ultimo = chave;
    paraApp(msg);
  }, 30);
}

const primeiraFonte = f => (f || 'Segoe UI').split(',')[0].replace(/["']/g, '').trim();

function aplicarNdi() {
  if (!NO_APP) return renderNdi();
  paraApp({ tipo: 'ndi', ligar: !!S.config.ndiLigado, nome: S.config.ndiNome || 'MiguelAngelus Letras' });
  Transmissao.ultimo = '';
  atualizarFaixa(true);
}

function renderNdi() {
  const st = Transmissao.status, el = $('#ndiInfo'), selo = $('#estadoNdi');
  let txt, cls = '';
  if (!NO_APP) txt = 'A transmissão por NDI funciona só no aplicativo MiguelAngelus.exe (não no navegador).';
  else if (st.erro) { txt = '⚠ ' + st.erro; cls = 'erro'; }
  else if (!st.ativo) txt = 'Desligado.';
  else if (st.conexoes > 0) { txt = `● Transmitindo — ${st.conexoes} programa(s) recebendo (ex.: OBS).`; cls = 'ok'; }
  else txt = '● Transmitindo — esperando o OBS conectar.';
  if (el) { el.textContent = txt; el.className = 'status ' + cls; }
  if (selo) {
    selo.hidden = !(NO_APP && st.ativo);
    selo.textContent = st.conexoes > 0 ? `● NDI (${st.conexoes})` : '● NDI';
    selo.classList.toggle('conectado', st.conexoes > 0);
    selo.title = txt;
  }
}

function ligarTransmissao() {
  if (NO_APP) {
    window.chrome.webview.addEventListener('message', e => {
      if (e.data?.tipo === 'ndiStatus') { Transmissao.status = e.data; renderNdi(); }
    });
  }
  // qualquer mudança nos campos da transmissão (Ajustes) vale na hora
  $('#dlgAjustes').addEventListener('input', e => {
    const k = e.target.dataset?.cfg || '';
    if (k === 'ndiLigado' || k === 'ndiNome') aplicarNdi();
    else if (/^faixa|^fonte$|^corTexto$|^maiusculas$/.test(k)) atualizarFaixa(true);
  });
  $('#estadoNdi').addEventListener('click', () => abrirAjustes('ndi'));
  renderNdi();
  if (S.config.ndiLigado) aplicarNdi();
}
