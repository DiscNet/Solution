const { createStatusQuoted } = require("../../functions/statusCard");
// commands/admins/ban.js
const config = require("../../config/config");

module.exports = {
  permissions: { group: true, admin: true, botAdmin: true },
  name: "ban",
  description: "𝑬𝒙𝒑𝒖𝒍𝒔𝒂 𝒖𝒎 𝒎𝒆𝒎𝒃𝒓𝒐 𝒅𝒐 𝒈𝒓𝒖𝒑𝒐",
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

      let targetJid = null;

      if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        targetJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
      }
      else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetJid = msg.message.extendedTextMessage.contextInfo.participant;
      }
      else if (args[0]) {
        const numero = args[0].replace(/\D/g, '');
        targetJid = `${numero}@s.whatsapp.net`;
      }

      if (!targetJid) {
        return await conn.sendMessage(from, {
          text: `❌ *ᴍᴇɴᴄɪᴏɴᴇ ᴏᴜ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴍᴇɴsᴀɢᴇᴍ ᴅᴇ ǫᴜᴇᴍ ᴅᴇsᴇᴊᴀ ᴇxᴘᴜʟsᴀʀ!*\n\n📌 *ᴇxᴇᴍᴘʟᴏs:*\n${prefix}ban @usuario\n${prefix}ban 5511999999999`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      const targetNumber = targetJid.split('@')[0];
      const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';

      if (targetJid === botJid) {
        return await conn.sendMessage(from, {
          text: "❌ *ɴᴀ̃ᴏ ᴇ́ ᴘᴏssɪ́ᴠᴇʟ ᴇxᴘᴜʟsᴀʀ ᴏ ʙᴏᴛ!*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      try {
        await conn.groupParticipantsUpdate(from, [targetJid], "remove");
        await conn.sendMessage(from, {
          text: `✅ *ᴜsᴜᴀ́ʀɪᴏ ᴇxᴘᴜʟsᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ!*\n\n👤 @${targetNumber} ғᴏɪ ʀᴇᴍᴏᴠɪᴅᴏ ᴅᴏ ɢʀᴜᴘᴏ.`,
          mentions: [targetJid],
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      } catch (err) {
        await conn.sendMessage(from, {
          text: "❌ *ғᴀʟʜᴀ ᴀᴏ ᴇxᴘᴜʟsᴀʀ!*\n\nᴠᴇʀɪғɪǫᴜᴇ sᴇ ᴏ ʙᴏᴛ ᴇ́ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴅᴏ ɢʀᴜᴘᴏ.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

    } catch (error) {
      console.error("ᴇʀʀᴏ ʙᴀɴ:", error);
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴇxᴘᴜʟsᴀʀ ᴍᴇᴍʙʀᴏ!* ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ.",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};