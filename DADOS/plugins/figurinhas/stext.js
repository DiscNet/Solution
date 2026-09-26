// Menu: Figurinhas - Texto | Comando: stext
const { createStatusQuoted } = require("../../functions/statusCard");
// commands/stext.js
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const config = require("../../config/config");

module.exports = {
  name: "stext",
  description: "ᴄʀɪᴀ ᴜᴍᴀ ғɪɢᴜʀɪɴʜᴀ ᴄᴏᴍ ᴛᴇxᴛᴏ ᴘᴇʀsᴏɴᴀʟɪᴢᴀᴅᴏ",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "LukaModzz";

      // Push Name de quem usou o comando
      let pushName = "Usuário";
      try {
        pushName = msg.pushName || "LukaModzz";
      } catch (e) {
        pushName = "LukaModzz";
      }

      // Verifica se tem texto
      if (!args || args.length === 0) {
        return conn.sendMessage(from, {
          text: "❌ ᴅɪɢɪᴛᴇ ᴏ ᴛᴇxᴛᴏ ᴘᴀʀᴀ ᴄʀɪᴀʀ ᴀ ғɪɢᴜʀɪɴʜᴀ.\n\n📝 *ᴇxᴇᴍᴘʟᴏs:*\n.stext ᴏʟá ᴍᴜɴᴅᴏ!\n.stext ᴋxʟʏɴ\n.stext @ʟᴜᴋᴀᴋʀʟʜ",
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: "LukaModzz",
              serverMessageId: 116
            }
          }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      // Reage com 🎨
      await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } });

      // Pega o texto completo
      const texto = args.join(" ");
      const tamanho = 120; // tamanho fixo

      // ==============================================
      // CONFIGURAÇÃO DA FONTE
      // ==============================================

      const fontesDir = path.join(__dirname, "..", "..", "fontes");
      let fontPath = "";

      if (fs.existsSync(fontesDir)) {
        const fontFiles = fs.readdirSync(fontesDir).filter(f => f.endsWith(".ttf"));

        if (fontFiles.length > 0) {
          fontPath = path.join(fontesDir, fontFiles[0]);
          console.log(`✅ Usando fonte: ${fontFiles[0]}`);
        } else {
          fontPath = "/data/data/com.termux/files/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf";
        }
      } else {
        fontPath = "/data/data/com.termux/files/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf";
      }

      // ==============================================
      // CRIAÇÃO DA FIGURINHA COM TEXTO
      // ==============================================

      const tempOutput = path.join(__dirname, "..", "..", "temp", `stext_${Date.now()}.webp`);
      const tempDir = path.join(__dirname, "..", "..", "temp");

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      try {
        const ffmpegCmd = `ffmpeg -f lavfi -i color=c=black:s=512x512:d=1:rate=1 -vf "drawtext=text='${texto.replace(/'/g, "\\'")}':fontcolor=white:fontsize=${tamanho}:x=(w-text_w)/2:y=(h-text_h)/2:fontfile='${fontPath}'" -c:v libwebp -lossless 0 -q:v 80 -frames:v 1 "${tempOutput}"`;

        console.log(`📝 Texto: ${texto} | Tamanho: ${tamanho}`);
        await execPromise(ffmpegCmd);

        if (fs.existsSync(tempOutput) && fs.statSync(tempOutput).size > 0) {
          const stickerBuffer = fs.readFileSync(tempOutput);

          // Enviar a figurinha com encaminhamento e status
          await conn.sendMessage(from, {
            sticker: stickerBuffer,
            mimetype: "image/webp",
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363426698503859@newsletter",
                newsletterName: "LukaModzz",
                serverMessageId: 116
              }
            }
          }, {
            quoted: createStatusQuoted(msg)
          });

          await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } else {
          throw new Error("Arquivo de saída vazio");
        }

      } catch (ffmpegError) {
        console.error("Erro no ffmpeg:", ffmpegError);

        // Fallback: tentar sem fonte personalizada
        try {
          const fallbackCmd = `ffmpeg -f lavfi -i color=c=black:s=512x512:d=1 -vf "drawtext=text='${texto.replace(/'/g, "\\'")}':fontcolor=white:fontsize=${tamanho}:x=(w-text_w)/2:y=(h-text_h)/2" -frames:v 1 "${tempOutput}"`;

          await execPromise(fallbackCmd);

          if (fs.existsSync(tempOutput) && fs.statSync(tempOutput).size > 0) {
            const stickerBuffer = fs.readFileSync(tempOutput);

            await conn.sendMessage(from, {
              sticker: stickerBuffer,
              mimetype: "image/webp",
              contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "120363426698503859@newsletter",
                  newsletterName: "LukaModzz",
                  serverMessageId: 116
                }
              }
            }, {
              quoted: createStatusQuoted(msg)
            });

            await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
          } else {
            throw new Error("Fallback falhou");
          }
        } catch (fallbackError) {
          throw new Error("Fallback também falhou");
        }
      } finally {
        try {
          if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
        } catch (e) {}
      }

    } catch (error) {
      console.error("Erro no comando stext:", error);
      try {
        await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
      } catch (e) {}

      await conn.sendMessage(from, {
        text: "❌ ᴇʀʀᴏ ᴀᴏ ᴄʀɪᴀʀ ғɪɢᴜʀɪɴʜᴀ ᴅᴇ ᴛᴇxᴛᴏ.\n\n📝 *ᴜsᴇ:* .stext [ᴛᴇxᴛᴏ]",
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: "LukaModzz",
            serverMessageId: 116
          }
        }
      }, {
        quoted: createStatusQuoted(msg)
      });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Figurinhas",
  "menuSection": "Texto",
  "usage": "stext texto",
  "description": "Uso: .stext texto"
});
