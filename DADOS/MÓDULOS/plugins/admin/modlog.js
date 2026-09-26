// Menu: Grupos - Histórico | Comando: modlog
const config = require("../../../config/config");
const modLog = require("../../functions/modLog");
const { createStatusQuoted } = require("../../functions/statusCard");

const MAP = { a:"ᴀ",b:"ʙ",c:"ᴄ",d:"ᴅ",e:"ᴇ",f:"ғ",g:"ɢ",h:"ʜ",i:"ɪ",j:"ᴊ",k:"ᴋ",l:"ʟ",m:"ᴍ",n:"ɴ",o:"ᴏ",p:"ᴘ",q:"ǫ",r:"ʀ",t:"ᴛ",u:"ᴜ",v:"ᴠ",w:"ᴡ",y:"ʏ",z:"ᴢ" };
function sc(text) {
  return String(text).split(/(`[^`]*`)/g).map((part) => part.startsWith("`") ? part : part.replace(/[A-Za-z]/g, (ch) => MAP[ch.toLowerCase()] || ch.toLowerCase())).join("");
}

module.exports = {
  name: "modlog",
  aliases: ["historicoadm"],
  description: "ᴍᴏsᴛʀᴀ ᴏ ʜɪsᴛᴏ́ʀɪᴄᴏ ᴀᴅᴍɪɴɪsᴛʀᴀᴛɪᴠᴏ ᴅᴏ ɢʀᴜᴘᴏ",
  permissions: { group: true, admin: true },

  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    if (String(args?.[0] || "").toLowerCase() === "limpar") {
      modLog.clear(from);
      return conn.sendMessage(from, { text: sc("✅ Histórico administrativo limpo.") }, { quoted: createStatusQuoted(msg) });
    }

    const limit = Math.max(1, Math.min(30, Math.floor(Number(args?.[0]) || 15)));
    const entries = modLog.list(from, limit);
    if (!entries.length) {
      return conn.sendMessage(from, {
        text: sc(`📋 Nenhuma ação administrativa registrada ainda.\n\nUse `) + `${prefix}modlog 20` + sc(" para alterar a quantidade exibida.")
      }, { quoted: createStatusQuoted(msg) });
    }

    const rows = entries.map((entry, index) => {
      const when = new Date(entry.at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const argsText = entry.args?.length ? `\n   • args: \`${entry.args.join(" ")}\`` : "";
      return `${index + 1}. ${sc(entry.action)}\n   • ${sc("por")}: ${entry.actorName}\n   • ${sc("comando")}: \`${config.prefix || "."}${entry.requestedName || entry.command}\`\n   • ${sc("quando")}: ${when}${argsText}`;
    });

    const text = [
      "📋 *ᴍᴏᴅʟᴏɢ*",
      "",
      ...rows,
      "",
      `${sc("limpar histórico")}: \`${prefix}modlog limpar\``
    ].join("\n");

    return conn.sendMessage(from, { text }, { quoted: createStatusQuoted(msg) });
  }
};


Object.assign(module.exports, {
  "menuCategory": "Grupos",
  "menuSection": "Histórico",
  "usage": "modlog [quantidade]",
  "description": "Uso: .modlog [quantidade]"
});
