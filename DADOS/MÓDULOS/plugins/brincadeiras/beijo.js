// Menu: Brincadeiras - Interações | Comando: beijo
// commands/brincadeiras/beijo.js
const config = require("../../../config/config");
const fs = require("fs");
const path = require("path");

// 🔥 NÚMERO DO DESENVOLVEDOR (FALLBACK)
const DEV_NUMBER = "5563984673123";

// 🔥 FUNÇÃO PARA PEGAR O NÚMERO DO USUÁRIO
function getNumeroUsuario(msg) {
  let numero = null;

  if (msg.key?.participantAlt) {
    numero = msg.key.participantAlt.replace(/[^0-9]/g, '');
  }
  if (!numero && msg.key?.participant) {
    numero = msg.key.participant.replace(/[^0-9]/g, '');
  }
  if (!numero && msg.key?.remoteJidAlt) {
    numero = msg.key.remoteJidAlt.replace(/[^0-9]/g, '');
  }
  if (!numero && msg.key?.remoteJid) {
    numero = msg.key.remoteJid.replace(/[^0-9]/g, '');
  }
  if (!numero && msg.sender) {
    numero = msg.sender.replace(/[^0-9]/g, '');
  }
  if (!numero || numero.length < 10) {
    numero = DEV_NUMBER;
  }
  return numero;
}

module.exports = {
  name: "beijo",
  aliases: ["beijar"],
  description: "ᴇɴᴠɪᴀ ᴜᴍ ɢɪғ ᴅᴇ ʙᴇɪᴊᴏ",
  async execute(conn, msg, args, from, axiosInstance, cmdUsado) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const prefix = config.prefix || ".";

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      // 🔥 PEGA O NÚMERO DO USUÁRIO
      const numeroUsuario = getNumeroUsuario(msg);
      console.log(`📱 Número do usuário: ${numeroUsuario}`);

      const sender = msg.key.participant || msg.key.remoteJid || from;

      // 🔥 VERIFICA SE TEM MENÇÃO
      let targetJid = null;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;

      if (ctx?.mentionedJid && ctx.mentionedJid.length > 0) {
        targetJid = ctx.mentionedJid[0];
      }

      if (!targetJid) {
        return await conn.sendMessage(from, {
          text: `❌ ᴍᴀʀǫᴜᴇ ᴀʟɢᴜᴇ́ᴍ ᴘᴀʀᴀ ʙᴇɪᴊᴀʀ!\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}${cmd} @usuario`,
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
              remoteJid: "0@s.whatsapp.net", // 🔥 SEM O 55
              fromMe: false,
              participant: `0@s.whatsapp.net` // 🔥 COM O 55
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

      const videoPath = path.join(__dirname, "..", "..", "..", "imagens", "beijo.mp4");

      if (!fs.existsSync(videoPath)) {
        return await conn.sendMessage(from, {
          text: `❌ ᴀʀǫᴜɪᴠᴏ ᴅᴇ ᴠɪ́ᴅᴇᴏ ɴᴀ̃ᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ!\n\n📌 ${videoPath}`,
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
              participant: `0@s.whatsapp.net`
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

      const videoBuffer = fs.readFileSync(videoPath);

      const caption = `💋 @${sender.split('@')[0]} deu um beijão em @${targetJid.split('@')[0]}!`;

      await conn.sendMessage(from, {
        video: videoBuffer,
        gifPlayback: true,
        caption: caption,
        mentions: [sender, targetJid],
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
            participant: `0@s.whatsapp.net`
          },
          message: {
            contactMessage: {
              displayName: pushName,
              vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=" + numeroUsuario + ":" + numeroUsuario + "\nEND:VCARD"
            }
          }
        }
      });

      await conn.sendMessage(from, { react: { text: "💋", key: msg.key } });

    } catch (error) {
      console.error("❌ Erro beijo:", error);
      const numeroUsuario = getNumeroUsuario(msg);

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
            participant: `0@s.whatsapp.net`
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

Object.assign(module.exports, {
  "menuCategory": "Brincadeiras",
  "menuSection": "Interações",
  "usage": "beijo @usuario",
  "description": "Uso: .beijo @usuario"
});
