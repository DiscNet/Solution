// commands/geral/totalcmd.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "totalcmd",
  aliases: ["totalcmds", "cmdcount", "comandos"],
  description: "ᴍᴏsᴛʀᴀ ᴀ Qᴜᴀɴᴛɪᴅᴀᴅᴇ ᴛᴏᴛᴀʟ ᴅᴇ ᴄᴏᴍᴀɴᴅᴏs ᴅᴏ ʙᴏᴛ",
  async execute(conn, msg, args, from) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      
      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      // 🔥 CAMINHO DA PASTA DE COMANDOS
      const commandsPath = path.join(__dirname, "..");

      let totalComandos = 0;

      // 🔥 FUNÇÃO PARA PERCORRER TODAS AS PASTAS RECURSIVAMENTE
      function contarComandos(pasta) {
        const itens = fs.readdirSync(pasta);
        
        for (const item of itens) {
          const caminho = path.join(pasta, item);
          const stats = fs.statSync(caminho);
          
          if (stats.isDirectory()) {
            // Se for pasta, entra dentro dela
            contarComandos(caminho);
          } else if (stats.isFile() && item.endsWith('.js')) {
            // Se for arquivo .js, conta
            totalComandos++;
          }
        }
      }

      // 🔥 INICIA A CONTAGEM A PARTIR DA PASTA COMMANDS
      contarComandos(commandsPath);

      // 🔥 MENSAGEM FORMATADA COM STATUS
      const texto = `📊 *ᴛᴏᴛᴀʟ ᴅᴇ ᴄᴏᴍᴀɴᴅᴏs*

> ᴄᴍᴅ's: ${totalComandos}`;

      await conn.sendMessage(from, {
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
      }, {
        quoted: {
          key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" },
          message: {
            contactMessage: {
              displayName: pushName,
              vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD"
            }
          }
        }
      });

    } catch (error) {
      console.error("❌ Erro totalcmd:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴏɴᴛᴀʀ ᴄᴏᴍᴀɴᴅᴏs!*`,
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