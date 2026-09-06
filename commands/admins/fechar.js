const { createStatusQuoted } = require("../../functions/statusCard");
// commands/admins/fechar.js
const config = require("../../config/config");

module.exports = {
  permissions: { group: true, admin: true, botAdmin: true },
  name: "fechar",
  description: "𝑨𝒑𝒆𝒏𝒂𝒔 𝒂𝒅𝒎𝒊𝒏𝒊𝒔𝒕𝒓𝒂𝒅𝒐𝒓𝒆𝒔 𝒑𝒐𝒅𝒆𝒎 𝒆𝒏𝒗𝒊𝒂𝒓 𝒎𝒆𝒏𝒔𝒂𝒈𝒆𝒏𝒔",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      if (!from.endsWith("@g.us")) {
        return await conn.sendMessage(from, {
          text: "❌ *ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ sᴏ́ ᴘᴏᴅᴇ sᴇʀ ᴜsᴀᴅᴏ ᴇᴍ ɢʀᴜᴘᴏs!*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      const groupMetadata = await conn.groupMetadata(from);
      const sender = msg.key.participant || msg.key.remoteJid;
      const isAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);

      if (!isAdmin) {
        return await conn.sendMessage(from, {
          text: "❌ *ᴀᴘᴇɴᴀs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴘᴏᴅᴇᴍ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      try {
        await conn.groupSettingUpdate(from, "announcement");
        await conn.sendMessage(from, {
          text: `✅ *ɢʀᴜᴘᴏ ғᴇᴄʜᴀᴅᴏ!*\n\n🔒 ᴀɢᴏʀᴀ ᴀᴘᴇɴᴀs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴘᴏᴅᴇᴍ ᴇɴᴠɪᴀʀ ᴍᴇɴsᴀɢᴇɴs.\n\n📌 *ᴜsᴇ ${prefix}abrir para permitir que todos enviem.*`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      } catch (err) {
        await conn.sendMessage(from, {
          text: "❌ *ғᴀʟʜᴀ ᴀᴏ ғᴇᴄʜᴀʀ ᴏ ɢʀᴜᴘᴏ!*\n\nᴠᴇʀɪғɪǫᴜᴇ sᴇ ᴏ ʙᴏᴛ ᴇ́ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴅᴏ ɢʀᴜᴘᴏ.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

    } catch (error) {
      console.error("ᴇʀʀᴏ ғᴇᴄʜᴀʀ:", error);
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴇxᴇᴄᴜᴛᴀʀ ᴄᴏᴍᴀɴᴅᴏ!* ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ.",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};