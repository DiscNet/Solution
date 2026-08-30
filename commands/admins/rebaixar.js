const { createStatusQuoted } = require("../../functions/statusCard");
// commands/admins/rebaixar.js
const config = require("../../config/config");
const prefix = config.prefix || ".";

module.exports = {
  name: "rebaixar",
  description: "𝑹𝒆𝒎𝒐𝒗𝒆 𝒐 𝒄𝒂𝒓𝒈𝒐 𝒅𝒆 𝒂𝒅𝒎𝒊𝒏𝒊𝒔𝒕𝒓𝒂𝒅𝒐𝒓",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      
      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      if (!from.endsWith("@g.us")) {
        return conn.sendMessage(from, { 
          text: "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ sᴏ́ ғᴜɴᴄɪᴏɴᴀ ᴇᴍ ɢʀᴜᴘᴏs.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      const groupMetadata = await conn.groupMetadata(from);
      const sender = msg.key.participant || msg.key.remoteJid;
      const isAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);
      
      if (!isAdmin) {
        return conn.sendMessage(from, { 
          text: "❌ ᴀᴘᴇɴᴀs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴘᴏᴅᴇᴍ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      let targetUser = null;
      
      if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
        targetUser = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
      } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        targetUser = msg.message.extendedTextMessage.contextInfo.participant;
      }
      
      if (!targetUser) {
        return conn.sendMessage(from, { 
          text: `❌ *ᴍᴀʀǫᴜᴇ ᴜᴍ ᴜsᴜᴀ́ʀɪᴏ ᴘᴀʀᴀ ʀᴇʙᴀɪxᴀʀ.*\n\n📝 *ᴇxᴇᴍᴘʟᴏ:* ${prefix}rebaixar @ᴜsᴜᴀʀɪᴏ`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      await conn.groupParticipantsUpdate(from, [targetUser], "demote");
      
      const targetNumber = targetUser.split("@")[0];
      
      await conn.sendMessage(from, { 
        text: `👤 @${targetNumber} ʀᴇʙᴀɪxᴀᴅᴏ ᴀ ᴍᴇᴍʙʀᴏ ᴄᴏᴍᴜᴍ!`,
        mentions: [targetUser],
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: createStatusQuoted(msg)
      });
      
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("ᴇʀʀᴏ ʀᴇʙᴀɪxᴀʀ:", error);
      
      let errorMsg = "❌ ᴇʀʀᴏ ᴀᴏ ʀᴇʙᴀɪxᴀʀ ᴜsᴜᴀ́ʀɪᴏ.";
      if (error.message?.includes("admin")) {
        errorMsg = "❌ ᴏ ʙᴏᴛ ᴘʀᴇᴄɪsᴀ sᴇʀ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴅᴏ ɢʀᴜᴘᴏ.";
      } else if (error.message?.includes("demote")) {
        errorMsg = "⚠️ ɴᴀ̃ᴏ ᴇ́ ᴘᴏssɪ́ᴠᴇʟ ʀᴇʙᴀɪxᴀʀ ᴏ ᴄʀɪᴀᴅᴏʀ ᴅᴏ ɢʀᴜᴘᴏ.";
      }
      
      await conn.sendMessage(from, { 
        text: errorMsg,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};