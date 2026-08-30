// commands/testecanal.js

module.exports = {
  name: "testecanal",
  description: "Teste de diferentes tipos de encaminhamento de canal",

  async execute(conn, msg, args, from) {
    try {
      const testType = args[0] || "1"; // Permite escolher o tipo de teste
      
      switch(testType) {
        case "1":
          // Teste básico
          await conn.sendMessage(from, {
            text: "📢 *Teste de Canal - Tipo 1*\nEncaminhamento básico",
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363426698503859@newsletter",
                newsletterName: "LukaModzz",
                serverMessageId: 116
              }
            }
          }, { quoted: msg });
          break;

        case "2":
          // Teste com score alto (muitos encaminhamentos)
          await conn.sendMessage(from, {
            text: "📢 *Teste de Canal - Tipo 2*\nEncaminhado muitas vezes",
            contextInfo: {
              forwardingScore: 999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363426698503859@newsletter",
                newsletterName: "LukaModzz",
                serverMessageId: Math.floor(Math.random() * 1000) + 1
              }
            }
          }, { quoted: msg });
          break;

        case "3":
          // Teste com mídia
          await conn.sendMessage(from, {
            image: { url: "https://via.placeholder.com/512x512.png?text=Test" },
            caption: "📢 *Teste de Canal - Tipo 3*\nImagem encaminhada",
            contextInfo: {
              forwardingScore: 500,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363426698503859@newsletter",
                newsletterName: "LukaModzz",
                serverMessageId: 200
              }
            }
          }, { quoted: msg });
          break;

        case "4":
          // Teste com figurinha
          await conn.sendMessage(from, {
            sticker: { url: "https://via.placeholder.com/512x512.webp" },
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363426698503859@newsletter",
                newsletterName: "LukaModzz",
                serverMessageId: 300
              }
            }
          }, { quoted: msg });
          break;

        default:
          await conn.sendMessage(from, {
            text: `📋 *Comandos disponíveis:*
.testecanal 1 - Encaminhamento básico
.testecanal 2 - Muitos encaminhamentos
.testecanal 3 - Imagem encaminhada
.testecanal 4 - Figurinha encaminhada`
          }, { quoted: msg });
      }

    } catch (err) {
      console.error("Erro no testecanal:", err);

      await conn.sendMessage(from, {
        text: "❌ Erro ao enviar teste.\n" + err.message
      }, { quoted: msg });
    }
  }
}