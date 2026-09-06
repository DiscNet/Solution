// commands/teste.js
const config = require("../../config/config");
const { generateWAMessageFromContent } = require("@whiskeysockets/baileys");

module.exports = {
  name: "teste",
  description: "ᴛᴇsᴛᴇ ᴅᴇ ᴍᴇɴsᴀɢᴇᴍ ғᴀɴᴛᴀsᴍᴀ",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "LukaModzz";
      const botName = config.botName || "LukaModzz";

      let pushName = "Usuário";
      try {
        pushName = msg.pushName || "LukaModzz";
      } catch (e) {
        pushName = "LukaModzz";
      }

      // ========== DETALHES DO COMANDO/GATILHO ==========
      const commandName = this.name || "teste";
      const commandDescription = this.description || "Teste de mensagem fantasma";
      const commandArgs = args ? args.join(" ") : "Nenhum argumento";
      const commandTime = new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const messageId = msg.key?.id || "ID indisponível";
      const messageType = msg.message ? Object.keys(msg.message)[0] : "Indisponível";
      const chatId = from || "Indisponível";
      const senderNumber = msg.key?.participant || msg.key?.remoteJid || "Indisponível";
      const isGroup = from ? from.includes("@g.us") : false;

      // ========== EXTRAIR MENSAGEM ORIGINAL ==========
      let originalMessage = "ɴᴇɴʜᴜᴍᴀ";
      try {
        if (msg.message) {
          const msgKeys = Object.keys(msg.message);
          for (const key of msgKeys) {
            if (msg.message[key]?.conversation) {
              originalMessage = msg.message[key].conversation;
              break;
            } else if (msg.message[key]?.caption) {
              originalMessage = msg.message[key].caption;
              break;
            } else if (msg.message[key]?.text) {
              originalMessage = msg.message[key].text;
              break;
            } else if (msg.message[key]?.extendedTextMessage?.text) {
              originalMessage = msg.message[key].extendedTextMessage.text;
              break;
            }
          }
        }
      } catch (e) {
        originalMessage = "Erro ao extrair";
      }

      // ========== MENSAGEM FANTASMA COM ENCAMINHAMENTO ==========
      const m = generateWAMessageFromContent(
        from,
        {
          extendedTextMessage: {
            text: `🧪 *ᴅᴇᴛᴀʟʜᴇs ᴅᴏ ᴄᴏᴍᴀɴᴅᴏ*\n\n` +
                  `━━━━━━━━━━━━━━━━━━\n\n` +
                  `📌 *Comando:* .${commandName}\n` +
                  `📝 *Descrição:* ${commandDescription}\n` +
                  `🔄 *Gatilho:* ${commandArgs}\n` +
                  `👤 *Usuário:* ${pushName}\n` +
                  `📱 *Número:* ${senderNumber}\n` +
                  `🏷️ *Tipo:* ${isGroup ? "👥 Grupo" : "👤 Privado"}\n` +
                  `💬 *Mensagem original:* ${originalMessage.substring(0, 50)}${originalMessage.length > 50 ? "..." : ""}\n` +
                  `📎 *Tipo de mensagem:* ${messageType}\n` +
                  `🆔 *ID da mensagem:* ${messageId}\n` +
                  `🆔 *ID do chat:* ${chatId}\n` +
                  `⏰ *Horário:* ${commandTime}\n` +
                  `━━━━━━━━━━━━━━━━━━\n\n` +
                  `🤖 *Bot:* ${botName}\n` +
                  `👑 *Dono:* ${owner}`,
            contextInfo: {
              // ========== ENCAMINHAMENTO ==========
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363426698503859@newsletter",
                newsletterName: " ̵ ̵̲͞𝑳𝒖𝒌𝒂𝐌𝐨𝐝𝐳𝐳 だ",
                serverMessageId: 116
              },
              // ========== QUOTE FANTASMA ==========
              stanzaId: "FAKE_1234567890",
              participant: "0@s.whatsapp.net",
              quotedMessage: {
                conversation: `𝐁𝐨𝐭: ${botName}`
              }
            }
          }
        },
        {
          userJid: conn.user.id
        }
      );

      await conn.relayMessage(
        from,
        m.message,
        {
          messageId: m.key.id
        }
      );

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("Erro:", error);
      await conn.sendMessage(from, { text: `❌ *ᴇʀʀᴏ:* ${error.message}` });
    }
  }
};