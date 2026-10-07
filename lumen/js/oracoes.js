'use strict';
/*
 * Biblioteca de orações: projetar na hora, a pedido do padre, ou colocar no roteiro.
 * Texto: linha em branco separa os slides; linha começando com "—" é resposta do povo (negrito).
 * Na primeira vez, cadastra algumas orações tradicionais (podem ser editadas ou apagadas).
 * Usa $, esc, uid, dividir, semAcento, toast, abrirItem... de app.js (em tempo de execução).
 */

const CATEGORIAS_ORACAO = ['Marianas', 'Anjos e Santos', 'Espírito Santo', 'Eucaristia', 'Penitência', 'Paróquia', 'Outras'];

const ORACOES_PADRAO = [
  { titulo: 'Ave-Maria', categoria: 'Marianas', texto:
    'Ave, Maria, cheia de graça,\no Senhor é convosco;\nbendita sois vós entre as mulheres,\ne bendito é o fruto do vosso ventre, Jesus.\n\n' +
    'Santa Maria, Mãe de Deus,\nrogai por nós, pecadores,\nagora e na hora de nossa morte.\nAmém.' },
  { titulo: 'Salve-Rainha', categoria: 'Marianas', texto:
    'Salve, Rainha, Mãe de misericórdia,\nvida, doçura e esperança nossa, salve!\nA vós bradamos, os degredados filhos de Eva;\n' +
    'a vós suspiramos, gemendo e chorando\nneste vale de lágrimas.\n\n' +
    'Eia, pois, advogada nossa,\nesses vossos olhos misericordiosos a nós volvei;\ne depois deste desterro mostrai-nos Jesus,\nbendito fruto do vosso ventre,\n' +
    'ó clemente, ó piedosa, ó doce sempre Virgem Maria.\n\n' +
    'Rogai por nós, santa Mãe de Deus.\n— Para que sejamos dignos das promessas de Cristo. Amém.' },
  { titulo: 'Glória ao Pai', categoria: 'Outras', texto:
    'Glória ao Pai, ao Filho e ao Espírito Santo.\nComo era no princípio, agora e sempre.\nAmém.' },
  { titulo: 'Oração a São Miguel Arcanjo', categoria: 'Anjos e Santos', texto:
    'São Miguel Arcanjo, defendei-nos no combate,\nsede o nosso refúgio\ncontra as maldades e ciladas do demônio.\n\n' +
    'Ordene-lhe Deus, instantemente o pedimos;\ne vós, príncipe da milícia celeste,\npela virtude divina,\n\n' +
    'precipitai no inferno a Satanás\ne aos outros espíritos malignos,\nque andam pelo mundo para perder as almas.\nAmém.' },
  { titulo: 'Santo Anjo do Senhor', categoria: 'Anjos e Santos', texto:
    'Santo Anjo do Senhor,\nmeu zeloso guardador,\nse a ti me confiou a piedade divina,\n' +
    'sempre me rege, me guarda,\nme governa e me ilumina.\nAmém.' },
  { titulo: 'Vinde, Espírito Santo', categoria: 'Espírito Santo', texto:
    'Vinde, Espírito Santo,\nenchei os corações dos vossos fiéis\ne acendei neles o fogo do vosso amor.\n\n' +
    'Enviai o vosso Espírito e tudo será criado.\n— E renovareis a face da terra.\n\n' +
    'Oremos: Ó Deus, que instruístes os corações dos vossos fiéis\ncom a luz do Espírito Santo,\n' +
    'concedei-nos que no mesmo Espírito\nsaibamos o que é reto\ne gozemos sempre de sua consolação.\nPor Cristo, Senhor nosso.\n— Amém.' },
  { titulo: 'Ato de Contrição', categoria: 'Penitência', texto:
    'Meu Jesus, crucificado por minha culpa,\nestou muito arrependido de vos ter ofendido,\n' +
    'porque sois tão bom\ne mereceis ser amado sobre todas as coisas.\n\n' +
    'Proponho firmemente, com o auxílio da vossa graça,\nnunca mais pecar\ne fugir das ocasiões de pecado.\n' +
    'Senhor, tende piedade de mim, perdoai-me.\nAmém.' },
  { titulo: 'Comunhão Espiritual', categoria: 'Eucaristia', texto:
    'Meu Jesus, eu creio que estais presente\nno Santíssimo Sacramento.\nAmo-vos sobre todas as coisas\ne desejo possuir-vos em minha alma.\n\n' +
    'Já que agora não posso receber-vos sacramentalmente,\nvinde ao menos espiritualmente ao meu coração.\n\n' +
    'Como se já vos tivesse recebido,\neu vos abraço e me uno todo a vós.\nNão permitais que eu jamais me separe de vós.\nAmém.' },
];

const Oracoes = { lista: [] };

const oracaoDe = it => Oracoes.lista.find(o => o.id === it?.oracaoId) || null;

async function carregarOracoes() {
  Oracoes.lista = await DB.todos('oracoes');
  await juntarOracoesRepetidas();
  if (!S.config.oracoesSemeadas) {
    for (const o of ORACOES_PADRAO) {
      if (Oracoes.lista.some(x => x.titulo === o.titulo)) continue;   // já existe (ex.: veio de um backup)
      const nova = { id: uid(), ...o, padrao: true };
      await DB.salvar('oracoes', nova);
      Oracoes.lista.push(nova);
    }
    S.config.oracoesSemeadas = true;
    salvarConfig();
  }
}

// Orações idênticas (mesmo título, categoria e texto) viram uma só. Os roteiros que usavam a cópia
// passam a usar a que fica. (Aconteceu com as orações-padrão gravadas duas vezes: cada computador novo grava as
// suas antes de ligar a nuvem, e depois a nuvem traz as dos outros.)
// Fica sempre a de MENOR id — todos os computadores escolhem a mesma — e a cópia é apagada também na nuvem;
// senão ela voltava na próxima sincronização.
async function juntarOracoesRepetidas() {
  const norm = t => (t || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  const vistas = new Map(), troca = {};
  for (const o of [...Oracoes.lista].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const k = [norm(o.categoria), norm(o.titulo), norm(o.texto)].join('\u0001');
    if (vistas.has(k)) troca[o.id] = vistas.get(k).id; else vistas.set(k, o);
  }
  const ids = Object.keys(troca);
  if (!ids.length) return;
  for (const r of S.roteiros || []) {
    let mudou = false;
    for (const it of r.itens || []) if (it.oracaoId && troca[it.oracaoId]) { it.oracaoId = troca[it.oracaoId]; mudou = true; }
    if (mudou) await DB.salvar('roteiros', r);
  }
  for (const id of ids) {
    await DB.remover('oracoes', id);
    // ao abrir, a sincronia ainda não está "escutando" as remoções: registra aqui para apagar na nuvem também
    if (typeof Sync !== 'undefined' && typeof ligadaSync === 'function' && ligadaSync() &&
        !Sync.estado.removidos.some(x => x.store === 'oracoes' && x.id === id)) {
      Sync.estado.removidos.push({ store: 'oracoes', id, quando: Date.now() });
      Sync.sujo = true;
    }
  }
  if (typeof salvarEstadoSync === 'function') salvarEstadoSync();
  Oracoes.lista = Oracoes.lista.filter(o => !troca[o.id]);
  console.info(`Orações repetidas juntadas: ${ids.length}.`);
  return ids.length;
}

function categoriasUsadas() {
  const extras = Oracoes.lista.map(o => o.categoria).filter(c => c && !CATEGORIAS_ORACAO.includes(c));
  return [...CATEGORIAS_ORACAO, ...new Set(extras)];
}

function renderOracoes() {
  const el = $('#listaOracoes');
  if (!Oracoes.lista.length) { el.innerHTML = '<p class="vazio">Nenhuma oração. Clique em <b>Nova</b>.</p>'; return; }
  const termo = semAcento($('#buscaOracao').value.trim());
  const lista = Oracoes.lista.filter(o => !termo || semAcento(`${o.titulo} ${o.categoria} ${o.texto}`).includes(termo));
  if (!lista.length) { el.innerHTML = '<p class="vazio">Nenhuma oração encontrada.</p>'; return; }
  const selId = S.atual?.item.tipo === 'oracao' && S.atual.rIdx < 0 ? S.atual.item.oracaoId : null;
  // Uma pasta por categoria, como nos Cantos (começam fechadas; com busca digitada ficam abertas)
  el.innerHTML = categoriasUsadas().map(cat => {
    const l = lista.filter(o => (o.categoria || 'Outras') === cat).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
    if (!l.length) return '';
    const f = !termo && Recolher.fechado('oracao:' + cat, true);
    return `<button class="pasta" data-pasta="${esc(cat)}"><span class="seta">${f ? '▸' : '▾'}</span>📁 ${esc(cat)}<span class="n">${l.length}</span></button>
      ${f ? '' : `<div class="lista pasta-itens">${l.map(o => `
      <div class="it ${o.id === selId ? 'sel' : ''}" data-id="${o.id}" title="Duplo clique para editar">
        <span class="tit">${esc(o.titulo)}</span></div>`).join('')}</div>`}`;
  }).join('');
}

function opcoesOracoes(sel) {
  return '<option value="">— escolher oração —</option>' + categoriasUsadas().map(cat => {
    const l = Oracoes.lista.filter(o => (o.categoria || 'Outras') === cat).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
    return l.length ? `<optgroup label="${esc(cat)}">${l.map(o => `<option value="${o.id}" ${o.id === sel ? 'selected' : ''}>${esc(o.titulo)}</option>`).join('')}</optgroup>` : '';
  }).join('');
}

// ---------- Editor ----------

let aoSalvarOracao = null;

function abrirEditorOracao(o, aoSalvar) {
  const f = $('#formOracao');
  const x = o || { id: '', titulo: '', categoria: 'Paróquia', texto: '' };
  f.dataset.id = x.id;
  f.titulo.value = x.titulo;
  $('#categoriasOracao').innerHTML = categoriasUsadas().map(c => `<option value="${esc(c)}">`).join('');
  f.categoria.value = x.categoria || 'Outras';
  f.texto.value = x.texto || '';
  $('#btnExcluirOracao').hidden = !x.id;
  aoSalvarOracao = aoSalvar || null;
  const dlg = $('#dlgOracao');
  dlg.returnValue = '';
  dlg.showModal();
  (x.id ? f.texto : f.titulo).focus();
}

// Uma oração que já existe com o mesmo título, ou com o texto quase igual (60% ou mais das sequências de 3 palavras)
function oracaoParecida(titulo, texto) {
  const n = t => semAcento(t || '').replace(/[^a-z0-9]+/g, ' ').trim();
  const nt = n(titulo), tri = trigramasLetra(texto);
  let melhor = null, nota = 0;
  for (const o of Oracoes.lista) {
    if (nt && n(o.titulo) === nt) return o;
    const t2 = trigramasLetra(o.texto);
    if (!tri.size || !t2.size) continue;
    let comum = 0; tri.forEach(x => t2.has(x) && comum++);
    const j = comum / (tri.size + t2.size - comum);
    if (j > nota) { nota = j; melhor = o; }
  }
  return nota >= 0.6 ? melhor : null;
}

async function salvarOracaoDoEditor() {
  const f = $('#formOracao');
  const antiga = Oracoes.lista.find(o => o.id === f.dataset.id);
  const o = {
    ...(antiga || {}),
    id: f.dataset.id || uid(),
    titulo: f.titulo.value.trim(),
    categoria: f.categoria.value.trim() || 'Outras',
    texto: f.texto.value.replace(/\r/g, '').trim(),
  };
  await DB.salvar('oracoes', o);
  const i = Oracoes.lista.findIndex(x => x.id === o.id);
  if (i < 0) Oracoes.lista.push(o); else Oracoes.lista[i] = o;
  if (aoSalvarOracao) aoSalvarOracao(o);
  aposMudarOracoes();
  toast('Oração salva.');
}

function aposMudarOracoes() {
  renderOracoes();
  renderRoteiroLista();
  if (S.atual) { atualizarSlides(); renderCabecalho(); }
}

function ligarOracoes() {
  $('#buscaOracao').addEventListener('input', renderOracoes);
  // Enter na busca abre a primeira oração encontrada (rápido quando o padre pede)
  $('#buscaOracao').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const primeira = $('#listaOracoes .it');
    if (primeira) { primeira.click(); e.target.blur(); }
  });
  $('#btnNovaOracao').addEventListener('click', () => abrirEditorOracao(null, o => abrirItem({ tipo: 'oracao', oracaoId: o.id })));
  $('#listaOracoes').addEventListener('click', e => {
    const pasta = e.target.closest('[data-pasta]');
    if (pasta) { Recolher.alternar('oracao:' + pasta.dataset.pasta, true); return renderOracoes(); }
    const row = e.target.closest('.it');
    if (!row) return;
    abrirItem({ tipo: 'oracao', oracaoId: row.dataset.id });
    renderOracoes();
  });
  $('#listaOracoes').addEventListener('dblclick', e => {
    const row = e.target.closest('.it');
    if (row) abrirEditorOracao(Oracoes.lista.find(o => o.id === row.dataset.id));
  });
  // Salva no envio do formulário (mais confiável que o evento "close" do diálogo)
  $('#formOracao').addEventListener('submit', e => {
    if (e.submitter?.value !== 'salvar') return;
    const f = $('#formOracao');
    // oração NOVA parecida com uma que já existe: oferece usar a existente em vez de criar outra (como nos cantos)
    if (!f.dataset.id) {
      const p = oracaoParecida(f.titulo.value, f.texto.value);
      if (p && confirm(`Já existe uma oração parecida:\n\n"${p.titulo}" (${p.categoria || 'Outras'})\n\n` +
        'OK = usar essa (não cria outra)\nCancelar = salvar esta como uma oração nova')) {
        e.preventDefault();
        $('#dlgOracao').close();
        if (aoSalvarOracao) aoSalvarOracao(p); else abrirItem({ tipo: 'oracao', oracaoId: p.id });
        return toast(`Usando a oração que já existia: "${p.titulo}".`);
      }
    }
    salvarOracaoDoEditor();
  });
  $('#btnExcluirOracao').addEventListener('click', async () => {
    const id = $('#formOracao').dataset.id;
    if (!id || !confirm('Excluir esta oração? Os roteiros que a usam ficarão com o espaço vazio.')) return;
    await DB.remover('oracoes', id);
    Oracoes.lista = Oracoes.lista.filter(o => o.id !== id);
    $('#dlgOracao').close('');
    if (S.atual?.rIdx < 0 && S.atual.item.oracaoId === id) S.atual = null;
    aposMudarOracoes();
    if (!S.atual) { renderCabecalho(); renderSlides(); }
    toast('Oração excluída.');
  });
}
