// Menu: Dono - Grupos | Comando: sair
// commands/sair.js
const config = require("../../config/config");

module.exports = {
  permissions: { owner: true },
  name: "sair",
  description: "𝑭𝒂𝒛 𝒐 𝒃𝒐𝒕 𝒔𝒂𝒊𝒓 𝒅𝒆 𝒖𝒎 𝒈𝒓𝒖𝒑𝒐 (𝑫𝒐𝒏𝒐)",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";

      const senderJid = msg.key.participant || msg.key.remoteJid;
      const donoLid = config.ownerLid || `${config.ownerNumber}@s.whatsapp.net`;

      if (senderJid !== donoLid && !senderJid.includes(config.ownerNumber)) {
        await conn.sendMessage(from, {
          text: "❌ *ᴀᴘᴇɴᴀs ᴏ ᴅᴏɴᴏ ᴘᴏᴅᴇ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!*"
        }, { quoted: msg });
        return;
      }

      if (!args[0]) {
        await conn.sendMessage(from, {
          text: `❌ *ғᴏʀɴᴇçᴀ ᴏ ʟɪᴅ ᴅᴏ ɢʀᴜᴘᴏ!*\n\n📌 *ᴇxᴇᴍᴘʟᴏ:* ${prefix}sair 55123456789`
        }, { quoted: msg });
        return;
      }

      const grupoLid = args[0].replace(/\D/g, '');
      const groupJid = `${grupoLid}@g.us`;

      await conn.sendMessage(from, { text: `⏳ *ᴛᴇɴᴛᴀɴᴅᴏ sᴀɪʀ ᴅᴏ ɢʀᴜᴘᴏ ${grupoLid}...*` }, { quoted: msg });

      try {
        await conn.groupLeave(groupJid);
        await conn.sendMessage(from, {
          text: `✅ *ʙᴏᴛ sᴀɪᴜ ᴅᴏ ɢʀᴜᴘᴏ!*\n\n🆔 ʟɪᴅ: ${grupoLid}`
        }, { quoted: msg });
      } catch (err) {
        await conn.sendMessage(from, {
          text: `❌ *ɴãᴏ ғᴏɪ ᴘᴏssíᴠᴇʟ sᴀɪʀ!*\n\nᴠᴇʀɪғɪǫᴜᴇ sᴇ ᴏ ʟɪᴅ ᴇsᴛá ᴄᴏʀʀᴇᴛᴏ.`
        }, { quoted: msg });
      }

    } catch (error) {
      console.error("Erro no sair:", error);
      await conn.sendMessage(from, { text: "❌ *ᴇʀʀᴏ ᴀᴏ sᴀɪʀ ᴅᴏ ɢʀᴜᴘᴏ!*" });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Dono",
  "menuSection": "Grupos",
  "usage": "sair [id do grupo]",
  "description": "Uso: .sair [id do grupo]"
});
