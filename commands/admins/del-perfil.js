// commands/del-perfil.js
const config = require("../../config/config");

module.exports = {
  permissions: { group: true, admin: true, botAdmin: true },
  name: "del-perfil",
  description: "𝑹𝒆𝒎𝒐𝒗𝒆 𝒂 𝒇𝒐𝒕𝒐 𝒅𝒐 𝒈𝒓𝒖𝒑𝒐",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
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

      await conn.sendMessage(from, { text: "⏳ *ʀᴇᴍᴏᴠᴇɴᴅᴏ ғᴏᴛᴏ ᴅᴏ ɢʀᴜᴘᴏ...*" }, { quoted: msg });

      try {
        await conn.removeProfilePicture(from);
        await conn.sendMessage(from, {
          text: `✅ *ғᴏᴛᴏ ᴅᴏ ɢʀᴜᴘᴏ ʀᴇᴍᴏᴠɪᴅᴀ ᴄᴏᴍ sᴜᴄᴇssᴏ!*`
        }, { quoted: msg });
      } catch (err) {
        await conn.sendMessage(from, {
          text: "❌ *ғᴀʟʜᴀ ᴀᴏ ʀᴇᴍᴏᴠᴇʀ ғᴏᴛᴏ!*\n\nᴠᴇʀɪғɪǫᴜᴇ sᴇ ᴏ ʙᴏᴛ é ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴅᴏ ɢʀᴜᴘᴏ."
        }, { quoted: msg });
      }

    } catch (error) {
      console.error("Erro no del-perfil:", error);
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ʀᴇᴍᴏᴠᴇʀ ғᴏᴛᴏ!*"
      }, { quoted: msg });
    }
  }
};