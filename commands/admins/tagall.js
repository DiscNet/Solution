const { createStatusQuoted } = require("../../functions/statusCard");
// commands/tag.js
const config = require("../../config/config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = {
  permissions: { group: true, admin: true },
  name: "tag",
  description: "ᴍᴀʀᴄᴀ ᴛᴏᴅᴏs ᴏs ᴍᴇᴍʙʀᴏs ᴅᴏ ɢʀᴜᴘᴏ",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerLid = config.ownerLid || "";

      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      if (!from.includes('@g.us')) {
        return await conn.sendMessage(from, {
          text: "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ sᴏ́ ᴘᴏᴅᴇ sᴇʀ ᴜsᴀᴅᴏ ᴇᴍ ɢʀᴜᴘᴏs!",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      const groupMetadata = await conn.groupMetadata(from);
      const senderJid = msg.key.participant || msg.key.remoteJid;

      // 🔥 VERIFICA SE É O DONO
      const isOwner = senderJid === ownerLid || senderJid.replace(/[^0-9]/g, "") === ownerLid.replace(/[^0-9]/g, "");

      // 🔥 VERIFICA SE É ADMIN (apenas se não for dono)
      let isAdmin = false;
      if (!isOwner) {
        isAdmin = groupMetadata.participants.find(p => p.id === senderJid)?.admin === 'admin' ||
                  groupMetadata.participants.find(p => p.id === senderJid)?.admin === 'superadmin';
      }

      // 🔥 SE NÃO FOR DONO E NÃO FOR ADMIN, BLOQUEIA
      if (!isOwner && !isAdmin) {
        return await conn.sendMessage(from, {
          text: "❌ ᴀᴘᴇɴᴀs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴇ ᴏ ᴅᴏɴᴏ ᴘᴏᴅᴇᴍ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      const participants = groupMetadata.participants;
      const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
      const members = participants.filter(p => p.id !== botJid);

      if (members.length === 0) {
        return await conn.sendMessage(from, {
          text: "❌ ɴᴇɴʜᴜᴍ ᴍᴇᴍʙʀᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ ɴᴏ ɢʀᴜᴘᴏ!",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      const mentionsList = members.map(m => m.id);
      const textoAdicional = args.length > 0 ? args.join(" ") : "";
      const quotedMessage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      // 🔥 Se está respondendo a uma mensagem, reenvia a mídia/texto
      if (quotedMessage) {
        // Verifica o tipo de mídia
        if (quotedMessage.imageMessage) {
          // Reenvia imagem
          const buffer = await downloadMediaMessage(
            { message: { imageMessage: quotedMessage.imageMessage }, key: msg.key },
            "buffer", {}, {}
          );

          await conn.sendMessage(from, {
            image: buffer,
            caption: textoAdicional || "\u200E",
            mentions: mentionsList,
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
            quoted: createStatusQuoted(msg)
          });

        } else if (quotedMessage.videoMessage) {
          // Reenvia vídeo
          const buffer = await downloadMediaMessage(
            { message: { videoMessage: quotedMessage.videoMessage }, key: msg.key },
            "buffer", {}, {}
          );

          await conn.sendMessage(from, {
            video: buffer,
            caption: textoAdicional || "\u200E",
            mentions: mentionsList,
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
            quoted: createStatusQuoted(msg)
          });

        } else if (quotedMessage.stickerMessage) {
          // Reenvia figurinha
          const buffer = await downloadMediaMessage(
            { message: { stickerMessage: quotedMessage.stickerMessage }, key: msg.key },
            "buffer", {}, {}
          );

          await conn.sendMessage(from, {
            sticker: buffer,
            mentions: mentionsList,
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
            quoted: createStatusQuoted(msg)
          });

        } else if (quotedMessage.audioMessage) {
          // Reenvia áudio
          const buffer = await downloadMediaMessage(
            { message: { audioMessage: quotedMessage.audioMessage }, key: msg.key },
            "buffer", {}, {}
          );

          await conn.sendMessage(from, {
            audio: buffer,
            mimetype: "audio/mpeg",
            mentions: mentionsList,
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
            quoted: createStatusQuoted(msg)
          });

        } else if (quotedMessage.documentMessage) {
          // Reenvia documento
          const buffer = await downloadMediaMessage(
            { message: { documentMessage: quotedMessage.documentMessage }, key: msg.key },
            "buffer", {}, {}
          );

          await conn.sendMessage(from, {
            document: buffer,
            mimetype: quotedMessage.documentMessage.mimetype || "application/pdf",
            fileName: quotedMessage.documentMessage.fileName || "documento",
            mentions: mentionsList,
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
            quoted: createStatusQuoted(msg)
          });

        } else {
          // Mensagem de texto
          const quotedText = quotedMessage.conversation ||
                            quotedMessage.extendedTextMessage?.text || "";

          await conn.sendMessage(from, {
            text: quotedText || "\u200E",
            mentions: mentionsList,
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
            quoted: createStatusQuoted(msg)
          });
        }

      } else {
        // 🔥 Sem resposta: envia só texto com menção invisível
        await conn.sendMessage(from, {
          text: textoAdicional || "\u200E",
          mentions: mentionsList,
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
          quoted: createStatusQuoted(msg)
        });
      }

    } catch (error) {
      console.error("Erro no comando tag:", error);
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴍᴀʀᴄᴀʀ ᴍᴇᴍʙʀᴏs!* ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ.",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};