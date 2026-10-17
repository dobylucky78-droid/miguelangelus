'use strict';
/*
 * Novidades: o que mudou em cada versão. Aparece sozinho na primeira vez que o programa abre depois de uma
 * atualização (só as versões que a pessoa ainda não viu) e a qualquer hora em Ajuda → Novidades.
 * A versão mais nova fica em cima. Ao gerar uma versão nova, acrescente a entrada dela aqui.
 */
const NOVIDADES = [
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
