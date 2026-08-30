// commands/admins/unblockcmd.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");

const BLOCKCMD_CONFIG_PATH = path.join(__dirname, "..", "..", "config", "blockcmd.json");

// ==============================================
// FUNÇÃO PARA PEGAR NOME DO GRUPO
// ==============================================
async function getGroupName(conn, groupId) {
  try {
    const groupMetadata = await conn.groupMetadata(groupId);
    return groupMetadata.subject || groupId;
  } catch (error) {
    return groupId;
  }
}

function loadConfig() {
  try {
    if (fs.existsSync(BLOCKCMD_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(BLOCKCMD_CONFIG_PATH, "utf8"));
    }
  } catch (e) {}
  return {};
}

function saveConfig(data) {
  const dir = path.join(__dirname, "..", "..", "config");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(BLOCKCMD_CONFIG_PATH, JSON.stringify(data, null, 2));
}

function isCommandBlocked(groupId, cmdName) {
  const data = loadConfig();
  if (data[groupId] && data[groupId].bloqueados) {
    return data[groupId].bloqueados.includes(cmdName);
  }
  return false;
}

function unblockCommand(groupId, cmdName) {
  const data = loadConfig();
  if (data[groupId] && data[groupId].bloqueados) {
    const index = data[groupId].bloqueados.indexOf(cmdName);
    if (index !== -1) {
      data[groupId].bloqueados.splice(index, 1);
      saveConfig(data);
      return true;
    }
  }
  return false;
}

function getBlockedCommands(groupId) {
  const data = loadConfig();
  if (data[groupId] && data[groupId].bloqueados) {
    return data[groupId].bloqueados;
  }
  return [];
}

module.exports = {
  name: "unblockcmd",
  aliases: ["ublcmd", "desbloquearcmd"],
  description: "ᴅᴇsʙʟᴏǫᴜᴇɪᴀ ᴜᴍ ᴄᴏᴍᴀɴᴅᴏ ɴᴏ ɢʀᴜᴘᴏ",
  async execute(conn, msg, args, from, axiosInstance, cmdUsado) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerLid = config.ownerLid || "";
      const prefix = config.prefix || ".";

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      // VERIFICA SE É GRUPO
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

      // VERIFICA PERMISSÃO
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

      // VERIFICA SE FOI INFORMADO O COMANDO
      if (!args[0]) {
        const blocked = getBlockedCommands(from);
        let texto = `📋 *ᴄᴏᴍᴀɴᴅᴏs ʙʟᴏǫᴜᴇᴀᴅᴏs ɴᴏ ɢʀᴜᴘᴏ*\n\n`;

        if (blocked.length === 0) {
          texto += `📌 ɴᴇɴʜᴜᴍ ᴄᴏᴍᴀɴᴅᴏ ʙʟᴏǫᴜᴇᴀᴅᴏ.`;
        } else {
          for (const b of blocked) {
            texto += `🚫 ${prefix}${b}\n`;
          }
        }

        texto += `\n━━━━━━━━━━━━━━━━━━━━\n📌 ᴘᴀʀᴀ ᴅᴇsʙʟᴏǫᴜᴇᴀʀ: ${prefix}${cmd} <comando>`;

        return await conn.sendMessage(from, {
          text: texto,
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

      const cmdAlvo = args[0].toLowerCase();

      // 🔥 REMOVIDA A VERIFICAÇÃO DE EXISTÊNCIA DO COMANDO

      // VERIFICA SE ESTÁ BLOQUEADO
      if (!isCommandBlocked(from, cmdAlvo)) {
        return await conn.sendMessage(from, {
          text: `ℹ️ ᴏ ᴄᴏᴍᴀɴᴅᴏ *${cmdAlvo}* ɴᴀ̃ᴏ ᴇsᴛᴀ́ ʙʟᴏǫᴜᴇᴀᴅᴏ ɴᴇsᴛᴇ ɢʀᴜᴘᴏ!`,
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

      // DESBLOQUEIA O COMANDO
      unblockCommand(from, cmdAlvo);

      const groupName = await getGroupName(conn, from);

      await conn.sendMessage(from, {
        text: `✅ *ᴄᴏᴍᴀɴᴅᴏ ᴅᴇsʙʟᴏǫᴜᴇᴀᴅᴏ!*\n\n📌 *ᴄᴏᴍᴀɴᴅᴏ:* ${prefix}${cmdAlvo}\n📌 *ɢʀᴜᴘᴏ:* ${groupName}\n\n📌 ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ ᴠᴏʟᴛᴏᴜ ᴀ ғᴜɴᴄɪᴏɴᴀʀ ɴᴏ ɢʀᴜᴘᴏ.`,
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

    } catch (error) {
      console.error("❌ Erro unblockcmd:", error);
      const sender = msg.key.participant || msg.key.remoteJid || from;
      const numeroUsuario = sender.replace(/[^0-9]/g, "");
      
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
      }, {
        quoted: {
          key: {
            remoteJid: "0@s.whatsapp.net",
            fromMe: false,
            participant: `${numeroUsuario}@s.whatsapp.net`
          },
          message: {
            contactMessage: {
              displayName: pushName,
              vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=" + numeroUsuario + ":" + numeroUsuario + "\nEND:VCARD"
            }
          }
        }
      });
    }
  }
};