// Menu: Utilidades - Ajuda | Comando: tc
// commands/outros/tc.js
const config = require("../../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");

module.exports = {
  name: "tc",
  aliases: ["contato", "ownercontact"],
  description: "ᴇɴᴠɪᴀ ᴏ ᴄᴏɴᴛᴀᴛᴏ ᴅᴏ ᴅᴏɴᴏ ᴅᴏ ʙᴏᴛ",

  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";

    try {
      const nome = config.ownerName || "LukaModzz";
      const numero = String(config.ownerNumber || "556384673123").replace(/\D/g, "");
      const org = config.botName || "LukaModzz BOT";

      if (!numero) throw new Error("número do dono não configurado");

      const vcard =
        "BEGIN:VCARD\n" +
        "VERSION:3.0\n" +
        `FN:${String(nome).replace(/[\r\n]+/g, " ")}\n` +
        `ORG:${String(org).replace(/[\r\n]+/g, " ")};\n` +
        `TEL;type=CELL;type=VOICE;waid=${numero}:+${numero}\n` +
        "END:VCARD";

      await conn.sendMessage(from, {
        contacts: {
          displayName: nome,
          contacts: [{ vcard }]
        }
      }, { quoted: createStatusQuoted(msg) });
    } catch (error) {
      console.error("tc:", error);
      await conn.sendMessage(from, {
        text: `❌ ᴇʀʀᴏ ᴀᴏ ᴇɴᴠɪᴀʀ ᴄᴏɴᴛᴀᴛᴏ. ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ ᴄᴏᴍ ${prefix}tc.`
      }, { quoted: createStatusQuoted(msg) }).catch(() => {});
    }
  }
};


Object.assign(module.exports, {
  "menuCategory": "Utilidades",
  "menuSection": "Ajuda",
  "description": "envia o contato do dono do bot"
});
