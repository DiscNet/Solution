const { createStatusQuoted } = require("../../functions/statusCard");
// commands/admins/admlist.js
const config = require("../../config/config");

module.exports = {
  name: "admlist",
  description: "𝑳𝒊𝒔𝒕𝒂 𝒕𝒐𝒅𝒐𝒔 𝒐𝒔 𝒂𝒅𝒎𝒊𝒏𝒊𝒔𝒕𝒓𝒂𝒅𝒐𝒓𝒆𝒔 𝒅𝒐 𝒈𝒓𝒖𝒑𝒐",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      
      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      if (!from.endsWith("@g.us")) {
        return conn.sendMessage(from, { 
          text: "❌ ɢʀᴜᴘᴏs ᴀᴘᴇɴᴀs.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      const groupMetadata = await conn.groupMetadata(from);
      const participants = groupMetadata.participants;
      const admins = participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
      const superAdmins = participants.filter(p => p.admin === "superadmin");
      const normalAdmins = participants.filter(p => p.admin === "admin");
      
      if (admins.length === 0) {
        return conn.sendMessage(from, { 
          text: "⚠️ ɴᴇɴʜᴜᴍ ᴀᴅᴍɪɴ.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      let texto = `👑 *ᴀᴅᴍɪɴs · ${admins.length}*\n\n`;
      const mentions = [];

      if (superAdmins.length > 0) {
        for (const a of superAdmins) {
          let nome = a.id.split("@")[0];
          try { const c = await conn.getContact(a.id); nome = c.notifyName || nome; } catch (e) {}
          texto += `✦ @${a.id.split("@")[0]} ᴅᴏɴᴏ\n`;
          mentions.push(a.id);
        }
      }

      if (normalAdmins.length > 0) {
        for (const a of normalAdmins) {
          let nome = a.id.split("@")[0];
          try { const c = await conn.getContact(a.id); nome = c.notifyName || nome; } catch (e) {}
          texto += `• @${a.id.split("@")[0]}\n`;
          mentions.push(a.id);
        }
      }
      
      await conn.sendMessage(from, { 
        text: texto,
        mentions: mentions,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: createStatusQuoted(msg)
      });
      
      await conn.sendMessage(from, { react: { text: "👑", key: msg.key } });

    } catch (error) {
      console.error("ᴀᴅᴍʟɪsᴛ:", error);
      await conn.sendMessage(from, { 
        text: "❌ ᴇʀʀᴏ.",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};