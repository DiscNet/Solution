// commands/outros/info.js
const path = require("path");
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const {
  normalizeCommandName,
  getCommandAliases,
  loadCommandModules,
  buildCommandRegistry
} = require("../../functions/commandRegistry");

function getRegistry() {
  const commandsPath = path.join(__dirname, "..");
  const { records } = loadCommandModules(commandsPath, { clearCache: false });
  return buildCommandRegistry(records).registry;
}

module.exports = {
  name: "info",
  aliases: ["cmdinfo", "infocmd"],
  description: "Mostra informações de um comando específico",

  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";

    try {
      if (!args?.[0]) {
        return conn.sendMessage(from, {
          text: `❌ *Informe um comando!*\n\n📌 *Exemplo:* ${prefix}info menu`
        }, { quoted: createStatusQuoted(msg) });
      }

      const requested = normalizeCommandName(args[0]);
      const registry = getRegistry();
      const command = requested ? registry[requested] : null;

      if (!command?.name) {
        return conn.sendMessage(from, {
          text: `❌ *Comando "${args[0]}" não encontrado!*`
        }, { quoted: createStatusQuoted(msg) });
      }

      const canonical = normalizeCommandName(command.name) || command.name;
      const aliases = getCommandAliases(command);
      const aliasText = aliases.length
        ? `\n🔗 *Aliases:* ${aliases.map(alias => `${prefix}${alias}`).join(", ")}`
        : "";

      const text =
        `╭━━━〔 📖 ɪɴғᴏ 〕━━━╮\n` +
        `┃ 📌 ᴄᴏᴍᴀɴᴅᴏ: *${prefix}${canonical}*\n` +
        `┃ 📝 ${command.description || "Sem descrição"}` +
        `${aliasText}\n` +
        `╰━━━━━━━━━━━━━━━━━━╯`;

      await conn.sendMessage(from, { text }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "📖", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("info:", error);
      await conn.sendMessage(from, {
        text: "❌ *Erro ao buscar informações do comando!*"
      }, { quoted: createStatusQuoted(msg) }).catch(() => {});
    }
  }
};
