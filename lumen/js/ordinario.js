'use strict';
/*
 * Ordinário da Missa — partes fixas e respostas da assembleia.
 * Cada string é um slide. Linhas que começam com "—" são respostas do povo (aparecem em negrito).
 * IMPORTANTE: confira os textos com o Missal Romano adotado na sua paróquia (3ª edição, CNBB)
 * e ajuste aqui o que for necessário.
 */

const Ordinario = (() => {
  const grupos = [
    {
      grupo: 'Ritos Iniciais', partes: [
        { id: 'saudacao', titulo: 'Saudação', slides: [
          'Em nome do Pai e do Filho e do Espírito Santo.\n— Amém.',
          'O Senhor esteja convosco.\n— Ele está no meio de nós.',
        ] },
        { id: 'ato-penitencial', titulo: 'Ato Penitencial (Confesso)', slides: [
          'Confesso a Deus todo-poderoso\ne a vós, irmãos e irmãs,\nque pequei muitas vezes\npor pensamentos e palavras,\natos e omissões,',
          'por minha culpa, minha culpa,\nminha máxima culpa.',
          'E peço à Virgem Maria,\naos anjos e santos\ne a vós, irmãos e irmãs,\nque rogueis por mim a Deus, nosso Senhor.',
          'Deus todo-poderoso tenha compaixão de nós,\nperdoe os nossos pecados\ne nos conduza à vida eterna.\n— Amém.',
        ] },
        { id: 'kyrie', titulo: 'Senhor, tende piedade', slides: [
          'Senhor, tende piedade de nós.\n— Senhor, tende piedade de nós.',
          'Cristo, tende piedade de nós.\n— Cristo, tende piedade de nós.',
          'Senhor, tende piedade de nós.\n— Senhor, tende piedade de nós.',
        ] },
        { id: 'gloria', titulo: 'Glória', slides: [
          'Glória a Deus nas alturas,\ne paz na terra aos homens por ele amados.',
          'Senhor Deus, rei dos céus, Deus Pai todo-poderoso:\nnós vos louvamos, nós vos bendizemos,\nnós vos adoramos, nós vos glorificamos,\nnós vos damos graças por vossa imensa glória.',
          'Senhor Jesus Cristo, Filho Unigênito,\nSenhor Deus, Cordeiro de Deus, Filho de Deus Pai.',
          'Vós que tirais o pecado do mundo, tende piedade de nós.\nVós que tirais o pecado do mundo, acolhei a nossa súplica.\nVós que estais à direita do Pai, tende piedade de nós.',
          'Só vós sois o Santo, só vós, o Senhor,\nsó vós, o Altíssimo, Jesus Cristo,\ncom o Espírito Santo, na glória de Deus Pai.\nAmém.',
        ] },
      ],
    },
    {
      grupo: 'Liturgia da Palavra', partes: [
        { id: 'resp-leitura', titulo: 'Resposta às leituras', slides: ['Palavra do Senhor.\n— Graças a Deus.'] },
        { id: 'resp-evangelho', titulo: 'Diálogo do Evangelho', slides: [
          'O Senhor esteja convosco.\n— Ele está no meio de nós.',
          'Proclamação do Evangelho de Jesus Cristo segundo…\n— Glória a vós, Senhor.',
          'Palavra da Salvação.\n— Glória a vós, Senhor.',
        ] },
        { id: 'creio-niceno', titulo: 'Creio (Niceno-Constantinopolitano)', slides: [
          'Creio em um só Deus, Pai todo-poderoso,\ncriador do céu e da terra,\nde todas as coisas visíveis e invisíveis.',
          'Creio em um só Senhor, Jesus Cristo,\nFilho Unigênito de Deus,\nnascido do Pai antes de todos os séculos:',
          'Deus de Deus, luz da luz,\nDeus verdadeiro de Deus verdadeiro;\ngerado, não criado, consubstancial ao Pai.\nPor ele todas as coisas foram feitas.',
          'E por nós, homens, e para a nossa salvação,\ndesceu dos céus:\ne se encarnou pelo Espírito Santo,\nno seio da Virgem Maria, e se fez homem.',
          'Também por nós foi crucificado sob Pôncio Pilatos;\npadeceu e foi sepultado.\nRessuscitou ao terceiro dia, conforme as Escrituras,\ne subiu aos céus, onde está sentado à direita do Pai.',
          'E de novo há de vir, em sua glória,\npara julgar os vivos e os mortos;\ne o seu reino não terá fim.',
          'Creio no Espírito Santo, Senhor que dá a vida,\ne procede do Pai e do Filho;\ne com o Pai e o Filho é adorado e glorificado:\nele que falou pelos profetas.',
          'Creio na Igreja, una, santa, católica e apostólica.\nProfesso um só batismo para remissão dos pecados.\nE espero a ressurreição dos mortos\ne a vida do mundo que há de vir. Amém.',
        ] },
        { id: 'creio-apostolico', titulo: 'Creio (Símbolo dos Apóstolos)', slides: [
          'Creio em Deus Pai todo-poderoso,\ncriador do céu e da terra;\ne em Jesus Cristo, seu único Filho, nosso Senhor;',
          'que foi concebido pelo poder do Espírito Santo;\nnasceu da Virgem Maria,\npadeceu sob Pôncio Pilatos,\nfoi crucificado, morto e sepultado;',
          'desceu à mansão dos mortos;\nressuscitou ao terceiro dia;\nsubiu aos céus,\nestá sentado à direita de Deus Pai todo-poderoso,\ndonde há de vir a julgar os vivos e os mortos.',
          'Creio no Espírito Santo,\nna santa Igreja católica,\nna comunhão dos santos,\nna remissão dos pecados,\nna ressurreição da carne,\nna vida eterna. Amém.',
        ] },
      ],
    },
    {
      grupo: 'Liturgia Eucarística', partes: [
        { id: 'orai-irmaos', titulo: 'Orai, irmãos e irmãs', slides: [
          'Orai, irmãos e irmãs,\npara que o meu e o vosso sacrifício\nseja aceito por Deus Pai todo-poderoso.',
          '— Receba o Senhor por tuas mãos este sacrifício,\npara glória do seu nome,\npara nosso bem e de toda a santa Igreja.',
        ] },
        { id: 'prefacio', titulo: 'Diálogo do Prefácio', slides: [
          'O Senhor esteja convosco.\n— Ele está no meio de nós.',
          'Corações ao alto.\n— O nosso coração está em Deus.',
          'Demos graças ao Senhor, nosso Deus.\n— É nosso dever e nossa salvação.',
        ] },
        { id: 'santo', titulo: 'Santo', slides: [
          'Santo, Santo, Santo,\nSenhor, Deus do universo!\nO céu e a terra proclamam a vossa glória.\nHosana nas alturas!',
          'Bendito o que vem em nome do Senhor!\nHosana nas alturas!',
        ] },
        { id: 'misterio-fe', titulo: 'Mistério da Fé', slides: [
          'Eis o mistério da fé!\n— Anunciamos, Senhor, a vossa morte\ne proclamamos a vossa ressurreição.\nVinde, Senhor Jesus!',
          'Mistério da fé e do amor!\n— Todas as vezes que comemos deste pão\ne bebemos deste cálice,\nanunciamos, Senhor, a vossa morte,\nenquanto esperamos a vossa vinda!',
          'Mistério da fé para a salvação do mundo!\n— Salvador do mundo, salvai-nos,\nvós que nos libertastes\npela cruz e ressurreição.',
        ] },
        { id: 'doxologia', titulo: 'Doxologia final', slides: [
          'Por Cristo, com Cristo, e em Cristo,\na vós, Deus Pai todo-poderoso,\nna unidade do Espírito Santo,\ntoda honra e toda glória,\npor todos os séculos dos séculos.\n— Amém.',
        ] },
      ],
    },
    {
      grupo: 'Rito da Comunhão', partes: [
        { id: 'pai-nosso', titulo: 'Pai-Nosso', slides: [
          'Pai nosso que estais nos céus,\nsantificado seja o vosso nome;\nvenha a nós o vosso Reino;\nseja feita a vossa vontade,\nassim na terra como no céu.',
          'O pão nosso de cada dia nos dai hoje;\nperdoai-nos as nossas ofensas,\nassim como nós perdoamos\na quem nos tem ofendido;',
          'e não nos deixeis cair em tentação,\nmas livrai-nos do mal.',
          '— Vosso é o reino, o poder e a glória para sempre!',
        ] },
        { id: 'paz', titulo: 'Saudação da Paz', slides: [
          'A paz do Senhor esteja sempre convosco.\n— O amor de Cristo nos uniu.',
        ] },
        { id: 'cordeiro', titulo: 'Cordeiro de Deus', slides: [
          'Cordeiro de Deus, que tirais o pecado do mundo,\ntende piedade de nós.',
          'Cordeiro de Deus, que tirais o pecado do mundo,\ntende piedade de nós.',
          'Cordeiro de Deus, que tirais o pecado do mundo,\ndai-nos a paz.',
        ] },
        { id: 'eis-cordeiro', titulo: 'Eis o Cordeiro de Deus', slides: [
          'Eis o Cordeiro de Deus,\neis aquele que tira o pecado do mundo.\nFelizes os convidados para a ceia do Cordeiro.',
          '— Senhor, eu não sou digno(a)\nde que entreis em minha morada,\nmas dizei uma palavra\ne serei salvo(a).',
        ] },
      ],
    },
    {
      grupo: 'Ritos Finais', partes: [
        { id: 'bencao-final', titulo: 'Bênção e despedida', slides: [
          'O Senhor esteja convosco.\n— Ele está no meio de nós.',
          'Abençoe-vos Deus todo-poderoso,\nPai e Filho e Espírito Santo.\n— Amém.',
          'Ide em paz, e o Senhor vos acompanhe.\n— Graças a Deus.',
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
      { tipo: 'ordinario', parte: 'paz' },
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
      { tipo: 'leitura', titulo: '1ª Leitura', ref: '' },
      { tipo: 'salmo', titulo: 'Salmo Responsorial', ref: '', refrao: '', texto: '' },
      { tipo: 'canto', momento: 'Aclamação ao Evangelho' },
      { tipo: 'leitura', titulo: 'Evangelho', ref: '', evangelho: true },
      { tipo: 'homilia', titulo: 'Homilia', texto: '', usarCapa: true, mostrarRef: true },
      { tipo: 'preces', titulo: 'Oração dos Fiéis', resposta: 'Senhor, escutai a nossa prece.', convite: '', texto: '', conclusao: '' },
      { tipo: 'canto', momento: 'Ofertório' },
      { tipo: 'ordinario', parte: 'prefacio' },
      { tipo: 'ordinario', parte: 'santo' },
      { tipo: 'ordinario', parte: 'misterio-fe' },
      { tipo: 'ordinario', parte: 'pai-nosso' },
      { tipo: 'ordinario', parte: 'paz' },
      { tipo: 'ordinario', parte: 'cordeiro' },
      { tipo: 'ordinario', parte: 'eis-cordeiro' },
      { tipo: 'canto', momento: 'Comunhão' },
      { tipo: 'ordinario', parte: 'bencao-final' },
      { tipo: 'canto', momento: 'Final' },
    ],
  };

  return { grupos, parte: id => indice.get(id) || null, modelos };
})();
