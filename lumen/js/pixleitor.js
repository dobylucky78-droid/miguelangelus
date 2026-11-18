'use strict';
/*
 * (1.9.8) Quem recebe o Pix: lê a imagem do QR code (biblioteca jsQR, lib/jsqr, Apache-2.0) e o "BR Code" do Banco
 * Central que vem dentro dele (EMV: campo 59 = nome do recebedor, 60 = cidade, 26 = chave ou link do Pix, 54 = valor).
 * Mostra "Recebedor: PAROQUIA …" ao lado do QR (Ajustes → Pix e as campanhas): um QR trocado aparece na hora com outro nome.
 * O CRC do fim do código (campo 63) também é conferido. Tudo no computador: nada vai para a internet.
 */
const PixLeitor = { cache: new Map() };

// Lê o texto do QR de uma imagem (dataURL). Tenta com margem branca em volta (QR recortado rente não é achado sem ela).
async function lerQrDeImagem(url) {
  if (!url || typeof jsQR !== 'function') return null;
  const img = await new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = falha; i.src = url; });
  const lado = Math.max(img.width, img.height), k = Math.min(1, 1000 / lado);
  const w = Math.round(img.width * k), h = Math.round(img.height * k), m = Math.round(Math.max(w, h) * .1);
  const cv = document.createElement('canvas'); cv.width = w + 2 * m; cv.height = h + 2 * m;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
  g.drawImage(img, m, m, w, h);
  const d = g.getImageData(0, 0, cv.width, cv.height);
  return jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' })?.data || null;
}

// CRC16-CCITT (0x1021, começa em 0xFFFF): o do BR Code
function crcPix(texto) {
  let crc = 0xFFFF;
  for (const b of new TextEncoder().encode(texto)) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Campos EMV "ID(2) TAMANHO(2) VALOR" → { '00': '01', '26': '…', … }
function camposEmv(s) {
  const r = {};
  for (let i = 0; i + 4 <= s.length;) {
    const id = s.slice(i, i + 2), n = parseInt(s.slice(i + 2, i + 4), 10);
    if (!/^\d\d$/.test(id) || isNaN(n) || i + 4 + n > s.length) return null;
    r[id] = s.slice(i + 4, i + 4 + n); i += 4 + n;
  }
  return r;
}

// O texto do QR é um Pix? → { nome, cidade, chave, link, valor, crcOk } ou null
function lerBrCode(texto) {
  const t = (texto || '').trim(), c = camposEmv(t);
  if (!c || c['00'] !== '01') return null;
  // a conta do Pix: um dos campos 26 a 51 com "br.gov.bcb.pix"
  let conta = null;
  for (let id = 26; id <= 51; id++) {
    const sub = c[String(id)] && camposEmv(c[String(id)]);
    if (sub && (sub['00'] || '').toLowerCase() === 'br.gov.bcb.pix') { conta = sub; break; }
  }
  if (!conta) return null;
  const k = t.lastIndexOf('6304');
  const crcOk = k >= 0 && k + 8 === t.length && crcPix(t.slice(0, k + 4)) === t.slice(k + 4).toUpperCase();
  return { nome: (c['59'] || '').trim(), cidade: (c['60'] || '').trim(), chave: (conta['01'] || '').trim(),
    link: (conta['25'] || '').trim(), valor: c['54'] ? +c['54'] : 0, crcOk };
}

// Imagem do QR → { pix } | { erro: 'sem-qr' | 'nao-pix', texto } (guardado: a mesma imagem não é lida de novo)
async function recebedorDoQr(url) {
  if (!url) return null;
  const chave = url.length + ':' + url.slice(-120);
  if (PixLeitor.cache.has(chave)) return PixLeitor.cache.get(chave);
  let r;
  try {
    const texto = await lerQrDeImagem(url);
    if (!texto) r = { erro: 'sem-qr' };
    else { const pix = lerBrCode(texto); r = pix ? { pix } : { erro: 'nao-pix', texto }; }
  } catch (e) { r = { erro: 'sem-qr' }; }
  PixLeitor.cache.set(chave, r);
  return r;
}

// a chave fica inteira: ela já é pública (aparece no telão) e é o que se confere
function textoRecebedor(r) {
  if (!r) return '';
  if (r.erro === 'sem-qr') return '⚠ Não consegui ler este QR code. Confira a imagem (precisa ser o QR inteiro e nítido).';
  if (r.erro === 'nao-pix') return '⚠ Este QR code não é de Pix: ' + (r.texto || '').slice(0, 60);
  const p = r.pix;
  return [`Recebedor: ${p.nome || '(sem nome no código)'}`, p.cidade, p.chave ? 'Chave: ' + p.chave : p.link ? 'Pix com link (QR dinâmico)' : '',
    p.valor ? 'Valor fixo: ' + p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '', p.crcOk ? '' : '⚠ código com erro de conferência']
    .filter(Boolean).join(' · ');
}

// Mostra o recebedor num elemento (HTML): verde se leu, amarelo se não leu ou não é Pix
async function mostrarRecebedor(el, url) {
  if (!el) return null;
  if (!url) { el.hidden = true; el.textContent = ''; return null; }
  el.hidden = false; el.className = 'pix-rec lendo'; el.textContent = 'Lendo o QR code…';
  const r = await recebedorDoQr(url);
  el.className = 'pix-rec ' + (r?.pix && r.pix.crcOk ? 'ok' : 'alerta');
  el.textContent = (r?.pix ? '✅ ' : '') + textoRecebedor(r);
  return r;
}

// Ao escolher um QR novo: mostra para quem vai o dinheiro e pede confirmação (devolve true para guardar)
async function confirmarRecebedor(url) {
  const r = await recebedorDoQr(url);
  if (r?.pix) return confirm(`Este QR code manda o Pix para:\n\n${textoRecebedor(r).split(' · ').join('\n')}\n\nÉ isso mesmo? (OK = guardar)`);
  return confirm(textoRecebedor(r) + '\n\nGuardar mesmo assim?');
}
