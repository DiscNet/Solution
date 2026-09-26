// Menu: Dono - Comandos | Comando: reload
// commands/dono/reload.js
const configLoader = require("../../functions/configLoader");

module.exports = {
  permissions: { owner: true },
  name: "reload",
  aliases: ["recarregar", "rconfig", "reloadconfig"],
  description: "ʀᴇᴄᴀʀʀᴇɢᴀ ᴀs ᴄᴏɴғɪɢᴜʀᴀᴄ̧ᴏ̃ᴇs ᴅᴏ ʙᴏᴛ (ᴀᴘᴇɴᴀs ᴅᴏɴᴏ)",
  async execute(conn, msg, args, from) {
    try {
      const config = configLoader.carregarConfig();
      const ownerLid = config.ownerLid || "";
      const sender = msg.key.participant || msg.key.remoteJid || from;
      const isOwner = sender === ownerLid || sender.replace(/[^0-9]/g, "") === ownerLid.replace(/[^0-9]/g, "");

      if (!isOwner) {
        return await conn.sendMessage(from, {
          text: "❌ ᴀᴘᴇɴᴀs ᴏ ᴅᴏɴᴏ ᴘᴏᴅᴇ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${config.botName || 'LukaModzz'}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      const novoConfig = configLoader.recarregarConfig();

      await conn.sendMessage(from, {
        text: `✅ *ᴄᴏɴғɪɢ ᴜᴘᴅᴀᴛᴇᴅ!*

📌 *ᴘʀᴇғɪxᴏ:* ${novoConfig.prefix}
📌 *ᴍᴏᴅᴏ:* ${novoConfig.modoComando}
📌 *ʀᴇᴄᴀʀʀᴇɢᴀʀ ᴀᴜᴛᴏ:* ${novoConfig.recarregarConfig !== false ? '✅ Ativo' : '❌ Desativado'}

🔄 ᴄᴏɴғɪɢᴜʀᴀᴄ̧ᴏ̃ᴇs ᴀᴛᴜᴀʟɪᴢᴀᴅᴀs ᴄᴏᴍ sᴜᴄᴇssᴏ!`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${config.botName || 'LukaModzz'}`, serverMessageId: 116 } }
      }, { quoted: msg });

    } catch (error) {
      console.error("❌ Erro reload:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ʀᴇᴄᴀʀʀᴇɢᴀʀ ᴄᴏɴғɪɢ!*\n\n📌 ${error.message}`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${config.botName || 'LukaModzz'}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "description": "recarrega as configurações do bot"
});
