const fs = require("fs");
const path = require("path");
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const { expandCommandExport } = require("../../functions/commandRegistry");

function getRpgCommands() {
  const dir = path.join(__dirname, "..", "rpg");
  const commands = [];
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".js")).sort()) {
    try {
      const full = path.join(dir, file);
      delete require.cache[require.resolve(full)];
      for (const command of expandCommandExport(require(full))) {
        if (!command?.name) continue;
        commands.push({ name: command.name, category: command.rpgCategory || "classicos" });
      }
    } catch (error) {
      console.error(`Falha ao carregar RPG menu ${file}:`, error.message);
    }
  }
  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = {
  name: "menurpg",
  aliases: ["menur", "rpg"],
  description: "ᴍᴇɴᴜ ᴏʀɢᴀɴɪᴢᴀᴅᴏ ᴅᴏ sɪsᴛᴇᴍᴀ ʀᴘɢ",
  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    const commands = getRpgCommands();
    const categories = new Map();
    for (const command of commands) {
      if (!categories.has(command.category)) categories.set(command.category, []);
      categories.get(command.category).push(command.name);
    }

    const order = ["informacao", "economia", "progressao", "aventura", "combate", "social", "administracao", "classicos"];
    const lines = [];
    for (const category of order) {
      const list = categories.get(category);
      if (!list?.length) continue;
      lines.push(`*${category}* — ${list.length}`);
      lines.push(list.slice(0, 8).map((name) => `\`${prefix}${name}\``).join(" · ") + (list.length > 8 ? " · ..." : ""));
      lines.push("");
    }

    const text = [
      "⚔️ *ʀᴘɢ ɢʀɪᴍᴍᴊᴏᴡ*",
      "",
      `• ᴄᴏᴍᴀɴᴅᴏs: ${commands.length}`,
      `• ᴄᴀᴛᴇɢᴏʀɪᴀs: ${categories.size}`,
      "",
      ...lines,
      `📘 ɢᴜɪᴀ ᴄᴏᴍᴘʟᴇᴛᴏ: \`${prefix}rpgguia\``,
      `📚 ʟɪsᴛᴀ ᴄᴏᴍᴘʟᴇᴛᴀ: \`${prefix}rpgcomandos\``,
      `🛠️ ᴘᴀɪɴᴇʟ ᴀᴅᴍɪɴ: \`${prefix}rpgadmin\``
    ].join("\n");

    return conn.sendMessage(from, { text }, { quoted: createStatusQuoted(msg) });
  }
};
