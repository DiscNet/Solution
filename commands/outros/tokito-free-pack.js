// Mais recursos gratuitos inspirados no catálogo da Tokito V10.
const config = require("../../config/config");
const kit = require("../../functions/utilityKit");
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");

const velhaGames = new Map();
const wordGames = new Map();
const TTL = 15 * 60 * 1000;

const words = [
  ["computador", "tecnologia"],
  ["javascript", "programação"],
  ["whatsapp", "mensagens"],
  ["planeta", "astronomia"],
  ["esmeralda", "pedra preciosa"],
  ["biblioteca", "livros"],
  ["tempestade", "clima"],
  ["dinossauro", "animal extinto"],
  ["bicicleta", "transporte"],
  ["cachoeira", "natureza"],
];

function shuffleText(text) {
  const chars = [...text];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  const out = chars.join("");
  return out === text && text.length > 1 ? text.slice(1) + text[0] : out;
}

function keyFor(msg, from) {
  const sender = msg?.key?.participantAlt || msg?.key?.participant || msg?.key?.remoteJidAlt || msg?.key?.remoteJid || from;
  return `${from}|${sender}`;
}

function cleanExpired(map, key) {
  const value = map.get(key);
  if (value && Date.now() - value.at > TTL) {
    map.delete(key);
    return null;
  }
  return value || null;
}

function renderBoard(board) {
  return board.map((cell, i) => cell || String(i + 1))
    .reduce((rows, cell, i) => {
      const row = Math.floor(i / 3);
      rows[row] ||= [];
      rows[row].push(cell);
      return rows;
    }, [])
    .map((row) => row.join(" │ "))
    .join("\n──┼──┼──\n");
}

function winner(board, symbol) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  return lines.some((line) => line.every((i) => board[i] === symbol));
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const commands = [
  kit.makeCommand({
    name: "criador",
    aliases: ["ownerinfo"],
    section: "Informações",
    usage: "criador",
    description: "Mostra informações públicas configuradas sobre o responsável pelo bot",
    async execute(conn, msg, args, from) {
      const ownerName = config.ownerName || "Não configurado";
      const botName = config.botName || "Solution";
      const prefix = config.prefix || ".";
      await kit.reply(
        conn,
        msg,
        from,
        `👤 *CRIADOR / RESPONSÁVEL*\n\n🤖 Bot: *${botName}*\n👨‍💻 Responsável: *${ownerName}*\n⌨️ Prefixo: *${prefix}*\n\nUse apenas os contatos públicos configurados no próprio bot.`
      );
    },
  }),

  kit.makeCommand({
    name: "gitclone",
    aliases: ["githubzip"],
    section: "Downloads",
    usage: "gitclone https://github.com/usuario/repositorio",
    description: "Baixa repositórios públicos usando a Tokito API",
    async execute(conn, msg, args, from, http) {
      const raw = String(args[0] || "").trim();
      if (!/^https?:\/\/(?:www\.)?github\.com\//i.test(raw)) {
        return kit.reply(conn, msg, from, "❌ Use um link público de repositório do GitHub.");
      }
      try {
        await conn.sendMessage(from, { react: { text: "📦", key: msg.key } }).catch(() => {});
        let fileUrl = "";
        let fileName = "repositorio.zip";
        try {
          const data = await tokitoApi.get("/api/gitclone", { url: raw });
          const root = tokitoApi.firstObject(data) || data;
          fileUrl = root?.download_url || root?.download || root?.url || root?.link || root?.arquivo || "";
          fileName = String(root?.filename || root?.nome || fileName).replace(/[\\/:*?"<>|]/g, "_").slice(0, 100);
        } catch {}
        if (fileUrl && /^https?:\/\//i.test(fileUrl)) {
          await conn.sendMessage(from, {
            document: { url: fileUrl },
            mimetype: "application/zip",
            fileName,
          }, { quoted: createStatusQuoted(msg) });
        } else {
          const match = raw.match(/^https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/i);
          if (!match) throw kit.userError("Link de repositório inválido.");
          const owner = match[1];
          const repo = match[2];
          const meta = await http.get("https://api.github.com/repos/" + owner + "/" + repo, {
            timeout: 12000, headers: { "user-agent": "SolutionBot/1.0" }, validateStatus: () => true,
          });
          if (meta.status !== 200 || meta.data?.private) throw kit.userError("O repositório não existe ou não é público.");
          const branch = meta.data?.default_branch || "main";
          await conn.sendMessage(from, {
            document: { url: "https://codeload.github.com/" + owner + "/" + repo + "/zip/refs/heads/" + encodeURIComponent(branch) },
            mimetype: "application/zip",
            fileName: repo + "-" + branch + ".zip",
          }, { quoted: createStatusQuoted(msg) });
        }
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (e) {
        await kit.fail(conn, msg, from, e, "Não foi possível baixar esse repositório.");
      }
    },
  }),

  kit.makeCommand({
    name: "jogodavelha",
    aliases: ["velha", "ticTacToe"],
    section: "Jogos rápidos",
    usage: "jogodavelha [1-9|novo|parar]",
    description: "Joga jogo da velha contra o bot",
    async execute(conn, msg, args, from) {
      const key = keyFor(msg, from);
      const raw = String(args[0] || "").trim().toLowerCase();
      let game = cleanExpired(velhaGames, key);

      if (!game || raw === "novo") {
        game = { board: Array(9).fill(""), at: Date.now() };
        velhaGames.set(key, game);
        return kit.reply(conn, msg, from, `❎ *JOGO DA VELHA*\n\n${renderBoard(game.board)}\n\nVocê é ❌. Use *.jogodavelha 1-9*.`);
      }

      if (["parar", "desistir"].includes(raw)) {
        velhaGames.delete(key);
        return kit.reply(conn, msg, from, "🏳️ Jogo encerrado.");
      }

      const position = Number(raw) - 1;
      if (!Number.isInteger(position) || position < 0 || position > 8) {
        return kit.reply(conn, msg, from, "❌ Escolha uma posição de 1 a 9.");
      }
      if (game.board[position]) return kit.reply(conn, msg, from, "❌ Essa posição já está ocupada.");

      game.board[position] = "❌";
      game.at = Date.now();

      if (winner(game.board, "❌")) {
        velhaGames.delete(key);
        return kit.reply(conn, msg, from, `🏆 *VOCÊ GANHOU!*\n\n${renderBoard(game.board)}`);
      }

      const free = game.board.map((v, i) => v ? -1 : i).filter((i) => i >= 0);
      if (!free.length) {
        velhaGames.delete(key);
        return kit.reply(conn, msg, from, `🤝 *EMPATE!*\n\n${renderBoard(game.board)}`);
      }

      const botMove = free[Math.floor(Math.random() * free.length)];
      game.board[botMove] = "⭕";

      if (winner(game.board, "⭕")) {
        velhaGames.delete(key);
        return kit.reply(conn, msg, from, `🤖 *EU GANHEI!*\n\n${renderBoard(game.board)}`);
      }

      if (game.board.every(Boolean)) {
        velhaGames.delete(key);
        return kit.reply(conn, msg, from, `🤝 *EMPATE!*\n\n${renderBoard(game.board)}`);
      }

      return kit.reply(conn, msg, from, `❎ *JOGO DA VELHA*\n\n${renderBoard(game.board)}\n\nSua vez.`);
    },
  }),

  kit.makeCommand({
    name: "cacapalavras",
    aliases: ["embaralhada", "palavra"],
    section: "Jogos rápidos",
    usage: "cacapalavras [resposta|novo|desistir]",
    description: "Adivinhe a palavra a partir das letras embaralhadas",
    async execute(conn, msg, args, from) {
      const key = keyFor(msg, from);
      const raw = normalize(args.join(" "));
      let game = cleanExpired(wordGames, key);

      if (!game || raw === "novo") {
        const [word, hint] = words[Math.floor(Math.random() * words.length)];
        game = { word, hint, scrambled: shuffleText(word), at: Date.now() };
        wordGames.set(key, game);
        return kit.reply(conn, msg, from, `🔤 *CAÇA-PALAVRAS*\n\nLetras: *${game.scrambled.toUpperCase()}*\n💡 Dica: ${hint}\n\nUse *.cacapalavras resposta*.`);
      }

      if (!raw) {
        return kit.reply(conn, msg, from, `🔤 Letras: *${game.scrambled.toUpperCase()}*\n💡 Dica: ${game.hint}`);
      }

      if (["desistir", "parar"].includes(raw)) {
        wordGames.delete(key);
        return kit.reply(conn, msg, from, `🏳️ A palavra era *${game.word.toUpperCase()}*.`);
      }

      game.at = Date.now();
      if (raw === normalize(game.word)) {
        wordGames.delete(key);
        return kit.reply(conn, msg, from, `✅ *Acertou!* A palavra era *${game.word.toUpperCase()}*.`);
      }

      return kit.reply(conn, msg, from, "❌ Ainda não. Tente novamente ou use *.cacapalavras desistir*.");
    },
  }),
];

module.exports = commands;
module.exports._test = { renderBoard, winner, shuffleText };
