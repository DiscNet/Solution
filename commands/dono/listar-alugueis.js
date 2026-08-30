const { createStatusQuoted } = require("../../functions/statusCard");
// commands/dono/listar-alugueis.js
const config = require("../../config/config");
const aluguel = require("../../functions/aluguel");

module.exports = {
  name: "listar-alugueis",
  aliases: ["alugueis", "listaluguel"],
  description: "ʟɪsᴛᴀ ᴛᴏᴅᴏs ᴏs ɢʀᴜᴘᴏs ᴄᴏᴍ ᴀʟᴜɢᴜᴇʟ (ᴀᴘᴇɴᴀs ᴅᴏɴᴏ)",
  async execute(conn, msg, args, from, axiosInstance, cmdUsado) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerLid = config.ownerLid || "";
      const prefix = config.prefix || ".";
      
      const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || "";
      const cmd = texto.split(" ")[0].replace(prefix, "").trim() || module.exports.name;
      
      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      // VERIFICA SE É O DONO
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

      const grupos = aluguel.listarGrupos();
      const ids = Object.keys(grupos);

      if (ids.length === 0) {
        return await conn.sendMessage(from, {
          text: "📋 *ɴᴇɴʜᴜᴍ ɢʀᴜᴘᴏ ᴄᴏᴍ ᴀʟᴜɢᴜᴇʟ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ!*",
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

      let textoLista = `📋 *ʟɪsᴛᴀ ᴅᴇ ᴀʟᴜɢᴜᴇɪs*\n\n📌 *ᴛᴏᴛᴀʟ:* ${ids.length} ɢʀᴜᴘᴏs\n━━━━━━━━━━━━━━━━━━━━\n\n`;

      for (const id of ids) {
        const grupo = grupos[id];
        let nome = id;
        try {
          const metadata = await conn.groupMetadata(id);
          nome = metadata.subject || id;
        } catch (e) {}

        const status = aluguel.isGrupoAtivo(id) ? "✅ ᴀᴛɪᴠᴏ" : "❌ ᴇxᴘɪʀᴀᴅᴏ";
        const plano = grupo.permanente ? "♾️ PERMANENTE" : grupo.plano.toUpperCase();
        
        let dataExp = "N/A";
        if (grupo.dataExpiracao) {
          const d = new Date(grupo.dataExpiracao);
          dataExp = d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR");
        }

        textoLista += `📌 *${nome}*\n🆔 \`${id}\`\n📊 *ᴘʟᴀɴᴏ:* ${plano}\n📅 *ᴇxᴘɪʀᴀ:* ${dataExp}\n📌 *sᴛᴀᴛᴜs:* ${status}\n━━━━━━━━━━━━━━━━━━━━\n\n`;
      }

      await conn.sendMessage(from, {
        text: textoLista,
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
      console.error("❌ Erro listar-alugueis:", error);
      await conn.sendMessage(from, { 
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ʟɪsᴛᴀʀ ᴀʟᴜɢᴜᴇɪs!*\n\n📌 ${error.message}`,
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