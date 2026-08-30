const { createStatusQuoted } = require("../../functions/statusCard");
// commands/stext2.js
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const config = require("../../config/config");

module.exports = {
  name: "stext2",
  description: "Cria uma figurinha com texto (fundo transparente)",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "LukaModzz";
      
      let pushName = "Usuário";
      try {
        pushName = msg.pushName || "LukaModzz";
      } catch (e) {
        pushName = "LukaModzz";
      }

      if (!args || args.length === 0) {
        return conn.sendMessage(from, { 
          text: "❌ Digite o texto para criar a figurinha.\n\n📝 *Exemplos:*\n.stext2 Olá Mundo!",
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

      await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } });

      const texto = args.join(" ");
      const tamanho = 120; // Aumentado de 80 para 120
      
      // ==============================================
      // CONFIGURAÇÃO DA FONTE
      // ==============================================
      
      const fontesDir = path.join(__dirname, "..", "..", "fontes");
      let fontPath = "";
      
      if (fs.existsSync(fontesDir)) {
        const fontFiles = fs.readdirSync(fontesDir).filter(f => f.endsWith(".ttf"));
        if (fontFiles.length > 0) {
          fontPath = path.join(fontesDir, fontFiles[0]);
        } else {
          fontPath = "/data/data/com.termux/files/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf";
        }
      } else {
        fontPath = "/data/data/com.termux/files/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf";
      }
      
      // ==============================================
      // CRIAÇÃO - PNG transparente + texto centralizado
      // ==============================================
      
      const tempDir = path.join(__dirname, "..", "..", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      
      const tempPng = path.join(tempDir, `stext2_${Date.now()}.png`);
      const tempWebp = path.join(tempDir, `stext2_${Date.now()}.webp`);
      
      try {
        // Canvas 512x512 transparente + texto centralizado maior
        const convertCmd = `magick -size 512x512 xc:transparent -font "${fontPath}" -pointsize ${tamanho} -fill white -gravity center -annotate +0+0 "${texto.replace(/"/g, '\\"')}" -define webp:lossless=true "${tempWebp}"`;
        
        console.log(`📝 stext2: ${texto} | Tamanho: ${tamanho}`);
        await execPromise(convertCmd);
        
        if (fs.existsSync(tempWebp) && fs.statSync(tempWebp).size > 0) {
          const stickerBuffer = fs.readFileSync(tempWebp);
          
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
          throw new Error("Arquivo vazio");
        }
        
      } catch (error) {
        console.error("Erro magick:", error);
        
        // Fallback: convert
        try {
          const fallbackCmd = `convert -size 512x512 xc:transparent -font "${fontPath}" -pointsize ${tamanho} -fill white -gravity center -annotate +0+0 "${texto.replace(/"/g, '\\"')}" -define webp:lossless=true "${tempWebp}"`;
          
          await execPromise(fallbackCmd);
          
          if (fs.existsSync(tempWebp) && fs.statSync(tempWebp).size > 0) {
            const stickerBuffer = fs.readFileSync(tempWebp);
            
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
          }
        } catch (fallbackError) {
          console.error("Fallback falhou:", fallbackError);
          
          try {
            const pngCmd = `magick -size 512x512 xc:transparent -font "${fontPath}" -pointsize ${tamanho} -fill white -gravity center -annotate +0+0 "${texto.replace(/"/g, '\\"')}" "${tempPng}"`;
            await execPromise(pngCmd);
            
            const webpCmd = `ffmpeg -i "${tempPng}" -vcodec libwebp -lossless 1 -pix_fmt yuva420p "${tempWebp}" -y`;
            await execPromise(webpCmd);
            
            if (fs.existsSync(tempWebp) && fs.statSync(tempWebp).size > 0) {
              const stickerBuffer = fs.readFileSync(tempWebp);
              
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
            }
          } catch (finalError) {
            throw new Error("Todos os métodos falharam");
          }
        }
      } finally {
        try {
          if (fs.existsSync(tempPng)) fs.unlinkSync(tempPng);
          if (fs.existsSync(tempWebp)) fs.unlinkSync(tempWebp);
        } catch (e) {}
      }

    } catch (error) {
      console.error("Erro stext2:", error);
      try {
        await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
      } catch (e) {}
      
      await conn.sendMessage(from, { 
        text: "❌ Erro ao criar figurinha.",
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