'use strict';
/*
 * (1.9.6 · Secretaria 1.3.0) 💝 Campanhas de arrecadação (reforma, festa, obra social…).
 *
 * Quem cria e atualiza é a Secretaria MiguelAngelus: título, descrição, a arte feita no Canva, o QR code do Pix da
 * campanha e a chave, a meta e quanto já foi arrecadado (ou só o percentual), e se os valores aparecem no telão.
 * Pausar / Encerrar / Reabrir. Encerrada some do telão; se a Secretaria marcar "agradecimento", vira um slide de
 * agradecimento com o resultado.
 *
 * O QR e a chave de cada campanha ficam protegidos por uma senha de 4 números da própria campanha (como o 💠 Pix do
 * MiguelAngelus, pix.js: só o hash PBKDF2 fica guardado) — ninguém troca o Pix da campanha por outro sem a senha.
 *
 * Vão pela nuvem numa pasta própria ("campanhas/", um arquivo por campanha: secc-<id>). O MiguelAngelus só LÊ:
 * o item de roteiro "💝 Campanhas" mostra o andamento de agora (um slide por campanha, passando sozinhos, como o
 * "Apresentar eventos" — eventos.js, Show). Nada de dados pessoais: só o que vai para o telão.
 * Usa $, $$, esc, uid, toast, S, lerItensSec, gravarItemSec, apagarItemSec, carregarImagem, linhasCanvas, corComAlfa,
 * hashSenha, hexDe, pedirSenha, lerReais, abrirDialogo, arqApp, escolherPastaImagens, NO_APP (em tempo de execução).
 */

const Camp = { lista: [], editando: null, arte: '', qr: '', senha: null, liberada: false, erros: 0, travadoAte: 0, versaoAberta: 0, imgs: {}, gerando: {} };

async function carregarCampanhas() { Camp.lista = await lerItensSec('camp'); }

const STATUS_CAMP = { ativa: '🟢 Aberta', pausada: '⏸ Pausada', encerrada: '■ Encerrada' };
const statusCamp = c => STATUS_CAMP[c?.status] ? c.status : 'ativa';
// no telão: aberta; ou encerrada com o agradecimento marcado. Pausada nunca aparece.
const campanhaNoTelao = c => statusCamp(c) === 'ativa' || (statusCamp(c) === 'encerrada' && !!c.agradecer);
const pctCampanha = c => c.meta > 0 ? (+c.obtido || 0) / c.meta * 100 : Math.max(0, +c.pct || 0);
const pctTexto = p => (p > 0 && p < 1 ? '<1' : String(Math.floor(p))) + '%';
const dinheiro = v => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: (+v || 0) % 1 ? 2 : 0, maximumFractionDigits: 2 });
const reaisCampo = v => v ? (+v).toLocaleString('pt-BR', { minimumFractionDigits: (+v) % 1 ? 2 : 0, maximumFractionDigits: 2 }) : '';
const ordemCamp = (a, b) => (statusCamp(a) === 'encerrada') - (statusCamp(b) === 'encerrada') || (a.criado || 0) - (b.criado || 0);

// linha de resumo do andamento ("62% · R$ 12.400 de R$ 20.000")
function andamentoTexto(c, comValores = true) {
  const p = pctTexto(pctCampanha(c));
  if (!comValores) return p + ' da meta';
  if (c.meta > 0) return `${p} · ${dinheiro(c.obtido)} de ${dinheiro(c.meta)}`;
  return c.obtido ? `${p} · ${dinheiro(c.obtido)} arrecadados` : p + ' da meta';
}

// ---------------------------------------------------------------- slide (Full HD) da campanha
// Identidade própria, para não confundir com o QR dos eventos (que é de agenda): fundo vinho, faixa dourada
// "💝 CAMPANHA" no alto e o QR do Pix com moldura dourada e a legenda "💠 DOE PELO PIX".
// A arte à esquerda; à direita o título e, lado a lado, o mostrador da meta (barra, termômetro, círculo, tijolos ou
// coração — a Secretaria escolhe) e o QR do Pix com a chave.
const MOSTRADORES = { barra: '▬ Barra', termometro: '🌡 Termômetro', circulo: '◯ Círculo', tijolos: '🧱 Tijolos', coracao: '❤ Coração' };
const CAMP_CORES = { fundo1: '#4a1029', fundo2: '#1c0610', faixa: '#f2b631', faixaTxt: '#2a0714', ouro: '#f2b631', txt: '#ffffff', vazio: 'rgba(255,255,255,.16)', coracao: '#e2445c' };

function caminhoCaixa(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// desenha o mostrador dentro da caixa (x, y, w, h); p = percentual (pode passar de 100)
function desenharMostrador(g, tipo, p, x, y, w, h, FONTE) {
  const C = CAMP_CORES, k = Math.min(1, Math.max(0, p / 100)), tp = pctTexto(p);
  const cx = x + w / 2;
  g.save(); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  if (tipo === 'termometro') {
    // o percentual em cima; o termômetro embaixo, com as marcas à direita
    const fpct = Math.round(Math.min(110, h * .17, w * .3));
    g.font = `800 ${fpct}px ${FONTE}`; g.fillStyle = C.ouro; g.fillText(tp, cx, y + fpct);
    g.font = `600 26px ${FONTE}`; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('da meta', cx, y + fpct + 32);
    const tw = Math.min(80, w * .18), raio = tw * .95, topo = y + fpct + 64, base = y + h - raio * 2 - 6;
    const xt = cx - tw / 2 - 30, cb = { x: xt + tw / 2, y: base + raio * .8 };
    // tubo e bulbo vazios
    g.fillStyle = C.vazio; caminhoCaixa(g, xt, topo, tw, base - topo + raio, tw / 2); g.fill();
    g.beginPath(); g.arc(cb.x, cb.y, raio, 0, Math.PI * 2); g.fill();
    // cheio: o bulbo e o tubo até o nível
    const nivel = base - (base - topo) * k;
    g.fillStyle = C.ouro; g.beginPath(); g.arc(cb.x, cb.y, raio * .8, 0, Math.PI * 2); g.fill();
    if (k > 0) { caminhoCaixa(g, xt + tw * .18, nivel, tw * .64, base - nivel + raio, tw * .32); g.fill(); }
    // marcas 25/50/75/100
    g.font = `600 26px ${FONTE}`; g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,.8)';
    for (const m of [25, 50, 75, 100]) {
      const ym = base - (base - topo) * m / 100;
      g.fillRect(xt + tw + 8, ym - 2, 22, 4);
      g.fillText(m + '%', xt + tw + 38, ym + 9);
    }
  } else if (tipo === 'circulo') {
    const r = Math.min(w, h) / 2 - 16, cy = y + h / 2, lw = r * .2;
    g.lineWidth = lw; g.lineCap = 'round';
    g.strokeStyle = C.vazio; g.beginPath(); g.arc(cx, cy, r - lw / 2, 0, Math.PI * 2); g.stroke();
    if (k > 0) { g.strokeStyle = C.ouro; g.beginPath(); g.arc(cx, cy, r - lw / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); g.stroke(); }
    g.font = `800 ${Math.round(r * .5)}px ${FONTE}`; g.fillStyle = C.ouro; g.fillText(tp, cx, cy + r * .14);
    g.font = `600 ${Math.round(r * .14)}px ${FONTE}`; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('da meta', cx, cy + r * .36);
  } else if (tipo === 'tijolos') {
    // 10 tijolos (cada um = 10%), a parede sobe de baixo para cima; a fileira de cima desencontrada, como parede de verdade
    const fpct = Math.round(Math.min(120, h * .22));
    g.font = `800 ${fpct}px ${FONTE}`; g.fillStyle = C.ouro; g.fillText(tp, cx, y + fpct);
    g.font = `600 28px ${FONTE}`; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('da meta', cx, y + fpct + 38);
    // coluna estreita (ao lado do QR): 5 fileiras de 2; larga: 2 fileiras de 5
    const porFila = w < 520 ? 2 : 5, filas = 10 / porFila, gap = 10;
    const largMuro = Math.min(w * .9, porFila === 2 ? 340 : 700), bw = (largMuro - (porFila - 1) * gap) / porFila;
    const livre = h - fpct - 60, bh = Math.min(bw * .5, (livre - (filas - 1) * gap) / filas);
    const altMuro = filas * bh + (filas - 1) * gap;
    const x0 = cx - largMuro / 2, yBase = y + fpct + 60 + (livre - altMuro) / 2 + altMuro - bh;
    const cheios = k * 10;
    for (let i = 0; i < 10; i++) {
      const fila = Math.floor(i / porFila), col = i % porFila;
      const bx = x0 + col * (bw + gap), by = yBase - fila * (bh + gap);
      g.fillStyle = C.vazio; caminhoCaixa(g, bx, by, bw, bh, 6); g.fill();
      const parte = Math.max(0, Math.min(1, cheios - i));
      if (parte > 0) { g.save(); caminhoCaixa(g, bx, by, bw, bh, 6); g.clip(); g.fillStyle = '#c8642c'; g.fillRect(bx, by, bw * parte, bh);
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(bx, by, bw * parte, bh * .22); g.restore(); }
    }
  } else if (tipo === 'coracao') {
    const s = Math.min(w * .9, h - 20), hx = cx - s / 2, hy = y + (h - s) / 2 - s * .05;
    const coracao = () => {
      const P = (a, b) => [hx + a * s, hy + b * s];
      g.beginPath(); g.moveTo(...P(.5, .25));
      g.bezierCurveTo(...P(.5, .22), ...P(.45, .1), ...P(.27, .1));
      g.bezierCurveTo(...P(0, .1), ...P(0, .4), ...P(0, .4));
      g.bezierCurveTo(...P(0, .6), ...P(.2, .78), ...P(.5, .95));
      g.bezierCurveTo(...P(.8, .78), ...P(1, .6), ...P(1, .4));
      g.bezierCurveTo(...P(1, .4), ...P(1, .1), ...P(.73, .1));
      g.bezierCurveTo(...P(.6, .1), ...P(.5, .22), ...P(.5, .25));
      g.closePath();
    };
    coracao(); g.fillStyle = C.vazio; g.fill();
    g.save(); coracao(); g.clip();
    const yt = hy + s * .1, yb = hy + s * .95, nivel = yb - (yb - yt) * k;
    g.fillStyle = C.coracao; g.fillRect(hx, nivel, s, yb - nivel + 2); g.restore();
    coracao(); g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke();
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 12;
    g.font = `800 ${Math.round(s * .2)}px ${FONTE}`; g.fillStyle = '#fff'; g.fillText(tp, cx, hy + s * .52);
    g.font = `600 ${Math.round(s * .065)}px ${FONTE}`; g.fillText('da meta', cx, hy + s * .62);
  } else {
    // barra: o percentual grande e a barra embaixo
    const fpct = Math.round(Math.min(130, h * .35)), bh = 50, bw = w * .92, by = y + h / 2 + 10;
    g.font = `800 ${fpct}px ${FONTE}`; g.fillStyle = C.ouro; g.fillText(tp, cx, by - 24);
    g.fillStyle = C.vazio; caminhoCaixa(g, cx - bw / 2, by, bw, bh, bh / 2); g.fill();
    if (k > 0) { g.fillStyle = C.ouro; caminhoCaixa(g, cx - bw / 2, by, Math.max(bh, bw * k), bh, bh / 2); g.fill(); }
    g.font = `600 28px ${FONTE}`; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('da meta', cx, by + bh + 38);
  }
  g.restore();
}

async function imagemCampanha(c) {
  const W = 1920, H = 1080, FONTE = '"Segoe UI", "Segoe UI Emoji", Arial, sans-serif', C = CAMP_CORES;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const agradece = statusCamp(c) === 'encerrada';
  // fundo vinho (próprio das campanhas) e a faixa dourada
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, C.fundo1); gr.addColorStop(1, C.fundo2);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  try { await document.fonts?.ready; } catch (_) {}
  const FX = 76;
  g.fillStyle = C.faixa; g.fillRect(0, 0, W, FX);
  g.fillStyle = C.faixaTxt; g.textBaseline = 'middle';
  g.font = `800 42px ${FONTE}`; g.textAlign = 'left'; g.fillText(agradece ? '🙏 CAMPANHA ENCERRADA' : '💝 CAMPANHA', 50, FX / 2 + 2);
  g.font = `600 32px ${FONTE}`; g.textAlign = 'right'; g.fillText(agradece ? 'Muito obrigado a todos!' : 'Ajude pelo Pix', W - 50, FX / 2 + 2);
  g.textBaseline = 'alphabetic';
  const abrir = async src => { if (!src) return null; try { return await carregarImagem(src); } catch (_) { return null; } };
  const [arte, qr] = await Promise.all([abrir(c.arte), agradece ? null : abrir(c.qr)]);
  const topo = FX + 30, fundoY = H - 34;
  let xT = 90, lT = W - 180;
  if (arte) {
    const k = Math.min(760 / arte.width, (fundoY - topo) / arte.height);
    const w = arte.width * k, h = arte.height * k, x = 60, y = topo + (fundoY - topo - h) / 2;
    g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
    g.drawImage(arte, x, y, w, h); g.restore();
    xT = x + w + 60; lT = W - xT - 60;
  }
  const cx = xT + lT / 2, p = pctCampanha(c);
  g.textAlign = 'center';
  let y = topo;
  if (agradece) { y += 80; g.font = `800 80px ${FONTE}`; g.fillStyle = C.ouro; g.fillText('🙏 Muito obrigado!', cx, y); y += 20; }
  // título (até 2 linhas) e descrição (1 linha com QR, 2 sem)
  let f = agradece ? 52 : 64;
  g.font = `800 ${f}px ${FONTE}`;
  let ls = linhasCanvas(g, c.titulo || '', lT);
  while ((ls.length > 2 || ls.some(l => g.measureText(l).width > lT)) && f > 34) { f *= .92; g.font = `800 ${f}px ${FONTE}`; ls = linhasCanvas(g, c.titulo || '', lT); }
  g.fillStyle = C.txt;
  for (const l of ls.slice(0, 2)) { y += f; g.fillText(l, cx, y); y += f * .14; }
  const desc = agradece ? (p >= 100 ? 'Meta atingida! A todos que ajudaram, a nossa gratidão.' : 'A todos que ajudaram, a nossa gratidão. Deus abençoe!') : (c.descricao || '');
  if (desc) {
    const fd = Math.round(Math.max(26, f * .48));
    g.font = `400 ${fd}px ${FONTE}`; g.fillStyle = 'rgba(255,255,255,.85)';
    for (const l of linhasCanvas(g, desc, lT).slice(0, qr ? 1 : 2)) { y += fd * 1.3; g.fillText(l, cx, y); }
  }
  y += 30;
  // linha de baixo: o mostrador | o QR do Pix
  const valores = c.mostrarValores && (c.meta > 0 || c.obtido > 0) ? (c.meta > 0 ? `${dinheiro(c.obtido)} de ${dinheiro(c.meta)}` : `${dinheiro(c.obtido)} arrecadados`) : '';
  const altVal = valores ? 56 : 0, hLinha = fundoY - y;
  let xm = xT, wm = lT;
  if (qr) {
    // QR: o maior que couber, com a legenda em cima e a chave embaixo
    g.font = `600 30px ${FONTE}`;
    const chaves = c.chave ? linhasCanvas(g, c.chave, Math.min(lT * .55, 560)).slice(0, 2) : [];
    const leg = 58, embaixo = 14 + chaves.length * 38 + 34;
    const lado = Math.max(260, Math.min(560, hLinha - leg - embaixo - 20, lT * .55));
    const larg = Math.max(lado, 420), xq = xT + lT - larg / 2 - 10, yq = y + leg + (hLinha - leg - embaixo - lado) / 2;
    g.font = `800 46px ${FONTE}`; g.fillStyle = C.ouro; g.fillText('💠 DOE PELO PIX', xq, yq - 18);
    const B = 16;
    g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 24;
    g.fillStyle = C.ouro; caminhoCaixa(g, xq - lado / 2 - B, yq - B, lado + 2 * B, lado + 2 * B, 18); g.fill(); g.restore();
    g.fillStyle = '#fff'; g.fillRect(xq - lado / 2, yq, lado, lado);
    const m = 12, kq = Math.min((lado - 2 * m) / qr.width, (lado - 2 * m) / qr.height);
    g.imageSmoothingEnabled = false;
    g.drawImage(qr, xq - qr.width * kq / 2, yq + lado / 2 - qr.height * kq / 2, qr.width * kq, qr.height * kq);
    g.imageSmoothingEnabled = true;
    let yc = yq + lado + B + 14;
    g.font = `600 30px ${FONTE}`; g.fillStyle = C.txt;
    for (const l of chaves) { yc += 34; g.fillText(l, xq, yc); }
    g.font = `400 24px ${FONTE}`; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('📱 App do banco → Pix → Ler QR code', xq, yc + 34);
    wm = lT - larg - 60;
  } else if (!agradece && c.chave) {
    g.font = `600 36px ${FONTE}`; g.fillStyle = C.txt; g.fillText('💠 Chave Pix: ' + c.chave, cx, fundoY - 10);
  }
  const hm = hLinha - altVal - (qr || agradece || !c.chave ? 0 : 60);
  const tipo = MOSTRADORES[c.mostrador] ? c.mostrador : 'barra';
  const mw = Math.min(wm, qr ? wm : 900), mx = xm + (wm - mw) / 2;
  desenharMostrador(g, tipo, p, mx, y, mw, Math.min(hm, qr ? hm : 560), FONTE);
  if (valores) { g.font = `700 40px ${FONTE}`; g.fillStyle = C.txt; g.fillText(valores, mx + mw / 2, y + Math.min(hm, qr ? hm : 560) + 46); }
  return cv.toDataURL('image/png');
}

// ---------------------------------------------------------------- Secretaria: a janela das campanhas
const HTML_CAMPANHAS = `
<dialog id="dlgCampanhas" class="dlg-sec dlg-sec-largo">
  <form method="dialog" class="form">
    <h2>💝 Campanhas de arrecadação</h2>
    <p class="sutil pequeno">Cada campanha tem a arte (Canva), o QR code do Pix dela e quanto já foi arrecadado. Vai pela nuvem para o
      MiguelAngelus, que mostra no telão (item 💝 Campanhas do roteiro, normalmente depois dos Avisos). Só a Secretaria atualiza o andamento.</p>
    <div class="ev-grade">
      <div>
        <div id="cpLista" class="ev-lista"></div>
        <div class="linha"><button type="button" id="cpNova" class="primario">＋ Nova campanha</button>
          <label class="check pequeno"><input type="checkbox" id="cpEncerradas"> mostrar as encerradas</label></div>
      </div>
      <div id="cpForm" class="ev-form" hidden>
        <div class="linha cp-status-linha"><span id="cpfStatus" class="cp-status"></span><span class="espaco"></span>
          <button type="button" id="cpfPausar" title="Some do telão por enquanto (volta com Reabrir)">⏸ Pausar</button>
          <button type="button" id="cpfEncerrar" title="A campanha acabou: some do telão (ou vira o agradecimento, se marcado abaixo)">■ Encerrar</button>
          <button type="button" id="cpfReabrir" title="Volta a aparecer no telão">▶ Reabrir</button></div>
        <label class="check pequeno" id="cpfAgradecerRot"><input type="checkbox" id="cpfAgradecer">
          <span><b>🙏 Agradecimento no telão</b> depois de encerrada: um slide "Muito obrigado!" com o resultado (sem o QR). Desmarcado: encerrada some do telão.</span></label>
        <label class="campo">Título <input id="cpfTitulo" maxlength="80" placeholder="Ex.: Reforma do telhado da Matriz"></label>
        <label class="campo">Descrição curta <small class="sutil" id="cpfConta"></small>
          <textarea id="cpfDescricao" data-sem-formato rows="2" maxlength="160" placeholder="Ex.: Ajude a trocar as telhas antes das chuvas."></textarea></label>
        <div class="separador">Andamento</div>
        <div class="linha">
          <label class="campo">Meta (R$) <input id="cpfMeta" inputmode="decimal" placeholder="20.000" style="width:130px"></label>
          <label class="campo">Arrecadado até agora (R$) <input id="cpfObtido" inputmode="decimal" placeholder="0" style="width:150px"></label>
          <label class="campo" title="Sem os valores em reais, informe só o percentual">ou só o percentual <span><input id="cpfPct" type="number" min="0" max="999" step="1" style="width:80px"> %</span></label>
        </div>
        <div class="cp-barra" title="Como vai aparecer a barra no telão"><div id="cpfBarra"></div><span id="cpfPctTxt"></span></div>
        <div class="linha">
          <label class="campo" title="Como a meta aparece no telão (use 👁 Ver o slide para conferir)">Mostrador da meta <select id="cpfMostrador"></select></label>
          <label class="check pequeno"><input type="checkbox" id="cpfMostrarValores"> Mostrar no telão os <b>valores</b> (meta e arrecadado). Desmarcado: só o percentual.</label>
        </div>
        <div class="separador">Arte do Canva e Pix da campanha</div>
        <div class="linha ev-cartaz-linha">
          <div id="cpfArte" class="ev-cartaz">sem arte</div>
          <div class="ev-cartaz-bt"><button type="button" id="cpfArteEscolher">🖼 Escolher a arte…</button>
            <button type="button" id="cpfArteTirar" hidden>Tirar a arte</button>
            <input type="file" id="cpfArteArq" accept="image/*" hidden>
            <span class="sutil pequeno">Dica: no Canva, em pé, 1080 × 1350 px, baixe em PNG. Não ponha o QR na arte: o programa coloca ao lado, com o andamento.</span></div>
          <span class="espaco"></span>
          <div class="ev-qr cp-pix"><div id="cpfQr" class="cp-qr">sem QR do Pix</div><div id="cpfRecebedor" class="pix-rec" hidden></div>
            <button type="button" id="cpfQrEscolher" title="A imagem do QR code do Pix desta campanha (o banco gera: salve como imagem)">💠 QR code do Pix…</button>
            <button type="button" id="cpfQrTirar" hidden>Tirar o QR</button>
            <input type="file" id="cpfQrArq" accept="image/*" hidden></div>
        </div>
        <label class="campo">Chave Pix da campanha (aparece embaixo do QR, para a pessoa conferir)
          <input id="cpfChave" maxlength="80" placeholder="Ex.: CNPJ 00.000.000/0001-00 ou campanha@paroquia.org.br"></label>
        <div id="cpfCadeado" class="cp-cadeado pequeno"></div>
        <div class="linha"><span class="espaco"></span>
          <button type="button" id="cpfCancelar">Cancelar</button>
          <button type="button" id="cpfSalvar" class="primario">Salvar campanha</button></div>
      </div>
    </div>
    <div id="cpPrevia" class="apc-previa"></div>
    <div class="linha">
      <button type="button" id="cpVer" title="Ver como fica o slide no telão">👁 Ver o slide</button>
      <button type="button" id="cpImagem" title="Uma imagem Full HD com a arte, o andamento e o QR, gravada na pasta de imagens do Holyrics">🖼 Imagem para o Holyrics</button>
      <span class="espaco"></span><button value="fechar">Fechar</button>
    </div>
  </form>
</dialog>`;

const campanhaAberta = () => Camp.lista.find(c => c.id === Camp.editando) || null;

function renderCampanhas() {
  const todas = $('#cpEncerradas').checked;
  const lista = Camp.lista.filter(c => todas || statusCamp(c) !== 'encerrada').sort(ordemCamp);
  $('#cpLista').innerHTML = lista.length ? lista.map(c => `
    <div class="ev-item ${c.id === Camp.editando ? 'editando' : ''} ${statusCamp(c) !== 'ativa' ? 'passado' : ''}" data-id="${c.id}">
      ${c.arte ? `<img src="${c.arte}" alt="">` : '<span class="ev-sem">💝</span>'}
      <span class="ev-txt"><b>${esc(c.titulo)}</b><small class="sutil">${STATUS_CAMP[statusCamp(c)]}${statusCamp(c) === 'encerrada' && c.agradecer ? ' · 🙏 agradecimento' : ''} · ${esc(andamentoTexto(c))}</small></span>
      <button type="button" data-cp-apagar class="perigo" title="Apagar">✕</button>
    </div>`).join('') : `<p class="sutil">${Camp.lista.length ? 'Nenhuma campanha aberta.' : 'Nenhuma campanha ainda. Clique em ＋ Nova campanha.'}</p>`;
  $('#cpImagem').disabled = $('#cpVer').disabled = !campanhaAberta();
}

function lerFormCp() {
  const meta = lerReais($('#cpfMeta').value), obtido = lerReais($('#cpfObtido').value);
  return { titulo: $('#cpfTitulo').value.trim(), descricao: $('#cpfDescricao').value.trim(), meta, obtido,
    pct: meta > 0 ? 0 : Math.max(0, +$('#cpfPct').value || 0), mostrarValores: $('#cpfMostrarValores').checked, mostrador: $('#cpfMostrador').value || 'barra',
    agradecer: $('#cpfAgradecer').checked, chave: $('#cpfChave').value.trim(), arte: Camp.arte, qr: Camp.qr };
}

const pixTravado = () => !!Camp.senha && !Camp.liberada;

// (1.9.8) "Recebedor: …" lido do QR da campanha; avisa se a chave digitada não é a do QR
async function mostrarRecebedorCp(chave) {
  const el = $('#cpfRecebedor');
  if (!el) return;
  if (Camp.qrMostrado !== Camp.qr) { Camp.qrMostrado = Camp.qr; Camp.recebedor = await mostrarRecebedor(el, Camp.qr); }
  const r = Camp.recebedor, ch = (chave || '').trim();
  el.querySelector('.pix-rec-dif')?.remove();
  if (Camp.qr && r) el.className = 'pix-rec ' + (r.pix && r.pix.crcOk ? 'ok' : 'alerta');
  if (Camp.qr && r?.pix?.chave && ch && ch.toLowerCase() !== r.pix.chave.toLowerCase()) {
    el.insertAdjacentHTML('beforeend', `<div class="pix-rec-dif">⚠ A chave escrita (${esc(ch)}) é diferente da chave que está no QR. No telão aparece a escrita, mas quem lê o QR paga para a do QR: confira.</div>`);
    el.className = 'pix-rec alerta';
  }
}

function atualizarFormCp() {
  const d = lerFormCp(), c = campanhaAberta(), st = statusCamp(c || {});
  $('#cpfConta').textContent = `(${d.descricao.length}/160)`;
  // com meta, o percentual é calculado; sem meta, digita-se o percentual
  $('#cpfPct').disabled = d.meta > 0;
  if (d.meta > 0) $('#cpfPct').value = Math.floor(pctCampanha(d));
  const p = pctCampanha(d);
  $('#cpfBarra').style.width = Math.min(100, p) + '%';
  $('#cpfPctTxt').textContent = andamentoTexto(d, d.mostrarValores);
  $('#cpfArte').innerHTML = Camp.arte ? `<img src="${Camp.arte}" alt="arte">` : 'sem arte';
  $('#cpfArteTirar').hidden = !Camp.arte;
  $('#cpfQr').innerHTML = Camp.qr ? `<img src="${Camp.qr}" alt="QR do Pix">` : 'sem QR do Pix';
  mostrarRecebedorCp(d.chave);
  // status e botões (só para campanha já salva)
  $('#cpfStatus').textContent = c ? STATUS_CAMP[st] : 'Nova campanha';
  $('#cpfStatus').dataset.st = c ? st : '';
  $('#cpfPausar').hidden = !c || st !== 'ativa';
  $('#cpfEncerrar').hidden = !c || st === 'encerrada';
  $('#cpfReabrir').hidden = !c || st === 'ativa';
  // 🔒 o QR e a chave: com senha, só depois de desbloquear
  const trav = pixTravado();
  $('#cpfQrEscolher').disabled = $('#cpfChave').disabled = trav;
  $('#cpfQrTirar').hidden = !Camp.qr || trav;
  $('#cpfCadeado').innerHTML = !Camp.senha
    ? (Camp.qr || d.chave ? '🔓 Ao salvar, você cria a senha de 4 números desta campanha: ela protege o QR e a chave Pix (ninguém troca sem a senha).' : '')
    : trav ? '🔒 O QR e a chave Pix desta campanha estão protegidos por senha. <button type="button" data-cp-senha="entrar">🔓 Desbloquear</button>'
      : '🔓 QR e chave liberados para troca. <button type="button" data-cp-senha="bloquear">🔒 Bloquear</button> <button type="button" data-cp-senha="trocar">Trocar a senha</button>';
}

function abrirFormCp(c) {
  Camp.editando = c?.id || null;
  Camp.versaoAberta = c?.versao || 0;
  Camp.arte = c?.arte || ''; Camp.qr = c?.qr || '';
  Camp.senha = c?.senha || null; Camp.liberada = !c?.senha;
  // chave nova: sugere a da última campanha (normalmente a mesma conta da paróquia)
  const ultima = [...Camp.lista].sort((a, b) => (b.criado || 0) - (a.criado || 0))[0];
  $('#cpfTitulo').value = c?.titulo || '';
  $('#cpfDescricao').value = c?.descricao || '';
  $('#cpfMeta').value = reaisCampo(c?.meta);
  $('#cpfObtido').value = reaisCampo(c?.obtido);
  $('#cpfPct').value = c && !(c.meta > 0) && c.pct ? c.pct : '';
  $('#cpfMostrarValores').checked = c ? !!c.mostrarValores : true;
  $('#cpfMostrador').innerHTML = Object.entries(MOSTRADORES).map(([k, v]) => `<option value="${k}" ${k === (c?.mostrador || 'barra') ? 'selected' : ''}>${v}</option>`).join('');
  $('#cpfAgradecer').checked = !!c?.agradecer;
  $('#cpfChave').value = c ? c.chave || '' : ultima?.chave || '';
  $('#cpForm').hidden = false;
  $('#cpPrevia').innerHTML = '';
  atualizarFormCp();
  renderCampanhas();
  $('#cpfTitulo').focus();
}

async function desbloquearPixCp() {
  if (Date.now() < Camp.travadoAte) return toast(`Muitas tentativas erradas. Espere ${Math.ceil((Camp.travadoAte - Date.now()) / 1000)} s.`);
  const pin = await pedirSenha('entrar', '🔒 Senha da campanha', 'Digite a senha de 4 números desta campanha para trocar o QR code ou a chave Pix.');
  if (!pin || !Camp.senha) return;
  if ((await hashSenha(pin, Camp.senha.sal)) === Camp.senha.hash) { Camp.liberada = true; Camp.erros = 0; atualizarFormCp(); toast('🔓 QR e chave liberados.'); }
  else if (++Camp.erros >= 5) { Camp.travadoAte = Date.now() + 60000; Camp.erros = 0; toast('Senha errada 5 vezes: bloqueado por 1 minuto.'); }
  else toast(`Senha errada (${Camp.erros} de 5).`);
}

async function novaSenhaCp(titulo, texto) {
  const pin = await pedirSenha('criar', titulo, texto);
  if (!pin) return null;
  const sal = hexDe(crypto.getRandomValues(new Uint8Array(16)));
  return { sal, hash: await hashSenha(pin, sal) };
}

// status: '' = só salvar o formulário; 'ativa' | 'pausada' | 'encerrada' = muda também o status
async function salvarFormCp(status = '') {
  const d = lerFormCp();
  if (!d.titulo) { toast('Escreva o título da campanha.'); return $('#cpfTitulo').focus(); }
  const antigo = campanhaAberta();
  // QR ou chave sem senha ainda: cria agora (protege o Pix da campanha)
  if ((d.qr || d.chave) && !Camp.senha) {
    const s = await novaSenhaCp('🔒 Senha desta campanha', 'Escolha 4 números e repita. Ela será pedida para trocar o QR code ou a chave Pix desta campanha (em todos os computadores). Guarde com a coordenação.');
    if (!s) return toast('Sem a senha, a campanha não foi salva.');
    Camp.senha = s; Camp.liberada = true;
  }
  const agora = Date.now();
  const mudouAndamento = !antigo || antigo.meta !== d.meta || antigo.obtido !== d.obtido || (antigo.pct || 0) !== d.pct;
  const c = antigo ? { ...antigo, ...d, alterado: agora } : { id: uid(), criado: agora, status: 'ativa', ...d };
  c.senha = Camp.senha;
  if (status) c.status = status;
  if (mudouAndamento) c.andamentoEm = agora;
  if (!await gravarItemSec('camp', c, { versaoAberta: antigo ? Camp.versaoAberta : 0, rotulo: 'esta campanha' })) {
    await carregarCampanhas(); $('#cpForm').hidden = true; Camp.editando = null; return renderCampanhas();
  }
  if (antigo) Object.assign(antigo, c); else { Camp.lista.push(c); Camp.editando = c.id; }
  Camp.versaoAberta = c.versao;
  toast(status === 'pausada' ? '⏸ Campanha pausada: saiu do telão.' : status === 'encerrada' ? (c.agradecer ? '■ Campanha encerrada: no telão fica o agradecimento.' : '■ Campanha encerrada: saiu do telão.')
    : status === 'ativa' ? '▶ Campanha reaberta: volta ao telão.' : '💝 Campanha salva.');
  atualizarFormCp();
  renderCampanhas();
  aposMudarCampanhas();
}

// arte: até 1200 px (JPEG); QR: até 800 px em PNG (sem borrar os quadradinhos)
async function lerImagemCp(arq, qr) {
  const url = await new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = falha; r.readAsDataURL(arq); });
  const img = await carregarImagem(url), max = qr ? 800 : 1200, k = Math.min(1, max / Math.max(img.width, img.height));
  const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
  const g = cv.getContext('2d');
  if (qr) { g.imageSmoothingEnabled = false; g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); }
  g.drawImage(img, 0, 0, cv.width, cv.height);
  return qr ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', .86);
}

async function verSlideCp(baixar) {
  const c = campanhaAberta();
  if (!c) return toast('Salve a campanha primeiro.');
  const b = baixar ? $('#cpImagem') : $('#cpVer'); b.disabled = true;
  try {
    const url = await imagemCampanha(c);
    const nome = `Campanha ${c.titulo}`.replace(/[\\/:*?"<>|]/g, '-').slice(0, 90);
    $('#cpPrevia').innerHTML = `<img src="${url}" alt="${esc(nome)}" title="${esc(nome)}" class="cp-previa">`;
    if (!baixar) return;
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

async function abrirCampanhas() {
  await carregarCampanhas();
  $('#cpForm').hidden = true;
  Camp.editando = null;
  $('#cpPrevia').innerHTML = '';
  renderCampanhas();
  abrirDialogo('dlgCampanhas');
}

function ligarCampanhasSec() {
  const dlg = $('#dlgCampanhas');
  $('#cpNova').addEventListener('click', () => abrirFormCp(null));
  $('#cpEncerradas').addEventListener('change', renderCampanhas);
  $('#cpfSalvar').addEventListener('click', () => salvarFormCp());
  $('#cpfPausar').addEventListener('click', () => salvarFormCp('pausada'));
  $('#cpfEncerrar').addEventListener('click', () => {
    const c = campanhaAberta();
    if (c && confirm(`Encerrar a campanha "${c.titulo}"?\n\n${$('#cpfAgradecer').checked ? 'No telão fica o slide de agradecimento.' : 'Ela sai do telão. (Para mostrar um agradecimento, marque "🙏 Agradecimento no telão".)'}\n\nDá para reabrir depois.`)) salvarFormCp('encerrada');
  });
  $('#cpfReabrir').addEventListener('click', () => salvarFormCp('ativa'));
  $('#cpfCancelar').addEventListener('click', () => { $('#cpForm').hidden = true; Camp.editando = null; renderCampanhas(); });
  $('#cpfArteEscolher').addEventListener('click', () => $('#cpfArteArq').click());
  $('#cpfArteTirar').addEventListener('click', () => { Camp.arte = ''; atualizarFormCp(); });
  $('#cpfQrEscolher').addEventListener('click', () => { if (!pixTravado()) $('#cpfQrArq').click(); });
  $('#cpfQrTirar').addEventListener('click', () => { if (!pixTravado() && confirm('Tirar o QR code do Pix desta campanha?')) { Camp.qr = ''; atualizarFormCp(); } });
  for (const [id, qr] of [['cpfArteArq', false], ['cpfQrArq', true]]) $('#' + id).addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    if (qr && pixTravado()) return;
    try {
      const url = await lerImagemCp(f, qr);
      if (qr) {
        // (1.9.8) para quem vai o dinheiro, lido do próprio QR, antes de aceitar; a chave vem junto se o campo estiver vazio
        if (!await confirmarRecebedor(url)) return toast('QR code não usado.');
        Camp.qr = url;
        const r = await recebedorDoQr(url);
        if (r?.pix?.chave && !$('#cpfChave').value.trim()) $('#cpfChave').value = r.pix.chave;
      } else Camp.arte = url;
      atualizarFormCp();
    }
    catch (_) { toast('Não consegui abrir essa imagem.'); }
  });
  for (const id of ['cpfTitulo', 'cpfDescricao', 'cpfMeta', 'cpfObtido', 'cpfPct', 'cpfMostrarValores', 'cpfMostrador', 'cpfAgradecer', 'cpfChave'])
    $('#' + id).addEventListener('input', atualizarFormCp);
  $('#cpVer').addEventListener('click', () => verSlideCp(false));
  $('#cpImagem').addEventListener('click', () => verSlideCp(true));
  dlg.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) e.preventDefault(); });
  dlg.addEventListener('click', async e => {
    const s = e.target.closest('[data-cp-senha]');
    if (s) {
      const a = s.dataset.cpSenha;
      if (a === 'entrar') return desbloquearPixCp();
      if (a === 'bloquear') { Camp.liberada = false; return atualizarFormCp(); }
      if (a === 'trocar') {
        const n = await novaSenhaCp('🔒 Nova senha da campanha', 'Escolha os 4 números novos e repita. Vale depois de Salvar campanha.');
        if (n) { Camp.senha = n; toast('🔒 Senha nova: clique em Salvar campanha.'); }
      }
      return;
    }
    const it = e.target.closest('.ev-item');
    if (!it) return;
    const c = Camp.lista.find(x => x.id === it.dataset.id);
    if (e.target.closest('[data-cp-apagar]')) {
      if (c && confirm(`Apagar a campanha?\n\n${c.titulo}\n\n(Para só tirar do telão, use Pausar ou Encerrar.)`)) {
        Camp.lista = Camp.lista.filter(x => x !== c);
        if (Camp.editando === c.id) { Camp.editando = null; $('#cpForm').hidden = true; }
        apagarItemSec('camp', c.id).then(() => { renderCampanhas(); aposMudarCampanhas(); });
      }
      return;
    }
    abrirFormCp(c);
  });
}

// ======================================================================
// MiguelAngelus: item de roteiro "💝 Campanhas" — um slide por campanha (arte + andamento + QR), passando sozinhos
// (o mesmo motor do "Apresentar eventos": segundos, recomeçar, som, repetir em grupo — eventos.js)
// ======================================================================
const chaveImgCamp = c => `${c.id}:${c.versao || c.alterado || c.criado || 0}:${S.config.corFundo || ''}:${S.config.corTexto || ''}`;

function campanhasDoItem(it) {
  if (it?.tipo !== 'campanhas') return [];
  const ids = new Set(it.campanhaIds || []);
  return Camp.lista.filter(c => (it.todasAtivas || ids.has(c.id)) && campanhaNoTelao(c)).sort(ordemCamp);
}

function slideDaCampanha(c) {
  const k = chaveImgCamp(c);
  if (Camp.imgs[k]) return { img: Camp.imgs[k], layout: 'so', escurecer: 0, texto: '', rodape: '' };
  if (!Camp.gerando[k]) {
    Camp.gerando[k] = imagemCampanha(c).then(url => {
      Camp.imgs[k] = url;
      delete Camp.gerando[k];
      if (S.atual && campanhasDoItem(S.atual.item).includes(c)) atualizarSlides();
      avisosComImagemPronta();          // (1.9.7) aviso ligado à campanha, no item Avisos
      const L = S.live;
      if (L.item && L.idx >= 0 && campanhasDoItem(L.item)[L.idx] === c && !L.slide?.img) {
        L.slide = gerarSlides(L.item)[L.idx];
        enviar({ tipo: 'slide', slide: L.slide, direto: true });
      }
    }).catch(() => { delete Camp.gerando[k]; });
  }
  return { texto: `${c.titulo}\n${andamentoTexto(c, !!c.mostrarValores)}`, rodape: 'Campanha' };
}

function slidesCampanhas(item) { return campanhasDoItem(item).map(slideDaCampanha); }

function resumoCampanhas(it) {
  const n = campanhasDoItem(it).length;
  return { rot: 'Campanhas', tit: `${it.titulo || 'Campanhas'} · ${n} campanha${n === 1 ? '' : 's'} · ${segundosShow(it)} s${it.repetir ? ' · ↻' : ''}${it.audioId ? ' · 🎵' : ''}`, vazio: !n };
}

function htmlCabCampanhas(it) {
  const todas = !!it.todasAtivas, ids = new Set(it.campanhaIds || []);
  const lista = Camp.lista.filter(c => statusCamp(c) !== 'encerrada' || c.agradecer || ids.has(c.id)).sort(ordemCamp);
  const etiqueta = c => statusCamp(c) === 'pausada' ? ' <small class="sutil">(pausada: não aparece)</small>'
    : statusCamp(c) === 'encerrada' ? (c.agradecer ? ' <small class="sutil">(🙏 agradecimento)</small>' : ' <small class="sutil">(encerrada: não aparece)</small>') : '';
  return `<div class="cab-linha"><span class="tag t-campanhas">Campanhas</span>
      <input data-campo="titulo" class="estreito" value="${esc(it.titulo || '')}" placeholder="Campanhas" title="Nome no roteiro (não aparece no telão)">
      <label class="check" title="Quanto tempo cada campanha fica no telão antes de passar para a próxima">Cada slide
        <input type="number" data-campo="segundos" min="3" max="600" step="1" value="${segundosShow(it)}" style="width:70px"> s</label>
      <label class="check" title="Marcado: depois da última, volta para a primeira (fica rodando). Desmarcado: para na última."><input type="checkbox" data-campo="repetir" ${it.repetir ? 'checked' : ''}> ↻ Recomeçar do início ao terminar</label>
      <span class="espaco"></span><span id="showStatus" class="sutil pequeno"></span></div>
    <div class="cab-linha">
      <label class="check" title="Música que toca neste computador enquanto as campanhas passam">🎵 Som
        <select data-campo="audioId" style="max-width:260px">${opcoesAudioShow(it.audioId || '')}</select></label>
      <button type="button" data-show-audio-arq title="Escolher um arquivo de áudio do computador (ele fica guardado na aba Áudios)">📂 Arquivo de áudio…</button>
      ${grupoLoop(it).length ? `<span class="sutil pequeno">🔁 Repete em grupo: ${grupoLoop(it).map(nomeItemGrupo).map(esc).join(' → ')} → (volta)</span>` : ''}
      ${typeof htmlIncluirEmTodos === 'function' ? htmlIncluirEmTodos(it) : ''}
    </div>
    <div class="cab-linha">
      <label class="check" title="Marcado: entram sozinhas todas as campanhas abertas (a nova aparece; a pausada ou encerrada sai). Serve em todos os roteiros sem mexer."><input type="checkbox" data-campo="todasAtivas" ${todas ? 'checked' : ''}> <b>Todas as campanhas abertas</b> (atualiza sozinho)</label>
    </div>
    <div class="cab-linha show-evs">
      ${lista.length ? lista.map(c => `<label class="check show-ev ${campanhaNoTelao(c) ? '' : 'passado'}" title="${esc(andamentoTexto(c))}">
        <input type="checkbox" data-show-camp="${c.id}" ${todas ? (campanhaNoTelao(c) ? 'checked' : '') : ids.has(c.id) ? 'checked' : ''} ${todas ? 'disabled' : ''}>
        ${c.arte ? `<img src="${c.arte}" alt="">` : '💝'} ${esc(c.titulo)} · ${esc(pctTexto(pctCampanha(c)))}${etiqueta(c)}</label>`).join('')
        : '<span class="sutil">Nenhuma campanha. Elas são feitas na Secretaria MiguelAngelus (💝 Campanhas de arrecadação) e chegam pela nuvem.</span>'}
    </div>
    <p class="sutil pequeno" style="margin:0">O andamento (quanto já foi arrecadado) vem da Secretaria pela nuvem; aqui só mostra. Clique no primeiro slide para começar: os outros passam sozinhos.</p>`;
}

// chegou campanha nova/mudada (nuvem) ou a Secretaria salvou: o item aberto e a lista do roteiro acompanham
// sem nenhuma campanha vinda da Secretaria (nuvem), o botão "💝 Campanhas" do Adicionar nem aparece
function mostrarBotaoCampanhas() {
  const b = $('[data-add="campanhas"]');
  if (b) b.hidden = !Camp.lista.length;
}

function aposMudarCampanhas() {
  if (typeof S === 'undefined' || SECRETARIA) return;
  mostrarBotaoCampanhas();
  const a = S.atual, comCamp = it => it?.tipo === 'campanhas';
  if (S.roteiro?.itens.some(comCamp)) { try { renderRoteiroLista(); } catch (_) {} }
  if (comCamp(a?.item)) { atualizarSlides(); renderCabecalho(); }
}

function ligarCampanhasMA() {
  $('#itemCab').addEventListener('change', e => {
    const id = e.target.dataset?.showCamp;
    if (id === undefined || S.atual?.item.tipo !== 'campanhas') return;
    const it = S.atual.item, ids = new Set(it.campanhaIds || []);
    if (e.target.checked) ids.add(id); else ids.delete(id);
    it.campanhaIds = [...ids];
    aposMudarShow(false);
  });
}
