'use strict';
/*
 * Liturgia do dia: o operador abre a Liturgia Diária da Paulus, copia a página (Ctrl+A, Ctrl+C) e cola aqui.
 * O MiguelAngelus reconhece o dia, a antífona, as leituras, o salmo e a aclamação e monta o(s) roteiro(s)
 * das celebrações daquele dia (Agenda), com o modelo de Missa e, na semana, a Oração Eucarística II.
 * (O navegador não deixa o app ler o site sozinho; por isso o "copiar e colar".)
 */

const URL_PAULUS = 'https://www.paulus.com.br/portal/liturgia-diaria/';
const DIAS_PAGINA = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];

// Tira os números de versículo grudados nas palavras ("6Um dia", "“Vós") e os colchetes da forma breve
const semVersiculos = t => t
  .replace(/(^|[\s“"‘'(\[—–-])\d{1,3}(?=[A-ZÀ-Úa-zà-ú“"‘'\[])/g, '$1')
  .replace(/[\[\]]/g, '')
  .replace(/\s+/g, ' ').trim();

// Estrofes do salmo/aclamação: "/" e "†" viram quebra de verso; tira "– R." e a referência final
const estrofeLiturgia = t => t.replace(/^\d+\.\s*/, '').replace(/\s*[–-]\s*R\.\s*$/, '').replace(/\s*\([^)]*\d[^)]*\)(?=\.?\s*$)/, '')
  .replace(/\s*[\/†]\s*/g, '\n').trim();

// (1.8.5) Forma breve: a Paulus avisa "[A forma breve está entre colchetes.]" e põe entre colchetes os trechos que
// formam a breve. A completa é o texto todo (sem os colchetes); a breve, só os trechos entre colchetes.
const FIM_LEITURA = /\s*[–-]\s*Palavra (do Senhor|da Salva[çc][ãa]o)\.?\]?\s*$/i;
function textoBreve(bruto) {
  const trechos = [...bruto.matchAll(/\[([^\]]*)(?:\]|$)/g)].map(m => m[1].trim()).filter(Boolean);
  return trechos.length ? semVersiculos(trechos.join(' ').replace(FIM_LEITURA, '')) : '';
}
// "Mateus 25,14-30 ou 14-15.19-21" → completa "Mateus 25,14-30", breve "Mateus 25,14-15.19-21"
function refsDasFormas(ref) {
  const m = ref.match(/^(.*?)\s+ou\s+(.+)$/i);
  if (!m) return { completa: ref, breve: ref };
  const completa = m[1].trim(), b = m[2].trim();
  const breve = /^\D/.test(b) ? b : /,/.test(b) ? completa.replace(/\s*\d+,.*$/, '') + ' ' + b : completa.replace(/,.*$/, ',') + b;
  return { completa, breve };
}
function leituraComFormas(nome, ref, intro, bruto, temBreve, extra = {}) {
  const texto = semVersiculos(bruto.replace(FIM_LEITURA, ''));
  const refs = refsDasFormas(ref.trim());
  const tb = temBreve ? textoBreve(bruto) : '';
  return { nome, ref: tb ? refs.completa : ref.trim(), intro: intro.trim(), texto, ...extra,
    breve: tb && tb !== texto ? { ref: refs.breve, texto: tb } : null };
}

function lerLiturgiaColada(texto) {
  const linhas = texto.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  const r = { dia: null, diaSemana: null, titulo: '', cor: '', gloria: false, creio: false, antifona: '', leituras: [], salmo: null, aclamacao: null };
  // "28 – SEGUNDA-FEIRA" ou, nos domingos, "Dia 4 DOMINGO" (sem o travessão)
  let i = linhas.findIndex(l => /^(Dia\s+)?\d{1,2}\s*[–-]?\s*(DOMINGO|SEGUNDA|TER[ÇC]A|QUARTA|QUINTA|SEXTA|S[ÁA]BADO)/i.test(l));
  if (i < 0) throw new Error('Não encontrei o dia (ex.: "28 – SEGUNDA-FEIRA"). Copie a página inteira da Liturgia Diária (Ctrl+A, Ctrl+C).');
  const m = linhas[i].match(/(\d{1,2})\s*[–-]?\s*([A-Za-zÀ-ú]\S*)/);
  r.dia = +m[1];
  r.diaSemana = DIAS_PAGINA.findIndex(d => semAcento(m[2]).toUpperCase().startsWith(semAcento(d).toUpperCase()));
  r.titulo = linhas[i + 1] || '';
  let j = i + 2;
  if (/^\(.*\)$/.test(linhas[j] || '')) {
    const info = semAcento(linhas[j]);
    r.cor = (linhas[j].match(/\((\w+)/) || [])[1] || '';
    r.gloria = /gloria/.test(info); r.creio = /creio/.test(info);
    j++;
  }
  // antífona de entrada = primeiro parágrafo depois do cabeçalho (termina com a referência entre parênteses)
  if (linhas[j] && !/^(Primeira|Segunda) Leitura:|^Evangelho:|^Salmo/i.test(linhas[j])) r.antifona = linhas[j];

  const fim = l => /^(Reflex[ãa]o:|\(Dia a dia|Liturgia Di[áa]ria$|Dia \d+ [–-]|\d{1,2} [–-] (DOMINGO|SEGUNDA|TER|QUARTA|QUINTA|SEXTA|S[ÁA]BADO))/i.test(l);
  for (let k = j; k < linhas.length; k++) {
    const l = linhas[k];
    if (fim(l) && k > j + 2) break;
    let mm;
    if ((mm = l.match(/^(Primeira|Segunda) Leitura:\s*(.+)$/i))) {
      let corpo = linhas[k + 1] || '', temBreve = false;
      if (/^\[A forma breve/i.test(corpo)) { corpo = linhas[k + 2] || ''; temBreve = true; }
      const [intro, ...resto] = corpo.split(/\s+[–-]\s+/);
      r.leituras.push(leituraComFormas(/primeira/i.test(mm[1]) ? 'Primeira Leitura' : 'Segunda Leitura', mm[2], intro, resto.join(' – '), temBreve));
    } else if ((mm = l.match(/^Salmo Responsorial:\s*(.+)$/i))) {
      const refrao = linhas[k + 1] || '';
      const estrofes = [];
      for (let q = k + 2; q < linhas.length && /^\d+\./.test(linhas[q]); q++) estrofes.push(estrofeLiturgia(linhas[q]));
      r.salmo = { ref: 'Sl ' + mm[1].trim(), refrao: refrao.replace(/\s*[\/†]\s*/g, '\n'), estrofes };
    } else if ((mm = l.match(/^Evangelho:\s*(.+)$/i))) {
      let q = k + 1, temBreve = false;
      if (/^\[A forma breve/i.test(linhas[q] || '')) { temBreve = true; q++; }     // não é o refrão da aclamação
      if (/^aleluia/i.test(linhas[q] || '') || !/Proclama[çc][ãa]o/i.test(linhas[q] || '')) {
        const refrao = linhas[q] || '';
        const verso = linhas[q + 1] && !/Proclama[çc][ãa]o/i.test(linhas[q + 1]) ? linhas[q + 1] : '';
        r.aclamacao = { refrao, verso: estrofeLiturgia(verso) };
        q += verso ? 2 : 1;
      }
      const corpo = linhas.slice(q).find(x => /Proclama[çc][ãa]o do Evangelho/i.test(x)) || '';
      const [intro, ...resto] = corpo.split(/\s+[–-]\s+/);
      r.leituras.push(leituraComFormas('Evangelho', mm[1], intro, resto.join(' – '), temBreve, { evangelho: true }));
    }
  }
  if (!r.leituras.length) throw new Error('Não encontrei as leituras na página colada.');
  return r;
}

// Data a partir de "28 – SEGUNDA-FEIRA": o dia 28 mais perto de hoje que cai numa segunda
function dataDaLiturgia(r) {
  const hoje = new Date();
  const candidatas = [-1, 0, 1].map(k => new Date(hoje.getFullYear(), hoje.getMonth() + k, r.dia))
    .filter(d => d.getDate() === r.dia && (r.diaSemana < 0 || d.getDay() === r.diaSemana));
  candidatas.sort((a, b) => Math.abs(a - hoje) - Math.abs(b - hoje));
  return candidatas[0] || new Date(hoje.getFullYear(), hoje.getMonth(), r.dia);
}

// ---------- (1.8.10, ideia do Luciano) Orações do dia de uma API pública ----------
// As leituras continuam vindo da Paulus; desta API vêm a Coleta, a Oração sobre as Oferendas, a Oração depois da
// Comunhão e as antífonas (a de entrada só se a Paulus não trouxer). Buscado na hora, nada fica guardado no programa.
// Crédito (na tela da Liturgia do dia, nas Novidades e no README): API Liturgia Diária, de Dancrf —
// https://github.com/Dancrf/liturgia-diaria (endereço da API: liturgia.up.railway.app/v2/).
const URL_LIT_API = 'https://liturgia.up.railway.app/v2/';
const NOME_FONTE = { paulus: 'Paulus', api: 'API Liturgia Diária (Dancrf)' };
const tLimpo = s => String(s || '').replace(/\s+/g, ' ').trim();

// O dia inteiro da API (uma busca por data; fica guardado enquanto o programa está aberto)
function buscarApiDia(d) {
  const iso = isoData(d);
  LitDia.api ||= {};
  return LitDia.api[iso] ||= (async () => {
    const url = `${URL_LIT_API}?dia=${d.getDate()}&mes=${d.getMonth() + 1}&ano=${d.getFullYear()}`;
    let txt;
    try { txt = NO_APP ? (await httpApp(url)).texto : await (await fetch(url)).text(); }
    catch (e) { throw new Error(/404/.test(e.message) ? 'a API não tem a liturgia desse dia' : e.message); }
    let j;
    try { j = JSON.parse(txt); } catch { throw new Error('resposta em formato inesperado'); }
    if (j.erro) throw new Error(j.erro);
    if (deDataBR(j.data) !== iso) throw new Error('veio a liturgia de outro dia');
    return j;
  })().catch(e => { delete LitDia.api[iso]; throw e; });
}

// (1.8.10) Leituras pela API, no mesmo formato da leitura da Paulus (lerLiturgiaColada). A API não traz a aclamação
// ao Evangelho nem as marcas de Glória/Creio: Glória nas festas, nas solenidades e nos domingos fora do Advento e da
// Quaresma (cor roxa); Creio aos domingos e nas solenidades.
function lerLiturgiaApi(j, d) {
  const L = j.leituras || {}, nome = tLimpo(j.liturgia), cor = tLimpo(j.cor).toLowerCase(), dom = d.getDay() === 0;
  const r = { dia: d.getDate(), diaSemana: d.getDay(), titulo: nome, cor, fonte: 'api',
    gloria: /\b(festa|solenidade)\b/i.test(nome) || (dom && !/roxo|rosa/.test(cor) && !/advento|quaresma/i.test(nome)),
    creio: dom || /\bsolenidade\b/i.test(nome),
    antifona: tLimpo(j.antifonas?.entrada), leituras: [], salmo: null, aclamacao: null };
  const ler = (lista, nomeL, extra) => {
    const x = (lista || [])[0];
    if (!x?.texto) return;
    const bruto = tLimpo(x.texto);
    r.leituras.push(leituraComFormas(nomeL, tLimpo(x.referencia), tLimpo(x.titulo), bruto, bruto.includes('['), extra));
  };
  ler(L.primeiraLeitura, 'Primeira Leitura');
  ler(L.segundaLeitura, 'Segunda Leitura');
  ler(L.evangelho, 'Evangelho', { evangelho: true });
  const s = (L.salmo || [])[0];
  if (s?.texto) r.salmo = { ref: tLimpo(s.referencia).replace(/^Sl\s*/, 'Sl '), refrao: tLimpo(s.refrao),
    estrofes: String(s.texto).split(/\n+/).map(e => e.replace(/^\s*[–-]\s*/, '').trim()).filter(Boolean) };
  if (!r.leituras.length) throw new Error('a API não trouxe as leituras desse dia');
  return r;
}

async function buscarOracoesDoDia(d) {
  const j = await buscarApiDia(d);
  const o = j.oracoes || {}, a = j.antifonas || {}, t = tLimpo;
  const r = { coleta: t(o.coleta), oferendas: t(o.oferendas), depois: t(o.comunhao), antEntrada: t(a.entrada), antComunhao: t(a.comunhao) };
  if (!r.coleta && !r.oferendas && !r.depois) throw new Error('não há orações para esse dia');
  return r;
}

// "… vosso serviço. Por nosso Senhor Jesus Cristo…" → "P. … vosso serviço.\nPor nosso Senhor Jesus Cristo…\nT. Amém."
function textoOracao(t) {
  const fins = [...t.matchAll(/\s(Por nosso Senhor|Por Cristo|Vós que viveis|Que vive|Ele que vive|Que viveis)\b/g)];
  const k = fins.length ? fins[fins.length - 1].index : -1;
  const corpo = k > 0 ? t.slice(0, k).trim() : t, fim = k > 0 ? t.slice(k).trim() : '';
  return `P. ${corpo}${fim ? '\n' + fim : ''}\nT. Amém.`;
}
// a referência do fim da antífona vai para o título, como nas antífonas do folheto
function itemAntifona(titulo, t) {
  const m = t.match(/\s*\(([^()]*\d[^()]*)\)\s*\.?\s*$/);
  return { id: uid(), tipo: 'texto', antifona: true, titulo: m ? `${titulo} (${m[1].trim()})` : titulo, texto: m ? t.slice(0, m.index).trim() : t };
}
const itemOracao = (titulo, t) => ({ id: uid(), tipo: 'texto', titulo, texto: textoOracao(t) });

function comOracoesDoDia(itens, ora, temAntEntrada) {
  if (!ora) return itens;
  const achar = f => itens.findIndex(f);
  if (!temAntEntrada && ora.antEntrada) {
    const e = achar(i => i.momento === 'Entrada');
    itens.splice(e + 1, 0, itemAntifona('Antífona de Entrada', ora.antEntrada));
  }
  if (ora.coleta) {
    const c = achar(i => i.tipo === 'ordinario' && i.parte === 'coleta');
    const item = itemOracao('Oração da Coleta', ora.coleta);
    if (c >= 0) itens[c] = item;
    else {
      const g = achar(i => i.momento === 'Glória'), k = achar(i => i.parte === 'kyrie');
      itens.splice((g >= 0 ? g : k) + 1, 0, item);
    }
  }
  if (ora.oferendas) {
    const o = achar(i => i.parte === 'orai-irmaos'), p = achar(i => i.parte === 'prefacio');
    itens.splice(o >= 0 ? o + 1 : p >= 0 ? p : itens.length, 0, itemOracao('Oração sobre as Oferendas', ora.oferendas));
  }
  if (ora.antComunhao) {
    const c = achar(i => i.momento === 'Comunhão');
    if (c >= 0) itens.splice(c + 1, 0, itemAntifona('Antífona da Comunhão', ora.antComunhao));
  }
  if (ora.depois) {
    const b = achar(i => i.parte === 'bencao-final');
    itens.splice(b >= 0 ? b : itens.length, 0, itemOracao('Oração depois da Comunhão', ora.depois));
  }
  return itens;
}

// Itens do roteiro montados com os textos da liturgia
function itensDaLiturgia(r, domingo, comOE2, ora) {
  const itens = Ordinario.modelos[domingo ? 'dominical' : 'semanal'].map(x => ({ id: uid(), ...structuredClone(x) }));
  const achar = f => itens.findIndex(f);
  // Glória e Creio conforme a página (ex.: festas na semana)
  if (!domingo && r.gloria && achar(i => i.momento === 'Glória') < 0) itens.splice(achar(i => i.parte === 'kyrie') + 1, 0, { id: uid(), tipo: 'canto', momento: 'Glória', cantoId: '' });
  if (domingo && !r.creio) { const c = achar(i => i.parte === 'creio-niceno'); if (c >= 0) itens.splice(c, 1); }
  // (1.8.10) domingos do Advento e da Quaresma: sem Glória (a Paulus não marca "glória" neles)
  if (domingo && !r.gloria) { const g = achar(i => i.momento === 'Glória'); if (g >= 0) itens.splice(g, 1); }

  // antífona de entrada logo depois do canto de entrada
  if (r.antifona) itens.splice(achar(i => i.momento === 'Entrada') + 1, 0,
    { id: uid(), tipo: 'texto', titulo: 'Antífona de Entrada', texto: r.antifona });

  // leituras: troca os espaços do modelo pelo texto da liturgia
  const slotLeitura = nome => achar(i => i.tipo === 'leitura' && (nome === 'Evangelho' ? i.evangelho : i.titulo?.startsWith(nome === 'Primeira Leitura' ? '1ª' : '2ª')));
  for (const l of r.leituras) {
    // quem fala, como nas partes fixas (1.6.14): L. leitor, P. padre, T. povo
    const fechamento = l.evangelho ? 'P. Palavra da Salvação.\nT. Glória a vós, Senhor.' : 'L. Palavra do Senhor.\nT. Graças a Deus.';
    const abertura = l.evangelho ? `P. O Senhor esteja convosco.\nT. Ele está no meio de nós.\n\nP. ${l.intro}.\nT. Glória a vós, Senhor.` : 'L. ' + l.intro + '.';
    const item = { id: uid(), tipo: 'texto', titulo: `${l.nome} (${l.ref})`, texto: `${abertura}\n\n${l.texto}\n\n${fechamento}` };
    // (1.8.5) com forma breve: entra a completa; a chave "Forma breve" no cabeçalho troca (app.js trocarForma)
    if (l.breve) {
      item.formas = { completa: { titulo: item.titulo, texto: item.texto },
        breve: { titulo: `${l.nome} (${l.breve.ref})`, texto: `${abertura}\n\n${l.breve.texto}\n\n${fechamento}` } };
      item.breve = false;
    }
    const s = slotLeitura(l.nome);
    if (s >= 0) itens[s] = item; else itens.splice(achar(i => i.tipo === 'salmo') + (l.nome === 'Primeira Leitura' ? 0 : 1), 0, item);
  }
  if (!r.leituras.some(l => l.nome === 'Segunda Leitura')) { const s = slotLeitura('Segunda Leitura'); if (s >= 0) itens.splice(s, 1); }

  if (r.salmo) {
    const s = achar(i => i.tipo === 'salmo');
    const item = { id: uid(), tipo: 'salmo', titulo: 'Salmo Responsorial', ref: r.salmo.ref, refrao: r.salmo.refrao, texto: r.salmo.estrofes.join('\n\n') };
    if (s >= 0) itens[s] = item; else itens.splice(achar(i => i.evangelho) , 0, item);
  }
  if (r.aclamacao?.refrao) {
    const s = achar(i => i.momento === 'Aclamação ao Evangelho');
    // item de canto "rezado" (app.js aclamacaoRezada): dá para trocar por um canto de aclamação
    const item = aclamacaoRezada({ refrao: r.aclamacao.refrao, texto: r.aclamacao.verso });
    if (s >= 0) itens[s] = item;
  }
  if (comOE2) inserirEucaristia(itens, 'oe2', 'p-oe2');
  return comOracoesDoDia(itens, ora, !!r.antifona);
}

// ---------- Diálogo ----------

const LitDia = { lida: null, data: null };

// ---------- Busca automática na Paulus (só no aplicativo) ----------
// Cada dia tem uma página; elas se ligam pelos links "dia anterior / próximo dia".
// Começa na página principal (o dia de hoje no site) e anda pelos links até o dia pedido.

// Texto de um trecho de HTML como ficaria ao copiar da página (parágrafos e quebras viram linhas)
function htmlParaTexto(el) {
  const c = el.cloneNode(true);
  c.querySelectorAll('br').forEach(b => b.replaceWith('\n'));
  c.querySelectorAll('p, div, h1, h2, h3, h4, li').forEach(b => b.append('\n'));
  return c.textContent.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();
}

function lerPaginaPaulus(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const titulo = (doc.querySelector('.titulo-liturgia')?.textContent || '').replace(/\s+/g, ' ').trim();
  const corpo = doc.querySelector('#texto');
  const md = titulo.match(/(\d{1,2})\s*[–-]?\s*([A-Za-zÀ-ú-]+)/);
  if (!md || !corpo) throw new Error('a página da Paulus mudou de formato');
  const links = [...doc.querySelectorAll('a[href*="/portal/liturgia-diaria/"]')]
    .map(a => ({ url: a.href, rot: a.textContent.replace(/\s+/g, ' ').trim() }))
    .filter(l => !/\/page\/|liturgia-diaria-das-horas/.test(l.url) && /^(Dia\s+)?\d{1,2}\b/i.test(l.rot))
    .map(l => ({ url: l.url, dia: +l.rot.match(/\d{1,2}/)[0] }));
  // cabeçalho no formato que o leitor conhece ("4 – DOMINGO") + o texto da liturgia
  return { dia: +md[1], links, texto: `${md[1]} – ${md[2].toUpperCase()}\n${htmlParaTexto(corpo)}` };
}

// data com esse dia do mês mais perto da data pedida
function dataDoDia(dia, perto) {
  for (let k = 0; k <= 20; k++) for (const s of [k, -k]) {
    const d = new Date(perto.getFullYear(), perto.getMonth(), perto.getDate() + s);
    if (d.getDate() === dia) return d;
  }
  return null;
}

async function buscarPaulus(alvo) {
  let url = URL_PAULUS;
  const vistos = new Set();
  // (1.8.10) A página principal é o dia de hoje no site: a data dela se acha perto de HOJE (não da data pedida),
  // senão um 20/12 pedido em novembro "achava" o 20/11. As seguintes ficam a um dia da anterior.
  let perto = new Date();
  for (let passo = 0; passo < 12; passo++) {
    if (vistos.has(url)) break;
    vistos.add(url);
    const pg = lerPaginaPaulus((await httpApp(url)).texto);
    const dataPg = dataDoDia(pg.dia, perto);
    if (!dataPg) throw new Error('não reconheci o dia na página da Paulus');
    if (isoData(dataPg) === isoData(alvo)) return pg.texto;
    const vizinho = new Date(dataPg.getFullYear(), dataPg.getMonth(), dataPg.getDate() + (dataPg < alvo ? 1 : -1));
    const link = pg.links.find(l => l.dia === vizinho.getDate());
    if (!link) throw new Error(dataPg < alvo
      ? `a Paulus ainda não publicou a liturgia desse dia (o mais adiantado é ${dataCurta(dataPg)})`
      : `esse dia já saiu do site da Paulus (o mais antigo é ${dataCurta(dataPg)})`);
    url = link.url;
    perto = vizinho;
  }
  throw new Error(alvo > new Date() ? 'a Paulus ainda não publicou a liturgia desse dia' : 'esse dia já saiu do site da Paulus');
}

// (1.8.10) Fonte principal das leituras escolhida nos Ajustes (Paulus, padrão; ou a API). Se a principal falhar,
// tenta a outra (reserva) e avisa de onde vieram as leituras.
async function lerDaFonte(fonte, d) {
  if (fonte === 'api') return lerLiturgiaApi(await buscarApiDia(d), d);
  const texto = await buscarPaulus(d);
  const r = lerLiturgiaColada(texto);
  r.fonte = 'paulus';
  return { r, texto };
}

async function buscarLiturgiaAutomatica() {
  const v = $('#litBuscaData').value;
  if (!v) return;
  const d = deIso(v);
  const b = $('#btnBuscarPaulus');
  const principal = S.config.fonteLeituras === 'api' ? 'api' : 'paulus', reserva = principal === 'api' ? 'paulus' : 'api';
  b.disabled = true; b.textContent = 'Buscando…';
  const aviso = t => { $('#litResumo').innerHTML = `<span class="sutil">${esc(t)}</span>`; };
  let res = null, fonte = principal, falha = '';
  try {
    aviso(`Buscando as leituras (${NOME_FONTE[principal]})…`);
    try { res = await lerDaFonte(principal, d); }
    catch (e) {
      falha = `${NOME_FONTE[principal]}: ${e.message}`;
      aviso(`${falha}. Tentando a reserva (${NOME_FONTE[reserva]})…`);
      fonte = reserva;
      try { res = await lerDaFonte(reserva, d); }
      catch (e2) { throw new Error(`${falha}; ${NOME_FONTE[reserva]}: ${e2.message}`); }
    }
    const r = res.r || res;
    $('#litTexto').value = res.texto || '';
    LitDia.lida = r;
    $('#litData').value = v;
    renderLiturgiaReconhecida();
    const li = document.createElement('li');
    li.className = fonte === principal ? 'sutil' : 'status';
    li.textContent = fonte === principal ? `Leituras: ${NOME_FONTE[fonte]}`
      : `Leituras: ${NOME_FONTE[fonte]} (reserva — ${falha})`;
    if (fonte === 'api') li.textContent += '. A API não traz a aclamação ao Evangelho: confira no roteiro.';
    $('#litResumo .lit-lista')?.prepend(li);
  } catch (e) {
    $('#litResumo').innerHTML = `<span class="status erro">Não deu para buscar: ${esc(e.message)}. Dá para copiar e colar a página da Paulus, como antes.</span>`;
  } finally { b.disabled = false; b.textContent = '🌐 Buscar a liturgia'; }
}

function abrirLiturgiaDoDia() {
  $('#litBuscaData').value = isoData(new Date());
  $('#litAuto').hidden = !NO_APP;
  LitDia.lida = null;
  $('#litTexto').value = '';
  $('#litResumo').innerHTML = '<span class="sutil">Cole a página acima para ver o que foi reconhecido.</span>';
  $('#litCelebracoes').innerHTML = '';
  $('#btnLitMontar').disabled = true;
  const dlg = $('#dlgLiturgia');
  dlg.returnValue = '';
  dlg.showModal();
}

function processarColagem() {
  const txt = $('#litTexto').value;
  if (!txt.trim()) return;
  try {
    const r = lerLiturgiaColada(txt);
    LitDia.lida = r;
    const d = dataDaLiturgia(r);
    $('#litData').value = isoData(d);
    renderLiturgiaReconhecida();
  } catch (err) {
    LitDia.lida = null;
    $('#litResumo').innerHTML = `<span class="status erro">${esc(err.message)}</span>`;
    $('#litCelebracoes').innerHTML = '';
    $('#btnLitMontar').disabled = true;
  }
}

function renderLiturgiaReconhecida() {
  const r = LitDia.lida;
  if (!r) return;
  const d = deIso($('#litData').value);
  const domingo = d.getDay() === 0;
  $('#litOE2').checked = !domingo;
  $('#litResumo').innerHTML = `
    <div><b>${esc(r.titulo)}</b> <span class="sutil">· ${esc(r.cor)}${r.gloria ? ' · Glória' : ''}${r.creio ? ' · Creio' : ''}</span></div>
    <ul class="lit-lista">
      ${r.antifona ? '<li>✓ Antífona de entrada</li>' : ''}
      ${r.leituras.map(l => `<li>✓ ${esc(l.nome)}: ${esc(l.ref)}${l.breve ? ` <span class="sutil">(forma breve: ${esc(l.breve.ref)} — escolha na hora)</span>` : ''}</li>`).join('')}
      ${r.salmo ? `<li>✓ Salmo ${esc(r.salmo.ref.replace(/^Sl /, ''))} (refrão + ${r.salmo.estrofes.length} estrofes)</li>` : ''}
      ${r.aclamacao ? '<li>✓ Aclamação ao Evangelho</li>' : ''}
      <li id="litOraStatus" class="sutil">Orações do dia: buscando…</li>
    </ul>`;
  pedirOracoesDoDia(d);
  const ocs = ocorrencias(d).filter(o => !o.cancelada);
  $('#litCelebracoes').innerHTML = ocs.length
    ? ocs.map((o, i) => {
        const existe = roteiroDaCelebracao(o), loc = localDe(o.localId);
        return `<label class="dist-item"><input type="checkbox" data-i="${i}" ${ehMissa(o.tipo) && !existe ? 'checked' : ''}>
          <span class="dist-quando">${o.hora}</span>${loc ? `<span class="card-ponto" style="background:${loc.cor}"></span>` : ''}
          <span class="dist-txt">${esc(o.texto)}</span>${existe ? '<span class="dist-existe">já tem roteiro — marque para refazer</span>' : ''}</label>`;
      }).join('')
    : '<p class="sutil">Nenhuma celebração na Agenda neste dia: será criado um roteiro avulso.</p>';
  LitDia.ocs = ocs;
  $('#btnLitMontar').disabled = false;
}

// Orações do dia da data escolhida (uma busca por data; a resposta fica guardada enquanto o programa está aberto)
function pedirOracoesDoDia(d) {
  const iso = isoData(d);
  LitDia.oracoes ||= {};
  const p = LitDia.oracoes[iso] ||= buscarOracoesDoDia(d).catch(e => { delete LitDia.oracoes[iso]; throw e; });
  p.then(o => {
    const el = $('#litOraStatus');
    if (!el || $('#litData').value !== iso) return;
    el.className = '';
    el.textContent = '✓ Orações do dia (API Liturgia Diária, de Dancrf): ' + [o.coleta && 'Coleta', o.oferendas && 'sobre as Oferendas', o.depois && 'depois da Comunhão',
      o.antComunhao && 'Antífona da Comunhão'].filter(Boolean).join(', ');
  }, e => {
    const el = $('#litOraStatus');
    if (!el || $('#litData').value !== iso) return;
    el.className = 'sutil';
    el.textContent = `Orações do dia: não deu para buscar (${e.message}). O roteiro sai com a Coleta padrão.`;
  });
  return p;
}

async function montarRoteirosDaLiturgia() {
  const r = LitDia.lida;
  const d = deIso($('#litData').value);
  const domingo = d.getDay() === 0;
  const comOE2 = $('#litOE2').checked;
  let ora = null;
  try { ora = await pedirOracoesDoDia(d); } catch { /* sem as orações do dia: fica a Coleta padrão */ }
  const marcadas = $$('#litCelebracoes input:checked').map(el => LitDia.ocs[+el.dataset.i]);
  let primeiro = null, n = 0;
  if (!LitDia.ocs.length) {
    const rot = novoRoteiro(`${DIAS_CURTOS[d.getDay()]} ${dataCurta(d)} — ${cap1(r.titulo)}`);
    rot.data = isoData(d);
    rot.itens = itensDaLiturgia(r, domingo, comOE2, ora);
    marcarLiturgia(rot, r);
    S.roteiros.push(rot); await DB.salvar('roteiros', rot);
    primeiro = rot; n = 1;
  }
  for (const o of marcadas) {
    const itens = itensDaLiturgia(r, domingo, comOE2, ora);
    let rot = roteiroDaCelebracao(o);
    if (rot) { rot.itens = itens; rot.atualizado = Date.now(); }
    else rot = await criarRoteiroDaCelebracao(o, itens);
    marcarLiturgia(rot, r);
    await DB.salvar('roteiros', rot);
    primeiro ||= rot; n++;
  }
  if (primeiro) { trocarRoteiro(primeiro); mostrarAba('roteiros'); }
  const faltaOE = comOE2 && (!temTexto('oe2') || !temTexto('p-oe2'));
  toast(`${n} roteiro(s) montado(s) com a liturgia de ${dataCurta(d)}.` + (faltaOE ? ' Cadastre o texto da Oração Eucarística II no catálogo (✝).' : ''));
}

// Título em CAIXA ALTA (Paulus) vira "Só a primeira maiúscula"; o da API já vem escrito normalmente
const cap1 = s => s && s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s;

// Nome e cor da celebração vindos da Paulus ("ASSUNÇÃO…", "(branco, glória, creio)") vão para o card do roteiro
function marcarLiturgia(rot, r) {
  rot.liturgiaDe = rot.data || infoRoteiro(rot).iso;
  rot.tituloLiturgico = r.titulo ? cap1(r.titulo) : '';
  const cor = semAcento(r.cor || '');
  rot.cor = Liturgia.CORES[cor] ? cor : '';
}

function ligarLiturgiaDoDia() {
  $('#btnLiturgiaDia').addEventListener('click', abrirLiturgiaDoDia);
  $('#btnAbrirPaulus').addEventListener('click', () => window.open(URL_PAULUS, '_blank'));
  $('#btnBuscarPaulus').addEventListener('click', buscarLiturgiaAutomatica);
  $('#litTexto').addEventListener('input', processarColagem);
  $('#litData').addEventListener('change', renderLiturgiaReconhecida);
  $('#formLiturgia').addEventListener('submit', e => { if (e.submitter?.value === 'montar') montarRoteirosDaLiturgia(); });
}
