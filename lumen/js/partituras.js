'use strict';
/*
 * 🎼 Partituras (1.8.6): as páginas da partitura de um canto, para o app dos músicos (Cifra | Partitura).
 * Ficam no store "partituras" ({ id = id do canto, paginas: [data URL JPEG], origem }), separadas dos cantos para a
 * lista de cantos continuar leve; sincronizam com a nuvem como os cantos. Nunca vão para o programa nem para o GitHub
 * (partitura tem direito autoral: fica só nos dados da paróquia).
 *
 * No editor do canto: "Carregar PDF ou imagem…". PDF: escolhe as páginas (as que têm o título do canto já vêm
 * marcadas); cada página vira uma imagem sem as margens brancas. Imagem (foto, digitalização): entra como está.
 */
const Partituras = { lista: new Map(), editando: null, mudou: false, enviadas: new Set() };
const LARG_PARTITURA = 1600;           // px de largura de cada página guardada (dá para ampliar no celular)

async function carregarPartituras() {
  Partituras.lista = new Map((await DB.todos('partituras')).filter(p => p?.paginas?.length).map(p => [p.id, p]));
}
const partituraDe = c => (c && Partituras.lista.get(c.id)) || null;

// ---------- imagens ----------
// tira as margens brancas (com uma folga) e reduz para LARG_PARTITURA; devolve JPEG
const recortarPagina = cv => recortarComCaixa(cv).url;
function recortarComCaixa(cv) {
  const g = cv.getContext('2d'), { width: L, height: A } = cv;
  const px = g.getImageData(0, 0, L, A).data;
  const escuro = i => px[i] + px[i + 1] + px[i + 2] < 600 && px[i + 3] > 40;
  let x0 = L, x1 = -1, y0 = A, y1 = -1;
  const passo = Math.max(1, Math.round(L / 800));
  for (let y = 0; y < A; y += passo) for (let x = 0; x < L; x += passo) {
    if (!escuro((y * L + x) * 4)) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = L - 1; y1 = A - 1; }
  const folga = Math.round(L * 0.02);
  x0 = Math.max(0, x0 - folga); y0 = Math.max(0, y0 - folga); x1 = Math.min(L - 1, x1 + folga); y1 = Math.min(A - 1, y1 + folga);
  const w = x1 - x0 + 1, h = y1 - y0 + 1, k = Math.min(1, LARG_PARTITURA / w);
  const out = document.createElement('canvas');
  out.width = Math.round(w * k); out.height = Math.round(h * k);
  const o = out.getContext('2d');
  o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height);
  o.imageSmoothingQuality = 'high';
  o.drawImage(cv, x0, y0, w, h, 0, 0, out.width, out.height);
  return { url: out.toDataURL('image/jpeg', 0.85), y0, h };
}

async function imagemParaPagina(arquivo) {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image(); img.src = url; await img.decode();
    const k = Math.min(1, (LARG_PARTITURA * 1.5) / img.naturalWidth);
    const cv = document.createElement('canvas');
    cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
    const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(img, 0, 0, cv.width, cv.height);
    return recortarPagina(cv);
  } finally { URL.revokeObjectURL(url); }
}

async function renderPaginaPdf(pdf, n, largura) {
  const pg = await pdf.getPage(n);
  const vp1 = pg.getViewport({ scale: 1 });
  const vp = pg.getViewport({ scale: escalaPdf(vp1, largura) });
  const cv = document.createElement('canvas');
  cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
  await pg.render({ canvasContext: g, viewport: vp }).promise;
  pg.cleanup();
  return cv;
}

const escalaPdf = (vp1, largura) => Math.min(5, largura / vp1.width);

// ---------- etapa 3: mapa da letra na página (para o celular destacar a pauta do que está no telão) ----------
// Só PDF digital (com texto). Para cada linha da letra: t = só as letras; a..b = faixa da pauta (sistema) e la..lb = a própria
// linha, em fração da altura da imagem já recortada. Linhas cantadas (sílabas "Ben-di-to") juntam-se no sistema da pauta de
// cima; linhas de texto corrido (estrofes do salmo) destacam só a linha.
// pautas na imagem da página: linhas de pauta = traços horizontais longos; 3+ linhas próximas = uma pauta; pautas ligadas pela
// chave/barra da esquerda = um sistema (piano, coro). Devolve [{ top, bottom, sp }] em pixels da página inteira.
function sistemasDaImagem(cv) {
  const L = cv.width, A = cv.height, px = cv.getContext('2d').getImageData(0, 0, L, A).data;
  const escuro = (x, y) => { const i = (y * L + x) * 4; return px[i] + px[i + 1] + px[i + 2] < 384; };
  const linhas = [];   // { y, x0 } (centro do traço)
  let dentro = null;
  for (let y = 0; y < A; y++) {
    let run = 0, maior = 0, ini = 0, x0 = 0;
    for (let x = 0; x < L; x++) {
      if (escuro(x, y)) { if (!run) ini = x; run++; if (run > maior) { maior = run; x0 = ini; } } else run = 0;
    }
    if (maior > L * 0.25) { if (dentro) { dentro.y2 = y; dentro.x0 = Math.min(dentro.x0, x0); } else dentro = { y1: y, y2: y, x0 }; }
    else if (dentro) { linhas.push({ y: (dentro.y1 + dentro.y2) / 2, x0: dentro.x0 }); dentro = null; }
  }
  if (linhas.length < 3) return [];
  const difs = linhas.slice(1).map((l, i) => l.y - linhas[i].y).sort((a, b) => a - b);
  const sp = difs[Math.floor(difs.length * 0.3)];          // distância entre as linhas de uma pauta
  const pautas = [];
  for (const l of linhas) {
    const p = pautas[pautas.length - 1];
    if (p && l.y - p.bottom < sp * 1.6) { p.bottom = l.y; p.n++; p.x0 = Math.min(p.x0, l.x0); }
    else pautas.push({ top: l.y, bottom: l.y, n: 1, x0: l.x0 });
  }
  const boas = pautas.filter(p => p.n >= 3);
  const sistemas = [];
  for (const p of boas) {
    const s = sistemas[sistemas.length - 1];
    let ligada = false;
    if (s) {   // a chave/barra da esquerda desce da pauta de cima até esta?
      const x = Math.min(s.x0, p.x0), y1 = Math.ceil(s.bottom), y2 = Math.floor(p.top);
      let ok = 0, tot = 0;
      for (let y = y1; y <= y2; y += 2) {
        tot++;
        for (let dx = -Math.round(sp * 1.5); dx <= 3; dx++) { const xx = x + dx; if (xx >= 0 && xx < L && escuro(xx, y)) { ok++; break; } }
      }
      ligada = tot > 0 && ok / tot > 0.9;
    }
    if (ligada) { s.bottom = p.bottom; s.x0 = Math.min(s.x0, p.x0); }
    else sistemas.push({ top: p.top, bottom: p.bottom, x0: p.x0, sp });
  }
  return sistemas;
}

async function mapaDaPagina(pdf, n, caixa, largura, sistemas = []) {
  const pg = await pdf.getPage(n);
  const vp1 = pg.getViewport({ scale: 1 }), esc1 = escalaPdf(vp1, largura), alt = vp1.height;
  const ls = linhasDaPagina((await pg.getTextContent()).items, alt);
  pg.cleanup();
  const letra = ls.filter(l => l.y > alt * 0.07 && l.tam >= 9 && l.tam <= 14 && ehTexto(l.bruto) && /\p{L}{2}/u.test(l.texto)
    && !/^(L\.|M\.|Arr\.|Pe\. |Letra\b|Música\b|Harm|Tune\b|Melodia\b)/i.test(l.texto) && !/S\. ?Paulo Schola|Escola de Cantores/i.test(l.texto)
    && !l.texto.split(' ').every(w => /^[A-G][#b♯♭]?(m|7|maj|sus|dim|\/|\d)*$/.test(w)));
  if (!letra.length) return null;
  const frPx = y => Math.round(Math.min(1, Math.max(0, (y - caixa.y0) / caixa.h)) * 10000) / 10000;
  if (sistemas.length) {
    // cada linha da letra vai para o sistema que a contém, ou para o de cima (letra debaixo da pauta, estrofes empilhadas)
    const sp = sistemas[0].sp;
    const grupos = new Map(), soltas = [];
    for (const l of letra) {
      const Y = l.y * esc1;
      let s = sistemas.find(s => Y >= s.top - sp && Y <= s.bottom + sp * 0.5);
      if (!s) s = [...sistemas].reverse().find(s => s.bottom < Y && Y - s.bottom < sp * 9);
      if (s) { if (!grupos.has(s)) grupos.set(s, []); grupos.get(s).push(l); } else soltas.push(l);
    }
    const out = [];
    for (const l of letra) {
      const t = soLetras(l.texto); if (t.length < 3) continue;
      const linha = { la: frPx((l.y - l.tam * 0.95) * esc1), lb: frPx((l.y + l.tam * 0.4) * esc1) };
      const s = [...grupos.entries()].find(([, ls]) => ls.includes(l))?.[0];
      if (!s) { out.push({ t, a: linha.la, b: linha.lb, ...linha }); continue; }
      const fundo = Math.max(s.bottom + sp * 2, ...grupos.get(s).map(x => (x.y + x.tam * 0.45) * esc1));
      out.push({ t, a: frPx(s.top - sp * 3), b: frPx(fundo), ...linha });
    }
    return out;
  }
  const cantada = l => (l.bruto.match(/\p{L}-/gu) || []).length >= 2 || (l.bruto.match(/(^| )\p{L}{1,3}(?= |$)/gu) || []).length / Math.max(1, l.bruto.split(' ').length) > 0.3;
  // sistemas: linhas cantadas seguidas e próximas (estrofes empilhadas debaixo da mesma pauta)
  const sist = [];
  for (const l of letra) {
    l.cantada = cantada(l);
    const s = sist[sist.length - 1], u = s && s.linhas[s.linhas.length - 1];
    if (l.cantada && s?.cantada && l.y - u.y < l.tam * 1.9) s.linhas.push(l);
    else sist.push({ cantada: l.cantada, linhas: [l] });
  }
  const inicios = sist.filter(s => s.cantada).map(s => s.linhas[0].y);
  const passos = inicios.slice(1).map((y, i) => y - inicios[i]).sort((a, b) => a - b);
  const altPauta = passos.length ? passos[Math.floor(passos.length / 2)] * 0.92 : alt * 0.16;
  const fr = y => Math.round(Math.min(1, Math.max(0, (y * esc1 - caixa.y0) / caixa.h)) * 10000) / 10000;
  const out = [];
  sist.forEach((s, k) => {
    const pri = s.linhas[0], ult = s.linhas[s.linhas.length - 1];
    let a, b = ult.y + ult.tam * 0.45;
    if (s.cantada) {
      const ant = sist[k - 1]?.linhas.slice(-1)[0];
      a = Math.max(ant ? ant.y + ant.tam * 0.5 : 0, pri.y - altPauta);
    } else a = pri.y - pri.tam * 0.95;
    for (const l of s.linhas) {
      const t = soLetras(l.texto);
      if (t.length >= 3) out.push({ t, a: fr(a), b: fr(b), la: fr(l.y - l.tam * 0.95), lb: fr(l.y + l.tam * 0.4) });
    }
  });
  return out;
}
async function paginaPdfComMapa(pdf, n) {
  const largura = LARG_PARTITURA * 1.5;
  const cv = await renderPaginaPdf(pdf, n, largura);
  const r = recortarComCaixa(cv);
  let mapa = null;
  try { mapa = await mapaDaPagina(pdf, n, r, largura, sistemasDaImagem(cv)); } catch (e) { console.warn('mapa da partitura', e); }
  return { url: r.url, mapa };
}

const normTit = t => semAcento(String(t || '')).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- etapa 2: separar as músicas de um PDF de partituras (um caderno por domingo) ----------
// Página que começa música: título grande (≥ 20 pt, letras de verdade) no alto. Continuação: sem título grande.
// Capa (sem sílabas cantadas) e páginas em branco ficam de fora. Devolve [{ titulo, sub, cabeca, paginas, letra }].
const TITULO_GENERICO = /^(ant[ií]fona d[ae] (entrada|comunh[aã]o)|salmo responsorial|aclama[cç][aã]o( ao evangelho)?|aleluia|sequ[eê]ncia)(\s*[-–—:]\s*\S.*)?$/i;
const ehTexto = s => /[A-Za-zÀ-ÿ]{3,}/.test(s) && (s.match(/[A-Za-zÀ-ÿ ,.!?'-]/g) || []).length >= s.length * 0.8;

// linhas de texto da página: itens agrupados pela altura, com as sílabas "Ben- di- to" juntadas
function linhasDaPagina(itens, alturaPg) {
  const ls = [];
  for (const it of itens) {
    const s = it.str; if (!s || !s.trim()) continue;
    const tam = Math.round(Math.hypot(it.transform[0], it.transform[1]) * 10) / 10;
    const x = it.transform[4], y = alturaPg - it.transform[5];
    let l = ls.find(k => Math.abs(k.y - y) < Math.max(2, tam * 0.3) && Math.abs(k.tam - tam) < 1.5);
    if (!l) ls.push(l = { y, tam, partes: [] });
    l.partes.push({ x, s, larg: it.width || s.length * tam * 0.5 });
  }
  for (const l of ls) {
    l.partes.sort((a, b) => a.x - b.x);
    let t = '', fim = -1e9;
    for (const p of l.partes) {
      const s = p.s.replace(/\s+/g, ' ');
      if (t && !t.endsWith(' ') && !t.endsWith('-') && !/^[-,.;:!?)]/.test(s) && p.x - fim > l.tam * 0.22) t += ' ';
      t += s; fim = p.x + p.larg;
    }
    t = t.replace(/Þ/g, 'fi').replace(/ß/g, 'fl').replace(/([a-zà-ÿ])I{1,2}(?=[a-zà-ÿ])/g, '$1 ');   // ligadura "fi" e o "‿" da elisão
    l.texto = t.replace(/(\p{L})\s*-{2,}\s*(?=\p{L})/gu, '$1 ').replace(/\s*-\s*/g, '-').replace(/(\p{L})-(?=\p{L})/gu, '$1')
      .replace(/-+\s*$/, '').replace(/\s+/g, ' ').trim();
    l.bruto = t.replace(/\s+/g, ' ').trim();
    l.x = l.partes[0].x;
  }
  return ls.sort((a, b) => a.y - b.y);
}

async function separarMusicasPdf(pdf) {
  const musicas = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const pg = await pdf.getPage(n);
    const vp = pg.getViewport({ scale: 1 }), alt = vp.height, larg = vp.width;
    const ls = linhasDaPagina((await pg.getTextContent()).items, alt);
    pg.cleanup();
    if (!ls.length) continue;                                          // página em branco
    // sílabas cantadas: "Ben-di-to" ou, em algumas antífonas, "pen sa men tos" (letra pequena e muitas palavras curtas)
    const silabas = ls.reduce((k, l) => k + (l.bruto.match(/\p{L}-/gu) || []).length + (l.tam < 14 ? (l.bruto.match(/(^| )\p{L}{1,3}(?= )/gu) || []).length / 3 : 0), 0);
    const grandes = ls.filter(l => l.tam >= 20 && l.y < alt * 0.3 && ehTexto(l.bruto));
    let inicioLetra = 0;
    if (grandes.length && silabas >= 4) {
      const t = grandes[0];
      const sub = ls.find(l => l !== t && l.y > t.y && l.y < t.y + t.tam * 2.6 && l.tam >= 14 && ehTexto(l.bruto));
      const cabeca = ls.filter(l => l.y < t.y && l.tam < t.tam && /\p{L}{2}/u.test(l.bruto)).map(l => l.bruto).join(' · ');
      // créditos (Pe. Fulano, L. e M.:, Arr.:) ficam à direita, logo abaixo do título
      const creditos = ls.filter(l => l.y > t.y && l.y < t.y + 90 && l.x > larg * 0.45 && l.tam <= 13 && ehTexto(l.bruto)).map(l => l.bruto);
      musicas.push({ titulo: t.bruto, sub: sub?.bruto || '', cabeca, creditos, paginas: [n], linhas: [] });
      inicioLetra = (sub || t).y + 4;
    } else if (!musicas.length || silabas < 2) continue;                 // capa, índice…
    else { musicas[musicas.length - 1].paginas.push(n); inicioLetra = alt * 0.07; }   // continuação: pula o cabeçalho repetido
    // letra: linhas de texto corrido da altura da letra (sem acordes, créditos e cabeçalhos)
    const m = musicas[musicas.length - 1];
    for (const l of ls) {
      if (l.y < inicioLetra || l.tam < 9 || l.tam > 14 || !ehTexto(l.bruto) || !/\p{L}{2}/u.test(l.texto)) continue;
      if (/^(L\.|M\.|Arr\.|Pe\. |Letra\b|Música\b|Harm|Tune\b|Melodia\b)/i.test(l.texto) || /S\. ?Paulo Schola|Escola de Cantores/i.test(l.texto) || m.creditos.includes(l.bruto)) continue;
      if (normTit(l.texto) === normTit(m.titulo) || normTit(l.texto) === normTit(m.sub)) continue;
      if (l.texto.split(' ').every(w => /^[A-G][#b♯♭]?(m|7|maj|sus|dim|\/|\d)*$/.test(w))) continue;
      m.linhas.push(l.texto);
    }
  }
  for (const m of musicas) {
    m.letra = m.linhas.join('\n'); delete m.linhas;
    m.nome = /\s[-–—:]\s*\S/.test(m.titulo) && TITULO_GENERICO.test(m.titulo.trim()) ? m.titulo.replace(/\s*[-–]\s+/, ' — ')
      : TITULO_GENERICO.test(m.titulo.trim()) && m.sub ? `${m.titulo} — ${m.sub.replace(/\s*-\s*[XVI]+ Domingo.*$/i, '').replace(/^[XVI]+ Domingo.*$/i, '').trim()}`.replace(/ — $/, '') : m.titulo;
    m.autor = (m.creditos || []).map(c => c.replace(/^(L\. e M\.|Letra e música|Arr\.)\s*:\s*/i, '').replace(/\s*\|\s*$/, '')).filter(Boolean).join(' · ');
    const k = semAcento(`${m.cabeca} ${m.titulo}`);
    m.momento = /entrada/.test(k) ? 'Entrada' : /salmo/.test(k) ? 'Salmo' : /oferend|ofert/.test(k) ? 'Ofertório'
      : /comunh/.test(k) ? 'Comunhão' : /aclama|aleluia/.test(k) ? 'Aclamação ao Evangelho' : /envio|final/.test(k) ? 'Final'
      : /santo\b/.test(k) ? 'Santo' : /cordeiro/.test(k) ? 'Cordeiro' : /gloria/.test(k) ? 'Glória' : '';
    if (TITULO_GENERICO.test(m.titulo.trim()) && m.nome === m.titulo && /\d/.test(m.cabeca)) m.nome += ` — ${m.cabeca.split(' · ')[0]}`;   // "Salmo Responsorial — Sl 127"
  }
  // sem momento escrito, pela ordem: antes do Salmo é Entrada; depois do Ofertório, Comunhão (se ainda não houver) e Final
  const iSal = musicas.findIndex(m => m.momento === 'Salmo');
  musicas.slice(0, iSal < 0 ? 0 : iSal).forEach(m => { if (!m.momento) m.momento = 'Entrada'; });
  const iOf = musicas.findIndex(m => m.momento === 'Ofertório');
  let jaComunhao = false;
  if (iOf >= 0) for (const m of musicas.slice(iOf + 1)) {
    if (m.momento === 'Comunhão') jaComunhao = true;
    else if (!m.momento) { m.momento = jaComunhao ? 'Final' : 'Comunhão'; jaComunhao = true; }
  }
  return musicas;
}

// ---------- etapa 2: ligar cada música do PDF a um canto ou item do roteiro ----------
// Comparação pela letra: só as letras (o PDF separa as sílabas com espaço: "pen sa men tos"), em pedaços de 6 letras;
// nota = parte em comum sobre o menor dos dois textos.
const soLetras = s => semAcento(String(s || '')).replace(/[^a-z]/g, '');
function pedacos(s) {
  const t = soLetras(s), set = new Set();
  for (let i = 0; i + 6 <= t.length; i++) set.add(t.slice(i, i + 6));
  return set;
}
function notaLetra(a, b) {
  if (a.size < 30 || b.size < 30) return 0;
  const [p, g] = a.size < b.size ? [a, b] : [b, a];
  let k = 0; for (const x of p) if (g.has(x)) k++;
  return k / p.size;
}
const PartFol = { pdf: null, nome: '', musicas: [], cacheCantos: new Map() };
const pedacosCanto = c => {
  const ch = c.id + '|' + (c.atualizado || 0);
  let v = PartFol.cacheCantos.get(ch);
  if (!v) PartFol.cacheCantos.set(ch, v = pedacos(`${c.titulo} ${c.refrao || ''} ${c.letra || ''}`));
  return v;
};
const textoItemPart = it => [it.titulo, it.refraoRezado, it.textoRezado, it.refrao, it.texto].filter(Boolean).join(' ');
const rotuloItem = it => { const r = resumoItem(it); return `${r.rot}: ${r.tit}`; };
const ehItemDeCanto = it => it.tipo === 'canto' || it.tipo === 'salmo' || (it.tipo === 'texto' && /ant[ií]fona/i.test(it.titulo || ''));
// lugar de canto vazio no roteiro (ou apontando para um canto que foi apagado)
const ehVazio = it => it.tipo === 'canto' && !it.textoRezado && !it.oracaoId && !S.cantos.some(c => c.id === it.cantoId);

// sugestão de destino para cada música (sem usar o mesmo item duas vezes)
function sugerirDestinos(musicas) {
  // itens montados pelo folheto podem vir sem id: ganham um (a escolha aponta para o item pelo id)
  const semId = (S.roteiro?.itens || []).filter(it => !it.id);
  semId.forEach(it => { it.id = uid(); });
  if (semId.length) salvarRoteiro();
  const itens = (S.roteiro?.itens || []).filter(ehItemDeCanto);
  const usados = new Set();
  const vazio = mom => itens.find(it => ehVazio(it) && it.momento === mom && !usados.has(it.id));
  for (const m of musicas) {
    m.destino = undefined;
    const pm = pedacos(`${m.titulo} ${m.letra}`);
    const generico = TITULO_GENERICO.test(m.titulo.trim());
    const notaCanto = c => (!generico && normTit(c.titulo) === normTit(m.titulo) ? 1 : notaLetra(pm, pedacosCanto(c)));
    // 1) canto já escolhido no roteiro
    let melhor = null, nota = 0;
    for (const it of itens) {
      if (usados.has(it.id)) continue;
      const c = it.tipo === 'canto' && it.cantoId && S.cantos.find(x => x.id === it.cantoId);
      const n = c ? notaCanto(c) : notaLetra(pm, pedacos(textoItemPart(it)));
      if (n > nota) { nota = n; melhor = { it, c }; }
    }
    m.candidatos = [];
    if (melhor && nota >= (melhor.c ? 0.45 : 0.35)) {
      usados.add(melhor.it.id);
      m.destino = melhor.c ? `c:${melhor.c.id}` : `i:${melhor.it.id}`;
    }
    // antífona/salmo sem texto parecido: o item do mesmo momento
    if (m.destino === undefined && generico) {
      const qual = /entrada/i.test(m.titulo) ? /entrada/i : /comunh/i.test(m.titulo) ? /comunh/i : null;
      const it = (qual && itens.find(i => !usados.has(i.id) && i.tipo === 'texto' && qual.test(i.titulo || ''))) || itens.find(i => !usados.has(i.id) && (m.momento === 'Salmo' ? i.tipo === 'salmo' && i.rotulo !== 'Canto' : i.tipo === 'canto' && i.momento === m.momento));
      // se o lugar já tem outro canto escolhido, a antífona fica de fora (não é a partitura daquele canto)
      const outro = it && it.tipo === 'canto' && S.cantos.some(c => c.id === it.cantoId);
      if (it && !outro) { usados.add(it.id); m.destino = ehVazio(it) ? `n@${it.id}` : `i:${it.id}`; }
      else if (outro) m.destino = '';
    }
    // 2) canto do acervo (fora do roteiro): os 3 mais parecidos viram opções
    if (!generico) {
      m.candidatos = S.cantos.map(c => [c, notaCanto(c)]).filter(([, n]) => n >= 0.3).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
      if (m.destino === undefined && m.candidatos.length && notaCanto(m.candidatos[0]) >= 0.5) {
        const c = m.candidatos[0], v = vazio(c.momento) || vazio(m.momento);
        if (v) usados.add(v.id);
        m.destino = `c:${c.id}${v ? '@' + v.id : ''}`;
      }
    }
    // 3) canto novo (no lugar vazio do momento, se houver)
    if (m.destino === undefined) { const v = vazio(m.momento); if (v) usados.add(v.id); m.destino = v ? `n@${v.id}` : 'novo'; }
  }
}

function opcoesDestino(m) {
  const itens = (S.roteiro?.itens || []).filter(ehItemDeCanto);
  const op = (v, t) => `<option value="${esc(v)}" ${v === m.destino ? 'selected' : ''}>${esc(t)}</option>`;
  const tem = c => Partituras.lista.has(c.id) ? ' — troca a partitura dele' : '';
  let h = op('', '— não usar —');
  h += '<optgroup label="No roteiro aberto">';
  for (const it of itens) {
    const c = it.tipo === 'canto' && it.cantoId && S.cantos.find(x => x.id === it.cantoId);
    if (c) h += op(`c:${c.id}`, `${it.momento}: ${c.titulo}${tem(c)}`);
    else if (ehVazio(it)) h += op(`n@${it.id}`, `${it.momento}: (vazio) → criar o canto aqui`);
    else h += op(`i:${it.id}`, rotuloItem(it) + (it.partituraId ? ' — troca a partitura dele' : ''));
  }
  h += '</optgroup>';
  const vazios = itens.filter(ehVazio);
  const noRoteiro = new Set(itens.map(it => it.cantoId).filter(Boolean));
  if (m.candidatos?.length) {
    h += '<optgroup label="Cantos parecidos do acervo">';
    for (const c of m.candidatos) {
      if (!noRoteiro.has(c.id)) h += op(`c:${c.id}`, `${c.titulo} (só guardar a partitura)${tem(c)}`);
      for (const v of vazios) h += op(`c:${c.id}@${v.id}`, `${c.titulo} → no roteiro em ${v.momento}`);
    }
    h += '</optgroup>';
  }
  h += op('novo', 'Criar canto novo (fora do roteiro)');
  return h;
}

function renderPartFolheto() {
  const el = $('#partFolLista');
  if (!PartFol.musicas.length) { el.innerHTML = PartFol.pdf ? '<p class="sutil">Não achei músicas neste PDF (título grande no alto da página com a letra embaixo). Use o editor do canto para escolher as páginas à mão.</p>' : ''; $('#btnPartFolGuardar').disabled = true; return; }
  el.innerHTML = `<p class="sutil pequeno"><b>${esc(PartFol.nome)}</b>: ${PartFol.musicas.length} música(s). Confira para onde vai cada partitura.</p>` +
    PartFol.musicas.map((m, k) => `<div class="part-fol-item">
      <img data-mini="${k}" alt="">
      <div><b>${esc(m.nome)}</b>
        <small>${m.paginas.length > 1 ? 'páginas' : 'página'} ${m.paginas.join(', ')}${m.momento ? ' · ' + esc(m.momento) : ''}${m.autor ? ' · ' + esc(m.autor) : ''}</small>
        <select data-dest="${k}">${opcoesDestino(m)}</select></div></div>`).join('');
  $('#btnPartFolGuardar').disabled = false;
  // miniaturas (primeira página de cada música), uma de cada vez
  (async () => {
    const pdf = PartFol.pdf;
    for (let k = 0; k < PartFol.musicas.length && PartFol.pdf === pdf; k++) {
      const img = el.querySelector(`[data-mini="${k}"]`); if (!img) return;
      img.src = (await renderPaginaPdf(pdf, PartFol.musicas[k].paginas[0], 140)).toDataURL('image/jpeg', 0.7);
    }
  })();
}

async function abrirPdfPartituras(bytes, nome) {
  await Folheto.carregarPdfjs();
  $('#partFolLista').innerHTML = '<p class="sutil">Separando as músicas…</p>';
  PartFol.pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  PartFol.nome = nome;
  PartFol.musicas = await separarMusicasPdf(PartFol.pdf);
  sugerirDestinos(PartFol.musicas);
  renderPartFolheto();
}

function abrirPartiturasFolheto() {
  $('#partFolRoteiro').textContent = S.roteiro?.nome || '';
  $('#partFolSiteLista').hidden = true;
  if (!PartFol.pdf) $('#partFolLista').innerHTML = '';
  // o roteiro aberto pode ter mudado: refaz as sugestões
  else { sugerirDestinos(PartFol.musicas); renderPartFolheto(); }
  abrirDialogo('dlgPartFolheto');
}

// Folheto Povo de Deus (Arquidiocese de São Paulo): a tabela tem data, celebração, Folheto e Partituras
const URL_PARTITURAS_SP = 'https://arquisp.org.br/folheto-povo-de-deus/';
async function listarPartiturasSP() {
  const el = $('#partFolSiteLista');
  el.hidden = false;
  if (!NO_APP) { el.innerHTML = `<p class="sutil">No navegador o MiguelAngelus não consegue baixar sozinho. Baixe o PDF de partituras em <b>${URL_PARTITURAS_SP}</b> e use 📂 Abrir PDF.</p>`; return; }
  el.innerHTML = '<p class="sutil">Procurando as partituras publicadas…</p>';
  try {
    const r = await httpApp(URL_PARTITURAS_SP);
    const doc = new DOMParser().parseFromString(r.texto, 'text/html');
    const lista = [];
    for (const tr of doc.querySelectorAll('tr')) {
      const a = [...tr.querySelectorAll('a[href]')].find(x => /partitura/i.test(x.textContent + x.getAttribute('href')));
      if (!a) continue;
      const tds = [...tr.querySelectorAll('td')].map(td => td.textContent.replace(/\s+/g, ' ').trim());
      const iso = deDataBR(tds.join(' ')) || dataNoTexto(a.getAttribute('href'));
      const nome = tds.find(t => t && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t) && !/^(folheto|partituras?)$/i.test(t)) || 'Partituras';
      lista.push({ url: new URL(a.getAttribute('href'), URL_PARTITURAS_SP).href, iso, nome });
    }
    const corte = isoData(new Date(Date.now() - 8 * 864e5));
    const mostrar = lista.filter(f => !f.iso || f.iso >= corte).sort((a, b) => (a.iso || '9').localeCompare(b.iso || '9')).slice(0, 8);
    el.innerHTML = mostrar.length ? mostrar.map(f => {
      const d = f.iso ? deIso(f.iso) : null;
      return `<div class="fol-item"><span class="fol-data">${d ? `${DIAS_CURTOS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : ''}</span>
        <span class="fol-nome">${esc(f.nome)}</span><button type="button" data-partsp="${esc(f.url)}" data-nome="${esc(f.nome)}">⬇ Baixar</button></div>`;
    }).join('') : `<p class="sutil">Nenhuma partitura nova em ${URL_PARTITURAS_SP}.</p>`;
  } catch (e) { el.innerHTML = `<p class="sutil">Não consegui abrir ${URL_PARTITURAS_SP}: ${esc(e.message)}</p>`; }
}

async function baixarPartiturasSP(botao) {
  botao.disabled = true;
  const t0 = Date.now(), relogio = setInterval(() => { botao.textContent = `Baixando… ${Math.round((Date.now() - t0) / 1000)} s`; }, 1000);
  try {
    const r = await httpApp(botao.dataset.partsp, { binario: true }).finally(() => clearInterval(relogio));
    let bytes = base64ParaBytes(r.base64);
    const inicio = String.fromCharCode(...bytes.slice(0, 1024)).indexOf('%PDF');
    if (inicio < 0) throw new Error(r.status >= 400 ? `o site respondeu erro ${r.status}` : 'o site não devolveu um PDF');
    if (inicio > 0) bytes = bytes.slice(inicio);
    $('#partFolSiteLista').hidden = true;
    await abrirPdfPartituras(bytes, 'Partituras — ' + botao.dataset.nome);
  } catch (e) {
    alert('Não foi possível baixar as partituras:\n' + e.message);
    botao.disabled = false; botao.textContent = '⬇ Baixar';
  }
}

// Guardar: cada música vira as páginas (sem margens) no canto ou no item escolhido
async function guardarPartiturasFolheto() {
  const bt = $('#btnPartFolGuardar');
  const itens = S.roteiro?.itens || [];
  const escolhas = PartFol.musicas.map((m, k) => [m, $(`#partFolLista [data-dest="${k}"]`)?.value || '']).filter(([, d]) => d);
  if (!escolhas.length) return toast('Nenhuma música marcada para guardar.');
  bt.disabled = true;
  let roteiroMudou = false, novos = 0, feitas = 0;
  try {
    for (const [m, dest] of escolhas) {
      bt.textContent = `Preparando ${++feitas} de ${escolhas.length}…`;
      const paginas = [];
      const mapa = [];
      for (const n of m.paginas) { const p = await paginaPdfComMapa(PartFol.pdf, n); paginas.push(p.url); mapa.push(p.mapa); }
      const [alvo, noItem] = dest.split('@');
      const item = noItem && itens.find(i => i.id === noItem);
      if (alvo.startsWith('i:')) {
        const it = itens.find(i => i.id === alvo.slice(2)); if (!it) continue;
        const reg = { id: it.partituraId || 'p-' + uid(), titulo: m.nome, paginas, mapa, origem: PartFol.nome };
        await DB.salvar('partituras', reg); Partituras.lista.set(reg.id, reg);
        it.partituraId = reg.id; roteiroMudou = true;
        continue;
      }
      let c = alvo.startsWith('c:') ? S.cantos.find(x => x.id === alvo.slice(2)) : null;
      if (!c) {   // canto novo: título, autor e letra tirados do PDF (a letra vem com as sílabas da partitura: confira)
        c = { id: uid(), titulo: m.nome, autor: m.autor || '', momento: item?.momento || m.momento || 'Outros', letra: m.letra, origem: 'partitura' };
        await DB.salvar('cantos', c); S.cantos.push(c); novos++;
      }
      const reg = { id: c.id, titulo: c.titulo, paginas, mapa, origem: PartFol.nome };
      await DB.salvar('partituras', reg); Partituras.lista.set(c.id, reg);
      if (item) { item.cantoId = c.id; roteiroMudou = true; }
    }
  } catch (e) { console.warn(e); alert('Não consegui guardar as partituras:\n' + e.message); }
  if (roteiroMudou) { salvarRoteiro(); }
  bt.textContent = 'Guardar'; bt.disabled = false;
  $('#dlgPartFolheto').close();
  aposMudarCantos();
  if (typeof agendarEstadoCelular === 'function') agendarEstadoCelular();
  toast(`${feitas} partitura(s) guardada(s)${novos ? ` · ${novos} canto(s) novo(s): confira a letra` : ''}. Os músicos já veem no celular.`);
}

// cabeçalho do item do roteiro que tem partitura própria (antífona, salmo, canto rezado…)
function htmlPartituraDoItem(it) {
  const p = it.partituraId && Partituras.lista.get(it.partituraId);
  if (!p) return '';
  return `<div class="cab-linha fundo-item"><span class="sutil pequeno">🎼 Partitura: <b>${esc(p.titulo || '')}</b> (${p.paginas.length} pág.) — aparece no app dos músicos</span>
    <button data-cmd="partituraTirar" class="perigo" title="Tirar a partitura deste item">✕</button></div>`;
}
async function tirarPartituraDoItem(it) {
  if (!it.partituraId || !confirm('Tirar a partitura deste item do roteiro?')) return;
  const id = it.partituraId;
  delete it.partituraId;
  if (!(S.roteiros || []).some(r => (r.itens || []).some(i => i.partituraId === id))) { await DB.remover('partituras', id); Partituras.lista.delete(id); }
  salvarRoteiro(); renderCabecalho();
  if (typeof agendarEstadoCelular === 'function') agendarEstadoCelular();
}

// ---------- escolher as páginas do PDF ----------
async function escolherPaginasPdf(arquivo, titulo) {
  await Folheto.carregarPdfjs();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  const dlg = $('#dlgPartPdf'), grade = $('#partPdfGrade');
  grade.innerHTML = '';
  $('#partPdfNome').textContent = arquivo.name;
  const alvo = normTit(titulo);
  const marcadas = new Set();
  dlg.returnValue = '';
  dlg.showModal();
  // miniaturas uma a uma (o diálogo já aparece com as primeiras); páginas com o título do canto vêm marcadas
  for (let n = 1; n <= pdf.numPages && dlg.open; n++) {
    const cv = await renderPaginaPdf(pdf, n, 220);
    let texto = '';
    try { texto = normTit((await (await pdf.getPage(n)).getTextContent()).items.map(i => i.str).join(' ')); } catch (_) {}
    const vazia = !texto && cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data.every(v => v > 245);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'part-mini'; b.dataset.n = n;
    b.appendChild(cv);
    b.insertAdjacentHTML('beforeend', `<span>${n}${vazia ? ' · em branco' : ''}</span>`);
    if (alvo.length >= 4 && texto.includes(alvo)) { marcadas.add(n); b.classList.add('sel'); }
    grade.appendChild(b);
  }
  if (!dlg.open) return null;
  const contar = () => { $('#partPdfUsar').textContent = marcadas.size ? `Usar ${marcadas.size} página(s)` : 'Marque as páginas'; $('#partPdfUsar').disabled = !marcadas.size; };
  contar();
  grade.onclick = e => {
    const b = e.target.closest('.part-mini'); if (!b) return;
    const n = +b.dataset.n;
    if (marcadas.has(n)) marcadas.delete(n); else marcadas.add(n);
    b.classList.toggle('sel', marcadas.has(n)); contar();
  };
  const fim = await new Promise(ok => dlg.addEventListener('close', () => ok(dlg.returnValue), { once: true }));
  grade.onclick = null;
  if (fim !== 'usar' || !marcadas.size) return null;
  const paginas = [];
  for (const n of [...marcadas].sort((a, b) => a - b)) {
    toast(`Preparando a página ${n}…`);
    paginas.push(await paginaPdfComMapa(pdf, n));
  }
  return paginas;
}

// ---------- no editor do canto ----------
function abrirPartituraNoEditor(c) {
  const p = partituraDe(c);
  Partituras.editando = p ? p.paginas.map((url, i) => ({ url, mapa: p.mapa?.[i] || null })) : [];   // { url, mapa }
  Partituras.mudou = false;
  $('#cxPartitura').open = !!p;
  renderPartituraEditor();
}

function renderPartituraEditor() {
  const pags = Partituras.editando || [];
  $('#partPaginas').innerHTML = pags.length ? pags.map((u, i) => `<div class="part-pg">
      <img src="${u.url}" alt="Página ${i + 1} da partitura">
      <div class="part-pg-acoes"><span>${i + 1}</span>
        <button type="button" data-part-mover="${i}" data-d="-1" ${i ? '' : 'disabled'} title="Antes">◀</button>
        <button type="button" data-part-mover="${i}" data-d="1" ${i < pags.length - 1 ? '' : 'disabled'} title="Depois">▶</button>
        <button type="button" data-part-tirar="${i}" title="Tirar esta página">✕</button></div></div>`).join('')
    : '<p class="sutil pequeno">Sem partitura. Carregue o PDF do folheto (escolha as páginas deste canto) ou uma foto/imagem da partitura.</p>';
  $('#btnPartApagar').hidden = !pags.length;
  $('#cxPartitura summary small').textContent = pags.length ? `— ${pags.length} página(s); aparece no app dos músicos` : '— PDF ou imagem; aparece no app dos músicos';
}

async function carregarArquivosPartitura(arquivos) {
  const f = $('#formCanto');
  let novas = [];
  try {
    for (const a of arquivos) {
      if (/\.pdf$/i.test(a.name) || a.type === 'application/pdf') {
        const p = await escolherPaginasPdf(a, f.titulo.value);
        if (p) novas.push(...p);
      } else if (/^image\//.test(a.type)) {
        toast('Preparando a imagem…');
        novas.push({ url: await imagemParaPagina(a), mapa: null });
      }
    }
  } catch (e) { console.warn(e); alert('Não consegui ler este arquivo:\n' + e.message); }
  if (!novas.length) return;
  Partituras.editando = [...(Partituras.editando || []), ...novas];
  Partituras.mudou = true;
  $('#cxPartitura').open = true;
  renderPartituraEditor();
  toast(`${novas.length} página(s) na partitura. Salve o canto para guardar.`);
}

// chamado depois de salvar o canto (o canto novo só ganha id ao salvar)
async function salvarPartituraDoCanto(c) {
  if (!Partituras.mudou || !c?.id) return;
  Partituras.mudou = false;
  const pags = Partituras.editando || [];
  if (!pags.length) {
    if (Partituras.lista.has(c.id)) { await DB.remover('partituras', c.id); Partituras.lista.delete(c.id); }
    return;
  }
  const reg = { id: c.id, titulo: c.titulo, paginas: pags.map(p => p.url), mapa: pags.map(p => p.mapa || null) };
  await DB.salvar('partituras', reg);
  Partituras.lista.set(c.id, reg);
}

async function apagarPartituraDoCanto(id) {
  if (Partituras.lista.has(id)) { await DB.remover('partituras', id); Partituras.lista.delete(id); }
}

// ---------- para o app dos músicos ----------
// ids das páginas: canto.versão.n (a versão muda quando a partitura muda, e o celular não fica com a imagem velha)
const idsDoRegistro = p => p ? p.paginas.map((_, n) => `${p.id}.${p.atualizado || 0}.${n}`) : [];
const idsPartitura = c => idsDoRegistro(partituraDe(c));
// mapa da letra de cada página (etapa 3), na ordem dos ids; null quando nenhuma página tem (imagem, PDF escaneado)
function mapaDosIds(ids) {
  const m = ids.map(id => { const [rid, , n] = id.split('.'); return Partituras.lista.get(rid)?.mapa?.[+n] || null; });
  return m.some(Boolean) ? m : null;
}
const idsPartituraItem = it => idsDoRegistro(it?.partituraId && Partituras.lista.get(it.partituraId));
// manda para o programa (servidor do celular) as páginas que ainda não foram, antes da lista de cantos
function enviarPartiturasCelular(musica) {
  for (const m of musica) for (const id of m.partitura || []) {
    if (Partituras.enviadas.has(id)) continue;
    const [cid, , n] = id.split('.');
    const url = Partituras.lista.get(cid)?.paginas?.[+n];
    if (!url) continue;
    postarApp({ tipo: 'celular', acao: 'partitura', id, jpeg: url });
    Partituras.enviadas.add(id);
  }
}

function ligarPartituras() {
  $('#btnPartCarregar').addEventListener('click', () => $('#arqPartitura').click());
  $('#arqPartitura').addEventListener('change', e => { const a = [...e.target.files]; e.target.value = ''; if (a.length) carregarArquivosPartitura(a); });
  $('#btnPartApagar').addEventListener('click', () => {
    if (!confirm('Tirar a partitura deste canto? (só some quando você salvar o canto)')) return;
    Partituras.editando = []; Partituras.mudou = true; renderPartituraEditor();
  });
  $('#partPaginas').addEventListener('click', e => {
    const pags = Partituras.editando; if (!pags) return;
    const t = e.target.closest('[data-part-tirar]'), m = e.target.closest('[data-part-mover]');
    if (t) pags.splice(+t.dataset.partTirar, 1);
    else if (m) { const i = +m.dataset.partMover, j = i + +m.dataset.d; [pags[i], pags[j]] = [pags[j], pags[i]]; }
    else return;
    Partituras.mudou = true; renderPartituraEditor();
  });
  // soltar PDF/imagem em cima da caixa da partitura
  const cx = $('#cxPartitura');
  cx.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); });
  cx.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    const a = [...(e.dataTransfer?.files || [])].filter(f => /\.pdf$/i.test(f.name) || /^image\//.test(f.type));
    if (a.length) carregarArquivosPartitura(a);
  });

  // 🎼 Partituras do folheto (o PDF do domingo inteiro)
  $('#btnPartFolheto').addEventListener('click', abrirPartiturasFolheto);
  $('#btnPartFolArq').addEventListener('click', () => $('#arqPartFolheto').click());
  const abrirArq = async a => {
    try { await abrirPdfPartituras(new Uint8Array(await a.arrayBuffer()), a.name.replace(/\.pdf$/i, '')); }
    catch (e) { console.warn(e); $('#partFolLista').innerHTML = ''; alert('Não consegui ler este PDF:\n' + e.message); }
  };
  $('#arqPartFolheto').addEventListener('change', e => { const a = e.target.files[0]; e.target.value = ''; if (a) abrirArq(a); });
  $('#btnPartFolSite').addEventListener('click', listarPartiturasSP);
  $('#partFolSiteLista').addEventListener('click', e => { const b = e.target.closest('[data-partsp]'); if (b) baixarPartiturasSP(b); });
  $('#btnPartFolGuardar').addEventListener('click', guardarPartiturasFolheto);
  const dlg = $('#dlgPartFolheto');
  dlg.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); });
  dlg.addEventListener('drop', e => {
    e.preventDefault(); e.stopPropagation();
    const a = [...(e.dataTransfer?.files || [])].find(f => /\.pdf$/i.test(f.name));
    if (a) abrirArq(a);
  });
}
