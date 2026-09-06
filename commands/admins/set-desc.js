// commands/set-desc.js
const config = require("../../config/config");

module.exports = {
  permissions: { group: true, admin: true, botAdmin: true },
  name: "set-desc",
  description: "𝑨𝒍𝒕𝒆𝒓𝒂 𝒂 𝒅𝒆𝒔𝒄𝒓𝒊𝒄̧𝒂̃𝒐 𝒅𝒐 𝒈𝒓𝒖𝒑𝒐",
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
          text: `❌ *ғᴏʀɴᴇçᴀ ᴜᴍᴀ ɴᴏᴠᴀ ᴅᴇsᴄʀɪçãᴏ!*\n\n📌 *ᴇxᴇᴍᴘʟᴏ:* ${prefix}set-desc esta e a nova descricao do grupo`
        }, { quoted: msg });
        return;
      }

      const novaDescricao = args.join(" ");

      await conn.sendMessage(from, { text: "⏳ *ᴀʟᴛᴇʀᴀɴᴅᴏ ᴅᴇsᴄʀɪçãᴏ...*" }, { quoted: msg });

      try {
        await conn.groupUpdateDescription(from, novaDescricao);
        await conn.sendMessage(from, {
          text: `✅ *ᴅᴇsᴄʀɪçãᴏ ᴀʟᴛᴇʀᴀᴅᴀ ᴄᴏᴍ sᴜᴄᴇssᴏ!*\n\n📝 *ɴᴏᴠᴀ ᴅᴇsᴄʀɪçãᴏ:*\n${novaDescricao}`
        }, { quoted: msg });
      } catch (err) {
        await conn.sendMessage(from, {
          text: "❌ *ғᴀʟʜᴀ ᴀᴏ ᴀʟᴛᴇʀᴀʀ ᴅᴇsᴄʀɪçãᴏ!*\n\nᴠᴇʀɪғɪǫᴜᴇ sᴇ ᴏ ʙᴏᴛ é ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴅᴏ ɢʀᴜᴘᴏ."
        }, { quoted: msg });
      }

    } catch (error) {
      console.error("Erro no set-desc:", error);
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴀʟᴛᴇʀᴀʀ ᴅᴇsᴄʀɪçãᴏ!*"
      }, { quoted: msg });
    }
  }
};