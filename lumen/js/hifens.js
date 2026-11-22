/* MiguelAngelus — 🔎 Conferir hífens (1.9.18)
 * Folhetos em PDF às vezes trazem palavras partidas no fim da linha ("mor-te", "ressur- reição"). Aqui o programa
 * procura os hífens dos textos do roteiro aberto (e dos cantos dele) e separa:
 *  - os que ficam: ênclise (amá-lo, dá-me, perdoai-nos), mesóclise (dar-se-á, louvar-te-ei), palavras compostas
 *    (segunda-feira, bem-aventurado, ave-maria) e prefixos (ex-, pré-, pós-, vice-, recém-…);
 *  - os suspeitos: juntando as partes sai uma palavra que já existe nos textos do programa (morte, ressurreição)
 *    e uma das partes sozinha não é palavra.
 * Nada muda sem a pessoa marcar: a lista aparece para conferir e só junta o que estiver marcado.
 * Usa S, $, $$, esc, toast, abrirDialogo, DB, salvarRoteiroAgora, renderSlides, renderRoteiroLista (em tempo de execução).
 */

const HIF = {
  // pronomes que se ligam ao verbo com hífen
  cliticos: new Set(['me', 'te', 'se', 'lhe', 'lhes', 'o', 'a', 'os', 'as', 'lo', 'la', 'los', 'las', 'no', 'na', 'nos', 'nas', 'vos',
    'mo', 'ma', 'mos', 'mas', 'to', 'ta', 'tos', 'tas', 'lho', 'lha', 'lhos', 'lhas', 'no-lo', 'vo-lo']),
  // terminações do futuro e do condicional na mesóclise (dar-se-á, louvar-te-ei, far-se-ia)
  mesoclise: new Set(['á', 'ás', 'ão', 'ei', 'emos', 'eis', 'ia', 'ias', 'iam', 'íamos', 'íeis']),
  // primeira parte que pede hífen (prefixos e palavras que formam compostos)
  prefixos: new Set(['ex', 'pré', 'pós', 'pró', 'vice', 'vizo', 'recém', 'além', 'aquém', 'sem', 'bem', 'mal', 'sub', 'super', 'anti', 'contra',
    'auto', 'inter', 'semi', 'ultra', 'extra', 'hiper', 'sobre', 'arqui', 'proto', 'pseudo', 'neo', 'grão', 'grã', 'co', 'pan', 'circum',
    'sota', 'soto', 'ab', 'ob', 'sob', 'ad', 'mini', 'micro', 'macro', 'tele', 'santo', 'são', 'padre', 'frei', 'dom', 'mãe', 'pai', 'irmão', 'irmã']),
  // compostos comuns nos textos da Missa (com hífen de verdade)
  compostos: new Set(['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'bem-aventurado', 'bem-aventurada',
    'bem-aventurados', 'bem-aventuradas', 'bem-aventurança', 'bem-aventuranças', 'ave-maria', 'ave-marias', 'pai-nosso', 'pais-nossos',
    'salve-rainha', 'guarda-chuva', 'arco-íris', 'beija-flor', 'louva-a-deus', 'bem-vindo', 'bem-vinda', 'bem-vindos', 'bem-vindas',
    'mal-estar', 'bem-estar', 'recém-nascido', 'recém-nascidos', 'primeiro-ministro', 'obra-prima', 'arco-da-velha', 'joão-de-barro',
    'são-joanino', 'boa-nova', 'boas-novas', 'fim-de-semana', 'corpus-christi', 'sexta-feira-santa', 'quarta-feira-de-cinzas',
    'espírito-santo', 'deus-menino', 'menino-deus', 'homem-deus', 'deus-homem', 'filho-de-deus', 'cordeiro-de-deus', 'vice-versa',
    'mãe-de-deus', 'porta-voz', 'guarda-roupa', 'pôr-do-sol', 'gota-a-gota', 'passo-a-passo', 'dia-a-dia', 'face-a-face', 'corpo-a-corpo']),
};

const minusc = s => (s || '').toLocaleLowerCase('pt-BR');
const RX_HIFEN = /(\p{L}+)(?:-(\p{L}+))+|(\p{L}+)-[ \t]*\n?[ \t]*(\p{Ll}+)/gu;

// palavras conhecidas: todas as palavras dos textos do programa (cantos, roteiros, orações), sem as com hífen
function palavrasConhecidas() {
  const set = new Set();
  const somar = t => { if (!t) return; for (const w of String(t).replace(/<[^>]+>/g, ' ').split(/[^\p{L}-]+/u)) if (w && !w.includes('-')) set.add(minusc(w)); };
  for (const c of S.cantos || []) { somar(c.letra); somar(c.refrao); somar(c.titulo); }
  for (const r of S.roteiros || []) for (const it of r.itens || []) for (const k of CAMPOS_HIF) somar(it[k]);
  for (const o of (typeof S.oracoes !== 'undefined' && S.oracoes) || []) somar(o.texto);
  return set;
}
const CAMPOS_HIF = ['texto', 'textoAntes', 'textoDepois', 'textoRezado', 'refraoRezado'];

// classifica um hífen: null (fica) | { forte } (sugere juntar)
function julgarHifen(partes, conhecidas, quebraLinha) {
  const p = partes.map(minusc), junto = p.join('');
  if (!quebraLinha) {
    if (HIF.compostos.has(p.join('-'))) return null;
    const ult = p[p.length - 1];
    // mesóclise: verbo-pronome-terminação
    if (p.length === 3 && HIF.cliticos.has(p[1]) && HIF.mesoclise.has(p[2])) return null;
    // ênclise: a última parte é pronome e a primeira é verbo (palavra sozinha ou termina em vogal com acento / r, s, z caídos)
    if (HIF.cliticos.has(ult) && (conhecidas.has(p[0]) || /[áéêíóôú]$/.test(p[0]) || /(ai|ei|ou|am|em|ão|ões)$/.test(p[0]) || !conhecidas.has(junto))) return null;
    if (p.length === 3 && HIF.cliticos.has(p[1]) && HIF.cliticos.has(p[2])) return null;     // dá-no-lo
    if (HIF.prefixos.has(p[0])) return null;
    // as duas partes são palavras e juntas não formam outra: composto
    if (p.every(x => conhecidas.has(x)) && !conhecidas.has(junto)) return null;
  }
  if (!conhecidas.has(junto)) return quebraLinha && p.some(x => !conhecidas.has(x)) ? { forte: false } : null;
  // juntas formam uma palavra conhecida
  const fragmento = p.some(x => !conhecidas.has(x) || x.length <= 2 && !HIF.cliticos.has(x));
  return fragmento || quebraLinha ? { forte: true } : { forte: false };
}

// procura no roteiro aberto (itens e os cantos dele)
function procurarHifens(rot = S.roteiro) {
  if (!rot) return [];
  const conhecidas = palavrasConhecidas(), achados = [];
  const olhar = (texto, onde, dono, campo) => {
    if (!texto || !texto.includes('-')) return;
    RX_HIFEN.lastIndex = 0;
    let m;
    while ((m = RX_HIFEN.exec(texto))) {
      const quebra = !!m[3];
      const trecho = m[0];
      const partes = quebra ? [m[3], m[4]] : trecho.split('-');
      const j = julgarHifen(partes, conhecidas, quebra);
      if (!j) continue;
      const ini = Math.max(0, m.index - 28), fim = Math.min(texto.length, m.index + trecho.length + 28);
      achados.push({ onde, dono, campo, trecho, junto: partes.join(''), forte: j.forte,
        antes: texto.slice(ini, m.index).replace(/\s+/g, ' '), depois: texto.slice(m.index + trecho.length, fim).replace(/\s+/g, ' ') });
    }
  };
  const vistos = new Set();
  for (const it of rot.itens || []) {
    const nome = it.momento || it.titulo || it.tipo;
    for (const k of CAMPOS_HIF) olhar(it[k], nome, it, k);
    const c = it.tipo === 'canto' && it.cantoId && S.cantos.find(x => x.id === it.cantoId);
    if (c && !vistos.has(c.id)) { vistos.add(c.id); olhar(c.letra, `${nome}: ${c.titulo}`, c, 'letra'); olhar(c.refrao, `${nome}: ${c.titulo}`, c, 'refrao'); }
  }
  return achados;
}

// janela com a lista para conferir
function conferirHifens({ auto = false } = {}) {
  const lista = procurarHifens();
  const fortes = lista.filter(a => a.forte);
  if (auto) {
    if (!fortes.length) return;
    // outra janela aberta (nomear cantos, distribuição…): só avisa, para não atropelar
    if (document.querySelector('dialog[open]')) { toast(`🔎 ${fortes.length} palavra(s) partida(s) com hífen para conferir: Roteiro → 🔎 Conferir textos`); return; }
  }
  HIF.lista = lista;
  const cx = $('#hifLista');
  $('#hifResumo').textContent = !lista.length
    ? 'Nenhum hífen suspeito neste roteiro. Os de ênclise (amá-lo), mesóclise (dar-se-á) e das palavras compostas ficam como estão.'
    : `${lista.length} hífen(s) para conferir. Marcados: os que parecem palavra partida no fim da linha (juntando, a palavra já existe nos textos do programa). Os de ênclise, mesóclise e compostos não aparecem aqui.`;
  cx.innerHTML = lista.map((a, i) => `<label class="hif-it">
      <input type="checkbox" data-hif="${i}" ${a.forte ? 'checked' : ''}>
      <span class="hif-txt"><span class="sutil">…${esc(a.antes)}</span><mark>${esc(a.trecho.replace(/\s+/g, ' '))}</mark><span class="sutil">${esc(a.depois)}…</span>
        <br><b>→ ${esc(a.junto)}</b> <small class="sutil">· ${esc(a.onde)}${a.forte ? '' : ' · talvez'}</small></span></label>`).join('');
  $('#hifJuntar').disabled = !lista.length;
  abrirDialogo('dlgHifens');
}

async function juntarHifensMarcados() {
  const marcados = $$('#hifLista [data-hif]:checked').map(c => HIF.lista[+c.dataset.hif]);
  if (!marcados.length) { $('#dlgHifens').close(); return; }
  const cantosMudados = new Set();
  let n = 0;
  for (const a of marcados) {
    const antes = a.dono[a.campo] || '';
    const depois = antes.split(a.trecho).join(a.junto);
    if (depois === antes) continue;
    n += antes.split(a.trecho).length - 1;
    a.dono[a.campo] = depois;
    if (S.cantos.includes(a.dono)) cantosMudados.add(a.dono);
    // (folheto distribuído em vários roteiros do mesmo dia) o mesmo texto nos outros roteiros da mesma data
    if (!S.cantos.includes(a.dono) && S.roteiro.data) {
      for (const r of S.roteiros) {
        if (r === S.roteiro || r.data !== S.roteiro.data) continue;
        let mudou = false;
        for (const it of r.itens || []) if (typeof it[a.campo] === 'string' && it[a.campo].includes(a.trecho)) { it[a.campo] = it[a.campo].split(a.trecho).join(a.junto); mudou = true; }
        if (mudou) { r.atualizado = Date.now(); await DB.salvar('roteiros', r); }
      }
    }
  }
  for (const c of cantosMudados) await DB.salvar('cantos', c);
  await salvarRoteiroAgora();
  $('#dlgHifens').close();
  if (typeof renderSlides === 'function') renderSlides();
  if (typeof renderRoteiroLista === 'function') renderRoteiroLista();
  toast(`✓ ${n} palavra(s) juntada(s).`);
}

function ligarHifens() {
  $('#btnConferirTextos')?.addEventListener('click', () => conferirHifens());
  $('#hifJuntar')?.addEventListener('click', e => { e.preventDefault(); juntarHifensMarcados(); });
  $('#hifTodos')?.addEventListener('click', e => { e.preventDefault(); const cs = $$('#hifLista [data-hif]'); const marcar = cs.some(c => !c.checked); cs.forEach(c => { c.checked = marcar; }); });
}
document.addEventListener('DOMContentLoaded', ligarHifens);
if (document.readyState !== 'loading') ligarHifens();
