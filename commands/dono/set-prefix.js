const { createStatusQuoted } = require("../../functions/statusCard");
// commands/dono/set-prefix.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");
const configLoader = require("../../functions/configLoader");

module.exports = {
  name: "setprefix",
  aliases: ["set-prefix", "prefixo", "changeprefix"],
  description: "ᴀʟᴛᴇʀᴀ ᴏ ᴘʀᴇғɪxᴏ ᴅᴏ ʙᴏᴛ (ᴀᴘᴇɴᴀs ᴅᴏɴᴏ)",
  async execute(conn, msg, args, from) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerLid = config.ownerLid || "";
      const prefixAtual = config.prefix || ".";
      
      // 🔥 PEGA O NOME DO COMANDO USADO
      const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || "";
      // 🔥 PEGA O QUE O USUÁRIO DIGITOU (COM ALIASES)
      const cmd = texto.split(" ")[0].replace(prefixAtual, "").trim();
      
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

      // 🔥 VERIFICA SE FOI FORNECIDO UM PREFIXO
      if (!args[0]) {
        return await conn.sendMessage(from, { 
          text: `❌ ɪɴғᴏʀᴍᴇ ᴏ ɴᴏᴠᴏ ᴘʀᴇғɪxᴏ!\n\n📌 ᴘʀᴇғɪxᴏ ᴀᴛᴜᴀʟ: \`${prefixAtual}\`\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefixAtual}${cmd} !\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefixAtual}${cmd} /`,
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

      const novoPrefixo = args[0];

      // 🔥 VALIDA O PREFIXO
      if (novoPrefixo.length > 5) {
        return await conn.sendMessage(from, { 
          text: "❌ ᴏ ᴘʀᴇғɪxᴏ ᴅᴇᴠᴇ ᴛᴇʀ ɴᴏ ᴍᴀ́xɪᴍᴏ 5 ᴄᴀʀᴀᴄᴛᴇʀᴇs!",
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

      if (novoPrefixo.includes(' ') || novoPrefixo.includes('\n')) {
        return await conn.sendMessage(from, { 
          text: "❌ ᴏ ᴘʀᴇғɪxᴏ ɴᴀ̃ᴏ ᴘᴏᴅᴇ ᴄᴏɴᴛᴇʀ ᴇsᴘᴀᴄ̧ᴏs ᴏᴜ ǫᴜᴇʙʀᴀs ᴅᴇ ʟɪɴʜᴀ!",
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

      // 🔥 CAMINHO DO ARQUIVO CONFIG
      const configPath = path.join(__dirname, '..', '..', 'config', 'config.js');
      
      // 🔥 LÊ O CONFIG ATUAL
      let configContent = fs.readFileSync(configPath, 'utf8');
      
      // 🔥 PROCURA A LINHA DO PREFIXO E SUBSTITUI
      const prefixRegex = /prefix:\s*["']([^"']*)["']/;
      const match = configContent.match(prefixRegex);
      
      if (!match) {
        // Se não encontrar a linha, adiciona
        configContent = configContent.replace(
          /module\.exports\s*=\s*\{/,
          `module.exports = {\n  prefix: "${novoPrefixo}",`
        );
      } else {
        configContent = configContent.replace(prefixRegex, `prefix: "${novoPrefixo}"`);
      }
      
      // 🔥 SALVA O ARQUIVO
      fs.writeFileSync(configPath, configContent, 'utf8');
      
      // 🔥 RECARREGA O CONFIG
      configLoader.recarregarConfig();
      
      console.log(`✅ Prefixo alterado de "${match ? match[1] : 'não definido'}" para "${novoPrefixo}"`);

      // 🔥 ENVIA MENSAGEM DE SUCESSO
      await conn.sendMessage(from, { 
        text: `✅ *ᴘʀᴇғɪxᴏ ᴀʟᴛᴇʀᴀᴅᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ!*\n\n📌 ᴀɴᴛɪɢᴏ: \`${match ? match[1] : 'não definido'}\`\n📌 ɴᴏᴠᴏ: \`${novoPrefixo}\`\n\n🔄 ᴀʟᴛᴇʀᴀᴄ̧ᴀ̃ᴏ ᴀᴘʟɪᴄᴀᴅᴀ ɪᴍᴇᴅɪᴀᴛᴀᴍᴇɴᴛᴇ!`,
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
      console.error("❌ Erro set-prefix:", error);
      await conn.sendMessage(from, { 
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴀʟᴛᴇʀᴀʀ ᴏ ᴘʀᴇғɪxᴏ!*\n\n📌 ${error.message}`,
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