'use strict';
/*
 * Bíblia: importação Zefania XML, localização de livros (siglas católicas),
 * interpretação de referências no padrão brasileiro (Jo 3,16-18) e busca por palavra.
 */

const Biblia = (() => {
  // Cânon católico (73 livros) com siglas da CNBB e nomes alternativos
  const CATALOGO = [
    ['Gn', 'Gênesis'], ['Ex', 'Êxodo'], ['Lv', 'Levítico'], ['Nm', 'Números'], ['Dt', 'Deuteronômio'],
    ['Js', 'Josué'], ['Jz', 'Juízes'], ['Rt', 'Rute'], ['1Sm', '1 Samuel'], ['2Sm', '2 Samuel'],
    ['1Rs', '1 Reis'], ['2Rs', '2 Reis'], ['1Cr', '1 Crônicas', ['1 Paralipômenos']], ['2Cr', '2 Crônicas', ['2 Paralipômenos']],
    ['Esd', 'Esdras'], ['Ne', 'Neemias'], ['Tb', 'Tobias', ['Tobit']], ['Jt', 'Judite', ['Judith']], ['Est', 'Ester'],
    ['1Mc', '1 Macabeus'], ['2Mc', '2 Macabeus'], ['Jó', 'Jó'], ['Sl', 'Salmos', ['Salmo']], ['Pr', 'Provérbios'],
    ['Ecl', 'Eclesiastes', ['Coélet', 'Qohelet']], ['Ct', 'Cântico dos Cânticos', ['Cânticos', 'Cantares', 'Cântico']],
    ['Sb', 'Sabedoria'], ['Eclo', 'Eclesiástico', ['Sirácida', 'Sirácide', 'Sir']],
    ['Is', 'Isaías'], ['Jr', 'Jeremias'], ['Lm', 'Lamentações', ['Lamentações de Jeremias']], ['Br', 'Baruc', ['Baruque']],
    ['Ez', 'Ezequiel'], ['Dn', 'Daniel'], ['Os', 'Oseias', ['Oséias']], ['Jl', 'Joel'], ['Am', 'Amós'],
    ['Ab', 'Abdias', ['Obadias']], ['Jn', 'Jonas'], ['Mq', 'Miqueias', ['Miquéias']], ['Na', 'Naum'],
    ['Hab', 'Habacuc', ['Habacuque']], ['Sf', 'Sofonias'], ['Ag', 'Ageu'], ['Zc', 'Zacarias'], ['Ml', 'Malaquias'],
    ['Mt', 'Mateus'], ['Mc', 'Marcos'], ['Lc', 'Lucas'], ['Jo', 'João'], ['At', 'Atos dos Apóstolos', ['Atos']],
    ['Rm', 'Romanos'], ['1Cor', '1 Coríntios'], ['2Cor', '2 Coríntios'], ['Gl', 'Gálatas'], ['Ef', 'Efésios'],
    ['Fl', 'Filipenses', ['Fp']], ['Cl', 'Colossenses'], ['1Ts', '1 Tessalonicenses'], ['2Ts', '2 Tessalonicenses'],
    ['1Tm', '1 Timóteo'], ['2Tm', '2 Timóteo'], ['Tt', 'Tito'], ['Fm', 'Filêmon', ['Filemom']], ['Hb', 'Hebreus'],
    ['Tg', 'Tiago'], ['1Pd', '1 Pedro', ['1Pe']], ['2Pd', '2 Pedro', ['2Pe']], ['1Jo', '1 João'], ['2Jo', '2 João'],
    ['3Jo', '3 João'], ['Jd', 'Judas'], ['Ap', 'Apocalipse'],
  ].map(([abrev, nome, alias = []]) => {
    const extras = [];
    const m = nome.match(/^(\d) (.+)$/);
    if (m) extras.push(`${['', 'I', 'II', 'III'][+m[1]]} ${m[2]}`, `${m[1]}º ${m[2]}`, `${m[1]}ª ${m[2]}`);
    return { abrev, nome, alias: [...alias, ...extras] };
  });

  // Numeração Zefania padrão (1–66), usada só quando o arquivo não traz o nome do livro
  const PROT = 'Gn Ex Lv Nm Dt Js Jz Rt 1Sm 2Sm 1Rs 2Rs 1Cr 2Cr Esd Ne Est Jó Sl Pr Ecl Ct Is Jr Lm Ez Dn Os Jl Am Ab Jn Mq Na Hab Sf Ag Zc Ml Mt Mc Lc Jo At Rm 1Cor 2Cor Gl Ef Fl Cl 1Ts 2Ts 1Tm 2Tm Tt Fm Hb Tg 1Pd 2Pd 1Jo 2Jo 3Jo Jd Ap'.split(' ');

  const chave = s => (s || '').toLowerCase().replace(/[\s.]/g, '');
  const semAc = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');

  // ---------- Importação ----------

  function decodificar(buffer) {
    const cabeca = new TextDecoder('windows-1252').decode(buffer.slice(0, 200));
    const m = cabeca.match(/encoding=["']([\w-]+)["']/i);
    try { return new TextDecoder(m ? m[1].toLowerCase() : 'utf-8').decode(buffer); }
    catch { return new TextDecoder('utf-8').decode(buffer); }
  }

  function tags(el, nome) {
    const r = el.getElementsByTagName(nome);
    return r.length ? r : el.getElementsByTagName(nome.toLowerCase());
  }

  function textoVerso(el) {
    let s = '';
    for (const n of el.childNodes) {
      if (n.nodeType === 3) s += n.nodeValue;
      else if (n.nodeType === 1) {
        const nome = n.nodeName.toUpperCase();
        if (nome === 'BR') s += ' ';
        else if (nome !== 'NOTE') s += textoVerso(n);
      }
    }
    return s;
  }

  function parseZefania(xmlTexto, nomeArquivo) {
    const doc = new DOMParser().parseFromString(xmlTexto, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('O arquivo não é um XML válido.');
    const livrosEl = tags(doc, 'BIBLEBOOK');
    if (!livrosEl.length) throw new Error('Não encontrei livros (<BIBLEBOOK>). É mesmo um arquivo Zefania?');

    const raiz = doc.documentElement;
    const titulo = tags(doc, 'title')[0];
    const nome = raiz.getAttribute('biblename') || (titulo && titulo.textContent.trim()) || nomeArquivo || 'Bíblia';

    const livros = [];
    for (const b of livrosEl) {
      const livro = { num: +b.getAttribute('bnumber') || 0, nome: (b.getAttribute('bname') || '').trim(), abrev: (b.getAttribute('bsname') || '').trim(), caps: [] };
      for (const c of tags(b, 'CHAPTER')) {
        const vs = [];
        for (const v of tags(c, 'VERS')) {
          const t = textoVerso(v).replace(/\s+/g, ' ').trim();
          if (t) vs.push({ n: parseInt(v.getAttribute('vnumber'), 10) || vs.length + 1, t });
        }
        livro.caps.push({ n: +c.getAttribute('cnumber') || livro.caps.length + 1, vs });
      }
      livros.push(livro);
    }
    return { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), nome, importado: Date.now(), livros };
  }

  async function importarArquivo(arquivo) {
    const texto = decodificar(await arquivo.arrayBuffer());
    return parseZefania(texto, arquivo.name.replace(/\.xml$/i, ''));
  }

  // ---------- Índice de livros ----------

  function catalogoDe(l) {
    const kn = semAc(chave(l.nome)), ka = chave(l.abrev);
    return (kn && CATALOGO.find(c => [c.nome, ...c.alias].some(n => semAc(chave(n)) === kn)))
      || (ka && CATALOGO.find(c => chave(c.abrev) === ka))
      || (!l.nome && l.num >= 1 && l.num <= 66 ? CATALOGO.find(c => c.abrev === PROT[l.num - 1]) : null);
  }

  // Prepara a Bíblia para uso (não persistir depois disso: adiciona campos auxiliares)
  function indexar(b) {
    for (const l of b.livros) {
      const cat = catalogoDe(l);
      if (!l.nome) l.nome = cat ? cat.nome : `Livro ${l.num}`;
      l.sigla = cat ? cat.abrev : (l.abrev || l.nome);
      l._chaves = [l.nome, l.abrev, ...(cat ? [cat.abrev, cat.nome, ...cat.alias] : [])].filter(Boolean).map(chave);
    }
    return b;
  }

  function acharLivro(b, consulta) {
    const k = chave(consulta);
    if (!k) return null;
    // 1) exato com acento ("Jo" = João, "Jó" = Jó)  2) sem acento  3) começo do nome
    const ks = semAc(k);
    return b.livros.find(l => l._chaves.includes(k))
      || b.livros.find(l => l._chaves.some(c => semAc(c) === ks))
      || b.livros.find(l => l._chaves.some(c => semAc(c).startsWith(ks)))
      || null;
  }

  // ---------- Referências ----------

  // Aceita: "Jo 3", "Jo 3,16", "Jo 3,16-18", "Is 9,1-3.5-6", "Mt 5,1-12a", "Jo 3,16-4,2", "Jo 3:16" e "Sl 22(23)"
  function parseRef(txt) {
    const t = (txt || '').replace(/\(\d+\)/g, '').replace(/\s+/g, ' ').trim();
    const m = t.match(/^((?:[1-4]\s*)?[^\d\s,.:;][^\d]*?)\.?\s*(\d+)\s*(?:([,:])\s*(.*))?$/);
    if (!m) return null;
    const livro = m[1].trim(), cap = +m[2], sep = m[3], resto = (m[4] || '').trim();
    const refResto = t.slice(m[1].length).replace(/^\.?\s*/, '');
    if (!resto) return { livro, refResto, trechos: [{ c1: cap, v1: null, c2: cap, v2: null }] };

    const trechos = [];
    let capAtual = cap;
    for (let p of resto.split(sep === ':' ? /[;,]/ : /[.;]/)) {
      p = p.replace(/[a-z]/gi, '').trim();
      if (!p) continue;
      let mm;
      if ((mm = p.match(/^(\d+)\s*[,:]\s*(\d+)(?:\s*-\s*(?:(\d+)\s*[,:]\s*)?(\d+))?$/))) {
        const c1 = +mm[1], v1 = +mm[2], c2 = mm[3] ? +mm[3] : c1, v2 = mm[4] ? +mm[4] : v1;
        trechos.push({ c1, v1, c2, v2 }); capAtual = c2;
      } else if ((mm = p.match(/^(\d+)(?:\s*-\s*(?:(\d+)\s*[,:]\s*)?(\d+))?$/))) {
        const v1 = +mm[1], c2 = mm[2] ? +mm[2] : capAtual, v2 = mm[3] ? +mm[3] : v1;
        trechos.push({ c1: capAtual, v1, c2, v2 }); capAtual = c2;
      } else return null;
    }
    return trechos.length ? { livro, refResto, trechos } : null;
  }

  function resolver(b, txt) {
    const p = parseRef(txt);
    if (!p) return { erro: 'Não entendi a referência. Exemplos: Jo 3,16-18 · Sl 23 · 1Cor 13,1-13' };
    const livro = acharLivro(b, p.livro);
    if (!livro) return { erro: `Livro "${p.livro}" não encontrado nesta Bíblia.` };
    const versos = [];
    for (const t of p.trechos) {
      if (t.c2 < t.c1 || t.c2 - t.c1 > 200) return { erro: 'Intervalo de capítulos inválido.' };
      for (let c = t.c1; c <= t.c2; c++) {
        const cap = livro.caps.find(x => x.n === c);
        if (!cap) return { erro: `${livro.nome} não tem o capítulo ${c}.` };
        const ini = c === t.c1 && t.v1 != null ? t.v1 : -Infinity;
        const fim = c === t.c2 && t.v2 != null ? t.v2 : Infinity;
        for (const v of cap.vs) if (v.n >= ini && v.n <= fim) versos.push({ c, n: v.n, t: v.t });
      }
    }
    if (!versos.length) return { erro: 'Nenhum versículo encontrado nesse intervalo.' };
    return { livro, versos, titulo: `${livro.sigla} ${p.refResto}`, tituloLongo: `${livro.nome} ${p.refResto}` };
  }

  // ---------- Busca por palavra ----------

  function buscar(b, termo, max = 200) {
    const palavras = semAc(termo.toLowerCase()).split(/\s+/).filter(Boolean);
    if (!palavras.length) return [];
    if (!b._idx) {
      b._idx = [];
      b.livros.forEach((l, li) => l.caps.forEach(c => c.vs.forEach(v => b._idx.push([li, c.n, v.n, semAc(v.t.toLowerCase()), v.t]))));
    }
    const out = [];
    for (const e of b._idx) {
      if (palavras.every(p => e[3].includes(p))) {
        out.push({ li: e[0], c: e[1], n: e[2], t: e[4] });
        if (out.length >= max) break;
      }
    }
    return out;
  }

  return { importarArquivo, parseZefania, indexar, acharLivro, parseRef, resolver, buscar, CATALOGO };
})();
