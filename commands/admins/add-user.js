const { createStatusQuoted } = require("../../functions/statusCard");
// commands/admins/add.js
const config = require("../../config/config");

module.exports = {
  permissions: { group: true, admin: true, botAdmin: true },
  name: "add",
  description: "𝑨𝒅𝒊𝒄𝒊𝒐𝒏𝒂 𝒖𝒎 𝒖𝒔𝒖𝒂́𝒓𝒊𝒐 𝒂𝒐 𝒈𝒓𝒖𝒑𝒐 𝒑𝒆𝒍𝒐 𝒏𝒖́𝒎𝒆𝒓𝒐",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      if (!from.endsWith("@g.us")) {
        return await conn.sendMessage(from, {
          text: "❌ *ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ sᴏ́ ғᴜɴᴄɪᴏɴᴀ ᴇᴍ ɢʀᴜᴘᴏs!*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      const groupMetadata = await conn.groupMetadata(from);
      const sender = msg.key.participant || msg.key.remoteJid;
      const isAdmin = groupMetadata.participants.some(p => p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin'));

      if (!isAdmin) {
        return await conn.sendMessage(from, {
          text: "❌ *ᴀᴘᴇɴᴀs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴘᴏᴅᴇᴍ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      if (!args[0]) {
        return await conn.sendMessage(from, {
          text: `❌ *ɪɴғᴏʀᴍᴇ ᴏ ɴᴜ́ᴍᴇʀᴏ!*\n\n📌 *ᴇxᴇᴍᴘʟᴏ:* ${prefix}add 5563992003562`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      let numero = args[0].replace(/[^0-9]/g, "");
      const targetJid = numero + "@s.whatsapp.net";

      await conn.sendMessage(from, { react: { text: "➕", key: msg.key } });

      try {
        await conn.groupParticipantsUpdate(from, [targetJid], "add");

        await conn.sendMessage(from, {
          text: `✅ *ᴜsᴜᴀ́ʀɪᴏ ᴀᴅɪᴄɪᴏɴᴀᴅᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ!*\n> @${numero}`,
          mentions: [targetJid],
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });

      } catch (error) {
        console.error("ᴇʀʀᴏ ᴀᴏ ᴀᴅɪᴄɪᴏɴᴀʀ:", error.message);

        let errorMsg = "❌ *ɴᴀ̃ᴏ ғᴏɪ ᴘᴏssɪ́ᴠᴇʟ ᴀᴅɪᴄɪᴏɴᴀʀ!*\n\n";

        if (error.message.includes("not-a-contact")) {
          errorMsg += "⚠️ ᴏ ɴᴜ́ᴍᴇʀᴏ ɴᴀ̃ᴏ ᴇsᴛᴀ́ ɴᴀ ʟɪsᴛᴀ ᴅᴇ ᴄᴏɴᴛᴀᴛᴏs.";
        } else if (error.message.includes("privacy")) {
          errorMsg += "🔒 ᴏ ᴜsᴜᴀ́ʀɪᴏ ᴛᴇᴍ ᴄᴏɴғɪɢᴜʀᴀᴄ̧ᴏ̃ᴇs ᴅᴇ ᴘʀɪᴠᴀᴄɪᴅᴀᴅᴇ ʀᴇsᴛʀɪᴛᴀs.";
        } else if (error.message.includes("overlimit")) {
          errorMsg += "⏳ ʟɪᴍɪᴛᴇ ᴅᴇ ᴀᴅɪᴄ̧ᴏ̃ᴇs ᴇxᴄᴇᴅɪᴅᴏ. ᴀɢᴜᴀʀᴅᴇ ᴜᴍ ᴍᴏᴍᴇɴᴛᴏ.";
        } else {
          errorMsg += "ᴠᴇʀɪғɪǫᴜᴇ sᴇ ᴏ ɴᴜ́ᴍᴇʀᴏ ᴇsᴛᴀ́ ᴄᴏʀʀᴇᴛᴏ ᴇ ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ.";
        }

        await conn.sendMessage(from, {
          text: errorMsg,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

    } catch (error) {
      console.error("ᴇʀʀᴏ ᴀᴅᴅ:", error);
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴘʀᴏᴄᴇssᴀʀ ᴏ ᴄᴏᴍᴀɴᴅᴏ!*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};