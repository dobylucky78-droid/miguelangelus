'use strict';
/*
 * Novidades: o que mudou em cada versão. Aparece sozinho na primeira vez que o programa abre depois de uma
 * atualização (só as versões que a pessoa ainda não viu) e a qualquer hora em Ajuda → Novidades.
 * A versão mais nova fica em cima. Ao gerar uma versão nova, acrescente a entrada dela aqui.
 */
const NOVIDADES = [
  { versao: '1.9.23', data: '2026-11-26', itens: [
    '🙏 Ato Penitencial com as três fórmulas do Missal (pedido do Luciano): no próprio item do Ato Penitencial dá para escolher, até minutos antes da Missa, a 1ª (Confesso), a 2ª ("Tende compaixão de nós, Senhor") ou a 3ª, com as invocações do Missal ou as de cada tempo (Tempo Comum 1 a 5, Advento 1 a 3, Natal 1 e 2, Quaresma 1 a 3, Páscoa 1 a 5). As do tempo litúrgico do roteiro aparecem marcadas "(deste tempo)". A absolvição continua no fim das três.',
    '⏭ Na 3ª fórmula o "Senhor, tende piedade" já é dito nas invocações: o item do Kyrie logo depois fica marcado "já no Ato Penitencial (pula)", e o Próximo passa direto dele para o que vem depois. Voltando para a 1ª ou a 2ª, ele volta a aparecer.',
    '📄 O MiguelAngelus não traz os textos da 2ª e da 3ª fórmula: a paróquia escreve uma vez em ✎ Editar texto, ou traz todas de uma vez de um arquivo .txt (botão 📄 dentro do ✎ Editar texto do Ato Penitencial). Os textos ficam só nos computadores da paróquia e vão para os outros pela nuvem. Se o Confesso do arquivo tiver palavras diferentes do que vocês já usam, o programa pergunta antes de trocar.',
    '🔇 Mudo automático no slide (ideia do Luciano): passando o mouse num slide do roteiro aparece o botão M (junto do A− / A+). O slide marcado entra em Mudo sozinho quando vai ao ar: o telão fica só com o fundo, como quando o padre pede para não projetar na consagração. No primeiro slide sem marca o Mudo sai sozinho; se o Mudo foi ligado à mão, ele continua até o operador tirar. A marca vale só para aquele roteiro e aparece no card como "🔇 Mudo".',
  ] },
  { versao: '1.9.22', data: '2026-11-25', itens: [
    '🙏 Bênção final do folheto (pedido do Luciano): quando o folheto traz uma bênção solene (Advento, Tempo Comum I a VI, Nossa Senhora, Todos os Santos, Fiéis Defuntos…) ou a oração sobre o povo, a 💡 Dica e os 🎀 fitilhos já mostram essa bênção e a página do Missal. Antes ficava "Bênção final simples". Se o padre for usar outra, é só trocar na Dica: a escolha vale para o roteiro. Vale também para os roteiros que já estavam carregados.',
    '🙋 Saudação inicial com todas as fórmulas do Missal (pedido do Luciano): além do sinal da cruz, as saudações A até H e a do Bispo, cada uma com a página do Missal ao lado (A e B na p. 430, C a H na p. 431, Bispo na p. 432). A antiga "C" ("O Senhor esteja convosco") agora aparece como H, como no Missal; os roteiros que já a usavam continuam iguais. O MiguelAngelus não traz os textos: a paróquia escreve uma vez em ✎ Editar texto, ou traz de outro computador pelo ⬆ Importar textos (o ⬇ Exportar textos agora leva também as fórmulas da saudação e das bênçãos).',
    '✝ Mistério da Fé conferido com o Missal pelo Luciano: a 1ª aclamação agora começa com "Mistério da fé!", como na 3ª edição (antes estava "Eis o mistério da fé!"). As outras duas já estavam iguais.',
    '📖 Páginas do Missal com a revisão do Luciano, da Paróquia Coração Eucarístico de Jesus e Santa Marina, de 24/11: os santos celebrados no mesmo dia agora têm cada um a sua linha e a sua página (ex.: 25/05, São Beda, São Gregório VII e Santa Maria Madalena de Pazzi). Notas novas de "quando usar" (Natal com as quatro Missas, Epifania com as duas, Quaresma, Ascensão, Assunção, Todos os Santos…). Ainda há 19 páginas marcadas com ⚠ para conferir. Os prefácios dos Domingos da Quaresma saíram da tabela, porque ficam dentro da Missa de cada domingo, que já está mais abaixo; a 💡 Dica continua indicando o prefácio e a página certa.',
  ] },
  { versao: '1.9.21', data: '2026-11-24', itens: [
    '💡 Dica do Miguel com roteiros do folheto: quando o folheto traz a Oração Eucarística e o prefácio como texto, a Dica e os 🎀 fitilhos agora reconhecem os dois e mostram a página do Missal. Antes, ela pedia para escolher o prefácio mesmo com o texto já no roteiro. Vale também para os roteiros que já estavam carregados.',
  ] },
  { versao: '1.9.20', data: '2026-11-23', itens: [
    '🔔 Carrilhão na 💡 Dica (no computador, na cola impressa e nos celulares): o trecho da Oração Eucarística do roteiro em que o padre estende as mãos sobre o pão e o vinho, com a hora de tocar em destaque, para a comunidade se ajoelhar. O texto é o que já está no roteiro (do catálogo ou do folheto); serve para todas as Orações Eucarísticas.',
    '📋 Escala da Missa na 💡 Dica: quem serve na Missa do roteiro aberto (coordenação de liturgia, ministros, leitores, coroinhas…), vinda da Secretaria MiguelAngelus 1.6.0. Só aparece se a paróquia ligar lá Ajustes → 📋 Escalas no MiguelAngelus (vem desligado); vão só a função e os nomes.',
    '🖥 Cards do centro iguais ao telão (pedido do Luciano, da Paróquia Coração Eucarístico de Jesus e Santa Marina): cada card mostra o texto quebrado nas mesmas linhas em que vai aparecer no telão, com o mesmo tamanho de tela, tema e letra. Assim dá para ver, antes de projetar, onde cada linha termina. Vem ligado; para voltar ao jeito antigo, desmarque em Ajustes → 🖥️ Aparência do app → "Cards do centro com as mesmas linhas do telão".',
    '📖 Fórmulas do Missal (pedido do Luciano): nos itens da Missa, escolha a fórmula. Na Saudação, só o sinal da cruz ou a saudação A, B ou C. No Mistério da Fé, uma das três aclamações (ou as três, como antes). Na Bênção e despedida, a bênção simples, uma das bênçãos solenes ou a oração sobre o povo. A página do Missal aparece ao lado. A bênção escolhida é a mesma dos fitilhos da 💡 Dica: mudou num lugar, muda no outro.',
    '✝ Mistério da Fé dentro da Oração Eucarística: no item da oração (do catálogo ou vindo do folheto) há a escolha "Mistério da Fé". O telão troca a aclamação que veio no texto pela escolhida; se o texto trouxer as três, fica só a escolhida.',
    '🔒 O MiguelAngelus não traz textos novos do Missal. A saudação A e B, as bênçãos solenes e a oração sobre o povo a paróquia escreve uma vez (✎ Editar texto, com a fórmula escolhida) e o texto fica guardado só nos computadores dela. Até lá, o telão mostra o sinal da cruz ou a bênção simples, e a lista avisa "(sem texto)".',
    '📚 Textos da paróquia (ideia do Luciano): as antífonas de entrada e da comunhão e as três orações do dia (coleta, sobre as oferendas, depois da comunhão) que um roteiro usa ficam guardadas para aquela celebração, só nos computadores da paróquia. No ano seguinte, o roteiro criado pela Agenda já nasce com elas, no lugar certo (a Coleta fixa sai e entra a do dia). Nos dias de semana do Tempo Comum valem os textos do domingo da semana.',
    '📚 Botão "Textos da paróquia" no roteiro: mostra o que está guardado para a celebração, põe no roteiro o que falta (ou troca tudo pelos guardados), busca na internet o que ainda não foi guardado e, uma vez, "Guardar dos roteiros antigos" para encher a biblioteca com os roteiros que a paróquia já fez. Os textos vão pela nuvem da paróquia e pelo ⬇ Exportar / ⬆ Importar textos do catálogo ✝.',
    '🌐 Liturgia do dia (Missas sem folheto): nova opção "Usar primeiro os textos guardados pela paróquia para este dia" (vem marcada). O que não estiver guardado continua vindo da internet.',
    '✝ Creio: no item do Creio, escolha entre o Niceno-Constantinopolitano e o Símbolo dos Apóstolos, sem tirar um e pôr o outro. Nos roteiros feitos pelo folheto (Profissão de Fé), dá para trocar pelo outro Creio, e "Como está no texto" volta ao do folheto. Na Quaresma e no Tempo Pascal o Símbolo dos Apóstolos aparece como recomendado.',
    '📖 Páginas do Missal revistas pelo Luciano: a tabela 📖 vem com 520 páginas (3ª edição, modelo padrão), quase toda a Missa do dia, as bênçãos solenes e correções (Rito da Missa p. 430, Doutores, Reconciliação do Espírito). As que ele ainda vai conferir aparecem com ⚠. Se a paróquia já tinha anotado uma página, a dela continua valendo.',
    '📅 Dias com mais de um santo de memória facultativa (8/2, 23/4, 25/5, 17/9, 23/11…): cada santo tem a sua linha na tabela 📖 e a sua opção na escolha da Missa do dia, porque são Missas diferentes.',
    '📅 Calendário (lista do Luciano, com as páginas do Missal): entram São João de Ávila (10/5), Santo Oscar (3/2), Santo Efrém (8/6), Santo Agostinho Zhao Rong e companheiros (8/7), Beato Inácio de Azevedo e companheiros (17/7), Santa Dulce Lopes Pontes (13/8), São Benedito, o Negro (5/10), São Pedro de Alcântara (19/10), Santos Roque González e companheiros (19/11) e Nossa Senhora de Loreto (10/12). Assunção na página 778.',
    '✂ Saíram, a pedido do Luciano: o prefácio de Santa Maria Madalena (ela não tem prefácio próprio; roteiros antigos continuam mostrando o nome), as linhas de 2 a 7 de janeiro (esses dias usam a Missa do dia da semana, até o Batismo do Senhor) e a linha de Jesus Cristo, Sumo e Eterno Sacerdote (não tem Missa própria no Missal).',
    '🩹 Correção: em slides com muito texto, as letras passavam da borda do card e caíam no card de baixo. Agora o card cresce até caber o texto todo.',
  ] },
  { versao: '1.9.19', data: '2026-11-22', itens: [
    '📱 Correção no iPhone e no iPad: no Controle pelo celular, o dedo arrastava a página inteira (o topo sumia e abria um vão embaixo das abas) e a 💡 Dica não descia. Agora só a parte do meio rola, como nos outros celulares, e a tela continua acesa.',
  ] },
  { versao: '1.9.18', data: '2026-11-22', itens: [
    '📺 Margem de segurança da TV: muitas TVs cortam as bordas da imagem e o texto de cima e de baixo some. Em Ajustes → Aparência do telão → 📺 Margem de segurança da TV, aumente a margem (de 0 a 10%) até ver tudo: o telão inteiro fica um pouco menor, no meio da tela, com a mesma proporção. Fica guardada para cada monitor, neste computador, e o envio por NDI para o Cast continua sem a borda preta.',
    '🔍 Tamanho da tela (zoom do programa): agora vai de 50% a 200% e também funciona com Ctrl e a rodinha do mouse (além de Ctrl e +, Ctrl e −, Ctrl e 0). Encolha para os painéis caberem em telas pequenas. O telão não muda. Fica em Ajustes → Aparência do app.',
    '🔎 Conferir textos: folhetos em PDF às vezes partem a palavra no fim da linha com hífen ("mor-te"). Ao importar um folheto, o MiguelAngelus mostra a lista dessas palavras para você conferir e junta só as que você marcar. Ênclise (amá-lo, perdoai-nos), mesóclise (dar-se-á) e palavras compostas (segunda-feira, bem-aventurado) ficam como estão. A qualquer hora: botão 🔎 Conferir textos, ao lado de Duplicar.',
    '💡 Dica do Miguel no celular: o prefácio e a Oração Eucarística aparecem primeiro, antes dos fitilhos, e a aba Dica ganhou mais espaço (sem as setas Anterior/Próximo, que nela não servem). A tela rola com o dedo em todos os celulares.',
    '☁ Procurar atualizações: quando o GitHub pede uma pausa nas consultas (acontece quando vários computadores da mesma rede procuram ao mesmo tempo), o aviso agora diz isso e a hora em que dá para tentar de novo, em vez de parecer falta de internet.',
  ] },
  { versao: '1.9.17', data: '2026-11-21', itens: [
    '😇 O assistente ganhou lugar fixo: no pé da faixa da esquerda fica o Miguel (ou a Mariana, conforme Agenda → Paróquia). Um clique abre a 💡 Dica, sobre a liturgia do dia (prefácio, Oração Eucarística e fitilhos), e o ❓ Pergunte, para tirar dúvidas sobre o MiguelAngelus.',
    '💡 A Dica do Miguel (ou da Mariana) também nos celulares e tablets conectados: no Controle pelo celular há a aba "💡 Dica", e no aparelho dos músicos, o botão 💡 ao lado do "Seguir o telão". Mostra onde pôr os fitilhos do Missal, o prefácio e a Oração Eucarística do roteiro aberto, com as páginas. É só para ler: as escolhas continuam no computador. Útil para o coroinha ou o acólito com o Missal, sem papel.',
    '🎨 A resposta do povo em outra cor (da 1.9.16) agora aparece também no celular: no Controle, no aparelho "📺 Telão" e na versão para celulares antigos.',
    '🎀 Missa do dia nos dias de semana do Advento, do Natal, da Quaresma e da Páscoa: a tabela 📖 Páginas do Missal ganhou uma linha para cada dia (de 17 a 24 de dezembro pela data; na Quaresma e na Páscoa, pela semana e o dia). As páginas vêm em branco, para a paróquia preencher; os fitilhos da Dica já usam a linha do dia.',
    '📖 Ao importar o folheto de São Paulo ("O Povo de Deus em São Paulo"), o programa lê as páginas do Missal que o folheto traz (o prefácio e a coleta da Missa do dia) e anota na tabela 📖, só onde a paróquia ainda não tem página, e só com a 3ª edição do Missal. O aviso diz o que foi anotado e o que ficou como estava.',
    '📷 Correção: ligar e logo desligar a câmera no telão podia deixar a prévia (e às vezes o telão) presa na câmera, com fundo preto e o tema sem mudar. Agora o desligar sempre vale.',
    '🎨 Resposta do povo em outra cor nos temas claros (creme, azul, branco litúrgico): a cor escurece sozinha para não sumir no fundo claro. E a letra por cima da câmera fica sempre clara, legível na faixa escura.',
    '🌙 Correção: os roteiros de sábado à tarde montados com o folheto do domingo antes da 1.9.16 também passam a seguir o domingo (ex.: a Missa de sábado à noite com o folheto de Cristo Rei mostrava, na Dica, a memória do sábado).',
  ] },
  { versao: '1.9.16', data: '2026-11-20', itens: [
    '🎨 Resposta do povo em outra cor (ideia do Luciano, da Paróquia Coração Eucarístico de Jesus e Santa Marina): em Ajustes → 🎨 Aparência do telão, "Resposta do povo em outra cor" pinta a linha do T., do — ou do R. e o refrão do salmo, além do negrito. A cor se escolhe ao lado (vem dourada). Ajuda quando se projeta na parede ou o telão é fraco. Vem desligada.',
    '🌙 Missa de sábado à tarde (pedido do Luciano): ao criar os roteiros a partir do folheto do domingo, entram todas as Missas de sábado. As de 14h em diante (como a das 15h na Santa Marina) vêm marcadas, como vigília, porque valem pelo domingo e usam a liturgia dele; as mais cedo aparecem desmarcadas. Antes só entravam as de 16h em diante.',
    '🌙 No roteiro da Missa de sábado à tarde feito com o folheto do domingo, a cor do card, o prefácio do dia, a Dica e a Missa do dia nos fitilhos seguem o domingo, e não mais o sábado.',
    '✝ Catálogo: entram os prefácios Quaresma V, Ascensão do Senhor III, Virgem Maria III, IV e V, Doutores da Igreja I e II, Santa Maria Madalena (22/07, com regra própria) e "A Reconciliação do Espírito" (para as Orações II ou III), apontados pelo Luciano. As páginas que ainda não foram conferidas no livro aparecem com ⚠ ou em branco.',
    '📖 Notas de "quando usar" melhoradas com a revisão do Luciano: Advento, Comum VIII, Santíssima Eucaristia III (também com o Viático) e Santos Mártires II.',
    '🏷 A tela de abertura mostra a versão certa (estava com um número antigo fixo).',
  ] },
  { versao: '1.9.15', data: '2026-11-20', itens: [
    '😇 Assistente do programa: em Agenda → Paróquia, escolha entre o Miguel (o anjinho do MiguelAngelus) e a Mariana, a Expert em Liturgia. O cíngulo do assistente acompanha a cor do tempo litúrgico.',
    '🙏 Uma homenagem ao Miguel, coroinha da Paróquia São José Operário, e à Mariana, acólita da Paróquia Coração Eucarístico de Jesus e Santa Marina. Os dois contribuíram para o MiguelAngelus trazer as referências das Orações Eucarísticas e dos prefácios, para ajudar quem serve no presbitério.',
    '💡 "Dica do Miguel" (ou "da Mariana"): a cola do coroinha, com o prefácio e a Oração Eucarística do roteiro em letra grande, a página do Missal e quando usar. Se o roteiro ainda não tem, mostra os prefácios do dia. Dá para imprimir. Fica no menu Ajuda, no catálogo ✝ e no 💡 do item do roteiro. A ideia nasceu de um pedido do Miguel.',
    '🎀 Na Dica, "Onde pôr os fitilhos": a ordem da Missa com a página de cada fita (Missa do dia, Rito da Missa, prefácio, Oração Eucarística, Rito da Comunhão e bênção final). Prefácio e Oração Eucarística seguem o que está no roteiro. A página da Missa do dia vem sozinha pela data do roteiro (nas memórias, escolha a Missa do santo ou a da semana), e a bênção final se escolhe ali (simples, uma das bênçãos solenes ou oração sobre o povo); dá para dizer quantos fitilhos tem o Missal da paróquia.',
    '📖 A tabela "Páginas do Missal" ganhou as partes fixas (ritos iniciais, Rito da Comunhão, bênçãos), as bênçãos solenes uma a uma e a Missa do dia de cada domingo, solenidade e santo do calendário. A página não muda de um ano para o outro, então basta preencher uma vez. Já vêm as que os folhetos de São Paulo trazem; as que ainda não foram conferidas no livro aparecem com ⚠.',
    '🏷 A versão do programa aparece na barra da janela e ao lado do nome, no alto da tela.',
    '❓ "Pergunte ao Miguel" (ou "à Mariana"), no menu Ajuda: escreva a dúvida com as suas palavras e aparece o trecho do Manual que responde, com as palavras marcadas. Tem também uma lista de perguntas frequentes.',
    '📖 Páginas do Missal já preenchidas (Missal Romano, 3ª edição, 2023, modelo padrão): todas as 107 orações e prefácios com a página e uma nota de "quando usar". Foram coletadas dos folhetos "O Povo de Deus" de São Paulo e completadas e conferidas pelo Luciano, da Paróquia Coração Eucarístico de Jesus e Santa Marina. Quem usa outra edição continua podendo preencher a sua.',
    '✝ Catálogo atualizado com os prefácios da 3ª edição: Advento I-A e II-A (até 16/12 e de 17 a 24/12, com o I e o II), Comuns VII, VIII e IX, Santíssima Eucaristia III, Santos Mártires II, Santos Pastores II e Nossa Senhora Aparecida (12/10; mesmo texto da Imaculada Conceição).',
    '🧹 Os prefácios que tinham entrado como avulsos "vindos dos folhetos" e que já existem no catálogo (como "A glória de Jerusalém", de Todos os Santos) deixam de aparecer repetidos; o texto passa para o do catálogo.',
    '📖 Na tabela "Páginas do Missal", a coluna "Quando usar" quebra a linha e mostra a nota inteira.',
  ] },
  { versao: '1.9.14', data: '2026-11-20', itens: [
    '📖 Página no Missal (ideia do Luciano, da Paróquia Santa Marina): no catálogo ✝, o botão "📖 Páginas do Missal…" abre uma tabela com todas as orações e prefácios para preencher a página e uma nota de "quando usar" (Enter pula para a linha de baixo). Também dá para preencher pelo ✎ de cada um. A página aparece no catálogo, no item do roteiro e na impressão do roteiro (Resumo e Completo), para quem preside achar rápido no livro.',
    '📖 A página vale para uma edição do Missal, escolhida no alto do catálogo ou da tabela. Vem "3ª edição (2023), modelo padrão"; há também o modelo solene, a 2ª edição, ou dá para digitar outra. Cada edição guarda as suas páginas: trocar não apaga nada (ex.: o modelo padrão na matriz e o solene na capela). Ao começar uma edição vazia, o programa oferece copiar as páginas da anterior. O ano A, B ou C e o ano par ou ímpar não mudam o Missal.',
    '⬇ "Exportar textos" agora leva também as páginas e as notas, com a edição. Assim uma paróquia preenche e passa para as outras pelo "Importar textos…".',
  ] },
  { versao: '1.9.13', data: '2026-11-19', itens: [
    '✝ Prefácio e Oração Eucarística pelas regras do Missal (ideia do Luciano, da Paróquia Santa Marina): o catálogo (✝) mostra, para a data do roteiro, qual é o prefácio do dia. Ex.: Advento I até 16/12 e Advento II de 17 a 24/12, os domingos da Quaresma, a oitava da Páscoa, as solenidades, os santos. Ele já vem escolhido.',
    '⛔ Combinações que não podem são barradas, no catálogo e na troca pelo roteiro. Ex.: Oração Eucarística IV (e as outras de prefácio fixo) num dia com prefácio próprio, ou outro prefácio num domingo do Advento. Nos dias de semana dos tempos fortes e nas festas, o programa só pergunta, porque pode ser uma Missa votiva ou de exéquias. Trocar para a Oração IV leva o prefácio dela junto.',
    '📖 Liturgia do dia: a opção "Incluir a Oração Eucarística" agora põe a II nos dias de semana e a III nos domingos e solenidades, sempre com o prefácio do dia (antes era sempre a II com o prefácio dela).',
  ] },
  { versao: '1.9.12', data: '2026-11-19', itens: [
    '🕯 Intenções da Secretaria no roteiro: se a paróquia ligar, na Secretaria, a chave "Intenções no MiguelAngelus" (vem desligada), o item "Intenções da Missa" ganha o botão "🕯 Trazer da Secretaria", que preenche as intenções lançadas para aquela Missa, um slide por tipo (falecidos, ação de graças, saúde…). Vêm só o tipo e a intenção: quem pediu, telefone e oferta ficam na Secretaria.',
    '☁ Sincronização: um item apagado, que voltou a existir e foi apagado de novo, agora também some dos outros computadores.',
  ] },
  { versao: '1.9.11', data: '2026-11-19', itens: [
    '🧩 "Aplicar modelo" não apaga mais o roteiro: a ordem das partes passa a ser a do modelo, mas as leituras, o salmo, o Evangelho, os cantos escolhidos, a Coleta, as orações do dia, as antífonas e o vídeo de boas-vindas que já estavam nele continuam, cada um no seu lugar. Ex.: roteiro montado com a "Liturgia do dia" num dia de semana + modelo "Missa dominical/solenidade" → entram o Glória, a 2ª leitura e o Creio sem perder nada.',
    '⛪ Solenidade em dia de semana (ex.: Imaculada Conceição, 8/12): a "Liturgia do dia" percebe pela 2ª leitura e pelo Creio e já monta o roteiro com o modelo de Missa dominical/solenidade, como num domingo — sem precisar aplicar o modelo depois. O botão agora se chama "📖 Liturgia do dia (Missas sem folheto)": serve para dias de semana, solenidades e qualquer Missa sem folheto.',
    '📄 Folhetos do Advento da Arquidiocese de São Paulo (Povo de Deus, Ano B): agora entram separados em partes, com a Antífona da Entrada ("II."), o comentário depois da Saudação, o Rito da Comunhão (com o Pai-Nosso e Rito da Paz das partes fixas), a Bênção inteira e o Canto Final. O artigo do bispo na última página fica de fora do roteiro.',
    '🌐 Folhetos de outras (arqui)dioceses: em Agenda → Paróquia, a lista "Folhetos da (arqui)diocese" já traz Rio de Janeiro, São Paulo, Brasília (versão telão), Goiânia, Campanha (MG), Santo André (SP) e São José dos Campos (SP) — escolhida a sua, o botão 🌐 Folhetos busca os folhetos publicados e monta o roteiro. Não está na lista? "Outra (arqui)diocese", com a página onde ficam os PDFs, ou baixe o PDF e use 📄 Folheto.',
    '📄 O leitor de folhetos ficou mais esperto: folha A3 dobrada em livreto (Goiânia) volta para a ordem das partes pela numeração; páginas com 6 colunas; títulos em negrito pouco maiores que o texto ou centralizados (Campanha-MG, Erechim-RS); refrão "R/." e "R.:"; cantos com os créditos no título (Brasília); a "Celebração da Palavra (onde não houver Missa)" do fim do folheto fica de fora; números de outra fonte não grudam mais nos títulos; leituras em letra diferente (Erechim-RS) não se perdem mais; partes numeradas com o texto na mesma linha (Apucarana-PR); salmo com "(R/.)" no fim de cada estrofe, sem os números dos versículos.',
    '📨 Folheto que não montou bem: se faltarem partes importantes (leituras, Evangelho, Oração Eucarística, Comunhão) ou o PDF não for entendido, o MiguelAngelus oferece mandar o link do folheto para a equipe avaliar — abre o seu e-mail com a mensagem pronta, você confere e envia.',
    '🙏 Avisos do Luciano, da Paróquia Santa Marina. Obrigado, Luciano!',
  ] },
  { versao: '1.9.10', data: '2026-11-19', itens: [
    '🔁 Ligar e desligar o conjunto que repete: ao passar o mouse num conjunto do roteiro (vídeos, "Apresentar eventos" e "Campanhas" seguidos, que repetem), aparece uma chavinha ao lado das setas. Ligada (como até hoje), a linha azul envolve os itens e eles passam sozinhos, um depois do outro. Desligada, a linha fica cinza (✋) e a passagem para o item seguinte é manual; cada item continua repetindo sozinho.',
    '⛔ Escolher quem entra no conjunto: Ctrl+clique num item que repete tira ele do conjunto (ou põe de volta). Ex.: o vídeo de boas-vindas fica de fora e só os eventos e as campanhas passam em volta. O item de fora continua repetindo sozinho e aparece com ⛔ e uma linha tracejada.',
    '🎬 Vídeo de boas-vindas que já repete: em Agenda → Paróquia e comunidades, ao editar a igreja, a caixinha "🔁 Repetir automaticamente" faz o vídeo já entrar nos roteiros novos com "Repetir" ligado.',
  ] },
  { versao: '1.9.9', data: '2026-11-19', itens: [
    '🎉 Eventos e campanhas com a tela limpa: enquanto o slide de um evento ou de uma campanha está no telão (no item do evento, no "Apresentar eventos", no "💝 Campanhas" ou dentro dos Avisos), as imagens dos 4 cantos (brasão, logos, padroeiro) saem, para não cobrir a arte. No slide seguinte elas voltam sozinhas.',
    '🖥 Prévia ao vivo depois de um vídeo: com a janela do programa minimizada ou coberta pelo telão, a prévia podia continuar mostrando o vídeo que já tinha acabado por cima dos eventos e campanhas seguintes. Agora ela tira o vídeo junto com o telão e, ao reaparecer, se atualiza com o que está no ar.',
  ] },
  { versao: '1.9.8', data: '2026-11-18', itens: [
    '💠 Para quem vai o Pix: em Ajustes → 💠 Pix, embaixo do QR code, o programa mostra o recebedor que está dentro do próprio QR (nome, cidade e chave). Ao escolher um QR novo, ele pergunta "Este QR code manda o Pix para: … É isso mesmo?" antes de guardar. Um QR trocado ou errado aparece na hora com outro nome. O recebedor aparece também ao passar o mouse no botão 💠 Pix. Tudo é lido no próprio computador, sem internet.',
  ] },
  { versao: '1.9.7', data: '2026-11-18', itens: [
    '📢 Avisos de evento e de campanha: no item Avisos, o aviso que a Secretaria ligou a um evento ou a uma campanha cadastrados aparece no telão como o slide pronto do evento (com o QR da agenda) ou da campanha (com o QR do Pix), no lugar do texto. A ordem é a mesma da folha que o leitor tem no ambão: primeiro os avisos comuns, depois os de evento e por último os de campanha. É só ir passando com o Próximo enquanto ele lê. Se o evento for apagado, ou a campanha pausada ou encerrada, o aviso volta a aparecer como texto.',
  ] },
  { versao: '1.9.6', data: '2026-11-18', itens: [
    '💝 Campanhas de arrecadação no telão: novo item "💝 Campanhas" no roteiro (entra logo depois dos Avisos). Cada campanha vira um slide com a arte feita no Canva, quanto já foi arrecadado (percentual, barra e, se a campanha deixar, os valores) e o QR code do Pix da campanha com a chave, passando sozinhos como no "Apresentar eventos". As campanhas são feitas e atualizadas na Secretaria MiguelAngelus e chegam pela nuvem; aqui só se mostra. Com "Todas as campanhas abertas" marcado, a nova entra e a pausada ou encerrada sai sozinha; a encerrada pode virar um slide de agradecimento, se a Secretaria marcar. O botão "💝 Campanhas" só aparece quando há alguma campanha na nuvem.',
    '🎨 Eventos e campanhas não se confundem no telão: o evento tem a faixa azul "🎉 EVENTO" e o QR com moldura azul e "📅 SALVE NA AGENDA"; a campanha tem fundo vinho, faixa dourada "💝 CAMPANHA" e o QR com moldura dourada e "💠 DOE PELO PIX". A meta da campanha aparece em barra, termômetro, círculo, tijolos ou coração (a Secretaria escolhe).',
    '🎬 Vídeo de boas-vindas de cada igreja: em Agenda → Paróquia e comunidades, ao editar a matriz ou a capela, escolha o vídeo e marque "Começar os roteiros novos de Missa desta igreja com este vídeo". Todo roteiro de Missa criado daqui para frente para aquela igreja (pela Agenda, Liturgia do dia ou folheto) já nasce com o vídeo como 1º item. Os roteiros que já existem não mudam.',
    '➕ "Pôr nos outros roteiros" no "🎉 Apresentar eventos" e no "💝 Campanhas": os botões "do dia" e "da semana" (domingo a sábado) põem uma cópia do item nos roteiros já criados, logo depois do vídeo de boas-vindas (ou como 1º item). Roteiro que já tem um item igual fica como está.',
  ] },
  { versao: '1.9.5', data: '2026-11-17', itens: [
    '🙏 Eventos de vários dias no mesmo horário (novena, tríduo, semana missionária): marque "Todos os dias, no mesmo horário" e o QR vira um compromisso por dia na agenda do celular (ex.: novena de 15 a 23/12, 19h30 às 21h → 9 compromissos), em vez de um bloco só de 9 dias. O slide mostra "Todos os dias, de … a … · 19h30 às 21h". Uma dica no formulário explica como preencher cada caso.',
    '🎉 "Apresentar eventos" no roteiro: nova opção "Todos os eventos por vir" — a apresentação pega sozinha os eventos cadastrados que ainda não passaram (o evento novo entra, o que passou sai). O mesmo item serve em todos os roteiros sem precisar marcar nada.',
    '🎉 Um item "Apresentar eventos" novo já vem com a última configuração usada: segundos de cada slide, "Recomeçar do início", música e "Todos os eventos por vir".',
  ] },
  { versao: '1.9.4', data: '2026-11-17', itens: [
    '☁ Vídeos e áudios na nuvem da paróquia, em Vídeos e Áudios (com a sincronização ligada): "☁ Na nuvem, faltam aqui" mostra as mesmas subpastas de quem enviou, e o que você baixa vai para a mesma subpasta deste computador, então os roteiros acham o arquivo.',
    '▶ Prévia direto da nuvem: clique num vídeo ou áudio que ainda não está neste computador e ele toca ali mesmo, sem baixar (só aqui, não vai ao telão).',
    '☑ Marcar: caixinhas nos arquivos e nas pastas. Marque o que quiser e clique em "⬇ Baixar" ou "☁↑ Enviar"; os arquivos vão numa fila, um por vez, enquanto você continua usando o programa ("■ Parar a fila" interrompe). Quem não tem a pasta do Holyrics ganha a pasta Documentos\\MiguelAngelus\\Vídeos (ou Áudios) no primeiro download.',
    '✝ Liturgia do dia nas Missas de semana: o nome do santo no card do roteiro aparecia todo em minúsculas ("São leão magno, papa e doutor da igreja"). Agora fica "São Leão Magno, papa e doutor da Igreja", e os roteiros já criados são corrigidos sozinhos.',
  ] },
  { versao: '1.9.3', data: '2026-11-15', itens: [
    '🎸 "Montar a letra a partir da cifra" reconhece mais formatos de acorde do Cifra Club: G7/4, D7/9, Eb6/9, Bm7b5, N.C., as marcas de repetição (2x), x2, bis e as linhas "Intro: G D Em C". Antes, um acorde desses fazia a linha de acordes inteira ir para a letra. A causa mais comum era invisível: ao copiar do Cifra Club, algumas linhas vêm com um caractere sem largura no começo, e agora ele é ignorado. Também saem o "Capotraste…" do cabeçalho e os acordes entre colchetes no meio da letra ("[G]Santo").',
  ] },
  { versao: '1.9.2', data: '2026-11-15', itens: [
    '🤫 Novo momento "Momento de silêncio para oração pessoal" (no Inserir → Momento, em Rito da Comunhão). Ele nunca leva número, e a Oração depois da Comunhão continua com o slide de título dela.',
    '🤫 Em Ajustes, ao lado do "1º slide de cada parte com o nome dela", a chave "Momento de silêncio … depois do canto de comunhão, em todos os roteiros": cada roteiro aberto ganha esse momento logo depois do canto de comunhão. Se tirar de um roteiro, ele não volta; desligar a chave tira os que entraram sozinhos.',
  ] },
  { versao: '1.9.1', data: '2026-11-15', itens: [
    '🏷 Slide de título de cada parte: agora mostra só o nome da parte (ex.: "Santo"), sem o nome do canto embaixo, que confundia quem estava no telão. Para voltar a mostrar o canto (ou a referência do Salmo), desmarque "só o nome (sem o do canto)" em Ajustes, ao lado de "1º slide de cada parte com o nome dela". A linha que você escreve num item Momento continua aparecendo.',
    '📱 Celular dos músicos: a tela não apaga mais enquanto a página do MiguelAngelus está aberta, também nos celulares Android que abrem pelo endereço da rede da igreja.',
  ] },
  { versao: '1.9.0', data: '2026-11-14', itens: [
    '🎉 Aba Eventos (Alt+0): os eventos da paróquia (festas, retiros, cursos) com cartaz e QR code. Clique num evento para projetar: o cartaz fica à esquerda e o QR à direita; quem aponta a câmera do celular recebe "Adicionar à agenda", sem precisar de internet. Dá para criar e editar aqui ou na Secretaria MiguelAngelus: os eventos vão e voltam pela nuvem (só os eventos: os dados da secretaria não vêm para cá).',
    '🎉 "Apresentar eventos" no Adicionar do roteiro: marque quais eventos entram, quantos segundos cada um fica no telão e se recomeça do início ao terminar. Clique no primeiro slide e os outros passam sozinhos. A apresentação espera com o telão congelado e para se você projetar outra coisa ou usar Limpar.',
    '🎵 Som na apresentação de eventos: escolha um áudio (ou "📂 Arquivo de áudio…"). Ele toca enquanto os eventos passam e para, abaixando devagar, quando as imagens acabam.',
    '🔁 Repetir em grupo: itens seguidos do roteiro marcados para repetir (um vídeo com "Repetir" e a apresentação de eventos com ↻, por exemplo) viram um grupo. Cada um passa uma vez e chama o seguinte; depois do último, o grupo recomeça. O grupo aparece no roteiro com uma barra verde-água e 🔁.',
    '📅 Campos de data com o calendário que abre ao clicar, no tema escuro e no claro.',
  ] },
  { versao: '1.8.10', data: '2026-11-13', itens: [
    '📖 Liturgia do dia (Missas de semana): além das leituras da Paulus, o roteiro agora traz as orações próprias do dia — a Oração da Coleta (no lugar da Coleta fixa), a Oração sobre as Oferendas (depois do Orai, irmãos), a Antífona da Comunhão e a Oração depois da Comunhão (antes da bênção). Essas orações vêm da API Liturgia Diária, projeto livre e gratuito de Dancrf (github.com/Dancrf/liturgia-diaria) — ideia do Luciano —, buscadas na hora de montar; sem internet, fica como antes. O crédito das fontes aparece na tela da Liturgia do dia.',
    '📖 Fonte das leituras: em Ajustes → 📖 Bíblia → "Liturgia do dia" escolha a fonte principal — Paulus (padrão, a mesma editora do Missal) ou a API Liturgia Diária. Se a principal não responder (sem o dia publicado, site fora do ar), o botão "🌐 Buscar a liturgia" tenta a outra e avisa de onde vieram as leituras. A API não traz a aclamação ao Evangelho: confira no roteiro.',
    '✝ Orações Eucarísticas e Prefácios: botões "⬇ Exportar textos" e "⬆ Importar textos…" no painel. Salvam num arquivo .json os textos já cadastrados (✓) e trazem de volta em outro computador ou paróquia. Na importação, os textos novos entram; se algum já existe com texto diferente, o programa pergunta se troca. Também dá para arrastar o arquivo para a janela.',
    '📖 Correções na Liturgia do dia: pedir um dia do mês seguinte não traz mais, por engano, o mesmo dia do mês atual; e os domingos do Advento e da Quaresma saem sem o Glória.',
    '🖼 Botão "Imagem" no Adicionar (e no Ctrl+I): um banner, um flyer ou um cartaz no roteiro — por exemplo, antes da Missa começar. Já abre em "Só a imagem": escolha o arquivo, cole (Ctrl+V) ou arraste para a janela. Dá para trocar para imagem com texto. Use ↑ ↓ para pôr no lugar certo.',
    '📢 Avisos paroquiais para várias comunidades: marque "Todas" ou só as capelas onde o aviso vale (antes era uma só ou todas). Cada aviso continua com a data de início e de fim.',
    '🖨 Avisos de uma celebração (na janela 📢 Avisos paroquiais): escolha o dia e a Missa e veja só os avisos que valem nela. "🖨 Imprimir / PDF" faz a folha A4 para ler no ambão; "🖼 Imagens para o Holyrics" grava os avisos como imagens Full HD na pasta de imagens do Holyrics (sugerida sozinha na primeira vez).',
    '☁ Avisos na nuvem juntam aviso por aviso: se dois computadores (ou a nova Secretaria MiguelAngelus) mexem em avisos diferentes ao mesmo tempo, nada se perde, e o que um apagou some também no outro. Num computador ligado à nuvem pela primeira vez, a Agenda e os Avisos que já estão na nuvem têm prioridade.',
    '🗂 Pronto para a Secretaria MiguelAngelus 1.0: um programa separado para a secretaria paroquial cadastrar a Agenda e os Avisos, que chegam aqui pela nuvem.',
  ] },
  { versao: '1.8.9', data: '2026-11-13', itens: [
    '↺ Cantos: depois do último slide da música aparece o cartão "Recomeçar". Um clique e o telão volta ao começo da letra (pula o slide de título) — para quando o grupo repete a música (na Comunhão, por exemplo) sem precisar rolar a lista de volta.',
  ] },
  { versao: '1.8.8', data: '2026-11-13', itens: [
    '☁ Botão "Atualizar" nas abas Roteiros, Cantos, Bíblia, Orações e Apresentações: busca na hora o que os outros computadores mudaram na nuvem (um canto novo, um roteiro preparado em casa), sem esperar a sincronização automática nem fechar e abrir o programa. Aproveita e manda para a nuvem o que mudou aqui. No fim, mostra quantos itens chegaram. Aparece só com a sincronização ligada (Ajustes → Sincronização).',
    '▶ Ajuda → Sobre: link para o canal "MiguelAngelus" no YouTube, com os vídeos tutoriais (primeiros passos, roteiro, telão, músicos).',
  ] },
  { versao: '1.8.7', data: '2026-11-11', itens: [
    '✎ Ato Penitencial, Glória, Santo, Cordeiro e Aclamação rezados (o texto que veio do folheto): o botão Editar do item agora abre o texto para corrigir ali mesmo — antes ficava cinza. O ✎ no canto do slide também leva direto ao trecho. A correção vale só para aquele roteiro.',
    '📱 No app dos músicos, o título do canto não fica mais espremido ao lado dos botões "Cifra | Partitura" em celular estreito.',
  ] },
  { versao: '1.8.6', data: '2026-11-11', itens: [
    '🎼 Partitura dos cantos: no cadastro do canto, abaixo da cifra, "🎼 Partitura para os músicos" → Carregar PDF ou imagem. No PDF do folheto (como o "Povo de Deus" de São Paulo, com várias músicas), você toca nas páginas daquele canto — as que têm o título dele já vêm marcadas — e as margens brancas saem sozinhas. Também aceita foto ou imagem da partitura. Sincroniza com a nuvem junto com os cantos.',
    '🎸🎼 No app dos músicos, o canto que tem as duas mostra os botões "Cifra | Partitura": cada músico escolhe o que quer ver (quem toca violão fica na cifra; sopro e teclado, na partitura). A escolha fica guardada no aparelho e vale para os próximos cantos. A− e A+ ampliam a partitura. Só aparelhos pareados recebem as partituras.',
    '🎼 Partituras do folheto (Roteiros → "🎼 Partituras do folheto", ou Ferramentas): abra o PDF de partituras do domingo inteiro — ou baixe direto do site da Arquidiocese de São Paulo (Folheto Povo de Deus) — e o MiguelAngelus separa as músicas pelo título e liga cada uma ao canto do roteiro aberto: pela letra, mesmo que o nome seja um pouco diferente. A antífona e o salmo vão para o item deles no roteiro; canto que ainda não existe vira canto novo, no lugar vazio do momento (confira a letra, que vem da partitura). Você confere tudo antes de guardar.',
    '🎯 Na partitura, o celular mostra onde o telão está: a pauta do slide no ar ganha uma faixa vermelha clara e a linha da letra fica marcada em amarelo, e a tela rola até ela. Separa as estrofes que começam igual e segue em frente no refrão repetido. Vale para partitura de PDF digital (o caderno de São Paulo, por exemplo).',
    '🙏 Ideia do Luciano, da Paróquia Santa Marina (Vila Carrão, São Paulo).',
  ] },
  { versao: '1.8.5', data: '2026-11-10', itens: [
    '📡 O telão inteiro por NDI: em Ajustes → Transmissão (NDI → OBS), marque "Transmitir também o telão inteiro". Vai a mesma imagem da janela de projeção — fundo, imagens, vídeos, Pix — com o nome "MiguelAngelus Telão". No MiguelAngelus Cast de outro computador da rede ele aparece sozinho, em primeiro, no "+ Cena". Só pesa enquanto algum programa está recebendo. A projeção precisa estar aberta (pode ficar atrás de outras janelas, mas não minimizada).',
    '🔗 O roteiro do MiguelAngelus Cast acompanha o telão: a cada troca de slide, o MiguelAngelus avisa o Cast da rede (só o nome do item e o número do slide). Perto do fim de cada item, o Cast já prepara a cena e a câmera do próximo momento. Precisa do Controle pelo celular ligado.',
    '✂️ Forma breve das leituras: quando a leitura tem forma breve (os trechos entre colchetes), o roteiro entra com a completa e, ao abrir a leitura, aparece a chave "Forma breve" ao lado do título. Ligou, o texto e a referência trocam para a breve; desligou, volta a completa. Funciona com a Liturgia do dia (Paulus) e com os folhetos da Arquidiocese do Rio e de São Paulo (PDF), nos roteiros montados a partir desta versão. A linha "(… mais breve: …)" do folheto de São Paulo não vai mais para o telão.',
  ] },
  { versao: '1.8.4', data: '2026-11-09', itens: [
    '📺 Telão no tablet ou na TV: no pareamento do Controle pelo celular, escolha "📺 Telão". O aparelho (tablet, TV com navegador, um celular velho no presbitério) mostra em tela cheia o mesmo slide do telão, com as mesmas cores, e acompanha sozinho pelo Wi-Fi — sem cabo. Ele só vê: não mexe em nada. Toque na tela para ocupar a tela inteira. Funciona também nas TVs e tablets antigos.',
    '🙏 Ideia do Luciano, da Paróquia Santa Marina (Vila Carrão, Zona Leste de São Paulo). Obrigado, Luciano! E que alegria saber que os folhetos da Arquidiocese de São Paulo entraram certinho no MiguelAngelus.',
  ] },
  { versao: '1.8.3', data: '2026-11-08', itens: [
    '🛡 MiguelAngelus Cast: o brasão e o logo da Pascom (os cantos de cima do telão, em Apresentação) também vão para o Cast da rede e entram sozinhos na capa da live.',
  ] },
  { versao: '1.8.2', data: '2026-11-08', itens: [
    '🖼 MiguelAngelus Cast: a ilustração do folheto da semana (a da Abertura do roteiro) também vai para o Cast da rede, e entra sozinha na capa da live. Só na rede local, como a agenda.',
  ] },
  { versao: '1.8.1', data: '2026-11-08', itens: [
    '📡 MiguelAngelus Cast (o programa de transmissão da Pascom, em testes): com o Controle pelo celular ligado, o MiguelAngelus passa a agenda das próximas 2 semanas para o Cast da rede — só datas, horas, capelas e se já tem roteiro (nada de intenções). Assim a capa da live e a "próxima transmissão" do Cast se acertam sozinhas.',
  ] },
  { versao: '1.8.0', data: '2026-11-08', itens: [
    '🏷 Momento: um slide só com o nome do momento ("Saudação", "Bênção Final"…), como no folheto. Botão "Momento" no Adicionar: escolha o nome numa lista separada pelas partes da Missa, ou "✎ Outro nome…". Leva o número do folheto da parte seguinte, e a parte seguinte não repete o título.',
    '✋ Arrastar os itens do roteiro: segure um item e solte onde ele deve ficar (a linha dourada mostra onde entra).',
    '⌨ Para quem usa mais o teclado (pedido do Lucas): Ctrl+I (ou Insert) abre "Inserir no roteiro" — digite e Enter (Canto, Leitura, Momento, Parte da Missa…). No Ctrl+F, as setas ↑ ↓ escolhem o resultado, Enter abre e Ctrl+Enter coloca o canto, a oração ou o versículo no roteiro.',
    '❄ Congelar (tecla C, também pedido do Lucas): o telão fica parado no slide que está no ar enquanto você procura, abre e prepara o próximo. Ao descongelar, vai ao ar o que estiver preparado.',
    '💡 Passando o mouse num botão que tem tecla de atalho, aparece a tecla.',
    '💠 Pix sozinho no ofertório: o QR do Pix liga quando entra o canto do Ofertório (ou a Apresentação das Oferendas) e desliga quando o próximo item do roteiro vai ao ar. Ajustes → 💠 Pix (dá para desligar).',
    '✝ A cruz latina, como a dos folhetos, agora é o desenho padrão no telão (o ✠ do Missal continua em Ajustes → Aparência do telão → Cruz → Desenho). E a cruz aparece também em "no Corpo e ✝ no Sangue" (Oração Eucarística V).',
    '¹² O número do versículo fica colado na palavra seguinte, como no folheto (ideia do Thiago).',
    '📂 Botão direito num vídeo ou áudio da pasta: "Mostrar na pasta" ou "Abrir a pasta" no Windows Explorer.',
    '⭐ Mídias favoritas: marque a ☆ dos vídeos e áudios mais usados (Abertura da transmissão, Seja bem-vindo) e eles ficam no topo da lista e da escolha de mídia no roteiro. Botão direito → "Dar um apelido" (ex.: Boas-vindas NSC). O Seja bem-vindo da capela do roteiro aberto aparece primeiro, com 📍 (pela sigla da capela no nome ou no apelido). Para trocar o vídeo sem perder a ⭐ nem os roteiros: botão direito → "Trocar o arquivo…" (nos guardados no MiguelAngelus), ou dê o mesmo apelido ao arquivo novo.',
  ] },
  { versao: '1.7.9', data: '2026-11-07', itens: [
    '✉ O MiguelAngelus tem e-mail: contato.miguelangelus@gmail.com — para dúvidas, sugestões e outras paróquias que queiram usar. Está em Ajuda → Sobre o MiguelAngelus, no Manual e no site.',
  ] },
  { versao: '1.7.8', data: '2026-11-02', itens: [
    '🔢 Nome da parte "com número": nos roteiros do folheto, o número é o do folheto (5. Primeira Leitura), só nas partes que o folheto numera — comentários, antífonas e o que foi acrescentado ficam sem número. Nas Missas sem folheto, o programa conta as partes como antes, sem os comentários, antífonas e intenções. Para um roteiro importado antes desta versão ganhar os números do folheto, importe o folheto de novo.',
    '✠ A cruz do Missal no telão, como no folheto (ideia do Thiago): "✠ Proclamação do Evangelho", na Oração Eucarística no "Santificai" — "…o Corpo e ✠ o Sangue…", logo antes da consagração, a hora do carrilhão dos coroinhas — e na bênção final ("Pai e Filho ✠ e Espírito Santo"). Vale para qualquer roteiro e Oração Eucarística, até os que já estão no programa. Ajustes → 🎨 Aparência do telão → Cruz ✠ (liga/desliga e a cor; vermelha é o padrão).',
    '¹² Números dos versículos nas leituras, como no folheto (ideia do Thiago): pequenos em cima, na cor do P./T. Valem para os folhetos importados a partir desta versão (para uma Missa já montada, importe o folheto de novo). Ajustes → 🎨 Aparência do telão → "Números dos versículos nas leituras".',
  ] },
  { versao: '1.7.7', data: '2026-11-02', itens: [
    '✎ Editar um slide sem projetar (ideia do Thiago, na Missa de Finados): passando o mouse num slide do roteiro aparecem ✎ e ✕. O ✎ leva o cursor ao texto daquele slide e a prévia mostra como fica — o telão continua com o que está no ar. Se o slide editado é o que está no ar, ao sair da caixa de texto o telão recebe a correção na hora, sem apagar.',
    '✕ Excluir um slide: tira aquele trecho do texto deste roteiro (pergunta antes; Ctrl+Z traz de volta). Na letra dos cantos, que é a mesma em todos os roteiros, o ✎ abre o editor do canto.',
    '🕯 Intenções da Missa: botão "Intenções" no Adicionar — uma intenção por linha (falecidos, ação de graças, aniversários…), cada uma na sua linha do slide; muitas viram vários slides sozinhas.',
    '🙏 Oração dos Fiéis com "Outras intenções da comunidade…" e a resposta do povo, depois da última prece (desmarque "Outras intenções" no item para tirar). E a 1ª prece que aparecia também no convite (folheto de Finados) não repete mais.',
    '✝ "Que o Corpo e o Sangue de Cristo nos guarde para a vida eterna. Amém." agora entra também quando o folheto já traz o "Senhor, eu não sou digno" (como em Finados) — nos roteiros novos e nos que já estão no programa.',
    '🔤 Palavras com til separadas ("escravid ão"), que vinham assim do PDF do folheto, aparecem juntas no telão.',
    '📘 Manual (tecla F1): tudo isso no capítulo 5, Revisando o roteiro.',
  ] },
  { versao: '1.7.6', data: '2026-11-01', itens: [
    '🌫 Transição suave (ideia do Thiago): o texto some e aparece devagar a cada Próximo; a câmera e os vídeos também entram e saem devagar, e a faixa de letras do OBS faz o mesmo. Ajustes → 🎨 Aparência do telão → Transição entre os slides: Suave (padrão), Lenta ou Rápida (como era antes).',
    '🔵 Nome da parte junto do texto (ideia do Thiago): em vez de um slide só com o nome, o nome vai em cima do 1º slide da parte, colorido como no folheto e, com "com número", numerado na ordem do roteiro ("6. Primeira Leitura"). Ajustes → 🎨 Aparência do telão → "Nome da parte junto do texto, colorido" (e a cor ao lado).',
    '↔ Texto centralizado ao desviar das imagens dos cantos (ideia do Thiago): o texto desvia só da parte que aparece da imagem (a borda transparente do PNG não conta mais) e deixa o mesmo espaço dos dois lados, para não ficar puxado para a esquerda por causa do padroeiro. Ajustes → 📏 Tamanho dos slides → "Texto sempre centralizado".',
    '📖 Antífonas (ideia do Thiago): botão "Antífona" no Adicionar. Com o canto de Entrada aberto, entra a Antífona de Entrada logo depois; da Liturgia Eucarística em diante, a Antífona da Comunhão. É só colar o texto do Missal.',
    '📘 Manual (Ajuda → Manual do MiguelAngelus, tecla F1): as ideias do Thiago estão no capítulo 5, Revisando o roteiro.',
  ] },
  { versao: '1.7.5', data: '2026-10-31', itens: [
    '📿 Novos desenhos do terço no telão (Ferramentas → Ajustes → 📿 Terço): além do Redondo, o Pendurado (como o terço na mão), o Coração e as Dezenas em fileiras (as cinco dezenas uma embaixo da outra, com o número do mistério da vez aceso). E as contas podem ser Lisas, Pérolas ou Rosas. Cada opção mostra a prévia; clique para escolher, e o telão muda na hora.',
    '📘 Manual atualizado (Ajuda → Manual do MiguelAngelus, tecla F1): slides automáticos, prévia enquanto edita, 🔎 procurar canto, 🅿 Pôr P./T. nos roteiros antigos, versões do terço e o terço desenhado no telão, nomes do Papa e do Bispo, do Pai-Nosso ao Cordeiro, abreviações da Bíblia — e como tudo começou.',
  ] },
  { versao: '1.7.4', data: '2026-10-25', itens: [
    '🔎 Procurar canto no item do roteiro: digite um pedaço do título, do autor ou da letra (sem precisar de acento) e a lista mostra só os que combinam — nos favoritos (com "⭐ só favoritos", de qualquer momento) ou no acervo completo. No topo vêm os "🎯 Mais parecidos"; Enter escolhe o melhor.',
    '🐞 Bíblia: "Eclo" (Eclesiástico, como vem nos folhetos — ex.: Eclo 3,2-6, na festa da Sagrada Família) não era encontrado na Bíblia Pereira de Figueiredo, onde o livro se chama "Eclesiástico (Sirácida)". Agora Eclo, Sir e Eclesiástico funcionam, nas leituras dos roteiros e na aba Bíblia.',
    '🐞 Botão "Baixar folheto da Arquidiocese": a etiqueta "novo" some assim que os roteiros do dia são montados (antes, só ao fechar e abrir o programa).',
  ] },
  { versao: '1.7.3', data: '2026-10-24', itens: [
    '📿 Versões do terço (Ajustes → 📿 Terço → Versões do terço): terços com outros textos — pelos Filhos, da Misericórdia… Cada parte pode trocar o texto: abertura, meditação de cada mistério, conta maior, contas menores (10×, com a conta da vez acesa no telão), depois da dezena (com ou sem o Glória) e encerramento; o que ficar vazio é o tradicional. Dá para fixar os mistérios (ex.: sempre os Luminosos). No roteiro, escolha a versão no cabeçalho de qualquer item do terço, ou use "Novo roteiro" na própria versão. Vão para os outros computadores pela nuvem; também dá para importar de arquivo.',
    '📿 Terço com dezenas de tema próprio (ex.: Terço Vocacional — "1ª Dezena: Nazaré, escola da vocação"): na versão, dê um título a cada parte e ela entra no lugar do mistério do dia.',
    '🐞 Terço no automático: o anúncio do mistério ("1º Mistério Gozoso" / "A Anunciação…") volta a sair em duas linhas no telão.',
    '🐞 Nomes do Papa e do Bispo mudados em outro computador: chegam na hora (antes, só depois de fechar e abrir o programa).',
  ] },
  { versao: '1.7.2', data: '2026-10-24', itens: [
    '✨ Prévia também nas janelas de editar canto, oração, parte fixa da Missa e texto da Oração Eucarística: no lugar da prévia da direita aparece o slide onde está o cursor, como vai ficar no telão, e muda enquanto você digita — antes de salvar. O telão não muda.',
    '🅿 Roteiros antigos (importados antes da 1.6.14) sem as letras P. e T.: abra o roteiro e clique em "🅿 Pôr P./T." (ao lado de Duplicar). As falas do povo ("—") viram "T." e as do padre ganham "P.", como nos folhetos importados agora. O botão só aparece nos roteiros que precisam.',
    '🐞 Prévia na edição: com o cursor no meio de uma palavra, mostra o slide certo (antes podia mostrar outro slide com uma palavra parecida).',
  ] },
  { versao: '1.7.1', data: '2026-10-18', itens: [
    '🙏 Nomes do Papa e do Bispo (Ajustes → 🙏 Papa e Bispo): no telão, "o vosso servo o Papa N., o nosso Bispo N." sai "o Papa Leão, o nosso Bispo Orani João" — nos folhetos importados, nas orações eucarísticas do catálogo e nas orações. Vale para todos os computadores; quando mudar o Papa ou o Bispo, é só trocar ali.',
    '🐞 Refrão em negrito (ou trecho com cor/tamanho) dividido em dois slides: os dois saem formatados e a lista de slides não fica mais com espaços vazios entre os cartões.',
  ] },
  { versao: '1.7.0', data: '2026-10-17', itens: [
    '✨ Slides automáticos (Ajustes → Aparência do telão → 📏 Tamanho dos slides → "Automático"): a cada slide, o programa calcula o tamanho da letra, as linhas e o espaço entre as palavras para o texto ocupar toda a área das margens. Leituras em texto corrido saem justificadas; textos curtos e cantos, centralizados (sem buracos entre as palavras).',
    '✨ No automático, cada bloco separado por uma linha em branco é um slide: para separar um slide em dois, deixe uma linha em branco no texto (Enter duas vezes); para juntar, tire a linha em branco. Cada slide tem no máximo 6 linhas (7 só quando a 7ª ficaria sozinha no slide seguinte): um bloco maior é dividido sozinho, em partes iguais e sempre no fim de uma frase.',
    '✨ Com o automático ligado, o tamanho máximo, o alinhamento e os limites de linhas/caracteres ficam apagados (guardados, voltam se desligar). Negrito, itálico, sublinhado e cores do editor continuam valendo.',
    '✨ Editando o texto de um item, a prévia da direita mostra o slide onde está o cursor, já como fica no telão, e muda enquanto você digita (o rótulo fica amarelo: "EDITANDO — slide N"; o slide também fica marcado em amarelo na grade). O telão não muda nada: continua com o que está no ar. Ao sair da caixa de texto, a prévia volta a mostrar o telão.',
    '👤 O perfil (Salvar o atual como perfil) agora grava também a chave "Automático" e o "Numerar versículos". Perfis gravados antes não têm a chave: escolha o perfil, ligue ou desligue o Automático e use "Gravar o atual".',
    '🐞 Numa prece ou estrofe longa, o número ("1.") ou a letra de quem fala (P., T.) não fica mais sozinho num slide: sempre vai junto do texto.',
  ] },
  { versao: '1.6.16', data: '2026-10-17', itens: [
    '💻 Telas menores (como a da Capela NSF): os botões compridos da coluna da esquerda, em todas as abas ("Ler folhetos antigos (cantos e orações)…"), quebram a linha em vez de ficar cortados; os botões do painel (Tirar, Altar, Aviso, Pix) aparecem com o nome inteiro, em duas linhas quando não cabem; a liturgia na barra de cima mostra o começo de cada parte (antes sumia o início do nome do santo); "Recolher tudo" e "Expandir tudo" ficam juntos.',
  ] },
  { versao: '1.6.15', data: '2026-10-17', itens: [
    '📿 Terço no telão: todas as orações (Ave-Maria, Pai-Nosso, Glória, Creio, Salve-Rainha…) agora em texto corrido, ocupando a largura toda e com letra bem maior — sem as linhas curtas e os buracos do justificado.',
    '✝ "Ave Maria, cheia de graça" sem a vírgula entre Ave e Maria — corrigido sozinho na Ave-Maria e no Ângelus já gravados (só essa vírgula; o resto do texto fica como estava).',
    '📿 Terço com imagens nos cantos de baixo: Nossa Senhora à esquerda e, à direita, o desenho do terço que vai se preenchendo conforme se reza (contas rezadas em dourado, a da vez acesa). O texto desvia das imagens. Liga/desliga e troca da imagem de Nossa Senhora por uma sua em Ajustes → 📿 Terço (ou no cabeçalho do item do terço).',
    '🎮 Zoom pelo gatilho mais suave: o começo do aperto agora é bem lento (chega à velocidade mais lenta da câmera) e a velocidade só sobe no fim do curso. Com o gatilho pela metade, o zoom vai na velocidade 2 de 7 (antes, 4). Para deixar ainda mais lento, baixe a "Velocidade do zoom" em Ajustes → 🎮 Joysticks.',
    '🎮 Posições da câmera (Controle PTZ): o ✎ e o ✕ agora aparecem flutuando no canto do botão ao passar o mouse — as posições não pulam mais de lugar embaixo do mouse (no notebook a grade se rearrumava e o clique caía na posição errada).',
    '📋 Roteiros: os botões de criar (Novo roteiro, Do folheto, Pela Agenda, Terço) ficam numa seção "➕ Criar roteiro" que recolhe como as outras e começa recolhida — os roteiros aparecem logo no alto. Aberta, é uma faixa baixa de botões. (Os botões Novo, Folheto e Agenda da coluna da esquerda continuam lá.)',
    '💻 Notebook (tela menor): na coluna da esquerda, os botões compridos ("Liturgia do dia (Missas de semana)") quebram a linha em vez de ficar cortados, e não aparece mais a barra de rolagem de lado.',
    '📵 Controle pelo celular: aviso na tela do QR code — Android com chip que não abre a página está usando os dados móveis (a rede do MiguelAngelus não tem internet): desligue os dados móveis ou a opção "Alternar para dados móveis" do Wi-Fi.',
  ] },
  { versao: '1.6.14', data: '2026-10-16', itens: [
    '✝ Todas as partes fixas da Missa agora mostram quem fala, como no folheto: P. (padre), T. (povo, em negrito) e L. (leitor). A letra só aparece onde a fala muda — o slide que continua a fala anterior não repete o "P." ou o "T." (a do povo continua em negrito). Se você tinha editado o texto de alguma parte, a sua versão continua valendo (use Restaurar para ficar com a nova).',
    '✝ Partes fixas da Missa (aba Orações): nova "Oração da Coleta", logo depois do Glória, para as Missas da semana cujo folheto não traz a Coleta. Dá para editar o texto com duplo clique, como as outras partes, e a mudança vai pela nuvem.',
    '📖 Liturgia do dia (Missas de semana): o roteiro montado com a Paulus agora traz a Oração da Coleta (depois do Senhor, tende piedade / Glória) e o Orai, irmãos (antes do Prefácio) e o convite ao Pai-Nosso ("Rito da Comunhão": Obedientes à palavra do Salvador… ousamos dizer:), com o Pai-Nosso emendado logo depois; as leituras e o Evangelho saem com L., P. e T.',
    '✝ O Pai-Nosso (partes fixas da Missa) agora continua até o abraço da paz, com P. e T. como no folheto: Livrai-nos, Vosso é o reino, oração pela paz com o Amém, A paz do Senhor e o convite à saudação da paz — o que o folheto não traz entre o Pai-Nosso e o Cordeiro. Os modelos de roteiro já usam assim. Num roteiro antigo com "Pai-Nosso" seguido de "Saudação da Paz", pode tirar a Saudação da Paz (ela já está no fim do Pai-Nosso).',
    '📄 Folheto da Arquidiocese: o "Rito da Comunhão" termina em "T. Pai nosso..." — agora, ao importar, essa linha sai e entra logo depois o Pai-Nosso e Rito da Paz completo, sem slide de título (é a continuação do rito), antes do Cordeiro. Vale também para os roteiros já importados. Folheto que traz o Pai-Nosso inteiro fica como está.',
    '✝ "Eis o Cordeiro de Deus" com o texto novo do Missal e P./T.: Provai e vede como o Senhor é bom… / Senhor, eu não sou digno(a)… / Que o Corpo e o Sangue de Cristo nos guarde para a vida eterna. Amém. Ao importar o folheto, entra sozinho logo depois do Cordeiro, sem slide de título (se o folheto ainda não traz o "não sou digno").',
    '➕ Adicionar algo aberto pela aba Orações ou Cantos agora entra logo depois do último item do roteiro em que você clicou (antes ia para o fim do roteiro). O Pai-Nosso posto logo depois do "Rito da Comunhão" também entra sem slide de título.',
  ] },
  { versao: '1.6.13', data: '2026-10-16', itens: [
    '🎮 Joystick: a câmera para na hora em que você solta a alavanca. Antes, soltando rápido (menos de 1/10 de segundo depois do último movimento), o "parar" podia se perder e a câmera continuava andando. Agora o "parar" vai na hora e é repetido logo depois, por segurança.',
    '🎮 Dica para o controle GameSir: se a câmera anda sozinha devagar com a alavanca solta, aumente a "Folga das alavancas" para 0,40 em Ajustes → 🎮 Joysticks (essa alavanca não volta bem ao centro).',
  ] },
  { versao: '1.6.12', data: '2026-10-15', itens: [
    '📄 Folheto do Presidente (o do padre, "PE"): agora é lido direito. A fala do padre, em letra grande, não vira mais um monte de títulos — o roteiro sai com as mesmas partes da versão Celular (antes saíam 55 a 99 pedaços).',
    '📄 Folhetos feitos no Word (como o da São José Operário): títulos sem número ("Canto de Entrada", "Saudação") e "REFRÃO" sem dois-pontos são reconhecidos; as duas colunas não se misturam mais.',
    '📄 O nome da celebração vem certo da capa em mais casos: Domingo de Ramos e da Paixão do Senhor, Quinta-Feira da Ceia do Senhor, Sexta-Feira da Paixão, Vigília Pascal, Ascensão, Natal, Quarta-Feira de Cinzas, Santos Pedro e Paulo… com "— Solenidade" quando é.',
    '📄 Também: as palavras da consagração não viram título; as leituras da semana e os anúncios do fim do folheto ficam fora do roteiro; autores dos cantos sem texto a mais; sílabas soltas de texto justificado ("Res - surreição") juntadas; rubricas como "(De pé)" e "(Sentados)" fora do telão.',
    '✝ Prefácios lidos dos folhetos caem no nome certo do catálogo ("Páscoa I", "Ascensão do Senhor I", "Santíssima Eucaristia I", "Imaculada Conceição", "1º Domingo da Quaresma — A tentação do Senhor") em vez de virar um nome novo.',
  ] },
  { versao: '1.6.11', data: '2026-10-15', itens: [
    '🌐 Acompanhar pela internet (Ajustes → Transmissão): os slides do telão, só o texto, aparecem na hora no celular, tablet ou TV de quem lê o QR code — pelo 4G, de qualquer lugar, sem instalar nada (pascom-sjo.github.io/aovivo.html). A cor segue o tema do telão; Mudo e Limpar também valem lá.',
    '🌐 Código do dia: muda sozinho todo dia (ou no ↻ Trocar); a página não aparece no Google e só abre com o código. Escolha o que vai: cantos, leituras, respostas e avisos. O botão 📺 Mostrar o QR no telão põe no canto da tela o QR code e o código para a assembleia.',
    '🌐 Sem código (link aberto): marque e quem abrir pascom-sjo.github.io/aovivo.html (ou ler o QR) já acompanha, sem digitar nada. Desmarcando, volta a pedir o código do dia.',
    '🌐 No topo da tela, o selo 🌐 mostra quantas pessoas estão acompanhando (clique para os ajustes). O QR "Acompanhe no celular" agora tem botão 📱 QR no painel, ao lado do Pix, e no celular de controle — sem abrir os Ajustes no meio da Missa.',
    '🏷 Classificações dos cantos (aba Cantos → ⚙, ou Editar → Classificações dos cantos…): crie as suas (Batizado, Crisma, Natal…), renomeie, apague e ponha em ordem — as pastas da aba Cantos e as listas seguem essa ordem. As da Missa (🔒) não mudam de nome nem são apagadas, mas mudam de lugar. Apagar uma classificação não apaga cantos: eles vão para Outros. Vai para os outros computadores pela nuvem.',
  ] },
  { versao: '1.6.10', data: '2026-10-15', itens: [
    '🎉 Nova classificação de canto: Animação (para os cantos de animação, como "Incendeia"). Aparece na aba Cantos, no editor do canto e no momento dos itens do roteiro.',
    'A lista de cantos do roteiro passa a mostrar também cantos de qualquer classificação nova que venha numa importação — nenhum canto fica de fora.',
    'Ajuda → Sobre: as redes da Paróquia São José Operário (Instagram, Facebook e YouTube) e o site do MiguelAngelus (pascom-sjo.github.io), com o botão de baixar a versão mais nova. A tela de abertura agora diz PASCOM — São José Operário Ilha.',
  ] },
  { versao: '1.6.9', data: '2026-10-15', itens: [
    '🎮 Joysticks (Ferramentas → Ajustes → 🎮 Joysticks): até dois controles USB tipo Xbox (como o GameSir), lidos direto do Windows — funcionam com o MiguelAngelus minimizado ou atrás do OBS. O desenho do controle mostra o botão apertado e cada botão tem uma lista de funções: posições (da câmera do joystick ou de uma câmera escolhida), controlar uma câmera (um controle só para as duas), zoom, foco, brilho, contraluz, velocidades, câmera no telão, próximo slide, Mudo, Altar, Pix…',
    '🎮 Padrão pronto: alavanca esquerda move (quanto mais empurra, mais rápido); alavanca direita e setas movem devagar, para o ajuste fino; gatilhos dão zoom proporcional; A/B/X/Y chamam as posições 1 a 4; Back troca a câmera; Start passa o slide; o clique das alavancas muda a velocidade.',
    '🎮 Um botão, uma posição para cada câmera: em "Posição da câmera do joystick", escolha pelo nome a posição de cada câmera (ex.: A → Central: Altar · Lateral: Músicos). O botão leva a câmera que está sendo controlada à posição dela.',
    '🎮 Perfis dos joysticks (ex.: "Missa das crianças", com um botão para a posição do teatrinho; "Adoração"): guardam os dois controles com um nome e vão para os outros computadores pela nuvem.',
  ] },
  { versao: '1.6.8', data: '2026-10-12', itens: [
    '🔗 Links no celular (Ajustes → 📱 Controle pelo celular → Links): botões que abrem outra página direto do MiguelAngelus no celular — na aba 🎸 Cifras dos músicos e na aba 🎬 Mídia do controle. Já vem com a 🎚️ Mesa de som (http://192.168.0.20, a mesa no roteador do MiguelAngelus). Cada link tem nome, endereço, ícone (emoji ou uma imagem sua) e para quem aparece (todos, só músicos ou só o controle). Vão para os outros computadores pela nuvem.',
    '🎨 Manual da aparência dos slides (Ajuda): guia com fotos para os operadores — as 4 camadas (comunidade, tema, perfil, roteiro), o seu perfil, os ajustes em slides específicos na preparação e os combinados da equipe.',
    'Fundo próprio de um item: a letra fica branca com sombra em qualquer tema (no Creme e no Azul claro ficava escura por cima da imagem).',
    'Correção: o título da Abertura não mostra mais a marca de cor (“<azul>…”) na lista do roteiro e na impressão.',
  ] },
  { versao: '1.6.7', data: '2026-10-12', itens: [
    'Saudação (Orações → Missa): o texto padrão passa a ser só "Em nome do Pai e do Filho e do Espírito Santo. — Amém.", como a paróquia usa.',
    '📿 A Ladainha de Nossa Senhora agora fica em Orações → Ladainhas, junto das outras.',
    '💠 Pix também no OBS: com a transmissão NDI ligada, ao pôr o Pix no ar a faixa do CNPJ (alto à esquerda) e o QR code (alto à direita) entram na transmissão, como no telão com a câmera; ao tirar o Pix, saem. Liga e desliga em Ajustes → Transmissão → "💠 Pix". Os tamanhos são os mesmos do Pix com a câmera (Ajustes → 💠 Pix).',
  ] },
  { versao: '1.6.6', data: '2026-10-12', itens: [
    '💾 Salvar e enviar para a nuvem, no editor da Apresentação de cada capela (imagens dos cantos e tema): grava na hora e já sincroniza, sem esperar fechar o programa.',
    'Correção: a apresentação de cada capela não é mais desfeita quando outro computador mexe na Agenda (ex.: cria um roteiro pela Agenda). Na sincronização, vale a versão mais nova de cada capela.',
    '📱 Um QR code para cada rede no Controle pelo celular: botões em cima escolhem a rede (ex.: 📶 o roteador só do MiguelAngelus ou 🌐 o Wi-Fi da igreja) e aparece só o QR dela — assim a câmera do celular não pega o errado. A última escolhida fica lembrada; ⚠ marca a rede que o Firewall está barrando. Cada rede aparece com o nome que o celular vê: o do Wi-Fi em que o computador está (ex.: o da igreja) e "MiguelAngelus" para o roteador no cabo; o ✎ troca o nome.',
    '✝ Sequências: a Sequência Pascal, a de Pentecostes e a de Corpus Christi (versão completa oficial, "Terra, exulta de alegria"), com as estrofes numeradas, estão em Orações → Sequências (editáveis) e entram sozinhas, antes da Aclamação ao Evangelho, no roteiro da Missa do Domingo da Páscoa, de Pentecostes e de Corpus Christi criado pela Agenda.',
    '🎵 A Sequência no roteiro é como o Glória: vem rezada (o texto da oração) e dá para trocar por um canto do novo momento "Sequência".',
    '📿 Ladainhas: nova categoria em Orações com a Ladainha de Todos os Santos, a do Sagrado Coração de Jesus, a de São Miguel Arcanjo e a de São José (com as invocações de 2021).',
    '📿 Item Ladainha (Adicionar → Ladainha, ou "Adicionar ao roteiro" numa ladainha da aba Orações): como o Glória, vem rezada (escolha qual) e dá para trocar por um canto do novo momento "Ladainha".',
    '🙏 Orações: ✎ editar e ✕ excluir direto na lista (aparecem ao passar o mouse); na oração nova, a categoria é uma lista com todas as que existem e "➕ Nova categoria…".',
    '🧩 Texto contorna as imagens dos cantos: cada imagem habilitada (brasão, PASCOM, padroeiro) vira um quadrado, e o texto ocupa a área das margens inteira, usando os espaços entre os quadrados (as linhas de cima entre o brasão e a PASCOM, as do meio na largura toda, as de baixo desviando só do padroeiro). Na miniatura dos Ajustes, os quadrados aparecem tracejados em azul. Liga e desliga em Ajustes → Tamanho dos slides.',
    '🖼 Fundo próprio para itens do roteiro: no cabeçalho do item, escolha uma imagem de fundo só para os slides dele (no lugar do fundo do tema), com "Usar" para ligar e desligar e "Escurecer" para a letra aparecer bem.',
    '📷 Câmeras em tela pequena: a conexão e as posições de cada câmera recolhem e expandem (fica lembrado), ✎/✕ das posições só aparecem ao passar o mouse, e a prévia fica mais baixa em notebook. O botão "📷 Tirar" (câmera do telão) foi para o painel, junto de Limpar e Mudo.',
  ] },
  { versao: '1.6.5', data: '2026-10-11', itens: [
    '💡 Melhorias sugeridas pelo Hermínio, depois de usar o MiguelAngelus na Missa das 7h — obrigado, Hermínio!',
    'Nome de cada parte: o 1º slide de cada parte do roteiro mostra o nome dela, em letra grande (Entrada e o canto, Saudação, Ato Penitencial, Coleta, Salmo…). Opção de numerar ("3. Ato Penitencial"). Liga e desliga em Ajustes → Aparência do telão.',
    'A+ / A− em cada slide: passe o mouse sobre um slide do roteiro e aumente ou diminua só a letra dele. Se estiver no ar, o telão muda na hora; fica guardado no roteiro.',
    'Margens do slide (área útil): em Ajustes → Tamanho dos slides, escolha a margem dos lados e de cima/embaixo. A letra, as linhas e os caracteres por linha passam a respeitar essa área.',
    'Passagem contínua: no último slide de uma parte, Próximo já projeta o 1º slide da parte seguinte; no 1º slide, Anterior volta para o último slide da parte anterior. Sem cliques "vazios" entre as partes.',
    'Miniatura do telão nos Ajustes e no editor de Apresentação: é o próprio telão em ponto pequeno, com as imagens dos cantos, o tema e o slide no ar. O pontilhado mostra o limite das margens e o tracejado, onde o texto ficou. Mexeu nas margens ou no tamanho de uma imagem, a miniatura muda na hora.',
    'Melhor aproveitamento da tela: a margem dos lados não encolhe mais a letra, e o texto pode desviar só do lado da imagem do canto (ex.: o padroeiro embaixo à direita), descendo até a margem de baixo do lado livre.',
    '🔇 Mudo (no lugar da Tela preta): o telão fica só com o fundo do tema enquanto você navega pelos slides para se achar; ao tirar o Mudo, aparece o slide que estiver no ar. Botão no painel, no celular, no menu Projeção e teclas M ou B. A faixa do OBS também some.',
    '✎ Partes fixas da Missa editáveis: em Orações → Partes fixas da Missa, duplo clique (ou ✎ Editar texto no item do roteiro) para corrigir o texto (ex.: a Saudação). Vale para todos os roteiros e vai para os outros computadores pela nuvem; "Restaurar original" volta ao texto do programa.',
    'Correção: Avisos paroquiais, Perfis e Pix agora sincronizam também as mudanças (antes só a primeira versão ia para os outros computadores).',
  ] },
  { versao: '1.6.4', data: '2026-10-10', itens: [
    '📱 Rede só para os celulares: com o computador em duas redes (ex.: Wi-Fi da igreja com internet + um roteador só do MiguelAngelus no cabo), escolha em Controle pelo celular qual rede vai no QR code — fica lembrada neste computador. Assim os celulares dos músicos e da PASCOM não usam a internet da igreja (nem pesam na transmissão).',
    'Controle pelo celular avisa quando o Firewall do Windows não libera o MiguelAngelus no tipo da rede escolhida (Privada ou Pública) e diz qual caixinha marcar. Também mostra quais redes têm internet de verdade.',
  ] },
  { versao: '1.6.3', data: '2026-10-10', itens: [
    '📿 Terço: em Roteiros → 📿 Terço (ou Adicionar → 📿 Terço) o roteiro vem pronto — abertura, os 5 mistérios do dia e o encerramento. Os mistérios seguem o dia da semana (domingos do Advento: Gozosos; da Quaresma: Dolorosos) e dá para trocar. Em cada Ave-Maria o telão mostra a dezena de contas com a da vez acesa; cada Próximo é uma conta.',
    'Terço — opções: trecho da Bíblia em cada mistério; oração depois do Glória (vem a Jaculatória de Fátima; escolha outra cadastrada em Orações, ou nenhuma); Ladainha de Nossa Senhora no encerramento.',
    '🔔 Ângelus (Adicionar → Ângelus): no Tempo Pascal entra sozinha a Regina Caeli. Novas em Orações: Pai-Nosso, Ângelus, Regina Caeli, Jaculatória de Fátima e Ladainha de Nossa Senhora (todas editáveis).',
    '📅 Agenda: tipos novos Crisma e Primeira Eucaristia — o roteiro vem com o modelo da Missa e o rito próprio depois da homilia (Crisma: apresentação dos crismandos, renovação das promessas do Batismo, imposição das mãos, canto e crismação; Primeira Eucaristia: renovação das promessas). O folheto também monta, como numa Missa.',
    '📅 Agenda: tipos Terço, Ângelus e Adoração ao Santíssimo com o roteiro já montado. A Adoração vem com exposição, Graças e louvores, Oração do Anjo, Leitura, silêncio, Preces, Tão Sublime, Oração diante do Santíssimo, Bênção e Louvores Divinos — os cantos ficam para escolher.',
    '🎨 Cor e tamanho no texto: a barrinha de formatação ganhou A+ / A− (grande e título — bom para títulos) e a paleta de cores (vermelho, dourado, azul, verde, roxo, branco e preto). Vale nos cantos, orações, textos e avisos, no telão, no celular e na impressão. Atalhos: Ctrl+Shift+> e Ctrl+Shift+<.',
    '📖 A Bíblia (tradução do Pe. Antônio Pereira de Figueiredo, domínio público) agora vem junto com o programa: computador novo já abre com ela.',
  ] },
  { versao: '1.6.2', data: '2026-10-09', itens: [
    '🌐 Folheto da diocese: em Agenda → Paróquia, informe a (arqui)diocese e a página onde ela publica os folhetos. O botão 🌐 busca lá e monta os roteiros. O Rio continua como antes; em outras dioceses aparecem os PDFs da página com nome e data, para escolher.',
    'Quando a Arquidiocese ainda não publicou a versão Celular do folheto, o 🌐 oferece a versão da Assembleia (em colunas) — o MiguelAngelus separa as colunas e monta o roteiro. Dê uma conferida.',
    '📱 Celular: além do QR code, aparece o endereço para digitar no navegador (para aparelhos que não leem QR code).',
    '📱 Aparelhos antigos (iPad antigo, navegadores velhos) abrem uma versão simples do controle, com Controle, Roteiro e 🎸 Cifras para o músico (tom −/+, instrumento e tamanho da letra).',
  ] },
  { versao: '1.6.1', data: '2026-10-07', itens: [
    '🖨 Imprimir roteiro (Arquivo → Imprimir roteiro…, ou Ctrl+P): Resumo (a ordem da celebração), Completo (com as letras, orações, leituras, preces e avisos) ou Músicos (os cantos com a cifra e o tom). Imprime no papel ou salva em PDF.',
    '🔎 Localizar em tudo (Editar, ou Ctrl+F): uma busca só em cantos, orações, roteiros, avisos e Bíblia, com o trecho encontrado em destaque; um clique abre.',
    '↶ Desfazer / Refazer (Editar, ou Ctrl+Z / Ctrl+Y) nas mudanças do roteiro aberto: item apagado, movido, canto trocado, textos…',
    'Perfis: cada pessoa salva a configuração da tela com o seu nome (Perfil, ao lado dos temas, ou Ajustes → Aparência do telão) e escolhe na hora de projetar; "Padrão" volta ao que era. Guarda fonte, tamanho, cores, maiúsculas, negrito, alinhamento, linhas e letras por slide e o texto do Altar. Vão para os outros computadores pela nuvem.',
    'Ajustes → Aparência do telão: opção "Texto em negrito", fontes estreitas (Arial Narrow e Impact) e o Tamanho dos slides junto.',
  ] },
  { versao: '1.6.0', data: '2026-10-07', itens: [
    '✝ Santoral: o calendário agora conhece as memórias e festas dos santos (Calendário Romano e o próprio do Brasil — São José de Anchieta, Santa Paulina, Frei Galvão, Mártires de Cunhaú e Uruaçu…), com a cor certa: branco, ou vermelho para os mártires. Aparece no topo da tela, no calendário e nos cards dos roteiros, e o tema por tempo litúrgico acompanha.',
    'Regras: domingos e solenidades prevalecem; festas valem também no Advento e na Quaresma; memórias ficam só como lembrete na Quaresma e de 17 a 24 de dezembro; memória facultativa aparece como lembrete, sem mudar a cor.',
    'São Sebastião (20/1), padroeiro da Arquidiocese do Rio: solenidade, em vermelho.',
    'Padroeiro de cada comunidade (Agenda → Paróquia e comunidades): no dia do padroeiro, os roteiros daquela comunidade ficam como Solenidade, com o nome e a cor certos.',
  ] },
  { versao: '1.5.9', data: '2026-10-07', itens: [
    'Câmeras PTZ: "📥 Trazer posições da câmera" herda as posições que já estão gravadas na câmera — elas entram na lista só para chamar, sem gravar nada na câmera.',
    'Cada posição tem ✎ para trocar o nome (ex.: "Posição 3" → "Ambão").',
    '"Guardar posição atual" grava as posições novas a partir do nº 20 e mostra o número antes de gravar, sem tocar nas que a câmera já tinha.',
    'O nome da câmera pode ser trocado depois de criada (✎ ao lado do nome).',
  ] },
  { versao: '1.5.8', data: '2026-10-07', itens: [
    '📢 Avisos paroquiais: novo item "Avisos" no roteiro, com uma tela própria no telão — o título numa faixa colorida e cada aviso num cartão. Em Ferramentas → 📢 Avisos paroquiais ficam os avisos programados (de quando até quando valem e para qual comunidade): eles entram sozinhos nas Missas do período. Também dá para escrever avisos só de uma Missa e escolher o título, o ícone, as cores e quantos avisos por slide. Os roteiros novos já vêm com o item Avisos antes da bênção final.',
    'Avisos salvos: na aba "Outro aviso" do botão Aviso ficam avisos prontos — já vêm "aniversariantes ao presbitério" e "crianças ao presbitério". Clique para usar (e editar), ▶ para mostrar direto, e 💾 para salvar um aviso novo ou salvar por cima. Também no celular.',
    'Negrito, itálico e sublinhado (N I S) agora aparecem também nas janelas de editar canto e oração (antes só funcionavam pelo Ctrl+B / Ctrl+I / Ctrl+U), e no aviso na tela.',
    'Favoritos só com cifra: a ⭐ só marca cantos que têm cifra (os favoritos são o repertório dos músicos). Favoritos antigos sem cifra aparecem num aviso "⚠ sem cifra" na aba Cantos.',
  ] },
  { versao: '1.5.7', data: '2026-10-07', itens: [
    'Cantos com refrão: nova opção "O canto começa pelo refrão / pela 1ª estrofe" no editor do canto. Começando pela estrofe, o telão mostra estrofe → refrão → estrofe… (antes o refrão vinha sempre primeiro). "Montar a letra a partir da cifra" e "Organizar" já marcam sozinhos, e o app dos músicos segue a mesma ordem.',
    '✝ Temas por tempo litúrgico (Ferramentas): o fundo do telão acompanha a cor litúrgica do roteiro — verde, roxo, branco, vermelho ou rosa. Também pelo quadradinho ✝ ao lado dos temas.',
    'Orações repetidas: as cópias iguais que chegavam de outro computador são juntadas e apagadas também na nuvem (não voltam mais); e ao cadastrar uma oração parecida com uma que já existe, o programa avisa.',
    'Roteiros repetidos: o programa não cria mais um segundo roteiro para a mesma celebração quando a nuvem traz a Agenda de outro computador (ao distribuir o folheto, as celebrações que já têm roteiro aparecem desmarcadas). Os repetidos que já existem podem ser juntados: o programa pergunta ao abrir, ou em Ferramentas → Juntar roteiros repetidos — fica o de cada celebração com mais cantos escolhidos.',
  ] },
  { versao: '1.5.6', data: '2026-10-07', itens: [
    'Coluna da direita (ao vivo + roteiro) cerca de 20% mais larga e prévia do telão menor — sobra mais espaço para o roteiro em monitores pequenos. Arraste a divisória à esquerda da coluna para alargar ou estreitar, e o puxador embaixo da prévia para aumentá-la ou diminuí-la (dois cliques volta ao normal); cada computador lembra os seus tamanhos.',
    'O botão "Tela preta" saiu do painel (continua no menu Projeção e na tecla B); com a tela preta ligada, o rótulo em cima da prévia avisa "TELA PRETA". Assim Limpar, Altar, Aviso e Pix cabem numa linha só.',
    'Ao fechar e sincronizar, uma barra mostra o andamento: o que está sendo enviado e quantos itens faltam.',
    'Letras maiores na tela do operador: Ajustes → Aparência do app → A− / A+ (de 80% a 200%), ou Ctrl e + / Ctrl e − / Ctrl e 0. Vale só neste computador; o telão não muda.',
  ] },
  { versao: '1.5.5', data: '2026-10-07', itens: [
    'Botão 💠 Pix (ou tecla P): o QR code do Pix da paróquia e a faixa com o CNPJ aparecem POR CIMA do que está passando — os slides continuam, menores, embaixo; com a câmera no ar, a faixa vai para o canto superior esquerdo e o QR code para o direito. Também pelo celular.',
    'As imagens do Pix são protegidas por uma senha de 4 números criada pela PASCOM (o programa guarda só uma impressão embaralhada dela). Ficam em Ajustes → 💠 Pix da paróquia e vão para os outros computadores pela nuvem.',
    'Tamanhos do Pix ajustáveis em cada computador (cartão sem câmera; QR code e faixa com câmera).',
  ] },
  { versao: '1.5.4', data: '2026-10-06', itens: [
    'Aclamação ao Evangelho rezada ou cantada, como o Santo: rezada, mostra o refrão e o versículo do folheto; dá para trocar por um canto de aclamação.',
    'App dos músicos: "Meu instrumento" (Si♭, Mi♭ ou Fá) — saxofone, trompete, clarinete e trompa veem as cifras já no tom do instrumento, só no aparelho de quem escolheu.',
    'Novo momento "Aspersão" para os cantos; no item do Ato Penitencial aparecem também os cantos de aspersão.',
    'A atualização automática aceita a versão escrita com um ponto a mais (ex.: "v.1.5.4").',
  ] },
  { versao: '1.5.3', data: '2026-10-06', itens: [
    'Slide de abertura no jeito da capa do folheto: fundo branco, nome da celebração em vermelho, a linha da semana em azul, a edição e a data em cima e a ilustração ao lado (layout "Capa do folheto").',
    'Folhetos de outras dioceses: o MiguelAngelus agora lê folhetos em 2 ou 3 colunas, títulos em MAIÚSCULAS e rótulos como "Pres.:", "Ass.:" e "L1." (testado com a Semana Santa da Arquidiocese de São Paulo, inclusive a Vigília Pascal com as 8 leituras).',
    'Novidades: ao atualizar, o MiguelAngelus mostra o que mudou; o histórico de todas as versões fica em Ajuda → Novidades.',
  ] },
  { versao: '1.5.2', data: '2026-10-06', itens: [
    'Ato Penitencial, Glória e Cordeiro agora podem ser rezados ou cantados, como o Santo (no Ato Penitencial cantado, o convite e a absolvição continuam).',
    'O Cordeiro entra no roteiro mesmo quando o folheto não o traz.',
    'Roteiros que chegam de outro computador também são arrumados (Santo separado).',
    'Joystick: o botão Select troca a câmera controlada, marcada com 🎮 no quadro Câmeras.',
  ] },
  { versao: '1.5.1', data: '2026-10-06', itens: [
    'O NDI Webcam abre sozinho quando há câmera NDI.',
    'Controle de câmera PTZ (mover, zoom, posições prontas) pelo computador, pelo celular e por joystick, usando VISCA sobre IP, como o OBS.',
  ] },
  { versao: '1.5', data: '2026-10-05', itens: [
    'Celular: trocar de roteiro (aba Roteiro → Trocar), com as celebrações por dia e filtro por comunidade.',
    'Cantos favoritos ⭐: a aba Cantos abre nos favoritos (o acervo completo fica para consulta); "só favoritos" na escolha do canto do roteiro.',
    'Cifras 🎸 nos cantos, com tom, autor e CD; "Montar a letra a partir da cifra"; importar e exportar cantos.',
    'App dos músicos: no celular ou tablet, a cifra do canto que está no telão, com a linha cantada destacada e transposição de tom.',
    'Santo separado da Oração Eucarística: rezado (texto do folheto) ou cantado.',
    'Aviso de canto repetido ao cadastrar um canto novo.',
  ] },
  { versao: '1.4', data: '2026-10-05', itens: [
    'Controle pelo celular: passe os slides, tela preta, altar, avisos, mídia e abra/feche o telão pelo celular ou tablet, no Wi-Fi da igreja (Ferramentas → Controle pelo celular).',
    'Salmo em texto corrido e justificado (não quebra a linha a cada verso).',
    'O texto desvia sozinho das imagens dos cantos (brasão, logos, padroeiro).',
    'Manual com o passo a passo do celular e do ícone na tela (Android e iPhone).',
  ] },
  { versao: '1.3.1', data: '2026-10-04', itens: [
    'Espaço entre as falas: a resposta do povo (T.) fica separada da fala do padre (pode desligar em Ajustes → Aparência).',
    'Negrito, itálico e sublinhado: clicar de novo tira, sem acumular marcas.',
    'A tela de abertura mostra que o MiguelAngelus é gratuito.',
  ] },
  { versao: '1.3', data: '2026-10-04', itens: [
    'Primeira versão assinada digitalmente (Open Source Developer Marcio Aurelio Rios Martins).',
    'Atualização automática: as próximas versões chegam sozinhas.',
    'Slides: textos longos cortam no fim das frases e nunca partem referências como (cf. Jo 17,21).',
    'Justificado e centralizado como padrão, 29 fontes, negrito, itálico e sublinhado.',
    'Filtro por capela nos roteiros e botão "Fechar projeção".',
    'Câmera ligada: tema escuro e cantos inferiores escondidos.',
  ] },
];

// "1.5.10" > "1.5.2" (compara número a número)
function compararVersao(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

const dataBR = d => d ? d.split('-').reverse().join('/') : '';

function htmlVersoes(lista, destaque) {
  return lista.map(v => `<section class="nov-versao${destaque ? ' nova' : ''}">
    <h3>Versão ${esc(v.versao)} <span class="sutil pequeno">${dataBR(v.data)}</span></h3>
    <ul>${v.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul></section>`).join('');
}

// desde: a última versão que a pessoa já viu (mostra só o que veio depois, com o resto do histórico recolhido)
function abrirNovidades(desde) {
  const novas = desde ? NOVIDADES.filter(v => compararVersao(v.versao, desde) > 0) : [];
  const resto = desde ? NOVIDADES.filter(v => compararVersao(v.versao, desde) <= 0) : NOVIDADES;
  $('#novTitulo').textContent = novas.length ? `🎉 O MiguelAngelus foi atualizado para a versão ${NOVIDADES[0].versao}` : '📋 Novidades — histórico de versões';
  $('#novCorpo').innerHTML = novas.length
    ? `<p class="sutil">O que mudou desde a versão ${esc(desde)}:</p>${htmlVersoes(novas, true)}
       ${resto.length ? `<details class="nov-hist"><summary>Ver o histórico das versões anteriores</summary>${htmlVersoes(resto)}</details>` : ''}`
    : htmlVersoes(resto);
  abrirDialogo('dlgNovidades');
}

// Ao abrir o programa: se a versão mudou desde a última vez, mostra o que há de novo (uma vez só)
function mostrarNovidadesSeAtualizou() {
  const atual = NOVIDADES[0].versao;
  let vista = S.config.versaoVista;
  // instalações que já existiam antes do histórico: contam como vindas da 1.5.2; instalação nova não mostra nada
  if (!vista) vista = S.cantos.length || S.roteiros.length > 1 ? '1.5.2' : atual;
  const marcarVista = () => { if (S.config.versaoVista !== atual) { S.config.versaoVista = atual; salvarConfig(); } };
  if (compararVersao(atual, vista) <= 0) return marcarVista();
  // só conta como vista quando a pessoa fecha a janela (se o programa recarregar antes, aparece de novo)
  $('#dlgNovidades').addEventListener('close', marcarVista, { once: true });
  setTimeout(() => abrirNovidades(vista), 1200);   // depois da tela de abertura
}
