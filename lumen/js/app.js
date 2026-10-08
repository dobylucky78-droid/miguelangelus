'use strict';
/* MiguelAngelus — painel do operador. Controla a prévia e a janela de projeção via postMessage. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const dividir = t => (t || '').replace(/\r/g, '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
const porTitulo = (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR');
// Rodando dentro do aplicativo MiguelAngelus.exe (WebView2) em vez do Chrome
const NO_APP = !!(window.chrome && window.chrome.webview);
const semAcento = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const MOMENTOS = ['Entrada', 'Ato Penitencial', 'Aspersão', 'Glória', 'Salmo', 'Aclamação ao Evangelho', 'Ofertório', 'Santo',
  'Cordeiro', 'Comunhão', 'Ação de Graças', 'Final', 'Mariano', 'Adoração', 'Outros'];

const CONFIG_PADRAO = {
  pixCartao: 64, pixQrCamera: 36, pixFaixaCamera: 11,      // tamanhos do 💠 Pix no telão (% da altura da tela)
  fonte: '"Segoe UI", Arial, sans-serif', fonteMax: 9, corTexto: '#ffffff', corFundo: '#000000', fundoImagem: '',
  alinhamento: 'justify-center', sombra: true, maiusculas: false, rodape: true, versosPorSlide: 1, numerarVersos: true,
  quebraAuto: true, linhasPorSlide: 4, caracteresPorLinha: 40, quebraCantos: false,
  textoAltar: 'TODOS DIRIJAM SEU OLHAR PARA O ALTAR',
  temaApp: 'escuro',                                // aparência do próprio aplicativo: 'escuro' ou 'claro'
  atualizarAuto: true, versaoIgnorada: '',          // atualização automática (atualizacao.js)
  mostrarRotulos: true, corRotulo: '#ff5a4f',     // letra de quem fala (P., T., L.) colorida no telão
  espacoResposta: true,                          // espaço entre as falas: a resposta do povo fica separada
  salmoCorrido: true,                            // salmo: versos de cada estrofe em texto corrido (não quebra a cada vírgula)
  // transmissão (NDI): faixa de letras para o OBS
  ndiLigado: false, ndiNome: 'MiguelAngelus Letras', faixaTamanho: 4.6, faixaOpacidade: 0.6,
  faixaCantos: true, faixaRespostas: true, faixaLeituras: true, faixaAvisos: true,
  bibliaAtiva: '', roteiroAtivo: '',
};

const S = {
  config: { ...CONFIG_PADRAO },
  biblias: [], biblia: null,
  cantos: [], roteiros: [], roteiro: null,
  atual: null,                               // { item, slides, idx, rIdx }  (rIdx = -1 → item avulso)
  live: { slide: null, preto: false, item: null, idx: -1 },
  projWin: null, posAlvo: null,
};

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2800);
}

// =====================================================================
// Persistência
// =====================================================================

const salvarConfig = debounce(() => DB.salvar('config', { id: 'geral', valor: S.config }), 300);

function salvarRoteiroAgora() {
  if (typeof registrarHistorico === 'function') registrarHistorico(S.roteiro);     // Desfazer (historico.js)
  S.roteiro.atualizado = Date.now();
  if (!S.roteiros.includes(S.roteiro)) S.roteiros.push(S.roteiro);
  return DB.salvar('roteiros', S.roteiro);
}
const salvarRoteiro = debounce(salvarRoteiroAgora, 400);

function novoRoteiro(nome) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return { id: uid(), nome: nome || `Missa ${hoje}`, itens: [], atualizado: Date.now() };
}

// =====================================================================
// Comunicação com a projeção
// =====================================================================

function alvos() {
  const a = [];
  const pv = $('#preview').contentWindow;
  if (pv) a.push(pv);
  if (S.projWin && !S.projWin.closed) a.push(S.projWin);
  return a;
}

function enviar(msg, destinos) {
  if (!destinos) cameraAntesDoSlide(msg);   // slide sem "letra por cima": a câmera sai do telão
  const m = { app: 'lumen', ...msg };
  for (const w of destinos || alvos()) try { w.postMessage(m, '*'); } catch (_) { /* janela fechada */ }
  // o que vai para o telão também alimenta a faixa de letras da transmissão (NDI)
  if (!destinos && (msg.tipo === 'slide' || msg.tipo === 'preto' || msg.tipo === 'aviso')) atualizarFaixa();
}

function enviarEstado(w) {
  enviarConfigTelao([w]);
  enviar({ tipo: 'slide', slide: S.live.slide }, [w]);
  enviar({ tipo: 'preto', on: S.live.preto }, [w]);
  enviarLayout([w]);
  enviarEstadoMidia(w);
  enviarEstadoAviso(w);
  enviarEstadoCamera(w);
  if (typeof enviarEstadoPix === 'function') enviarEstadoPix(w);
}

window.addEventListener('message', e => {
  const m = e.data;
  if (!m || m.app !== 'lumen') return;
  if (m.tipo === 'ola') {
    if (m.preview) return enviarEstado(e.source);
    const nova = S.projWin !== e.source;
    S.projWin = e.source;
    if (nova || m.primeiro) {
      enviarEstado(e.source);
      if (S.posAlvo) enviar({ tipo: 'posicionar', ...S.posAlvo }, [e.source]);
      renderEstadoProj();
    }
  } else if (m.tipo === 'tecla') {
    tratarTecla(m.key);
  } else if (m.tipo === 'midiaStatus') {
    receberStatusMidia(m);
  }
});

async function abrirProjecao() {
  if (S.projWin && !S.projWin.closed) { S.projWin.focus(); return; }
  const w = window.open('projecao.html', 'lumen-projecao', 'popup,width=960,height=540');
  if (!w) { alert('O navegador bloqueou a janela de projeção. Permita pop-ups para esta página e tente de novo.'); return; }
  S.projWin = w;
  renderEstadoProj();
  if (NO_APP) return;   // no aplicativo, o próprio programa leva a janela para o telão em tela cheia
  // Se houver um segundo monitor e o navegador permitir, manda a janela para ele
  try {
    if ('getScreenDetails' in window) {
      const tela = await window.getScreenDetails();
      const ext = tela.screens.find(s => s !== tela.currentScreen && !s.isPrimary) || tela.screens.find(s => s !== tela.currentScreen);
      if (ext) {
        S.posAlvo = { x: ext.availLeft, y: ext.availTop, w: ext.availWidth, h: ext.availHeight };
        enviar({ tipo: 'posicionar', ...S.posAlvo }, [w]);
      }
    }
  } catch (_) { /* sem permissão: o usuário arrasta a janela */ }
}

// Fecha a janela do telão (o botão do alto vira "Fechar projeção" quando ela está aberta)
function fecharProjecao() {
  if (S.projWin && !S.projWin.closed) S.projWin.close();
  setTimeout(renderEstadoProj, 300);
}
function alternarProjecao() {
  if (S.projWin && !S.projWin.closed) fecharProjecao(); else abrirProjecao();
}

function renderEstadoProj() {
  const aberta = S.projWin && !S.projWin.closed;
  const el = $('#estadoProj');
  el.textContent = aberta ? '● projeção aberta' : 'projeção fechada';
  el.classList.toggle('aberta', !!aberta);
  const b = $('#btnProjecao');
  b.textContent = aberta ? '✕ Fechar projeção' : 'Abrir projeção';
  b.classList.toggle('primario', !aberta);
  b.classList.toggle('fechar-proj', !!aberta);
  const m = document.querySelector('[data-menu="projecao"]');
  if (m) m.textContent = aberta ? 'Fechar janela de projeção' : 'Abrir janela de projeção';
}

// =====================================================================
// Slides
// =====================================================================

function versosEmSlides(r) {
  const n = Math.max(1, +S.config.versosPorSlide || 1);
  const out = [];
  let g = [];
  const fechar = () => {
    if (!g.length) return;
    const a = g[0], b = g[g.length - 1];
    out.push({
      versos: g.map(v => ({ n: v.n, t: v.t })),
      texto: g.map(v => v.t).join(' '),
      rodape: `${r.livro.nome} ${a.c},${a.n}${b.n !== a.n ? '-' + b.n : ''}`,
    });
    g = [];
  };
  for (const v of r.versos) {
    if (g.length && (g.length >= n || g[0].c !== v.c)) fechar();
    g.push(v);
  }
  fechar();
  return out;
}

// ---------- Limite de linhas/caracteres por slide ----------

const sobrescrito = n => String(n).replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);

// Texto longo (um parágrafo de leitura) em pedaços de até `cap` caracteres:
// 1) usa o MENOR número de slides possível; 2) corta de preferência no fim de uma frase, depois numa vírgula,
// e só em último caso no meio da frase; 3) reparte por igual. Referências entre parênteses "(cf. Jo 17,21)" nunca se partem.
const ABREVIACOES = /^(cf|Cf|S|Sto|Sta|Sr|Sra|Pe|Dom|Fr|Ir|Mons|Pr|n|nº|p|pp|v|vv|cap|ex|etc|séc)\.$/;
function unidadesTexto(texto) {
  const tam = s => s.replace(/<\/?[biu]>/gi, '').length;
  // palavras; o que está entre parênteses (até ~40 letras) vira uma palavra só
  const palavras = [];
  let grupo = null;
  for (const p of texto.split(/\s+/).filter(Boolean)) {
    if (grupo !== null) {
      grupo += ' ' + p;
      if (p.includes(')') || tam(grupo) > 40) { palavras.push(grupo); grupo = null; }
    } else if (p.includes('(') && !p.includes(')')) grupo = p;
    else palavras.push(p);
  }
  if (grupo !== null) palavras.push(grupo);
  // tipo do corte DEPOIS de cada palavra: 0 = fim de frase, 1 = vírgula/pausa, 2 = meio da frase (ou dentro de aspas)
  let aspas = 0;
  return palavras.map(p => {
    const limpo = p.replace(/<\/?[biu]>/gi, '');
    aspas += (limpo.match(/[“«]/g) || []).length - (limpo.match(/[”»]/g) || []).length;
    const fim = /[.!?…;:]["”’»)]*$/.test(limpo) && !ABREVIACOES.test(limpo.replace(/^\(/, ''));
    return { t: p, n: tam(p), corte: aspas > 0 ? 2 : fim ? 0 : (/[,—–]["”’»)]*$/.test(limpo) ? 1 : 2) };
  });
}

function quebrarLongo(texto, cap) {
  const u = unidadesTexto(texto);
  if (!u.length) return [texto];
  const N = u.length;
  // comprimento do pedaço u[i..j-1]
  const pre = [0];
  u.forEach((x, k) => pre.push(pre[k] + x.n + (k ? 1 : 0)));
  const comp = (i, j) => pre[j] - pre[i] - (i ? 1 : 0);
  const MULTA = [0, 0.15, 0.6];      // preferências de corte
  // melhor[j] = { n: nº de slides, custo } para os primeiros j itens (menos slides primeiro, depois menor custo)
  const melhor = Array(N + 1).fill(null);
  melhor[0] = { n: 0, custo: 0, de: -1 };
  for (let j = 1; j <= N; j++) {
    for (let i = j - 1; i >= 0; i--) {
      const c = comp(i, j);
      if (c > cap && j - i > 1) break;
      if (!melhor[i]) continue;
      const folga = Math.max(0, cap - c) / cap;
      const custo = melhor[i].custo + folga * folga + (j < N ? MULTA[u[j - 1].corte] : 0);
      const cand = { n: melhor[i].n + 1, custo, de: i };
      const b = melhor[j];
      if (!b || cand.n < b.n || (cand.n === b.n && cand.custo < b.custo)) melhor[j] = cand;
    }
  }
  const out = [];
  for (let j = N; j > 0; j = melhor[j].de) out.unshift(u.slice(melhor[j].de, j).map(x => x.t).join(' '));
  return out;
}

// Quem fala, no começo da linha (vem do folheto): "P. …", "T. …" (povo), "L. …", "C. …", "D. …"
const RX_QUEM = /^\s*([PTLCD])\.\s+/;
// A linha é fala do povo? (T. ou "—"/"R."; P./L./C./D. encerram a fala do povo; sem marca, continua como estava)
function povoDaLinha(l, povo) {
  const m = RX_QUEM.exec(l);
  if (m) return m[1] === 'T';
  return /^\s*(—|R\.)/.test(l) ? true : povo;
}

function limitarSlide(s) {
  const L = Math.max(1, +S.config.linhasPorSlide || 4);
  const C = Math.max(10, +S.config.caracteresPorLinha || 40);
  const texto = s.versos
    ? s.versos.map(v => (S.config.numerarVersos ? sobrescrito(v.n) + ' ' : '') + v.t).join(' ')
    : s.texto;
  const tam = l => l.replace(/<\/?[biu]>/gi, '').length;      // negrito/itálico/sublinhado não ocupam espaço
  const visuaisDe = l => Math.max(1, Math.ceil(tam(l) / C));
  // Empacota as linhas em slides de no máximo `lim` linhas visuais. Com `n` (nº de slides desejado), reparte por igual:
  // cada slide recebe mais ou menos (linhas que faltam ÷ slides que faltam).
  const linhasTexto = texto.split('\n');
  const empacotar = (lim, n = 0) => {
    const pedacos = [];
    let atual = [], uso = 0, povo = false;
    let restante = linhasTexto.reduce((s, l) => s + visuaisDe(l), 0), alvo = lim;
    const fechar = () => { if (atual.length) pedacos.push(atual); atual = []; uso = 0; };
    // tamanho do slide que começa agora: o que falta dividido pelos slides que faltam (sem passar do limite)
    const medir = () => { alvo = n ? Math.min(lim, Math.ceil(restante / Math.max(1, n - pedacos.length))) : lim; };
    // quando a fala do povo continua no slide seguinte, repete o "—" para manter o negrito
    const marcar = l => povo && !/^\s*—/.test(l) && !RX_QUEM.test(l) ? '— ' + l : l;
    for (let linha of linhasTexto) {
      const marcada = RX_QUEM.test(linha) || /^\s*—/.test(linha);
      const visuais = visuaisDe(linha);
      if (visuais > lim) {
        fechar();
        if (marcada) povo = povoDaLinha(linha, povo);
        quebrarLongo(linha, lim * C).forEach((p, i) => pedacos.push([i > 0 ? marcar(p) : p]));
        restante -= visuais;
        continue;
      }
      if (marcada) povo = povoDaLinha(linha, povo);
      if (!atual.length) medir();
      else if (uso + visuais > alvo) { fechar(); linha = marcar(linha); medir(); }
      atual.push(linha);
      uso += visuais;
      restante -= visuais;
    }
    fechar();
    return pedacos;
  };
  // Sobra de UMA linha só: fica no slide de cima (ex.: estrofe de 5 linhas com limite 4 = um slide de 5; a letra diminui um
  // pouco). Sobra de mais de uma: equilibra, com o MESMO número de slides e o menor limite possível (4+2 vira 3+3).
  let pedacos = empacotar(L), limMax = L;
  if (pedacos.length > 1) {
    const total = texto.split('\n').reduce((s, l) => s + visuaisDe(l), 0);
    if (total <= (pedacos.length - 1) * L + 1) {
      const p = empacotar(L + 1);
      if (p.length === pedacos.length - 1) { pedacos = p; limMax = L + 1; }
    }
    // mesmo número de slides, repartido por igual (10 linhas: 4+3+3; 13 linhas com sobra de 1: 5+4+4)
    if (pedacos.length > 1) {
      const p = empacotar(limMax, pedacos.length);
      if (p.length === pedacos.length) pedacos = p;
    }
  }
  // resposta do povo curta sozinha num slide ("— Senhor, escutai a nossa prece.") gruda no texto a que responde
  const ehPovo = l => /^\s*(—|T\.\s)/.test(l);
  for (let k = pedacos.length - 1; k > 0; k--) {
    const p = pedacos[k];
    const soResposta = p.every(ehPovo) && p.join(' ').length <= C * 2;
    const anteriorTemPovo = pedacos[k - 1].some(ehPovo) && !pedacos[k - 1].every(ehPovo);
    if (soResposta && !anteriorTemPovo) { pedacos[k - 1].push(...p); pedacos.splice(k, 1); }
  }
  if (pedacos.length <= 1) return [s];
  const img = s.img ? { img: s.img, layout: s.layout, escurecer: s.escurecer } : {};   // slide com imagem: repete a imagem
  return pedacos.map((p, i) => ({ texto: p.join('\n'), rodape: s.rodape, refrao: s.refrao, ...(s.numerado && i === 0 ? { numerado: true } : {}), ...img }));
}

function gerarSlides(item) {
  const slides = gerarSlidesBase(item);
  // a Homilia é sempre um slide só (a letra diminui para caber todas as leituras)
  // (e a "Capa do folheto" também: título, linha e edição juntos)
  if (!S.config.quebraAuto || item.tipo === 'homilia' || item.tipo === 'avisos' || (item.tipo === 'imagem' && item.layout === 'capa') ||
    (item.tipo === 'canto' && !S.config.quebraCantos)) return slides;
  return slides.flatMap(limitarSlide);
}

// Refrão no início e depois de cada estrofe (sem refrão: só as estrofes).
// porEstrofe = o canto começa pela 1ª estrofe (marcação do canto): o refrão só vem depois dela.
function comRefrao(refrao, estrofes, rodape, porEstrofe = false) {
  const r = (refrao || '').trim();
  const out = r && !porEstrofe ? [{ texto: r, rodape, refrao: true }] : [];
  for (const e of dividir(estrofes)) {
    out.push({ texto: e, rodape });
    if (r) out.push({ texto: r, rodape, refrao: true });
  }
  return out;
}

// Referência do Evangelho do roteiro: item de leitura (Liturgia do dia/modelo) ou texto "Evangelho (Mt 21,33-43)" do folheto
function refEvangelho(itens) {
  const ev = itens.find(i => (i.tipo === 'leitura' && i.evangelho) || (i.tipo === 'texto' && /^evangelho/i.test(i.titulo || '')));
  if (!ev) return '';
  return ev.ref || (ev.titulo || '').match(/\(([^)]*\d[^)]*)\)/)?.[1] || '';
}

// Todas as leituras do roteiro, na ordem: "1ª Leitura: Is 5,1-7", "Salmo: Sl 79(80)", "2ª Leitura: Fl 4,6-9", "Evangelho: Mt 21,33-43"
function refsLeituras(itens) {
  const rotulo = t => /primeira|1ª/i.test(t) ? '1ª Leitura' : /segunda|2ª/i.test(t) ? '2ª Leitura' : /evangelho/i.test(t) ? 'Evangelho' : t;
  const saida = [];
  for (const i of itens) {
    let nome = '', ref = '';
    if (i.tipo === 'leitura' && i.ref) { nome = i.evangelho ? 'Evangelho' : rotulo(i.titulo || 'Leitura'); ref = i.ref; }
    else if (i.tipo === 'texto' && /leitura|^evangelho/i.test(i.titulo || '')) {
      ref = (i.titulo.match(/\(([^)]*\d[^)]*)\)/) || [])[1] || '';
      nome = rotulo(i.titulo.replace(/\s*\([^)]*\)/g, '').trim());
    } else if (i.tipo === 'salmo' && i.rotulo !== 'Canto' && i.ref) { nome = 'Salmo'; ref = i.ref; }
    if (ref) saida.push(`${nome}: ${ref.replace(/^Sl\s*/i, 'Sl ')}`);
  }
  return saida;
}

// Põe o item "Homilia" logo depois do Evangelho (se ainda não houver um)
function comHomilia(itens) {
  if (itens.some(i => i.tipo === 'homilia')) return itens;
  const k = itens.findIndex(i => (i.tipo === 'leitura' && i.evangelho) || (i.tipo === 'texto' && /^evangelho/i.test(i.titulo || '')));
  if (k < 0) return itens;
  const novo = itens.slice();
  novo.splice(k + 1, 0, { tipo: 'homilia', titulo: 'Homilia', texto: '', usarCapa: true, mostrarRef: true });
  return novo;
}

function gerarSlidesBase(item) {
  switch (item.tipo) {
    case 'canto': {
      const c = S.cantos.find(c => c.id === item.cantoId);
      const fala = t => dividir(t || '').map(x => ({ texto: x, rodape: item.momento || '' }));
      // Ato Penitencial cantado: o convite e a absolvição do padre continuam em volta do canto
      if (c) return [...fala(item.textoAntes), ...comRefrao(c.refrao, c.letra, c.titulo, c.comecaPor === 'estrofe'), ...fala(item.textoDepois)];
      // sem canto escolhido: o texto rezado do folheto (ex.: Santo tirado da Oração Eucarística);
      // a aclamação do folheto tem refrão ("Aleluia…") antes e depois do versículo
      if (item.refraoRezado) return comRefrao(item.refraoRezado, item.textoRezado, item.momento || '');
      return fala(item.textoRezado);
    }
    case 'texto':
      return dividir(item.texto).map(t => ({ texto: t, rodape: item.titulo || '' }));
    case 'avisos':
      return slidesAvisos(item);          // avisosparoquiais.js
    case 'imagem': {
      // Slide híbrido: a mesma imagem em todos os slides do item; linha em branco separa os textos
      if (!item.imagem) return dividir(item.texto).map(t => ({ texto: t, rodape: item.titulo || '' }));
      const base = { img: item.imagem, layout: item.layout || 'esquerda', escurecer: +(item.escurecer ?? 45), rodape: item.titulo || '' };
      const textos = item.layout === 'so' ? [] : dividir(item.texto);
      return textos.length ? textos.map(t => ({ ...base, texto: t })) : [{ ...base, texto: '' }];
    }
    case 'homilia': {
      // slide calmo para ficar no ar durante toda a homilia: "Homilia" + Evangelho do dia (+ ilustração da capa do folheto)
      const rot = S.roteiro?.itens.includes(item) ? S.roteiro.itens : [];
      const capa = rot.find(i => i.tipo === 'imagem' && i.abertura && i.imagem);
      const linhas = [item.titulo || 'Homilia'];
      if (item.mostrarRef !== false) linhas.push(...refsLeituras(rot));
      if ((item.texto || '').trim()) linhas.push(item.texto.trim());
      const base = { texto: linhas.join('\n'), rodape: '' };
      return item.usarCapa !== false && capa ? [{ ...base, img: capa.imagem, layout: item.layout || 'esquerda', escurecer: 55 }] : [base];
    }
    case 'midia': {
      const ap = apresDe(item);          // vídeo/áudio não têm slides (usam o player)
      return ap ? slidesDaApresentacao(ap) : [];
    }
    case 'ordinario': {
      const p = Ordinario.parte(item.parte);
      return p ? p.slides.map(t => ({ texto: t, rodape: p.titulo })) : [];
    }
    case 'oracao': {
      const o = oracaoDe(item);
      return o ? dividir(o.texto).map(t => ({ texto: t, rodape: o.titulo })) : [];
    }
    case 'preces': {
      // Oração dos Fiéis: a resposta do povo entra no fim do convite e de cada prece (como o refrão no salmo)
      const rodape = item.titulo || 'Oração dos Fiéis';
      const resp = (item.resposta || '').trim().replace(/^—\s*/, '');
      // como no folheto: número da prece em vermelho e "T." (povo) em vermelho na resposta
      const comResposta = t => resp ? `${t}\nT. ${resp}` : t;
      const out = [];
      if ((item.convite || '').trim()) out.push({ texto: comResposta(item.convite.trim()), rodape });
      dividir(item.texto).forEach((p, i) => out.push({ texto: comResposta(`${i + 1}. ${p.replace(/^\s*\d+\s*[.)–-]\s*/, '')}`), rodape, numerado: true }));
      for (const c of dividir(item.conclusao)) out.push({ texto: c, rodape });
      return out;
    }
    case 'prefacio':
    case 'eucaristica': {
      const id = item.tipo === 'prefacio' ? item.prefId : item.oeId;
      const t = Euc.dados.textos[id]?.texto;
      return t ? dividir(t).map(x => ({ texto: x, rodape: nomeEuc(id) })) : [];
    }
    case 'salmo': {
      const rodape = [item.titulo, item.ref].filter(Boolean).join(' — ');
      if (item.rotulo === 'Canto') return comRefrao(item.refrao, item.texto, rodape);   // aclamação e cantos do folheto
      // Salmo responsorial, como no folheto: "T." no refrão e o número de cada estrofe em vermelho.
      // Texto corrido (padrão): os versos de cada estrofe viram um parágrafo só — no telão, verso que não cabe numa
      // linha quebrava duas vezes ("…sua cerca," sozinho); a divisão em slides continua no fim das frases/vírgulas.
      const corrido = S.config.salmoCorrido !== false;
      const juntar = t => corrido ? t.split('\n').map(l => l.trim()).filter(Boolean).join(' ') : t;
      const r = juntar((item.refrao || '').trim()).replace(/^(T\.|R\.|—)\s*/, '');
      const R = r ? { texto: 'T. ' + r, rodape, refrao: true } : null;
      const out = R ? [{ ...R }] : [];
      dividir(item.texto).forEach((e, i) => {
        out.push({ texto: `${i + 1}. ${juntar(e).replace(/^\s*\d+\s*[.)–-]\s*/, '')}`, rodape, numerado: true });
        if (R) out.push({ ...R });
      });
      return out;
    }
    case 'biblia':
    case 'leitura': {
      if (!S.biblia || !item.ref) return [];
      const r = Biblia.resolver(S.biblia, item.ref);
      if (r.erro) return [];
      const slides = versosEmSlides(r);
      if (item.tipo === 'leitura') {
        slides.unshift({ texto: `${item.titulo || 'Leitura'}\n${r.tituloLongo}`, rodape: '' });
        slides.push(item.evangelho
          ? { texto: 'Palavra da Salvação.\n— Glória a vós, Senhor.', rodape: '' }
          : { texto: 'Palavra do Senhor.\n— Graças a Deus.', rodape: '' });
      }
      return slides;
    }
  }
  return [];
}

function abrirItem(item, rIdx = -1, idx = -1) {
  if (S.modoCards) mostrarCards(false);     // saindo da tela de cards dos roteiros
  if (S.modoEuc) mostrarEucaristia(false);  // saindo do catálogo de orações eucarísticas
  if (item !== S.atual?.item) { Apres.editando = false; Apres.sel = -1; }   // abriu outro item (ou pelo roteiro): clique volta a projetar
  S.atual = { item, slides: gerarSlides(item), idx, rIdx };
  renderCabecalho();
  renderSlides();
  renderRoteiroLista();
}

function atualizarSlides() {
  if (!S.atual) return;
  S.atual.slides = gerarSlides(S.atual.item);
  if (S.atual.idx >= S.atual.slides.length) S.atual.idx = -1;
  renderSlides();
}

function projetar(i) {
  const a = S.atual;
  if (!a || i < 0 || i >= a.slides.length) return;
  a.idx = i;
  S.live = { slide: a.slides[i], preto: false, item: a.item, idx: i };
  enviar({ tipo: 'slide', slide: S.live.slide });
  enviar({ tipo: 'preto', on: false });
  renderSlides();
  renderRoteiroLista();
  renderControles();
}

function proximo() {
  const a = S.atual;
  if (!a) return;
  if (a.idx < a.slides.length - 1) return projetar(a.idx + 1);
  // fim do item: deixa o próximo item do roteiro preparado (sem projetar ainda)
  if (a.rIdx >= 0 && a.rIdx < S.roteiro.itens.length - 1) abrirItem(S.roteiro.itens[a.rIdx + 1], a.rIdx + 1);
}

function anterior() {
  const a = S.atual;
  if (!a) return;
  if (a.idx > 0) return projetar(a.idx - 1);
  if (a.rIdx > 0) {
    const i = a.rIdx - 1;
    abrirItem(S.roteiro.itens[i], i);
  }
}

function alternarPreto() {
  S.live.preto = !S.live.preto;
  enviar({ tipo: 'preto', on: S.live.preto });
  renderControles();
}

function limpar() {
  S.live = { slide: null, preto: false, item: null, idx: -1 };
  enviar({ tipo: 'slide', slide: null });
  enviar({ tipo: 'preto', on: false });
  renderSlides();
  renderRoteiroLista();
  renderControles();
}

// Tamanho das letras da tela do operador (zoom do aplicativo; o telão não muda). Guardado neste computador.
const PASSOS_ZOOM = [0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.5, 1.75, 2];
function aplicarZoomApp() {
  const f = PASSOS_ZOOM.includes(+S.config.zoomApp) ? +S.config.zoomApp : 1;
  if (NO_APP) window.chrome.webview.postMessage({ tipo: 'zoom', fator: f });
  else document.documentElement.style.zoom = f;              // no navegador (testes): o mesmo efeito
  const v = $('#zoomAppValor'); if (v) v.textContent = Math.round(f * 100) + '%';
}
function mudarZoomApp(passo) {
  const atual = PASSOS_ZOOM.indexOf(PASSOS_ZOOM.includes(+S.config.zoomApp) ? +S.config.zoomApp : 1);
  const i = passo === 0 ? PASSOS_ZOOM.indexOf(1) : Math.max(0, Math.min(PASSOS_ZOOM.length - 1, atual + passo));
  S.config.zoomApp = PASSOS_ZOOM[i]; salvarConfig();
  aplicarZoomApp();
  toast(`Letras desta tela: ${Math.round(PASSOS_ZOOM[i] * 100)}%`);
}
function ligarZoomApp() {
  aplicarZoomApp();
  document.addEventListener('click', e => { const b = e.target.closest('[data-zoomapp]'); if (b) mudarZoomApp(+b.dataset.zoomapp); });
  addEventListener('keydown', e => {
    if (!e.ctrlKey || e.altKey) return;
    if (e.key === '+' || e.key === '=') { e.preventDefault(); mudarZoomApp(1); }
    else if (e.key === '-') { e.preventDefault(); mudarZoomApp(-1); }
    else if (e.key === '0') { e.preventDefault(); mudarZoomApp(0); }
  });
}

// Divisória entre o centro e a coluna da direita (ao vivo + roteiro): arrastar alarga/estreita; dois cliques volta ao
// padrão. A largura fica guardada neste computador (cada um tem um monitor).
function ligarDivisoria() {
  const div = $('#divisorDireita'), layout = $('.layout');
  const aplicar = px => {
    if (!px) return layout.style.removeProperty('--dir-usuario');
    const max = Math.max(320, Math.min(900, innerWidth * .55));
    layout.style.setProperty('--dir-usuario', Math.round(Math.min(max, Math.max(280, px))) + 'px');
  };
  aplicar(+S.config.larguraDireita || 0);
  div.addEventListener('pointerdown', e => {
    e.preventDefault();
    div.setPointerCapture(e.pointerId); div.classList.add('arrastando');
    const mover = ev => aplicar(innerWidth - ev.clientX);
    const soltar = () => {
      div.classList.remove('arrastando');
      div.removeEventListener('pointermove', mover); div.removeEventListener('pointerup', soltar);
      S.config.larguraDireita = parseInt(layout.style.getPropertyValue('--dir-usuario')) || 0; salvarConfig();
    };
    div.addEventListener('pointermove', mover); div.addEventListener('pointerup', soltar);
  });
  div.addEventListener('dblclick', () => { S.config.larguraDireita = 0; salvarConfig(); aplicar(0); toast('Coluna da direita na largura padrão.'); });

  // Altura da prévia do telão (puxador embaixo dela), em % da altura da janela; também guardada neste computador
  const dh = $('#divisorPrevia'), prev = $('.preview');
  const altura = vh => {
    if (!vh) return layout.style.removeProperty('--previa');
    layout.style.setProperty('--previa', Math.min(45, Math.max(10, vh)).toFixed(1) + 'vh');
  };
  altura(+S.config.alturaPrevia || 0);
  dh.addEventListener('pointerdown', e => {
    e.preventDefault();
    dh.setPointerCapture(e.pointerId); dh.classList.add('arrastando');
    const topo = prev.getBoundingClientRect().top;
    const mover = ev => altura((ev.clientY - topo) / innerHeight * 100);
    const soltar = () => {
      dh.classList.remove('arrastando');
      dh.removeEventListener('pointermove', mover); dh.removeEventListener('pointerup', soltar);
      S.config.alturaPrevia = parseFloat(layout.style.getPropertyValue('--previa')) || 0; salvarConfig();
    };
    dh.addEventListener('pointermove', mover); dh.addEventListener('pointerup', soltar);
  });
  dh.addEventListener('dblclick', () => { S.config.alturaPrevia = 0; salvarConfig(); altura(0); toast('Prévia do telão no tamanho padrão.'); });
}

// Botão "Altar": slide "Todos dirijam seu olhar para o altar" (consagração), com a aparência atual do telão.
// Clicar de novo devolve ao telão o que estava no ar antes.
function alternarAltar() {
  if (S.live.altar) {
    S.live = S.antesAltar || { slide: null, preto: false, item: null, idx: -1 };
    S.antesAltar = null;
  } else {
    S.antesAltar = { ...S.live };
    const texto = (S.config.textoAltar || CONFIG_PADRAO.textoAltar).trim();
    S.live = { slide: { texto, rodape: '', refrao: true }, preto: false, item: null, idx: -1, altar: true };
  }
  enviar({ tipo: 'slide', slide: S.live.slide });
  enviar({ tipo: 'preto', on: S.live.preto });
  renderSlides();
  renderRoteiroLista();
  renderControles();
}

// Texto do Altar mudou (Ajustes ou perfil) com o Altar no telão: troca na hora
function atualizarAltarNoAr() {
  if (!S.live.altar) return;
  S.live.slide = { ...S.live.slide, texto: (S.config.textoAltar || CONFIG_PADRAO.textoAltar).trim() };
  enviar({ tipo: 'slide', slide: S.live.slide });
  renderControles();
}

function projetarMensagem() {
  const t = $('#msgRapida').value.trim();
  if (!t) return;
  S.live = { slide: { texto: t, rodape: '' }, preto: false, item: null, idx: -1 };
  enviar({ tipo: 'slide', slide: S.live.slide });
  enviar({ tipo: 'preto', on: false });
  renderSlides();
  renderControles();
}

function tratarTecla(key) {
  // Numa mídia, Espaço pausa/continua (as setas seguem navegando pelo roteiro)
  if (key === ' ' && ehPlayer(S.atual?.item)) { tocarPausar(midiaDe(S.atual.item), S.atual.item); return true; }
  switch (key) {
    case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': proximo(); return true;
    case 'ArrowLeft': case 'ArrowUp': case 'PageUp': anterior(); return true;
    case 'b': case 'B': alternarPreto(); return true;
    case 'a': case 'A': abrirAviso(); return true;
    case 'l': case 'L': alternarAltar(); return true;
    case 'p': case 'P': alternarPix(); return true;
    case 'Escape': limpar(); return true;
  }
  return false;
}

// =====================================================================
// Renderização — centro
// =====================================================================

function htmlCartao(s) {
  if (s.avisos) {
    const fmt = t => esc(t).replace(/&lt;(\/?)(b|i|u)&gt;/gi, '<$1$2>').replace(/\n/g, ' ');
    return `<b style="color:${s.avisos.corTitulo}">${esc(s.avisos.icone)} ${esc(s.avisos.titulo)}</b>${s.avisos.pag ? ` <small>${s.avisos.pag}</small>` : ''}` +
      (s.avisos.itens.length ? s.avisos.itens.map(t => '<br>• ' + fmt(t)).join('') : '<br><i>(só o título)</i>');
  }
  if (s.versos) return s.versos.map(v => `<sup>${esc(v.n)}</sup>${esc(v.t)}`).join(' ');
  let povo = false;
  const html = esc(s.texto).split('\n').map((l, i) => {
    povo = povoDaLinha(l, povo);
    const m = RX_QUEM.exec(l) || (i === 0 && s.numerado ? /^\s*(\d+)\.\s+/.exec(l) : null);   // P./T./L. ou nº da prece/estrofe
    const quem = m ? `<b class="quem">${m[1]}.</b> ` : '';
    if (m) l = l.slice(m[0].length);
    return quem + (povo ? `<b>${l}</b>` : l);
  }).join('<br>')
    .replace(/&lt;(\/?)(b|i|u)&gt;/gi, '<$1$2>')     // negrito/itálico/sublinhado (botões N I S)
    .replace(/\(([^()<>]{0,40}\d[^()<>]{0,40})\)/g, (_, r) => '(' + r.replace(/ /g, ' ').replace(/-/g, '‑') + ')');
  return s.refrao ? `<b>${html}</b>` : html;
}

function mensagemVazia(item) {
  switch (item.tipo) {
    case 'canto': return 'Escolha um canto acima (ou crie um novo).';
    case 'leitura': case 'biblia': return S.biblia ? 'Informe a referência acima — ex.: Is 55,1-11.' : 'Importe uma Bíblia na aba "Bíblia" para projetar leituras.';
    case 'salmo': return 'Preencha o refrão e as estrofes acima.';
    case 'texto': return 'Digite o texto acima. Deixe uma linha em branco para separar os slides.';
    case 'imagem': return 'Escolha uma imagem acima (ou cole com Ctrl+V, ou arraste para a janela) e, se quiser, escreva o texto.';
  }
  if (item.tipo === 'oracao') return 'Escolha uma oração acima (ou crie uma nova).';
  if (item.tipo === 'preces') return 'Escreva a resposta e as preces acima. Linha em branco separa uma prece da outra; a resposta entra sozinha no fim de cada uma.';
  if (item.tipo === 'prefacio' || item.tipo === 'eucaristica')
    return 'O texto ainda não está cadastrado. Clique em ✎ Texto acima para colar do Missal, ou importe um folheto que traga esta oração.';
  return 'Nada para mostrar.';
}

function renderSlides() {
  const el = $('#slides'), a = S.atual;
  // Bíblia: texto corrido (um versículo por linha) em vez de cartões
  el.classList.toggle('leitura', a?.item.tipo === 'biblia');
  renderNavBiblia();
  el.classList.toggle('modo-player', ehPlayer(a?.item) || ehCamera(a?.item));
  if (!ehCamera(a?.item)) pararPrevia();
  if (!a) { el.innerHTML = ''; return; }
  if (ehPlayer(a.item)) { el.innerHTML = htmlPlayer(a.item); atualizarPlayerUI(); return; }
  if (ehCamera(a.item)) { el.innerHTML = htmlCamera(a.item); iniciarPrevia(cameraDe(a.item)); return; }
  const editAp = ehApresentacao(a.item) && Apres.editando;
  if (!a.slides.length) { el.innerHTML = `<p class="vazio">${esc(mensagemVazia(a.item))}</p>`; return; }
  const vivoAqui = S.live.item === a.item;
  el.innerHTML = a.slides.map((s, i) => `
    <div class="slide ${vivoAqui && S.live.idx === i ? 'vivo' : ''} ${a.idx === i ? 'foco' : ''} ${editAp && Apres.sel === i ? 'editando' : ''} ${s.img ? 'com-img lay-' + s.layout : ''}" data-i="${i}">
      <span class="num">${i + 1}</span>
      ${s.img ? `<div class="mini"><img src="${s.img}" alt="">${s.texto ? `<div class="corpo">${htmlCartao(s)}</div>` : ''}</div>` : `<div class="corpo">${htmlCartao(s)}</div>`}
      ${s.rodape ? `<div class="rod">${esc(s.rodape)}</div>` : ''}
    </div>`).join('');
  const f = el.querySelector('.foco');
  if (f) f.scrollIntoView({ block: 'nearest' });
}

// A aspersão da água substitui o Ato Penitencial nos domingos: no item do Ato Penitencial aparecem também os de Aspersão
const MOMENTOS_IRMAOS = { 'Ato Penitencial': ['Aspersão'] };
const doMomento = (c, momento) => [momento, ...(MOMENTOS_IRMAOS[momento] || [])].includes(c.momento || 'Outros');

function opcoesCantos(momento, sel, soFav = false, rezado = false) {
  let h = rezado ? '<option value="">— rezado (texto do folheto) —</option>' : '<option value="">— escolher canto —</option>';
  const ficha = c => fichaCanto(c) ? ` — ${esc(fichaCanto(c))}` : '';
  const opFav = c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>⭐ ${esc(c.titulo)}${ficha(c)}${c.cifra ? ' 🎸' : ''}</option>`;
  // "⭐ só favoritos": só os favoritos do momento deste item (Santo → só os Santos); o canto já escolhido continua na lista
  if (soFav) {
    const l = S.cantos.filter(c => c.favorito && doMomento(c, momento)).sort(porTitulo);
    h += l.length ? `<optgroup label="⭐ ${esc(momento)}">${l.map(opFav).join('')}</optgroup>`
      : `<option disabled>(nenhum favorito de ${esc(momento)} — desmarque “⭐ só favoritos” para ver o acervo)</option>`;
    const atual = S.cantos.find(c => c.id === sel);
    if (atual && !l.includes(atual)) h += `<optgroup label="Escolhido${atual.favorito ? ` (favorito de ${esc(atual.momento || 'Outros')})` : ' (não é favorito)'}"><option value="${atual.id}" selected>${esc(atual.titulo)}</option></optgroup>`;
    return h;
  }
  // ⭐ favoritos deste momento primeiro (o acervo inteiro continua logo abaixo)
  const fav = S.cantos.filter(c => c.favorito && doMomento(c, momento)).sort(porTitulo);
  if (fav.length) h += `<optgroup label="⭐ Favoritos — ${esc(momento)}">${fav.map(opFav).join('')}</optgroup>`;
  for (const m of [momento, ...MOMENTOS.filter(x => x !== momento)]) {
    const lista = S.cantos.filter(c => (c.momento || 'Outros') === m).sort(porTitulo);
    if (lista.length) h += `<optgroup label="${esc(m)}">${lista.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.titulo)}${ficha(c)}</option>`).join('')}</optgroup>`;
  }
  return h;
}

function opcoesOrdinario(sel) {
  return Ordinario.grupos.map(g => `<optgroup label="${esc(g.grupo)}">${g.partes.map(p =>
    `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.titulo)}</option>`).join('')}</optgroup>`).join('');
}

function renderCabecalho() {
  const el = $('#itemCab'), a = S.atual;
  $('.centro').classList.toggle('modo-biblia', a?.item.tipo === 'biblia' && !!S.biblia);
  if (!a) {
    el.innerHTML = `<div class="boas-vindas">
      <img src="img/logo.svg" alt="MiguelAngelus" class="logo-boas-vindas">
      <p>1. Na coluna da esquerda ficam os módulos: <b>Cantos</b>, <b>Bíblia</b>, <b>Orações</b>, <b>Vídeos</b>, <b>Áudios</b>, <b>Apresentações</b>, <b>Câmeras</b> e <b>Calendário</b>.</p>
      <p>2. No <b>Roteiro da Missa</b> (à direita), clique em <b>Folheto PDF</b> ou escolha um modelo e preencha os cantos e as leituras.</p>
      <p>3. Clique em <b>Abrir projeção</b>, leve a janela para o telão e clique num slide para projetar.</p>
    </div>`;
    return;
  }
  const it = a.item, noRoteiro = a.rIdx >= 0;
  const btnAdd = noRoteiro ? '' : '<button data-cmd="addRoteiro" class="primario">+ Adicionar ao roteiro</button>';
  let h = '';
  switch (it.tipo) {
    case 'canto': {
      const c = S.cantos.find(c => c.id === it.cantoId);
      h = noRoteiro
        ? `<div class="cab-linha"><span class="tag t-canto">Canto</span>
             <select data-campo="momento" class="estreito">${MOMENTOS.map(m => `<option ${m === it.momento ? 'selected' : ''}>${m}</option>`).join('')}</select>
             <select data-campo="cantoId" title="${it.textoRezado ? 'Deixe “rezado” para usar o texto do folheto, ou escolha um canto' : ''}">${opcoesCantos(it.momento, it.cantoId, soFavoritosNoRoteiro(), !!it.textoRezado)}</select>
             ${temFavoritos() ? `<label class="check" title="A lista mostra só os cantos favoritos, separados por momento"><input type="checkbox" data-sofav ${soFavoritosNoRoteiro() ? 'checked' : ''}> ⭐ só favoritos</label>` : ''}
             ${c ? `<button data-cmd="favoritarCanto" class="estrela-bt ${c.favorito ? 'on' : ''}" title="${c.favorito ? 'Tirar dos favoritos' : 'Marcar este canto como favorito'}">${c.favorito ? '★' : '☆'}</button>` : ''}
             <button data-cmd="editarCanto" ${c ? '' : 'disabled'}>Editar</button>
             <button data-cmd="novoCanto">Novo canto</button></div>
           ${htmlEscolhaCifra(it, c)}`
        : `<div class="cab-linha"><span class="tag t-canto">${esc(c?.momento || 'Canto')}</span>
             <h2>${esc(c?.titulo || '')}</h2><span class="sutil">${esc(c?.autor || '')}</span>
             <span class="espaco"></span><button data-cmd="editarCanto">Editar</button>${btnAdd}</div>`;
      break;
    }
    case 'leitura':
      h = `<div class="cab-linha"><span class="tag t-leitura">Leitura</span>
             <input data-campo="titulo" class="estreito" value="${esc(it.titulo)}" placeholder="1ª Leitura">
             <input data-campo="ref" value="${esc(it.ref)}" placeholder="Referência — ex.: Is 55,1-11">
             <label class="check"><input type="checkbox" data-campo="evangelho" ${it.evangelho ? 'checked' : ''}> Evangelho</label></div>
           <div id="refStatus" class="status"></div>`;
      break;
    case 'biblia': {
      const r = S.biblia ? Biblia.resolver(S.biblia, it.ref) : null;
      const capInteiro = r && !r.erro && !/[,:]/.test(it.ref) && r.versos.every(v => v.c === r.versos[0].c);
      const titulo = !r || r.erro ? it.ref : capInteiro ? `${r.livro.nome} — Capítulo ${r.versos[0].c}` : r.tituloLongo;
      h = `<div class="cab-linha"><h2 class="titulo-biblia">${esc(titulo)}</h2><span class="espaco"></span>${btnAdd}</div>`;
      break;
    }
    case 'salmo':
      h = `<div class="cab-linha"><span class="tag t-salmo">${esc(it.rotulo || 'Salmo')}</span>
             <input data-campo="titulo" class="estreito" value="${esc(it.titulo)}" placeholder="Salmo Responsorial">
             <input data-campo="ref" value="${esc(it.ref)}" placeholder="Referência — ex.: Sl 22(23)"></div>
           <div class="cab-grade">
             <label class="campo">Refrão<textarea data-campo="refrao" rows="4" placeholder="Digite o refrão — ele é repetido entre as estrofes">${esc(it.refrao)}</textarea></label>
             <label class="campo">Estrofes (linha em branco entre elas)<textarea data-campo="texto" rows="4">${esc(it.texto)}</textarea></label>
           </div>`;
      break;
    case 'texto':
      h = `<div class="cab-linha"><span class="tag t-texto">Texto</span>
             <input data-campo="titulo" value="${esc(it.titulo)}" placeholder="Título (aparece no rodapé)"></div>
           <textarea data-campo="texto" rows="5" placeholder="Digite o texto. Deixe uma linha em branco para separar os slides.">${esc(it.texto)}</textarea>`;
      break;
    case 'homilia': {
      const temCapa = (S.roteiro?.itens || []).some(i => i.tipo === 'imagem' && i.abertura && i.imagem);
      const ref = refsLeituras(S.roteiro?.itens || []).map(x => x.split(': ')[1]).join(' · ');
      h = `<div class="cab-linha"><span class="tag t-homilia">Homilia</span>
             <input data-campo="titulo" class="estreito" value="${esc(it.titulo)}" placeholder="Homilia">
             <input data-campo="texto" value="${esc(it.texto)}" placeholder="Linha extra (opcional) — ex.: Pe. Fulano">
             <label class="check"><input type="checkbox" data-campo="mostrarRef" ${it.mostrarRef !== false ? 'checked' : ''}> Leituras do dia${ref ? ` (${esc(ref)})` : ''}</label>
             <label class="check" ${temCapa ? '' : 'title="Este roteiro não tem a Abertura com a ilustração do folheto"'}><input type="checkbox" data-campo="usarCapa" ${it.usarCapa !== false ? 'checked' : ''} ${temCapa ? '' : 'disabled'}> Ilustração da capa</label>
             ${temCapa && it.usarCapa !== false ? `<select data-campo="layout" class="estreito">${LAYOUTS_IMG.filter(([v]) => v !== 'so').map(([v, n]) => `<option value="${v}" ${v === (it.layout || 'esquerda') ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''}</div>
           <p class="sutil pequeno" style="margin:0">Slide para deixar no telão durante a homilia. Ele fica parado, e você volta aos próximos itens com → quando acabar.</p>`;
      break;
    }
    case 'imagem': {
      const lay = it.layout || 'esquerda';
      h = `<div class="cab-linha"><span class="tag t-imagem">Imagem</span>
             <input data-campo="titulo" class="estreito" value="${esc(it.titulo)}" placeholder="Título (rodapé)">
             <select data-campo="layout" class="estreito">${LAYOUTS_IMG.map(([v, n]) => `<option value="${v}" ${v === lay ? 'selected' : ''}>${n}</option>`).join('')}</select>
             <button data-cmd="escolherImg">🖼 ${it.imagem ? 'Trocar imagem…' : 'Escolher imagem…'}</button>
             ${it.imagem ? '<button data-cmd="tirarImg" class="perigo">Remover imagem</button>' : ''}
             ${lay === 'fundo' ? `<label class="check" title="Escurece a imagem para o texto aparecer bem">Escurecer <input type="range" data-campo="escurecer" min="0" max="85" value="${+(it.escurecer ?? 45)}" style="width:110px"></label>` : ''}</div>
           <div class="cab-img">
             <div class="cab-img-prev" data-cmd="escolherImg" title="Clique para escolher; também dá para colar (Ctrl+V) ou arrastar">
               ${it.imagem ? `<img src="${it.imagem}" alt="">` : '<span>Sem imagem.<br>Clique, cole (Ctrl+V)<br>ou arraste aqui.</span>'}</div>
             <textarea data-campo="texto" rows="5" ${lay === 'so' ? 'disabled placeholder="Só a imagem: sem texto."' : 'placeholder="Texto que aparece junto com a imagem. Linha em branco = outro slide (com a mesma imagem)."'}>${esc(it.texto)}</textarea>
           </div>`;
      break;
    }
    case 'ordinario': {
      const p = Ordinario.parte(it.parte);
      h = noRoteiro
        ? `<div class="cab-linha"><span class="tag t-ordinario">Missa</span><select data-campo="parte">${opcoesOrdinario(it.parte)}</select></div>`
        : `<div class="cab-linha"><span class="tag t-ordinario">Missa</span><h2>${esc(p?.titulo)}</h2><span class="espaco"></span>${btnAdd}</div>`;
      break;
    }
    case 'oracao': {
      const o = oracaoDe(it);
      h = noRoteiro
        ? `<div class="cab-linha"><span class="tag t-oracao">Oração</span>
             <select data-campo="oracaoId">${opcoesOracoes(it.oracaoId)}</select>
             <button data-cmd="editarOracao" ${o ? '' : 'disabled'}>Editar</button>
             <button data-cmd="novaOracao">Nova oração</button></div>`
        : `<div class="cab-linha"><span class="tag t-oracao">${esc(o?.categoria || 'Oração')}</span><h2>${esc(o?.titulo || '')}</h2>
             <span class="espaco"></span><button data-cmd="editarOracao">Editar</button>${btnAdd}</div>`;
      break;
    }
    case 'preces':
      h = `<div class="cab-linha"><span class="tag t-texto">Preces</span>
             <input data-campo="titulo" class="estreito" value="${esc(it.titulo)}" placeholder="Oração dos Fiéis">
             <input data-campo="resposta" value="${esc(it.resposta)}" placeholder="Resposta do povo — ex.: Senhor, escutai a nossa prece."></div>
           <div class="cab-grade cab-preces">
             <label class="campo">Convite (padre)<textarea data-campo="convite" rows="3" placeholder="Irmãos e irmãs, elevemos nossas preces, dizendo:">${esc(it.convite)}</textarea></label>
             <label class="campo">Preces (linha em branco entre elas — a resposta entra sozinha no fim)<textarea data-campo="texto" rows="3">${esc(it.texto)}</textarea></label>
             <label class="campo">Conclusão (padre)<textarea data-campo="conclusao" rows="3" placeholder="Ó Deus… Por Cristo, nosso Senhor.&#10;— Amém.">${esc(it.conclusao)}</textarea></label>
           </div>`;
      break;
    case 'avisos': {
      const { iso } = quandoDoItem(it);
      const n = it.programados === false ? 0 : AvPar.lista.filter(a => vigente(a, iso, quandoDoItem(it).localId)).length;
      h = `<div class="cab-linha"><span class="tag t-avisos">Avisos</span>
             <input data-campo="titulo" class="estreito" value="${esc(it.titulo)}" placeholder="${esc(estiloAvisos().titulo)}" title="Título da tela (vazio: o da paróquia)">
             <label class="check" title="Os avisos programados em Ferramentas → Avisos paroquiais, válidos em ${dataBR(iso)}"><input type="checkbox" data-campo="programados" ${it.programados !== false ? 'checked' : ''}> Avisos programados (${n} em ${dataBR(iso)})</label>
             <span class="espaco"></span><button data-cmd="avisosParoquiais">📢 Avisos paroquiais…</button>${btnAdd}</div>
           <textarea data-campo="extras" rows="3" placeholder="Avisos só desta Missa (opcional). Linha em branco separa um aviso do outro.">${esc(it.extras)}</textarea>`;
      break;
    }
    case 'prefacio':
    case 'eucaristica': {
      const pref = it.tipo === 'prefacio', id = pref ? it.prefId : it.oeId;
      h = noRoteiro
        ? `<div class="cab-linha"><span class="tag t-oracao">${pref ? 'Prefácio' : 'Or. Eucarística'}</span>
             <select data-campo="${pref ? 'prefId' : 'oeId'}">${opcoesEuc(pref ? 'pref' : 'oe', id)}</select>
             <button data-cmd="editarEuc">✎ Texto</button><button data-cmd="catalogoEuc" title="Escolher a combinação no catálogo">Catálogo…</button></div>`
        : `<div class="cab-linha"><span class="tag t-oracao">${pref ? 'Prefácio' : 'Or. Eucarística'}</span><h2>${esc(nomeEuc(id))}</h2>
             <span class="espaco"></span><button data-cmd="editarEuc">✎ Texto</button><button data-cmd="catalogoEuc">Voltar ao catálogo</button></div>`;
      break;
    }
    case 'midia': {
      if (apresDe(it)) { h = htmlCabApresentacao(it, noRoteiro, btnAdd); break; }
      if (cameraDe(it)) {
        h = `<div class="cab-linha"><span class="tag t-midia">Câmera</span>
          ${noRoteiro ? `<select data-campo="midiaId">${opcoesMidias(it.midiaId)}</select>` : `<h2>${esc(cameraDe(it).nome)}</h2><span class="espaco"></span>${btnAdd}`}</div>`;
        break;
      }
      const m = midiaDe(it);
      h = noRoteiro
        ? `<div class="cab-linha"><span class="tag t-midia">Mídia</span><select data-campo="midiaId">${opcoesMidias(it.midiaId)}</select></div>`
        : `<div class="cab-linha"><span class="tag t-midia">${m?.tipo === 'audio' ? 'Áudio' : 'Vídeo'}</span><h2>${esc(m?.nome || '')}</h2><span class="espaco"></span>${btnAdd}</div>`;
      break;
    }
  }
  el.innerHTML = h;
  atualizarStatusRef();
}

function atualizarStatusRef() {
  const st = $('#refStatus');
  if (!st || !S.atual) return;
  const ref = S.atual.item.ref;
  if (!S.biblia) { st.className = 'status erro'; st.textContent = 'Importe uma Bíblia na aba "Bíblia" para projetar as leituras.'; return; }
  if (!ref) { st.className = 'status'; st.textContent = ''; return; }
  const r = Biblia.resolver(S.biblia, ref);
  st.className = 'status ' + (r.erro ? 'erro' : 'ok');
  st.textContent = r.erro || `${r.tituloLongo} · ${r.versos.length} versículo(s)`;
}

// =====================================================================
// Roteiro
// =====================================================================

function resumoItem(it) {
  switch (it.tipo) {
    case 'canto': {
      const c = S.cantos.find(c => c.id === it.cantoId);
      return { rot: it.momento || 'Canto', tit: c ? c.titulo : it.textoRezado ? `${it.momento || 'Canto'} (rezado)` : 'escolher canto…', vazio: !c && !it.textoRezado };
    }
    case 'leitura': return { rot: it.titulo || 'Leitura', tit: it.ref || 'informar referência…', vazio: !it.ref };
    case 'salmo': {
      const tit = it.rotulo === 'Canto' ? it.titulo : it.ref || (it.refrao || '').split('\n')[0];
      return { rot: it.rotulo || 'Salmo', tit: tit || 'preencher salmo…', vazio: !it.refrao && !it.texto };
    }
    case 'texto': return { rot: 'Texto', tit: it.titulo || (it.texto || '').split('\n')[0] || 'texto livre…', vazio: !it.texto };
    case 'homilia': return { rot: 'Homilia', tit: [it.titulo || 'Homilia', refEvangelho(S.roteiro?.itens || [])].filter(Boolean).join(' · '), vazio: false };
    case 'imagem': return { rot: it.abertura ? 'Abertura' : 'Imagem', tit: it.titulo || (it.texto || '').split('\n')[0] || (it.imagem ? 'imagem' : 'escolher imagem…'), vazio: !it.imagem };
    case 'ordinario': return { rot: 'Missa', tit: Ordinario.parte(it.parte)?.titulo || '?', vazio: false };
    case 'oracao': {
      const o = oracaoDe(it);
      return { rot: 'Oração', tit: o ? o.titulo : 'escolher oração…', vazio: !o };
    }
    case 'preces': return { rot: 'Preces', tit: it.titulo || 'Oração dos Fiéis', vazio: !(it.texto || '').trim() };
    case 'avisos': {
      const n = avisosDoItem(it).length;
      return { rot: 'Avisos', tit: `${it.titulo || estiloAvisos().titulo} · ${n ? n + ' aviso(s)' : 'só o título'}`, vazio: false };
    }
    case 'prefacio': return { rot: 'Prefácio', tit: nomeEuc(it.prefId), vazio: !temTexto(it.prefId) };
    case 'eucaristica': return { rot: 'Or. Eucarística', tit: nomeEuc(it.oeId), vazio: !temTexto(it.oeId) };
    case 'midia': {
      const m = midiaDe(it);
      if (m?.tipo === 'apresentacao') return { rot: 'Apresentação', tit: m.nome, vazio: !m.slides.length };
      if (m?.tipo === 'camera') return { rot: 'Câmera', tit: m.nome, vazio: false };
      return { rot: m?.tipo === 'audio' ? 'Áudio' : m ? 'Vídeo' : 'Mídia', tit: m ? m.nome : 'escolher vídeo ou áudio…', vazio: !m };
    }
  }
  return { rot: it.tipo, tit: '', vazio: true };
}

function renderRoteiroCab() {
  renderPreparacao();
  renderCardsRoteiros();
}

function renderRoteiroLista() {
  const el = $('#roteiroItens');
  const itens = S.roteiro.itens;
  if (!itens.length) {
    el.innerHTML = '<p class="vazio">Roteiro vazio. Use <b>Folheto PDF</b>, <b>Aplicar modelo</b> ou adicione itens abaixo.</p>';
    return;
  }
  el.innerHTML = itens.map((it, i) => {
    const r = resumoItem(it);
    const sel = S.atual && S.atual.rIdx === i;
    return `<div class="it ${sel ? 'sel' : ''} ${r.vazio ? 'pendente' : ''}" data-i="${i}">
      <span class="tag t-${it.tipo}">${esc(r.rot)}</span>
      <span class="tit">${esc(r.tit)}</span>
      ${S.live.item === it ? '<span class="pt-vivo" title="No ar"></span>' : ''}
      <span class="acoes">
        <button data-acao="subir" title="Subir">↑</button>
        <button data-acao="descer" title="Descer">↓</button>
        <button data-acao="remover" title="Remover">✕</button>
      </span></div>`;
  }).join('');
  const s = el.querySelector('.sel');
  if (s) s.scrollIntoView({ block: 'nearest' });
  if (S.modoCards) renderCardsRoteiros();   // mantém "a preencher" dos cards em dia
}

function trocarRoteiro(r) {
  S.roteiro = r;
  S.config.roteiroAtivo = r.id;
  salvarConfig();
  if (S.atual && S.atual.rIdx >= 0) S.atual = null;
  renderRoteiroCab(); renderRoteiroLista(); renderCabecalho(); renderSlides();
  renderLocalRoteiro();
  if (typeof baseHistorico === 'function') baseHistorico(r);
  aoTrocarCapela();   // tema escolhido na hora vale só para o roteiro em que foi escolhido
  enviarLayout();     // a apresentação do telão segue o local do roteiro
}

function adicionarAoRoteiro(item) {
  const itens = S.roteiro.itens;
  const pos = S.atual && S.atual.rIdx >= 0 ? S.atual.rIdx + 1 : itens.length;
  itens.splice(pos, 0, item);
  salvarRoteiro();
  return pos;
}

const LAYOUTS_IMG = [
  ['esquerda', 'Imagem à esquerda'],
  ['direita', 'Imagem à direita'],
  ['acima', 'Imagem em cima'],
  ['fundo', 'Imagem de fundo'],
  ['so', 'Só a imagem'],
  ['capa', 'Capa do folheto'],     // fundo branco; 1ª linha = título (vermelho), as outras em azul; linha com "Ano A – nº…" ou data = em cima, pequena
];

// Coloca a imagem no item "Imagem + texto" aberto (escolhida, colada ou arrastada)
async function definirImagemDoItem(arquivo) {
  const it = S.atual?.item;
  if (!it || it.tipo !== 'imagem' || !arquivo) return;
  try {
    it.imagem = await reduzirImagem(arquivo, 1920, 0.88);
  } catch (e) { return toast(e.message); }
  if (S.atual.rIdx >= 0) { salvarRoteiro(); renderRoteiroLista(); }
  atualizarSlides();
  renderCabecalho();
}

function novoItem(tipo) {
  const base = { id: uid(), tipo };
  switch (tipo) {
    case 'canto': return { ...base, momento: 'Outros', cantoId: '' };
    case 'leitura': return { ...base, titulo: 'Leitura', ref: '', evangelho: false };
    case 'salmo': return { ...base, titulo: 'Salmo Responsorial', ref: '', refrao: '', texto: '' };
    case 'texto': return { ...base, titulo: '', texto: '' };
    case 'imagem': return { ...base, titulo: '', imagem: '', layout: 'esquerda', escurecer: 45, texto: '' };
    case 'homilia': return { ...base, titulo: 'Homilia', texto: '', usarCapa: true, mostrarRef: true };
    case 'ordinario': return { ...base, parte: 'saudacao' };
    case 'midia': return { ...base, midiaId: '', loop: false };
    case 'oracao': return { ...base, oracaoId: '' };
    case 'preces': return { ...base, titulo: 'Oração dos Fiéis', resposta: 'Senhor, escutai a nossa prece.', convite: '', texto: '', conclusao: '' };
    case 'avisos': return { ...base, titulo: '', extras: '', programados: true };
  }
}

// Item avulso (aberto pelas abas) → item de roteiro
function itemParaRoteiro(it) {
  switch (it.tipo) {
    case 'biblia': return { id: uid(), tipo: 'leitura', titulo: 'Leitura', ref: it.ref, evangelho: false };
    case 'canto': {
      const c = S.cantos.find(c => c.id === it.cantoId);
      return { id: uid(), tipo: 'canto', momento: c?.momento || 'Outros', cantoId: it.cantoId };
    }
    default: return { ...structuredClone(it), id: uid() };
  }
}

// =====================================================================
// Cantos
// =====================================================================

function renderCantos() {
  const termo = semAcento($('#buscaCanto').value.trim());
  const mom = $('#filtroMomento').value;
  // Visão: ⭐ Favoritos (os que a paróquia usa) ou Acervo completo (fonte de consulta) — cifras.js
  const visao = visaoCantos(), nFav = S.cantos.filter(c => c.favorito).length;
  $('#visaoCantos').innerHTML = nFav ? `<button data-visao="favoritos" class="${visao === 'favoritos' ? 'sel' : ''}">⭐ Favoritos <span class="n">${nFav}</span></button>` +
    `<button data-visao="acervo" class="${visao === 'acervo' ? 'sel' : ''}">📚 Acervo completo <span class="n">${S.cantos.length}</span></button>`
    : '<span class="sutil pequeno">Dica: marque ☆ nos cantos com cifra que a paróquia usa — eles ficam em "Favoritos", fáceis de achar.</span>';
  const soFav = visao === 'favoritos';
  const semCifra = soFav ? favoritosSemCifra().length : 0;
  if (!semCifra) S.soFavSemCifra = false;
  if (semCifra) $('#visaoCantos').innerHTML += `<button data-semcifra class="aviso-semcifra ${S.soFavSemCifra ? 'sel' : ''}"
    title="Favoritos sem cifra: cole a cifra ou tire dos favoritos (só se favorita canto com cifra)">⚠ ${semCifra} sem cifra</button>`;
  const lista = S.cantos
    .filter(c => !soFav || c.favorito)
    .filter(c => !S.soFavSemCifra || !temCifra(c))
    .filter(c => !mom || (c.momento || 'Outros') === mom)
    .filter(c => !termo || (/^\d+[a-z]?$/.test(termo.replace(/^n[ºo°]?\s*/, '').replace('-', ''))
      ? String(c.numero || '').replace('-', '').toLowerCase() === termo.replace(/^n[ºo°]?\s*/, '').replace('-', '')   // "150" ou "nº 150" = número do cancioneiro
      : semAcento(`${c.titulo} ${c.autor} ${c.cd || ''} ${c.refrao || ''} ${c.letra}`).includes(termo)))
    .sort(porTitulo);
  const el = $('#listaCantos');
  const bruto = $('#buscaCanto').value.trim();
  // Com algo digitado: oferece buscar na internet e cadastrar
  const web = bruto ? `<div class="busca-web">
      <p>${lista.length ? 'Não é esse?' : `Nenhum canto "${esc(bruto)}" no seu banco.`}</p>
      <button data-cmd="buscarLC" title="Pesquisa só no site Letras Católicas (letrascatolicas.com.br)">🔎 Buscar no Letras Católicas</button>
      <button data-cmd="buscarWeb">🌐 Buscar na internet</button>
      <button data-cmd="cadastrar" class="primario">Cadastrar "${esc(bruto.length > 30 ? bruto.slice(0, 30) + '…' : bruto)}"</button>
    </div>` : '';
  if (!S.cantos.length && !bruto) { el.innerHTML = '<p class="vazio">Nenhum canto ainda. Digite o nome de um canto acima, clique em <b>Novo</b> ou importe um folheto.</p>'; return; }
  const selId = S.atual && S.atual.rIdx < 0 && S.atual.item.tipo === 'canto' ? S.atual.item.cantoId : null;
  const linha = (c, tag = true) => `<div class="it ${c.id === selId ? 'sel' : ''}" data-id="${c.id}" title="Duplo clique para editar">
      <button class="estrela ${c.favorito ? 'on' : ''} ${temCifra(c) ? '' : 'sem-cifra'}" data-fav="${c.id}" title="${c.favorito ? 'Tirar dos favoritos' + (temCifra(c) ? '' : ' (este favorito está sem cifra)') : temCifra(c) ? 'Marcar como favorito' : 'Sem cifra: cadastre a cifra para favoritar'}">${c.favorito ? '★' : '☆'}</button>
      ${tag ? `<span class="tag t-canto">${esc(c.momento || 'Outros')}</span>` : ''}<span class="tit">${esc(c.titulo)}${fichaCanto(c) ? `<small class="ficha">${esc(fichaCanto(c))}</small>` : ''}</span>${c.cifra ? '<span class="sutil pequeno" title="Tem cifra para os músicos">🎸</span>' : ''}${c.numero ? `<span class="sutil pequeno" title="${esc(c.fonte || '')}">nº ${esc(c.numero)}</span>` : ''}</div>`;
  // Nos favoritos, a busca mostra também o que há no acervo (abaixo)
  const doAcervo = soFav && termo ? S.cantos.filter(c => !c.favorito && (!mom || (c.momento || 'Outros') === mom) &&
    semAcento(`${c.titulo} ${c.autor} ${c.cd || ''} ${c.refrao || ''} ${c.letra}`).includes(termo)).sort(porTitulo) : [];
  if (termo || mom) {
    el.innerHTML = lista.map(c => linha(c)).join('') +
      (doAcervo.length ? `<div class="sep-acervo">📚 No acervo completo (${doAcervo.length})</div>` + doAcervo.slice(0, 80).map(c => linha(c)).join('') : '') +
      (soFav && !lista.length && !doAcervo.length && !bruto ? '<p class="vazio">Nenhum favorito neste momento da Missa.</p>' : '') + web;
    return;
  }
  // Sem busca nem filtro: uma pasta por momento da Missa (começam fechadas; clique abre/fecha)
  el.innerHTML = [...MOMENTOS, ...new Set(lista.map(c => c.momento || 'Outros'))].filter((m, i, a) => a.indexOf(m) === i).map(m => {
    const l = lista.filter(c => (c.momento || 'Outros') === m);
    if (!l.length) return '';
    const chave = (soFav ? 'fav:' : 'canto:') + m;        // nos favoritos, as pastas começam abertas
    const f = Recolher.fechado(chave, !soFav);
    return `<button class="pasta" data-pasta="${esc(m)}" data-chave="${esc(chave)}"><span class="seta">${f ? '▸' : '▾'}</span>📁 ${esc(m)}<span class="n">${l.length}</span></button>
      ${f ? '' : `<div class="pasta-itens">${l.map(c => linha(c, false)).join('')}</div>`}`;
  }).join('');
}

// Organiza uma letra colada da internet ou do Holyrics: tira cifras, acha refrão e autor
function organizarColado(bruto) {
  const norm = s => semAcento(s).replace(/[^a-z0-9]+/g, ' ').trim();
  const acorde = /^[A-G][#b]?(?:m|M|maj|min|sus|dim|aug|add|°|º)?\d*(?:\([^)]*\))?(?:\/[A-G][#b]?)?$/;
  const ehCifra = t => { const p = t.split(/\s+/); return p.every(x => acorde.test(x) || /^[|\-–.x:]+$/i.test(x)); };
  let autor = '';
  const linhas = [];
  for (const l of (bruto || '').replace(/\r/g, '').split('\n')) {
    const t = l.trim();
    const m = t.match(/^(?:composi[cç][aã]o|compositor(?:es)?|autor(?:es|a)?|letra e m[uú]sica|letra)\s*(?:de|:|-)\s*(.+)$/i);
    if (m) { autor = autor || m[1].trim(); continue; }
    if (t && ehCifra(t)) continue;
    // marcações de cifra: "Intro: G D", "[Solo]", "Tom: G", "Ponte"
    if (/^\[?(intro|introdu[cç][aã]o|solo|ponte|tom|riff|dedilhado)\]?\s*([:\-].*)?$/i.test(t)) continue;
    linhas.push(l.replace(/\s+$/, ''));
  }
  const marca = /^\s*(?:\[?refr[aã]o\]?|r\s*[.:]|coro)\s*[:.\-–]?\s*/i;
  let refrao = '';
  const estrofes = [];
  for (const b of linhas.join('\n').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)) {
    if (marca.test(b)) {
      const t = b.replace(marca, '').trim();
      if (t && !refrao) refrao = t;
      else if (t && norm(t) !== norm(refrao)) estrofes.push(t);
      continue;   // marcação sozinha ("Refrão") = repetir o refrão, que já é automático
    }
    estrofes.push(b);
  }
  if (!refrao) {                       // sem marcação: o bloco que se repete é o refrão
    const cont = new Map();
    for (const b of estrofes) cont.set(norm(b), (cont.get(norm(b)) || 0) + 1);
    refrao = estrofes.find(b => cont.get(norm(b)) > 1) || '';
  }
  const kR = refrao ? norm(refrao) : null;
  const vistas = new Set();
  const letra = estrofes
    .filter(b => norm(b) !== kR && !vistas.has(norm(b)) && vistas.add(norm(b)))
    .map(b => b.replace(/^\d+[.)]\s*/, ''));
  // Primeiro bloco com uma linha curta costuma ser o título
  let titulo = '';
  if (letra.length > 1 && !letra[0].includes('\n') && letra[0].length <= 60) titulo = letra.shift();
  // o canto começa pelo refrão ou pela 1ª estrofe? (o primeiro bloco depois do título)
  let comecaPor = '';
  if (refrao) {
    const blocos = linhas.join('\n').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
      .filter(b => !(titulo && norm(b) === norm(titulo)));
    const p = blocos[0] || '';
    comecaPor = marca.test(p) || norm(p) === kR ? 'refrao' : 'estrofe';
  }
  return { titulo, autor, refrao, letra: letra.join('\n\n'), comecaPor };
}

let aoSalvarCanto = null;

function abrirEditorCanto(canto, momento, aoSalvar) {
  const f = $('#formCanto');
  const c = canto || { id: '', titulo: '', autor: '', momento: momento || 'Outros', refrao: '', letra: '' };
  f.dataset.id = c.id;
  f.titulo.value = c.titulo;
  f.autor.value = c.autor || '';
  f.momento.value = c.momento || 'Outros';
  f.refrao.value = c.refrao || '';
  f.letra.value = c.letra || '';
  f.comecaPor.value = c.comecaPor === 'estrofe' ? 'estrofe' : 'refrao';
  f.favorito.checked = !!c.favorito;
  f.cd.value = c.cd || '';
  f.tom.value = c.tom || '';
  f.cifra.value = c.cifra || '';
  travarFavoritoSemCifra();
  $('#cxCifra').open = !!c.cifra;
  $('#btnExcluirCanto').hidden = !c.id;
  aoSalvarCanto = aoSalvar || null;
  const dlg = $('#dlgCanto');
  dlg.returnValue = '';
  dlg.showModal();
  f.titulo.focus();
}

// ⭐ no editor: só com cifra. Um favorito antigo sem cifra continua marcado (dá para desmarcar), mas não se marca de novo.
function travarFavoritoSemCifra() {
  const f = $('#formCanto'), sem = !f.cifra.value.trim();
  if (sem && !f.favorito.checked) f.favorito.disabled = true;
  else f.favorito.disabled = false;
  f.favorito.closest('label').title = sem ? 'Cole a cifra (em "🎸 Cifra para os músicos") para poder favoritar'
    : 'Os favoritos aparecem primeiro na aba Cantos e na escolha do canto do roteiro';
}

async function salvarCantoDoEditor() {
  const f = $('#formCanto');
  const antigo = S.cantos.find(x => x.id === f.dataset.id) || {};
  if (f.favorito.checked && !f.cifra.value.trim() && !antigo.favorito) f.favorito.checked = false;
  const c = {
    ...antigo,                      // mantém o que o editor não mostra (nº e fonte do cancioneiro, origem…)
    id: f.dataset.id || uid(),
    titulo: f.titulo.value.trim(),
    autor: f.autor.value.trim(),
    momento: f.momento.value,
    refrao: f.refrao.value.replace(/\r/g, '').trim(),
    letra: f.letra.value.replace(/\r/g, '').trim(),
    comecaPor: f.comecaPor.value === 'estrofe' ? 'estrofe' : '',      // '' = começa pelo refrão (o padrão)
    favorito: f.favorito.checked,
    cd: f.cd.value.trim(),
    tom: f.tom.value.trim(),
    cifra: f.cifra.value.replace(/\r/g, '').replace(/\s+$/, ''),
  };
  await DB.salvar('cantos', c);
  const i = S.cantos.findIndex(x => x.id === c.id);
  if (i < 0) S.cantos.push(c); else S.cantos[i] = c;
  if (aoSalvarCanto) aoSalvarCanto(c);
  aposMudarCantos();
  toast('Canto salvo.');
}

function aposMudarCantos() {
  renderCantos();
  renderRoteiroLista();
  if (S.atual) { atualizarSlides(); renderCabecalho(); }
}

async function lerTexto(arquivo) {
  const buf = await arquivo.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buf);
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(buf) : utf8;
}

async function importarTxt(arquivos) {
  let n = 0;
  for (const a of arquivos) {
    const letra = (await lerTexto(a)).replace(/\r/g, '').trim();
    if (!letra) continue;
    const c = { id: uid(), titulo: a.name.replace(/\.[^.]+$/, ''), autor: '', momento: 'Outros', letra };
    await DB.salvar('cantos', c);
    S.cantos.push(c);
    n++;
  }
  aposMudarCantos();
  toast(`${n} canto(s) importado(s). Ajuste o momento da Missa de cada um.`);
}

// =====================================================================
// Bíblia
// =====================================================================

function renderBiblia() {
  const tem = !!S.biblia;
  $('#bibliaVazia').hidden = tem;
  $('#bibliaConteudo').hidden = !tem;
  if (!tem) return;
  $('#selBiblia').innerHTML = S.biblias.map(b =>
    `<option value="${b.id}" ${b === S.biblia ? 'selected' : ''}>${esc(b.nome)} (${b.livros.length} livros)</option>`).join('');
  $('#resBusca').innerHTML = '';
}

const refLivro = l => l.sigla || l.nome;

// Posição atual do navegador da Bíblia (livro e capítulo)
S.nav = { li: 0, c: 1 };

// Abre um capítulo inteiro; `verso` (opcional) deixa esse versículo selecionado
function abrirCapitulo(li, c, verso) {
  const l = S.biblia?.livros[li];
  if (!l) return;
  if (!l.caps.some(x => x.n === c)) c = l.caps[0]?.n || 1;
  S.nav = { li, c };
  abrirItem({ tipo: 'biblia', ref: `${refLivro(l)} ${c}`, li, c });
  if (verso != null) {
    S.atual.idx = S.atual.slides.findIndex(s => s.versos && s.versos.some(v => v.n === verso));
    renderSlides();
  }
}

function irReferencia() {
  const txt = $('#refBiblia').value.trim();
  if (!txt || !S.biblia) return;
  const r = Biblia.resolver(S.biblia, txt);
  $('#refErro').textContent = r.erro || '';
  if (r.erro) return;
  S.nav = { li: S.biblia.livros.indexOf(r.livro), c: r.versos[0].c };
  abrirItem({ tipo: 'biblia', ref: txt, ...S.nav });
}

// ---------- Navegador (livros / capítulos / versículos) ----------

const SIGLAS_NT = new Set(Biblia.CATALOGO.slice(Biblia.CATALOGO.findIndex(c => c.abrev === 'Mt')).map(c => c.abrev));

function renderNavBiblia() {
  const el = $('#navBiblia');
  const it = S.atual?.item;
  if (!S.biblia || it?.tipo !== 'biblia') { el.innerHTML = ''; return; }
  const livros = S.biblia.livros;
  const li = it.li ?? S.nav.li, c = it.c ?? S.nav.c;
  const l = livros[li];
  const cap = l?.caps.find(x => x.n === c);
  const inicioNT = livros.findIndex(x => SIGLAS_NT.has(x.sigla));
  const vivos = S.live.item === it && S.live.slide?.versos ? new Set(S.live.slide.versos.map(v => v.n)) : new Set();
  const foco = S.atual.slides[S.atual.idx]?.versos?.map(v => v.n) || [];

  el.innerHTML = `
    <section class="nav-sec">
      <div class="nav-tit">Livros (${livros.length})</div>
      <div class="livros">${livros.map((x, i) => `
        <button class="livro ${inicioNT >= 0 && i >= inicioNT ? 'nt' : ''} ${i === li ? 'sel' : ''}" data-li="${i}" title="${esc(x.nome)}">
          <span class="nm">${esc(x.nome.replace(/\s*\(.*\)\s*$/, ''))}</span><small>${x.caps.length} cap.</small>
        </button>`).join('')}</div>
    </section>
    <section class="nav-sec">
      <div class="nav-tit">Capítulo</div>
      <div class="nav-sub"><b>${esc(l?.nome)}</b> — ${l?.caps.length || 0} capítulo(s)</div>
      <div class="chips">${(l?.caps || []).map(x => `<button class="chip ${x.n === c ? 'sel' : ''}" data-c="${x.n}">${x.n}</button>`).join('')}</div>
    </section>
    <section class="nav-sec">
      <div class="nav-tit">Versículo</div>
      <div class="nav-sub"><b>${esc(l?.nome)} ${c}</b> — ${cap?.vs.length || 0} versículo(s) · clique no texto para projetar</div>
      <div class="chips">${(cap?.vs || []).map(v => `<button class="chip ${vivos.has(v.n) ? 'vivo' : ''} ${foco.includes(v.n) ? 'sel' : ''}" data-v="${v.n}">${v.n}</button>`).join('')}</div>
    </section>`;
}

function cliqueNavBiblia(e) {
  const b = e.target.closest('button');
  if (!b || !S.biblia) return;
  const it = S.atual?.item;
  const li = it?.li ?? S.nav.li, c = it?.c ?? S.nav.c;
  if (b.dataset.li != null) abrirCapitulo(+b.dataset.li, 1);
  else if (b.dataset.c != null) abrirCapitulo(li, +b.dataset.c);
  else if (b.dataset.v != null) {
    const v = +b.dataset.v;
    // se o trecho aberto não tem esse versículo, abre o capítulo inteiro
    const i = S.atual.slides.findIndex(s => s.versos && s.versos.some(x => x.n === v));
    if (i < 0) return abrirCapitulo(li, c, v);
    S.atual.idx = i;
    renderSlides();
  }
}

function buscarNaBiblia() {
  const termo = $('#buscaBiblia').value.trim();
  const el = $('#resBusca');
  if (!termo || !S.biblia) { el.innerHTML = ''; return; }
  const res = Biblia.buscar(S.biblia, termo, 200);
  if (!res.length) { el.innerHTML = '<p class="vazio">Nada encontrado.</p>'; return; }
  el.innerHTML = (res.length === 200 ? '<p class="sutil pequeno">Mostrando os 200 primeiros resultados.</p>' : '') +
    res.map(r => {
      const l = S.biblia.livros[r.li];
      const t = r.t.length > 150 ? r.t.slice(0, 150) + '…' : r.t;
      return `<div class="it" data-li="${r.li}" data-c="${r.c}" data-n="${r.n}"><span class="tag t-leitura">${esc(refLivro(l))} ${r.c},${r.n}</span><span class="tit">${esc(t)}</span></div>`;
    }).join('');
}

async function importarBiblia(arquivo) {
  try {
    toast('Lendo a Bíblia…');
    const b = await Biblia.importarArquivo(arquivo);
    await DB.salvar('biblias', b);
    Biblia.indexar(b);
    S.biblias.push(b);
    S.biblia = b;
    S.config.bibliaAtiva = b.id;
    salvarConfig();
    renderBiblia();
    if (S.atual) { atualizarSlides(); renderCabecalho(); }
    const versos = b.livros.reduce((s, l) => s + l.caps.reduce((t, c) => t + c.vs.length, 0), 0);
    toast(`"${b.nome}" importada: ${b.livros.length} livros, ${versos.toLocaleString('pt-BR')} versículos.`);
  } catch (err) {
    alert('Não foi possível importar a Bíblia:\n' + err.message);
  }
}

// =====================================================================
// Folheto (PDF) e arrastar-e-soltar
// =====================================================================

function momentoDoTitulo(titulo) {
  const n = semAcento(titulo);
  const mapa = [[/entrada|abertura/, 'Entrada'], [/oferta|ofertorio|oferendas/, 'Ofertório'], [/comunhao/, 'Comunhão'], [/acao de gracas/, 'Ação de Graças'],
    [/final/, 'Final'], [/gloria/, 'Glória'], [/santo/, 'Santo'], [/cordeiro/, 'Cordeiro'], [/aspersao/, 'Aspersão'], [/penitencial|piedade/, 'Ato Penitencial'],
    [/maria|mariano/, 'Mariano'], [/adoracao/, 'Adoração']];
  return (mapa.find(([re]) => re.test(n)) || [0, 'Outros'])[1];
}

// Título de um canto sem nome: a primeira linha do refrão (ou da 1ª estrofe)
function tituloDoCanto(refrao, letra) {
  let t = ((refrao || dividir(letra)[0] || '').split('\n')[0] || 'Canto').replace(/[.,;:!?…]+$/, '').trim();
  if (t.length > 60) t = t.slice(0, 60).replace(/\s+\S*$/, '') + '…';
  return t;
}

const chaveDoCanto = (refrao, letra) => semAcento((refrao || '') + ' ' + (letra || '')).replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120);

// Salva no banco os cantos que vieram no folheto e faz o roteiro apontar para eles
const primeiraLinha = c => ((c.refrao || dividir(c.letra)[0] || '').split('\n')[0] || '').replace(/[.,;:!?…]+$/, '').trim();

function procurarNomeNaWeb(c) {
  window.open('https://www.google.com/search?q=' + encodeURIComponent(`"${primeiraLinha(c)}" canto letra`), '_blank');
}

function abrirNomeacao(cantos) {
  $('#listaNomes').innerHTML = cantos.map(c => `
    <div class="nome-canto" data-id="${c.id}">
      <span class="tag t-canto">${esc(c.momento)}</span>
      <input value="${esc(c.titulo)}" aria-label="Nome do canto">
      <button type="button" data-procurar title="Pesquisar pela primeira linha da letra">Procurar</button>
      <span class="trecho">“${esc(primeiraLinha(c))}…”${c.autor ? ' — ' + esc(c.autor) : ''}</span>
    </div>`).join('');
  const dlg = $('#dlgNomes');
  dlg.returnValue = '';
  dlg.showModal();
  $('#listaNomes input')?.select();
}

async function salvarNomes() {
  for (const row of $$('#listaNomes .nome-canto')) {
    const c = S.cantos.find(x => x.id === row.dataset.id);
    const nome = row.querySelector('input').value.trim();
    if (!c || !nome || nome === c.titulo) continue;
    c.titulo = nome;
    await DB.salvar('cantos', c);
  }
  aposMudarCantos();
  toast('Nomes salvos.');
}

async function salvarCantosDoFolheto(itens, creditos) {
  let novos = 0, existentes = 0;
  const cantosNovos = [];
  const saida = [];
  for (const it of itens) {
    if (!(it.tipo === 'salmo' && it.rotulo === 'Canto' && /canto/i.test(it.titulo))) { saida.push(it); continue; }
    const chave = chaveDoCanto(it.refrao, it.texto);
    let c = S.cantos.find(x => chaveDoCanto(x.refrao, x.letra) === chave);
    const momento = momentoDoTitulo(it.titulo);
    if (c) existentes++;
    else {
      c = { id: uid(), titulo: tituloDoCanto(it.refrao, it.texto), autor: creditos[momento] || '', momento, refrao: it.refrao, letra: it.texto, origem: 'folheto' };
      await DB.salvar('cantos', c);
      S.cantos.push(c);
      cantosNovos.push(c);
      novos++;
    }
    saida.push({ tipo: 'canto', momento, cantoId: c.id });
  }
  return { itens: separarCantaveis(saida) || saida, novos, existentes, cantosNovos };
}

// O folheto traz o Santo no meio do texto da Oração Eucarística ("…a uma só voz:\nT. Santo, Santo, Santo, …").
// Ele vira um item próprio, de canto: fica "rezado" (o texto do folheto) até alguém escolher um canto para ele.
// A Oração Eucarística fica em duas partes: Diálogo e Prefácio | Santo | a oração.
const RX_SANTO = /^\s*(?:T\.\s*|—\s*)?Santo,?\s+Santo\b/i;
function separarSanto(itens) {
  if (itens.some(i => (i.tipo === 'canto' && i.momento === 'Santo') || (i.tipo === 'ordinario' && i.parte === 'santo'))) return null;
  const k = itens.findIndex(i => i.tipo === 'texto' && /eucar/i.test(i.titulo || '') && (i.texto || '').split('\n').some(l => RX_SANTO.test(l)));
  if (k < 0) return null;
  const it = itens[k], linhas = it.texto.split('\n');
  const a = linhas.findIndex(l => RX_SANTO.test(l));
  let b = a;
  while (b + 1 < linhas.length && linhas[b + 1].trim()) b++;           // o Santo vai até a linha em branco
  const antes = linhas.slice(0, a).join('\n').trim();
  const santo = desfazerHifens(linhas.slice(a, b + 1).join('\n').trim());
  const depois = linhas.slice(b + 1).join('\n').trim();
  const novos = [];
  if (antes) novos.push({ ...it, id: uid(), titulo: 'Diálogo e Prefácio', texto: antes });
  novos.push({ id: uid(), tipo: 'canto', momento: 'Santo', cantoId: '', textoRezado: santo });
  if (depois) novos.push({ ...it, texto: depois });
  return [...itens.slice(0, k), ...novos, ...itens.slice(k + 1)];
}

// Sílaba partida que sobrou do PDF com espaço depois do hífen ("Hosa- na", "peregri- nação", "Apósto- los") → junta.
// Pronome de verbo ("Ensinai- nos", "amá- lo") fica como está.
function desfazerHifens(t) {
  return (t || '').replace(/(\p{L}{2,})- (\p{Ll}{2,})/gu, (m, a, b) =>
    /^(nos|vos|lhes?|se|me|te)$/.test(b) || (/^(lo|la|los|las|no|na)$/.test(b) && /[áâéêíóôú]$/i.test(a)) ? m : a + b);
}

// Ato Penitencial, Glória e Cordeiro também podem ser cantados ou rezados: como o Santo, viram item de canto
// "rezado" (o texto do folheto) até alguém escolher um canto.
const temMomento = (itens, momento, parte) => itens.some(i => (i.tipo === 'canto' && i.momento === momento) || (i.tipo === 'ordinario' && i.parte === parte));
const itemRezado = (it, momento, texto, extra = {}) => ({ id: it?.id || uid(), tipo: 'canto', momento, cantoId: '', textoRezado: desfazerHifens(texto.trim()), ...extra });

function separarGloria(itens) {
  if (temMomento(itens, 'Glória', 'gloria')) return null;
  const k = itens.findIndex(i => i.tipo === 'texto' && /hino de louvor|^gloria/.test(semAcento(i.titulo || '')) && /gl[oó]ria a deus nas alturas/i.test(i.texto || ''));
  if (k < 0) return null;
  return [...itens.slice(0, k), itemRezado(itens[k], 'Glória', itens[k].texto), ...itens.slice(k + 1)];
}

// Cantado, o canto entra no lugar das invocações ("…tende piedade de nós"); o convite antes e a absolvição depois ficam
function separarPenitencial(itens) {
  if (temMomento(itens, 'Ato Penitencial', 'kyrie')) return null;
  const k = itens.findIndex(i => i.tipo === 'texto' && /penitencial/.test(semAcento(i.titulo || '')) && /piedade/i.test(i.texto || ''));
  if (k < 0) return null;
  const texto = itens[k].texto.trim(), blocos = texto.split(/\n\s*\n/);
  const pied = blocos.map((b, j) => /piedade/i.test(b) ? j : -1).filter(j => j >= 0);
  const extra = { textoAntes: blocos.slice(0, pied[0]).join('\n\n'), textoDepois: blocos.slice(pied[pied.length - 1] + 1).join('\n\n') };
  return [...itens.slice(0, k), itemRezado(itens[k], 'Ato Penitencial', texto, extra), ...itens.slice(k + 1)];
}

// O Cordeiro: se vier dentro de um texto do folheto, sai dele; se o folheto nem o traz, entra o do Ordinário,
// depois do Rito da Comunhão (ou antes do canto de Comunhão)
const RX_CORDEIRO = /^\s*(?:T\.\s*|—\s*)?Cordeiro de Deus,? que tirais/i;
function separarCordeiro(itens) {
  if (temMomento(itens, 'Cordeiro', 'cordeiro')) return null;
  const k = itens.findIndex(i => i.tipo === 'texto' && (i.texto || '').split('\n').some(l => RX_CORDEIRO.test(l)));
  if (k >= 0) {
    const it = itens[k], linhas = it.texto.split('\n');
    const a = linhas.findIndex(l => RX_CORDEIRO.test(l));
    let b = linhas.findIndex((l, j) => j >= a && /dai-nos a paz/i.test(l));
    if (b < 0) { b = a; while (b + 1 < linhas.length && linhas[b + 1].trim()) b++; }
    const antes = linhas.slice(0, a).join('\n').trim(), depois = linhas.slice(b + 1).join('\n').trim();
    const novos = [];
    if (antes) novos.push({ ...it, id: uid(), texto: antes });
    novos.push(itemRezado(null, 'Cordeiro', linhas.slice(a, b + 1).join('\n')));
    if (depois) novos.push({ ...it, texto: depois });
    return [...itens.slice(0, k), ...novos, ...itens.slice(k + 1)];
  }
  let p = itens.findIndex(i => i.tipo === 'texto' && /rito da comunhao/.test(semAcento(i.titulo || '')));
  if (p >= 0) p++;
  else p = itens.findIndex(i => i.tipo === 'canto' && i.momento === 'Comunhão');
  if (p < 0) return null;
  const novo = itemRezado(null, 'Cordeiro', Ordinario.parte('cordeiro').slides.join('\n\n'));
  return [...itens.slice(0, p), novo, ...itens.slice(p)];
}

// A aclamação do folheto (refrão + versículo) vira item de canto "rezado" com o mesmo refrão e versículo:
// assim dá para trocar por um canto de aclamação, como no Santo
function aclamacaoRezada(it) {
  const refrao = (it.refrao || '').trim(), texto = (it.texto || '').trim();
  return { id: it.id || uid(), tipo: 'canto', momento: 'Aclamação ao Evangelho', cantoId: '',
    refraoRezado: texto ? refrao : '', textoRezado: texto || refrao };
}
function separarAclamacao(itens) {
  if (itens.some(i => i.tipo === 'canto' && i.momento === 'Aclamação ao Evangelho')) return null;
  const k = itens.findIndex(i => i.tipo === 'salmo' && /aclama/.test(semAcento(i.titulo || '')) && ((i.refrao || '').trim() || (i.texto || '').trim()));
  if (k < 0) return null;
  return [...itens.slice(0, k), aclamacaoRezada(itens[k]), ...itens.slice(k + 1)];
}

function separarCantaveis(itens) {
  let r = itens, mudou = false;
  for (const f of [separarPenitencial, separarGloria, separarAclamacao, separarSanto, separarCordeiro]) {
    const n = f(r);
    if (n) { r = n; mudou = true; }
  }
  return mudou ? r : null;
}

// Nos roteiros que já existem (e nos que chegam da nuvem de um computador com versão antiga). Não muda o que já está separado.
async function separarCantaveisNosRoteiros() {
  let n = 0;
  for (const r of S.roteiros) {
    const novos = separarCantaveis(r.itens || []);
    if (!novos) continue;
    r.itens = novos;
    await DB.salvar('roteiros', r);
    n++;
  }
  if (n) console.info(`Ato Penitencial/Glória/Santo/Cordeiro separados em ${n} roteiro(s).`);
}

// (uma vez) As aberturas que já existiam (ilustração à esquerda) passam para o jeito da capa do folheto,
// nos roteiros de hoje em diante. Quem escolheu outro layout fica como está.
async function aberturasNoJeitoDaCapa() {
  if (S.config.aberturaCapa) return;
  const hoje = new Date().toISOString().slice(0, 10);
  for (const r of S.roteiros) {
    if ((r.data || '') < hoje) continue;
    const ab = (r.itens || []).find(i => i.tipo === 'imagem' && i.abertura && i.imagem && (i.layout || 'esquerda') === 'esquerda');
    if (!ab) continue;
    ab.layout = 'capa';
    await DB.salvar('roteiros', r);
  }
  S.config.aberturaCapa = true;
  salvarConfig();
}

// Slide de abertura (ideia do Miguel): a ilustração da capa do folheto + o nome da Missa e a data,
// para ficar no telão antes de a Missa começar. Vira o primeiro item do roteiro.
function itemAbertura(r) {
  // com os textos da capa: no jeito da capa do folheto (fundo branco, título vermelho, linha azul, ilustração ao lado)
  const c = r.capaTextos;
  if (r.capa && c) return [{ tipo: 'imagem', abertura: true, titulo: '', imagem: r.capa, layout: 'capa', escurecer: 45,
    texto: [c.titulo, c.sub, c.edicao].filter(Boolean).join('\n') }];
  const titulo = (r.tituloLiturgico || '').replace(/\s+—\s+/g, '\n');
  const data = (r.nome || '').match(/\d{1,2} de [a-zç]+ de \d{4}/i)?.[0] || '';
  const texto = [titulo, data].filter(Boolean).join('\n\n').trim();
  if (!r.capa && !texto) return [];
  // só uma linha em branco separa slides: título e data ficam no mesmo slide
  return [{ tipo: 'imagem', abertura: true, titulo: '', imagem: r.capa || '', layout: 'esquerda', escurecer: 45,
    texto: texto.replace(/\n\n/g, '\n') }];
}

async function importarFolheto(arquivo) {
  try {
    toast('Lendo o folheto…');
    const r = await Folheto.importar(arquivo);
    if (!r.itens.length) throw new Error('Não encontrei as partes da Missa neste PDF. Use a versão "Celular" do folheto.');
    const cantos = await salvarCantosDoFolheto(r.itens, r.creditos || {});
    renderCantos();
    const pacote = {
      nome: r.nome || arquivo.name.replace(/\.(pdf|docx|txt)$/i, ''),
      data: dataDoTexto(r.nome),          // "… — 27 de setembro de 2026" → "2026-09-27"
      itens: comHomilia([...itemAbertura(r), ...cantos.itens]), aviso: r.aviso, cantos,
      tituloLiturgico: r.tituloLiturgico,            // ex.: "Assunção da Bem-aventurada Virgem Maria — Solenidade"
      msgEuc: capturarEucaristia(r.eucaristia),   // guarda a oração eucarística e o prefácio do dia no catálogo
    };
    // avisa já (mesmo que a janela de distribuição seja cancelada, a oração eucarística fica guardada)
    if (pacote.msgEuc) toast(pacote.msgEuc.trim());
    const candidatas = pacote.data ? celebracoesDoFolheto(pacote.data) : [];
    // Com celebrações na Agenda: um roteiro para cada uma. Sem Agenda: um roteiro só, como antes.
    if (candidatas.length || Agenda.dados.regras.length) abrirDistribuicao(pacote, candidatas);
    else { const rot = await criarRoteiroUnicoDoFolheto(pacote); trocarRoteiro(rot); concluirFolheto(pacote, `Folheto importado: ${rot.itens.length} partes.`); }
  } catch (err) {
    console.error(err);
    alert('Não foi possível importar o folheto:\n' + err.message);
  }
}

// Folhetos antigos em lote: guarda só os cantos (no banco) e a oração eucarística/prefácio (no catálogo ✝)
async function lerFolhetosEmLote(arquivos) {
  const novos = [], orações = [], falhas = [];
  let existentes = 0;
  for (let i = 0; i < arquivos.length; i++) {
    toast(`Lendo folheto ${i + 1} de ${arquivos.length}…`);
    try {
      const r = await Folheto.importar(arquivos[i]);
      const c = await salvarCantosDoFolheto(r.itens, r.creditos || {});
      novos.push(...c.cantosNovos);
      existentes += c.existentes;
      const antes = new Set(Object.keys(Euc.dados.textos));
      capturarEucaristia(r.eucaristia);
      orações.push(...Object.keys(Euc.dados.textos).filter(id => !antes.has(id)).map(nomeEuc));
    } catch (err) {
      falhas.push(`${arquivos[i].name} (${err.message})`);
    }
  }
  renderCantos(); renderRoteiroLista(); renderEucaristia();
  alert(`${arquivos.length} folheto(s) lido(s).\n\n` +
    `🎵 Cantos: ${novos.length} novo(s) no banco${existentes ? `, ${existentes} já existia(m)` : ''}.\n` +
    `✝ Orações eucarísticas e prefácios novos: ${orações.length ? '\n   • ' + orações.join('\n   • ') : 'nenhum (já estavam no catálogo)'}` +
    (falhas.length ? `\n\nNão consegui ler:\n   • ${falhas.join('\n   • ')}` : '') +
    (novos.length ? '\n\nEm seguida: dê nome aos cantos novos.' : ''));
  if (novos.length) abrirNomeacao(novos);
}

async function criarRoteiroUnicoDoFolheto(pacote) {
  const rot = novoRoteiro(pacote.nome);
  rot.data = pacote.dataAlvo || pacote.data;   // data escolhida na janela (reaproveitando um folheto) ou a do folheto
  marcarCelebracaoDoFolheto(rot, pacote);
  rot.itens = comAvisos(pacote.itens.map(i => ({ ...structuredClone(i), id: uid() })));
  S.roteiros.push(rot);
  await DB.salvar('roteiros', rot);
  return rot;
}

// O nome da celebração do folheto só vale na data do próprio folheto (reaproveitado em outra data, fica o do calendário)
function marcarCelebracaoDoFolheto(rot, pacote) {
  if (!pacote.tituloLiturgico || (pacote.dataAlvo && pacote.dataAlvo !== pacote.data)) return;
  rot.tituloLiturgico = pacote.tituloLiturgico;
  rot.liturgiaDe = rot.data || infoRoteiro(rot).iso;   // na vigília de sábado, a data do sábado
  rot.cor = '';                                   // o folheto não traz a cor: vale a do calendário (ou a escolhida à mão)
}

function concluirFolheto(pacote, msg) {
  const c = pacote.cantos;
  const msgCantos = c.novos || c.existentes ? ` Cantos: ${c.novos} novo(s) no banco${c.existentes ? `, ${c.existentes} já existia(m)` : ''}.` : '';
  toast(msg + msgCantos + (pacote.msgEuc || ''));
  if (pacote.aviso) alert(pacote.aviso);
  if (c.cantosNovos.length) abrirNomeacao(c.cantosNovos);
}

// Celebrações que usam o folheto de um dia: as do próprio dia e, se for domingo, as de sábado à tarde/noite (vigília)
function celebracoesDoFolheto(iso) {
  const d = deIso(iso);
  const lista = ocorrencias(d).filter(o => !o.cancelada).map(o => ({ ...o, vigilia: false }));
  if (d.getDay() === 0) {
    const sab = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
    lista.unshift(...ocorrencias(sab).filter(o => !o.cancelada && o.hora >= '16:00').map(o => ({ ...o, vigilia: true })));
  }
  return lista;
}

let distribuicao = null;

function abrirDistribuicao(pacote, candidatas) {
  distribuicao = { pacote, candidatas };
  $('#distTitulo').textContent = pacote.nome;
  $('#distData').value = pacote.data || isoData(new Date());
  renderDistribuicao();
  const dlg = $('#dlgDistribuir');
  dlg.returnValue = '';
  dlg.showModal();
}

// Lista das celebrações da data escolhida (por padrão a do folheto; pode ser outra, ex.: reaproveitar a Assunção)
function renderDistribuicao() {
  const { pacote } = distribuicao;
  const alvo = pacote.dataAlvo = $('#distData').value || pacote.data;
  const candidatas = distribuicao.candidatas = celebracoesDoFolheto(alvo);
  const passado = pacote.data < isoData(new Date()) && alvo === pacote.data;
  $('#distAviso').textContent = passado ? 'Este folheto é de uma data que já passou. Se for reaproveitá-lo, escolha a data da Missa acima.' : '';
  $('#distLista').innerHTML = !candidatas.length ? '<p class="sutil">Nenhuma celebração na Agenda nesta data. Use "Só um roteiro".</p>' : candidatas.map((o, i) => {
    const existente = roteiroDaCelebracao(o);
    const marcado = o.tipo === 'Missa' && !existente;
    const loc = localDe(o.localId);
    const dia = deIso(o.iso);
    return `<label class="dist-item">
      <input type="checkbox" data-i="${i}" ${marcado ? 'checked' : ''}>
      <span class="dist-quando">${DIAS_CURTOS[dia.getDay()]} ${o.hora}</span>
      ${loc ? `<span class="card-ponto" style="background:${loc.cor}"></span>` : ''}
      <span class="dist-txt">${esc(o.texto)}</span>
      ${o.vigilia ? '<span class="tag">vigília</span>' : ''}
      ${o.tipo !== 'Missa' ? `<span class="tag">${esc(o.tipo)}</span>` : ''}
      ${existente ? '<span class="dist-existe">já tem roteiro — não será criado de novo; marque só se quiser substituir os itens</span>' : ''}
    </label>`;
  }).join('');
  atualizarBotaoDistribuir();
}

function atualizarBotaoDistribuir() {
  const n = $$('#distLista input:checked').length;
  $('#btnDistCriar').textContent = n ? `Criar ${n} roteiro(s)` : 'Nenhuma marcada';
  $('#btnDistCriar').disabled = !n;
}

async function distribuirFolheto(modo) {
  const { pacote, candidatas } = distribuicao;
  if (modo === 'um') {
    const rot = await criarRoteiroUnicoDoFolheto(pacote);
    trocarRoteiro(rot);
    return concluirFolheto(pacote, `Folheto importado em um roteiro só: ${rot.itens.length} partes.`);
  }
  const marcadas = $$('#distLista input:checked').map(el => candidatas[+el.dataset.i]);
  let criados = 0, substituidos = 0, primeiro = null;
  for (const o of marcadas) {
    let r = roteiroDaCelebracao(o);
    if (r) {
      r.itens = comAvisos(pacote.itens.map(i => ({ ...structuredClone(i), id: uid() })));
      r.atualizado = Date.now();
      substituidos++;
    } else {
      r = await criarRoteiroDaCelebracao(o, pacote.itens);
      criados++;
    }
    marcarCelebracaoDoFolheto(r, pacote);
    await DB.salvar('roteiros', r);
    primeiro ||= r;
  }
  if (primeiro) trocarRoteiro(primeiro);
  mostrarAba('roteiros');
  concluirFolheto(pacote, `Folheto distribuído: ${criados} roteiro(s) criado(s)${substituidos ? `, ${substituidos} substituído(s)` : ''}.`);
}

async function importarArquivoSolto(arquivos) {
  const porExt = ext => arquivos.filter(a => a.name.toLowerCase().endsWith(ext));
  // .txt pode ser folheto (tem "Canto de Entrada", "Primeira Leitura"…) ou uma lista de cantos
  const txtFolheto = [];
  for (const a of porExt('.txt')) if (Folheto.pareceFolheto(await a.text())) txtFolheto.push(a);
  const pdfs = [...porExt('.pdf'), ...porExt('.docx'), ...porExt('.doc'), ...txtFolheto];
  // vários PDFs de uma vez = folhetos antigos: só colhe cantos e orações (não cria roteiros)
  if (pdfs.length > 1) {
    if (confirm(`Ler ${pdfs.length} folhetos para guardar os CANTOS e as ORAÇÕES EUCARÍSTICAS?\n(Não cria roteiros.)`)) lerFolhetosEmLote(pdfs);
  } else for (const a of pdfs) importarFolheto(a);
  for (const a of porExt('.xml')) importarBiblia(a);
  const txts = porExt('.txt').filter(a => !txtFolheto.includes(a));
  if (txts.length) importarTxt(txts);
  for (const a of porExt('.json')) importarBackup(a);
  const midias = arquivos.filter(a => EXT_MIDIA.test(a.name) || /^(video|audio)\//.test(a.type));
  if (midias.length) adicionarMidias(midias);
}

// =====================================================================
// Missa (calendário + ordinário)
// =====================================================================

function renderLiturgia() {
  const l = Liturgia.info(new Date());
  const data = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const santo = l.santo ? ` <span class="lit-grau">(${esc(l.santo.toLowerCase())})</span>` : '';
  const facult = l.facultativa ? `<span>·</span><span class="sutil" title="Memória facultativa (opcional)">${esc(l.facultativa)}</span>` : '';
  $('#liturgia').innerHTML = `<span class="cor-lit" style="background:${l.corHex}" title="Cor litúrgica do dia: ${l.cor}"></span>
    <span>${esc(data)}</span><span>·</span><strong>${esc(l.titulo)}</strong>${santo}
    ${l.santo ? `<span>·</span><span>${esc(l.tituloTempo)}</span>` : ''}${facult}<span>·</span>
    <span>Ano ${l.ciclo} · ${l.ferial === 'I' ? 'Ano ímpar (I)' : 'Ano par (II)'}</span>`;
  $('#liturgia').title = 'Calendário litúrgico calculado automaticamente: tempos, solenidades, festas e memórias dos santos (próprio do Brasil). Clique para abrir o calendário.';
}

function renderOrdinario() {
  $('#listaOrdinario').innerHTML = Ordinario.grupos.map(g => `<div class="grupo-ord">${esc(g.grupo)}</div>
    <div class="lista">${g.partes.map(p => `<div class="it" data-parte="${p.id}"><span class="tag t-ordinario">Missa</span><span class="tit">${esc(p.titulo)}</span></div>`).join('')}</div>`).join('');
}

// =====================================================================
// Ajustes e backup
// =====================================================================

// Tema do aplicativo (escuro/claro). Também fica no localStorage para a janela já abrir na cor certa.
function aplicarTemaApp() {
  const t = S.config.temaApp === 'claro' ? 'claro' : 'escuro';
  document.documentElement.dataset.temaApp = t;
  try { localStorage.setItem('lumen.temaApp', t); } catch {}
}

function ligarAjustes() {
  for (const el of $$('[data-cfg]')) {
    const k = el.dataset.cfg;
    if (el.type === 'checkbox') el.checked = !!S.config[k]; else el.value = S.config[k];
    el.addEventListener('input', () => {
      S.config[k] = el.type === 'checkbox' ? el.checked : (el.type === 'range' || el.type === 'number') ? +el.value : el.value;
      salvarConfig();
      if (k === 'temaApp') return aplicarTemaApp();     // só o aplicativo; o telão não muda
      if (k === 'textoAltar') return atualizarAltarNoAr();
      enviarConfigTelao(); renderTemasRapidos();
      if (['versosPorSlide', 'numerarVersos', 'quebraAuto', 'linhasPorSlide', 'caracteresPorLinha', 'quebraCantos', 'salmoCorrido'].includes(k)) atualizarSlides();
    });
  }
}

function baixar(nome, texto) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function exportarBackup() {
  const dados = { app: 'lumen', versao: 1, exportado: new Date().toISOString(), config: S.config, cantos: S.cantos, roteiros: S.roteiros, oracoes: Oracoes.lista, agenda: Agenda.dados, eucaristia: Euc.dados,
    apresentacoes: Midia.lista.filter(m => m.tipo === 'apresentacao') };
  baixar(`miguelangelus-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(dados, null, 1));
}

async function importarBackup(arquivo) {
  try {
    const d = JSON.parse(await lerTexto(arquivo));
    if (d.app !== 'lumen') throw new Error('Este arquivo não é um backup do MiguelAngelus.');
    const nc = (d.cantos || []).length, nr = (d.roteiros || []).length, no = (d.oracoes || []).length;
    if (!confirm(`Importar ${nc} canto(s), ${no} oração(ões) e ${nr} roteiro(s)?\nItens iguais já existentes serão substituídos.`)) return;
    for (const o of d.oracoes || []) await DB.salvar('oracoes', o);
    if (d.agenda) await DB.salvar('config', { id: 'agenda', valor: d.agenda });
    if (d.eucaristia) await DB.salvar('config', { id: 'eucaristia', valor: d.eucaristia });
    for (const c of d.cantos || []) {
      if (!MOMENTOS.includes(c.momento)) c.momento = 'Outros';
      await DB.salvar('cantos', c);
    }
    for (const r of d.roteiros || []) await DB.salvar('roteiros', r);
    for (const a of d.apresentacoes || []) if (a.tipo === 'apresentacao') await DB.salvar('midias', a);
    if (d.config) { Object.assign(S.config, d.config); await DB.salvar('config', { id: 'geral', valor: S.config }); }
    location.reload();
  } catch (err) {
    alert('Não foi possível importar o backup:\n' + err.message);
  }
}

// =====================================================================
// Eventos
// =====================================================================

function ligarEventos() {
  // (a troca de módulos fica em menus.js)

  // Topo e controles
  $('#btnProjecao').addEventListener('click', alternarProjecao);
  $('#btnProx').addEventListener('click', proximo);
  $('#btnAnt').addEventListener('click', anterior);
  // (Tela preta: menu Projeção e tecla B — o botão saiu do painel para os outros caberem numa linha)
  $('#btnLimpar').addEventListener('click', limpar);
  $('#btnAltar').addEventListener('click', alternarAltar);
  $('#btnMsg').addEventListener('click', projetarMensagem);
  setInterval(renderEstadoProj, 1500);

  // Teclado (fora de campos de texto)
  document.addEventListener('keydown', e => {
    // Com qualquer janela aberta (Ajustes, Agenda, editores…) as teclas são dela; Esc só fecha a janela
    if (document.querySelector('dialog[open]')) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    // Um select com foco não pode "roubar" as setas durante a Missa
    if (e.target.tagName === 'SELECT' && ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.key)) {
      e.preventDefault();
      e.target.blur();
      tratarTecla(e.key);
      return;
    }
    if (e.target instanceof Element && e.target.matches('input, textarea, select')) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (tratarTecla(e.key)) e.preventDefault();
  });
  // Depois de escolher algo num select, devolve as setas para o controle dos slides
  document.addEventListener('change', e => { if (e.target.tagName === 'SELECT') e.target.blur(); });
  document.addEventListener('click', e => { const b = e.target.closest('button'); if (b) b.blur(); });

  // Slides
  $('#slides').addEventListener('click', e => {
    const s = e.target.closest('.slide');
    if (!s) return;
    // apresentação em edição: o clique escolhe o slide para editar (não projeta)
    if (ehApresentacao(S.atual?.item) && Apres.editando) { Apres.sel = +s.dataset.i; renderCabecalho(); renderSlides(); return; }
    projetar(+s.dataset.i);
  });

  // Cabeçalho do item (edição)
  $('#itemCab').addEventListener('input', e => {
    const campo = e.target.dataset.campo;
    if (!campo || !S.atual) return;
    const it = S.atual.item;
    it[campo] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (S.atual.rIdx >= 0) { salvarRoteiro(); renderRoteiroLista(); }
    atualizarSlides();
    if (e.target.tagName === 'SELECT') renderCabecalho();
    else if (campo === 'ref') atualizarStatusRef();
  });
  $('#itemCab').addEventListener('click', e => {
    const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
    if (!cmd || !S.atual) return;
    const it = S.atual.item;
    if (cmd.startsWith('ap')) return comandoApresentacao(cmd);
    if (cmd === 'editarCanto') {
      const c = S.cantos.find(c => c.id === it.cantoId);
      if (c) abrirEditorCanto(c);
    } else if (cmd === 'avisosParoquiais') {
      abrirAvisosPar();
    } else if (cmd === 'favoritarCanto') {
      alternarFavorito(it.cantoId);
    } else if (cmd === 'novoCanto') {
      abrirEditorCanto(null, it.momento, c => { it.cantoId = c.id; if (S.atual.rIdx >= 0) salvarRoteiro(); });
    } else if (cmd === 'editarEuc') {
      abrirEditorEuc(it.tipo === 'prefacio' ? it.prefId : it.oeId);
    } else if (cmd === 'catalogoEuc') {
      mostrarAba('missa');
      mostrarEucaristia(true);
    } else if (cmd === 'editarOracao') {
      const o = oracaoDe(it);
      if (o) abrirEditorOracao(o);
    } else if (cmd === 'novaOracao') {
      abrirEditorOracao(null, o => { it.oracaoId = o.id; if (S.atual.rIdx >= 0) salvarRoteiro(); });
    } else if (cmd === 'escolherImg') {
      $('#arqImgSlide').click();
    } else if (cmd === 'tirarImg') {
      it.imagem = '';
      if (S.atual.rIdx >= 0) { salvarRoteiro(); renderRoteiroLista(); }
      atualizarSlides();
      renderCabecalho();
    } else if (cmd === 'addRoteiro') {
      const pos = adicionarAoRoteiro(itemParaRoteiro(it));
      renderRoteiroLista();
      toast(`Adicionado ao roteiro (posição ${pos + 1}).`);
    }
  });

  // Roteiro
  $('#nomeRoteiro').addEventListener('input', e => {
    S.roteiro.nome = e.target.value;
    $('#roteiroAtualNome').textContent = e.target.value;
    salvarRoteiro();
    renderCardsRoteiros();
  });
  $('#btnNovoRoteiro').addEventListener('click', () => {
    const r = novoRoteiro();
    r.data = isoData(new Date());
    S.roteiros.push(r);
    DB.salvar('roteiros', r);
    trocarRoteiro(r);
    mostrarAba('roteiros');
    $('#nomeRoteiro').select();
  });
  $('#btnDuplicarRoteiro').addEventListener('click', () => {
    const r = { ...structuredClone(S.roteiro), id: uid(), nome: S.roteiro.nome + ' (cópia)', atualizado: Date.now() };
    r.itens.forEach(i => { i.id = uid(); });
    S.roteiros.push(r);
    DB.salvar('roteiros', r);
    trocarRoteiro(r);
  });
  $('#btnExcluirRoteiro').addEventListener('click', async () => {
    if (!confirm(`Excluir o roteiro "${S.roteiro.nome}"?`)) return;
    await DB.remover('roteiros', S.roteiro.id);
    S.roteiros = S.roteiros.filter(r => r !== S.roteiro);
    if (!S.roteiros.length) { const r = novoRoteiro(); S.roteiros.push(r); DB.salvar('roteiros', r); }
    trocarRoteiro([...S.roteiros].sort((a, b) => b.atualizado - a.atualizado)[0]);
  });
  $('#selModelo').addEventListener('change', e => {
    const m = Ordinario.modelos[e.target.value];
    e.target.value = '';
    if (!m) return;
    if (S.roteiro.itens.length && !confirm('Substituir os itens deste roteiro pelo modelo?')) return;
    S.roteiro.itens = m.map(x => ({ id: uid(), ...structuredClone(x) }));
    salvarRoteiro();
    S.atual = null;
    renderRoteiroLista(); renderCabecalho(); renderSlides();
  });
  // Folheto → roteiros das celebrações do dia
  $('#distLista').addEventListener('change', atualizarBotaoDistribuir);
  $('#distData').addEventListener('change', renderDistribuicao);
  $('#dlgDistribuir form').addEventListener('submit', e => {
    const v = e.submitter?.value;
    if (v === 'criar' || v === 'um') distribuirFolheto(v);
    else if (distribuicao?.pacote.cantos.cantosNovos.length) setTimeout(() => abrirNomeacao(distribuicao.pacote.cantos.cantosNovos), 0);
  });
  $('#btnFolheto').addEventListener('click', () => $('#arqFolheto').click());
  $('#arqFolheto').addEventListener('change', e => { if (e.target.files[0]) importarFolheto(e.target.files[0]); e.target.value = ''; });
  // Arrastar arquivos para a janela: PDF = folheto, XML = Bíblia, TXT = cantos, JSON = backup
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => {
    e.preventDefault();
    const arqs = [...(e.dataTransfer?.files || [])];
    // com um item "Imagem + texto" aberto, a imagem arrastada vai para ele
    const img = arqs.find(a => a.type.startsWith('image/'));
    if (img && S.atual?.item.tipo === 'imagem') return definirImagemDoItem(img);
    // com uma apresentação em edição: imagens viram slides e um PDF vira páginas
    if (ehApresentacao(S.atual?.item) && Apres.editando) {
      const pdf = arqs.find(a => /\.pdf$/i.test(a.name));
      if (pdf) return pdfParaApresentacao(pdf);
      if (img) return imagensParaApresentacao(arqs);
    }
    if (arqs.length) importarArquivoSolto(arqs);
  });
  $('#arqImgSlide').addEventListener('change', e => { definirImagemDoItem(e.target.files[0]); e.target.value = ''; });
  // Ctrl+V com uma imagem copiada (print, figura do navegador…) no item "Imagem + texto"
  document.addEventListener('paste', e => {
    if (document.querySelector('dialog[open]')) return;
    const imgs = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
    if (!imgs.length) return;
    if (S.atual?.item.tipo === 'imagem') { e.preventDefault(); definirImagemDoItem(imgs[0]); }
    else if (ehApresentacao(S.atual?.item) && Apres.editando) { e.preventDefault(); imagensParaApresentacao(imgs); }
  });
  $('#roteiroItens').addEventListener('click', e => {
    const row = e.target.closest('.it');
    if (!row) return;
    const i = +row.dataset.i, itens = S.roteiro.itens;
    const acao = e.target.closest('button')?.dataset.acao;
    if (acao) {
      if (acao === 'remover') {
        if (!confirm('Remover este item do roteiro?')) return;
        const [rem] = itens.splice(i, 1);
        if (S.atual?.item === rem) S.atual = null;
      } else {
        const j = acao === 'subir' ? i - 1 : i + 1;
        if (j < 0 || j >= itens.length) return;
        [itens[i], itens[j]] = [itens[j], itens[i]];
      }
      if (S.atual && S.atual.rIdx >= 0) S.atual.rIdx = itens.indexOf(S.atual.item);
      salvarRoteiro();
      renderRoteiroLista();
      if (!S.atual) { renderCabecalho(); renderSlides(); }
      return;
    }
    if (S.atual?.item === itens[i]) return;
    abrirItem(itens[i], i);
  });
  for (const b of $$('[data-add]')) b.addEventListener('click', () => {
    const it = novoItem(b.dataset.add);
    const pos = adicionarAoRoteiro(it);
    abrirItem(it, pos);
    $('#itemCab input:not([type=checkbox]), #itemCab select, #itemCab textarea')?.focus();
  });

  // Cantos
  $('#buscaCanto').addEventListener('input', renderCantos);
  $('#filtroMomento').addEventListener('change', renderCantos);
  $('#btnNovoCanto').addEventListener('click', () => abrirEditorCanto(null, $('#filtroMomento').value || 'Outros', c => abrirItem({ tipo: 'canto', cantoId: c.id })));
  $('#listaCantos').addEventListener('click', e => {
    const pasta = e.target.closest('[data-pasta]');
    if (pasta) { const k = pasta.dataset.chave || 'canto:' + pasta.dataset.pasta; Recolher.alternar(k, k.startsWith('canto:')); return renderCantos(); }
    const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
    const termo = $('#buscaCanto').value.trim();
    if (cmd === 'buscarWeb') {
      window.open('https://www.google.com/search?q=' + encodeURIComponent(`${termo} letra canto católico`), '_blank');
      return;
    }
    if (cmd === 'buscarLC') {
      // abre no navegador a pesquisa filtrada no portal Letras Católicas (o MiguelAngelus não acessa o site)
      window.open('https://www.google.com/search?q=' + encodeURIComponent(`site:letrascatolicas.com.br ${termo}`), '_blank');
      return;
    }
    if (cmd === 'cadastrar') {
      abrirEditorCanto({ id: '', titulo: termo, autor: '', momento: $('#filtroMomento').value || 'Outros', refrao: '', letra: '' },
        null, c => { $('#buscaCanto').value = ''; abrirItem({ tipo: 'canto', cantoId: c.id }); });
      $('#formCanto').letra.focus();
      return;
    }
    const row = e.target.closest('.it');
    if (row) { abrirItem({ tipo: 'canto', cantoId: row.dataset.id }); renderCantos(); }
  });
  $('#listaCantos').addEventListener('dblclick', e => {
    const row = e.target.closest('.it');
    if (row) abrirEditorCanto(S.cantos.find(c => c.id === row.dataset.id));
  });
  $('#btnImportarTxt').addEventListener('click', () => $('#arqTxt').click());
  $('#btnFolhetosLote').addEventListener('click', () => $('#arqFolhetosLote').click());
  $('#arqFolhetosLote').addEventListener('change', e => { const a = [...e.target.files]; e.target.value = ''; if (a.length) lerFolhetosEmLote(a); });
  $('#arqTxt').addEventListener('change', e => { if (e.target.files.length) importarTxt([...e.target.files]); e.target.value = ''; });

  // Enter num campo de diálogo não pode acionar "Cancelar" (o primeiro botão do formulário)
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !(e.target instanceof HTMLInputElement) || !e.target.closest('dialog')) return;
    e.preventDefault();
    const campos = $$('#listaNomes input');
    const i = campos.indexOf(e.target);
    if (i >= 0) (campos[i + 1] || $('#dlgNomes button[value=salvar]')).focus();
  });
  $('#listaNomes').addEventListener('click', e => {
    const b = e.target.closest('[data-procurar]');
    if (!b) return;
    const c = S.cantos.find(x => x.id === b.closest('.nome-canto').dataset.id);
    if (c) procurarNomeNaWeb(c);
  });
  // Salvar no envio do formulário (o evento "close" do diálogo nem sempre dispara)
  $('#dlgNomes form').addEventListener('submit', e => { if (e.submitter?.value === 'salvar') salvarNomes(); });
  $('#btnProcurarNome').addEventListener('click', () => {
    const f = $('#formCanto');
    const c = { refrao: f.refrao.value, letra: f.letra.value };
    if (!primeiraLinha(c)) { toast('Preencha a letra primeiro.'); return; }
    procurarNomeNaWeb(c);
  });
  $('#btnOrganizar').addEventListener('click', () => {
    const f = $('#formCanto');
    const colado = [f.refrao.value, f.letra.value].filter(s => s.trim()).join('\n\n');
    if (!colado.trim()) { toast('Cole a letra no campo Estrofes primeiro.'); f.letra.focus(); return; }
    const r = organizarColado(colado);
    f.refrao.value = r.refrao;
    f.letra.value = r.letra;
    if (r.comecaPor) f.comecaPor.value = r.comecaPor;
    if (r.autor && !f.autor.value.trim()) f.autor.value = r.autor;
    if (r.titulo && !f.titulo.value.trim()) f.titulo.value = r.titulo;
    toast(`Organizado: ${dividir(r.letra).length} estrofe(s)${r.refrao ? ' + refrão' : ''}${r.autor ? ' · autor encontrado' : ''}. Confira antes de salvar.`);
  });
  $('#formCanto').addEventListener('submit', e => {
    if (e.submitter?.value !== 'salvar') return;
    const f = $('#formCanto');
    // canto NOVO com a letra parecida com um que já existe: oferece abrir o existente em vez de criar outro (cifras.js)
    if (!f.dataset.id) {
      const p = cantoParecido({ id: '', momento: f.momento.value, refrao: f.refrao.value, letra: f.letra.value });
      if (p && confirm(`Já existe um canto com a letra parecida:\n\n"${p.titulo}"${fichaCanto(p) ? '\n' + fichaCanto(p) : ''}\n` +
        `(${p.momento || 'Outros'}${p.favorito ? ' · favorito' : ''}${p.cifra ? ' · com cifra' : ''})\n\n` +
        'OK = abrir esse canto (não cria outro)\nCancelar = salvar este como um canto novo')) {
        e.preventDefault();
        const digitado = { cifra: f.cifra.value.trim(), tom: f.tom.value.trim(), autor: f.autor.value.trim(), cd: f.cd.value.trim(), favorito: f.favorito.checked };
        const depois = aoSalvarCanto;
        $('#dlgCanto').close();
        abrirEditorCanto(p, null, depois);
        // o que foi digitado no novo (cifra, tom, ficha, favorito) vai para os campos vazios do existente
        let levou = false;
        for (const k of ['cifra', 'tom', 'autor', 'cd']) if (digitado[k] && !f[k].value.trim()) { f[k].value = digitado[k]; levou = true; }
        if (digitado.favorito && !f.favorito.checked) { f.favorito.checked = true; levou = true; }
        if (f.cifra.value) $('#cxCifra').open = true;
        if (levou) toast('O que você digitou (cifra, tom, ficha) foi levado para este canto. Confira e salve.');
        return;
      }
    }
    salvarCantoDoEditor();
  });
  $('#btnExcluirCanto').addEventListener('click', async () => {
    const id = $('#formCanto').dataset.id;
    if (!id || !confirm('Excluir este canto? Os roteiros que o usam ficarão com o espaço vazio.')) return;
    await DB.remover('cantos', id);
    S.cantos = S.cantos.filter(c => c.id !== id);
    $('#dlgCanto').close('');
    if (S.atual?.rIdx < 0 && S.atual.item.cantoId === id) S.atual = null;
    aposMudarCantos();
    if (!S.atual) { renderCabecalho(); renderSlides(); }
    toast('Canto excluído.');
  });

  // Bíblia
  for (const b of $$('[data-importar-biblia]')) b.addEventListener('click', () => $('#arqBiblia').click());
  $('#arqBiblia').addEventListener('change', e => { if (e.target.files[0]) importarBiblia(e.target.files[0]); e.target.value = ''; });
  $('#selBiblia').addEventListener('change', e => {
    S.biblia = S.biblias.find(b => b.id === e.target.value);
    S.config.bibliaAtiva = S.biblia.id;
    salvarConfig();
    renderBiblia();
    if (S.atual) { atualizarSlides(); renderCabecalho(); }
  });
  $('#navBiblia').addEventListener('click', cliqueNavBiblia);
  $('#btnIrRef').addEventListener('click', irReferencia);
  $('#refBiblia').addEventListener('keydown', e => { if (e.key === 'Enter') irReferencia(); });
  $('#btnBuscaBiblia').addEventListener('click', buscarNaBiblia);
  $('#buscaBiblia').addEventListener('keydown', e => { if (e.key === 'Enter') buscarNaBiblia(); });
  $('#resBusca').addEventListener('click', e => {
    const row = e.target.closest('.it');
    if (!row) return;
    abrirCapitulo(+row.dataset.li, +row.dataset.c, +row.dataset.n);
  });
  $('#btnRemoverBiblia').addEventListener('click', async () => {
    if (!confirm(`Remover a Bíblia "${S.biblia.nome}" do MiguelAngelus?`)) return;
    await DB.remover('biblias', S.biblia.id);
    S.biblias = S.biblias.filter(b => b !== S.biblia);
    S.biblia = S.biblias[0] || null;
    S.config.bibliaAtiva = S.biblia?.id || '';
    salvarConfig();
    renderBiblia();
    if (S.atual) { atualizarSlides(); renderCabecalho(); }
  });

  // Missa
  $('#listaOrdinario').addEventListener('click', e => {
    const row = e.target.closest('[data-parte]');
    if (row) abrirItem({ tipo: 'ordinario', parte: row.dataset.parte });
  });

  // Ajustes
  $('#btnFundo').addEventListener('click', () => $('#arqFundo').click());
  $('#arqFundo').addEventListener('change', e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const leitor = new FileReader();
    leitor.onload = () => { S.config.fundoImagem = leitor.result; salvarConfig(); enviarConfigTelao(); renderTemasRapidos(); };
    leitor.readAsDataURL(f);
  });
  $('#btnSemFundo').addEventListener('click', () => { S.config.fundoImagem = ''; salvarConfig(); enviarConfigTelao(); renderTemasRapidos(); });
  $('#btnExportar').addEventListener('click', exportarBackup);
  $('#btnImportar').addEventListener('click', () => $('#arqBackup').click());
  $('#arqBackup').addEventListener('change', e => { if (e.target.files[0]) importarBackup(e.target.files[0]); e.target.value = ''; });
}

// =====================================================================
// Início
// =====================================================================

function renderControles() {
  // sem o botão, o aviso de tela preta fica no rótulo em cima da prévia
  $('#rotuloVivo').textContent = S.live.preto ? 'TELA PRETA (B para voltar)' : 'AO VIVO';
  $('.rotulo-vivo').classList.toggle('preto', !!S.live.preto);
  $('#btnAltar').classList.toggle('ligado', !!S.live.altar);
  $('#btnPix').classList.toggle('ligado', !!S.pixNoAr);
}

async function iniciar() {
  const cfg = await DB.obter('config', 'geral');
  if (cfg) Object.assign(S.config, cfg.valor);
  // (uma vez) o padrão do telão passou a ser "justificado e centralizado": quem estava no centralizado antigo muda junto
  if (!S.config.alinhamentoNovo) {
    if (S.config.alinhamento === 'center') S.config.alinhamento = 'justify-center';
    S.config.alinhamentoNovo = true;
    salvarConfig();
  }
  aplicarTemaApp();
  statusAbertura(ligadaSync() ? 'Sincronizando com a nuvem…' : 'Carregando…');

  // nuvem: traz o que os outros computadores mudaram ANTES de carregar os dados
  await sincronizarAoAbrir();

  statusAbertura('Carregando cantos e roteiros…');
  S.cantos = await DB.todos('cantos');
  S.roteiros = await DB.todos('roteiros');
  Midia.lista = await DB.todos('midias');
  statusAbertura('Carregando orações, Agenda e Bíblia…');
  await carregarOracoes();
  await carregarAgenda();
  await carregarEucaristia();
  S.biblias = (await DB.todos('biblias')).map(Biblia.indexar);
  S.biblia = S.biblias.find(b => b.id === S.config.bibliaAtiva) || S.biblias[0] || null;

  S.roteiro = S.roteiros.find(r => r.id === S.config.roteiroAtivo)
    || [...S.roteiros].sort((a, b) => b.atualizado - a.atualizado)[0];
  if (!S.roteiro) { S.roteiro = novoRoteiro(); S.roteiros.push(S.roteiro); DB.salvar('roteiros', S.roteiro); }
  await separarCantaveisNosRoteiros();  // Ato Penitencial, Glória, Santo e Cordeiro viram itens "cantado ou rezado"
  await aberturasNoJeitoDaCapa();

  const opcoesMomento = MOMENTOS.map(m => `<option>${m}</option>`).join('');
  $('#filtroMomento').innerHTML = '<option value="">Todos os momentos</option>' + opcoesMomento;
  $('#formCanto').momento.innerHTML = opcoesMomento;

  ligarAjustes();
  ligarEventos();
  ligarMidia();
  ligarApresentacoes();
  renderMidias();
  ligarOracoes();
  renderOracoes();
  ligarMenus();
  ligarAvisos();
  ligarAvisosPar();
  ligarImpressao();
  ligarPerfis();
  ligarHistorico();
  ligarLocalizar();
  ligarAgenda();
  ligarApresentacao();
  renderLocalRoteiro();
  ligarRoteiros();
  renderPreparacao();
  ligarEucaristia();
  ligarLiturgiaDoDia();
  ligarCalendarioLit();
  ligarTransmissao();
  ligarCamera();
  ligarPtz();
  ligarTemas();
  ligarFolhetosOnline();
  ligarSincronia();
  ligarAtualizacao();
  ligarFormatacao();
  ligarCowabunga();
  ligarCifras();
  ligarCelular();
  ligarPix();
  ligarDivisoria();
  ligarZoomApp();
  lerPastaMidia('video'); lerPastaMidia('audio');     // pastas deste computador (os roteiros apontam para os arquivos delas)
  mostrarAba('roteiros', false);    // sempre abre nos Roteiros, com os cards das celebrações
  renderLiturgia();
  renderOrdinario();
  renderRoteiroCab();
  renderRoteiroLista();
  renderCantos();
  renderBiblia();
  renderCabecalho();
  renderEstadoProj();
  $('#versaoApp').textContent = NO_APP ? 'Versão 1.6.1 · aplicativo para Windows' : 'Versão 1.6.1 · no navegador';
  // pede armazenamento permanente (o navegador não apaga os dados para liberar espaço)
  try { navigator.storage?.persist?.(); } catch (_) {}
  enviarConfigTelao(); renderTemasRapidos();
  enviarLayout();
  mostrarNovidadesSeAtualizou();
  // roteiros repetidos (mesma celebração): pergunta depois da tela de abertura e das novidades
  setTimeout(() => {
    const nov = $('#dlgNovidades');
    if (nov.open) nov.addEventListener('close', () => oferecerJuntarRoteiros(), { once: true });
    else oferecerJuntarRoteiros();
  }, 2500);
}

// Tela de abertura (enquanto abre o banco e sincroniza com a nuvem)
function statusAbertura(txt) {
  const el = document.getElementById('splashStatus');
  if (el && !document.getElementById('splash').hidden) el.textContent = txt;
}
function fecharAbertura() {
  const s = document.getElementById('splash');
  if (!s || s.hidden) return;
  s.classList.add('saindo');
  setTimeout(() => { s.hidden = true; }, 350);
}

const inicioAbertura = Date.now();
iniciar().then(() => {
  try { sessionStorage.removeItem('tentouDeNovo'); } catch (_) {}
  setTimeout(fecharAbertura, Math.max(0, 900 - (Date.now() - inicioAbertura)));   // aparece pelo menos ~1 s
}).catch(err => {
  console.error(err);
  fecharAbertura();
  // Banco sem responder: recarrega uma vez sozinho (os dados continuam guardados; só não foram lidos ainda)
  let jaTentou = false;
  try { jaTentou = sessionStorage.getItem('tentouDeNovo') === '1'; sessionStorage.setItem('tentouDeNovo', '1'); } catch (_) {}
  if (err.codigo === 'banco-lento' && !jaTentou) { location.reload(); return; }
  alert('Erro ao iniciar o MiguelAngelus: ' + err.message +
    '\n\nSeus dados não foram apagados. Feche o programa e abra de novo; se continuar, reinicie o computador.');
});
