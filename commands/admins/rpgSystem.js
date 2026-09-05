// commands/admins/rpgSystem.js
const config = require("../../config/config");
const rpgSystem = require("../../functions/rpgSystem");

module.exports = {
  name: "rpgSystem",
  aliases: ["sistemarpg", "ativarpg"],
  description: "ᴀᴛɪᴠᴀ/ᴅᴇsᴀᴛɪᴠᴀ ᴏ sɪsᴛᴇᴍᴀ ʀᴘɢ ɴᴏ ɢʀᴜᴘᴏ",
  async execute(conn, msg, args, from) {
    try {
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      
      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      if (!from.endsWith("@g.us")) {
        return await conn.sendMessage(from, {
          text: "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ sᴏ́ ᴘᴏᴅᴇ sᴇʀ ᴜsᴀᴅᴏ ᴇᴍ ɢʀᴜᴘᴏs!",
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      const senderJid = msg.key.participant || msg.key.remoteJid;
      const groupMetadata = await conn.groupMetadata(from);
      const isAdmin = groupMetadata.participants.some(p => p.id === senderJid && p.admin);
      const ownerLid = String(config.ownerLid || "");
      const isOwner = senderJid === ownerLid ||
        (ownerLid && senderJid.replace(/[^0-9]/g, "") === ownerLid.replace(/[^0-9]/g, ""));

      if (!isAdmin && !isOwner) {
        return await conn.sendMessage(from, {
          text: "❌ ᴀᴘᴇɴᴀs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴏᴜ ᴏ ᴅᴏɴᴏ ᴘᴏᴅᴇᴍ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!",
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      const status = rpgSystem.isRpgAtivo(from);

      if (!args[0]) {
        const statusText = status ? "✅ ᴀᴛɪᴠᴏ" : "❌ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ";
        const prefix = config.prefix || ".";
        return await conn.sendMessage(from, {
          text: `⚔️ *sɪsᴛᴇᴍᴀ ʀᴘɢ*\n\n📊 *sᴛᴀᴛᴜs:* ${statusText}\n\n📌 ᴘᴀʀᴀ ᴀᴛɪᴠᴀʀ/ᴅᴇsᴀᴛɪᴠᴀʀ:\n${prefix}rpgSystem on/off`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      const acao = args[0].toLowerCase();

      if (acao === "on" || acao === "1" || acao === "ativar") {
        rpgSystem.ativarRpg(from);
        await conn.sendMessage(from, {
          text: "✅ *sɪsᴛᴇᴍᴀ ʀᴘɢ ᴀᴛɪᴠᴀᴅᴏ!*\n\n⚔️ ᴀɢᴏʀᴀ ᴏs ᴊᴏɢᴀᴅᴏʀᴇs ᴘᴏᴅᴇᴍ ᴜsᴀʀ ᴏs ᴄᴏᴍᴀɴᴅᴏs ᴅᴏ ʀᴘɢ.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      } else if (acao === "off" || acao === "0" || acao === "desativar") {
        rpgSystem.desativarRpg(from);
        await conn.sendMessage(from, {
          text: "❌ *sɪsᴛᴇᴍᴀ ʀᴘɢ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*\n\n⚔️ ᴏs ᴄᴏᴍᴀɴᴅᴏs ᴅᴏ ʀᴘɢ ғᴏʀᴀᴍ ʙʟᴏǫᴜᴇᴀᴅᴏs ɴᴏ ɢʀᴜᴘᴏ.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      } else {
        const prefix = config.prefix || ".";
        return await conn.sendMessage(from, {
          text: `❌ ᴏᴘᴄᴀᴏ ɪɴᴠᴀʟɪᴅᴀ!\n\n📌 ᴜsᴇ: ${prefix}rpgSystem on ᴏᴜ ${prefix}rpgSystem off`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }
    } catch (error) {
      console.error("❌ Erro rpgSystem:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴏɴғɪɢᴜʀᴀʀ ᴏ sɪsᴛᴇᴍᴀ!*\n\n📌 ${error.message}`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${config.botName || "LukaModzz"}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};
