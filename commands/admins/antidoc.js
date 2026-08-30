// commands/admins/antidoc.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");

const ANTIDOC_CONFIG_PATH = path.join(__dirname, "..", "..", "config", "antidoc.json");

function loadConfig() {
  try {
    if (fs.existsSync(ANTIDOC_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(ANTIDOC_CONFIG_PATH, "utf8"));
    }
  } catch (e) {}
  return {};
}

function saveConfig(data) {
  const dir = path.join(__dirname, "..", "..", "config");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ANTIDOC_CONFIG_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  name: "antidoc",
  aliases: ["antidocumento"],
  description: "ᴀᴛɪᴠᴀ/ᴅᴇsᴀᴛɪᴠᴀ ᴀɴᴛɪᴅᴏᴄ ɴᴏ ɢʀᴜᴘᴏ",
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
      const configData = loadConfig();
      const status = configData[from] === true;

      if (!args[0]) {
        return await conn.sendMessage(from, {
          text: `📄 *ᴀɴᴛɪᴅᴏᴄ*\n\n📊 *sᴛᴀᴛᴜs:* ${status ? "✅ ᴀᴛɪᴠᴏ" : "❌ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ"}\n\n📌 ᴘᴀʀᴀ ᴀʟᴛᴇʀᴀʀ:\n${prefix}${cmd} on/off`,
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
        saveConfig(configData);
        await conn.sendMessage(from, {
          text: `✅ *ᴀɴᴛɪᴅᴏᴄ ᴀᴛɪᴠᴀᴅᴏ!*\n\n📌 ᴅᴏᴄᴜᴍᴇɴᴛᴏs sᴇʀᴀ̃ᴏ ʀᴇᴍᴏᴠɪᴅᴏs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀᴍᴇɴᴛᴇ.`,
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
        saveConfig(configData);
        await conn.sendMessage(from, {
          text: `❌ *ᴀɴᴛɪᴅᴏᴄ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*\n\n📌 ᴅᴏᴄᴜᴍᴇɴᴛᴏs ɴᴀ̃ᴏ sᴇʀᴀ̃ᴏ ᴍᴀɪs ʀᴇᴍᴏᴠɪᴅᴏs.`,
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
          text: `❌ ᴏᴘᴄ̧ᴀ̃ᴏ ɪɴᴠᴀ́ʟɪᴅᴀ!\n\n📌 ᴜsᴇ: ${prefix}${cmd} on ᴏᴜ ${prefix}${cmd} off`,
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
      console.error("❌ Erro antidoc:", error);
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