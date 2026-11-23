// Assistente do programa (1.9.15): Miguel (o anjinho do MiguelAngelus) ou Mariana (acólita, homenagem do Luciano,
// da Paróquia Coração Eucarístico de Jesus e Santa Marina). A escolha fica no cadastro da paróquia (Agenda → Paróquia).
//  💡 Dica do/da …     → a "cola do coroinha": prefácio e Oração Eucarística do roteiro, com a página do Missal e quando usar
//  ❓ Pergunte ao/à …  → busca a dúvida no Manual do MiguelAngelus e mostra o trecho; tem lista de perguntas frequentes
// O cíngulo (cinto) do ícone muda com a cor do tempo litúrgico (dourado nas festas e no branco).

const ASSISTENTES = {
  miguel: { nome: 'Miguel', de: 'do', a: 'ao', icone: 'img/assistente-miguel.svg' },
  mariana: { nome: 'Mariana', de: 'da', a: 'à', icone: 'img/assistente-mariana.svg' },
};
const assistente = () => ASSISTENTES[(typeof Agenda !== 'undefined' && Agenda.dados?.paroquia?.assistente) || ''] || ASSISTENTES.miguel;
const rotuloDica = (a = assistente()) => `Dica ${a.de} ${a.nome}`;
const rotuloPergunte = (a = assistente()) => `Pergunte ${a.a} ${a.nome}`;

// ---------- Ícone com o cíngulo na cor litúrgica ----------

const CINGULO_PADRAO = '#f2b632';
const Assist = { svgs: {}, manual: null, carregando: null };

function corDoCingulo() {
  let cor = '', hex = '';
  try {
    if (S.roteiro) ({ cor, corHex: hex } = liturgiaDoRoteiro(S.roteiro));
    else { const l = Liturgia.info(new Date()); cor = l.cor; hex = l.corHex; }
  } catch {}
  return !cor || cor === 'branco' ? CINGULO_PADRAO : hex || CINGULO_PADRAO;
}

async function iconeAssistente(a = assistente(), cor = corDoCingulo()) {
  try {
    if (!Assist.svgs[a.icone]) Assist.svgs[a.icone] = await (await fetch(a.icone)).text();
    const svg = Assist.svgs[a.icone].replace(/<[^>]*class="cingulo"[^>]*>/g, tag => tag.split(CINGULO_PADRAO).join(cor));
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  } catch { return a.icone; }
}

// Troca os nomes ("Dica do Miguel", "Pergunte à Mariana"…) e os ícones em todo o programa
async function atualizarAssistente() {
  const a = assistente();
  for (const el of $$('[data-assist-rot]')) {
    if (el.dataset.assistRot === 'nome') { el.textContent = a.nome; continue; }     // (1.9.17) rótulo do ícone na faixa
    const dica = el.dataset.assistRot === 'dica', rot = dica ? rotuloDica(a) : rotuloPergunte(a);
    if (el.tagName === 'H2') el.textContent = rot;
    else el.textContent = (dica ? '💡 ' : '❓ ') + rot + '…';
  }
  const src = await iconeAssistente(a);
  $$('.assist-icone').forEach(img => { img.src = src; });
  const par = $('#parAssistIcone'); if (par) par.src = src;
}

// ---------- 💡 Dica (cola do coroinha) ----------

function itensDaDica() {
  const r = S.roteiro, regra = regraDoRoteiro(r || null);
  const itPref = r?.itens.find(i => i.tipo === 'prefacio'), itOE = r?.itens.find(i => i.tipo === 'eucaristica');
  return { r, regra, prefId: itPref?.prefId || null, oeId: itOE?.oeId || null };
}

function cartaoDica(rotulo, id, extra = '') {
  const mi = missalDe(id);
  return `<div class="dica-card">
    <div class="dica-o">${esc(rotulo)}</div>
    <div class="dica-nome">${esc(nomeEuc(id))}</div>
    <div class="dica-pag">${mi.pag ? `📖 Missal <b>p. ${esc(mi.pag)}</b>` : '<span class="sutil dica-sem-pag">📖 página ainda não anotada (✝ catálogo → 📖 Páginas do Missal)</span>'}</div>
    ${mi.uso ? `<div class="dica-uso"><b>Quando usar:</b> ${esc(mi.uso)}</div>` : ''}${extra}
  </div>`;
}

// ---------- 🎀 Fitilhos: onde marcar o Missal, na ordem da Missa ----------
// Prefácio e Oração Eucarística vêm do roteiro; as partes fixas, da tabela 📖 (grupo "Partes fixas");
// a página da Missa do dia e a bênção final ficam guardadas no roteiro (r.fitilhos).
// bênção final: [valor guardado no roteiro, nome, id da página na tabela]
const opcoesBencao = () => [['simples', 'Bênção final simples', 'mr-bencao'],
  ...BENCAOS_SOLENES.map(b => [b.id, b.nome, b.id]), ['povo', 'Oração sobre o povo (anote o número/página)', 'mr-povo']];
const bencaoFim = k => opcoesBencao().find(o => o[0] === k) || (k === 'solene' ? ['solene', 'Bênção solene', 'mr-solenes'] : opcoesBencao()[0]);
const nFitilhos = () => Math.max(1, Math.min(12, +Euc.dados.nFitilhos || 6));
// ⚠ só enquanto valer a página que veio com o programa marcada "A conferir" (a paróquia corrigiu ou confirmou: some)
const aConferir = id => {
  const pad = MISSAL_PADRAO.itens[id] || {}, meu = itensDaEdicao(edicaoMissal())[id] || {};
  return /^⚠\s*a conferir/i.test(pad.uso || '') && edicaoMissal() === MISSAL_PADRAO.edicao && !meu.pag && !meu.uso;
};

// o dia litúrgico completo do roteiro (com o santo e o padroeiro da comunidade); sem roteiro, hoje
function litCompleta(r) {
  try {
    if (!r) return Liturgia.info(new Date());
    const inf = infoRoteiro(r);
    return inf.dataLit ? Liturgia.info(inf.dataLit, localDe(inf.localId)?.padroeiro) : null;
  } catch { return null; }
}

// Nas memórias o padre pode celebrar a Missa do santo ou a do dia de semana: [{ v, id, nome }], a 1ª é a do calendário
function opcoesMissaDia(lit) {
  if (!lit?.data) return [];
  // (1.9.17) dias de semana com Missa própria ganharam linha (dia-sem-…), mas o valor guardado no roteiro continua 'semana'
  const vDe = id => id && !ehMissaDiaDeSemana(id) ? id : 'semana';
  const base = chaveMissaDoDia(lit), ops = [{ v: vDe(base), id: base, nome: base ? nomeEuc(base).replace(/ \((e a semana|dias de semana)\)$/, '') : 'Dia de semana (Próprio do Tempo)' }];
  const memoria = lit.santo && !lit.padroeiro && /Memória/.test(lit.santo);
  if (memoria || lit.facultativa) {
    const d = lit.data, mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const outra = memoria ? chaveMissaDoDia({ data: d, titulo: lit.tituloTempo, tituloTempo: lit.tituloTempo }) : 'dia-d-' + mmdd;
    if (outra !== base) ops.push(memoria
      ? { v: vDe(outra), id: outra, nome: `Missa da semana (${outra ? nomeEuc(outra).replace(/ \((e a semana|dias de semana)\)$/, '') : lit.tituloTempo})` }
      : { v: outra, id: outra, nome: lit.facultativa + ' (memória facultativa)' });
  }
  // (1.9.20, Luciano) dia com mais de um santo: uma opção para cada (linhas "dia-d-MM-DD", "-2", "-3" da tabela 📖)
  return ops.flatMap(o => {
    const m = /^dia-d-(\d\d-\d\d)$/.exec(o.id || ''), santos = m ? santosDaData(m[1]) : [];
    if (santos.length < 2) return [o];
    const fac = / \(memória facultativa\)$/.test(o.nome) ? ' (memória facultativa)' : '';
    return santos.map((s, i) => { const id = o.id + (i ? '-' + (i + 1) : ''); return { v: id, id, nome: s + fac }; });
  });
}

function linhasFitilhos() {
  const { r, regra, prefId, oeId } = itensDaDica(), f = r?.fitilhos || {};
  const oe = oeId ? oeDe(oeId) : null, pp = id => missalDe(id);
  const L = [];
  const ops = opcoesMissaDia(litCompleta(r)), op = ops.find(o => o.v === f.missa) || ops[0];
  const chDia = op?.id || null, pDia = chDia ? pp(chDia).pag : '';
  L.push({ parte: 'Missa do dia', pag: f.dia || pDia,
    det: (op ? op.nome : 'Dia de semana com Missa própria (Próprio do Tempo)') + ' · coleta, oferendas e depois da comunhão',
    falta: 'anote a página ↓', conf: !f.dia && chDia && aConferir(chDia) });
  L.push({ parte: 'Rito da Missa', pag: pp('mr-inicio').pag, det: 'Ritos iniciais', conf: aConferir('mr-inicio') });
  if (oe && oe.pref !== 'livre' && (!prefId || prefId === oe.proprio))
    L.push({ parte: 'Prefácio', junto: true, det: 'Vem junto com a Oração Eucarística (prefácio próprio)' });
  else {
    const id = prefId || (regra.prefs.length === 1 ? regra.prefs[0] : null);
    L.push({ parte: 'Prefácio', pag: id ? pp(id).pag : '', det: id ? nomeEuc(id) + (prefId ? '' : ' (o do dia)') : `Escolha no roteiro (do dia: ${nomesPrefsRegra(regra)})`, falta: '—' });
  }
  L.push({ parte: 'Oração Eucarística', pag: oeId ? pp(oeId).pag : '', det: oeId ? nomeEuc(oeId) : 'Escolha no roteiro (✝ catálogo)', falta: '—' });
  L.push({ parte: 'Rito da Comunhão', pag: pp('mr-comunhao').pag, det: 'Pai-Nosso e ritos da comunhão', conf: aConferir('mr-comunhao') });
  const [kB, nomeB, idB] = bencaoFim(f.bencao);
  L.push({ parte: 'Bênção final', pag: f.bencaoPag || pp(idB).pag, det: nomeB.replace(/ \(anote.*\)$/, '') + (['povo', 'solene'].includes(kB) && !f.bencaoPag ? ' (começo da seção; anote a página exata abaixo)' : ''),
    falta: 'anote a página ↓', conf: !f.bencaoPag && aConferir(idB) });
  let n = 0;
  for (const l of L) if (!l.junto) l.n = ++n;
  return L;
}

function htmlFitilhos() {
  const n = nFitilhos(), cor = corDoCingulo();
  return `<ol class="fitas">${linhasFitilhos().map(l => `<li class="${l.junto ? 'fita-junto' : ''} ${l.n > n ? 'fita-sobra' : ''}">
      <span class="fita-n" style="--fita:${cor}">${l.junto ? '↳' : l.n}</span>
      <span class="fita-parte"><b>${esc(l.parte)}</b><small>${esc(l.det || '')}${l.n > n ? ' · sem fitilho sobrando: use um marcador de papel' : ''}</small></span>
      <span class="fita-pag">${l.junto ? '' : l.pag ? `p. ${esc(l.pag)}${l.conf ? ' <i title="Página ainda a conferir no Missal">⚠</i>' : ''}` : `<span class="sutil">${esc(l.falta || '—')}</span>`}</span>
    </li>`).join('')}</ol>`;
}

function formFitilhos() {
  const r = S.roteiro, f = r?.fitilhos || {}, dis = r ? '' : 'disabled';
  const ops = opcoesMissaDia(litCompleta(r)), op = ops.find(o => o.v === f.missa) || ops[0];
  return `<div class="fita-form">
    ${ops.length > 1 ? `<label>Missa de <select id="fitMissa" ${dis}>${ops.map(o => `<option value="${esc(o.v)}" ${o === op ? 'selected' : ''}>${esc(o.nome)}</option>`).join('')}</select></label>` : ''}
    <label title="Vazio = a página da tabela 📖 (Missa do dia). Digite só para trocar neste roteiro.">Missa do dia: p. <input id="fitDia" value="${esc(f.dia || '')}" size="5" maxlength="12" inputmode="numeric" placeholder="${esc(op?.id ? missalDe(op.id).pag : '')}" ${dis}></label>
    <label>Bênção final <select id="fitBencao" ${dis}>${opcoesBencao().map(([k, nome, id]) => `<option value="${k}" ${bencaoFim(f.bencao)[0] === k ? 'selected' : ''}>${esc(nome)}${missalDe(id).pag ? ' · p. ' + esc(missalDe(id).pag) : ''}</option>`).join('')}</select></label>
    <label>p. <input id="fitBencaoPag" value="${esc(f.bencaoPag || '')}" size="5" maxlength="12" inputmode="numeric" placeholder="${esc(missalDe(bencaoFim(f.bencao)[2]).pag)}" ${dis}></label>
    <label title="Quantas fitas (marcadores) o Missal da sua paróquia tem">Fitilhos do Missal <input id="fitN" type="number" min="1" max="12" value="${nFitilhos()}"></label>
  </div>${r ? '' : '<p class="sutil pequeno">Abra um roteiro para guardar a página da Missa do dia e a bênção.</p>'}`;
}

function ligarFormFitilhos() {
  const r = S.roteiro, re = () => { $('#dicaFitas').innerHTML = htmlFitilhos(); };
  const guardar = () => {
    if (!r) return;
    const ops = opcoesMissaDia(litCompleta(r)), m = $('#fitMissa')?.value;
    const f = { missa: m && m !== ops[0]?.v ? m : '', dia: $('#fitDia').value.trim(), bencao: $('#fitBencao').value, bencaoPag: $('#fitBencaoPag').value.trim() };
    if (f.bencao === 'simples') delete f.bencao;
    for (const k of Object.keys(f)) if (!f[k]) delete f[k];
    if (Object.keys(f).length) r.fitilhos = f; else delete r.fitilhos;
    salvarRoteiro(); re();
    // (1.9.20) a bênção da Dica é a mesma do item "Bênção e despedida" do roteiro: o telão acompanha
    try { renderRoteiroLista(); if (S.atual?.item?.parte === 'bencao-final') { atualizarSlides(); renderCabecalho(); } } catch (_) {}
  };
  $('#fitDia').addEventListener('input', guardar);
  $('#fitMissa')?.addEventListener('change', () => {
    const o = opcoesMissaDia(litCompleta(r)).find(x => x.v === $('#fitMissa').value);
    $('#fitDia').value = ''; $('#fitDia').placeholder = o?.id ? missalDe(o.id).pag : '';
    guardar();
  });
  $('#fitBencaoPag').addEventListener('input', guardar);
  $('#fitBencao').addEventListener('change', () => {
    $('#fitBencaoPag').value = '';
    $('#fitBencaoPag').placeholder = missalDe(bencaoFim($('#fitBencao').value)[2]).pag;
    guardar();
  });
  $('#fitN').addEventListener('input', e => { const v = +e.target.value; if (v >= 1 && v <= 12) { Euc.dados.nFitilhos = v; salvarEucaristia(); re(); } });
}

// ---------- (1.9.20) 📋 escala da Missa e 🔔 carrilhão na Dica ----------
// Escala: vem da Secretaria (registro secs-<chave da celebração>, só função e nomes), se a paróquia ligou lá a chave
// "Escalas no MiguelAngelus". Lida do banco de tempos em tempos (a Dica do celular é montada sem esperar).
const DicaExtra = { escala: null, chave: '', quando: 0 };
async function atualizarEscalaDica(forcar) {
  const ch = S.roteiro?.celebracao || '';
  if (!forcar && ch === DicaExtra.chave && Date.now() - DicaExtra.quando < 20000) return;
  DicaExtra.chave = ch; DicaExtra.quando = Date.now();
  try { DicaExtra.escala = ch ? (await DB.obter('config', 'secs-' + String(ch).replace(/[^\w-]+/g, '_')))?.item || null : null; }
  catch { DicaExtra.escala = null; }
}
function htmlEscalaDica() {
  const e = DicaExtra.escala;
  if (!e?.funcoes?.length || !S.roteiro || e.chave !== S.roteiro.celebracao) return '';
  return `<div class="dica-card dica-escala"><div class="dica-o">📋 Escala desta Missa</div><ul class="dica-lista">${e.funcoes.map(f =>
    `<li><span>${esc(f.nome)}</span><b>${esc((f.pessoas || []).join(', '))}</b></li>`).join('')}</ul></div>`;
}

// Carrilhão: o trecho da Oração Eucarística do roteiro em que o padre pede o Espírito Santo sobre os dons (epiclese),
// logo antes da narrativa da instituição ("tomou o pão…"): é quando o coroinha toca e a comunidade se ajoelha.
// O texto é o que a paróquia já tem no roteiro (nada vem junto com o programa).
const RX_EPI_ACAO = /(santifi[cq]|abencoe|abencoai|derram|envia|mandai|aceit)/;
const RX_EPI_OBJ = /\b(dons|oferendas|ofertas|oblacao|pao e (o )?vinho)\b/;
const RX_INSTITUICAO = /(tomou o pao|na noite em que|estando para ser entregue|na vespera de sua paixao|ceia com seus)/;
function trechoCarrilhao(r = S.roteiro) {
  const it = r?.itens.find(i => i.tipo === 'eucaristica') || r?.itens.find(i => i.tipo === 'texto' && ehTextoDeOE(i));
  if (!it) return null;
  let blocos;
  try { blocos = gerarSlidesBase(it).map(s => String(s.texto || '')); } catch { return null; }
  const n = blocos.map(b => semAcento(b).toLowerCase());
  const fim = n.findIndex(b => RX_INSTITUICAO.test(b));
  const casa = (b, k) => (fim < 0 || k <= fim) && RX_EPI_ACAO.test(b) && RX_EPI_OBJ.test(b);
  // a mais perto da instituição (na Oração Eucarística I, a primeira menção às oferendas ainda não é a hora)
  let i = -1;
  n.forEach((b, k) => { if (casa(b, k) && (fim >= 0 || i < 0)) i = k; });
  if (i < 0) return null;
  // no mesmo slide da instituição: corta antes dela
  const linhas = blocos[i].split('\n'), corte = linhas.findIndex(l => RX_INSTITUICAO.test(semAcento(l).toLowerCase()));
  const texto = (corte > 0 ? linhas.slice(0, corte) : linhas).join('\n').trim();
  // o trecho vai inteiro (pedido do usuário, 23/11); no bloco comprido (o slide junta o texto de antes com a epiclese),
  // a hora de tocar fica em destaque: da última frase que pede a santificação dos dons até o fim
  // (na OE I, "Aceitai… a oblação" vem antes de "Dignai-vos… santificar estas oferendas": vale a última)
  let antes = '';
  if (texto.length > 320) {
    const prim = texto.split('\n')[0];
    const frases = prim.split(/(?<=[.;!?])\s+/);
    let k = -1;
    frases.forEach((f, j) => { const s = semAcento(f).toLowerCase(); if (RX_EPI_ACAO.test(s) && RX_EPI_OBJ.test(s)) k = j; });
    if (k > 0) antes = frases.slice(0, k).join(' ') + ' ';
  }
  return texto ? { texto, antes } : null;
}
function htmlCarrilhaoDica() {
  const { r, oeId } = itensDaDica();
  if (!r) return '';
  const t = trechoCarrilhao(r);
  if (!t) return oeId || r.itens.some(i => i.tipo === 'texto' && ehTextoDeOE(i))
    ? '<div class="dica-card dica-falta">🔔 Carrilhão: o trecho aparece aqui quando a Oração Eucarística do roteiro tiver o texto.</div>' : '';
  return `<div class="dica-card dica-carrilhao"><div class="dica-o">🔔 Carrilhão: toque quando o padre disser</div>
    <blockquote class="dica-trecho">${t.antes && t.texto.startsWith(t.antes)
      ? `<span class="dica-trecho-antes">${esc(t.antes)}</span><b>${esc(t.texto.slice(t.antes.length)).replace(/\n/g, '<br>')}</b>`
      : esc(t.texto).replace(/\n/g, '<br>')}</blockquote>
    <div class="dica-uso">É quando o padre estende as mãos sobre o pão e o vinho: toque o carrilhão e a comunidade se ajoelha.
      <span class="sutil">Onde for costume, toque também quando ele mostrar a Hóstia e o Cálice.</span></div></div>`;
}

function htmlDica() {
  const { r, regra, prefId, oeId } = itensDaDica(), a = assistente();
  const oe = oeId ? oeDe(oeId) : null;
  let corpo = '';
  if (prefId || oeId) {
    const chk = checarEuc(oeId, prefId, regra);
    if (prefId) corpo += cartaoDica('Prefácio', prefId);
    else if (oe && oe.pref === 'livre') corpo += `<div class="dica-card dica-falta">O roteiro ainda não tem o prefácio. Do dia: <b>${esc(nomesPrefsRegra(regra))}</b>.</div>`;
    if (oeId) corpo += cartaoDica('Oração Eucarística', oeId, oe && oe.pref !== 'livre' ? '<div class="dica-uso sutil">Esta oração tem prefácio próprio: ele já vem junto, na mesma página.</div>' : '');
    else corpo += `<div class="dica-card dica-falta">O roteiro ainda não tem a Oração Eucarística (escolha no ✝ catálogo).</div>`;
    if (chk.nivel !== 'ok') corpo += `<p class="dica-aviso">⚠ ${esc(chk.msg)}</p>`;
  } else if (!regra.semMissa) {
    corpo += `<p class="dica-fala">${r ? 'Este roteiro ainda não tem prefácio nem Oração Eucarística escolhidos.' : 'Nenhum roteiro aberto.'} Para ${esc(regra.titulo)}, o prefácio é:</p>`;
    corpo += regra.prefs.length > 3
      ? `<div class="dica-card"><div class="dica-o">Prefácio do dia (à escolha)</div><ul class="dica-lista">${regra.prefs.map(id => {
          const p = missalDe(id).pag;
          return `<li><span>${esc(nomeEuc(id))}</span><b>${p ? 'p. ' + esc(p) : '—'}</b></li>`;
        }).join('')}</ul>${missalDe(regra.prefs[0]).uso ? `<div class="dica-uso"><b>Quando usar:</b> ${esc(missalDe(regra.prefs[0]).uso)}</div>` : ''}</div>`
      : regra.prefs.map(id => cartaoDica('Prefácio do dia', id)).join('');
  }
  if (regra.nota) corpo += `<p class="dica-nota">ℹ ${esc(regra.nota)}</p>`;
  if (regra.semMissa) corpo = `<p class="dica-aviso">${esc(regra.nota || 'Neste dia não há Missa.')}</p>`;
  corpo += `<p class="dica-fala">💡 ${esc(a.nome)} lembra: antes da Missa, deixe as fitas do Missal nestas páginas.</p>`;
  const lit = r ? liturgiaDoRoteiro(r) : null;
  return { corpo, titulo: r ? `${r.nome}${lit?.titulo ? ' · ' + lit.titulo : ''}` : regra.titulo, edicao: edicaoMissal(),
    escala: htmlEscalaDica(), carrilhao: htmlCarrilhaoDica() };
}

async function abrirDica() {
  await atualizarEscalaDica(true);
  const d = htmlDica();
  $('#dicaRoteiro').textContent = `${d.titulo} · páginas do ${d.edicao}`;
  $('#dicaCorpo').innerHTML = `${d.escala}<div class="dica-o">🎀 Onde pôr os fitilhos, na ordem da Missa</div>
    <div id="dicaFitas">${htmlFitilhos()}</div>${formFitilhos()}
    <div class="dica-o dica-det">Prefácio e Oração Eucarística</div>${d.corpo}${d.carrilhao}`;
  ligarFormFitilhos();
  atualizarAssistente();
  abrirDialogo('dlgDica');
}

async function imprimirDica() {
  await atualizarEscalaDica(true);
  const d = htmlDica(), a = assistente(), icone = await iconeAssistente(a);
  $('#quadroImpressao')?.remove();
  const f = document.createElement('iframe');
  f.id = 'quadroImpressao';
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  f.srcdoc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(rotuloDica(a))}</title><style>
    @page { size: A4; margin: 14mm; }
    body { font: 15pt "Segoe UI", Arial, sans-serif; color: #111; }
    header { display: flex; gap: 14px; align-items: center; border-bottom: 3px solid ${corDoCingulo()}; padding-bottom: 8px; margin-bottom: 12px; }
    header img { width: 72px; height: 72px; border-radius: 16px; }
    h1 { font-size: 22pt; margin: 0; } .sutil { color: #555; font-size: 11pt; }
    .dica-card { border: 2px solid #999; border-radius: 10px; padding: 10px 14px; margin: 10px 0; page-break-inside: avoid; }
    .dica-o { font-size: 11pt; text-transform: uppercase; letter-spacing: .05em; color: #555; }
    .dica-nome { font-size: 22pt; font-weight: 700; } .dica-pag { font-size: 20pt; margin: 4px 0; } .dica-pag b { font-size: 26pt; }
    .dica-lista { list-style: none; padding: 0; columns: 2; column-gap: 20px; } .dica-lista li { display: flex; justify-content: space-between; border-bottom: 1px dashed #999; padding: 3px 0; break-inside: avoid; }
    .dica-sem-pag { font-size: 11pt; } .dica-uso { font-size: 12pt; } .dica-aviso, .dica-nota, .dica-fala { font-size: 12pt; }
    .fitas { list-style: none; padding: 0; margin: 0 0 14px; } .fitas li { display: flex; align-items: center; gap: 12px; padding: 6px 0; border-bottom: 1px solid #bbb; }
    .fita-n { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #333; display: grid; place-items: center; font-weight: 700; flex: none; }
    .fita-parte { flex: 1; display: flex; flex-direction: column; } .fita-parte small { font-size: 10pt; color: #555; }
    .fita-pag { font-size: 20pt; font-weight: 700; white-space: nowrap; } .fita-pag i { font-size: 12pt; font-style: normal; }
    .fita-junto { opacity: .7; } h2 { font-size: 12pt; text-transform: uppercase; color: #555; margin: 10px 0 4px; }
    .dica-escala .dica-lista { columns: 1; } .dica-trecho { margin: 6px 0; padding: 6px 12px; border-left: 4px solid ${corDoCingulo()}; font: 14pt/1.4 Georgia, serif; } .dica-trecho-antes { color: #555; }
  </style></head><body><header><img src="${icone}" alt=""><div><h1>💡 ${esc(rotuloDica(a))}</h1>
    <div class="sutil">${esc(d.titulo)}<br>Páginas do ${esc(d.edicao)}</div></div></header>
    ${d.escala}
    <h2>🎀 Onde pôr os fitilhos</h2>${htmlFitilhos()}${linhasFitilhos().some(l => l.conf) ? '<p class="sutil">⚠ página ainda a conferir no Missal</p>' : ''}
    <h2>Prefácio e Oração Eucarística</h2>${d.corpo}${d.carrilhao}</body></html>`;
  f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('Não consegui abrir a impressão: ' + e.message); } };
  document.body.appendChild(f);
}

// ---------- ❓ Pergunte (busca no Manual) ----------

const normA = s => semAcento((s || '').normalize('NFC'));
const PALAVRAS_VAZIAS = new Set(('como que para por com uma uns umas dos das nos nas pelo pela pelos pelas mais mas nao sim ' +
  'quando onde qual quais quero queria fazer faco faz posso pode tem ter esta estao esse essa isso este aqui ali ' +
  'meu minha seu sua ele ela eles elas voce voces sobre entre ate apos depois antes tambem ainda muito pouco ficou fica ' +
  'programa miguelangelus duvida ajuda').split(' '));

// Lê o Manual (que vem junto com o programa) e separa em trechos: capítulo → subtítulo → parágrafos
async function carregarManual() {
  if (Assist.manual) return Assist.manual;
  if (!Assist.carregando) Assist.carregando = (async () => {
    const txt = await (await fetch('Manual do MiguelAngelus.html')).text();
    const doc = new DOMParser().parseFromString(txt, 'text/html');
    doc.querySelectorAll('img, script, style, svg, video, audio, iframe').forEach(e => e.remove());
    const grupos = [];
    for (const sec of doc.querySelectorAll('main section[id]')) {
      const cap = (sec.querySelector('h2')?.textContent || '').replace(/\s+/g, ' ').trim().replace(/^(\d+)\s+/, '$1. ');
      let g = null;
      const novo = sub => { g = { cap, sub, secId: sec.id, blocos: [] }; grupos.push(g); };
      for (const el of sec.children) {
        if (el.tagName === 'H2') continue;
        if (el.tagName === 'H3') { novo(el.textContent.replace(/\s+/g, ' ').trim()); continue; }
        const texto = el.textContent.replace(/\s+/g, ' ').trim();
        if (!texto) continue;
        if (!g) novo('');
        el.querySelectorAll('a').forEach(l => l.replaceWith(...l.childNodes));
        g.blocos.push({ html: el.outerHTML, n: normA(texto) });
      }
    }
    for (const g of grupos) g.nTit = normA(g.cap + ' ' + g.sub);
    Assist.manual = grupos.filter(g => g.blocos.length);
    return Assist.manual;
  })();
  try { return await Assist.carregando; } catch (e) { Assist.carregando = null; throw e; }
}

function termosDa(pergunta) {
  return [...new Set(normA(pergunta).split(/[^a-z0-9]+/).filter(t => t.length >= 3 && !PALAVRAS_VAZIAS.has(t)))]
    .map(t => ({ t, re: new RegExp('\\b' + (t.length > 5 ? t.slice(0, t.length - 2) : t.replace(/s$/, '')), 'g') }));
}

function buscarNoManual(grupos, pergunta) {
  const termos = termosDa(pergunta);
  if (!termos.length) return { termos, achados: [] };
  // palavra rara no Manual (ex.: "prefácio") vale mais que palavra comum (ex.: "usar")
  const todos = grupos.flatMap(g => g.blocos);
  for (const x of termos) { const df = todos.filter(b => { x.re.lastIndex = 0; return x.re.test(b.n); }).length; x.w = Math.log(1 + todos.length / (1 + df)); }
  const achados = [];
  for (const g of grupos) {
    const achouTermo = new Set();
    let pontos = 0;
    for (const { t, re, w } of termos) if ((g.nTit.match(re) || []).length) { pontos += 3 * w; achouTermo.add(t); }
    const blocos = g.blocos.map((b, i) => {
      let p = 0;
      for (const { t, re, w } of termos) { const n = (b.n.match(re) || []).length; if (n) { p += w * (1 + Math.min(n, 3) / 2); achouTermo.add(t); } }
      return { i, p };
    }).filter(b => b.p);
    pontos += blocos.reduce((s, b) => s + b.p, 0) / Math.sqrt(Math.max(1, blocos.length));
    if (!pontos) continue;
    const cobertura = achouTermo.size / termos.length;
    achados.push({ g, pontos: pontos * (0.3 + cobertura * cobertura), blocos: blocos.sort((a, b) => b.p - a.p).slice(0, 3).sort((a, b) => a.i - b.i) });
  }
  achados.sort((a, b) => b.pontos - a.pontos);
  return { termos, achados: achados.slice(0, 5) };
}

// Destaca as palavras da pergunta no trecho (comparando sem acento)
function destacar(el, termos) {
  if (!termos.length) return;
  const re = new RegExp('\\b(' + termos.map(({ t }) => t.length > 5 ? t.slice(0, t.length - 2) : t.replace(/s$/, '')).join('|') + ')[a-z0-9]*', 'g');
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nos = [];
  while (w.nextNode()) nos.push(w.currentNode);
  for (const no of nos) {
    const orig = no.nodeValue.normalize('NFC'), n = semAcento(orig);
    if (n.length !== orig.length) continue;
    const partes = []; let ult = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(n))) { partes.push(orig.slice(ult, m.index)); const k = document.createElement('mark'); k.textContent = orig.slice(m.index, m.index + m[0].length); partes.push(k); ult = m.index + m[0].length; }
    if (!partes.length) continue;
    partes.push(orig.slice(ult));
    no.replaceWith(...partes);
  }
}

function htmlGrupo(g, blocos = null) {
  const bs = blocos ? blocos.map(b => g.blocos[b.i]) : g.blocos;
  return `<article class="perg-res">
    <div class="perg-onde">${esc(g.cap)}</div>
    ${g.sub ? `<h3>${esc(g.sub)}</h3>` : ''}
    <div class="perg-trecho">${bs.map(b => b.html).join('')}</div>
    ${blocos && blocos.length < g.blocos.length ? `<button type="button" class="perg-mais" data-perg-grupo="${Assist.manual.indexOf(g)}">Ler este trecho inteiro</button>` : ''}
  </article>`;
}

const FAQ_EXTRA = [
  ['Como trago o folheto da Missa para o roteiro?', 'importar folheto pdf roteiro'],
  ['Como escolho o prefácio e a Oração Eucarística?', 'prefacio oracao eucaristica catalogo'],
  ['Como controlo os slides pelo celular?', 'celular controle qr'],
  ['Como ponho um aviso na tela durante a Missa?', 'aviso tela'],
  ['Como levo tudo para outro computador?', 'backup outro computador'],
  ['Como ligo a sincronização com a nuvem da paróquia?', 'sincronizacao nuvem google drive'],
  ['Quais são os atalhos do teclado?', 'atalhos teclado'],
];

async function mostrarFaq() {
  const corpo = $('#pergCorpo'), a = assistente();
  let duvidas = [];
  try { duvidas = (await carregarManual()).filter(g => g.secId === 'duvidas' && g.sub); } catch {}
  corpo.innerHTML = `<p class="dica-fala">${esc(a.nome)} separou as perguntas que mais aparecem:</p>
    <ul class="perg-faq">${FAQ_EXTRA.map(([q, busca]) => `<li><button type="button" data-perg-busca="${esc(busca)}">${esc(q)}</button></li>`).join('')}
    ${duvidas.map(g => `<li><button type="button" data-perg-grupo="${Assist.manual.indexOf(g)}">${esc(g.sub)}</button></li>`).join('')}</ul>`;
}

async function perguntar(texto, mostrar = texto) {
  const corpo = $('#pergCorpo'), a = assistente();
  if (!texto.trim()) return mostrarFaq();
  let grupos;
  try { grupos = await carregarManual(); }
  catch { corpo.innerHTML = `<p class="dica-aviso">Não consegui abrir o Manual aqui dentro. Use 📘 Abrir o Manual inteiro.</p>`; return; }
  const { termos, achados } = buscarNoManual(grupos, texto);
  if (!achados.length) {
    corpo.innerHTML = `<p class="dica-fala">${esc(a.nome)} não achou "${esc(mostrar)}" no Manual. Tente com outras palavras, ou veja as perguntas frequentes.</p>`;
    return;
  }
  corpo.innerHTML = `<p class="dica-fala">${esc(a.nome)} achou no Manual:</p>` + achados.map(x => htmlGrupo(x.g, x.blocos)).join('');
  destacar(corpo, termos);
  corpo.scrollTop = 0;
}

async function abrirPergunte(texto = '') {
  atualizarAssistente();
  $('#pergTermo').value = texto;
  abrirDialogo('dlgPergunte');
  if (texto) perguntar(texto); else mostrarFaq();
  setTimeout(() => $('#pergTermo').focus(), 50);
}

function ligarAssistente() {
  // (1.9.17) ícone do assistente no pé da faixa da esquerda: abre o menu com a Dica e o Pergunte
  const menu = $('#assistMenu'), btn = $('#btnAssistTrilho');
  const fecharMenu = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); });
  menu.addEventListener('click', e => {
    const b = e.target.closest('[data-assist-menu]');
    if (!b) return;
    fecharMenu();
    if (b.dataset.assistMenu === 'dica') abrirDica(); else abrirPergunte();
  });
  document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('.assist-trilho')) fecharMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) fecharMenu(); });
  $('#btnDicaImprimir').addEventListener('click', imprimirDica);
  $('#btnDicaCatalogo').addEventListener('click', () => { $('#dlgDica').close(); mostrarAba('missa'); mostrarEucaristia(true); });
  document.addEventListener('click', e => { if (e.target.closest('[data-cmd-dica]')) abrirDica(); });
  const buscar = debounce(() => perguntar($('#pergTermo').value), 300);
  $('#pergTermo').addEventListener('input', buscar);
  $('#pergTermo').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); perguntar($('#pergTermo').value); } });
  $('#btnPergFaq').addEventListener('click', () => { $('#pergTermo').value = ''; mostrarFaq(); });
  $('#btnPergManual').addEventListener('click', () => abrirManual());
  $('#pergCorpo').addEventListener('click', e => {
    const b = e.target.closest('[data-perg-busca]'), g = e.target.closest('[data-perg-grupo]');
    if (b) { $('#pergTermo').value = b.textContent; perguntar(b.dataset.pergBusca, b.textContent); }
    else if (g) {
      const grupo = Assist.manual?.[+g.dataset.pergGrupo];
      if (grupo) { $('#pergCorpo').innerHTML = htmlGrupo(grupo); destacar($('#pergCorpo'), termosDa($('#pergTermo').value)); $('#pergCorpo').scrollTop = 0; }
    }
  });
  atualizarAssistente();
}
