// Menu: Utilidades - Estatísticas | Comando: totalcmd
const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../config/config");
const path = require("path");
const { loadCommandModules, buildCommandRegistry } = require("../../functions/commandRegistry");

function getTotalCommands() {
  const commandsPath = path.join(__dirname, "..");
  const { records, errors } = loadCommandModules(commandsPath);

  if (errors.length) {
    const details = errors.map((item) => `${path.relative(commandsPath, item.file)}: ${item.error.message}`).join("; ");
    throw new Error(`Falha ao carregar comandos: ${details}`);
  }

  const { registry, collisions } = buildCommandRegistry(records);
  if (collisions.length) {
    console.warn(`[TOTALCMD] ${collisions.length} colisão(ões) detectada(s) no registro.`);
  }

  // Conta apenas nomes canônicos realmente registrados. Aliases não entram no total.
  return records.filter((record) => registry[record.name] === record.command).length;
}

module.exports = {
  name: "totalcmd",
  aliases: ["totalcmds", "cmdcount", "comandos"],
  description: "ᴍᴏsᴛʀᴀ ᴀ ǫᴜᴀɴᴛɪᴅᴀᴅᴇ ᴛᴏᴛᴀʟ ᴅᴇ ᴄᴏᴍᴀɴᴅᴏs ᴅᴏ ʙᴏᴛ",
  getTotalCommands,
  async execute(conn, msg, args, from) {
    try {
      const bot = config.botName || "GrimmJow";
      const totalComandos = getTotalCommands();

      const texto = `📊 *ᴛᴏᴛᴀʟ ᴅᴇ ᴄᴏᴍᴀɴᴅᴏs*

> ᴄᴍᴅ's: ${totalComandos}`;

      await conn.sendMessage(from, {
        text: texto,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: bot,
            serverMessageId: 116
          }
        }
      }, {
        quoted: createStatusQuoted(msg)
      });
    } catch (error) {
      console.error("Erro totalcmd:", error);
      const bot = config.botName || "GrimmJow";
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴏɴᴛᴀʀ ᴄᴏᴍᴀɴᴅᴏs!*",
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: bot,
            serverMessageId: 116
          }
        }
      }, { quoted: createStatusQuoted(msg) });
    }
  }
};


Object.assign(module.exports, {
  "menuCategory": "Utilidades",
  "menuSection": "Estatísticas",
  "description": "mostra a quantidade total de comandos do bot"
});
