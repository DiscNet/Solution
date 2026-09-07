const fs = require("fs");
const path = require("path");
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const { expandCommandExport } = require("../../functions/commandRegistry");

function getCommands() {
  const dir = path.join(__dirname, "..", "alteradores");
  const result = [];
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".js")).sort()) {
    try {
      const full = path.join(dir, file);
      delete require.cache[require.resolve(full)];
      for (const command of expandCommandExport(require(full))) {
        if (command?.name) result.push({ name: command.name, mediaType: command.mediaType || "imagem" });
      }
    } catch (error) {
      console.error(`Falha ao carregar alterador ${file}:`, error.message);
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = {
  name: "menualterar",
  aliases: ["menualt", "alterar", "alteracoes"],
  description: "ᴍᴇɴᴜ ᴅᴏs ᴀʟᴛᴇʀᴀᴅᴏʀᴇs ᴅᴇ ɪᴍᴀɢᴇᴍ, ᴀᴜ́ᴅɪᴏ ᴇ ᴠɪ́ᴅᴇᴏ",
  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    const commands = getCommands();
    const groups = new Map();
    for (const command of commands) {
      if (!groups.has(command.mediaType)) groups.set(command.mediaType, []);
      groups.get(command.mediaType).push(command.name);
    }

    const blocks = [];
    for (const type of ["imagem", "audio", "video"]) {
      const list = groups.get(type) || [];
      if (!list.length) continue;
      blocks.push(`*${type}* — ${list.length}`);
      blocks.push(list.map((name) => `\`${prefix}${name}\``).join(" · "));
      blocks.push("");
    }

    const text = [
      "🎛️ *ᴀʟᴛᴇʀᴀᴅᴏʀᴇs*",
      "",
      `• ᴛᴏᴛᴀʟ: ${commands.length}`,
      "• ʀᴇsᴘᴏɴᴅᴀ ᴀ̀ ᴍɪ́ᴅɪᴀ ᴄᴏᴍ ᴏ ᴄᴏᴍᴀɴᴅᴏ ᴅᴇsᴇᴊᴀᴅᴏ.",
      "",
      ...blocks
    ].join("\n");

    return conn.sendMessage(from, { text }, { quoted: createStatusQuoted(msg) });
  }
};
