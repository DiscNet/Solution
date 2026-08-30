const { createStatusQuoted } = require("../../functions/statusCard");
// commands/tl.js
const config = require("../../config/config");
const { generateWAMessageFromContent, prepareWAMessageMedia } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "tl",
  description: "Carousel Horizontal Scroll",

  async execute(conn, msg, args, from) {
    try {
      const owner = config.ownerName || "LukaModzz";
      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      const imgPath = path.join(__dirname, "..", "..", "imagens", "bot.jpg");
      
      if (!fs.existsSync(imgPath)) {
        return conn.sendMessage(from, {
          text: "❌ Imagem bot.jpg não encontrada em /imagens"
        }, { quoted: msg });
      }

      const imageBuffer = fs.readFileSync(imgPath);

      const media = await prepareWAMessageMedia(
        { image: imageBuffer },
        { upload: conn.waUploadToServer }
      );

      // 🔥 HSCROLL - Scroll horizontal
      const cards = [
        {
          header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
          body: { text: "Card 1 - Deslize →" },
          footer: { text: "LukaModzz" },
          nativeFlowMessage: {
            buttons: [
              { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Opção 1", id: "op1" }) }
            ]
          }
        },
        {
          header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
          body: { text: "Card 2 - Deslize →" },
          footer: { text: "LukaModzz" },
          nativeFlowMessage: {
            buttons: [
              { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Opção 2", id: "op2" }) }
            ]
          }
        },
        {
          header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
          body: { text: "Card 3" },
          footer: { text: "LukaModzz" },
          nativeFlowMessage: {
            buttons: [
              { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Opção 3", id: "op3" }) }
            ]
          }
        }
      ];

      const msgContent = generateWAMessageFromContent(from, {
        interactiveMessage: {
          carouselMessage: {
            cards: cards,
            messageVersion: 1,
            carouselCardType: 1  // HSCROLL_CARDS
          }
        }
      }, {
        quoted: createStatusQuoted(msg)
      });

      await conn.relayMessage(from, msgContent.message, { messageId: msgContent.key.id });

    } catch (err) {
      console.error("Erro tl:", err);
      await conn.sendMessage(from, {
        text: "❌ Erro: " + err.message,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};