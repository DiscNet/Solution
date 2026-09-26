// Menu: Brincadeiras | pacote de jogos, sorteios e interações
const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../../config/config");
const { getMessageProfilePicture } = require("../../functions/profilePicture");
const tokitoApi = require("../../functions/apiClient");

const forcaGames = new Map();
const FORCA_TTL = 15 * 60 * 1000;
const FORCA_MAX_ERRORS = 6;

const truths = [
  "Qual foi a coisa mais engraçada que já aconteceu com você na escola?",
  "Qual hábito seu quase ninguém percebe?",
  "Qual foi a maior vergonha que você já passou em público?",
  "Qual comida você gosta e quase todo mundo acha estranha?",
  "Qual foi a última coisa que fez você rir muito?",
  "Se pudesse dominar uma habilidade agora, qual seria?",
  "Qual aplicativo você mais abre sem perceber?",
  "Qual música você já ouviu tantas vezes que enjoou?",
  "Qual foi a desculpa mais criativa que você já inventou?",
  "Qual personagem fictício você gostaria de conhecer?",
  "Qual foi a compra mais inútil que você já fez?",
  "Que talento aleatório você tem?",
  "Qual matéria você gostaria de apagar da existência?",
  "Qual foi o apelido mais estranho que já te deram?",
  "Qual é a coisa mais aleatória que existe na sua galeria?",
  "Qual medo bobo você ainda tem?",
  "Qual moda antiga você gostaria que voltasse?",
  "Qual foi a mensagem mais vergonhosa que você já mandou por engano?",
  "Se tivesse que trocar de nome hoje, qual escolheria?",
  "Qual foi a coisa mais impulsiva que você já fez?"
];

const dares = [
  "Mande um áudio falando uma frase como narrador de documentário.",
  "Escreva sua próxima mensagem usando apenas letras maiúsculas.",
  "Escolha um emoji e use ele em todas as mensagens pelos próximos 3 minutos.",
  "Faça uma imitação escrita de alguém do grupo sem ofender ninguém.",
  "Mande uma figurinha aleatória sem contexto.",
  "Invente um nome de banda com três palavras escolhidas pelo grupo.",
  "Descreva o grupo como se fosse a sinopse de um filme.",
  "Mande uma frase motivacional completamente exagerada.",
  "Troque uma palavra comum por 'batata' nas próximas 3 mensagens.",
  "Faça uma pergunta aleatória para alguém do grupo.",
  "Conte uma piada ruim de propósito.",
  "Escreva uma mini história de duas linhas usando três emojis.",
  "Escolha alguém do grupo e elogie uma habilidade dessa pessoa.",
  "Mande o último emoji que você usou cinco vezes seguidas.",
  "Responda a próxima mensagem como se fosse um robô.",
  "Crie um título de notícia sobre o que está acontecendo no grupo agora.",
  "Invente um superpoder inútil e explique para que ele serviria.",
  "Escreva uma frase sem usar a letra A.",
  "Faça uma previsão absurda e engraçada para amanhã.",
  "Escolha um objeto perto de você e dê um nome para ele."
];

const neverHaveI = [
  "Eu nunca dormi durante uma aula.",
  "Eu nunca mandei mensagem para a pessoa errada.",
  "Eu nunca fingi que entendi algo quando não entendi nada.",
  "Eu nunca ri em um momento em que não podia rir.",
  "Eu nunca procurei meu próprio nome na internet.",
  "Eu nunca fiquei acordado até tarde sem motivo.",
  "Eu nunca apaguei uma mensagem logo depois de enviar.",
  "Eu nunca coloquei um alarme e voltei a dormir.",
  "Eu nunca comecei uma série e abandonei no primeiro episódio.",
  "Eu nunca esqueci por que entrei em um cômodo.",
  "Eu nunca falei sozinho achando que ninguém estava ouvindo.",
  "Eu nunca perdi algo que estava na minha mão.",
  "Eu nunca salvei um meme pensando em mandar e esqueci.",
  "Eu nunca fiquei procurando o celular enquanto estava com ele na mão.",
  "Eu nunca inventei uma desculpa para não sair.",
  "Eu nunca comi alguma coisa escondido para não dividir.",
  "Eu nunca vi o mesmo vídeo várias vezes seguidas.",
  "Eu nunca respondi 'kkk' sem ter rido.",
  "Eu nunca esqueci uma senha que eu mesmo criei.",
  "Eu nunca comecei a escrever uma mensagem enorme e desisti."
];

const eightBallAnswers = [
  "Sim.", "Não.", "Provavelmente.", "Muito provável.", "Pouco provável.",
  "Pergunte de novo depois.", "Tudo indica que sim.", "Melhor não contar com isso.",
  "As chances são boas.", "As chances são pequenas.", "Talvez.", "Sem dúvida.",
  "Eu não apostaria nisso.", "Parece que sim.", "Parece que não."
];

const hangmanWords = [
  { word: "abacaxi", hint: "fruta" },
  { word: "computador", hint: "tecnologia" },
  { word: "dinossauro", hint: "animal extinto" },
  { word: "biblioteca", hint: "lugar com livros" },
  { word: "chocolate", hint: "doce" },
  { word: "astronauta", hint: "profissão" },
  { word: "tempestade", hint: "clima" },
  { word: "labirinto", hint: "lugar difícil de sair" },
  { word: "girassol", hint: "planta" },
  { word: "esmeralda", hint: "pedra preciosa" },
  { word: "bicicleta", hint: "transporte" },
  { word: "vulcao", hint: "natureza" },
  { word: "teclado", hint: "periférico" },
  { word: "mochila", hint: "objeto escolar" },
  { word: "pinguim", hint: "animal" },
  { word: "oceano", hint: "natureza" },
  { word: "castelo", hint: "construção" },
  { word: "foguete", hint: "veículo espacial" },
  { word: "planeta", hint: "astronomia" },
  { word: "montanha", hint: "relevo" },
  { word: "caderno", hint: "material escolar" },
  { word: "dragao", hint: "criatura fictícia" },
  { word: "telefone", hint: "tecnologia" },
  { word: "sorvete", hint: "sobremesa" },
  { word: "cachoeira", hint: "natureza" }
];

function prefix() {
  return config.prefix || ".";
}

function choose(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function contextInfo(msg) {
  const m = msg?.message || {};
  return (
    m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.videoMessage?.contextInfo ||
    m.documentMessage?.contextInfo ||
    m.audioMessage?.contextInfo ||
    {}
  );
}

function senderJid(msg, from) {
  return msg?.key?.participant || msg?.key?.participantAlt || msg?.key?.remoteJid || from;
}

function jidTag(jid) {
  return `@${String(jid || "").split("@")[0].split(":")[0]}`;
}

function uniqueJids(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function mentionedJids(msg) {
  return uniqueJids(contextInfo(msg)?.mentionedJid || []);
}

function targetJid(msg) {
  const mentioned = mentionedJids(msg);
  if (mentioned.length) return mentioned[0];
  const ctx = contextInfo(msg);
  if (ctx?.quotedMessage && ctx?.participant) return ctx.participant;
  return null;
}

function sameAccount(a, b) {
  return String(a || "").split("@")[0].split(":")[0] === String(b || "").split("@")[0].split(":")[0];
}

async function groupJids(conn, from) {
  if (!String(from).endsWith("@g.us")) return [];
  const meta = await conn.groupMetadata(from);
  const bot = conn?.user?.id || "";
  return uniqueJids(
    (meta?.participants || [])
      .map((p) => p?.id || p?.jid || p?.lid)
      .filter((jid) => jid && !sameAccount(jid, bot))
  );
}

function stablePercent(a, b, salt) {
  const value = [String(a), String(b)].sort().join("|") + `|${salt}`;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % 101;
}

function resolvePair(msg, from) {
  const sender = senderJid(msg, from);
  const mentioned = mentionedJids(msg).filter((jid) => !sameAccount(jid, sender));
  if (mentioned.length >= 2) return [mentioned[0], mentioned[1]];
  if (mentioned.length === 1) return [sender, mentioned[0]];
  const quoted = targetJid(msg);
  if (quoted && !sameAccount(quoted, sender)) return [sender, quoted];
  return null;
}

async function send(conn, from, msg, payload) {
  return conn.sendMessage(from, payload, { quoted: createStatusQuoted(msg) });
}

function baseCommand(name, section, usage, description, execute, extra = {}) {
  return {
    name,
    aliases: extra.aliases || [],
    description,
    menuCategory: "Brincadeiras",
    menuSection: section,
    usage,
    ...(extra.permissions ? { permissions: extra.permissions } : {}),
    execute,
  };
}

const commands = [];

commands.push(baseCommand(
  "verdade", "Jogos rápidos", "verdade", "sorteia uma pergunta de verdade",
  async (conn, msg, args, from) => send(conn, from, msg, { text: `🗣️ *VERDADE*\n\n${choose(truths)}` })
));

commands.push(baseCommand(
  "desafio", "Jogos rápidos", "desafio", "sorteia um desafio leve e divertido",
  async (conn, msg, args, from) => send(conn, from, msg, { text: `🎯 *DESAFIO*\n\n${choose(dares)}` })
));

commands.push(baseCommand(
  "eununca", "Jogos rápidos", "eununca", "sorteia uma frase de eu nunca",
  async (conn, msg, args, from) => send(conn, from, msg, { text: `🙈 *EU NUNCA...*\n\n${choose(neverHaveI)}` }),
  { aliases: ["eu-nunca"] }
));

commands.push(baseCommand(
  "8ball", "Jogos rápidos", "8ball <pergunta>", "responde uma pergunta no estilo bola 8",
  async (conn, msg, args, from) => {
    const question = args.join(" ").trim();
    if (!question) return send(conn, from, msg, { text: `❌ Uso: ${prefix()}8ball <pergunta>` });
    return send(conn, from, msg, { text: `🎱 *${question}*\n\n${choose(eightBallAnswers)}` });
  },
  { aliases: ["bola8", "oraculo"] }
));

commands.push(baseCommand(
  "ppt", "Jogos rápidos", "ppt <pedra|papel|tesoura>", "joga pedra papel e tesoura contra o bot",
  async (conn, msg, args, from) => {
    const user = String(args[0] || "").toLowerCase();
    const valid = ["pedra", "papel", "tesoura"];
    if (!valid.includes(user)) {
      return send(conn, from, msg, { text: `❌ Uso: ${prefix()}ppt pedra | papel | tesoura` });
    }
    const bot = choose(valid);
    const draw = user === bot;
    const win = (user === "pedra" && bot === "tesoura") || (user === "papel" && bot === "pedra") || (user === "tesoura" && bot === "papel");
    const result = draw ? "🤝 Empate!" : win ? "🏆 Você ganhou!" : "🤖 Eu ganhei!";
    return send(conn, from, msg, { text: `✊ *PEDRA, PAPEL E TESOURA*\n\nVocê: ${user}\nBot: ${bot}\n\n${result}` });
  },
  { aliases: ["jokenpo", "jokempo"] }
));

commands.push(baseCommand(
  "dado", "Jogos rápidos", "dado [lados] ou dado 3d6", "rola um ou vários dados",
  async (conn, msg, args, from) => {
    const raw = String(args[0] || "6").toLowerCase();
    let quantity = 1;
    let sides = 6;
    const notation = raw.match(/^(\d{1,2})d(\d{1,4})$/);
    if (notation) {
      quantity = Number(notation[1]);
      sides = Number(notation[2]);
    } else if (/^\d+$/.test(raw)) {
      sides = Number(raw);
    } else {
      return send(conn, from, msg, { text: `❌ Uso: ${prefix()}dado 20 ou ${prefix()}dado 3d6` });
    }
    if (quantity < 1 || quantity > 10 || sides < 2 || sides > 1000) {
      return send(conn, from, msg, { text: "❌ Limite: até 10 dados e entre 2 e 1000 lados." });
    }
    const rolls = Array.from({ length: quantity }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((a, b) => a + b, 0);
    return send(conn, from, msg, { text: `🎲 *DADO ${quantity}d${sides}*\n\nResultado: ${rolls.join(", ")}${quantity > 1 ? `\nTotal: ${total}` : ""}` });
  }
));

commands.push(baseCommand(
  "sorteio", "Aleatórios e sorteios", "sorteio [@usuarios]", "sorteia um participante marcado ou do grupo",
  async (conn, msg, args, from) => {
    const marked = mentionedJids(msg);
    const candidates = marked.length ? marked : await groupJids(conn, from);
    if (!candidates.length) return send(conn, from, msg, { text: "❌ Marque participantes ou use este comando em um grupo." });
    const winner = choose(candidates);
    return send(conn, from, msg, { text: `🎉 *SORTEIO*\n\nVencedor: ${jidTag(winner)}`, mentions: [winner] });
  },
  { permissions: { group: true } }
));

commands.push(baseCommand(
  "roleta", "Aleatórios e sorteios", "roleta [@usuarios]", "gira uma roleta entre os participantes",
  async (conn, msg, args, from) => {
    const marked = mentionedJids(msg);
    const candidates = marked.length >= 2 ? marked : await groupJids(conn, from);
    if (candidates.length < 2) return send(conn, from, msg, { text: "❌ Preciso de pelo menos 2 participantes." });
    const selected = choose(candidates);
    return send(conn, from, msg, { text: `🎡 *ROLETA DO GRUPO*\n\nA roleta parou em...\n👉 ${jidTag(selected)}`, mentions: [selected] });
  },
  { permissions: { group: true } }
));

commands.push(baseCommand(
  "quem", "Aleatórios e sorteios", "quem [pergunta]", "escolhe aleatoriamente alguém do grupo",
  async (conn, msg, args, from) => {
    const candidates = await groupJids(conn, from);
    if (!candidates.length) return send(conn, from, msg, { text: "❌ Não consegui obter os membros do grupo." });
    const selected = choose(candidates);
    const subject = args.join(" ").trim();
    return send(conn, from, msg, {
      text: `👀 *QUEM?*\n\n${subject ? `Pergunta: ${subject}\n\n` : ""}Escolhido: ${jidTag(selected)}`,
      mentions: [selected]
    });
  },
  { permissions: { group: true } }
));

commands.push(baseCommand(
  "top5", "Aleatórios e sorteios", "top5 [tema]", "monta um top 5 aleatório com membros do grupo",
  async (conn, msg, args, from) => {
    const candidates = shuffle(await groupJids(conn, from)).slice(0, 5);
    if (!candidates.length) return send(conn, from, msg, { text: "❌ Não consegui obter os membros do grupo." });
    const theme = args.join(" ").trim() || "destaques aleatórios";
    const lines = candidates.map((jid, i) => `${i + 1}. ${jidTag(jid)}`);
    return send(conn, from, msg, {
      text: `🏅 *TOP ${candidates.length} — ${theme}*\n\n${lines.join("\n")}`,
      mentions: candidates
    });
  },
  { permissions: { group: true } }
));

commands.push(baseCommand(
  "ship", "Interações", "ship @usuario [@usuario2]", "calcula uma compatibilidade divertida entre duas pessoas",
  async (conn, msg, args, from) => {
    const pair = resolvePair(msg, from);
    if (!pair) return send(conn, from, msg, { text: `❌ Uso: ${prefix()}ship @usuario ou ${prefix()}ship @a @b` });
    const score = stablePercent(pair[0], pair[1], "ship");
    const bar = "❤️".repeat(Math.round(score / 20)) + "🖤".repeat(5 - Math.round(score / 20));
    return send(conn, from, msg, {
      text: `💘 *SHIP*\n\n${jidTag(pair[0])} + ${jidTag(pair[1])}\n\nCompatibilidade: *${score}%*\n${bar}`,
      mentions: pair
    });
  }
));

commands.push(baseCommand(
  "amizade", "Interações", "amizade @usuario [@usuario2]", "mede uma amizade de brincadeira entre duas pessoas",
  async (conn, msg, args, from) => {
    const pair = resolvePair(msg, from);
    if (!pair) return send(conn, from, msg, { text: `❌ Uso: ${prefix()}amizade @usuario ou ${prefix()}amizade @a @b` });
    const score = stablePercent(pair[0], pair[1], "amizade");
    return send(conn, from, msg, {
      text: `🤝 *AMIZADE*\n\n${jidTag(pair[0])} + ${jidTag(pair[1])}\n\nNível de amizade: *${score}%*`,
      mentions: pair
    });
  }
));

commands.push(baseCommand(
  "abracar", "Interações", "abracar @usuario", "manda um abraço virtual para alguém",
  async (conn, msg, args, from) => {
    const sender = senderJid(msg, from);
    const target = targetJid(msg);
    if (!target) return send(conn, from, msg, { text: `❌ Uso: ${prefix()}abracar @usuario` });
    return send(conn, from, msg, {
      text: `🫂 ${jidTag(sender)} deu um abraço em ${jidTag(target)}!`,
      mentions: uniqueJids([sender, target])
    });
  },
  { aliases: ["abraçar", "abraco", "abraço"] }
));

commands.push(baseCommand(
  "soco", "Interações", "soco @usuario", "dá um soco de brincadeira em alguém",
  async (conn, msg, args, from) => {
    const sender = senderJid(msg, from);
    const target = targetJid(msg);
    if (!target) return send(conn, from, msg, { text: `❌ Uso: ${prefix()}soco @usuario` });
    return send(conn, from, msg, {
      text: `🥊 ${jidTag(sender)} deu um soco de brincadeira em ${jidTag(target)}!`,
      mentions: uniqueJids([sender, target])
    });
  },
  { aliases: ["socar"] }
));

commands.push(baseCommand(
  "roubaravatar", "Interações", "roubaravatar @usuario", "manda a foto de perfil do usuário marcado",
  async (conn, msg, args, from) => {
    const target = targetJid(msg);
    if (!target) return send(conn, from, msg, { text: `❌ Uso: ${prefix()}roubaravatar @usuario` });
    const picture = await getMessageProfilePicture(conn, msg, from, [target]);
    if (!picture) return send(conn, from, msg, { text: "❌ Não consegui obter a foto de perfil desse usuário." });
    const resolvedTarget = picture.jid || target;
    return send(conn, from, msg, {
      image: { url: picture.url },
      caption: `🖼️ Avatar de ${jidTag(resolvedTarget)} capturado com sucesso 😎`,
      mentions: [resolvedTarget]
    });
  },
  { aliases: ["roubarpfp", "stealavatar"] }
));

function cleanupForca(chatId) {
  const game = forcaGames.get(chatId);
  if (game && Date.now() - game.touchedAt > FORCA_TTL) {
    forcaGames.delete(chatId);
    return null;
  }
  return game || null;
}

function normalizeGuess(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function forcaMask(game) {
  return game.word
    .split("")
    .map((letter) => game.guessed.has(letter) ? letter.toUpperCase() : "_")
    .join(" ");
}

function forcaStatus(game) {
  const wrong = [...game.wrong].map((x) => x.toUpperCase()).join(", ") || "nenhuma";
  return `🧩 *FORCA*\n\nPalavra: ${forcaMask(game)}\nDica: ${game.hint}\nErros: ${game.errors}/${FORCA_MAX_ERRORS}\nLetras erradas: ${wrong}\n\nUse ${prefix()}forca <letra> ou tente a palavra inteira.`;
}

async function sendForcaCard(conn, from, msg, game, extra = "") {
  const caption = [forcaStatus(game), extra].filter(Boolean).join("\n\n");
  try {
    const card = await tokitoApi.buffer("/canvas/forca", {
      palavra: forcaMask(game),
      tema: "Palavra",
      dica: game.hint,
      erros: game.errors,
      max: FORCA_MAX_ERRORS,
      fundo: "https://telegra.ph/file/b5427ea4b8701bc47e751.jpg",
      t: Date.now(),
    }, {
      timeout: 60000,
      headers: { accept: "image/*,*/*" },
    });

    if (!card.buffer?.length || !/image/i.test(card.contentType)) {
      throw new Error("Canvas de forca inválido.");
    }

    return send(conn, from, msg, {
      image: card.buffer,
      caption,
    });
  } catch (error) {
    const info = tokitoApi.errorInfo(error);
    console.warn("[FORCA TOKITO]", info.status || "-", info.message);
    return send(conn, from, msg, { text: caption });
  }
}

commands.push(baseCommand(
  "forca", "Jogos rápidos", "forca [letra|palavra|novo|desistir]", "jogo da forca por mensagens, sem desenho gráfico",
  async (conn, msg, args, from) => {
    const inputRaw = args.join(" ").trim();
    const input = normalizeGuess(inputRaw);
    let game = cleanupForca(from);

    if (!game || input === "novo") {
      const selected = choose(hangmanWords);
      game = {
        word: selected.word,
        hint: selected.hint,
        guessed: new Set(),
        wrong: new Set(),
        errors: 0,
        touchedAt: Date.now()
      };
      forcaGames.set(from, game);
      return sendForcaCard(conn, from, msg, game, "💡 Um novo jogo começou!");
    }

    if (!inputRaw) {
      game.touchedAt = Date.now();
      return sendForcaCard(conn, from, msg, game);
    }

    if (input === "desistir" || input === "parar") {
      const answer = game.word.toUpperCase();
      forcaGames.delete(from);
      return send(conn, from, msg, { text: `🏳️ Jogo encerrado. A palavra era *${answer}*.` });
    }

    if (!input) return send(conn, from, msg, { text: "❌ Digite uma letra ou palavra válida." });
    game.touchedAt = Date.now();

    if (input.length === 1) {
      if (game.guessed.has(input) || game.wrong.has(input)) {
        return sendForcaCard(conn, from, msg, game, `ℹ️ Você já tentou a letra *${input.toUpperCase()}*.`);
      }
      if (game.word.includes(input)) game.guessed.add(input);
      else {
        game.wrong.add(input);
        game.errors += 1;
      }
    } else if (input === game.word) {
      for (const letter of game.word) game.guessed.add(letter);
    } else {
      game.errors += 1;
    }

    const won = game.word.split("").every((letter) => game.guessed.has(letter));
    if (won) {
      const answer = game.word.toUpperCase();
      forcaGames.delete(from);
      return sendForcaCard(conn, from, msg, game, `🎉 *ACERTOU!* A palavra era *${answer}*.`);
    }

    if (game.errors >= FORCA_MAX_ERRORS) {
      const answer = game.word.toUpperCase();
      forcaGames.delete(from);
      return sendForcaCard(conn, from, msg, game, `⌛ Acabaram as tentativas. A palavra era *${answer}*.`);
    }

    return sendForcaCard(conn, from, msg, game);
  }
));


commands.push(baseCommand(
  "resetforca",
  "Jogos rápidos",
  "resetforca",
  "encerra a partida de forca ativa no grupo",
  async (conn, msg, args, from) => {
    const existed = forcaGames.delete(from);
    return send(conn, from, msg, {
      text: existed
        ? "✅ Partida de Forca encerrada."
        : "ℹ️ Não há partida de Forca ativa neste grupo."
    });
  },
  { permissions: { group: true } }
));

module.exports = commands;
module.exports._test = {
  stablePercent,
  resolvePair,
  normalizeGuess,
  forcaMask,
  sendForcaCard,
  truths,
  dares,
  neverHaveI,
  hangmanWords,
  forcaGames,
};
