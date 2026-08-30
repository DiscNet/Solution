// commands/stext.js
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const config = require("../../config/config");

module.exports = {
  name: "stext",
  description: "Cria uma figurinha com texto personalizado",
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
          text: "❌ Digite o texto para criar a figurinha.\n\n📝 *Exemplos:*\n.stext Olá Mundo!\n.stext Kxlyn\n.stext @LukaKRLH",
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
          quoted: {
            key: {
              remoteJid: "status@broadcast",
              fromMe: false,
              participant: "13135550002@s.whatsapp.net"
            },
            message: {
              contactMessage: {
                displayName: pushName,
                vcard: 
                  "BEGIN:VCARD\n" +
                  "VERSION:3.0\n" +
                  `FN:${pushName}\n` +
                  `ORG:${owner};\n` +
                  "TEL;type=CELL;type=VOICE;waid=13135550002:556384673123\n" +
                  "END:VCARD"
              }
            }
          }
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
            quoted: {
              key: {
                remoteJid: "status@broadcast",
                fromMe: false,
                participant: "13135550002@s.whatsapp.net"
              },
              message: {
                contactMessage: {
                  displayName: pushName,
                  vcard: 
                    "BEGIN:VCARD\n" +
                    "VERSION:3.0\n" +
                    `FN:${pushName}\n` +
                    `ORG:${owner};\n` +
                    "TEL;type=CELL;type=VOICE;waid=13135550002:556384673123\n" +
                    "END:VCARD"
                }
              }
            }
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
              quoted: {
                key: {
                  remoteJid: "status@broadcast",
                  fromMe: false,
                  participant: "13135550002@s.whatsapp.net"
                },
                message: {
                  contactMessage: {
                    displayName: pushName,
                    vcard: 
                      "BEGIN:VCARD\n" +
                      "VERSION:3.0\n" +
                      `FN:${pushName}\n` +
                      `ORG:${owner};\n` +
                      "TEL;type=CELL;type=VOICE;waid=13135550002:556384673123\n" +
                      "END:VCARD"
                  }
                }
              }
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
        text: "❌ Erro ao criar figurinha de texto.\n\n📝 *Use:* .stext [texto]",
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
        quoted: {
          key: {
            remoteJid: "status@broadcast",
            fromMe: false,
            participant: "13135550002@s.whatsapp.net"
          },
          message: {
            contactMessage: {
              displayName: pushName || "LukaModzz",
              vcard: 
                "BEGIN:VCARD\n" +
                "VERSION:3.0\n" +
                `FN:${pushName || "LukaModzz"}\n` +
                `ORG:${owner};\n` +
                "TEL;type=CELL;type=VOICE;waid=13135550002:556384673123\n" +
                "END:VCARD"
            }
          }
        }
      });
    }
  }
};