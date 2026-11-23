'use strict';
/* (Secretaria 1.6.0) 📋 Escalas: o arquivo que a pastoral já faz e a planilha padrão de carga (pedido do usuário, 23/11/2026).
 *
 *  - 📎 Subir arquivo: PDF, imagem ou planilha da pastoral (ex.: a escala dos coroinhas feita no Excel). Fica guardado na
 *    escala do mês (secv-a-<id>, só entre as Secretarias) para abrir e imprimir. Do PDF feito no computador e da planilha,
 *    a Secretaria também tenta LER os nomes: mostra uma prévia (Missa por Missa, coluna por coluna) e só põe na escala
 *    depois que a pessoa confere e escolhe a função de cada coluna. Foto ou PDF escaneado: só fica guardado.
 *  - ⬇ Planilha padrão: uma linha por Missa do mês (data, dia, hora, igreja) e colunas por função (Coroinhas 1, 2…),
 *    já com o que estiver na escala. O coordenador preenche e devolve; ⬆ Carregar planilha põe os nomes na escala.
 * Planilha: .xlsx (Excel, Google Planilhas, LibreOffice) ou .csv. Sem biblioteca: o .xlsx é montado e lido aqui mesmo.
 * Usa Esc, funcoesEsc, missasDoMes, valorCela, pessoasDe, mesEsc, gravarItemSec, apagarItemSec, ocorrencias, ehMissa,
 * Agenda, localDe, nomeCurtoLocal, Folheto.carregarPdfjs, DIAS, dataBR, deIso, isoData, semAcento, esc, uid, toast, $ e $$.
 */

const ARQ_ESC_MAX = 8 * 1024 * 1024;
const Carga = { previa: null };

// ================================================================ planilha .xlsx (escrever e ler)
const CRC_TAB = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u8 => { let c = 0xFFFFFFFF; for (const b of u8) c = CRC_TAB[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

// zip sem compressão (o Excel abre normalmente)
function zipArmazenado(arquivos) {
  const enc = new TextEncoder(), partes = [], centrais = [];
  let pos = 0;
  for (const [nome, texto] of arquivos) {
    const n = enc.encode(nome), d = texto instanceof Uint8Array ? texto : enc.encode(texto), crc = crc32(d);
    const loc = new DataView(new ArrayBuffer(30));
    loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0800, true);
    loc.setUint32(14, crc, true); loc.setUint32(18, d.length, true); loc.setUint32(22, d.length, true); loc.setUint16(26, n.length, true);
    partes.push(new Uint8Array(loc.buffer), n, d);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, d.length, true); cen.setUint32(24, d.length, true); cen.setUint16(28, n.length, true);
    cen.setUint32(42, pos, true);
    centrais.push(new Uint8Array(cen.buffer), n);
    pos += 30 + n.length + d.length;
  }
  const tamCen = centrais.reduce((s, p) => s + p.length, 0);
  const fim = new DataView(new ArrayBuffer(22));
  fim.setUint32(0, 0x06054b50, true); fim.setUint16(8, arquivos.length, true); fim.setUint16(10, arquivos.length, true);
  fim.setUint32(12, tamCen, true); fim.setUint32(16, pos, true);
  return new Blob([...partes, ...centrais, new Uint8Array(fim.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const xmlEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const letraCol = i => { let s = ''; for (i++; i; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };

// estilos (índice do cellXfs): célula comum, cabeçalho, título, subtítulo, nota, célula com borda, célula com faixa,
// nome da função (duas cores alternadas), título do Leia-me
const XS = { comum: 0, cab: 1, titulo: 2, sub: 3, nota: 4, cel: 5, celFaixa: 6, grupoA: 7, grupoB: 8, tituloLeia: 9 };
const ESTILOS_XLSX = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF3A3326"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF6B6457"/><name val="Calibri"/></font><font><i/><sz val="9"/><color rgb="FF7A7468"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>
<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8E1CC"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8F6F0"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE8D5"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE5DDEF"/></patternFill></fill></fills>
<borders count="2"><border/><border><left style="thin"><color rgb="FFBFB8A8"/></left><right style="thin"><color rgb="FFBFB8A8"/></right><top style="thin"><color rgb="FFBFB8A8"/></top><bottom style="thin"><color rgb="FFBFB8A8"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="10"><xf/>
<xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf fontId="2" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf fontId="3" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf fontId="4" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf fillId="3" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf fontId="1" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf fontId="1" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf fontId="5" applyFont="1"/></cellXfs></styleSheet>`;

// planilhas: [{ nome, linhas: [[valor | {v, s}]], larguras: [..], alturas: {linha: pontos}, mesclar: ['A1:C1'],
//   congelar: {linhas, colunas}, paisagem, repetirLinhas: [ini, fim] (impressão), imagem: {png: Uint8Array, larg, alt} (px, em A1) }]
function montarXlsx(planilhas) {
  const XNS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const cel = (v, r, c) => {
    const o = v && typeof v === 'object' ? v : { v };
    const s = o.s ? ` s="${o.s}"` : '';
    if (o.v === '' || o.v == null) return o.s ? `<c r="${letraCol(c)}${r + 1}"${s}/>` : '';
    return `<c r="${letraCol(c)}${r + 1}" t="inlineStr"${s}><is><t xml:space="preserve">${xmlEsc(o.v)}</t></is></c>`;
  };
  const folha = (p, i) => {
    const cg = p.congelar, cgl = cg?.linhas || 0, cgc = cg?.colunas || 0;
    const pane = cg ? `<pane${cgc ? ` xSplit="${cgc}"` : ''}${cgl ? ` ySplit="${cgl}"` : ''} topLeftCell="${letraCol(cgc)}${cgl + 1}" activePane="${cgl && cgc ? 'bottomRight' : cgl ? 'bottomLeft' : 'topRight'}" state="frozen"/>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet ${XNS}>${p.paisagem ? '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' : ''}<sheetViews><sheetView workbookViewId="0"${i === 0 ? ' tabSelected="1"' : ''} showGridLines="${p.semGrade ? 0 : 1}">${pane}</sheetView></sheetViews>
<cols>${(p.larguras || []).map((w, k) => `<col min="${k + 1}" max="${k + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${p.linhas.map((l, r) =>
      `<row r="${r + 1}"${p.alturas?.[r] ? ` ht="${p.alturas[r]}" customHeight="1"` : ''}>${l.map((v, c) => cel(v, r, c)).join('')}</row>`).join('')}</sheetData>${
      p.mesclar?.length ? `<mergeCells count="${p.mesclar.length}">${p.mesclar.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>${
      p.paisagem ? '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' : ''}${p.imagem ? '<drawing r:id="rId1"/>' : ''}</worksheet>`;
  };
  const EMU = 9525;
  const desenho = (p, i) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>${6 * EMU}</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>${4 * EMU}</xdr:rowOff></xdr:from><xdr:ext cx="${p.imagem.larg * EMU}" cy="${p.imagem.alt * EMU}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i + 2}" name="Brasão da paróquia"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${p.imagem.larg * EMU}" cy="${p.imagem.alt * EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`;
  const REL = t => `http://schemas.openxmlformats.org/officeDocument/2006/relationships/${t}`;
  const rels = lista => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${lista.map(([id, t, alvo]) => `<Relationship Id="${id}" Type="${REL(t)}" Target="${alvo}"/>`).join('')}</Relationships>`;
  const comImg = planilhas.map((p, i) => [p, i]).filter(([p]) => p.imagem);
  const titulos = planilhas.map((p, i) => p.repetirLinhas ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">'${p.nome.replace(/'/g, "''")}'!$${p.repetirLinhas[0]}:$${p.repetirLinhas[1]}</definedName>` : '').join('');
  return zipArmazenado([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${planilhas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}${comImg.map(([, i]) => `<Override PartName="/xl/drawings/drawing${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', rels([['rId1', 'officeDocument', 'xl/workbook.xml']])],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook ${XNS}><sheets>${planilhas.map((p, i) => `<sheet name="${xmlEsc(p.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${titulos ? `<definedNames>${titulos}</definedNames>` : ''}</workbook>`],
    ['xl/_rels/workbook.xml.rels', rels([...planilhas.map((_, i) => [`rId${i + 1}`, 'worksheet', `worksheets/sheet${i + 1}.xml`]), [`rId${planilhas.length + 1}`, 'styles', 'styles.xml']])],
    ['xl/styles.xml', ESTILOS_XLSX],
    ...planilhas.map((p, i) => [`xl/worksheets/sheet${i + 1}.xml`, folha(p, i)]),
    ...comImg.flatMap(([p, i]) => [
      [`xl/worksheets/_rels/sheet${i + 1}.xml.rels`, rels([['rId1', 'drawing', `../drawings/drawing${i + 1}.xml`]])],
      [`xl/drawings/drawing${i + 1}.xml`, desenho(p, i)],
      [`xl/drawings/_rels/drawing${i + 1}.xml.rels`, rels([['rId1', 'image', `../media/image${i + 1}.png`]])],
      [`xl/media/image${i + 1}.png`, p.imagem.png],
    ]),
  ]);
}

// brasão da paróquia (o canto superior esquerdo do telão, em Apresentação; senão o da Matriz) → PNG do tamanho certo
async function brasaoParaPlanilha(altPx) {
  const locs = [...(Agenda.dados?.locais || [])].sort((a, b) => (b.tipo === 'Matriz') - (a.tipo === 'Matriz'));
  const src = Agenda.dados?.paroquia?.layout?.se?.img || locs.map(l => l.layout?.se?.img).find(Boolean);
  if (!src || !/^data:image\//.test(src)) return null;
  try {
    const img = new Image(); img.src = src; await img.decode();
    if (!img.naturalWidth || !img.naturalHeight) return null;
    const alt = altPx, larg = Math.round(Math.min(alt * 2.2, alt * img.naturalWidth / img.naturalHeight));
    const k = 3;   // 3× para ficar nítido na impressão
    const c = document.createElement('canvas'); c.width = larg * k; c.height = alt * k;
    const g = c.getContext('2d'), esc = Math.min(c.width / img.naturalWidth, c.height / img.naturalHeight);
    const w = img.naturalWidth * esc, h = img.naturalHeight * esc;
    g.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
    const png = new Uint8Array(await (await new Promise(r => c.toBlob(r, 'image/png'))).arrayBuffer());
    return { png, larg, alt };
  } catch (err) { console.warn('brasão na planilha', err); return null; }
}

// lê um arquivo de dentro de um .zip (o .xlsx é um zip)
async function lerDoZip(buf, nome) {
  const v = new DataView(buf), u8 = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Este arquivo não parece ser uma planilha .xlsx.');
  let p = v.getUint32(eocd + 16, true);
  for (let k = 0, total = v.getUint16(eocd + 10, true); k < total; k++) {
    const metodo = v.getUint16(p + 10, true), tam = v.getUint32(p + 20, true);
    const ln = v.getUint16(p + 28, true), le = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true), local = v.getUint32(p + 42, true);
    const n = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + ln));
    if (n === nome) {
      const ini = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true), dados = u8.subarray(ini, ini + tam);
      if (metodo === 0) return new TextDecoder().decode(dados);
      return await new Response(new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    }
    p += 46 + ln + le + lc;
  }
  return null;
}

// primeira planilha do .xlsx → linhas de texto (datas e horas que o Excel converteu voltam como "dd/mm/aaaa" e "hh:mm")
async function lerXlsx(buf) {
  const dom = s => new DOMParser().parseFromString(s, 'application/xml');
  const wb = dom(await lerDoZip(buf, 'xl/workbook.xml') || '');
  const rels = dom(await lerDoZip(buf, 'xl/_rels/workbook.xml.rels') || '');
  const s1 = wb.getElementsByTagName('sheet')[0], rid = s1?.getAttribute('r:id');
  let alvo = [...rels.getElementsByTagName('Relationship')].find(r => r.getAttribute('Id') === rid)?.getAttribute('Target') || 'worksheets/sheet1.xml';
  alvo = alvo.replace(/^\/?(xl\/)?/, 'xl/');
  const sx = await lerDoZip(buf, alvo);
  if (!sx) throw new Error('Não achei a primeira folha da planilha.');
  const ssXml = await lerDoZip(buf, 'xl/sharedStrings.xml');
  const ss = ssXml ? [...dom(ssXml).getElementsByTagName('si')].map(si => [...si.getElementsByTagName('t')].map(t => t.textContent).join('')) : [];
  const linhas = [];
  for (const row of dom(sx).getElementsByTagName('row')) {
    const r = +row.getAttribute('r') - 1, l = [];
    for (const c of row.getElementsByTagName('c')) {
      const ref = c.getAttribute('r') || '', col = [...ref.replace(/\d+/g, '')].reduce((s, ch) => s * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0]?.textContent ?? '';
      l[col] = t === 's' ? ss[+v] ?? '' : t === 'inlineStr' ? [...c.getElementsByTagName('t')].map(x => x.textContent).join('') : t === 'str' || t === 'b' ? v : v === '' ? '' : { num: +v };
    }
    linhas[r] = l;
  }
  return [...linhas].map(l => l || []);
}

function lerCsv(txt) {
  txt = txt.replace(/^﻿/, '');
  const prim = txt.split(/\r?\n/)[0] || '', sep = [';', '\t', ','].sort((a, b) => prim.split(b).length - prim.split(a).length)[0];
  const out = []; let l = [], campo = '', aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (aspas) { if (ch === '"' && txt[i + 1] === '"') { campo += '"'; i++; } else if (ch === '"') aspas = false; else campo += ch; continue; }
    if (ch === '"') aspas = true;
    else if (ch === sep) { l.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; l.push(campo); out.push(l); l = []; campo = ''; }
    else campo += ch;
  }
  if (campo || l.length) { l.push(campo); out.push(l); }
  return out;
}

// ================================================================ planilha padrão (baixar) e carga (ler)
const ROT_PLAN = { data: 'Data', dia: 'Dia', hora: 'Hora', igreja: 'Igreja' };
// colunas por função na planilha padrão (pedido do usuário, 23/11): coordenação e projeção = as vagas;
// músicos = 10; as outras = 6 (o que sobrar fica em branco)
const vagasPlanilha = f => {
  const n = semAcento(`${f.id} ${f.nome}`).toLowerCase();
  if (/coordena|projec/.test(n)) return Math.max(1, +f.vagas || 1);
  if (/music|cantor/.test(n)) return Math.max(10, +f.vagas || 1);
  return Math.max(6, +f.vagas || 1);
};

function baixarBlob(nome, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// A planilha: faixa de título (brasão da paróquia à esquerda, se houver), a linha com o nome de cada função sobre as
// colunas dela, o cabeçalho em negrito (Data, Dia, Hora, Igreja, "Coroinhas 1"…) e uma linha por Missa, com bordas e
// faixas alternadas por dia. Congela o cabeçalho e as 4 primeiras colunas; imprime em paisagem, na largura da folha.
async function baixarPlanilhaPadrao(fids) {
  const fs = funcoesEsc().filter(f => fids.includes(f.id));
  if (!fs.length) return toast('Marque pelo menos uma função.');
  const ocs = missasDoMes(Esc.mes, Esc.local);
  if (!ocs.length) return toast('Nenhuma Missa na Agenda neste mês.');
  const [a, m] = Esc.mes.split('-').map(Number), nomeMes = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const LINHA_GRUPO = 4, LINHA_CAB = 5, ALT_TITULO = 22;
  const larguras = [12, 14, 8, 22, ...fs.flatMap(f => { const n = vagasPlanilha(f);
    return Array(n).fill(n === 1 ? Math.max(18, f.nome.length + 5) : /music|cantor/.test(semAcento(f.nome).toLowerCase()) ? 16 : Math.max(18, f.nome.length + 4)); })];
  const ncol = larguras.length;
  const brasao = await brasaoParaPlanilha(Math.round(ALT_TITULO * 3 * 4 / 3) - 8);   // 3 linhas de título (pontos → px)
  // o título começa na primeira coluna depois do brasão
  let colTit = 0;
  if (brasao) { let px = 0; while (colTit < ncol && px < brasao.larg + 14) px += larguras[colTit++] * 7 + 5; }
  const vazia = () => Array(ncol).fill('');
  const titulo = vazia(), sub = vazia(), nota = vazia(), espaco = vazia();
  titulo[colTit] = { v: `Escala de ${nomeMes}${Esc.local ? ' · ' + nomeIgreja(Esc.local) : ''}`, s: XS.titulo };
  sub[colTit] = { v: [Agenda.dados?.paroquia?.nome, fs.map(f => f.nome).join(' · ')].filter(Boolean).join('  —  '), s: XS.sub };
  nota[colTit] = { v: `Um nome por célula; o que não for usado fica em branco. Não mude Data, Hora e Igreja. · Gerada pela Secretaria MiguelAngelus em ${dataBR(hojeIso())}`, s: XS.nota };
  const grupo = vazia(), cab = vazia(), mesclar = [`A${LINHA_GRUPO + 1}:D${LINHA_GRUPO + 1}`];
  grupo[0] = { v: 'Missa', s: XS.cab }; for (let c = 1; c < 4; c++) grupo[c] = { v: '', s: XS.cab };
  [ROT_PLAN.data, ROT_PLAN.dia, ROT_PLAN.hora, ROT_PLAN.igreja].forEach((t, c) => { cab[c] = { v: t, s: XS.cab }; });
  let c0 = 4;
  fs.forEach((f, k) => {
    const n = vagasPlanilha(f), s = k % 2 ? XS.grupoB : XS.grupoA;
    for (let i = 0; i < n; i++) { grupo[c0 + i] = { v: i ? '' : f.nome, s }; cab[c0 + i] = { v: `${f.nome} ${i + 1}`, s: XS.cab }; }
    if (n > 1) mesclar.push(`${letraCol(c0)}${LINHA_GRUPO + 1}:${letraCol(c0 + n - 1)}${LINHA_GRUPO + 1}`);
    c0 += n;
  });
  let faixa = false, diaAnt = '';
  const missas = ocs.map(o => {
    if (o.iso !== diaAnt) { faixa = !faixa; diaAnt = o.iso; }
    const s = faixa ? XS.celFaixa : XS.cel, d = deIso(o.iso);
    return [dataBR(o.iso), DIAS[d.getDay()], o.hora, nomeCurtoLocal(localDe(o.localId)) || o.texto,
      ...fs.flatMap(f => { const ns = [...new Set(pessoasDe(valorCela(o, f)))]; return Array.from({ length: vagasPlanilha(f) }, (_, i) => ns[i] || ''); })]
      .map(v => ({ v, s }));
  });
  const linhas = [titulo, sub, nota, espaco, grupo, cab, ...missas];
  const alturas = { 0: ALT_TITULO, 1: ALT_TITULO, 2: ALT_TITULO, 3: 6, [LINHA_GRUPO]: 20, [LINHA_CAB]: 20 };
  missas.forEach((_, i) => { alturas[LINHA_CAB + 1 + i] = 18; });
  const leia = [[{ v: 'Como preencher a escala', s: XS.tituloLeia }], [''],
    ['1. Na folha "Escala", cada linha é uma Missa do mês (da Agenda da paróquia). Não mude Data, Hora e Igreja.'],
    ['2. Escreva um nome por célula nas colunas da função (ex.: "Coroinhas 1", "Coroinhas 2"…). O que não for usado fica em branco.'],
    ['3. Para dizer que ninguém serve naquela Missa, escreva — (travessão) na primeira coluna da função.'],
    ['4. Salve como .xlsx (ou .csv) e mande para a secretaria, que carrega em 📋 Escalas → 📎 Subir arquivo ou planilha.'],
    [''], [{ v: 'Não apague nem troque o nome das colunas (Data, Dia, Hora, Igreja, "Coroinhas 1"…): é por elas que a Secretaria sabe a função de cada nome.', s: XS.sub }],
    [''], [`Escala de ${nomeMes}${Esc.local ? ' · ' + nomeIgreja(Esc.local) : ''} · gerada pela Secretaria MiguelAngelus em ${dataBR(hojeIso())}`]];
  const blob = montarXlsx([
    { nome: 'Escala', linhas, larguras, alturas, mesclar, congelar: { linhas: LINHA_CAB + 1, colunas: 4 }, paisagem: true,
      repetirLinhas: [LINHA_GRUPO + 1, LINHA_CAB + 1], imagem: brasao, semGrade: true },
    { nome: 'Leia-me', linhas: leia, larguras: [120], semGrade: true },
  ]);
  const nomeArq = `Escala ${fs.length > 2 ? '' : fs.map(f => f.nome.replace(/\s*\(.*\)/, '')).join(' e ') + ' '}${Esc.mes}${Esc.local ? ' ' + (nomeCurtoLocal(localDe(Esc.local)) || '') : ''}.xlsx`.replace(/[\\/:*?"<>|]/g, '-');
  baixarBlob(nomeArq, blob);
  toast(`⬇ ${nomeArq} (na pasta Downloads)`);
}

// célula → texto ("dd/mm/aaaa" e "hh:mm" quando o Excel guardou como número)
function textoCel(v, tipo) {
  if (v && typeof v === 'object' && 'num' in v) {
    const n = v.num;
    if (tipo === 'data' && n > 20000) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 864e5); return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`; }
    if (tipo === 'hora' && n >= 0 && n < 1) { const m = Math.round(n * 1440); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
    return String(n);
  }
  return String(v ?? '').trim();
}
const normHora = s => { const m = /(\d{1,2})\s*[:h]\s*(\d{2})?/i.exec(s || ''); return m ? `${m[1].padStart(2, '0')}:${m[2] || '00'}` : ''; };

// data "dd/mm" ou "dd/mm/aaaa" → ISO (sem ano: o do mês da escala; janeiro numa escala de dezembro = ano seguinte)
function isoDeDataBR(s) {
  const m = /(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/.exec(s || '');
  if (!m) return '';
  const [a, mm] = Esc.mes.split('-').map(Number), mes = +m[2];
  let ano = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : a;
  if (!m[3] && mes - mm > 6) ano--; else if (!m[3] && mm - mes > 6) ano++;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
}

// planilha → prévia: colunas pela linha do cabeçalho, a que tem "Data" e "Hora" ("Coroinhas 1" → função Coroinhas);
// o que vem antes dela (título, brasão, nome das funções) fica de fora
function previaDaPlanilha(linhas, nomeArq) {
  const ehRot = (c, rot) => semAcento(textoCel(c)).toLowerCase() === semAcento(rot).toLowerCase();
  const iCab = linhas.slice(0, 30).findIndex(l => (l || []).some(c => ehRot(c, ROT_PLAN.data)) && (l || []).some(c => ehRot(c, ROT_PLAN.hora)));
  if (iCab < 0) throw new Error('A planilha precisa ter uma linha com as colunas "Data" e "Hora" (use a ⬇ Planilha padrão).');
  const cab = Array.from(linhas[iCab], c => textoCel(c));
  linhas = linhas.slice(iCab);
  const idx = rot => cab.findIndex(c => semAcento(c).toLowerCase() === semAcento(rot).toLowerCase());
  const iData = idx(ROT_PLAN.data), iHora = idx(ROT_PLAN.hora), iIgr = idx(ROT_PLAN.igreja);
  // agrupa as colunas por função: "Coroinhas 1", "Coroinhas 2" → "Coroinhas"
  const grupos = new Map();
  cab.forEach((c, i) => {
    if ([iData, iHora, iIgr, idx(ROT_PLAN.dia)].includes(i) || !c) return;
    const base = c.replace(/\s*\d+\s*$/, '').trim();
    if (!grupos.has(base)) grupos.set(base, []);
    grupos.get(base).push(i);
  });
  const colunas = [...grupos].map(([rot, is], k) => ({ key: 'c' + k, rotulo: rot, is, sugestao: funcaoParecida(rot) }));
  const itens = linhas.slice(1).filter(l => l.some(v => textoCel(v))).map(l => ({
    iso: isoDeDataBR(textoCel(l[iData], 'data')), hora: normHora(textoCel(l[iHora], 'hora')), igreja: iIgr >= 0 ? textoCel(l[iIgr]) : '',
    cols: Object.fromEntries(colunas.map(c => [c.key, c.is.map(i => textoCel(l[i])).filter(Boolean)])),
  }));
  return { origem: nomeArq, tipo: 'planilha', colunas, itens };
}

const funcaoParecida = rot => {
  const r = semAcento(rot).toLowerCase();
  return funcoesEsc().find(f => semAcento(f.nome).toLowerCase() === r)?.id
    || funcoesEsc().find(f => { const n = semAcento(f.nome).toLowerCase().replace(/\s*\(.*\)/, ''); return r.includes(n) || n.includes(r); })?.id || '';
};

// ================================================================ PDF feito no computador (Excel/Word → PDF)
// Lê as palavras com a posição. Cada hora ("07:00") puxa os nomes que estão à direita dela, na mesma faixa de altura;
// a data ("01/11") é a mais próxima à esquerda; a igreja vem do texto junto da hora ("FÁTIMA 07:30") ou da data ("MATRIZ").
// Os nomes de cada quadro se separam em colunas pela posição (1ª coluna, 2ª coluna…): a pessoa diz a função de cada uma.
async function lerPdfEscala(bytes) {
  await Folheto.carregarPdfjs();
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const itens = [];
  let desl = 0;
  for (let p = 1; p <= pdf.numPages; p++) {
    const pg = await pdf.getPage(p), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent();
    for (const it of tc.items) {
      const s = (it.str || '').trim();
      if (!s) continue;
      const h = Math.abs(it.transform[3]) || 8;
      itens.push({ s, x: it.transform[4], y: desl + vp.height - it.transform[5], w: it.width || s.length * h * 0.5, h });
    }
    desl += vp.height + 50;      // páginas uma embaixo da outra
  }
  // junta pedaços da mesma linha e da mesma célula ("Ana" + "Clara")
  itens.sort((a, b) => a.y - b.y || a.x - b.x);
  const pal = [];
  for (const it of itens) {
    const ult = pal[pal.length - 1];
    if (ult && Math.abs(ult.y - it.y) < 2 && it.x - (ult.x + ult.w) < it.h * 0.9 && it.x >= ult.x) { ult.s += (it.x - (ult.x + ult.w) > 0.5 ? ' ' : '') + it.s; ult.w = it.x + it.w - ult.x; }
    else pal.push({ ...it });
  }
  const ehHora = p => /^\d{1,2}[:h]\d{2}$/i.test(p.s), ehData = p => /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(p.s);
  const horas = pal.filter(ehHora), datas = pal.filter(ehData);
  if (!horas.length) return null;
  const cx = p => p.x + p.w / 2;
  // colunas de horas (mesmo x): cada coluna é um quadro
  const colsHora = [];
  for (const h of horas.sort((a, b) => a.x - b.x)) { const c = colsHora.find(c => Math.abs(cx(c[0]) - cx(h)) < 15); if (c) c.push(h); else colsHora.push([h]); }
  const linhas = [];
  for (const col of colsHora) {
    col.sort((a, b) => a.y - b.y);
    const x0 = Math.max(...col.map(h => h.x + h.w)) + 4;
    // limite à direita: a próxima coluna de datas ou de horas
    const x1 = Math.min(Infinity, ...[...horas, ...datas].filter(p => p.x > x0 + 20).map(p => p.x)) - 2;
    const faixas = col.map((h, i) => {
      const ant = col[i - 1], prox = col[i + 1];
      const meioA = ant ? (ant.y + h.y) / 2 : h.y - (prox ? (prox.y - h.y) / 2 : 40);
      const meioB = prox ? (h.y + prox.y) / 2 : h.y + (ant ? (h.y - ant.y) / 2 : 40);
      return { h, y0: meioA, y1: meioB };
    });
    // fora: o que está na coluna das datas (os rótulos "CAPELAS", "Domingo", "(Todos os Santos)" do quadro vizinho)
    const naColunaDeDatas = p => datas.some(d => Math.abs(cx(p) - cx(d)) < 50);
    const nomesDoQuadro = pal.filter(p => !ehHora(p) && !ehData(p) && !naColunaDeDatas(p) && p.x >= x0 && p.x < x1 && faixas.some(f => p.y >= f.y0 && p.y < f.y1));
    // a data de cada hora: as datas à esquerda dividem as horas em blocos seguidos, cada data no meio do seu bloco
    // (a data mais perto na altura erra: o 19:00 do fim de um bloco fica mais perto da data do bloco de baixo)
    const dts = datas.filter(d => d.x < col[0].x && col[0].x - d.x < 300).sort((a, b) => a.y - b.y);
    const dataDe = new Map(), n = col.length, m = dts.length;
    if (m && m <= n) {
      const custo = (i, j, d) => Math.abs((col[i].y + col[j].y) / 2 - d.y);
      const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(Infinity)), de = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
      dp[0][0] = 0;
      for (let j = 1; j <= m; j++) for (let i = j; i <= n; i++) for (let k = j - 1; k < i; k++) {
        const c = dp[j - 1][k] + custo(k, i - 1, dts[j - 1]);
        if (c < dp[j][i]) { dp[j][i] = c; de[j][i] = k; }
      }
      for (let j = m, i = n; j > 0; i = de[j][i], j--) for (let k = de[j][i]; k < i; k++) dataDe.set(col[k], dts[j - 1]);
    }
    // colunas de nomes pela posição (o centro de cada nome); separa onde há um vão grande
    const centros = [...new Set(nomesDoQuadro.map(p => Math.round(cx(p))))].sort((a, b) => a - b);
    const cortes = [];
    for (let i = 1; i < centros.length; i++) if (centros[i] - centros[i - 1] > 40) cortes.push((centros[i] + centros[i - 1]) / 2);
    const colDe = p => cortes.filter(c => cx(p) > c).length;
    for (const f of faixas) {
      const h = f.h;
      // a data: à esquerda da hora, a mais perto na altura
      const d = dataDe.get(h) || datas.filter(p => p.x < h.x && h.x - p.x < 300).sort((a, b) => Math.abs(a.y - h.y) - Math.abs(b.y - h.y))[0];
      // a igreja: o texto em cima/embaixo da hora, na mesma célula; ou o rótulo junto da data
      const junto = pal.filter(p => p !== h && !ehHora(p) && Math.abs(cx(p) - cx(h)) < 30 && Math.abs(p.y - h.y) < 22).map(p => p.s);
      const daData = d ? pal.filter(p => p !== d && Math.abs(cx(p) - cx(d)) < 45 && Math.abs(p.y - d.y) < 40).map(p => p.s) : [];
      const cols = {};
      for (const p of nomesDoQuadro.filter(p => p.y >= f.y0 && p.y < f.y1).sort((a, b) => a.y - b.y)) (cols['c' + colDe(p)] ||= []).push(p.s);
      linhas.push({ iso: d ? isoDeDataBR(d.s) : '', hora: normHora(h.s), igreja: [...junto, ...daData].join(' '), cols, y: h.y, x: h.x });
    }
  }
  linhas.sort((a, b) => a.iso.localeCompare(b.iso) || a.hora.localeCompare(b.hora));
  const nCols = Math.max(0, ...linhas.flatMap(l => Object.keys(l.cols).map(k => +k.slice(1) + 1)));
  const colunas = Array.from({ length: nCols }, (_, i) => ({ key: 'c' + i, rotulo: `${i + 1}ª coluna de nomes`, sugestao: '' }));
  return { tipo: 'pdf', colunas, itens: linhas.filter(l => Object.values(l.cols).some(v => v.length)) };
}

// ================================================================ prévia: Missa a Missa, e a função de cada coluna
function igrejaDoTexto(txt) {
  const t = semAcento(txt || '').toLowerCase();
  if (!t) return null;
  const palavras = t.split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !['nossa', 'senhora', 'missa', 'capela', 'capelas', 'igreja', 'paroquia', 'santo', 'santa', 'domingo', 'feira'].includes(w));
  const ls = Agenda.dados.locais || [];
  return ls.find(l => l.sigla && new RegExp(`\\b${semAcento(l.sigla).toLowerCase()}\\b`).test(t))
    || ls.find(l => palavras.some(w => semAcento(l.nome || '').toLowerCase().split(/[^a-z0-9]+/).includes(w)))
    || (/\bmatriz\b/.test(t) ? ls.find(l => /matriz/i.test(l.tipo || '')) : null) || null;
}

function missaDaLinha(l) {
  if (!l.iso || !l.hora) return { erro: 'sem data ou hora' };
  const ocs = ocorrencias(deIso(l.iso)).filter(o => !o.cancelada && ehMissa(o.tipo) && o.hora === l.hora);
  if (!ocs.length) return { erro: 'não há Missa na Agenda neste dia e hora' };
  const loc = igrejaDoTexto(l.igreja);
  const certas = loc ? ocs.filter(o => o.localId === loc.id) : ocs;
  if (certas.length === 1) return { o: certas[0] };
  if (!certas.length) return { erro: `a Agenda não tem Missa às ${l.hora} em ${loc.nome}` };
  return { erro: 'há mais de uma Missa neste horário: diga a igreja na planilha' };
}

const HTML_ESC_CARGA = `
<dialog id="dlgEscCarga" class="dlg-sec dlg-sec-largo">
  <form method="dialog" class="form">
    <h2>📋 Conferir os nomes antes de pôr na escala</h2>
    <p id="ecOrigem" class="sutil pequeno"></p>
    <div id="ecMapa" class="linha esc-carga-mapa"></div>
    <label class="esc-chk"><input type="checkbox" id="ecSubst" checked> Trocar o que já está escrito nessas Missas (nas funções escolhidas)</label>
    <div id="ecTabela" class="esc-tabela"></div>
    <div class="linha"><span id="ecResumo" class="pequeno"></span><span class="espaco"></span>
      <button value="cancelar">Cancelar</button><button type="button" id="ecAplicar" class="primario">✔ Pôr na escala</button></div>
  </form>
</dialog>
<dialog id="dlgEscPlan" class="dlg-sec">
  <form method="dialog" class="form">
    <h2>⬇ Planilha padrão da escala</h2>
    <p class="sutil pequeno">Uma linha por Missa do mês (da Agenda), já com data, hora e igreja, e as colunas das funções marcadas.
      O coordenador da pastoral preenche os nomes e devolve; aqui, <b>⬆ Carregar planilha</b> põe na escala. Abre no Excel, no Google Planilhas e no LibreOffice.</p>
    <p id="epMes" class="pequeno"></p>
    <div id="epFuncoes" class="linha"></div>
    <div class="linha"><span class="espaco"></span><button value="cancelar">Cancelar</button><button type="button" id="epBaixar" class="primario">⬇ Baixar a planilha</button></div>
  </form>
</dialog>
<dialog id="dlgEscArq" class="dlg-sec dlg-sec-largo">
  <form method="dialog" class="form">
    <h2 id="eaTitulo">📎 Arquivo</h2>
    <div id="eaCorpo" class="esc-arq-corpo"></div>
    <div class="linha"><button type="button" id="eaBaixar">⬇ Salvar uma cópia</button><span class="espaco"></span><button value="fechar">Fechar</button></div>
  </form>
</dialog>`;

function abrirPrevia(previa) {
  Carga.previa = previa;
  previa.itens.forEach(l => { l.m = missaDaLinha(l); });
  const opF = sel => `<option value="">— não usar —</option>${funcoesEsc().map(f => `<option value="${esc(f.id)}"${f.id === sel ? ' selected' : ''}>${esc(f.nome)}</option>`).join('')}`;
  $('#ecOrigem').textContent = `${previa.tipo === 'pdf' ? 'Lido do PDF' : 'Lido da planilha'} "${previa.origem || ''}". Confira as Missas e diga a função de cada coluna; só entra na escala depois de ✔.`;
  $('#ecMapa').innerHTML = previa.colunas.map(c => {
    const ex = previa.itens.flatMap(l => l.cols[c.key] || []).slice(0, 2).join(', ');
    return `<label class="campo">${esc(c.rotulo)}${ex ? ` <small class="sutil">(ex.: ${esc(ex)}…)</small>` : ''} <select data-ec-col="${esc(c.key)}">${opF(c.sugestao)}</select></label>`;
  }).join('');
  renderPrevia();
  abrirDialogo('dlgEscCarga');
}

function renderPrevia() {
  const p = Carga.previa, mapa = Object.fromEntries($$('#ecMapa [data-ec-col]').map(s => [s.dataset.ecCol, s.value]));
  const usadas = p.colunas.filter(c => mapa[c.key]);
  $('#ecTabela').innerHTML = `<table class="esc-tab"><thead><tr><th>Dia</th><th>Hora</th><th>Igreja</th><th>Missa da Agenda</th>${p.colunas.map(c => `<th>${esc(c.rotulo)}${mapa[c.key] ? `<br><small>→ ${esc(funcoesEsc().find(f => f.id === mapa[c.key])?.nome || '')}</small>` : '<br><small class="sutil">não usar</small>'}</th>`).join('')}</tr></thead><tbody>
    ${p.itens.map(l => `<tr class="${l.m.o ? '' : 'esc-carga-erro'}"><td class="esc-dia">${l.iso ? dataBR(l.iso).slice(0, 5) : '?'}</td><td>${esc(l.hora || '?')}</td><td>${esc(l.igreja || '')}</td>
      <td>${l.m.o ? `✔ ${esc(nomeCurtoLocal(localDe(l.m.o.localId)) || l.m.o.texto)}` : `✖ ${esc(l.m.erro)}`}</td>
      ${p.colunas.map(c => `<td>${esc((l.cols[c.key] || []).join(', '))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const ok = p.itens.filter(l => l.m.o).length;
  $('#ecResumo').textContent = `${ok} de ${p.itens.length} Missas encontradas na Agenda${usadas.length ? '' : ' · escolha a função de pelo menos uma coluna'}.`;
  $('#ecAplicar').disabled = !ok || !usadas.length;
}

async function aplicarPrevia() {
  const p = Carga.previa, mapa = Object.fromEntries($$('#ecMapa [data-ec-col]').map(s => [s.dataset.ecCol, s.value]).filter(([, v]) => v));
  const subst = $('#ecSubst').checked, mudados = new Map();
  let n = 0;
  for (const l of p.itens) {
    if (!l.m.o) continue;
    const mes = l.m.o.iso.slice(0, 7), rec = Esc.meses[mes] || (Esc.meses[mes] = { id: 'm-' + mes, celas: {} });
    // duas colunas para a mesma função (ex.: vermelho e preto, as duas de coroinhas): junta
    const porF = {};
    for (const [k, fid] of Object.entries(mapa)) (porF[fid] ||= []).push(...(l.cols[k] || []));
    for (const [fid, nomes] of Object.entries(porF)) {
      const ck = `${l.m.o.chave}|${fid}`;
      if (!nomes.length || (!subst && rec.celas[ck] !== undefined)) continue;
      rec.celas[ck] = [...new Set(nomes)].join(', ');
      mudados.set(mes, rec); n++;
    }
  }
  for (const rec of mudados.values()) await gravarItemSec('esc', rec, { versaoAberta: rec.versao || 0, rotulo: 'a escala do mês' });
  $('#dlgEscCarga').close();
  renderEscala();
  toast(n ? `📋 ${n} lugar${n > 1 ? 'es' : ''} preenchido${n > 1 ? 's' : ''} na escala. Confira e mude o que quiser.` : 'Nada mudou.');
}

// ================================================================ arquivos guardados na escala do mês
const arquivosDoMes = () => (Esc.arquivos || []).filter(a => a.mes === Esc.mes).sort((a, b) => (a.enviado || 0) - (b.enviado || 0));
const tamanhoTxt = n => n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

function renderArquivosEsc() {
  const el = $('#escArquivos');
  if (!el) return;
  const as = arquivosDoMes();
  el.innerHTML = as.length ? '📎 ' + as.map(a => `<span class="esc-arq" data-arq="${esc(a.id)}"><button type="button" data-arq-abrir title="Abrir">${a.tipo.includes('pdf') ? '📄' : a.tipo.startsWith('image/') ? '🖼' : '📊'} ${esc(a.nome)}</button><small class="sutil">${esc(tamanhoTxt(a.tamanho || 0))}</small><button type="button" data-arq-ler title="Ler os nomes de novo">🔎</button><button type="button" data-arq-apagar class="perigo" title="Tirar o arquivo">✕</button></span>`).join('')
    : '<span class="sutil pequeno">Nenhum arquivo da pastoral neste mês.</span>';
}

const dataUrlDe = arq => new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => falha(r.error); r.readAsDataURL(arq); });
const bytesDe = dataUrl => Uint8Array.from(atob(dataUrl.split(',')[1] || ''), c => c.charCodeAt(0));
const ehPlanilha = (nome, tipo) => /\.(xlsx|csv)$/i.test(nome) || /spreadsheet|csv/.test(tipo || '');

async function subirArquivoEsc(arq) {
  if (!arq) return;
  if (arq.size > ARQ_ESC_MAX) return toast(`Arquivo grande demais (${tamanhoTxt(arq.size)}; até ${tamanhoTxt(ARQ_ESC_MAX)}).`);
  const tipo = arq.type || (/\.pdf$/i.test(arq.name) ? 'application/pdf' : /\.csv$/i.test(arq.name) ? 'text/csv' : /\.xlsx$/i.test(arq.name) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/octet-stream');
  if (!/pdf|image\/|spreadsheet|csv/.test(tipo) && !ehPlanilha(arq.name, tipo)) return toast('Use PDF, imagem (JPG/PNG) ou planilha (.xlsx/.csv).');
  const a = { id: 'a-' + uid(), mes: Esc.mes, nome: arq.name, tipo, tamanho: arq.size, enviado: Date.now(), dados: await dataUrlDe(arq) };
  await gravarItemSec('esc', a);
  (Esc.arquivos ||= []).push(a);
  renderArquivosEsc();
  await lerNomesDoArquivo(a, true);
}

async function lerNomesDoArquivo(a, recemSubido) {
  try {
    if (ehPlanilha(a.nome, a.tipo)) {
      const bytes = bytesDe(a.dados);
      const linhas = /\.csv$/i.test(a.nome) || /csv/.test(a.tipo) ? lerCsv(new TextDecoder().decode(bytes)) : await lerXlsx(bytes.buffer);
      return abrirPrevia(previaDaPlanilha(linhas, a.nome));
    }
    if (/pdf/.test(a.tipo)) {
      const p = await lerPdfEscala(bytesDe(a.dados));
      if (!p || !p.itens.length) return toast(`📎 ${a.nome} guardado. Não consegui ler os nomes (PDF escaneado ou sem horários): use a ⬇ Planilha padrão.`);
      p.origem = a.nome;
      return abrirPrevia(p);
    }
    toast(recemSubido ? `📎 ${a.nome} guardado. De imagem não dá para ler os nomes: use a ⬇ Planilha padrão para pô-los na escala.` : 'De imagem não dá para ler os nomes.');
  } catch (err) { toast(`📎 ${a.nome}${recemSubido ? ' guardado, mas' : ':'} não consegui ler: ${err.message}`); }
}

function abrirArquivoEsc(a) {
  $('#eaTitulo').textContent = '📎 ' + a.nome;
  const url = URL.createObjectURL(new Blob([bytesDe(a.dados)], { type: a.tipo }));
  $('#eaCorpo').innerHTML = /pdf/.test(a.tipo) ? `<iframe src="${url}" title="${esc(a.nome)}"></iframe><p class="sutil pequeno">Para imprimir, use a 🖨 impressora da barra do PDF.</p>`
    : a.tipo.startsWith('image/') ? `<img src="${url}" alt="${esc(a.nome)}">`
    : '<p>Planilha: use 🔎 para ler os nomes de novo, ou ⬇ Salvar uma cópia para abrir no Excel.</p>';
  $('#eaBaixar').onclick = () => baixarBlob(a.nome, new Blob([bytesDe(a.dados)], { type: a.tipo }));
  $('#dlgEscArq').addEventListener('close', () => URL.revokeObjectURL(url), { once: true });
  abrirDialogo('dlgEscArq');
}

function ligarCargaEsc() {
  $('#ecMapa').addEventListener('change', renderPrevia);
  $('#ecAplicar').addEventListener('click', aplicarPrevia);
  $('#epBaixar').addEventListener('click', () => {
    const fids = $$('#epFuncoes [data-ep-f]:checked').map(c => c.dataset.epF);
    if (!fids.length) return toast('Marque pelo menos uma função.');
    $('#dlgEscPlan').close();
    baixarPlanilhaPadrao(fids).catch(err => { console.error(err); toast('Não consegui montar a planilha: ' + err.message); });
  });
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.pdf,.png,.jpg,.jpeg,.webp,.xlsx,.csv'; inp.hidden = true; inp.id = 'escArqInput';
  document.body.appendChild(inp);
  inp.addEventListener('change', () => { const f = inp.files[0]; inp.value = ''; subirArquivoEsc(f).catch(e => toast('Não consegui guardar o arquivo: ' + e.message)); });
  $('#dlgEscala').addEventListener('click', async e => {
    if (e.target.closest('#escSubir')) return inp.click();
    if (e.target.closest('#escPlanilha')) {
      const [a, m] = Esc.mes.split('-').map(Number);
      $('#epMes').innerHTML = `Mês: <b>${esc(new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))}</b> · ${esc(Esc.local ? nomeIgreja(Esc.local) : 'todas as igrejas')} (o que estiver escolhido na escala do mês)`;
      $('#epFuncoes').innerHTML = '<span class="sutil pequeno">Funções:</span>' + funcoesEsc().map(f => `<label class="esc-chk"><input type="checkbox" data-ep-f="${esc(f.id)}"${f.modo === 'rodizio' ? ' checked' : ''}> ${esc(f.nome)}</label>`).join('');
      return abrirDialogo('dlgEscPlan');
    }
    const sp = e.target.closest('.esc-arq'), a = sp && (Esc.arquivos || []).find(x => x.id === sp.dataset.arq);
    if (!a) return;
    if (e.target.closest('[data-arq-abrir]')) return abrirArquivoEsc(a);
    if (e.target.closest('[data-arq-ler]')) return lerNomesDoArquivo(a, false);
    if (e.target.closest('[data-arq-apagar]')) {
      if (!confirm(`Tirar o arquivo "${a.nome}" da escala?\n\nOs nomes que já foram postos na escala continuam.`)) return;
      await apagarItemSec('esc', a.id);
      Esc.arquivos = Esc.arquivos.filter(x => x !== a);
      renderArquivosEsc();
    }
  });
}
