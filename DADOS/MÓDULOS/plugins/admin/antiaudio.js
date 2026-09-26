// Menu: Grupos - Proteção | Comando: antiaudio
// commands/admins/antiaudio.js
const config = require("../../../config/config");
const antiManager = require("../../functions/antiManager");

module.exports = {
  permissions: { group: true, admin: true },
  name: "antiaudio",
  aliases: ["antiaud"],
  description: "ᴀᴛɪᴠᴀ/ᴅᴇsᴀᴛɪᴠᴀ ᴀɴᴛɪᴀᴜᴅɪᴏ ɴᴏ ɢʀᴜᴘᴏ",
  async execute(conn, msg, args, from, axiosInstance, cmdUsado) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerLid = config.ownerLid || "";
      const prefix = config.prefix || ".";

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

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

      const sender = msg.key.participant || msg.key.remoteJid || from;
      const numeroUsuario = sender.replace(/[^0-9]/g, "");
      const isOwner = sender === ownerLid || numeroUsuario === ownerLid.replace(/[^0-9]/g, "");

      let isAdmin = false;
      if (!isOwner) {
        try {
          const groupMetadata = await conn.groupMetadata(from);
          isAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);
        } catch (e) {}
      }

      if (!isOwner && !isAdmin) {
        return await conn.sendMessage(from, {
          text: "❌ ᴀᴘᴇɴᴀs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴇ ᴏ ᴅᴏɴᴏ ᴘᴏᴅᴇᴍ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!",
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

      const cmd = cmdUsado || module.exports.name;
      const configData = antiManager.loadConfig("audio", true);
      const status = configData[from] === true;

      if (!args[0]) {
        return await conn.sendMessage(from, {
          text: `🎵 *ᴀɴᴛɪᴀᴜᴅɪᴏ*\n\n📊 *sᴛᴀᴛᴜs:* ${status ? "✅ ᴀᴛɪᴠᴏ" : "❌ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ"}\n\n📌 ᴘᴀʀᴀ ᴀʟᴛᴇʀᴀʀ:\n${prefix}${cmd} on/off`,
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
        configData[from] = true;
        antiManager.saveConfig("audio", configData);
        await conn.sendMessage(from, {
          text: `✅ *ᴀɴᴛɪᴀᴜᴅɪᴏ ᴀᴛɪᴠᴀᴅᴏ!*\n\n📌 áᴜᴅɪᴏs sᴇʀᴀ̃ᴏ ʀᴇᴍᴏᴠɪᴅᴏs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀᴍᴇɴᴛᴇ.`,
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
      } else if (acao === "off" || acao === "0" || acao === "desativar") {
        configData[from] = false;
        antiManager.saveConfig("audio", configData);
        await conn.sendMessage(from, {
          text: `❌ *ᴀɴᴛɪᴀᴜᴅɪᴏ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*\n\n📌 áᴜᴅɪᴏs ɴᴀ̃ᴏ sᴇʀᴀ̃ᴏ ᴍᴀɪs ʀᴇᴍᴏᴠɪᴅᴏs.`,
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
      } else {
        return await conn.sendMessage(from, {
          text: `❌ ᴏᴘᴄ̧ᴀ̃ᴏ ɪɴᴠᴀ́ʟɪᴅᴀ!\n\n📌 ᴜsᴇ: ${prefix}${cmd} on ou ${prefix}${cmd} off`,
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

    } catch (error) {
      console.error("❌ Erro antiaudio:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ!*\n\n📌 ${error.message}`,
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
  }
};

Object.assign(module.exports, {
  "menuCategory": "Grupos",
  "menuSection": "Proteção",
  "usage": "antiaudio on|off",
  "description": "Uso: .antiaudio on|off"
});
