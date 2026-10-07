'use strict';
/*
 * Sincronização entre os computadores da paróquia (só no aplicativo).
 * Onde: Google Drive da paróquia (login dentro do app) ou uma pasta do computador (Google Drive para computador, OneDrive…).
 * Na nuvem, cada registro é um arquivo:  roteiros/<id>.json, cantos/<id>.json, oracoes/…, biblias/…, apresentacoes/…,
 *   config/agenda.json, config/eucaristia.json; apagados em removidos/<store>__<id>.json; mídias em midias/<id>.json (+ .bin).
 * Ao abrir: baixa o que mudou (vale o mais novo, pelo campo "atualizado"). Ao fechar e de tempos em tempos: envia o que mudou aqui.
 * Mídias (vídeo/áudio) só sobem se a pessoa quiser, e só descem quando alguém pede "Baixar".
 * Os ajustes deste computador (telão, NDI, câmeras…) NÃO são sincronizados.
 * Usa S, DB, Midia, NO_APP, toast, renderMidias… (em tempo de execução).
 */

const Sync = { estado: { vistos: {}, enviados: {}, removidos: [] }, pedidos: {}, seq: 0, sujo: false, ocupado: false, ultimo: 0, erro: null, timer: 0 };

const GRUPOS_SYNC = [
  { sub: 'config', store: 'config', filtro: r => r.id === 'agenda' || r.id === 'eucaristia' || r.id === 'pix' },
  { sub: 'roteiros', store: 'roteiros' },
  { sub: 'cantos', store: 'cantos' },
  { sub: 'oracoes', store: 'oracoes' },
  { sub: 'apresentacoes', store: 'midias', filtro: r => r.tipo === 'apresentacao' },
  { sub: 'biblias', store: 'biblias' },
];
const ligadaSync = () => NO_APP && (S.config.syncModo === 'google' || (S.config.syncModo === 'pasta' && S.config.syncPasta));

// Conversa com o aplicativo (operações de arquivo na pasta / no Google Drive)
function arqApp(acao, dados = {}, tempo = 300000) {
  return new Promise((ok, falha) => {
    const id = 's' + (++Sync.seq);
    const relogio = setTimeout(() => { delete Sync.pedidos[id]; falha(new Error('o programa não respondeu')); }, tempo);
    Sync.pedidos[id] = r => { clearTimeout(relogio); r.ok ? ok(r) : falha(new Error(r.erro || 'erro')); };
    window.chrome.webview.postMessage({ tipo: 'arquivo', id, acao, ...dados });
  });
}

async function carregarEstadoSync() {
  const r = await DB.obter('config', 'sync');
  Sync.estado = Object.assign({ vistos: {}, enviados: {}, removidos: [] }, r?.valor || {});
}
let timerEstado = 0;
function salvarEstadoSync(agora = false) {
  clearTimeout(timerEstado);
  const f = () => DB.salvar('config', { id: 'sync', valor: Sync.estado }, { daNuvem: true });
  if (agora) return f();
  timerEstado = setTimeout(f, 1000);
}

async function conectarArmazem() {
  await arqApp('definirRaiz', { modo: S.config.syncModo, raiz: S.config.syncPasta || '' });
}

function progresso(txt) {
  const el = $('#syncProgresso');
  if (el) { el.hidden = !txt; el.querySelector('span').textContent = txt || ''; }
  if (txt && typeof statusAbertura === 'function') statusAbertura('Nuvem: ' + txt.replace(/…$/, '') + '…');
  try { renderSync(txt); } catch (_) {}
}

// ---------- baixar (ao abrir) ----------
async function puxarSync() {
  let novos = 0;
  for (const g of GRUPOS_SYNC) {
    const arqs = (await arqApp('listar', { sub: g.sub })).arquivos.filter(a => a.nome.endsWith('.json'));
    const mudados = arqs.filter(a => Sync.estado.vistos[`${g.sub}/${a.nome}`] !== a.mtime);
    for (let i = 0; i < mudados.length; i += 40) {
      progresso(`Baixando ${g.sub}… ${Math.min(i + 40, mudados.length)}/${mudados.length}`);
      const lote = mudados.slice(i, i + 40);
      const itens = (await arqApp('lerVarios', { caminhos: lote.map(a => `${g.sub}/${a.nome}`) })).itens;
      for (const it of itens) {
        const a = lote.find(x => `${g.sub}/${x.nome}` === it.caminho);
        if (!it.texto) continue;
        let obj; try { obj = JSON.parse(it.texto); } catch (_) { continue; }
        if (!obj?.id || (g.filtro && !g.filtro(obj))) continue;
        const local = await DB.obter(g.store, obj.id);
        if (!local || (obj.atualizado || 0) > (local.atualizado || 0)) {
          if (g.store === 'midias' && local?.blob) obj.blob = local.blob;
          await DB.salvar(g.store, obj, { daNuvem: true });
          novos++;
        }
        Sync.estado.vistos[it.caminho] = a.mtime;
        const k = `${g.store}:${obj.id}`;
        Sync.estado.enviados[k] = Math.max(Sync.estado.enviados[k] || 0, obj.atualizado || 0);
      }
    }
  }
  // apagados em outro computador
  const rem = (await arqApp('listar', { sub: 'removidos' })).arquivos.filter(a => !Sync.estado.vistos[`removidos/${a.nome}`]);
  if (rem.length) {
    const itens = (await arqApp('lerVarios', { caminhos: rem.map(a => `removidos/${a.nome}`) })).itens;
    for (const it of itens) {
      try {
        const x = JSON.parse(it.texto);
        const local = await DB.obter(x.store, x.id);
        if (local && (local.atualizado || 0) <= x.quando) { await DB.remover(x.store, x.id, { daNuvem: true }); novos++; }
      } catch (_) {}
      Sync.estado.vistos[it.caminho] = rem.find(a => `removidos/${a.nome}` === it.caminho)?.mtime || 1;
    }
  }
  // catálogo de mídias na nuvem (só a ficha; o arquivo desce quando alguém pede)
  const fichas = (await arqApp('listar', { sub: 'midias' })).arquivos.filter(a => a.nome.endsWith('.json') && Sync.estado.vistos[`midias/${a.nome}`] !== a.mtime);
  if (fichas.length) {
    const itens = (await arqApp('lerVarios', { caminhos: fichas.map(a => `midias/${a.nome}`) })).itens;
    for (const it of itens) {
      try {
        const f = JSON.parse(it.texto);
        const local = await DB.obter('midias', f.id);
        if (!local) { await DB.salvar('midias', { ...f, nuvem: true, soNuvem: true, blob: null }, { daNuvem: true }); novos++; }
        else if (!local.nuvem) await DB.salvar('midias', { ...local, nuvem: true }, { daNuvem: true });
      } catch (_) {}
      Sync.estado.vistos[it.caminho] = fichas.find(a => `midias/${a.nome}` === it.caminho)?.mtime || 1;
    }
  }
  // vídeos/áudios das pastas que alguém mandou para a nuvem (só as fichas; o arquivo desce quando pedem ⬇)
  const pastas = (await arqApp('listar', { sub: 'pastas' })).arquivos.filter(a => a.nome.endsWith('.json') && Sync.estado.vistos[`pastas/${a.nome}`] !== a.mtime);
  if (pastas.length) {
    Sync.estado.pastas ||= {};
    const itens = (await arqApp('lerVarios', { caminhos: pastas.map(a => `pastas/${a.nome}`) })).itens;
    for (const it of itens) {
      try { const f = JSON.parse(it.texto); Sync.estado.pastas[f.chave] = f; } catch (_) {}
      Sync.estado.vistos[it.caminho] = pastas.find(a => `pastas/${a.nome}` === it.caminho)?.mtime || 1;
    }
    novos += itens.length;
  }
  await salvarEstadoSync(true);
  return novos;
}

// ---------- enviar (ao fechar e de tempos em tempos) ----------
const NOME_GRUPO = { config: 'agenda e ajustes', roteiros: 'roteiros', cantos: 'cantos', oracoes: 'orações', apresentacoes: 'apresentações', biblias: 'Bíblias' };
const mudadosDe = async g => (await DB.todos(g.store)).filter(r => !g.filtro || g.filtro(r))
  .filter(r => { const k = `${g.store}:${r.id}`; return !(k in Sync.estado.enviados) || (r.atualizado || 0) > Sync.estado.enviados[k]; });

// aoAndar(feitos, total, grupo): para mostrar o andamento (ex.: barra da janela de fechar)
async function enviarSync(aoAndar) {
  let enviados = 0;
  const pendentes = [];
  for (const g of GRUPOS_SYNC) pendentes.push([g, await mudadosDe(g)]);
  const total = pendentes.reduce((n, [, m]) => n + m.length, 0) + Sync.estado.removidos.length;
  aoAndar?.(0, total, '');
  for (const [g, mudados] of pendentes) {
    // lotes por tamanho (Bíblias são grandes: vão uma a uma)
    let lote = [], peso = 0;
    const despachar = async () => {
      if (!lote.length) return;
      progresso(`Enviando ${g.sub}… (${enviados + lote.length})`);
      aoAndar?.(enviados, total, NOME_GRUPO[g.sub] || g.sub);
      const r = await arqApp('gravarVarios', { itens: lote.map(x => ({ caminho: x.caminho, texto: x.texto })) });
      for (const gv of r.gravados) Sync.estado.vistos[gv.caminho] = gv.mtime;
      for (const x of lote) Sync.estado.enviados[x.k] = x.atualizado;
      enviados += lote.length; lote = []; peso = 0;
      aoAndar?.(enviados, total, NOME_GRUPO[g.sub] || g.sub);
      salvarEstadoSync();
    };
    for (const reg of mudados) {
      const copia = g.store === 'midias' ? { ...reg, blob: undefined } : reg;
      const texto = JSON.stringify(copia);
      lote.push({ caminho: `${g.sub}/${reg.id}.json`, texto, k: `${g.store}:${reg.id}`, atualizado: reg.atualizado || 0 });
      peso += texto.length;
      if (lote.length >= 60 || peso > 3e6) await despachar();
    }
    await despachar();
  }
  // apagados aqui → marca na nuvem e remove o arquivo
  const pend = Sync.estado.removidos.splice(0);
  for (const x of pend) {
    const sub = GRUPOS_SYNC.find(g => g.store === x.store && (x.store !== 'midias' || x.apresentacao))?.sub;
    if (!sub) continue;
    const r = await arqApp('gravarVarios', { itens: [{ caminho: `removidos/${x.store}__${x.id}.json`, texto: JSON.stringify(x) }] });
    Sync.estado.vistos[`removidos/${x.store}__${x.id}.json`] = r.gravados[0].mtime;
    await arqApp('apagar', { caminho: `${sub}/${x.id}.json` }).catch(() => {});
    delete Sync.estado.enviados[`${x.store}:${x.id}`];
    enviados++;
    aoAndar?.(enviados, total, 'itens apagados');
  }
  await salvarEstadoSync(true);
  return enviados;
}

// Ciclo completo (botão "Sincronizar agora"): baixa e envia
async function sincronizarAgora({ silencioso = false } = {}) {
  if (!ligadaSync() || Sync.ocupado) return;
  Sync.ocupado = true; Sync.erro = null;
  try {
    await conectarArmazem();
    const baixados = await puxarSync();
    const enviados = await enviarSync();
    Sync.ultimo = Date.now(); Sync.sujo = false;
    if (baixados) await recarregarDadosDaNuvem();
    if (!silencioso) toast(`☁ Sincronizado: ${baixados} recebido(s), ${enviados} enviado(s).`);
  } catch (e) {
    Sync.erro = e.message;
    if (!silencioso) toast('☁ Não sincronizou: ' + e.message);
  } finally { Sync.ocupado = false; progresso(''); }
}

// Depois de receber coisas de outro computador com o programa já aberto
async function recarregarDadosDaNuvem() {
  S.cantos = await DB.todos('cantos');
  const roteiros = await DB.todos('roteiros');
  if (roteiros.length) {
    const ativo = S.roteiro?.id;
    S.roteiros = roteiros;
    S.roteiro = S.roteiros.find(r => r.id === ativo) || S.roteiros[0];
    if (typeof separarCantaveisNosRoteiros === 'function') await separarCantaveisNosRoteiros();
  }
  Oracoes.lista = await DB.todos('oracoes');
  Midia.lista = await DB.todos('midias');
  const ag = await DB.obter('config', 'agenda'); if (ag?.valor) Object.assign(Agenda.dados, ag.valor);
  if (typeof carregarPix === 'function') await carregarPix();
  try { renderCantos(); renderOracoes(); renderMidias(); renderRoteiroCab(); renderRoteiroLista(); } catch (_) {}
}

// Ao abrir o programa, antes de carregar os dados (chamado por iniciar())
async function sincronizarAoAbrir() {
  escutarRespostasSync();
  if (!ligadaSync()) return;
  await carregarEstadoSync();
  // na abertura, quem mostra o andamento é a tela de abertura (splash); a faixa antiga só se ela não existir
  const tela = $('#splash') && !$('#splash').hidden ? { hidden: true } : $('#syncAbertura');
  tela.hidden = false;
  try {
    await Promise.race([(async () => { await conectarArmazem(); await puxarSync(); Sync.ultimo = Date.now(); })(),
      new Promise((_, f) => setTimeout(() => f(new Error('a nuvem demorou demais; seguindo com os dados deste computador')), 120000))]);
  } catch (e) { Sync.erro = e.message; setTimeout(() => toast('☁ ' + e.message), 1500); }
  finally { tela.hidden = true; progresso(''); }
}

// ---------- mídias ----------
function bytesParaBase64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}

async function enviarMidiaNuvem(m) {
  if (!ligadaSync() || !m?.blob) return;
  const PEDACO = 4 * 1024 * 1024, total = m.blob.size;
  try {
    await conectarArmazem();
    for (let ini = 0; ini < total || ini === 0; ini += PEDACO) {
      const u8 = new Uint8Array(await m.blob.slice(ini, ini + PEDACO).arrayBuffer());
      const fim = ini + PEDACO >= total;
      toast(`☁ Enviando "${m.nome}"… ${Math.min(100, Math.round((ini + u8.length) / Math.max(1, total) * 100))}%`);
      await arqApp('gravarBinario', { caminho: `midias/${m.id}.bin`, inicio: ini, base64: bytesParaBase64(u8), fim });
      if (fim) break;
    }
    const ficha = { id: m.id, tipo: m.tipo, nome: m.nome, arquivo: m.arquivo, mime: m.mime, tamanho: m.tamanho, duracao: m.duracao, criado: m.criado, atualizado: Date.now() };
    await arqApp('gravarVarios', { itens: [{ caminho: `midias/${m.id}.json`, texto: JSON.stringify(ficha) }] });
    m.nuvem = true;
    await DB.salvar('midias', m, { daNuvem: true });
    renderMidias();
    toast(`☁ "${m.nome}" está na nuvem.`);
  } catch (e) { alert(`Não foi possível enviar "${m.nome}" para a nuvem:\n${e.message}`); }
}

async function baixarMidiaNuvem(m) {
  const PEDACO = 4 * 1024 * 1024, partes = [];
  try {
    await conectarArmazem();
    let ini = 0, total = 1;
    while (ini < total) {
      const r = await arqApp('lerBinario', { caminho: `midias/${m.id}.bin`, inicio: ini, tamanho: PEDACO });
      total = r.total;
      const bin = atob(r.base64), u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      if (!u8.length) break;
      partes.push(u8); ini += u8.length;
      toast(`☁ Baixando "${m.nome}"… ${Math.round(ini / Math.max(1, total) * 100)}%`);
    }
    m.blob = new Blob(partes, { type: m.mime || '' });
    m.soNuvem = false;
    await DB.salvar('midias', m, { daNuvem: true });
    renderMidias(); renderSlides();
    toast(`☁ "${m.nome}" baixado neste computador.`);
  } catch (e) { alert(`Não foi possível baixar "${m.nome}":\n${e.message}`); }
}

// ---------- vídeos e áudios das PASTAS (Holyrics…) por demanda ----------
// Na nuvem: pastas/<chave>.bin + pastas/<chave>.json (ficha com o tipo e o caminho dentro da pasta, ex.: "Musicas/9. Comunhão/x.mp4").
// Quem baixa grava na MESMA subpasta da sua pasta de vídeos/áudios — e os roteiros passam a achar o arquivo.
function chavePasta(tipo, caminho) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (const ch of `${tipo}:${caminho}`) { const c = ch.codePointAt(0); h1 = Math.imul(h1 ^ c, 16777619) >>> 0; h2 = Math.imul(h2 + c, 2246822519) >>> 0; }
  return `${tipo}-${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}
const fichaPasta = m => Sync.estado.pastas?.[chavePasta(m.tipo, m.caminho)] || null;

function mostrarProgressoMidia(rotulo) {
  let ultimo = 0;
  Sync.progressoMidia = (feito, total) => {
    const pc = Math.round(feito / Math.max(1, total) * 100);
    if (pc !== ultimo) { ultimo = pc; toast(`☁ ${rotulo}… ${pc}% (${fmtTamanho(feito)} de ${fmtTamanho(total)})`); }
  };
}

// Vídeo da pasta com imagem que o motor não mostra (formato antigo "mp4v"): avisa antes de subir
function temImagem(m) {
  if (m.tipo !== 'video') return Promise.resolve(true);
  return new Promise(ok => {
    const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
    const fim = r => { v.removeAttribute('src'); ok(r); };
    v.onloadedmetadata = () => fim(!!v.videoWidth); v.onerror = () => fim(true); setTimeout(() => fim(true), 10000);
    v.src = m.url;
  });
}

async function enviarPastaNuvem(m) {
  if (!ligadaSync() || !m?.pasta || m.faltando || Sync.ocupadoMidia) return;
  if (!await temImagem(m) && !confirm(`"${m.nome}" está num formato antigo (MPEG-4 Parte 2): nas outras máquinas também vai tocar só o som.\n\nEnviar mesmo assim? (Melhor converter para H.264 antes.)`)) return;
  if (!confirm(`Enviar "${m.nome}" (${fmtTamanho(m.tamanho)}) para o Google Drive da paróquia?\nOs outros computadores poderão baixá-lo para a pasta ${m.tipo === 'video' ? 'de vídeos' : 'de áudios'} deles.`)) return;
  const chave = chavePasta(m.tipo, m.caminho);
  Sync.ocupadoMidia = true;
  try {
    await conectarArmazem();
    mostrarProgressoMidia(`Enviando "${m.nome}"`);
    await arqApp('midiaSubir', { tipoMidia: m.tipo, caminho: m.caminho, destino: `pastas/${chave}.bin` }, 6 * 3600 * 1000);
    const ficha = { chave, tipo: m.tipo, caminho: m.caminho, nome: m.nome, tamanho: m.tamanho, atualizado: Date.now() };
    const r = await arqApp('gravarVarios', { itens: [{ caminho: `pastas/${chave}.json`, texto: JSON.stringify(ficha) }] });
    (Sync.estado.pastas ||= {})[chave] = ficha;
    Sync.estado.vistos[`pastas/${chave}.json`] = r.gravados[0].mtime;
    salvarEstadoSync(true);
    toast(`☁ "${m.nome}" está na nuvem. Nos outros computadores aparece com ⬇ Baixar.`);
  } catch (e) { alert(`Não foi possível enviar "${m.nome}":\n${e.message}`); }
  finally { Sync.ocupadoMidia = false; Sync.progressoMidia = null; renderMidias(); }
}

async function baixarPastaNuvem(f) {
  if (!ligadaSync() || !f || Sync.ocupadoMidia) return;
  if (!S.config[CFG_PASTA[f.tipo]]) return alert(`Escolha antes a pasta ${f.tipo === 'video' ? 'de vídeos' : 'de áudios'} deste computador (📁 Escolher pasta).`);
  Sync.ocupadoMidia = true;
  try {
    await conectarArmazem();
    mostrarProgressoMidia(`Baixando "${f.nome}"`);
    await arqApp('midiaBaixar', { tipoMidia: f.tipo, caminho: f.caminho, origem: `pastas/${f.chave}.bin` }, 6 * 3600 * 1000);
    toast(`☁ "${f.nome}" baixado em ${f.caminho}.`);
    await lerPastaMidia(f.tipo);          // relê a pasta: o roteiro passa a achar o arquivo
  } catch (e) { alert(`Não foi possível baixar "${f.nome}":\n${e.message}`); }
  finally { Sync.ocupadoMidia = false; Sync.progressoMidia = null; renderMidias(); if (S.atual?.item.tipo === 'midia') { renderCabecalho(); renderSlides(); } }
}

// ---------- tela (Ajustes) ----------
function renderSync(trabalhando) {
  const selo = $('#estadoSync'), info = $('#syncInfo');
  const lig = ligadaSync();
  let txt;
  if (!NO_APP) txt = 'A sincronização funciona só no aplicativo MiguelAngelus.exe.';
  else if (!lig) txt = 'Desligada.';
  else if (trabalhando) txt = '☁ ' + trabalhando;
  else if (Sync.erro) txt = '⚠ ' + Sync.erro;
  else if (Sync.ultimo) txt = `☁ Sincronizado às ${new Date(Sync.ultimo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${Sync.sujo ? ' · mudanças a enviar' : ''}`;
  else txt = '☁ Ligada.';
  if (info) { info.textContent = txt; info.className = 'status ' + (Sync.erro ? 'erro' : lig ? 'ok' : ''); }
  if (selo) {
    selo.hidden = !lig;
    selo.textContent = trabalhando ? '☁ …' : Sync.erro ? '☁ ⚠' : Sync.sujo ? '☁ •' : '☁';
    selo.title = txt;
    selo.classList.toggle('erro', !!Sync.erro);
  }
  const modo = S.config.syncModo || '';
  $$('[data-syncmodo]').forEach(el => { el.hidden = el.dataset.syncmodo !== modo; });
}

async function atualizarStatusGoogle() {
  if (!NO_APP) return;
  try {
    const st = await arqApp('googleStatus');
    $('#syncGoogleInfo').innerHTML = !st.temCliente ? 'Falta carregar o arquivo do Google (ID do cliente).'
      : !st.conectado ? 'Arquivo do Google carregado. Clique em <b>Conectar</b>.'
      : `Conectado${st.email ? ' como <b>' + esc(st.email) + '</b>' : ''}.`;
    $('#btnGoogleConectar').textContent = st.conectado ? 'Conectar de novo' : 'Conectar';
    $('#btnGoogleDesconectar').hidden = !st.conectado;
  } catch (e) { $('#syncGoogleInfo').textContent = e.message; }
}

// Respostas do programa (precisa estar ouvindo já na abertura, antes do resto da tela existir)
let escutandoSync = false;
function escutarRespostasSync() {
  if (escutandoSync || !NO_APP) return;
  escutandoSync = true;
  window.chrome.webview.addEventListener('message', async e => {
    const r = e.data;
    if (r?.tipo === 'arquivoResposta' && Sync.pedidos[r.id]) { const cb = Sync.pedidos[r.id]; delete Sync.pedidos[r.id]; cb(r); }
    if (r?.tipo === 'midiaProgresso' && Sync.progressoMidia) Sync.progressoMidia(r.feito, r.total);
    // o programa vai fechar: envia o que mudou e libera
    if (r?.tipo === 'fechando') confirmarFechar();
  });
}

// ---------- ao fechar: confirmar e mandar para a nuvem ----------
const paraPrograma = msg => window.chrome.webview.postMessage(msg);
function confirmarFechar() {
  if (!ligadaSync()) return paraPrograma({ tipo: 'podeFechar' });
  ligarFechar();                                       // (caso feche antes de terminar de abrir)
  paraPrograma({ tipo: 'segurarFechar' });            // o programa espera a resposta desta janela
  const dlg = $('#dlgFechar'), pend = Sync.sujo || Sync.estado.removidos.length > 0;
  $('#fecharInfo').innerHTML = pend
    ? '<b>Há mudanças neste computador</b> que ainda não foram para a nuvem. Sincronize para os outros computadores receberem.'
    : 'Tudo o que foi feito aqui já está na nuvem. Pode sincronizar mesmo assim, para garantir.';
  $('#fecharStatus').textContent = '';
  $('#fecharBarra').hidden = true;
  dlg.querySelectorAll('button').forEach(b => { b.disabled = false; });
  $('#btnFecharSync').textContent = '☁ Sincronizar e fechar';
  if (!dlg.open) dlg.showModal();
  $('#btnFecharSync').focus();
}
async function sincronizarEFechar() {
  const dlg = $('#dlgFechar');
  dlg.querySelectorAll('button').forEach(b => { b.disabled = true; });
  const barra = $('#fecharBarra');
  barra.hidden = false; barra.removeAttribute('value');          // sem valor = barra "andando" (conectando)
  $('#fecharStatus').textContent = '☁ Conectando à nuvem…';
  try {
    await conectarArmazem();
    const n = await enviarSync((feitos, total, grupo) => {
      if (!total) { barra.max = 1; barra.value = 1; $('#fecharStatus').textContent = '☁ Nada de novo para enviar.'; return; }
      barra.max = total; barra.value = feitos;
      $('#fecharStatus').textContent = `☁ Enviando${grupo ? ' ' + grupo : ''}… ${feitos} de ${total} (${Math.round(feitos * 100 / total)}%)`;
    });
    Sync.sujo = false; Sync.ultimo = Date.now();
    barra.max = 1; barra.value = 1;
    $('#fecharStatus').textContent = `☁ Pronto: ${n} item(ns) enviado(s). Fechando…`;
    setTimeout(() => paraPrograma({ tipo: 'podeFechar' }), 900);
  } catch (e) {
    barra.hidden = true;
    $('#fecharStatus').textContent = '⚠ Não sincronizou: ' + e.message + ' (sem internet?)';
    dlg.querySelectorAll('button').forEach(b => { b.disabled = false; });
    $('#btnFecharSync').textContent = '☁ Tentar de novo';
  }
}
let fecharLigado = false;
function ligarFechar() {
  const dlg = $('#dlgFechar');
  if (!dlg || fecharLigado) return;
  fecharLigado = true;
  $('#btnFecharSync').addEventListener('click', sincronizarEFechar);
  $('#btnFecharSem').addEventListener('click', () => paraPrograma({ tipo: 'podeFechar' }));
  const cancelar = () => { if (dlg.open) dlg.close(); paraPrograma({ tipo: 'cancelarFechar' }); };
  $('#btnFecharCancelar').addEventListener('click', cancelar);
  dlg.addEventListener('cancel', e => { e.preventDefault(); if (!$('#btnFecharCancelar').disabled) cancelar(); });   // Esc
}

function ligarSincronia() {
  ligarFechar();
  if (!NO_APP) { renderSync(); return; }
  escutarRespostasSync();
  DB.aoMudar = () => { Sync.sujo = true; renderSync(); };
  DB.aoRemover = (store, id) => {
    const apresentacao = store === 'midias' && Midia.lista.find(m => m.id === id)?.tipo === 'apresentacao';
    if (!['roteiros', 'cantos', 'oracoes', 'biblias'].includes(store) && !apresentacao) return;
    Sync.estado.removidos.push({ store, id, quando: Date.now(), apresentacao });
    Sync.sujo = true; salvarEstadoSync(); renderSync();
  };
  // envia de tempos em tempos (a cada 3 min, se houver mudança)
  setInterval(() => { if (Sync.sujo && !Sync.ocupado) sincronizarAgora({ silencioso: true }).then(() => renderSync()); }, 180000);

  $('#syncModo').addEventListener('change', e => {
    S.config.syncModo = e.target.value; salvarConfig(); renderSync();
    if (S.config.syncModo === 'google') atualizarStatusGoogle();
  });
  $('#btnSyncPasta').addEventListener('click', async () => {
    try { const r = await arqApp('escolherPasta'); if (r.ok && r.pasta) { S.config.syncPasta = r.pasta; $('#syncPasta').value = r.pasta; salvarConfig(); renderSync(); } } catch (_) {}
  });
  $('#btnGoogleArquivo').addEventListener('click', async () => {
    try { await arqApp('googleCarregarCliente'); } catch (e) { if (e.message !== 'cancelado') alert(e.message); }
    atualizarStatusGoogle();
  });
  $('#btnGoogleConectar').addEventListener('click', async () => {
    $('#syncGoogleInfo').textContent = 'Abrindo o navegador: entre com a conta da paróquia e autorize o MiguelAngelus…';
    try { await arqApp('googleConectar'); } catch (e) { alert('Não foi possível conectar:\n' + e.message); }
    atualizarStatusGoogle();
  });
  $('#btnGoogleDesconectar').addEventListener('click', async () => {
    if (!confirm('Desconectar este computador do Google Drive? (Nada é apagado na nuvem.)')) return;
    await arqApp('googleDesconectar'); atualizarStatusGoogle();
  });
  $('#btnSyncAgora').addEventListener('click', () => sincronizarAgora());
  $('#estadoSync').addEventListener('click', () => abrirAjustes('sync'));
  $('#syncModo').value = S.config.syncModo || '';
  $('#syncPasta').value = S.config.syncPasta || '';
  renderSync();
  if (S.config.syncModo === 'google') atualizarStatusGoogle();
}
