const { createStatusQuoted } = require("../../functions/statusCard");
// commands/admins/bemvindo.js
const config = require("../../config/config");
const { sendInteractiveMessage } = require("gifted-btns");
const bemvindoFunctions = require("../../functions/bemvindo");

module.exports = {
  permissions: { group: true, admin: true },
  name: "bemvindo",
  aliases: ["bemvindo", "boasvindas", "welcome"],
  description: "ᴀᴛɪᴠᴀ/ᴅᴇsᴀᴛɪᴠᴀ ᴍᴇɴsᴀɢᴇɴs ᴅᴇ ʙᴏᴀs-ᴠɪɴᴅᴀs ᴇ ᴀᴅᴇᴜs",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";

      // 🔥 PEGA O OWNER DO CONFIG
      const ownerLid = config.ownerLid || "";

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      if (!from.endsWith("@g.us")) {
        return conn.sendMessage(from, {
          text: "❌ ᴀᴘᴇɴᴀs ɢʀᴜᴘᴏs!",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      // 🔥 VERIFICA SE O USUÁRIO É O DONO
      const sender = msg.key.participant || msg.key.remoteJid;
      const isOwner = sender === ownerLid || sender.replace(/[^0-9]/g, "") === ownerLid.replace(/[^0-9]/g, "");

      // 🔥 VERIFICA SE É ADMIN (apenas se não for dono)
      let isAdmin = false;
      if (!isOwner) {
        try {
          const groupMetadata = await conn.groupMetadata(from);
          isAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);
        } catch (e) {
          console.error("Erro ao verificar admin:", e);
        }
      }

      // 🔥 SE NÃO FOR DONO E NÃO FOR ADMIN, BLOQUEIA
      if (!isOwner && !isAdmin) {
        return conn.sendMessage(from, {
          text: "❌ ᴀᴘᴇɴᴀs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴇ ᴏ ᴅᴏɴᴏ ᴘᴏᴅᴇᴍ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      const status = bemvindoFunctions.isBemvindoAtivo(from);

      if (!args[0]) {
        return await sendInteractiveMessage(conn, from, {
          text: `🎉 *sɪsᴛᴇᴍᴀ ᴅᴇ ʙᴏᴀs-ᴠɪɴᴅᴀs*\n\n📊 *sᴛᴀᴛᴜs:* ${status ? "✅ ᴀᴛɪᴠᴀᴅᴏ" : "❌ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ"}\n━━━━━━━━━━━━━━━━━━━━━━`,
          footer: "ᴇsᴄᴏʟʜᴀ ᴜᴍᴀ ᴏᴘᴄ̧ᴀ̃ᴏ:",
          interactiveButtons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "✅ ᴀᴛɪᴠᴀʀ",
                id: `${prefix}bemvindo 1`
              })
            },
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "❌ ᴅᴇsᴀᴛɪᴠᴀʀ",
                id: `${prefix}bemvindo 0`
              })
            }
          ],
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      const opcao = args[0];

      if (opcao === "1") {
        bemvindoFunctions.toggleBemvindo(from, true);
        return conn.sendMessage(from, {
          text: "✅ *sɪsᴛᴇᴍᴀ ᴅᴇ ʙᴏᴀs-ᴠɪɴᴅᴀs ᴀᴛɪᴠᴀᴅᴏ!*\n\n🔧 ᴏ ʙᴏᴛ ᴇɴᴠɪᴀʀᴀ́ ᴍᴇɴsᴀɢᴇɴs ᴅᴇ ʙᴏᴀs-ᴠɪɴᴅᴀs ᴇ ᴅᴇsᴘᴇᴅɪᴅᴀ.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      if (opcao === "0") {
        bemvindoFunctions.toggleBemvindo(from, false);
        return conn.sendMessage(from, {
          text: "❌ *sɪsᴛᴇᴍᴀ ᴅᴇ ʙᴏᴀs-ᴠɪɴᴅᴀs ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      return conn.sendMessage(from, {
        text: `❌ *ᴏᴘᴄ̧ᴀ̃ᴏ ɪɴᴠᴀ́ʟɪᴅᴀ!*\n\n📌 ᴜsᴇ: .bemvindo 1 (ᴀᴛɪᴠᴀʀ) ᴏᴜ .bemvindo 0 (ᴅᴇsᴀᴛɪᴠᴀʀ)`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });

    } catch (e) {
      console.error("ᴇʀʀᴏ ʙᴇᴍᴠɪɴᴅᴏ:", e);
      return conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴏɴғɪɢᴜʀᴀʀ ʙᴏᴀs-ᴠɪɴᴅᴀs!*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};