'use strict';
/*
 * Ordinário da Missa — partes fixas e respostas da assembleia.
 * Cada string é um slide. Quem fala vem no começo da linha (P., T., L.); T. = povo (em negrito).
 * IMPORTANTE: confira os textos com o Missal Romano adotado na sua paróquia (3ª edição, CNBB)
 * e ajuste aqui o que for necessário.
 */

const Ordinario = (() => {
  // Quem fala vem no começo da linha, como no folheto: P. (padre), T. (todos — o povo, em negrito), L. (leitor).
  // A letra só aparece onde a fala muda: o slide que continua a fala anterior começa sem letra (o do povo segue em negrito).
  const grupos = [
    {
      grupo: 'Ritos Iniciais', partes: [
        { id: 'saudacao', titulo: 'Saudação', slides: [      // como a paróquia usa (1.6.7): só o sinal da cruz
          'P. Em nome do Pai e do Filho e do Espírito Santo.\nT. Amém.',
        ] },
        { id: 'ato-penitencial', titulo: 'Ato Penitencial (Confesso)', slides: [
          'T. Confesso a Deus todo-poderoso\ne a vós, irmãos e irmãs,\nque pequei muitas vezes\npor pensamentos e palavras,\natos e omissões,',
          'por minha culpa, minha culpa,\nminha máxima culpa.',
          'E peço à Virgem Maria,\naos anjos e santos\ne a vós, irmãos e irmãs,\nque rogueis por mim a Deus, nosso Senhor.',
          'P. Deus todo-poderoso tenha compaixão de nós,\nperdoe os nossos pecados\ne nos conduza à vida eterna.\nT. Amém.',
        ] },
        { id: 'kyrie', titulo: 'Senhor, tende piedade', slides: [
          'P. Senhor, tende piedade de nós.\nT. Senhor, tende piedade de nós.',
          'P. Cristo, tende piedade de nós.\nT. Cristo, tende piedade de nós.',
          'P. Senhor, tende piedade de nós.\nT. Senhor, tende piedade de nós.',
        ] },
        { id: 'gloria', titulo: 'Glória', slides: [
          'T. Glória a Deus nas alturas,\ne paz na terra aos homens por ele amados.',
          'Senhor Deus, rei dos céus, Deus Pai todo-poderoso:\nnós vos louvamos, nós vos bendizemos,\nnós vos adoramos, nós vos glorificamos,\nnós vos damos graças por vossa imensa glória.',
          'Senhor Jesus Cristo, Filho Unigênito,\nSenhor Deus, Cordeiro de Deus, Filho de Deus Pai.',
          'Vós que tirais o pecado do mundo, tende piedade de nós.\nVós que tirais o pecado do mundo, acolhei a nossa súplica.\nVós que estais à direita do Pai, tende piedade de nós.',
          'Só vós sois o Santo, só vós, o Senhor,\nsó vós, o Altíssimo, Jesus Cristo,\ncom o Espírito Santo, na glória de Deus Pai.\nAmém.',
        ] },
        // pedida pela paróquia (1.6.14) para as Missas da semana, cujo folheto (Paulus) não traz a Coleta
        { id: 'coleta', titulo: 'Oração da Coleta', slides: [
          'P. Deus eterno e todo-poderoso,\nque, no vosso imenso amor de Pai,\nnos concedeis mais do que merecemos e pedimos,\ninfundi em nós a vossa misericórdia,',
          'para perdoar o que nos pesa na consciência\ne para nos dar mais do que a oração ousa pedir.',
          'Por nosso Senhor Jesus Cristo, vosso Filho,\nque é Deus e convosco vive e reina,\nna unidade do Espírito Santo,\npor todos os séculos dos séculos.\nT. Amém.',
        ] },
      ],
    },
    {
      grupo: 'Liturgia da Palavra', partes: [
        { id: 'resp-leitura', titulo: 'Resposta às leituras', slides: ['L. Palavra do Senhor.\nT. Graças a Deus.'] },
        { id: 'resp-evangelho', titulo: 'Diálogo do Evangelho', slides: [
          'P. O Senhor esteja convosco.\nT. Ele está no meio de nós.',
          'P. Proclamação do Evangelho de Jesus Cristo segundo…\nT. Glória a vós, Senhor.',
          'P. Palavra da Salvação.\nT. Glória a vós, Senhor.',
        ] },
        { id: 'creio-niceno', titulo: 'Creio (Niceno-Constantinopolitano)', slides: [
          'T. Creio em um só Deus, Pai todo-poderoso,\ncriador do céu e da terra,\nde todas as coisas visíveis e invisíveis.',
          'Creio em um só Senhor, Jesus Cristo,\nFilho Unigênito de Deus,\nnascido do Pai antes de todos os séculos:',
          'Deus de Deus, luz da luz,\nDeus verdadeiro de Deus verdadeiro;\ngerado, não criado, consubstancial ao Pai.\nPor ele todas as coisas foram feitas.',
          'E por nós, homens, e para a nossa salvação,\ndesceu dos céus:\ne se encarnou pelo Espírito Santo,\nno seio da Virgem Maria, e se fez homem.',
          'Também por nós foi crucificado sob Pôncio Pilatos;\npadeceu e foi sepultado.\nRessuscitou ao terceiro dia, conforme as Escrituras,\ne subiu aos céus, onde está sentado à direita do Pai.',
          'E de novo há de vir, em sua glória,\npara julgar os vivos e os mortos;\ne o seu reino não terá fim.',
          'Creio no Espírito Santo, Senhor que dá a vida,\ne procede do Pai e do Filho;\ne com o Pai e o Filho é adorado e glorificado:\nele que falou pelos profetas.',
          'Creio na Igreja, una, santa, católica e apostólica.\nProfesso um só batismo para remissão dos pecados.\nE espero a ressurreição dos mortos\ne a vida do mundo que há de vir. Amém.',
        ] },
        { id: 'creio-apostolico', titulo: 'Creio (Símbolo dos Apóstolos)', slides: [
          'T. Creio em Deus Pai todo-poderoso,\ncriador do céu e da terra;\ne em Jesus Cristo, seu único Filho, nosso Senhor;',
          'que foi concebido pelo poder do Espírito Santo;\nnasceu da Virgem Maria,\npadeceu sob Pôncio Pilatos,\nfoi crucificado, morto e sepultado;',
          'desceu à mansão dos mortos;\nressuscitou ao terceiro dia;\nsubiu aos céus,\nestá sentado à direita de Deus Pai todo-poderoso,\ndonde há de vir a julgar os vivos e os mortos.',
          'Creio no Espírito Santo,\nna santa Igreja católica,\nna comunhão dos santos,\nna remissão dos pecados,\nna ressurreição da carne,\nna vida eterna. Amém.',
        ] },
      ],
    },
    {
      grupo: 'Liturgia Eucarística', partes: [
        { id: 'orai-irmaos', titulo: 'Orai, irmãos e irmãs', slides: [
          'P. Orai, irmãos e irmãs,\npara que o meu e o vosso sacrifício\nseja aceito por Deus Pai todo-poderoso.',
          'T. Receba o Senhor por tuas mãos este sacrifício,\npara glória do seu nome,\npara nosso bem e de toda a santa Igreja.',
        ] },
        { id: 'prefacio', titulo: 'Diálogo do Prefácio', slides: [
          'P. O Senhor esteja convosco.\nT. Ele está no meio de nós.',
          'P. Corações ao alto.\nT. O nosso coração está em Deus.',
          'P. Demos graças ao Senhor, nosso Deus.\nT. É nosso dever e nossa salvação.',
        ] },
        { id: 'santo', titulo: 'Santo', slides: [
          'T. Santo, Santo, Santo,\nSenhor, Deus do universo!\nO céu e a terra proclamam a vossa glória.\nHosana nas alturas!',
          'Bendito o que vem em nome do Senhor!\nHosana nas alturas!',
        ] },
        { id: 'misterio-fe', titulo: 'Mistério da Fé', slides: [
          'P. Mistério da fé!\nT. Anunciamos, Senhor, a vossa morte\ne proclamamos a vossa ressurreição.\nVinde, Senhor Jesus!',
          'P. Mistério da fé e do amor!\nT. Todas as vezes que comemos deste pão\ne bebemos deste cálice,\nanunciamos, Senhor, a vossa morte,\nenquanto esperamos a vossa vinda!',
          'P. Mistério da fé para a salvação do mundo!\nT. Salvador do mundo, salvai-nos,\nvós que nos libertastes\npela cruz e ressurreição.',
        ] },
        { id: 'doxologia', titulo: 'Doxologia final', slides: [
          'P. Por Cristo, com Cristo, e em Cristo,\na vós, Deus Pai todo-poderoso,\nna unidade do Espírito Santo,\ntoda honra e toda glória,\npor todos os séculos dos séculos.\nT. Amém.',
        ] },
      ],
    },
    {
      grupo: 'Rito da Comunhão', partes: [
        // (1.6.14) o convite do padre ao Pai-Nosso, como no folheto do domingo; o Pai-Nosso logo depois emenda sem título
        { id: 'rito-comunhao', titulo: 'Rito da Comunhão', slides: [
          'P. Obedientes à palavra do Salvador\ne formados por seu divino ensinamento,\nousamos dizer:',
        ] },
        // (1.6.14, pedido da paróquia) o Pai-Nosso continua até o abraço da paz: o folheto não traz o que vem entre ele e o
        // Cordeiro, e o "Amém" só vem depois da oração pela paz
        { id: 'pai-nosso', titulo: 'Pai-Nosso e Rito da Paz', slides: [
          'T. Pai nosso que estais nos céus,\nsantificado seja o vosso nome;\nvenha a nós o vosso Reino;\nseja feita a vossa vontade,\nassim na terra como no céu.',
          'O pão nosso de cada dia nos dai hoje;\nperdoai-nos as nossas ofensas,\nassim como nós perdoamos\na quem nos tem ofendido;',
          'e não nos deixeis cair em tentação,\nmas livrai-nos do mal.',
          'P. Livrai-nos de todos os males, ó Pai,\ne dai-nos hoje a vossa paz.\nAjudados pela vossa misericórdia,\nsejamos sempre livres do pecado\ne protegidos de todos os perigos,',
          'enquanto aguardamos a feliz esperança\ne a vinda do nosso Salvador, Jesus Cristo.\nT. Vosso é o reino, o poder e a glória para sempre.',
          'P. Senhor Jesus Cristo,\ndissestes aos vossos Apóstolos:\nEu vos deixo a paz,\neu vos dou a minha paz.',
          'Não olheis os nossos pecados,\nmas a fé que anima vossa Igreja;\ndai-lhe, segundo o vosso desejo,\na paz e a unidade.',
          'Vós que sois Deus\ncom o Pai e o Espírito Santo.\nT. Amém.',
          'P. A paz do Senhor esteja sempre convosco.\nT. O amor de Cristo nos uniu.',
          'P. Em Jesus, que nos tornou todos irmãos e irmãs,\nsaudai-vos com um sinal de reconciliação e de paz.',
        ] },
        { id: 'paz', titulo: 'Saudação da Paz', slides: [
          'P. A paz do Senhor esteja sempre convosco.\nT. O amor de Cristo nos uniu.',
        ] },
        { id: 'cordeiro', titulo: 'Cordeiro de Deus', slides: [
          'T. Cordeiro de Deus, que tirais o pecado do mundo,\ntende piedade de nós.',
          'Cordeiro de Deus, que tirais o pecado do mundo,\ntende piedade de nós.',
          'Cordeiro de Deus, que tirais o pecado do mundo,\ndai-nos a paz.',
        ] },
        // (1.6.14) texto da 3ª edição do Missal; entra sozinho depois do Cordeiro na importação do folheto
        { id: 'eis-cordeiro', titulo: 'Eis o Cordeiro de Deus', slides: [
          'P. Provai e vede como o Senhor é bom;\nfeliz quem nele encontra o seu refúgio.\nEis o Cordeiro de Deus,\nque tira o pecado do mundo.',
          'T. Senhor, eu não sou digno(a)\nde que entreis em minha morada,\nmas dizei uma palavra\ne serei salvo(a).',
          'P. Que o Corpo e o Sangue de Cristo\nnos guarde para a vida eterna.\nT. Amém.',
        ] },
      ],
    },
    {
      grupo: 'Ritos Finais', partes: [
        { id: 'bencao-final', titulo: 'Bênção e despedida', slides: [
          'P. O Senhor esteja convosco.\nT. Ele está no meio de nós.',
          'P. Abençoe-vos Deus todo-poderoso,\nPai e Filho e Espírito Santo.\nT. Amém.',
          'P. Ide em paz, e o Senhor vos acompanhe.\nT. Graças a Deus.',
        ] },
      ],
    },
  ];

  const indice = new Map(grupos.flatMap(g => g.partes.map(p => [p.id, p])));

  // Modelos de roteiro. Cada item vira uma linha do roteiro para ser preenchida.
  const modelos = {
    dominical: [
      { tipo: 'canto', momento: 'Entrada' },
      { tipo: 'ordinario', parte: 'saudacao' },
      { tipo: 'ordinario', parte: 'ato-penitencial' },
      { tipo: 'ordinario', parte: 'kyrie' },
      { tipo: 'canto', momento: 'Glória' },
      { tipo: 'leitura', titulo: '1ª Leitura', ref: '' },
      { tipo: 'salmo', titulo: 'Salmo Responsorial', ref: '', refrao: '', texto: '' },
      { tipo: 'leitura', titulo: '2ª Leitura', ref: '' },
      { tipo: 'canto', momento: 'Aclamação ao Evangelho' },
      { tipo: 'leitura', titulo: 'Evangelho', ref: '', evangelho: true },
      { tipo: 'homilia', titulo: 'Homilia', texto: '', usarCapa: true, mostrarRef: true },
      { tipo: 'ordinario', parte: 'creio-niceno' },
      { tipo: 'preces', titulo: 'Oração dos Fiéis', resposta: 'Senhor, escutai a nossa prece.', convite: '', texto: '', conclusao: '' },
      { tipo: 'canto', momento: 'Ofertório' },
      { tipo: 'ordinario', parte: 'orai-irmaos' },
      { tipo: 'ordinario', parte: 'prefacio' },
      { tipo: 'canto', momento: 'Santo' },
      { tipo: 'ordinario', parte: 'misterio-fe' },
      { tipo: 'ordinario', parte: 'pai-nosso' },
      { tipo: 'canto', momento: 'Cordeiro' },
      { tipo: 'ordinario', parte: 'eis-cordeiro' },
      { tipo: 'canto', momento: 'Comunhão' },
      { tipo: 'canto', momento: 'Ação de Graças' },
      { tipo: 'ordinario', parte: 'bencao-final' },
      { tipo: 'canto', momento: 'Final' },
    ],
    semanal: [
      { tipo: 'canto', momento: 'Entrada' },
      { tipo: 'ordinario', parte: 'saudacao' },
      { tipo: 'ordinario', parte: 'ato-penitencial' },
      { tipo: 'ordinario', parte: 'kyrie' },
      { tipo: 'ordinario', parte: 'coleta' },                // 1.6.14: o folheto da semana (Paulus) não traz a Coleta
      { tipo: 'leitura', titulo: '1ª Leitura', ref: '' },
      { tipo: 'salmo', titulo: 'Salmo Responsorial', ref: '', refrao: '', texto: '' },
      { tipo: 'canto', momento: 'Aclamação ao Evangelho' },
      { tipo: 'leitura', titulo: 'Evangelho', ref: '', evangelho: true },
      { tipo: 'homilia', titulo: 'Homilia', texto: '', usarCapa: true, mostrarRef: true },
      { tipo: 'preces', titulo: 'Oração dos Fiéis', resposta: 'Senhor, escutai a nossa prece.', convite: '', texto: '', conclusao: '' },
      { tipo: 'canto', momento: 'Ofertório' },
      { tipo: 'ordinario', parte: 'orai-irmaos' },
      { tipo: 'ordinario', parte: 'prefacio' },
      { tipo: 'ordinario', parte: 'santo' },
      { tipo: 'ordinario', parte: 'misterio-fe' },
      { tipo: 'ordinario', parte: 'rito-comunhao' },         // 1.6.14: convite ao Pai-Nosso (o folheto da semana não traz)
      { tipo: 'ordinario', parte: 'pai-nosso' },
      { tipo: 'ordinario', parte: 'cordeiro' },
      { tipo: 'ordinario', parte: 'eis-cordeiro' },
      { tipo: 'canto', momento: 'Comunhão' },
      { tipo: 'ordinario', parte: 'bencao-final' },
      { tipo: 'canto', momento: 'Final' },
    ],
  };

  // Texto editado pela paróquia (1.6.5): Orações → Missa → duplo clique (ou ✎ Editar texto no item). Fica em config
  // 'ordinario' e vai pela nuvem para os outros computadores; o texto original continua aqui para "Restaurar".
  let editados = {};
  const base = id => {
    const p = indice.get(id);
    if (!p) return null;
    return editados[id]?.length ? { ...p, slides: editados[id], editado: true } : p;
  };

  // (1.9.20, pedido do Luciano) Fórmulas do Missal: a saudação, o Mistério da Fé e a bênção final têm mais de uma.
  // O programa não traz textos novos do Missal: as fórmulas que ainda não têm texto aqui a paróquia escreve uma vez
  // (✎ Editar texto, com a fórmula escolhida) e o texto fica guardado nos computadores dela, como as outras edições.
  // { id, nome, pag (id da página na tabela 📖), proprio: texto próprio da fórmula (chave "parte#fórmula") }
  const CRUZ = 'P. Em nome do Pai e do Filho e do Espírito Santo.\nT. Amém.';
  // invocações alternativas da 3ª fórmula, por tempo: só algumas palavras para reconhecer cada uma (o texto, a paróquia)
  const INVOCACOES = [
    ['Tempo Comum', /comum/i, ['…o caminho que leva ao Pai', '…o vosso perdão a Pedro', '…não para condenar, mas para perdoar', '…procurar quem estava perdido', '…a plenitude da verdade e da graça']],
    ['Advento', /advento/i, ['…viestes ao mundo para nos salvar', '…o defensor dos pobres', '…visitar vosso povo na paz']],
    ['Natal', /natal|epifania/i, ['…nascendo da Virgem Maria', '…rei da paz']],
    ['Quaresma', /quaresma/i, ['…perdoastes o ladrão arrependido', '…na água e no Espírito', '…da morte para a vida']],
    ['Páscoa', /p[áa]scoa|pascal|ascens|pentecostes/i, ['…nossa paz', '…o eterno sacerdote da nova Aliança', '…nos presenteastes com o dom do Espírito', '…levastes cativo o cativeiro', '…pelo Espírito Santo estais presente']],
  ];
  const formulas = id => {
    // (1.9.22, Luciano 24/11/2026) as oito do Missal (a até h) e a do bispo. Os ids não são as letras: o "c" de antes
    // (1.9.20) era "O Senhor esteja convosco", que no Missal é a h; o id ficou para não mudar os roteiros já salvos.
    if (id === 'saudacao') return [
      { id: '', nome: 'Só o sinal da cruz' },
      { id: 'a', nome: 'Saudação A: "A graça de nosso Senhor Jesus Cristo…"', pag: 'mr-inicio', proprio: true },
      { id: 'b', nome: 'Saudação B: "A graça e a paz de Deus, nosso Pai…"', pag: 'mr-inicio', proprio: true },
      { id: 'constancia', nome: 'Saudação C: "O Senhor, que encaminha os nossos corações…"', pag: 'mr-saudacoes', proprio: true },
      { id: 'esperanca', nome: 'Saudação D: "O Deus da esperança…"', pag: 'mr-saudacoes', proprio: true },
      { id: 'paz-fe', nome: 'Saudação E: "A vós, irmãos, paz e fé…"', pag: 'mr-saudacoes', proprio: true },
      { id: 'eleitos', nome: 'Saudação F: "Irmãos eleitos…"', pag: 'mr-saudacoes', proprio: true },
      { id: 'que-vem', nome: 'Saudação G: "…daquele que é, que era e que vem"', pag: 'mr-saudacoes', proprio: true },
      { id: 'c', nome: 'Saudação H: "O Senhor esteja convosco"', pag: 'mr-saudacoes', proprio: true, padrao: ['P. O Senhor esteja convosco.\nT. Ele está no meio de nós.'] },
      { id: 'bispo', nome: 'Saudação do Bispo: "A paz esteja convosco"', pag: 'mr-saud-bispo', proprio: true },
    ];
    if (id === 'misterio-fe') return [
      { id: '', nome: 'As três aclamações (o padre escolhe na hora)' },
      { id: '1', nome: '1ª: "Anunciamos, Senhor, a vossa morte…"', n: 0 },
      { id: '2', nome: '2ª: "Todas as vezes que comemos deste pão…"', n: 1 },
      { id: '3', nome: '3ª: "Salvador do mundo, salvai-nos…"', n: 2 },
    ];
    // (1.9.23, Luciano 26/11/2026) Ato Penitencial: a 1ª é o Confesso de sempre; a 2ª ("Tende compaixão") e a 3ª
    // (invocações com "Senhor, tende piedade", que então não se repete no item seguinte) a paróquia escreve uma vez,
    // ou traz todas de um arquivo .txt (✎ Editar texto › 📄). A 3ª tem as invocações do Missal e as de cada tempo.
    if (id === 'ato-penitencial') return [
      { id: '', nome: '1ª fórmula: "Confesso a Deus todo-poderoso…"' },
      { id: '2', nome: '2ª fórmula: "Tende compaixão de nós, Senhor…"', proprio: true },
      { id: '3', nome: '3ª fórmula: "Senhor, que viestes salvar os corações arrependidos…" (invocações do Missal)', proprio: true, kyrie: true },
      ...INVOCACOES.flatMap(([g, re, lista]) => lista.map((inc, i) => ({
        id: `3-${g.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}-${i + 1}`, nome: `3ª · ${g} ${i + 1}: "${inc}"`,
        grupo: `3ª fórmula · ${g}`, tempo: re, proprio: true, kyrie: true }))),
    ];
    if (id === 'bencao-final' && typeof opcoesBencao === 'function')
      return opcoesBencao().map(([k, nome, pag]) => ({ id: k === 'simples' ? '' : k, nome: nome.replace(/ \(anote.*\)$/, ''), pag, proprio: k !== 'simples' }));
    return null;
  };
  const formulaDe = (id, f) => (formulas(id) || []).find(x => x.id === (f || '')) || null;
  const textoProprio = (id, f) => {
    const fo = formulaDe(id, f);
    if (!fo?.proprio) return null;
    return editados[id + '#' + f]?.length ? { slides: editados[id + '#' + f], editado: true } : fo.padrao ? { slides: fo.padrao } : null;
  };
  // a parte com a fórmula escolhida; falta = a fórmula ainda não tem texto (o telão mostra a forma de sempre)
  const parte = (id, f) => {
    const p = base(id);
    if (!p || !f) return p;
    const fo = formulaDe(id, f);
    if (!fo) return p;
    if (fo.n != null) return p.slides[fo.n] ? { ...p, slides: [p.slides[fo.n]], formula: fo } : p;
    const tp = textoProprio(id, f);
    if (id === 'ato-penitencial') {     // a absolvição (último slide da 1ª) fecha as três fórmulas
      const t = { ...p, titulo: 'Ato Penitencial', formula: fo };
      return tp ? { ...t, slides: [...tp.slides, p.slides.at(-1)] } : { ...t, falta: true };
    }
    if (!tp) return { ...p, formula: fo, falta: true };
    if (id === 'saudacao') return { ...p, slides: [p.slides[0] || CRUZ, ...tp.slides], formula: fo };
    if (id === 'bencao-final') return { ...p, slides: [p.slides[0], ...tp.slides, p.slides.at(-1)], formula: fo };   // "O Senhor esteja…" e a despedida ficam
    return p;
  };
  return {
    grupos, modelos, parte, formulas, formulaDe, textoProprio,
    editados: () => ({ ...editados }),
    original: id => indice.get(id) || null,
    usarEditados: t => { editados = t && typeof t === 'object' ? { ...t } : {}; },
    editar: (id, slides) => { if (slides && slides.length) editados[id] = slides; else delete editados[id]; return { ...editados }; },
  };
})();

async function carregarOrdinarioEditado() {
  const r = await DB.obter('config', 'ordinario');
  // texto editado que ficou igual ao original (ex.: o original passou a ser o da paróquia) deixa de contar como editado
  const textos = { ...(r?.valor?.textos || {}) };
  for (const [id, sl] of Object.entries(textos))
    if (Ordinario.original(id) && sl.join('\n\n') === Ordinario.original(id).slides.join('\n\n')) delete textos[id];
    else if (!Array.isArray(sl) || !sl.length) delete textos[id];
  Ordinario.usarEditados(textos);
}

// Editor das partes fixas da Missa (mesma janela das orações não serve: aqui não há categoria nem apagar)
// (1.9.20) f = fórmula com texto próprio (saudação A/B/C, bênção solene…): edita só a parte própria dela, guardada
// como "parte#fórmula"; o sinal da cruz, o "O Senhor esteja convosco" e a despedida continuam na parte de sempre
function abrirEditorOrdinario(id, f) {
  const p = Ordinario.parte(id), orig = Ordinario.original(id);
  if (!p) return;
  const fo = f ? Ordinario.formulaDe(id, f) : null, proprio = fo?.proprio;
  const tp = proprio ? Ordinario.textoProprio(id, f) : null;
  const dlg = $('#dlgOrdinario');
  dlg.dataset.id = proprio ? id + '#' + f : id;
  $('#ordTitulo').textContent = proprio ? `${id === 'ato-penitencial' ? 'Ato Penitencial' : p.titulo}: ${fo.nome.replace(/:\s*".*$/, '').replace(/^Saudação /, 'fórmula ')}` : p.titulo;
  $('#ordTexto').value = proprio ? (tp?.slides || []).join('\n\n') : p.slides.join('\n\n');
  $('#ordArquivo').hidden = id !== 'ato-penitencial';
  $('#ordTexto').placeholder = proprio ? (id === 'saudacao'
    ? 'Escreva só a saudação desta fórmula, com P. e T. (o sinal da cruz já vem antes). Linha em branco = outro slide.'
    : id === 'ato-penitencial'
    ? 'Escreva só as falas desta fórmula, com P. e T. (a absolvição "Deus todo-poderoso tenha compaixão…" já vem depois). Linha em branco = outro slide.\n\nOu traga todas as fórmulas de uma vez de um arquivo .txt (botão 📄).'
    : 'Escreva só a bênção desta fórmula, com P. e T. ("O Senhor esteja convosco" vem antes e o "Ide em paz" depois). Linha em branco = outro slide.') : '';
  const editado = proprio ? !!tp?.editado : !!p.editado;
  $('#ordRestaurar').hidden = !editado;
  $('#ordAviso').hidden = !editado;
  dlg.returnValue = '';
  dlg.showModal();
  $('#ordTexto').focus();
  $('#ordOriginal').textContent = proprio
    ? (fo.padrao ? fo.padrao.join('\n\n') : 'O MiguelAngelus não traz o texto desta fórmula: copie do Missal da paróquia. Fica guardado só nos computadores da paróquia.')
    : orig.slides.join('\n\n');
}

async function salvarOrdinario(id, slides) {
  const textos = Ordinario.editar(id, slides);
  await DB.salvar('config', { id: 'ordinario', valor: { textos } });
  renderOrdinario();
  renderRoteiroLista();
  if (S.atual) { atualizarSlides(); renderCabecalho(); }
}

// (1.9.23) 📄 Ato Penitencial de um arquivo .txt da paróquia (como o do Luciano: "Primeira/Segunda/Terceira fórmula" e
// as "Invocações alternativas" por tempo). Lê só as falas: convites ("Irmãos e irmãs…", os Ⓑ) e rubricas ficam de fora.
// Devolve { "ato-penitencial": [...] (só se o Confesso do arquivo for diferente), "ato-penitencial#2": [...], … }.
function lerAtoPenitencialTxt(txt) {
  const L = String(txt).replace(/\r/g, '').split('\n').map(l => l.replace(/\s+/g, ' ').replace(/,(?=[A-Za-zÀ-ú])/g, ', ').trim());
  const achar = (re, de = 0, ate = L.length) => { for (let i = Math.max(0, de); i < ate; i++) if (re.test(L[i])) return i; return -1; };
  const rubrica = l => /:$/.test(l);
  const quem = l => /^(o povo|todos)/i.test(l) ? 'T' : /^(o sacerdote|o di[áa]cono)/i.test(l) ? 'P' : null;
  // falas de..ate: a rubrica muda quem fala; com quebrar, a volta do P. depois do T. começa outro slide
  const falas = (de, ate, quebrar, ini = 'P') => {
    const slides = [];
    let atual = [], q = ini, ult = null;
    for (let i = de; i < ate; i++) {
      const l = L[i];
      if (!l || /^_{3,}/.test(l)) continue;
      if (rubrica(l)) { q = quem(l) || q; continue; }
      if (quebrar && q === 'P' && ult === 'T' && atual.length) { slides.push(atual.join('\n')); atual = []; ult = null; }
      atual.push(q !== ult ? `${q}. ${l}` : l); ult = q;
    }
    if (atual.length) slides.push(atual.join('\n'));
    return slides;
  };
  const absolvicao = de => achar(/^segue-se a absolvi/i, de);
  const out = {};
  const iF2 = achar(/segunda f[óo]rmula/i), iF3 = achar(/terceira f[óo]rmula/i);
  const iAlt = achar(/invoca[çc][õo]es alternativas/i), iFim = achar(/^seguem-se as invoca/i, iAlt);
  // 1ª: o Confesso em três slides (quebra na rubrica do "batendo no peito" e no "E peço") + a absolvição
  const iC = achar(/^confesso a deus/i, 0, iF2 > 0 ? iF2 : L.length);
  if (iC >= 0) {
    const iA = absolvicao(iC), iAm = achar(/^am[ée]m\.?$/i, iA);
    if (iA > 0 && iAm > 0) {
      const sl = [];
      let atual = [];
      for (let i = iC; i < iA; i++) {
        const l = L[i];
        if (!l) continue;
        if (rubrica(l) || /^e peço/i.test(l)) { if (atual.length) sl.push(atual.join('\n')); atual = []; if (rubrica(l)) continue; }
        atual.push(l);
      }
      if (atual.length) sl.push(atual.join('\n'));
      if (sl.length) sl[0] = 'T. ' + sl[0];
      const conf = [...sl, ...falas(iA + 1, iAm + 1, false)];
      const orig = Ordinario.original('ato-penitencial')?.slides || [];
      if (conf.length > 1 && conf.join('\n\n') !== orig.join('\n\n')) out['ato-penitencial'] = conf;
    }
  }
  // 2ª: o diálogo "Tende compaixão…" num slide
  if (iF2 >= 0) {
    const i = achar(/^tende compaix/i, iF2, iF3 > 0 ? iF3 : L.length), a = i >= 0 ? absolvicao(i) : -1;
    if (a > i) { const s = falas(i, a, false); if (s.length) out['ato-penitencial#2'] = s; }
  }
  // 3ª do Missal: cada invocação com a resposta do povo é um slide
  if (iF3 >= 0) {
    const i = achar(/^(senhor|cristo),/i, iF3, iAlt > 0 ? iAlt : L.length), a = i >= 0 ? absolvicao(i) : -1;
    if (a > i) { const s = falas(i, a, true); if (s.length) out['ato-penitencial#3'] = s; }
  }
  // invocações por tempo: "Tempo comum:" / "1. Senhor, que…" / "R. Senhor, tende piedade de nós."
  if (iAlt >= 0) {
    const chaves = [[/comum/i, 'tempocomum'], [/advento/i, 'advento'], [/natal/i, 'natal'], [/quaresma/i, 'quaresma'], [/p[áa]scoa|pascal/i, 'pascoa']];
    let g = null, n = 0, sl = [], p = [];
    const fechar = () => { if (g && n && sl.length) out[`ato-penitencial#3-${g}-${n}`] = sl; sl = []; p = []; };
    for (let i = iAlt + 1; i < (iFim > 0 ? iFim : L.length); i++) {
      const l = L[i];
      if (!l) continue;
      if (/^tempo\b/i.test(l) && rubrica(l)) { fechar(); g = chaves.find(([re]) => re.test(l))?.[1] || null; n = 0; continue; }
      const m = l.match(/^(\d+)\.\s*(.*)$/);
      if (m) { fechar(); n = +m[1]; if (m[2]) p.push(m[2]); continue; }
      const r = l.match(/^R\.\s*(.*)$/);
      if (r) { if (p.length) sl.push(`P. ${p.join('\n')}\nT. ${r[1]}`); p = []; continue; }
      p.push(l);
    }
    fechar();
  }
  // só as fórmulas que o programa conhece
  for (const k of Object.keys(out)) { const f = k.split('#')[1]; if (f && !Ordinario.formulaDe('ato-penitencial', f)) delete out[k]; }
  return out;
}

async function trazerAtoPenitencialTxt(arq) {
  const lidos = lerAtoPenitencialTxt(await arq.text());
  const atuais = Ordinario.editados(), igual = k => atuais[k] && atuais[k].join('\n\n') === lidos[k].join('\n\n');
  for (const k of Object.keys(lidos)) if (igual(k)) delete lidos[k];
  // o Confesso (1ª) já existe no programa: se só mudam quebras de linha, maiúsculas e pontuação, fica o daqui;
  // se mudam palavras, pergunta à parte, mostrando o que muda
  const soPalavras = sl => sl.join(' ').replace(/^[PT]\. |\s[PT]\. /g, ' ').replace(/[\s,.;:!]+/g, ' ').toLowerCase().trim();
  if (lidos['ato-penitencial'] && soPalavras(lidos['ato-penitencial']) === soPalavras(atuais['ato-penitencial'] || Ordinario.original('ato-penitencial').slides))
    delete lidos['ato-penitencial'];
  if (lidos['ato-penitencial']) {
    const agora = (atuais['ato-penitencial'] || Ordinario.original('ato-penitencial').slides).join('\n').replace(/^[PT]\. /gm, '');
    const novo = lidos['ato-penitencial'].join('\n').replace(/^[PT]\. /gm, '');
    const a = agora.split('\n'), n = novo.split('\n'), dif = n.filter(l => !a.includes(l)).slice(0, 6);
    if (!confirm(`O Confesso (1ª fórmula) do arquivo é diferente do que está ${atuais['ato-penitencial'] ? 'guardado aqui' : 'no programa'}. No arquivo:\n• ${dif.join('\n• ')}\n\nOK = usar o Confesso do arquivo · Cancelar = manter o daqui (as outras fórmulas entram do mesmo jeito)`))
      delete lidos['ato-penitencial'];
  }
  const ks = Object.keys(lidos);
  if (!ks.length) return toast('Nada de novo: as fórmulas do arquivo já estão iguais às daqui (ou o arquivo não tem as fórmulas do Ato Penitencial).');
  const troca = ks.filter(k => k !== 'ato-penitencial' && atuais[k]);
  const nome = k => k === 'ato-penitencial' ? '1ª fórmula (Confesso)' : Ordinario.formulaDe('ato-penitencial', k.split('#')[1]).nome.replace(/:\s*".*$/, '');
  if (!confirm(`Achei ${ks.length} texto(s) no arquivo:\n• ${ks.map(nome).join('\n• ')}`
    + (troca.length ? `\n\n${troca.length} já tinha(m) texto aqui e será(ão) trocado(s) pelo do arquivo.` : '')
    + '\n\nOs textos ficam guardados só nos computadores da paróquia (e vão para os outros pela nuvem). Trazer?')) return;
  for (const k of ks) Ordinario.editar(k, lidos[k]);
  await DB.salvar('config', { id: 'ordinario', valor: { textos: Ordinario.editados() } });
  $('#dlgOrdinario').close();
  renderOrdinario();
  renderRoteiroLista();
  if (S.atual) { atualizarSlides(); renderCabecalho(); }
  toast(`${ks.length} texto(s) do Ato Penitencial guardado(s). Escolha a fórmula no item do Ato Penitencial.`);
}

function ligarEditorOrdinario() {
  $('#ordArquivo').addEventListener('click', () => $('#ordArquivoInput').click());
  $('#ordArquivoInput').addEventListener('change', e => {
    const arq = e.target.files?.[0];
    e.target.value = '';
    if (arq) trazerAtoPenitencialTxt(arq).catch(err => toast('Não consegui ler o arquivo: ' + err.message));
  });
  $('#listaOrdinario').addEventListener('dblclick', e => {
    const it = e.target.closest('[data-parte]');
    if (it) abrirEditorOrdinario(it.dataset.parte);
  });
  $('#formOrdinario').addEventListener('submit', e => {
    const id = $('#dlgOrdinario').dataset.id;
    if (e.submitter?.value === 'salvar') {
      const slides = dividir($('#ordTexto').value);
      const [pid, f] = id.split('#'), fo = f ? Ordinario.formulaDe(pid, f) : null;
      if (!slides.length && !fo) { e.preventDefault(); return toast('O texto não pode ficar vazio (para voltar ao original, use Restaurar).'); }
      const orig = fo ? (fo.padrao || []) : Ordinario.original(id).slides;
      const igualOriginal = !slides.length || slides.join('\n\n') === orig.join('\n\n');
      salvarOrdinario(id, igualOriginal ? null : slides);
      toast('Texto salvo. Vale para todos os roteiros (e vai para os outros computadores pela nuvem).');
    } else if (e.submitter?.value === 'restaurar') {
      salvarOrdinario(id, null);
      toast('Texto original restaurado.');
    }
  });
}
