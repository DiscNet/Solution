// commands/admins/promover.js
const config = require("../../config/config");
const prefix = config.prefix || ".";

module.exports = {
  name: "promover",
  description: "𝑷𝒓𝒐𝒎𝒐𝒗𝒆 𝒖𝒎 𝒎𝒆𝒎𝒃𝒓𝒐 𝒂 𝒂𝒅𝒎𝒊𝒏𝒊𝒔𝒕𝒓𝒂𝒅𝒐𝒓",
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
          quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
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
          quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
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
          text: `❌ *ᴍᴀʀǫᴜᴇ ᴜᴍ ᴜsᴜᴀ́ʀɪᴏ ᴘᴀʀᴀ ᴘʀᴏᴍᴏᴠᴇʀ.*\n\n📝 *ᴇxᴇᴍᴘʟᴏ:* ${prefix}promover @ᴜsᴜᴀʀɪᴏ`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      await conn.groupParticipantsUpdate(from, [targetUser], "promote");
      
      const targetNumber = targetUser.split("@")[0];
      
      await conn.sendMessage(from, { 
        text: `👑 @${targetNumber} ᴘʀᴏᴍᴏᴠɪᴅᴏ ᴀ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ!`,
        mentions: [targetUser],
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
      });
      
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("ᴇʀʀᴏ ᴘʀᴏᴍᴏᴠᴇʀ:", error);
      
      let errorMsg = "❌ ᴇʀʀᴏ ᴀᴏ ᴘʀᴏᴍᴏᴠᴇʀ ᴜsᴜᴀ́ʀɪᴏ.";
      if (error.message?.includes("admin")) {
        errorMsg = "❌ ᴏ ʙᴏᴛ ᴘʀᴇᴄɪsᴀ sᴇʀ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴅᴏ ɢʀᴜᴘᴏ.";
      }
      
      await conn.sendMessage(from, { 
        text: errorMsg,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};