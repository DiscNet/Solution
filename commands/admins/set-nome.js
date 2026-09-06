// commands/set-nome.js
const config = require("../../config/config");

module.exports = {
  permissions: { group: true, admin: true, botAdmin: true },
  name: "set-nome",
  description: "𝑨𝒍𝒕𝒆𝒓𝒂 𝒐 𝒏𝒐𝒎𝒆 𝒅𝒐 𝒈𝒓𝒖𝒑𝒐",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";

      // Verificar se é grupo
      if (!from.endsWith("@g.us")) {
        await conn.sendMessage(from, {
          text: "❌ *ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ só ᴘᴏᴅᴇ sᴇʀ ᴜsᴀᴅᴏ ᴇᴍ ɢʀᴜᴘᴏs!*"
        }, { quoted: msg });
        return;
      }

      // Verificar se quem usou é admin
      const groupMetadata = await conn.groupMetadata(from);
      const sender = msg.key.participant || msg.key.remoteJid;
      const isAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);

      if (!isAdmin) {
        await conn.sendMessage(from, {
          text: "❌ *ᴀᴘᴇɴᴀs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴘᴏᴅᴇᴍ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!*"
        }, { quoted: msg });
        return;
      }

      if (!args[0]) {
        await conn.sendMessage(from, {
          text: `❌ *ғᴏʀɴᴇçᴀ ᴜᴍ ɴᴏᴠᴏ ɴᴏᴍᴇ!*\n\n📌 *ᴇxᴇᴍᴘʟᴏ:* ${prefix}set-nome novo nome do grupo`
        }, { quoted: msg });
        return;
      }

      const novoNome = args.join(" ");

      await conn.sendMessage(from, { text: "⏳ *ᴀʟᴛᴇʀᴀɴᴅᴏ ɴᴏᴍᴇ...*" }, { quoted: msg });

      try {
        await conn.groupUpdateSubject(from, novoNome);
        await conn.sendMessage(from, {
          text: `✅ *ɴᴏᴍᴇ ᴀʟᴛᴇʀᴀᴅᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ!*\n\n📛 *ɴᴏᴠᴏ ɴᴏᴍᴇ:* ${novoNome}`
        }, { quoted: msg });
      } catch (err) {
        await conn.sendMessage(from, {
          text: "❌ *ғᴀʟʜᴀ ᴀᴏ ᴀʟᴛᴇʀᴀʀ ɴᴏᴍᴇ!*\n\nᴠᴇʀɪғɪǫᴜᴇ sᴇ ᴏ ʙᴏᴛ é ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴅᴏ ɢʀᴜᴘᴏ."
        }, { quoted: msg });
      }

    } catch (error) {
      console.error("Erro no set-nome:", error);
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴀʟᴛᴇʀᴀʀ ɴᴏᴍᴇ!*"
      }, { quoted: msg });
    }
  }
};