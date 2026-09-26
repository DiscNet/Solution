// Menu: Utilidades - Ajuda | Comando: ascii
const { createStatusQuoted } = require("../../functions/statusCard");
// commands/ascii.js
const config = require("../../../config/config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

module.exports = {
  name: "ascii",
  description: "𝑻𝒓𝒂𝒏𝒔𝒇𝒐𝒓𝒎𝒂 𝒊𝒎𝒂𝒈𝒆𝒎 𝒆𝒎 𝑨𝑺𝑪𝑰𝑰 𝒂𝒓𝒕",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "LukaModzz";
      let pushName = "Usuário";
      const bot = config.botName
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      let imageBuffer = null;

      if (msg.message?.imageMessage) {
        imageBuffer = await downloadMediaMessage(msg, "buffer", {}, {});
      }
      else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        const quotedMsg = { message: { imageMessage: quoted.imageMessage }, key: msg.key };
        imageBuffer = await downloadMediaMessage(quotedMsg, "buffer", {}, {});
      }

      if (!imageBuffer) {
        return conn.sendMessage(from, {
          text: "❌ ᴇɴᴠɪᴇ ᴏᴜ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ ᴄᴏᴍ .ascii",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } });

      const tempDir = path.join(__dirname, "..", "..", "..", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const tempInput = path.join(tempDir, `ascii_in_${Date.now()}.jpg`);
      const tempOutput = path.join(tempDir, `ascii_out_${Date.now()}.txt`);
      fs.writeFileSync(tempInput, imageBuffer);

      const width = args[0] ? parseInt(args[0]) : 80;

      // 🔥 CORREÇÃO: Remove --html para gerar texto puro
      await execPromise(`jp2a --width=${width} "${tempInput}" > "${tempOutput}"`);

      let asciiArt = fs.readFileSync(tempOutput, "utf8");

      // Limpa arquivos
      try { fs.unlinkSync(tempInput); } catch (e) {}
      try { fs.unlinkSync(tempOutput); } catch (e) {}

      if (!asciiArt || asciiArt.trim().length === 0) {
        throw new Error("ASCII art vazio");
      }

      // Remove linhas vazias extras no final
      asciiArt = asciiArt.replace(/\n+$/, "");

      // Envia o ASCII art
      const maxLength = 4000;
      if (asciiArt.length > maxLength) {
        const parts = [];
        for (let i = 0; i < asciiArt.length; i += maxLength) {
          parts.push(asciiArt.substring(i, i + maxLength));
        }

        for (let i = 0; i < parts.length; i++) {
          await conn.sendMessage(from, {
            text: i === 0 ? `🎨 *ASCII Art*\n\`\`\`\n${parts[i]}\n\`\`\`` : `\`\`\`\n${parts[i]}\n\`\`\``,
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, {
            quoted: createStatusQuoted(msg)
          });

          if (i < parts.length - 1) await delay(500);
        }
      } else {
        await conn.sendMessage(from, {
          text: `\n${asciiArt}\n`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("Erro ascii:", error);
      await conn.sendMessage(from, {
        text: "❌ ᴇʀʀᴏ ᴀᴏ ᴄʀɪᴀʀ ᴀsᴄɪɪ ᴀʀᴛ!\n\n⚠️ ɪɴsᴛᴀʟᴇ ᴏ ᴊᴘ2ᴀ:\n`ᴘᴋɢ ɪɴsᴛᴀʟʟ ᴊᴘ2ᴀ`",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


Object.assign(module.exports, {
  "menuCategory": "Utilidades",
  "menuSection": "Ajuda",
  "usage": "ascii (responda à imagem)",
  "description": "Uso: .ascii (responda à imagem)"
});
