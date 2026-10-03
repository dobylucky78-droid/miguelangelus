'use strict';
/*
 * Importação do folheto "A Missa" (Arquidiocese do Rio de Janeiro) em PDF.
 * Feito para a versão "Celular" (uma coluna). Usa o pdf.js (lib/pdfjs), carregado só quando necessário.
 *
 * Como o folheto é lido:
 *  - letra grande             → título de uma parte ("6. Primeira Leitura (Ez 18,25-28)")
 *  - letra miúda              → descartada (rubricas, números de versículo, créditos)
 *  - fontes de uma só página  → descartadas (capa, propaganda da contracapa)
 *  - negrito                  → fala do povo (T.)      negrito itálico → refrão
 *  - itálico                  → estrofes dos cantos    regular         → padre / leitor
 */

const Folheto = (() => {
  let carregando = null;

  function carregarPdfjs() {
    if (window.pdfjsLib) return Promise.resolve();
    if (!carregando) carregando = (async () => {
      // O worker carregado como script comum faz o pdf.js rodar sem Web Worker (funciona até em file://)
      for (const src of ['lib/pdfjs/pdf.worker.min.js', 'lib/pdfjs/pdf.min.js']) {
        await new Promise((ok, falha) => {
          const s = document.createElement('script');
          s.src = src;
          s.onload = ok;
          s.onerror = () => falha(new Error('Não encontrei ' + src));
          document.head.appendChild(s);
        });
      }
    })();
    return carregando;
  }

  const SECOES = /^(ritos iniciais|liturgia da palavra|liturgia eucar[ií]stica|rito da comunh[aã]o|ritos finais)$/i;
  const ROTULO = /^(?:([PTLCD])\.\s*(?=\S)|(REFR[ÃA]O)\s*:\s*|(\d+)\.\s*(?=[^\d\s]))/i;
  const REF = /^\(.*\d.*\)$/;   // "(Ez 18,25-28)", "(Cf. Sl 118,49-50)"
  const SO_ROTULO = /^(?:[PTLCD]\.|REFR[ÃA]O:?|\d+\.)$/i;
  const CLITICOS = /^(nos|vos|lhe|lhes|se|me|te|o|a|os|as|lo|la|los|las|no|na)\b/;

  function estiloDaFonte(nome) {
    const base = (nome || '').split('+').pop().toLowerCase();
    const negrito = /bold|black|heavy|semibold|demi/.test(base);
    const italico = /italic|oblique|it$/.test(base);
    return negrito && italico ? 'refrao' : negrito ? 'forte' : italico ? 'italico' : 'regular';
  }

  // Junta duas linhas desfazendo a hifenização ("nun-" + "ca" → "nunca", mas "Ensinai-" + "nos" → "Ensinai-nos")
  function juntar(a, b) {
    if (/[A-Za-zÀ-ÿ]-$/.test(a) && !CLITICOS.test(b)) return a.slice(0, -1) + b;
    return a + ' ' + b;
  }

  async function lerRuns(pdf) {
    const runs = [], paginasDaFonte = {};
    let capa = '', tudo = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const pg = await pdf.getPage(p);
      await pg.getOperatorList();               // garante que os nomes reais das fontes estejam disponíveis
      const tc = await pg.getTextContent();
      const nomes = {};
      for (const id of Object.keys(tc.styles)) {
        try { nomes[id] = pg.commonObjs.get(id).name || id; } catch (_) { nomes[id] = id; }
      }
      for (const it of tc.items) {
        const bruto = it.str + (it.hasEOL ? '\n' : '');
        tudo += bruto;
        if (p <= 2) capa += bruto;
        if (!it.str || !it.str.trim()) continue;
        const fonte = nomes[it.fontName] || it.fontName;
        runs.push({ p, y: it.transform[5], x: it.transform[4], w: it.width, h: it.height, s: it.str, fonte, estilo: estiloDaFonte(fonte) });
        (paginasDaFonte[fonte] ||= new Set()).add(p);
      }
      pg.cleanup();
      tudo += '\n';
    }
    return { runs, paginasDaFonte, capa, tudo };
  }

  // Créditos dos cantos, ex.: "Entrada e Comunhão: Fr. Fabreti; Ofertas: Pe. Ney Brasil; Final: ..."
  const MOMENTO_CREDITO = [
    [/entrada/, 'Entrada'], [/ofert/, 'Ofertório'], [/comunhao/, 'Comunhão'],
    [/acao de gracas/, 'Ação de Graças'], [/final/, 'Final'],
  ];
  const INICIO_CREDITO = /^(entrada|ofertas?|ofertorio|comunhao|final|acao de gracas)\b[^:]{0,40}:/;
  const semAc = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function creditos(texto) {
    const linhas = texto.split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const out = {};
    for (let i = 0; i < linhas.length; i++) {
      if (!INICIO_CREDITO.test(semAc(linhas[i]))) continue;
      let l = linhas[i];
      // continua na linha seguinte até um ponto final de verdade (não conta abreviação como "O." ou "Pe.")
      while (i + 1 < linhas.length && !/[a-zà-ú]{3,}\.+$/i.test(l) && !INICIO_CREDITO.test(semAc(linhas[i + 1])) && l.length < 400) l += ' ' + linhas[++i];
      for (const trecho of l.split(';')) {
        const k = trecho.indexOf(':');
        if (k < 0) continue;
        const autor = trecho.slice(k + 1).trim().replace(/\.{2,}$/, '.').replace(/\.$/, '');
        for (const chave of semAc(trecho.slice(0, k)).split(/,|\se\s/)) {
          const m = MOMENTO_CREDITO.find(([re]) => re.test(chave));
          if (m && autor) out[m[1]] = autor;
        }
      }
    }
    return out;
  }

  function montarLinhas({ runs, paginasDaFonte }) {
    // tamanho do corpo do texto = tamanho mais usado (ponderado por caracteres)
    const porTam = {};
    for (const r of runs) porTam[Math.round(r.h)] = (porTam[Math.round(r.h)] || 0) + r.s.length;
    const corpo = +Object.entries(porTam).sort((a, b) => b[1] - a[1])[0][0];

    // Letra miúda é descartada, exceto referências bíblicas entre parênteses (ficam nos títulos)
    const uteis = [];
    for (const r of runs) {
      if (r.s.trim() === '=' || paginasDaFonte[r.fonte].size < 3) continue;
      if (r.h >= corpo * 0.75) { uteis.push(r); continue; }
      const refs = r.s.match(/\([^()]*\d[^()]*\)/g);
      if (refs && r.h >= corpo * 0.4) uteis.push({ ...r, s: refs[0], ref: true });
      // nome/tema do prefácio, em letra menor logo abaixo de "Oração Eucarística …"
      // ("Prefácio dos Domingos do Tempo Comum V", ou só o tema: "A glória da Assunção de Maria")
      else if ((/pref[aá]cio/i.test(r.s) && r.h >= corpo * 0.5) || (r.h >= corpo * 0.66 && r.h < corpo * 0.75)) uteis.push({ ...r, sub: true });
    }

    const linhas = [];
    for (const r of uteis) {
      let l = linhas.find(l => l.p === r.p && Math.abs(l.y - r.y) <= corpo * 0.3);
      if (!l) { l = { p: r.p, y: r.y, runs: [] }; linhas.push(l); }
      l.runs.push(r);
    }
    linhas.sort((a, b) => a.p - b.p || b.y - a.y);
    for (const l of linhas) {
      // letra menor no meio de uma linha comum não é subtítulo de prefácio: descarta
      if (l.runs.some(r => r.sub) && l.runs.some(r => !r.sub && !r.ref)) l.runs = l.runs.filter(r => !r.sub || /pref[aá]cio/i.test(r.s));
      l.runs.sort((a, b) => a.x - b.x);
      // recoloca espaços onde há distância entre dois trechos (o PDF nem sempre traz o espaço)
      let txt = '', fim = null;
      for (const r of l.runs) {
        if (fim !== null && r.x - fim > corpo * 0.12 && !/\s$/.test(txt) && !/^\s/.test(r.s)) txt += ' ';
        txt += r.s;
        fim = r.x + (r.w || 0);
      }
      l.texto = txt.replace(/\s+/g, ' ').replace(/([“‘(\[])\s+/g, '$1').replace(/\s+([”’)\],.;:!?])/g, '$1').trim();
      l.grande = Math.max(...l.runs.map(r => r.h)) >= corpo * 1.25;
      l.soRef = l.runs.every(r => r.ref);
      l.soSub = l.runs.every(r => r.sub);
      const cont = {};
      for (const r of l.runs) {
        const s = r.s.trim();
        if (s && !SO_ROTULO.test(s)) cont[r.estilo] = (cont[r.estilo] || 0) + s.length;
      }
      l.estilo = Object.entries(cont).sort((a, b) => b[1] - a[1])[0]?.[0] || 'regular';
    }
    return linhas;
  }

  // livre = veio de .docx/.txt: cada linha já é uma linha de verdade (sem hifenização nem títulos quebrados)
  function estruturar(linhas, livre = false) {
    const partes = [];
    let parte = null, par = null;
    for (const l of linhas) {
      const t = l.texto;
      if (!t) continue;
      const temParteReal = partes.some(p => !p.comentario);
      if (l.grande) {
        par = null;
        if (SECOES.test(t)) {
          // o comentário que abre a seção ("L. A Palavra de Deus nos interpela…") vira um item próprio,
          // em vez de ir parar no fim da parte anterior (se a seção não tiver comentário, o item fica vazio e some)
          // "LITURGIA DA PALAVRA" → "Liturgia da Palavra"
          const secao = t.toLowerCase().split(' ').map(w => /^(da|de|do|das|dos|e)$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          if (temParteReal) { parte = { titulo: `Comentário — ${secao}`, pars: [], comentario: true }; partes.push(parte); }
          continue;
        }
        // título que quebra em duas linhas ("Oração Eucarística para Diversas" / "Circunstâncias III")
        if (!livre && parte && !parte.comentario && !parte.pars.length && !parte.prefacio && !/^\d+\./.test(t) && !/^ant[ií]fona/i.test(t)) { parte.titulo += ' ' + t; continue; }
        if (!temParteReal && !/^\d+\.|^ant[ií]fona/i.test(t) && !(livre && NOME_PARTE.test(t))) continue;   // títulos da capa
        parte = { titulo: t.replace(/^\d+\.\s*/, ''), pars: [] };
        partes.push(parte);
        continue;
      }
      if (!parte) {
        // antes da primeira parte: o comentário inicial (texto comum). O título e o "Ano Jubilar…" em negrito ficam de fora.
        if (l.estilo !== 'regular' || l.soRef || l.soSub) continue;
        parte = { titulo: 'Comentário inicial', pars: [], comentario: true };
        partes.push(parte);
      }
      if (l.soRef) {                                                     // referência logo abaixo do título
        if (!parte.pars.length && REF.test(t)) parte.titulo += ' ' + t;
        continue;
      }
      if (l.soSub) {                                                     // "Prefácio dos Domingos do Tempo Comum V"
        if (!parte.pars.length) parte.prefacio = parte.prefacio ? parte.prefacio + ' ' + t : t;
        continue;
      }
      const m = t.match(ROTULO);
      if (m) {
        par = { rotulo: m[1] ? m[1].toUpperCase() : m[2] ? 'REFRAO' : 'N', estilo: l.estilo, texto: t.slice(m[0].length) };
        parte.pars.push(par);
      } else if (par && par.estilo === l.estilo && !l.novoPar) {
        par.texto = l.quebra ? par.texto + ' / ' + t : juntar(par.texto, t);
      } else {
        par = { rotulo: '', estilo: l.estilo, texto: t, novo: !!l.novoPar, quebra: !!l.quebra };
        parte.pars.push(par);
      }
    }
    return partes.filter(p => p.pars.length);
  }

  const versos = s => s
    .replace(/\s*(\/\/:|:\/\/|\/\/)\s*/g, '\n')
    .replace(/\s*\/\s*/g, '\n')
    .replace(/\s*\*\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

  function paraItens(partes) {
    return partes.map(pt => {
      const mRef = pt.titulo.match(/\(([^)]*\d[^)]*)\)/);
      const ref = mRef ? mRef[1].trim() : '';
      const nome = pt.titulo.replace(/\s*\([^)]*\)/g, '').trim();
      const temRefrao = pt.pars.some(p => p.rotulo === 'REFRAO');

      if (temRefrao || /canto|aclama|salmo/i.test(nome)) {
        // Canto/salmo: refrão + estrofes. Trechos sem rótulo continuam a estrofe anterior.
        const blocos = [];
        for (const p of pt.pars) {
          if (p.rotulo || !blocos.length || p.novo) blocos.push({ ...p });   // novo: depois de linha em branco (.docx/.txt)
          else blocos[blocos.length - 1].texto += (p.quebra ? ' / ' : ' ') + p.texto;
        }
        const refrao = blocos.filter(b => b.rotulo === 'REFRAO').map(b => versos(b.texto))[0] || '';
        const estrofes = blocos.filter(b => b.rotulo !== 'REFRAO').map(b => versos(b.texto)).filter(Boolean);
        return { tipo: 'salmo', rotulo: /salmo/i.test(nome) ? 'Salmo' : 'Canto', titulo: nome, ref, refrao, texto: estrofes.join('\n\n') };
      }

      // Oração dos Fiéis: convite (P.) → resposta (T.) → preces numeradas → conclusão (P. … T. Amém)
      if (/ora[cç][aã]o dos fi[eé]is|preces/i.test(nome)) {
        const iResp = pt.pars.findIndex(p => p.rotulo === 'T');
        const numeradas = pt.pars.filter(p => p.rotulo === 'N');
        if (iResp >= 0 && numeradas.length) {
          const iUltima = pt.pars.indexOf(numeradas[numeradas.length - 1]);
          return { tipo: 'preces', titulo: nome, resposta: pt.pars[iResp].texto.trim(),
            convite: textoCorrido(pt.pars.slice(0, iResp)), texto: numeradas.map(p => p.texto.trim()).join('\n\n'),
            conclusao: textoCorrido(pt.pars.slice(iUltima + 1)) };
        }
      }
      return { tipo: 'texto', titulo: nome + (ref ? ` (${ref})` : ''), texto: textoCorrido(pt.pars) };
    });
  }

  // Texto corrido; as falas do povo viram "— ..." (negrito) e ficam no mesmo slide da fala anterior
  // A letra de quem fala (P., T., L., C., D.) fica no texto: o telão a mostra colorida e a fala do povo (T.) em negrito
  function textoCorrido(pars) {
    let texto = '';
    for (const p of pars) {
      const povo = p.rotulo === 'T' || (!p.rotulo && p.estilo === 'forte');
      const quem = /^[PTLCD]$/.test(p.rotulo) ? p.rotulo + '. ' : '';
      const t = povo ? (quem || '— ') + p.texto.replace(/\s*\/\s*/g, '\n') : quem + p.texto.replace(/\s+\/\s+/g, '\n');
      texto += texto ? (povo ? '\n' : '\n\n') + t : t;
    }
    return texto;
  }

  // Oração Eucarística do dia → { oe: {nome, texto}, pref: {nome, texto} } para o catálogo.
  // Na parte do folheto: diálogo ("…nossa salvação") → prefácio → Santo → oração.
  function extrairEucaristia(partes) {
    const pt = partes.find(p => /ora[cç][aã]o eucar[ií]stica/i.test(p.titulo));
    if (!pt) return null;
    const nome = pt.titulo.replace(/\s*\([^)]*\)/g, '').trim();
    const fimDialogo = pt.pars.findIndex(p => /dever e nossa salva/i.test(p.texto));
    const santo = pt.pars.findIndex(p => /^santo,?\s+santo/i.test(p.texto.trim()));
    if (fimDialogo < 0 || santo <= fimDialogo) return { oe: { nome, texto: textoCorrido(pt.pars) }, pref: null };
    return {
      oe: { nome, texto: textoCorrido(pt.pars.slice(santo + 1)) },
      // o nome pode faltar (orações com prefácio próprio): quem guarda decide pelo catálogo
      pref: { nome: pt.prefacio || '', texto: textoCorrido(pt.pars.slice(fimDialogo + 1, santo)) },
    };
  }

  // Nome da celebração. Em solenidades/festas o folheto traz o nome numa linha e "Solenidade – …" na seguinte:
  // "Assunção da Bem-aventurada Virgem Maria" + "Solenidade – 20ª Semana…" → "Assunção … — Solenidade"
  function tituloLiturgico(linhas) {
    const capa = [];
    for (const l of linhas) { if (l.grande && /^\d+\./.test(l.texto)) break; if (l.grande) capa.push(l); }
    const i = capa.findIndex(l => /^(solenidade|festa|mem[óo]ria)\b/i.test(l.texto));
    if (i > 0) {
      // o nome pode ocupar 2–3 linhas ("Assunção da Bem-aventurada" / "Virgem Maria"): junta as linhas vizinhas
      let k = i - 1;
      while (k > 0 && i - k < 3 && capa[k - 1].y > capa[k].y && capa[k - 1].y - capa[k].y < 130) k--;
      const nome = capa.slice(k, i).map(l => l.texto).join(' ');
      return `${nome} — ${capa[i].texto.split(/\s+[–-]\s+/)[0]}`;
    }
    const t = capa.map(l => l.texto).find(t => /domingo|semana|missa|solenidade|festa/i.test(t)) || '';
    return t.replace(/^(\d+)\s*(?=[A-ZÀ-Ú])/, '$1º ');
  }

  function nomeDoRoteiro(capa, linhas) {
    const data = (capa.match(/\d{1,2} de [a-zç]+ de \d{4}/i) || [''])[0];
    return [tituloLiturgico(linhas), data].filter(Boolean).join(' — ');
  }

  // Ilustração da capa (no folheto Celular, a página 1 mostra a capa de papel dentro de um celular):
  // a maior imagem desenhada na página 1, tirada direto do PDF (sem o texto e a moldura por cima). → data URL ou ''
  async function imagemDaCapa(pdf) {
    try {
      const pg = await pdf.getPage(1);
      const vp = pg.getViewport({ scale: 1 });
      const ops = await pg.getOperatorList();
      const O = pdfjsLib.OPS;
      const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
      let ctm = [1, 0, 0, 1, 0, 0], maior = null;
      const pilha = [];
      ops.fnArray.forEach((f, i) => {
        const a = ops.argsArray[i];
        if (f === O.save) pilha.push(ctm);
        else if (f === O.restore) ctm = pilha.pop() || ctm;
        else if (f === O.transform) ctm = mul(ctm, a);
        else if (f === O.paintImageXObject) {
          const area = Math.hypot(ctm[0], ctm[1]) * Math.hypot(ctm[2], ctm[3]);
          if (!maior || area > maior.area) maior = { area, nome: a[0] };
        }
      });
      // imagem pequena (logo, brasão) não serve de capa
      if (!maior || maior.area < vp.width * vp.height * 0.06) return '';
      const obj = pg.objs.has(maior.nome) ? pg.objs.get(maior.nome) : pg.commonObjs.get(maior.nome);
      const c = document.createElement('canvas');
      c.width = obj.width; c.height = obj.height;
      const ctx = c.getContext('2d');
      if (obj.bitmap) ctx.drawImage(obj.bitmap, 0, 0);
      else if (obj.data) {
        // 1 = 1 bit cinza, 2 = RGB, 3 = RGBA
        const id = ctx.createImageData(obj.width, obj.height), n = obj.width * obj.height;
        if (obj.kind === 3) id.data.set(obj.data.subarray(0, n * 4));
        else if (obj.kind === 2) for (let p = 0; p < n; p++) { id.data[p * 4] = obj.data[p * 3]; id.data[p * 4 + 1] = obj.data[p * 3 + 1]; id.data[p * 4 + 2] = obj.data[p * 3 + 2]; id.data[p * 4 + 3] = 255; }
        else return '';
        ctx.putImageData(id, 0, 0);
      } else return '';
      return c.toDataURL('image/webp', 0.9);
    } catch (e) {
      console.warn('Capa do folheto:', e);
      return '';
    }
  }

  // ===================================================================
  // Word (.docx) e texto (.txt): viram as mesmas "linhas" do PDF e seguem o mesmo caminho.
  // No Word: título (estilo Título/Heading ou letra bem maior) = parte; negrito = povo; itálico = estrofe;
  // negrito+itálico = refrão. No .txt não há formatação: as partes são reconhecidas pelo nome
  // ("Canto de Entrada", "6. Primeira Leitura (Ez 18,25-28)", "Salmo Responsorial"…) ou por "# Título".
  // ===================================================================

  const NOME_PARTE = new RegExp('^(?:\\d+\\.\\s*)?(?:' + [
    'canto(\\s+(de|da|do|das|dos|final|para)\\b[^.!?]{0,40})?', 'ant[ií]fona(\\s+(de|da|do)\\b[^.!?]{0,40})?', 'sauda[cç][aã]o', 'ato penitencial', 'kyrie',
    'senhor,? tende piedade', 'gl[oó]ria', 'hino de louvor', 'ora[cç][aã]o do dia', 'coleta',
    'primeira leitura', 'segunda leitura', 'leitura', 'salmo( responsorial)?', 'aclama[cç][aã]o ao evangelho',
    'aclama[cç][aã]o', 'evangelho', 'homilia', 'profiss[aã]o de f[eé]', 'creio', 'ora[cç][aã]o dos fi[eé]is', 'preces',
    'ora[cç][aã]o sobre as oferendas', 'apresenta[cç][aã]o das oferendas', 'pref[aá]cio(\\s+(de|da|do|dos|das|comum|pr[oó]prio|—|–|-)[^.!?]{0,60})?',
    'ora[cç][aã]o eucar[ií]stica\\b[^.!?]{0,60}', 'santo', 'pai-nosso', 'pai nosso', 'abra[cç]o da paz', 'rito da paz',
    'cordeiro de deus', 'fra[cç][aã]o do p[aã]o', 'comunh[aã]o', 'ora[cç][aã]o depois da comunh[aã]o',
    'ora[cç][aã]o p[oó]s-comunh[aã]o', 'avisos', 'b[eê]n[cç][aã]o( final)?', 'despedida', 'coment[aá]rio(\\s+(inicial|—|–|-|da|de|do|das|dos)[^.!?]{0,40})?',
  ].join('|') + ')(?:\\s*\\([^)]*\\))?\\s*:?$', 'i');

  const pareceTitulo = t => t.length <= 90 && (NOME_PARTE.test(t) || SECOES.test(t));

  // Leitor mínimo de .zip (o .docx é um zip): acha um arquivo pelo nome e descompacta
  async function lerZip(buf, nome) {
    const v = new DataView(buf), u8 = new Uint8Array(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Este arquivo não parece ser um .docx (se for .doc antigo, salve como .docx no Word).');
    let p = v.getUint32(eocd + 16, true);
    const total = v.getUint16(eocd + 10, true);
    for (let k = 0; k < total; k++) {
      const metodo = v.getUint16(p + 10, true), tam = v.getUint32(p + 20, true);
      const ln = v.getUint16(p + 28, true), le = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true);
      const local = v.getUint32(p + 42, true);
      const n = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + ln));
      if (n === nome) {
        const ini = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
        const dados = u8.subarray(ini, ini + tam);
        if (metodo === 0) return new TextDecoder().decode(dados);
        const fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return await new Response(fluxo).text();
      }
      p += 46 + ln + le + lc;
    }
    return null;
  }

  function lerEstilosDocx(xml) {
    const est = {}, padrao = { sz: 22 };
    if (!xml) return { est, padrao };
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const sz = doc.getElementsByTagName('w:docDefaults')[0]?.getElementsByTagName('w:sz')[0];
    if (sz) padrao.sz = +sz.getAttribute('w:val') || 22;
    for (const s of doc.getElementsByTagName('w:style')) {
      const id = s.getAttribute('w:styleId'), nome = s.getElementsByTagName('w:name')[0]?.getAttribute('w:val') || '';
      est[id] = { ...propsRun(s.getElementsByTagName('w:rPr')[0]),
        base: s.getElementsByTagName('w:basedOn')[0]?.getAttribute('w:val'),
        titulo: /heading|t[ií]tulo|title/i.test(nome + ' ' + id) || !!s.getElementsByTagName('w:outlineLvl').length };
    }
    return { est, padrao };
  }

  // w:b / w:i / w:sz de um w:rPr (w:val="0" ou "false" desliga)
  function propsRun(rPr) {
    const r = {};
    if (!rPr) return r;
    const liga = tag => { const e = [...rPr.children].find(c => c.tagName === tag); return e ? !/^(0|false|off)$/i.test(e.getAttribute('w:val') || '') : undefined; };
    const b = liga('w:b'), i = liga('w:i');
    if (b !== undefined) r.b = b;
    if (i !== undefined) r.i = i;
    const sz = [...rPr.children].find(c => c.tagName === 'w:sz');
    if (sz) r.sz = +sz.getAttribute('w:val');
    return r;
  }

  function estiloCompleto(est, id, prof = 0) {
    const s = est[id];
    if (!s || prof > 8) return {};
    return { ...estiloCompleto(est, s.base, prof + 1), ...Object.fromEntries(Object.entries(s).filter(([k, v]) => v !== undefined && k !== 'base')) };
  }

  async function linhasDoDocx(arquivo) {
    const buf = await arquivo.arrayBuffer();
    const xml = await lerZip(buf, 'word/document.xml');
    if (!xml) throw new Error('Não encontrei o texto dentro deste .docx.');
    const { est, padrao } = lerEstilosDocx(await lerZip(buf, 'word/styles.xml'));
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const brutas = [];
    for (const p of doc.getElementsByTagName('w:p')) {
      const pPr = p.getElementsByTagName('w:pPr')[0];
      const sid = pPr?.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val');
      const ep = { sz: padrao.sz, ...estiloCompleto(est, 'Normal'), ...estiloCompleto(est, sid) };
      const runs = [];
      for (const r of p.getElementsByTagName('w:r')) {
        let apagado = false;                             // texto riscado no "controlar alterações"
        for (let a = r.parentNode; a && a !== p; a = a.parentNode) if (a.tagName === 'w:del') apagado = true;
        if (apagado) continue;
        const pr = { ...ep, ...estiloCompleto(est, r.getElementsByTagName('w:rStyle')[0]?.getAttribute('w:val')), ...propsRun(r.getElementsByTagName('w:rPr')[0]) };
        let s = '';
        for (const c of r.children) {
          if (c.tagName === 'w:t') s += c.textContent;
          else if (c.tagName === 'w:tab') s += ' ';
          else if (c.tagName === 'w:br' || c.tagName === 'w:cr') s += ' / ';
        }
        if (s) runs.push({ s, ...pr });
      }
      const texto = runs.map(r => r.s).join('').replace(/\s+/g, ' ').trim();
      brutas.push({ texto, runs, titulo: !!ep.titulo || !!pPr?.getElementsByTagName('w:outlineLvl').length });
    }
    // tamanho do corpo = o mais usado
    const porTam = {};
    for (const b of brutas) for (const r of b.runs) porTam[r.sz] = (porTam[r.sz] || 0) + r.s.length;
    const corpo = +(Object.entries(porTam).sort((a, b) => b[1] - a[1])[0]?.[0] || padrao.sz);
    return brutas.map(b => {
      if (!b.texto) return { vazia: true };
      const cont = {};
      for (const r of b.runs) {
        const e = r.b && r.i ? 'refrao' : r.b ? 'forte' : r.i ? 'italico' : 'regular';
        const s = r.s.trim();
        if (s && !SO_ROTULO.test(s)) cont[e] = (cont[e] || 0) + s.length;
      }
      const maior = Math.max(...b.runs.map(r => r.sz || corpo));
      return { texto: b.texto, grande: b.titulo || maior >= corpo * 1.25 || SECOES.test(b.texto),
        estilo: Object.entries(cont).sort((a, c) => c[1] - a[1])[0]?.[0] || 'regular' };
    });
  }

  function linhasDoTxt(texto) {
    return texto.replace(/\r/g, '').split('\n').map(bruta => {
      let t = bruta.replace(/\s+/g, ' ').trim();
      if (!t) return { vazia: true };
      const marcado = /^#+\s*/.test(t);                    // "# Título qualquer" também vira parte
      if (marcado) t = t.replace(/^#+\s*/, '');
      return { texto: t, grande: marcado || pareceTitulo(t), estilo: 'regular' };
    });
  }

  // Acabamento comum: linha em branco começa parágrafo novo; quebras de linha viram " / " (versos)
  function finalizarLinhas(brutas) {
    const linhas = [];
    let novo = true, primeiraParte = false;
    brutas.forEach((l, i) => {
      if (l.vazia) { novo = true; return; }
      let { texto, grande, estilo } = l;
      if (grande && (/^\d+\./.test(texto) || NOME_PARTE.test(texto))) primeiraParte = true;
      // antes da primeira parte, linhas curtas sem ponto final são a capa (título da celebração)
      if (!primeiraParte && !grande && texto.length <= 80 && !/[.!?:;]$/.test(texto) && linhas.length < 12) grande = true;
      // referência sozinha na linha, logo abaixo do título
      const soRef = !grande && REF.test(texto);
      linhas.push({ texto, grande, estilo, soRef, soSub: false, y: -i * 100, novoPar: novo, quebra: true });
      novo = false;
    });
    return linhas;
  }

  function pareceFolheto(texto) {
    const n = texto.split(/\r?\n/).filter(l => pareceTitulo(l.replace(/\s+/g, ' ').trim())).length;
    return n >= 4;
  }

  async function importarTexto(arquivo, tipo) {
    const brutas = tipo === 'docx' ? await linhasDoDocx(arquivo) : linhasDoTxt(await arquivo.text());
    const linhas = finalizarLinhas(brutas);
    const partes = estruturar(linhas, true);
    if (!partes.some(p => !p.comentario)) throw new Error('Não reconheci as partes da Missa neste arquivo. Deixe os títulos em linhas próprias — ex.: "Canto de Entrada", "Primeira Leitura (Ez 18,25-28)", "Salmo Responsorial" — ou comece a linha com "# ".');
    const tudo = linhas.map(l => l.texto).join('\n');
    return {
      nome: nomeDoRoteiro(linhas.slice(0, 40).map(l => l.texto).join('\n'), linhas),
      tituloLiturgico: tituloLiturgico(linhas),
      itens: paraItens(partes),
      eucaristia: extrairEucaristia(partes),
      creditos: creditos(tudo),
      aviso: '',
    };
  }

  async function importar(arquivo) {
    const ext = (arquivo.name.match(/\.(\w+)$/) || [])[1]?.toLowerCase();
    if (ext === 'docx') return importarTexto(arquivo, 'docx');
    if (ext === 'txt') return importarTexto(arquivo, 'txt');
    if (ext === 'doc') throw new Error('Arquivos .doc (Word antigo) não dão para ler. Abra no Word e use "Salvar como" → .docx (ou PDF).');
    if (ext === 'odt') throw new Error('Arquivos .odt não dão para ler. Salve como .docx ou PDF.');
    await carregarPdfjs();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
    const pg1 = await pdf.getPage(Math.min(2, pdf.numPages));
    const vp = pg1.getViewport({ scale: 1 });
    const bruto = await lerRuns(pdf);
    if (!bruto.runs.length) throw new Error('Este PDF não tem texto (parece ser só imagem).');
    const linhas = montarLinhas(bruto);
    const partes = estruturar(linhas);
    const itens = paraItens(partes);
    return {
      nome: nomeDoRoteiro(bruto.capa, linhas),
      tituloLiturgico: tituloLiturgico(linhas),
      itens,
      eucaristia: extrairEucaristia(partes),
      creditos: creditos(bruto.tudo),
      capa: await imagemDaCapa(pdf),
      aviso: vp.width > vp.height ? 'Este PDF parece ser a versão de papel. A versão "Celular" costuma dar um resultado melhor.' : '',
    };
  }

  return { importar, pareceFolheto, carregarPdfjs };
})();
