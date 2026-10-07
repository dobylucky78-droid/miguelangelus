'use strict';
/*
 * Calendário litúrgico (rito romano, regras do Brasil):
 * tempo litúrgico, semana, cor do tempo e ciclos (A/B/C e I/II), solenidades, festas e o santoral
 * (memórias e festas dos santos, com o próprio do Brasil).
 */

const Liturgia = (() => {
  const d0 = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const soma = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const dif = (a, b) => Math.round((d0(a) - d0(b)) / 864e5);
  const mesmo = (a, b) => dif(a, b) === 0;
  const domingoAntes = d => soma(d, -d.getDay());

  // Algoritmo de Meeus/Jones/Butcher (calendário gregoriano)
  function pascoa(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mes - 1, dia);
  }

  function advento1(y) {
    const natal = new Date(y, 11, 25);
    return soma(natal, -(natal.getDay() || 7) - 21);
  }
  // No Brasil a Epifania é no domingo entre 2 e 8 de janeiro
  function epifania(y) {
    const d = new Date(y, 0, 2);
    return soma(d, (7 - d.getDay()) % 7);
  }
  // Se a Epifania cai em 7 ou 8/jan, o Batismo passa para a segunda-feira seguinte
  function batismo(y) {
    const e = epifania(y);
    return e.getDate() >= 7 ? soma(e, 1) : soma(e, 7);
  }
  function sagradaFamilia(y) {
    const natal = new Date(y, 11, 25);
    return natal.getDay() === 0 ? new Date(y, 11, 30) : soma(natal, 7 - natal.getDay());
  }

  const CORES = { verde: '#2e7d32', roxo: '#6a1b9a', branco: '#f2f2f2', vermelho: '#c62828', rosa: '#e0609a' };

  // Solenidades e festas principais (regras do Brasil). Os domingos dos tempos fortes e a Semana Santa prevalecem.
  // Aproximação: não cobre todas as memórias e as transferências raras — para isso existe a cor escolhida no roteiro.
  function festa(d, base) {
    const y = d.getFullYear(), m = d.getMonth() + 1, dia = d.getDate(), dom = d.getDay() === 0, E = pascoa(y);
    if (base.tempo === 'Tríduo Pascal' || /Semana Santa|Ramos|^Domingo da Páscoa$|Pentecostes|Ascensão|Natal do Senhor/.test(base.titulo)) return null;
    const tempoForte = dom && ['Advento', 'Quaresma', 'Páscoa'].includes(base.tempo);
    const domingoEntre = (mes, d1, d2) => dom && m === mes && dia >= d1 && dia <= d2;
    const lista = [
      [mesmo(d, soma(E, 68)), 'Sagrado Coração de Jesus', 'branco'],
      [m === 1 && dia === 20, 'São Sebastião, mártir, padroeiro da Arquidiocese do Rio', 'vermelho'],   // próprio do Rio
      [m === 2 && dia === 2, 'Apresentação do Senhor', 'branco'],
      [m === 3 && dia === 19 && !tempoForte, 'São José, Esposo da Virgem Maria', 'branco'],
      [m === 3 && dia === 25 && !tempoForte, 'Anunciação do Senhor', 'branco'],
      [m === 6 && dia === 24, 'Natividade de São João Batista', 'branco'],
      [domingoEntre(6, 29, 30) || domingoEntre(7, 1, 5), 'São Pedro e São Paulo, Apóstolos', 'vermelho'],
      [m === 8 && dia === 6, 'Transfiguração do Senhor', 'branco'],
      [domingoEntre(8, 15, 21), 'Assunção de Nossa Senhora', 'branco'],
      [m === 9 && dia === 14, 'Exaltação da Santa Cruz', 'vermelho'],
      [m === 10 && dia === 12, 'Nossa Senhora da Conceição Aparecida', 'branco'],
      [m === 11 && dia === 2, 'Comemoração de Todos os Fiéis Defuntos', 'roxo'],
      [domingoEntre(11, 1, 7), 'Todos os Santos', 'branco'],
      [m === 11 && dia === 9, 'Dedicação da Basílica do Latrão', 'branco'],
      [(m === 12 && dia === 8 && !tempoForte) || (m === 12 && dia === 9 && d.getDay() === 1), 'Imaculada Conceição de Nossa Senhora', 'branco'],
    ];
    const f = lista.find(x => x[0]);
    return f ? { titulo: f[1], cor: f[2] } : null;
  }

  // ---------- Santoral (Calendário Romano Geral + próprio do Brasil e da Arquidiocese do Rio) ----------
  // "MM-DD|grau|cor|nome" — grau: F festa, M memória, m memória facultativa · cor: b branco, v vermelho
  const SANTORAL = `
01-02|M|b|Santos Basílio Magno e Gregório Nazianzeno, bispos e doutores
01-03|m|b|Santíssimo Nome de Jesus
01-07|m|b|São Raimundo de Peñafort, presbítero
01-13|m|b|Santo Hilário, bispo e doutor
01-17|M|b|Santo Antão, abade
01-20|m|v|São Fabiano, papa e mártir
01-21|M|v|Santa Inês, virgem e mártir
01-22|m|v|São Vicente, diácono e mártir
01-24|M|b|São Francisco de Sales, bispo e doutor
01-25|F|b|Conversão de São Paulo, Apóstolo
01-26|M|b|Santos Timóteo e Tito, bispos
01-27|m|b|Santa Ângela Merici, virgem
01-28|M|b|Santo Tomás de Aquino, presbítero e doutor
01-31|M|b|São João Bosco, presbítero
02-03|m|v|São Brás, bispo e mártir
02-05|M|v|Santa Águeda, virgem e mártir
02-06|M|v|São Paulo Miki e companheiros, mártires
02-08|m|b|São Jerônimo Emiliani; Santa Josefina Bakhita, virgem
02-10|M|b|Santa Escolástica, virgem
02-11|m|b|Nossa Senhora de Lourdes
02-14|M|b|São Cirilo, monge, e São Metódio, bispo
02-17|m|b|Sete Santos Fundadores dos Servitas
02-21|m|b|São Pedro Damião, bispo e doutor
02-22|F|b|Cátedra de São Pedro, Apóstolo
02-23|M|v|São Policarpo, bispo e mártir
02-27|m|b|São Gregório de Narek, abade e doutor
03-04|m|b|São Casimiro
03-07|M|v|Santas Perpétua e Felicidade, mártires
03-08|m|b|São João de Deus, religioso
03-09|m|b|Santa Francisca Romana, religiosa
03-17|m|b|São Patrício, bispo
03-18|m|b|São Cirilo de Jerusalém, bispo e doutor
03-23|m|b|São Turíbio de Mogrovejo, bispo
04-02|m|b|São Francisco de Paula, eremita
04-04|m|b|Santo Isidoro, bispo e doutor
04-05|m|b|São Vicente Ferrer, presbítero
04-07|M|b|São João Batista de la Salle, presbítero
04-11|M|v|Santo Estanislau, bispo e mártir
04-13|m|v|São Martinho I, papa e mártir
04-21|m|b|Santo Anselmo, bispo e doutor
04-23|m|v|São Jorge, mártir; Santo Adalberto, bispo e mártir
04-24|m|v|São Fidélis de Sigmaringa, presbítero e mártir
04-25|F|v|São Marcos, Evangelista
04-28|m|b|São Pedro Chanel; São Luís Maria Grignion de Montfort
04-29|M|b|Santa Catarina de Sena, virgem e doutora
04-30|m|b|São Pio V, papa
05-01|m|b|São José Operário
05-02|M|b|Santo Atanásio, bispo e doutor
05-03|F|v|São Filipe e São Tiago, Apóstolos
05-12|m|v|Santos Nereu e Aquiles, mártires; São Pancrácio, mártir
05-13|m|b|Nossa Senhora de Fátima
05-14|F|v|São Matias, Apóstolo
05-18|m|v|São João I, papa e mártir
05-20|m|b|São Bernardino de Sena, presbítero
05-21|m|v|São Cristóvão Magallanes e companheiros, mártires
05-22|m|b|Santa Rita de Cássia, religiosa
05-25|m|b|São Beda Venerável; São Gregório VII; Santa Maria Madalena de Pazzi
05-26|M|b|São Filipe Néri, presbítero
05-27|m|b|Santo Agostinho de Cantuária, bispo
05-29|m|b|São Paulo VI, papa
05-31|F|b|Visitação de Nossa Senhora
06-01|M|v|São Justino, mártir
06-02|m|v|Santos Marcelino e Pedro, mártires
06-03|M|v|São Carlos Lwanga e companheiros, mártires
06-05|M|v|São Bonifácio, bispo e mártir
06-06|m|b|São Norberto, bispo
06-09|M|b|São José de Anchieta, presbítero
06-11|M|v|São Barnabé, Apóstolo
06-13|M|b|Santo Antônio de Pádua, presbítero e doutor
06-19|m|b|São Romualdo, abade
06-21|M|b|São Luís Gonzaga, religioso
06-22|m|v|São Paulino de Nola; Santos João Fisher e Tomás More, mártires
06-27|m|b|São Cirilo de Alexandria, bispo e doutor
06-28|M|v|Santo Irineu, bispo e mártir
06-30|m|v|Santos Protomártires da Igreja de Roma
07-03|F|v|São Tomé, Apóstolo
07-04|m|b|Santa Isabel de Portugal
07-05|m|b|Santo Antônio Maria Zaccaria, presbítero
07-06|m|v|Santa Maria Goretti, virgem e mártir
07-09|M|b|Santa Paulina do Coração Agonizante de Jesus, virgem
07-11|M|b|São Bento, abade
07-13|m|b|Santo Henrique
07-14|m|b|São Camilo de Lélis, presbítero
07-15|M|b|São Boaventura, bispo e doutor
07-16|m|b|Nossa Senhora do Carmo
07-20|m|v|Santo Apolinário, bispo e mártir
07-21|m|b|São Lourenço de Brindisi, presbítero e doutor
07-22|F|b|Santa Maria Madalena
07-23|m|b|Santa Brígida, religiosa
07-24|m|b|São Charbel Makhlouf, presbítero
07-25|F|v|São Tiago, Apóstolo
07-26|M|b|São Joaquim e Sant'Ana, pais de Nossa Senhora
07-29|M|b|Santos Marta, Maria e Lázaro
07-30|m|b|São Pedro Crisólogo, bispo e doutor
07-31|M|b|Santo Inácio de Loyola, presbítero
08-01|M|b|Santo Afonso Maria de Ligório, bispo e doutor
08-02|m|b|Santo Eusébio de Vercelli; São Pedro Juliano Eymard
08-04|M|b|São João Maria Vianney, presbítero
08-05|m|b|Dedicação da Basílica de Santa Maria Maior
08-07|m|v|São Sisto II e companheiros, mártires; São Caetano, presbítero
08-08|M|b|São Domingos, presbítero
08-09|m|v|Santa Teresa Benedita da Cruz, virgem e mártir
08-10|F|v|São Lourenço, diácono e mártir
08-11|M|b|Santa Clara, virgem
08-12|m|b|Santa Joana Francisca de Chantal, religiosa
08-13|m|v|Santos Ponciano e Hipólito, mártires
08-14|M|v|São Maximiliano Maria Kolbe, presbítero e mártir
08-16|m|b|Santo Estêvão da Hungria
08-19|m|b|São João Eudes, presbítero
08-20|M|b|São Bernardo, abade e doutor
08-21|M|b|São Pio X, papa
08-22|M|b|Nossa Senhora Rainha
08-23|m|b|Santa Rosa de Lima, virgem
08-24|F|v|São Bartolomeu, Apóstolo
08-25|m|b|São Luís de França; São José de Calasanz
08-27|M|b|Santa Mônica
08-28|M|b|Santo Agostinho, bispo e doutor
08-29|M|v|Martírio de São João Batista
09-03|M|b|São Gregório Magno, papa e doutor
09-08|F|b|Natividade de Nossa Senhora
09-09|m|b|São Pedro Claver, presbítero
09-12|m|b|Santíssimo Nome de Maria
09-13|M|b|São João Crisóstomo, bispo e doutor
09-15|M|b|Nossa Senhora das Dores
09-16|M|v|São Cornélio, papa, e São Cipriano, bispo, mártires
09-17|m|b|São Roberto Belarmino; Santa Hildegarda de Bingen
09-19|m|v|São Januário, bispo e mártir
09-20|M|v|Santos André Kim Tae-gon, Paulo Chong Ha-sang e companheiros, mártires
09-21|F|v|São Mateus, Apóstolo e Evangelista
09-23|M|b|São Pio de Pietrelcina, presbítero
09-26|m|v|São Cosme e São Damião, mártires
09-27|M|b|São Vicente de Paulo, presbítero
09-28|m|v|São Venceslau, mártir; São Lourenço Ruiz e companheiros, mártires
09-29|F|b|São Miguel, São Gabriel e São Rafael, Arcanjos
09-30|M|b|São Jerônimo, presbítero e doutor
10-01|M|b|Santa Teresinha do Menino Jesus, virgem e doutora
10-02|M|b|Santos Anjos da Guarda
10-03|M|v|Santos André de Soveral, Ambrósio Francisco Ferro e companheiros, mártires
10-04|M|b|São Francisco de Assis
10-05|m|b|Santa Faustina Kowalska, virgem
10-06|m|b|São Bruno, presbítero
10-07|M|b|Nossa Senhora do Rosário
10-09|m|v|São Dionísio e companheiros, mártires; São João Leonardi, presbítero
10-11|m|b|São João XXIII, papa
10-14|m|v|São Calisto I, papa e mártir
10-15|M|b|Santa Teresa de Jesus, virgem e doutora
10-16|m|b|Santa Edwiges; Santa Margarida Maria Alacoque
10-17|M|v|Santo Inácio de Antioquia, bispo e mártir
10-18|F|v|São Lucas, Evangelista
10-19|m|v|Santos João de Brébeuf, Isaac Jogues e companheiros, mártires; São Paulo da Cruz
10-22|m|b|São João Paulo II, papa
10-23|m|b|São João de Capistrano, presbítero
10-24|m|b|Santo Antônio Maria Claret, bispo
10-25|M|b|Santo Antônio de Sant'Ana Galvão, presbítero
10-28|F|v|São Simão e São Judas, Apóstolos
11-03|m|b|São Martinho de Lima, religioso
11-04|M|b|São Carlos Borromeu, bispo
11-10|M|b|São Leão Magno, papa e doutor
11-11|M|b|São Martinho de Tours, bispo
11-12|M|v|São Josafá, bispo e mártir
11-15|m|b|Santo Alberto Magno, bispo e doutor
11-16|m|b|Santa Margarida da Escócia; Santa Gertrudes, virgem
11-17|M|b|Santa Isabel da Hungria, religiosa
11-18|m|b|Dedicação das Basílicas de São Pedro e São Paulo
11-21|M|b|Apresentação de Nossa Senhora
11-22|M|v|Santa Cecília, virgem e mártir
11-23|m|v|São Clemente I, papa e mártir; São Columbano, abade
11-24|M|v|Santo André Dũng-Lạc e companheiros, mártires
11-25|m|v|Santa Catarina de Alexandria, virgem e mártir
11-30|F|v|Santo André, Apóstolo
12-03|M|b|São Francisco Xavier, presbítero
12-04|m|b|São João Damasceno, presbítero e doutor
12-06|m|b|São Nicolau, bispo
12-07|M|b|Santo Ambrósio, bispo e doutor
12-09|m|b|São João Diego Cuauhtlatoatzin
12-11|m|b|São Dâmaso I, papa
12-12|F|b|Nossa Senhora de Guadalupe
12-13|M|v|Santa Luzia, virgem e mártir
12-14|M|b|São João da Cruz, presbítero e doutor
12-21|m|b|São Pedro Canísio, presbítero e doutor
12-23|m|b|São João Câncio, presbítero
12-26|F|v|Santo Estêvão, primeiro mártir
12-27|F|b|São João, Apóstolo e Evangelista
12-28|F|v|Santos Inocentes, mártires
12-29|m|v|São Tomás Becket, bispo e mártir
12-31|m|b|São Silvestre I, papa
`.trim().split('\n').reduce((m, l) => { const [k, g, c, n] = l.split('|'); m[k] = { grau: g, cor: c === 'v' ? 'vermelho' : 'branco', nome: n }; return m; }, {});
  const GRAU = { S: 'Solenidade', F: 'Festa', M: 'Memória', m: 'Memória facultativa' };

  // Santo do dia, com as regras de precedência (simplificadas):
  // nada substitui domingo, solenidade/festa do Senhor, Tríduo, Semana Santa, Cinzas e a oitava da Páscoa;
  // festa vale também nos dias de semana do Advento e da Quaresma; memória obrigatória não vale na Quaresma
  // nem de 17 a 24 de dezembro (fica só lembrada); memória facultativa não muda a cor do dia (é opcional).
  function santo(d, base) {
    const y = d.getFullYear(), E = pascoa(y), m = d.getMonth() + 1, dia = d.getDate();
    const chave = `${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    // móveis: Maria, Mãe da Igreja (2ª-feira depois de Pentecostes), Jesus Cristo Sumo e Eterno Sacerdote (5ª-feira
    // depois de Pentecostes — festa no Brasil), Imaculado Coração de Maria (sábado depois do Sagrado Coração)
    const movel = mesmo(d, soma(E, 50)) ? { grau: 'M', cor: 'branco', nome: 'Bem-aventurada Virgem Maria, Mãe da Igreja' }
      : mesmo(d, soma(E, 53)) ? { grau: 'F', cor: 'branco', nome: 'Nosso Senhor Jesus Cristo, Sumo e Eterno Sacerdote' }
      : mesmo(d, soma(E, 69)) ? { grau: 'M', cor: 'branco', nome: 'Imaculado Coração de Maria' }
      : null;
    // a móvel prevalece; a do dia (ex.: Santo Antônio quando cai junto com o Imaculado Coração) fica como lembrete
    let s = movel ? { ...movel, outra: SANTORAL[chave]?.nome } : SANTORAL[chave];
    if (!s) return null;
    const especial = /Natal do Senhor|Sagrada Família|Santa Maria, Mãe de Deus|Epifania|Batismo do Senhor|Cinzas|Ramos|Semana Santa|^Domingo da Páscoa$|Ascensão|Pentecostes|Trindade|Corpo e Sangue|Cristo Rei/.test(base.titulo);
    if (d.getDay() === 0 || base.festa || especial || base.tempo === 'Tríduo Pascal' || (d >= E && d <= soma(E, 7))) return null;
    const privilegiado = base.tempo === 'Quaresma' || (m === 12 && dia >= 17 && dia <= 24);
    if (s.grau === 'M' && privilegiado) s = { ...s, grau: 'm' };          // vira comemoração (opcional)
    return { ...s, grauNome: GRAU[s.grau] };
  }

  // padroeiro = { nome, dia: 'MM-DD', cor } da comunidade do roteiro: no dia dele, é solenidade naquela comunidade.
  // Não vale nos domingos do Advento, Quaresma e Páscoa, na Semana Santa, no Tríduo, na oitava da Páscoa e nas
  // solenidades e festas do Senhor do calendário geral (aí a celebração do padroeiro seria transferida).
  function info(data = new Date(), padroeiro = null) {
    const r = infoTempo(data);
    const f = festa(r.data, r);
    const d = r.data, chave = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (padroeiro?.nome && padroeiro.dia === chave && !f) {
      const E = pascoa(d.getFullYear());
      const bloqueia = r.tempo === 'Tríduo Pascal' || (d >= E && d <= soma(E, 7)) ||
        (d.getDay() === 0 && ['Advento', 'Quaresma', 'Páscoa'].includes(r.tempo)) ||
        /Natal do Senhor|Santa Maria, Mãe de Deus|Epifania|Batismo do Senhor|Cinzas|Ramos|Semana Santa|Ascensão|Pentecostes|Trindade|Corpo e Sangue|Cristo Rei/.test(r.titulo);
      if (!bloqueia) {
        const cor = padroeiro.cor === 'vermelho' ? 'vermelho' : 'branco';
        return Object.assign(r, { tituloTempo: r.titulo, titulo: padroeiro.nome, cor, corHex: CORES[cor], santo: 'Solenidade', festa: true, padroeiro: true });
      }
    }
    if (f) Object.assign(r, { titulo: f.titulo, cor: f.cor, corHex: CORES[f.cor], festa: true });
    const s = f ? null : santo(r.data, r);
    r.tituloTempo = r.titulo;
    if (s && s.grau !== 'm') {
      // festa ou memória obrigatória: o dia é do santo (nome e cor); a semana do tempo continua em tituloTempo
      Object.assign(r, { titulo: s.nome, cor: s.cor, corHex: CORES[s.cor], santo: s.grauNome, festa: s.grau === 'F' });
      if (s.outra) r.facultativa = s.outra;
    } else if (s) r.facultativa = s.nome;                                  // opcional: só aparece como lembrete
    return r;
  }

  function infoTempo(data = new Date()) {
    const d = d0(data), y = d.getFullYear(), dom = d.getDay() === 0;
    const adv = advento1(y), E = pascoa(y);
    const anoLit = d >= adv ? y + 1 : y;
    const r = { data: d, ciclo: ['C', 'A', 'B'][anoLit % 3], ferial: anoLit % 2 ? 'I' : 'II' };
    const def = (tempo, titulo, cor) => Object.assign(r, { tempo, titulo, cor, corHex: CORES[cor] });
    const semana = inicio => Math.floor(dif(domingoAntes(d), inicio) / 7) + 1;
    const rotulo = (n, doTempo) => dom ? `${n}º Domingo ${doTempo}` : `${n}ª Semana ${doTempo}`;
    const natal = new Date(y, 11, 25);

    if (mesmo(d, natal)) return def('Natal', 'Natal do Senhor', 'branco');
    if (d >= adv && d < natal) {
      const n = semana(adv);
      return def('Advento', rotulo(n, 'do Advento'), dom && n === 3 ? 'rosa' : 'roxo');
    }
    if (d > natal) return def('Natal', mesmo(d, sagradaFamilia(y)) ? 'Sagrada Família' : 'Tempo do Natal', 'branco');

    const bat = batismo(y);
    if (d <= bat) {
      let t = 'Tempo do Natal';
      if (d.getMonth() === 0 && d.getDate() === 1) t = 'Santa Maria, Mãe de Deus';
      else if (mesmo(d, epifania(y))) t = 'Epifania do Senhor';
      else if (mesmo(d, bat)) t = 'Batismo do Senhor';
      return def('Natal', t, 'branco');
    }

    const cinzas = soma(E, -46);
    if (d < cinzas) return def('Comum', rotulo(semana(domingoAntes(bat)), 'do Tempo Comum'), 'verde');

    if (d < soma(E, -3)) {
      if (mesmo(d, cinzas)) return def('Quaresma', 'Quarta-feira de Cinzas', 'roxo');
      if (d < soma(E, -42)) return def('Quaresma', 'Depois das Cinzas', 'roxo');
      if (mesmo(d, soma(E, -7))) return def('Quaresma', 'Domingo de Ramos e da Paixão', 'vermelho');
      if (d > soma(E, -7)) return def('Quaresma', 'Semana Santa', 'roxo');
      const n = semana(soma(E, -42));
      return def('Quaresma', rotulo(n, 'da Quaresma'), dom && n === 4 ? 'rosa' : 'roxo');
    }

    if (d < E) {
      const k = dif(E, d);
      const t = ['', 'Sábado Santo — Vigília Pascal', 'Sexta-feira da Paixão', 'Quinta-feira Santa — Ceia do Senhor'][k];
      return def('Tríduo Pascal', t, k === 2 ? 'vermelho' : 'branco');
    }

    if (d <= soma(E, 49)) {
      if (mesmo(d, E)) return def('Páscoa', 'Domingo da Páscoa', 'branco');
      if (mesmo(d, soma(E, 42))) return def('Páscoa', 'Ascensão do Senhor', 'branco');
      if (mesmo(d, soma(E, 49))) return def('Páscoa', 'Pentecostes', 'vermelho');
      return def('Páscoa', rotulo(semana(E), 'da Páscoa'), 'branco');
    }

    const rei = soma(adv, -7);
    if (mesmo(d, soma(E, 56))) return def('Comum', 'Santíssima Trindade', 'branco');
    if (mesmo(d, soma(E, 60))) return def('Comum', 'Corpo e Sangue de Cristo', 'branco');
    if (mesmo(d, rei)) return def('Comum', 'Cristo Rei do Universo', 'branco');
    const n = 34 - Math.round(dif(rei, domingoAntes(d)) / 7);
    return def('Comum', rotulo(n, 'do Tempo Comum'), 'verde');
  }

  return { info, pascoa, CORES };
})();
