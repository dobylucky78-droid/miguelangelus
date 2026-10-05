'use strict';
/*
 * Cantos favoritos e cifras.
 *  - ⭐ Favorito: os cantos que a paróquia usa. Na aba Cantos abre a visão "Favoritos" (o acervo grande fica como consulta),
 *    e na escolha do canto do roteiro os favoritos vêm primeiro.
 *  - 🎸 Cifra: texto com os acordes em cima da letra (como no Cifra Club / nos cadernos dos músicos), guardado no canto.
 *    Vai para o app dos músicos (celular/tablet), que acompanha o telão e transpõe o tom.
 *  - Importar / Exportar cantos (.json): levar favoritos e cifras para outro computador ou paróquia. As cifras NÃO vão
 *    para o código público nem para o instalador: ficam só nos dados de cada paróquia.
 * Usa S, DB, esc, semAcento, uid, toast, organizarColado, aposMudarCantos… (em tempo de execução).
 */

// ---------- acordes ----------
// Acorde: "G", "F#m7", "A7(4/9)", "G#m7(5-)", "D7M(6/9)", "F7+", "Bbmaj7", "A#m11", "G#°", "Bm7/A"…
const RX_ACORDE = /^[A-G][#b]?(?:m|M|maj|min|sus|dim|aug|add|°|º|\+)?\d*(?:M|\+|°|º|maj\d*)?(?:\([^)]*\))?(?:[+\-]\d+)?(?:\/[A-G][#b]?\d*)?$/;
const ehLinhaDeAcordes = l => {
  // parênteses em volta da linha inteira ("( Bm7  F#m7  G7M )") saem; os do acorde ("G#m7(5-)") ficam
  let s = l.trim();
  if (/^\(.*\)$/.test(s)) s = s.slice(1, -1);
  s = s.replace(/\|/g, ' ');
  const p = s.split(/\s+/).filter(Boolean);
  return p.length > 0 && p.every(x => RX_ACORDE.test(x) || /^[-–.x:|]+$/i.test(x) || /^\(?[A-G][^\s]*\)?$/.test(x) && RX_ACORDE.test(x.replace(/^\(|\)$/g, '')));
};
const ehLinhaDeTab = l => /^\s*[EBGDAe]\|/.test(l);
const NOTAS_S = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTAS_B = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const IDX_NOTA = n => { const i = NOTAS_S.indexOf(n); return i >= 0 ? i : NOTAS_B.indexOf(n); };
function transporNota(n, passos, bemol) {
  const i = IDX_NOTA(n);
  if (i < 0) return n;
  return (bemol ? NOTAS_B : NOTAS_S)[((i + passos) % 12 + 12) % 12];
}
// Transpõe um acorde inteiro ("F#m7(9)/C#" + 2 → "G#m7(9)/D#"), mantendo o resto
function transporAcorde(a, passos) {
  if (!passos) return a;
  const bemol = /^[A-G]b/.test(a);
  return a.replace(/^([A-G][#b]?)/, n => transporNota(n, passos, bemol)).replace(/\/([A-G][#b]?)/, (_, n) => '/' + transporNota(n, passos, bemol));
}
// Linha de acordes transposta, sem desalinhar as colunas (cada acorde fica na mesma posição)
function transporLinha(l, passos) {
  if (!passos) return l;
  let out = '', falta = 0;
  for (const m of l.matchAll(/(\S+)|(\s+)/g)) {
    if (m[2]) { const n = Math.max(1, m[2].length - falta); out += ' '.repeat(n); falta = Math.max(0, falta - m[2].length + 1); continue; }
    const t = m[1].replace(/[()]/g, '');
    const novo = RX_ACORDE.test(t) ? m[1].replace(t, transporAcorde(t, passos)) : m[1];
    falta += novo.length - m[1].length;
    out += novo;
  }
  return out;
}

// Sílaba esticada na cifra: "San---to" → "Santo", "San--an--to" → "Santo", "louva__mos" → "louvamos"
// "Amé___em" → "Amém" (vogal esticada), "pie___da__de" → "piedade"
function juntarSilabas(palavra) {
  const p = palavra.split(/-{2,}|_+/);
  if (p.length < 2) return palavra;
  const base = ch => (ch || '').normalize('NFD')[0]?.toLowerCase() || '';
  let r = p[0];
  for (const s of p.slice(1)) {
    if (r.toLowerCase().endsWith(s.toLowerCase()) && !/[^\p{L}]/u.test(s)) continue;           // "San--an--to"
    if (/[aeiou]/.test(base(s[0])) && base(r.slice(-1)) === base(s[0])) r += s.slice(1);       // "Amé" + "em"
    else r += s;
  }
  return r;
}

// Letra (refrão + estrofes) a partir da cifra: tira acordes, tablaturas e marcações ([Intro], [Refrão]…)
function letraDaCifra(cifra) {
  const linhas = [];
  let aposAcorde = false;
  // "[Refrão]" que aparece 2+ vezes marca o refrão de verdade (o trecho que volta). Uma vez só (ex.: Glória com "[Refrão]"
  // em "Só vós sois o Santo") é só o nome de uma parte.
  const RX_REF = /^\s*\[(refr[aã]o|coro)[^\]]*\]/i;
  const texto = (cifra || '').replace(/\r/g, '');
  const usarRefrao = (texto.match(/^\s*\[(refr[aã]o|coro)[^\]]*\]/gim) || []).length >= 2;
  let noRefrao = false, marcar = false;
  for (let l of texto.split('\n')) {
    if (usarRefrao && RX_REF.test(l)) { linhas.push(''); noRefrao = marcar = true; aposAcorde = false; continue; }
    if (ehLinhaDeTab(l) || /^\s*\[[^\]]*\]/.test(l)) { if (/^\s*\[/.test(l)) { linhas.push(''); noRefrao = marcar = false; } aposAcorde = false; continue; }
    if (ehLinhaDeAcordes(l)) { aposAcorde = true; continue; }
    if (/^\s*parte \d+ de \d+\s*$/i.test(l)) continue;         // rótulo das tablaturas do site ("Parte 2 de 5")
    if (noRefrao && !l.trim()) continue;                   // o refrão inteiro num bloco só (até a próxima parte)
    if (marcar && l.trim()) { l = 'Refrão: ' + l.trim(); marcar = false; }
    l = l.replace(/\(\s*[A-G][^)]*\)/g, '').replace(/\S*(?:-{2,}|_+)\S*/g, juntarSilabas)
      .replace(/(\p{L})\1{2,}/gu, '$1')                     // "Saaanto" → "Santo"
      .replace(/\s{2,}/g, ' ').trim();
    // pedaço que sobrou da linha de cima ("…toda a paz, sua" / acorde / "paz"): volta para a linha anterior
    const ant = linhas.length - 1;
    if (aposAcorde && l && /^\p{Ll}/u.test(l) && l.split(' ').length <= 2 && ant >= 0 && linhas[ant] && /\p{Ll}$/u.test(linhas[ant])) linhas[ant] += ' ' + l;
    else linhas.push(l);
    aposAcorde = false;
  }
  const o = organizarColado(linhas.join('\n').replace(/\n{3,}/g, '\n\n'));
  // "[Refrão Final]" = o refrão de novo (às vezes com um verso a mais): o telão já repete o refrão depois de cada estrofe
  if (o.refrao) {
    const p1 = t => semAcento(t.split('\n')[0]).replace(/[^a-z ]+/g, '').trim();
    o.letra = o.letra.split(/\n\s*\n/).filter(b => p1(b) !== p1(o.refrao)).join('\n\n');
  }
  return o;
}

// Ficha curta do canto para as listas: "Comunidade Shalom · CD Na Dança da Vida"
const fichaCanto = c => [c?.autor, c?.cd ? 'CD ' + c.cd : ''].filter(Boolean).join(' · ');

// ---------- favoritos ----------
async function alternarFavorito(id) {
  const c = S.cantos.find(x => x.id === id);
  if (!c) return;
  c.favorito = !c.favorito;
  await DB.salvar('cantos', c);
  aposMudarCantos();
  toast(c.favorito ? `⭐ "${c.titulo}" nos favoritos` : `"${c.titulo}" saiu dos favoritos`);
}
const temFavoritos = () => S.cantos.some(c => c.favorito);
// No item "canto" do roteiro: a lista de escolha mostra só os favoritos? (este computador lembra; liga sozinho quando há favoritos)
function soFavoritosNoRoteiro() {
  if (!temFavoritos()) return false;
  let v = null;
  try { v = localStorage.getItem('lumen.soFavoritos'); } catch {}
  return v !== '0';
}
function visaoCantos() {
  let v = '';
  try { v = localStorage.getItem('lumen.cantosVisao') || ''; } catch {}
  return v === 'acervo' || !temFavoritos() ? 'acervo' : 'favoritos';
}

// ---------- cifra de um item do roteiro (para os músicos) ----------
function trigramasLetra(t) {
  const p = semAcento(t || '').replace(/[^a-z ]+/g, ' ').split(/\s+/).filter(Boolean);
  const s = new Set();
  for (let i = 0; i + 2 < p.length; i++) s.add(p[i] + ' ' + p[i + 1] + ' ' + p[i + 2]);
  return s;
}
const Cifras = { cache: null };
function favoritosComCifra() {
  const chave = S.cantos.length + '|' + S.cantos.filter(c => c.cifra).map(c => c.id + ':' + c.cifra.length + (c.favorito ? '*' : '')).join();
  if (Cifras.cache?.chave !== chave)
    Cifras.cache = { chave, lista: S.cantos.filter(c => c.cifra).map(c => ({ c, tri: trigramasLetra(`${c.refrao || ''} ${c.letra || ''}`) })) };
  return Cifras.cache.lista;
}
// 1) cifra escolhida à mão no item; 2) a do próprio canto; 3) um canto com cifra de letra parecida (mesmo momento)
function cifraDoItem(it) {
  if (it.tipo !== 'canto') return null;
  if (it.cifraDe) { const f = S.cantos.find(x => x.id === it.cifraDe); if (f?.cifra) return f; }
  const c = S.cantos.find(x => x.id === it.cantoId);
  if (!c) return null;
  if (c.cifra) return c;
  const tri = trigramasLetra(`${c.refrao || ''} ${c.letra || ''}`);
  if (tri.size < 4) return null;
  let melhor = null, nota = 0;
  for (const f of favoritosComCifra()) {
    if ((f.c.momento || 'Outros') !== (c.momento || 'Outros')) continue;
    let comum = 0;
    for (const t of tri) if (f.tri.has(t)) comum++;
    const j = comum / (tri.size + f.tri.size - comum);
    if (j > nota) { nota = j; melhor = f.c; }
  }
  return nota >= 0.5 ? melhor : null;
}

// No item "canto" do roteiro: qual cifra vai para os músicos (automática = a do canto ou a de um canto de letra parecida)
function htmlEscolhaCifra(it, c) {
  const comCifra = S.cantos.filter(x => x.cifra);
  if (!comCifra.length || !c) return '';
  const achada = cifraDoItem({ ...it, cifraDe: '' });
  const mesmo = comCifra.filter(x => (x.momento || 'Outros') === (it.momento || 'Outros')).sort(porTitulo);
  const outros = comCifra.filter(x => !mesmo.includes(x)).sort(porTitulo);
  const op = x => `<option value="${x.id}" ${x.id === it.cifraDe ? 'selected' : ''}>${esc(x.titulo)}${x.tom ? ` (${esc(x.tom)})` : ''}</option>`;
  return `<div class="cab-linha cab-cifra"><span class="sutil pequeno">🎸 Cifra para os músicos</span>
    <select data-campo="cifraDe" class="estreito" style="max-width:340px">
      <option value="">Automática${achada ? ` — ${esc(achada.titulo)}${achada.tom ? ` (${esc(achada.tom)})` : ''}` : ' — nenhuma encontrada'}</option>
      ${mesmo.length ? `<optgroup label="${esc(it.momento || 'Outros')}">${mesmo.map(op).join('')}</optgroup>` : ''}
      ${outros.length ? `<optgroup label="Outros momentos">${outros.map(op).join('')}</optgroup>` : ''}
    </select></div>`;
}

// Canto já cadastrado com letra parecida (para avisar antes de criar um repetido). Prefere favoritos e o mesmo momento.
function cantoParecido(novo) {
  const tri = trigramasLetra(`${novo.refrao || ''} ${novo.letra || ''}`);
  if (tri.size < 6) return null;
  let melhor = null, nota = 0;
  for (const c of S.cantos) {
    if (c.id === novo.id) continue;
    const t = trigramasLetra(`${c.refrao || ''} ${c.letra || ''}`);
    if (t.size < 6) continue;
    let comum = 0;
    for (const x of tri) if (t.has(x)) comum++;
    const j = comum / (tri.size + t.size - comum) + (c.favorito ? 0.05 : 0) + ((c.momento || 'Outros') === (novo.momento || 'Outros') ? 0.03 : 0);
    if (j > nota) { nota = j; melhor = c; }
  }
  return nota >= 0.6 ? melhor : null;
}

// Cantos do roteiro aberto para o app dos músicos
function musicaCelular() {
  const itens = S.roteiro?.itens || [];
  const out = [];
  itens.forEach((it, i) => {
    const ehCanto = it.tipo === 'canto' || (it.tipo === 'salmo' && it.rotulo === 'Canto');
    if (!ehCanto) return;
    const c = it.tipo === 'canto' ? S.cantos.find(x => x.id === it.cantoId) : null;
    const f = cifraDoItem(it);
    const rezado = it.tipo === 'canto' && !c && it.textoRezado;
    const titulo = c?.titulo || (rezado ? `${it.momento} (rezado)` : it.titulo) || 'Canto';
    out.push({ i, momento: it.momento || it.titulo || 'Canto', titulo, cifra: f?.cifra || '', tom: f?.tom || c?.tom || '', rezado: !!rezado,
      deOutro: f && c && f.id !== c.id ? f.titulo : '', autor: fichaCanto(f || c),
      letra: f ? '' : rezado ? it.textoRezado : (c ? [c.refrao, c.letra].filter(Boolean).join('\n\n') : [it.refrao, it.texto].filter(Boolean).join('\n\n')) });
  });
  return out;
}

// ---------- exportar / importar ----------
function exportarFavoritos() {
  const lista = S.cantos.filter(c => c.favorito || c.cifra);
  if (!lista.length) return toast('Nenhum canto favorito ou com cifra para exportar.');
  const dados = { app: 'MiguelAngelus', tipo: 'cantos', versao: 1, exportado: new Date().toISOString(), cantos: lista };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 1)], { type: 'application/json' }));
  a.download = `Cantos favoritos MiguelAngelus ${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast(`${lista.length} canto(s) exportado(s).`);
}

async function importarCantos(arquivo) {
  let d;
  try { d = JSON.parse(await arquivo.text()); } catch { return alert('Este arquivo não é uma lista de cantos do MiguelAngelus.'); }
  const lista = Array.isArray(d) ? d : d?.cantos;
  if (!Array.isArray(lista) || !lista.length) return alert('Este arquivo não tem cantos.');
  let novos = 0, atualizados = 0;
  for (const x of lista) {
    if (!x || !x.titulo || !(x.letra || x.refrao || x.cifra)) continue;
    const campos = ['titulo', 'autor', 'cd', 'momento', 'refrao', 'letra', 'tom', 'cifra', 'favorito', 'numero', 'fonte'];
    let c = x.id && S.cantos.find(k => k.id === x.id);
    if (c) {
      for (const k of campos) if (x[k] !== undefined && x[k] !== '') c[k] = x[k];
      atualizados++;
    } else {
      c = { id: x.id || uid(), origem: 'importado' };
      for (const k of campos) if (x[k] !== undefined) c[k] = x[k];
      S.cantos.push(c);
      novos++;
    }
    await DB.salvar('cantos', c);
  }
  aposMudarCantos();
  alert(`Cantos importados: ${novos} novo(s), ${atualizados} atualizado(s).`);
}

function ligarCifras() {
  const f = $('#formCanto');
  $('#btnLetraDaCifra').addEventListener('click', () => {
    const cifra = f.cifra.value;
    if (!cifra.trim()) return toast('Cole a cifra primeiro.');
    if ((f.refrao.value.trim() || f.letra.value.trim()) && !confirm('Trocar a letra deste canto pela letra tirada da cifra?')) return;
    const o = letraDaCifra(cifra);
    f.refrao.value = o.refrao;
    f.letra.value = o.letra;
    if (!f.titulo.value.trim() && o.titulo) f.titulo.value = o.titulo;
    const tom = cifra.match(/^\s*tom\s*:\s*([A-G][#b]?m?)/im);
    if (tom && !f.tom.value) f.tom.value = tom[1];
    toast('Letra montada a partir da cifra. Confira o refrão e as estrofes.');
  });
  $('#visaoCantos').addEventListener('click', e => {
    const b = e.target.closest('[data-visao]');
    if (!b) return;
    try { localStorage.setItem('lumen.cantosVisao', b.dataset.visao); } catch {}
    renderCantos();
  });
  $('#btnExportarFav').addEventListener('click', exportarFavoritos);
  $('#itemCab').addEventListener('change', e => {
    if (!e.target.matches('[data-sofav]')) return;
    try { localStorage.setItem('lumen.soFavoritos', e.target.checked ? '1' : '0'); } catch {}
    renderCabecalho();
  });
  $('#btnImportarCantos').addEventListener('click', () => $('#arqCantos').click());
  $('#arqCantos').addEventListener('change', e => { if (e.target.files[0]) importarCantos(e.target.files[0]); e.target.value = ''; });
  // estrela na lista de cantos (o clique não abre o canto)
  $('#listaCantos').addEventListener('click', e => {
    const s = e.target.closest('[data-fav]');
    if (!s) return;
    e.stopPropagation();
    alternarFavorito(s.dataset.fav);
  }, true);
}
