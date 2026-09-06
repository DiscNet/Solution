const { createStatusQuoted } = require("../../functions/statusCard");
// commands/pin.js
const config = require("../../config/config");
const { generateWAMessageFromContent, prepareWAMessageMedia } = require("@whiskeysockets/baileys");
const axios = require("axios");

module.exports = {
  name: "pin",
  description: "𝑩𝒖𝒔𝒄𝒂 𝒊𝒎𝒂𝒈𝒆𝒏𝒔 𝒏𝒐 𝑷𝒊𝒏𝒕𝒆𝒓𝒆𝒔𝒕",

  async execute(conn, msg, args, from) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "LukaModzz";
      const API_KEY = config.tokitoApi;

      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      if (!args[0]) {
        return await conn.sendMessage(from, {
          text: `❌ *ᴅɪɢɪᴛᴇ ᴏ ɴᴏᴍᴇ ᴅᴀ ɪᴍᴀɢᴇᴍ!*\n\n🧊 *ᴇxᴇᴍᴘʟᴏ:* ${prefix}pin anime`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      const q = args.join(" ");
      await conn.sendMessage(from, { react: { text: "📷", key: msg.key } });

      // 🔥 Busca 5 imagens da API Tokito
      const cards = [];
      const apiUrl = `https://tokito-apis.com.br/api/pinterest?q=${encodeURIComponent(q)}&mode=landscape&apikey=${API_KEY}`;

      for (let i = 0; i < 5; i++) {
        try {
          const imgRes = await axios.get(apiUrl, { responseType: "arraybuffer", timeout: 15000 });
          const imageBuffer = Buffer.from(imgRes.data);

          const media = await prepareWAMessageMedia(
            { image: imageBuffer },
            { upload: conn.waUploadToServer }
          );

          cards.push({
            header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
            body: { text: `🧊 ${i + 1}/5 - ${q}` },
            footer: { text: "ʟᴜᴋᴀᴍᴏᴅᴢᴢ • ᴘɪɴᴛᴇʀᴇsᴛ" },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: "🔗 ᴘɪɴᴛᴇʀᴇsᴛ",
                    url: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`
                  })
                }
              ]
            }
          });
        } catch (e) {
          console.log(`Erro na imagem ${i + 1}:`, e.message);
        }
      }

      if (cards.length === 0) {
        return await conn.sendMessage(from, {
          text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴀʀʀᴇɢᴀʀ ɪᴍᴀɢᴇɴs!*`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
        }, { quoted: msg });
      }

      const msgContent = generateWAMessageFromContent(from, {
        interactiveMessage: {
          carouselMessage: {
            cards: cards,
            messageVersion: 1,
            carouselCardType: 1
          }
        }
      }, {
        quoted: createStatusQuoted(msg)
      });

      await conn.relayMessage(from, msgContent.message, { messageId: msgContent.key.id });

    } catch (error) {
      console.error("Erro pin:", error);
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ʙᴜsᴄᴀʀ ɪᴍᴀɢᴇɴs!*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};