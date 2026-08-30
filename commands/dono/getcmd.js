const { createStatusQuoted } = require("../../functions/statusCard");
// commands/dono/getcmd.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "getcmd",
  aliases: ["getcommand", "pegarcomando"],
  description: "ᴇɴᴠɪᴀ ᴜᴍ ᴄᴏᴍᴀɴᴅᴏ ᴘᴀʀᴀ ᴏ ᴘᴠ ᴅᴏ ᴅᴏɴᴏ",
  async execute(conn, msg, args, from) {
    try {
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerLid = config.ownerLid || "";
      const prefix = config.prefix;
      const prefixAtual = config.prefix;
      const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || "";
      // 🔥 PEGA O QUE O USUÁRIO DIGITOU (COM ALIASES)
      const cmd = texto.split(" ")[0].replace(prefixAtual, "").trim();
      
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

      // Verifica se foi fornecido o nome do comando
      if (!args[0]) {
        return await conn.sendMessage(from, {
          text: `❌ ɪɴғᴏʀᴍᴇ ᴏ ɴᴏᴍᴇ ᴅᴏ ᴄᴏᴍᴀɴᴅᴏ!\n\n📌 ᴇxᴇᴍᴘʟᴏ:${prefix}${cmd} ficha\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}${cmd} registro`,
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

      const cmdName = args[0].toLowerCase();
      
      // 🔥 CAMINHOS POSSÍVEIS PARA O COMANDO
      const pathsToCheck = [
        path.join(__dirname, "..", "..", "commands", "geral", `${cmdName}.js`),
        path.join(__dirname, "..", "..", "commands", "admins", `${cmdName}.js`),
        path.join(__dirname, "..", "..", "commands", "dono", `${cmdName}.js`),
        path.join(__dirname, "..", "..", "commands", "midia", `${cmdName}.js`),
        path.join(__dirname, "..", "..", "commands", "rpg", `${cmdName}.js`)
      ];

      let cmdPath = null;
      let cmdContent = null;

      // Procura o comando nas pastas
      for (const p of pathsToCheck) {
        if (fs.existsSync(p)) {
          cmdPath = p;
          cmdContent = fs.readFileSync(p, "utf8");
          break;
        }
      }

      if (!cmdContent) {
        return await conn.sendMessage(from, {
          text: `❌ ᴄᴏᴍᴀɴᴅᴏ *${cmdName}* ɴᴀ̃ᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ!\n\n📌 ᴠᴇʀɪғɪǫᴜᴇ sᴇ ᴏ ɴᴏᴍᴇ ᴇsᴛᴀ́ ᴄᴏʀʀᴇᴛᴏ.`,
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

      // 🔥 ENVIA O COMANDO PARA O PV DO DONO
      const donoJid = ownerLid;

      const mensagem = `📄 *ᴄᴏᴍᴀɴᴅᴏ:* ${cmdName}\n📂 *ᴘᴀsᴛᴀ:* ${path.basename(path.dirname(cmdPath))}\n📁 *ᴀʀǫᴜɪᴠᴏ:* ${path.basename(cmdPath)}\n\n\`\`\`javascript\n${cmdContent}\n\`\`\``;

      await conn.sendMessage(donoJid, {
        text: mensagem,
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

      await conn.sendMessage(from, {
        text: `✅ *ᴄᴏᴍᴀɴᴅᴏ ${cmdName} ᴇɴᴠɪᴀᴅᴏ ᴘᴀʀᴀ sᴇᴜ ᴘᴠ!*\n\n📌 ᴠᴇʀɪғɪǫᴜᴇ sᴜᴀ ᴄᴀɪxᴀ ᴅᴇ ᴇɴᴛʀᴀᴅᴀ.`,
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
      console.error("❌ Erro getcmd:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ʙᴜsᴄᴀʀ ᴄᴏᴍᴀɴᴅᴏ!*\n\n📌 ${error.message}`,
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