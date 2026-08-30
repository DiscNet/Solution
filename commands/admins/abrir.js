const { createStatusQuoted } = require("../../functions/statusCard");
// commands/admins/abrir.js
const config = require("../../config/config");

module.exports = {
  name: "abrir",
  description: "𝑻𝒐𝒅𝒐𝒔 𝒐𝒔 𝒎𝒆𝒎𝒃𝒓𝒐𝒔 𝒑𝒐𝒅𝒆𝒎 𝒆𝒏𝒗𝒊𝒂𝒓 𝒎𝒆𝒏𝒔𝒂𝒈𝒆𝒏𝒔",
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
        await conn.groupSettingUpdate(from, "not_announcement");
        await conn.sendMessage(from, { 
          text: `✅ *ɢʀᴜᴘᴏ ᴀʙᴇʀᴛᴏ!*\n\n🔓 ᴀɢᴏʀᴀ ᴛᴏᴅᴏs ᴏs ᴍᴇᴍʙʀᴏs ᴘᴏᴅᴇᴍ ᴇɴᴠɪᴀʀ ᴍᴇɴsᴀɢᴇɴs.\n\n📌 *ᴜsᴇ ${prefix}fechar ᴘᴀʀᴀ ʀᴇsᴛʀɪɴɢɪʀ ᴀᴘᴇɴᴀs ᴘᴀʀᴀ ᴀᴅᴍɪɴs.*`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      } catch (err) {
        await conn.sendMessage(from, { 
          text: "❌ *ғᴀʟʜᴀ ᴀᴏ ᴀʙʀɪʀ ᴏ ɢʀᴜᴘᴏ!*\n\nᴠᴇʀɪғɪǫᴜᴇ sᴇ ᴏ ʙᴏᴛ ᴇ́ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴅᴏ ɢʀᴜᴘᴏ.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

    } catch (error) {
      console.error("ᴇʀʀᴏ ᴀʙʀɪʀ:", error);
      await conn.sendMessage(from, { 
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴇxᴇᴄᴜᴛᴀʀ ᴄᴏᴍᴀɴᴅᴏ!* ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ.",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};