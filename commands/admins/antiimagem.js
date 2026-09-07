// Menu: Grupos - Proteção | Comando: antiimagem
// commands/admins/antiimagem.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");

const ANTIIMAGEM_CONFIG_PATH = path.join(__dirname, "..", "..", "config", "antiimagem.json");

function loadConfig() {
  try {
    if (fs.existsSync(ANTIIMAGEM_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(ANTIIMAGEM_CONFIG_PATH, "utf8"));
    }
  } catch (e) {}
  return {};
}

function saveConfig(data) {
  const dir = path.join(__dirname, "..", "..", "config");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ANTIIMAGEM_CONFIG_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  permissions: { group: true, admin: true },
  name: "antiimagem",
  aliases: ["antiimg", "antifoto"],
  description: "ᴀᴛɪᴠᴀ/ᴅᴇsᴀᴛɪᴠᴀ ᴀɴᴛɪɪᴍᴀɢᴇᴍ ɴᴏ ɢʀᴜᴘᴏ",
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
          text: `🖼️ *ᴀɴᴛɪɪᴍᴀɢᴇᴍ*\n\n📊 *sᴛᴀᴛᴜs:* ${status ? "✅ ᴀᴛɪᴠᴏ" : "❌ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ"}\n\n📌 ᴘᴀʀᴀ ᴀʟᴛᴇʀᴀʀ:\n${prefix}${cmd} on/off`,
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
          text: `✅ *ᴀɴᴛɪɪᴍᴀɢᴇᴍ ᴀᴛɪᴠᴀᴅᴏ!*\n\n📌 ɪᴍᴀɢᴇɴs sᴇʀᴀ̃ᴏ ʀᴇᴍᴏᴠɪᴅᴀs ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀᴍᴇɴᴛᴇ.`,
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
          text: `❌ *ᴀɴᴛɪɪᴍᴀɢᴇᴍ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*\n\n📌 ɪᴍᴀɢᴇɴs ɴᴀ̃ᴏ sᴇʀᴀ̃ᴏ ᴍᴀɪs ʀᴇᴍᴏᴠɪᴅᴀs.`,
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
      console.error("❌ Erro antiimagem:", error);
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
  "usage": "antiimagem on|off",
  "description": "Uso: .antiimagem on|off"
});
