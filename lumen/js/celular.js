'use strict';
/*
 * Controle pelo celular (Ferramentas → Ajustes → 📱 Controle pelo celular). Para a PASCOM controlar o telão andando pela igreja.
 * O programa (app\Celular.cs) abre um servidor pequeno na rede local; a página do celular fica em celular/index.html.
 * Este arquivo:
 *  - mostra o QR code (endereço + código de 4 dígitos) e os celulares pareados;
 *  - manda para os celulares o estado ao vivo (roteiro, slide no ar, próximo, tela preta, aviso, tema, câmeras, mídia);
 *  - executa os comandos que chegam deles (Próximo, Anterior, abrir item, Tela preta, Aviso…).
 * Usa S, Midia, Camera, Avisos, TEMAS, resumoItem, projetar, proximo… de app.js e companhia (em tempo de execução).
 */
const Cel = { info: null, timer: 0, ultimo: '' };

const postarApp = m => { if (NO_APP) window.chrome.webview.postMessage(m); };

// Slide sem a imagem (o celular mostra só o texto; imagens grandes não passam pela rede a cada mudança)
function slideCelular(s) {
  if (!s) return null;
  return {
    texto: s.texto || '', versos: s.versos ? s.versos.map(v => ({ n: v.n, t: v.t })) : null,
    refrao: !!s.refrao, numerado: !!s.numerado, img: !!s.img, rodape: s.rodape || '',
  };
}

function tituloItem(it) {
  try { return it ? resumoItem(it).tit || '' : ''; } catch (_) { return ''; }
}

// Roteiros para o celular trocar (como os cards): próximas, sem data e as anteriores mais recentes.
// Guardado em cache: só refaz quando algum roteiro muda (o estado vai para o celular várias vezes por segundo).
function roteirosCelular() {
  const hoje = isoData(new Date());
  const chave = S.roteiros.map(r => r.id + ':' + r.atualizado).join() + '|' + hoje;
  if (Cel.cacheRot?.chave === chave) return Cel.cacheRot.dados;
  const todos = S.roteiros.map(r => {
    const inf = infoRoteiro(r), lit = liturgiaDoRoteiro(r, inf), loc = localDe(inf.localId);
    const quando = inf.data ? `${DIAS_CURTOS[inf.data.getDay()]} ${String(inf.data.getDate()).padStart(2, '0')}/${String(inf.data.getMonth() + 1).padStart(2, '0')}${inf.hora ? ' · ' + inf.hora : ''}` : 'sem data';
    return { id: r.id, nome: r.nome, iso: inf.iso || '', hora: inf.hora || '', quando, lit: lit.titulo || '', cor: lit.corHex, corTxt: lit.cor === 'branco' ? '#2a2a2a' : '#fff',
      local: loc ? nomeCurtoLocal(loc) : '', localId: loc ? loc.id : '', corLocal: loc?.cor || '', itens: r.itens.length, atualizado: r.atualizado };
  });
  const ord = (a, b) => (a.iso + a.hora).localeCompare(b.iso + b.hora);
  const lista = [
    ...todos.filter(x => x.iso && x.iso >= hoje).sort(ord).slice(0, 60).map(x => ({ ...x, grupo: 'proximas' })),
    ...todos.filter(x => !x.iso).sort((a, b) => b.atualizado - a.atualizado).slice(0, 10).map(x => ({ ...x, grupo: 'semdata' })),
    ...todos.filter(x => x.iso && x.iso < hoje).sort((a, b) => ord(b, a)).slice(0, 15).map(x => ({ ...x, grupo: 'anteriores' })),
  ].map(({ atualizado, ...x }) => x);
  const locais = [...new Map(lista.filter(x => x.localId).map(x => [x.localId, { id: x.localId, nome: x.local, cor: x.corLocal }])).values()];
  const dados = { lista, locais, hoje };
  Cel.cacheRot = { chave, dados };
  return dados;
}

function estadoCelular() {
  const a = S.atual, live = S.live || {}, itens = S.roteiro?.itens || [];
  const vivoIdx = live.item ? itens.indexOf(live.item) : -1;
  // o que o botão "Próximo" vai fazer
  let prox = null;
  if (a && a.idx < a.slides.length - 1) prox = { tit: tituloItem(a.item), slide: slideCelular(a.slides[a.idx + 1]) };
  else if (a && a.rIdx >= 0 && a.rIdx < itens.length - 1) {
    const it = itens[a.rIdx + 1];
    let s = null;
    try { s = gerarSlides(it)[0] || null; } catch (_) {}
    prox = { tit: tituloItem(it), slide: slideCelular(s), abre: true };
  }
  const tocando = [];
  if (Midia.audioId) { const m = midiaPorId(Midia.audioId), e = estadoDe(m); if (m && e) tocando.push({ id: m.id, nome: m.nome, tipo: 'audio', pausado: !!e.pausado, t: e.t || 0, dur: e.dur || 0 }); }
  if (Midia.video.ativo) { const m = midiaPorId(Midia.video.id); if (m) tocando.push({ id: m.id, nome: m.nome, tipo: 'video', pausado: !!Midia.video.pausado, t: Midia.video.t || 0, dur: Midia.video.dur || 0 }); }
  const mAberta = a && ehPlayer(a.item) ? midiaDe(a.item) : null;
  const cfg = configTelao();
  return {
    roteiro: S.roteiro?.nome || '', roteiroId: S.roteiro?.id || '', roteiros: roteirosCelular(),
    itens: itens.map(it => { let r = { rot: '', tit: '' }; try { r = resumoItem(it); } catch (_) {} return { rot: r.rot, tit: r.tit, tipo: it.tipo }; }),
    vivoIdx,
    aberto: a ? {
      rIdx: a.rIdx, tit: tituloItem(a.item), tipo: a.item.tipo, idx: a.idx,
      slides: a.slides.slice(0, 80).map(slideCelular),
      midia: mAberta && (mAberta.tipo === 'video' || mAberta.tipo === 'audio') ? { id: mAberta.id, nome: mAberta.nome, tipo: mAberta.tipo } : null,
    } : null,
    noAr: {
      slide: slideCelular(live.slide), tit: live.altar ? 'Altar' : tituloItem(live.item),
      idx: live.item && a && a.item === live.item ? live.idx : -1, total: live.item && a && a.item === live.item ? a.slides.length : 0,
    },
    prox,
    preto: !!live.preto, altar: !!live.altar, pix: !!S.pixNoAr, temPix: !!(typeof Pix !== 'undefined' && Pix.qr),
    projecao: !!(S.projWin && !S.projWin.closed),
    aviso: Avisos.atual ? { texto: semMarcasAviso(Avisos.atual.texto) } : null,
    recentes: Avisos.recentes.map(x => semMarcasAviso(x.texto)),
    salvos: AvPar.convites.map(x => semMarcasAviso(x.texto)),
    temas: TEMAS.map(t => { const c = t.id === 'ajustes' ? S.config : coresDoTema(t); return { id: t.id, nome: t.nome, fundo: c.corFundo || '#000', texto: c.corTexto || '#fff' }; }),
    tema: temaAtual(),
    cameras: Midia.lista.filter(m => m.tipo === 'camera').sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR')).map(c => ({ id: c.id, nome: c.nome,
      ptz: !!c.ptz?.ip, posicoes: (c.ptzPosicoes || []).slice().sort((a, b) => a.n - b.n).map(p => ({ n: p.n, nome: p.nome })) })),
    camera: Camera.ativa, letra: !!Camera.letra,
    tocando, volume: volumeMidia(),
    cfg: { corRotulo: cfg.corRotulo || '#ff5a4f', mostrarRotulos: cfg.mostrarRotulos !== false, espacoResposta: cfg.espacoResposta !== false },
  };
}

// Manda o estado (no máximo ~4 vezes por segundo e só quando muda)
function agendarEstadoCelular() {
  if (!Cel.info?.ligado) return;
  clearTimeout(Cel.timer);
  Cel.timer = setTimeout(() => {
    let e;
    try { e = estadoCelular(); } catch (err) { console.warn('estado do celular', err); return; }
    // cantos com cifra do roteiro (app dos músicos): separado e só quando muda
    try {
      const mu = musicaCelular(), jm = JSON.stringify(mu);
      if (jm !== Cel.ultimaMusica) { Cel.ultimaMusica = jm; postarApp({ tipo: 'celular', acao: 'musica', musica: mu }); }
    } catch (err) { console.warn('cifras do celular', err); }
    const j = JSON.stringify(e);
    if (j === Cel.ultimo) return;
    Cel.ultimo = j;
    postarApp({ tipo: 'celular', acao: 'estado', estado: e });
  }, 120);
}

// ---------- Comandos que chegam do celular ----------

function comandoCelular(c) {
  const a = S.atual;
  switch (c.acao) {
    case 'proximo': proximo(); break;
    case 'anterior': anterior(); break;
    case 'item': {        // abre o item do roteiro (como clicar nele no computador); projetar continua sendo no Próximo / no slide
      const it = S.roteiro.itens[+c.i];
      if (it) abrirItem(it, +c.i);
      break;
    }
    case 'roteiro': {     // trocar de roteiro (como clicar no card no computador)
      const r = S.roteiros.find(x => x.id === c.id);
      if (r && r !== S.roteiro) { trocarRoteiro(r); toast(`📱 Roteiro aberto pelo celular: ${r.nome}`); }
      break;
    }
    case 'slide': if (a && +c.i >= 0 && +c.i < a.slides.length && !ehPlayer(a.item)) projetar(+c.i); break;
    case 'preto': alternarPreto(); break;
    case 'limpar': limpar(); break;
    case 'projecao': alternarProjecao(); setTimeout(agendarEstadoCelular, 800); break;   // abre/fecha a janela do telão
    case 'altar': alternarAltar(); break;
    case 'pix': alternarPix(); break;
    case 'aviso': {
      const texto = String(c.texto || '').trim().replace(/\s*\n\s*/g, ' ').slice(0, 300);
      if (texto) mostrarAviso({ tipo: 'livre', texto, icone: ICONE_AVISO.livre, duracao: S.config.avisoDuracao ?? 60, pos: S.config.avisoPosicao || 'alto' });
      break;
    }
    case 'avisoSalvo': { const r = AvPar.convites[+c.i]; if (r) mostrarAviso({ tipo: 'livre', texto: r.texto, icone: ICONE_AVISO.livre, duracao: S.config.avisoDuracao ?? 60, pos: S.config.avisoPosicao || 'alto' }); break; }
    case 'avisoRecente': { const r = Avisos.recentes[+c.i]; if (r) mostrarAviso({ ...r, duracao: S.config.avisoDuracao ?? 60, pos: S.config.avisoPosicao || 'alto' }); break; }
    case 'avisoRepetir': if (Avisos.atual) mostrarAviso(Avisos.atual); break;
    case 'avisoRetirar': retirarAviso(); break;
    case 'tema': if (TEMAS.some(t => t.id === c.id)) escolherTema(c.id); break;
    case 'camera': {
      const cam = Midia.lista.find(m => m.id === c.id && m.tipo === 'camera');
      if (cam) mostrarCamera(cam, null); else pararCamera();
      break;
    }
    case 'letra': definirLetraCamera(!!c.on); break;
    // câmera PTZ (ptz.js): o celular repete "mover" enquanto o dedo está na seta; sem repetição, para sozinha
    case 'ptzIr': case 'ptzMover': case 'ptzZoom': case 'ptzParar': case 'ptzHome': {
      const cam = Midia.lista.find(m => m.id === c.id && temPtz(m));
      if (!cam) break;
      if (c.acao === 'ptzIr') ptzIrPara(cam, +c.n);
      else if (c.acao === 'ptzHome') ptzHome(cam);
      else if (c.acao === 'ptzParar') { ptzParar(cam); ptzZoom(cam, 0); }
      else if (c.acao === 'ptzMover') ptzMoverPorUmTempo(cam, Math.sign(+c.dx || 0), Math.sign(+c.dy || 0), 0.5);
      else if (c.acao === 'ptzZoom') { ptzZoom(cam, Math.sign(+c.z || 0)); clearTimeout(PTZ.zoomCel); PTZ.zoomCel = setTimeout(() => ptzZoom(cam, 0), 700); }
      return;      // não precisa redesenhar nada
    }
    case 'midiaTocar': {
      const m = midiaPorId(c.id);
      if (m) tocarPausar(m, a && midiaDe(a.item) === m ? a.item : null);
      break;
    }
    case 'midiaParar': pararMidia(midiaPorId(c.id)); break;
    case 'volume': {
      const v = Math.max(0, Math.min(1, +c.v || 0));
      S.config.volumeMidia = v; salvarConfig();
      if (Midia.audioId) Midia.audio.volume = v;
      if (Midia.video.ativo) enviar({ tipo: 'midia', acao: 'volume', v });
      const s = $('#plVol'); if (s) s.value = v;
      break;
    }
  }
  agendarEstadoCelular();
}

// ---------- Ajustes: QR code, endereço, celulares pareados ----------

function qrSvg(texto) {
  const q = qrcode(0, 'M');
  q.addData(texto);
  q.make();
  return q.createSvgTag({ cellSize: 6, margin: 3, scalable: true });
}

function renderCelular() {
  const el = $('#celPainel');
  if (!el) return;
  $('#celLigado').checked = !!S.config.celularLigado;
  if (!NO_APP) { el.innerHTML = '<p class="status">O controle pelo celular funciona só no aplicativo do MiguelAngelus para Windows.</p>'; return; }
  const i = Cel.info;
  if (!S.config.celularLigado) { el.innerHTML = '<p class="sutil pequeno">Desligado: nenhum celular consegue se conectar.</p>'; return; }
  if (!i) { el.innerHTML = '<p class="sutil pequeno">Ligando…</p>'; return; }
  if (i.erro) { el.innerHTML = `<p class="status erro">Não consegui ligar o controle: ${esc(i.erro)}</p>`; return; }
  if (!i.ips.length) { el.innerHTML = '<p class="status erro">Este computador não está conectado a nenhuma rede (Wi-Fi ou cabo).</p>'; return; }
  // Rede dos celulares: com mais de uma (ex.: Wi-Fi da igreja + roteador só do MiguelAngelus no cabo), escolhe-se qual vai
  // no QR code; fica lembrada neste computador pelo nome da placa ("Ethernet 3"), que não muda quando o IP muda
  const redes = i.redes?.length ? i.redes : i.ips.map(ip => ({ ip, nome: '', internet: true, publica: false }));
  const rede = redes.find(r => r.nome && r.nome === S.config.celularRede) || redes.find(r => r.ip === S.config.celularRede) || redes[0];
  const url = `http://${rede.ip}:${i.porta}/?c=${i.codigo}`;
  const nomeRede = r => `${r.nome ? r.nome + ' — ' : ''}${r.ip} (${r.internet ? 'com internet' : 'só local, sem internet'})`;
  el.innerHTML = `
    ${redes.length > 1 ? `<label class="campo cel-rede">Rede dos celulares <span class="linha">
      <select data-cel-rede>${redes.map(r => `<option value="${esc(r.nome || r.ip)}" ${r === rede ? 'selected' : ''}>${esc(nomeRede(r))}</option>`).join('')}</select>
      <button type="button" data-cel-atualizar title="Ler as redes do computador de novo">↻</button></span></label>` : ''}
    ${rede.bloqueada ? `<p class="status erro">O <b>Firewall do Windows</b> não deixa os celulares chegarem ao MiguelAngelus pela rede
      <b>${esc(rede.nome)}</b> (ela está como <b>${rede.publica ? 'Pública' : 'Privada'}</b>). Para liberar: no Windows, abra
      <b>Permitir um aplicativo pelo Firewall do Windows</b> → <b>Alterar configurações</b> → no <b>MiguelAngelus</b>, marque
      <b>${rede.publica ? 'Pública' : 'Privada'}</b> → <b>OK</b>. Depois clique em ↻.</p>` : ''}
    <div class="cel-par">
      <div class="cel-qr" title="${esc(url)}">${qrSvg(url)}</div>
      <div class="cel-txt">
        <p><b>1.</b> No celular, conecte ${rede.internet ? 'no <b>mesmo Wi-Fi</b> deste computador' :
          'no Wi-Fi do <b>roteador do MiguelAngelus</b>. Ele não tem internet: se o celular perguntar, toque em <b>Manter conexão</b> (o resto do celular segue pelo 4G)'}.</p>
        <p><b>2.</b> Aponte a câmera do celular para o QR code.</p>
        <div class="cel-digitar">
          <div class="sutil pequeno">Sem câmera, ou ela não lê o QR (tablet antigo)? Digite no navegador, na barra de endereço:</div>
          <div class="cel-end" title="Digite exatamente assim, com o http:// e os dois-pontos">http://${esc(rede.ip)}:${i.porta}</div>
          <div class="sutil pequeno">e, quando a página pedir, o código:</div>
        </div>
        <p>Código: <span class="cel-cod">${esc(i.codigo.split('').join(' '))}</span></p>
        <p class="sutil pequeno">🎸 <b>Músicos</b>: o mesmo QR; no celular, escolham <b>Músico</b> — veem só as cifras dos cantos, acompanhando o telão.</p>
        <p class="sutil pequeno">Cada código serve para um celular; depois de usado, aparece outro.</p>
      </div>
    </div>
    <div class="campo">Celulares pareados</div>
    ${i.aparelhos.length ? `<div class="cel-lista">${i.aparelhos.map(p => `
      <div class="cel-ap"><span class="cel-pt ${p.online ? 'on' : ''}" title="${p.online ? 'Conectado agora' : 'Desconectado'}"></span>
        <span class="cel-nome">${p.papel === 'musico' ? '🎸' : '📱'} ${esc(p.nome)} <span class="sutil pequeno">${p.papel === 'musico' ? 'músico (só vê as cifras)' : 'controle'}</span></span>
        <span class="sutil pequeno">${p.online ? 'conectado' : 'desde ' + new Date(p.desde).toLocaleDateString('pt-BR')}</span>
        <button type="button" data-cel-tirar="${esc(p.id)}" title="Este celular não controla mais o telão (precisa parear de novo)">Tirar</button></div>`).join('')}</div>`
      : '<p class="sutil pequeno">Nenhum ainda.</p>'}
    <p class="sutil pequeno">Se o Windows perguntar sobre o <b>Firewall</b>, marque <b>Redes privadas</b> e clique em <b>Permitir acesso</b>.
      Se o celular não abrir a página, confira se o Wi-Fi deste computador está como <b>rede privada</b> (Configurações → Rede e Internet).</p>`;
}

function ligarCelular() {
  $('#celLigado').addEventListener('change', e => {
    S.config.celularLigado = e.target.checked;
    salvarConfig();
    Cel.info = null; Cel.ultimo = ''; Cel.ultimaMusica = '';
    postarApp({ tipo: 'celular', acao: e.target.checked ? 'ligar' : 'desligar' });
    renderCelular();
  });
  $('#celPainel').addEventListener('change', e => {
    if (!e.target.matches('[data-cel-rede]')) return;
    S.config.celularRede = e.target.value;       // fica só neste computador (os outros têm outras placas)
    salvarConfig();
    renderCelular();
  });
  $('#celPainel').addEventListener('click', e => {
    if (e.target.closest('[data-cel-atualizar]')) return postarApp({ tipo: 'celular', acao: 'info' });
    const b = e.target.closest('[data-cel-tirar]');
    if (b && confirm('Tirar este celular? Ele não vai mais controlar o telão (para voltar, precisa parear de novo).'))
      postarApp({ tipo: 'celular', acao: 'tirar', id: b.dataset.celTirar });
  });
  if (NO_APP) {
    window.chrome.webview.addEventListener('message', e => {
      const m = e.data;
      if (m?.tipo === 'celularInfo') {
        const ligouAgora = m.ligado && !Cel.info?.ligado;
        Cel.info = m;
        renderCelular();
        if (ligouAgora) Cel.ultimaMusica = '';
        if (ligouAgora || m.aparelhos?.some(p => p.online)) { Cel.ultimo = ''; agendarEstadoCelular(); }   // quem acabou de entrar recebe o estado
      } else if (m?.tipo === 'celularComando' && m.comando) {
        try { comandoCelular(m.comando); } catch (err) { console.warn('comando do celular', err); }
      }
    });
    if (S.config.celularLigado) postarApp({ tipo: 'celular', acao: 'ligar' });
  }
  // tudo o que muda a tela de controle também muda o celular
  for (const nome of ['renderControles', 'renderSlides', 'renderRoteiroLista', 'renderAvisoAtivo', 'renderTemasRapidos',
    'renderCameraAtiva', 'renderTocando', 'renderEstadoProj']) {
    const original = window[nome];
    if (typeof original !== 'function') continue;
    window[nome] = function (...args) { const r = original.apply(this, args); agendarEstadoCelular(); return r; };
  }
  renderCelular();
}
