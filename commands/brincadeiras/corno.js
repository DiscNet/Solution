// commands/brincadeiras/corno.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "corno",
  aliases: ["cornos"],
  description: "ᴍᴏsᴛʀᴀ ᴀ ᴘᴏʀᴄᴇɴᴛᴀɢᴇᴍ ᴄᴏʀɴᴏ ᴅᴏ ᴜsᴜᴀ́ʀɪᴏ",
  async execute(conn, msg, args, from, axiosInstance, cmdUsado) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const prefix = config.prefix || ".";

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      const cmd = cmdUsado || module.exports.name;
      const sender = msg.key.participant || msg.key.remoteJid || from;
      const numeroUsuario = sender.replace(/[^0-9]/g, "");

      // 🔥 VERIFICA SE TEM MENÇÃO
      let targetJid = null;
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      
      if (ctx?.mentionedJid && ctx.mentionedJid.length > 0) {
        targetJid = ctx.mentionedJid[0];
      }

      if (!targetJid) {
        targetJid = sender;
      }

      const percentual = Math.floor(Math.random() * 101);

      const imgPath = path.join(__dirname, "..", "..", "imagens", "corno.jpg");

      if (!fs.existsSync(imgPath)) {
        return await conn.sendMessage(from, {
          text: `❌ ɪᴍᴀɢᴇᴍ ɴᴀ̃ᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴀ!`,
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

      const caption = `🐂 @${targetJid.split('@')[0]} é ${percentual}% corno!`;

      await conn.sendMessage(from, {
        image: fs.readFileSync(imgPath),
        caption: caption,
        mentions: [targetJid],
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

      await conn.sendMessage(from, { react: { text: "🐂", key: msg.key } });

    } catch (error) {
      console.error("❌ Erro corno:", error);
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