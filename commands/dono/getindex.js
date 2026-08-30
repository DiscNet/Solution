const { createStatusQuoted } = require("../../functions/statusCard");
// commands/dono/getindex.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "getindex",
  aliases: ["getindexjs", "index", "pegarindex"],
  description: "ᴇɴᴠɪᴀ ᴏ ᴀʀǫᴜɪᴠᴏ ɪɴᴅᴇx.ᴊs ᴘᴀʀᴀ ᴏ ᴘᴠ ᴅᴏ ᴅᴏɴᴏ",
  async execute(conn, msg, args, from) {
    try {
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerLid = config.ownerLid || "";
      
      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

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

      // 🔥 CAMINHO DO ARQUIVO INDEX.JS
      const indexPath = path.join(__dirname, "..", "..", "index.js");

      // 🔥 VERIFICA SE O ARQUIVO EXISTE
      if (!fs.existsSync(indexPath)) {
        return await conn.sendMessage(from, {
          text: "❌ ᴀʀǫᴜɪᴠᴏ index.js ɴᴀ̃ᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ!",
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

      // 🔥 LÊ O ARQUIVO
      const fileContent = fs.readFileSync(indexPath, "utf8");
      const fileSize = (fs.statSync(indexPath).size / 1024).toFixed(2); // Tamanho em KB

      // 🔥 PEGA O JID DO DONO
      const donoJid = ownerLid;

      // 🔥 ENVIA O ARQUIVO PARA O PV DO DONO
      await conn.sendMessage(donoJid, {
        document: fs.readFileSync(indexPath),
        mimetype: 'application/javascript',
        fileName: 'index.js',
        caption: `📄 *ɪɴᴅᴇx.ᴊs*

━━━━━━━━━━━━━━━━━━━━
📌 *ᴀʀǫᴜɪᴠᴏ:* index.js
📦 *ᴛᴀᴍᴀɴʜᴏ:* ${fileSize} KB
📊 *ʟɪɴʜᴀs:* ${fileContent.split('\n').length}
📅 *ᴜʟᴛɪᴍᴀ ᴍᴏᴅɪғɪᴄᴀᴄ̧ᴀ̃ᴏ:* ${new Date(fs.statSync(indexPath).mtime).toLocaleString('pt-BR')}

━━━━━━━━━━━━━━━━━━━━
📌 ᴀʀǫᴜɪᴠᴏ ᴇɴᴠɪᴀᴅᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ!`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: `${bot}`,
            serverMessageId: 116
          }
        }
      });

      // 🔥 CONFIRMA O ENVIO NO GRUPO/CHAT
      await conn.sendMessage(from, {
        text: `✅ *ɪɴᴅᴇx.ᴊs ᴇɴᴠɪᴀᴅᴏ ᴘᴀʀᴀ sᴇᴜ ᴘᴠ!*\n\n📌 ᴠᴇʀɪғɪǫᴜᴇ sᴜᴀ ᴄᴀɪxᴀ ᴅᴇ ᴇɴᴛʀᴀᴅᴀ.`,
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
      console.error("❌ Erro getindex:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴇɴᴠɪᴀʀ ᴀʀǫᴜɪᴠᴏ!*\n\n📌 ${error.message}`,
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