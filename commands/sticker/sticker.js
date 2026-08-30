// commands/sticker.js (com sistema de status + encaminhamento)

const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const webp = require("node-webpmux");
const config = require("../../config/config");

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function addStickerMetadata(mediaBuffer, packname, author) {
  const tempInput = path.join(__dirname, "..", "..", "temp", `input_${Date.now()}.webp`);
  const tempOutput = path.join(__dirname, "..", "..", "temp", `output_${Date.now()}.webp`);
  
  const tempDir = path.join(__dirname, "..", "..", "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  
  fs.writeFileSync(tempInput, mediaBuffer);
  
  try {
    const img = new webp.Image();
    
    const json = {
      "sticker-pack-id": `${getRandomNumber(10000, 99999)}`,
      "sticker-pack-name": packname,
      "sticker-pack-publisher": author,
      emojis: ["✨", "🎨"]
    };
    
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);
    
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    
    await img.load(tempInput);
    img.exif = exif;
    await img.save(tempOutput);
    
    const resultBuffer = fs.readFileSync(tempOutput);
    
    fs.unlinkSync(tempInput);
    fs.unlinkSync(tempOutput);
    
    return resultBuffer;
    
  } catch (error) {
    try {
      if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
      if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
    } catch (e) {}
    throw error;
  }
}

// 🔥 FUNÇÃO PARA VERIFICAR SE O TEXTO CONTÉM O COMANDO
function containsStickerCommand(text, prefix) {
  if (!text) return false;
  const textLower = text.toLowerCase().trim();
  // Verifica .s, s, /s (com prefixo), etc.
  const patterns = [
    textLower === 's',
    textLower === '.s',
    textLower === `${prefix}s`,
    textLower.startsWith('s '),
    textLower.startsWith('.s '),
    textLower.startsWith(`${prefix}s `),
    /(^|\s)(\.s|s)(\s|$)/i.test(text)
  ];
  return patterns.some(p => p === true);
}

module.exports = {
  name: "s",
  aliases: ["sticker", "figurinha", "f"],
  description: "Cria figurinha a partir de imagem ou vídeo",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const bot = config.botName
      const owner = config.ownerName || `${bot}`;
      const prefix = config.prefix || ".";
      const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || "";
      const cmd = texto.split(" ")[0].replace(prefix, "").trim();
      
      // Push Name de quem usou o comando
      let pushName = "Usuário";
      try {
        pushName = msg.pushName || `${bot}`;
      } catch (e) {
        pushName = `${bot}`;
      }

      const PACKNAME = `Created by LᴜᴋᴀMᴏᴅᴢᴢ Rᴏʙᴏᴛ\nDev & Owner: Kxʟʏɴ\n`;
      const AUTHOR = `\nBᴏᴛ: +55 (63) 9200-3562\nMy hatred shall build empires.`;

      await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } });

      let mediaBuffer = null;
      let isVideo = false;
      let mimeType = "";
      let isQuoted = false;

      // 🔥 CASO 1: Respondendo a uma mídia (VERIFICAR PRIMEIRO)
      if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        const text = msg.message.extendedTextMessage.text || "";
        
        // Verifica se o texto contém o comando (com ou sem prefixo)
        if (containsStickerCommand(text, prefix)) {
          isQuoted = true;
          
          if (quoted.imageMessage) {
            const quotedMsg = { message: { imageMessage: quoted.imageMessage }, key: msg.key };
            mediaBuffer = await downloadMediaMessage(quotedMsg, "buffer", {}, {});
            mimeType = quoted.imageMessage.mimetype;
          } 
          else if (quoted.videoMessage) {
            const quotedMsg = { message: { videoMessage: quoted.videoMessage }, key: msg.key };
            mediaBuffer = await downloadMediaMessage(quotedMsg, "buffer", {}, {});
            isVideo = true;
            mimeType = quoted.videoMessage.mimetype;
          }
          else if (quoted.stickerMessage) {
            await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
            return conn.sendMessage(from, { 
              text: `❌ Já é uma figurinha! Use ${prefix}toimg para converter.`,
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
        }
      }

      // 🔥 CASO 2: Imagem ou vídeo com legenda (se não respondeu)
      if (!mediaBuffer && (msg.message?.imageMessage || msg.message?.videoMessage)) {
        const caption = msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || "";
        
        // Verifica se a legenda contém o comando
        if (containsStickerCommand(caption, prefix)) {
          if (msg.message?.imageMessage) {
            mediaBuffer = await downloadMediaMessage(msg, "buffer", {}, {});
            mimeType = msg.message.imageMessage.mimetype;
          } else {
            mediaBuffer = await downloadMediaMessage(msg, "buffer", {}, {});
            isVideo = true;
            mimeType = msg.message.videoMessage.mimetype;
          }
        }
      }

      // 🔥 Se não encontrou mídia, mostra erro
      if (!mediaBuffer) {
        await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
        return conn.sendMessage(from, { 
          text: `❌ Envie uma imagem/vídeo com ${prefix}${cmd} na legenda ou responda a uma mídia com ${prefix}${cmd}\n\n📝 *Exemplos:*\n• Envie uma imagem e na legenda coloque ${prefix}${cmd}\n• Responda a uma imagem com ${prefix}${cmd}`,
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

      const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tempInput = path.join(__dirname, "..", "..", "temp", `input_${uniqueId}.${isVideo ? 'mp4' : 'jpg'}`);
      const tempOutput = path.join(__dirname, "..", "..", "temp", `sticker_${uniqueId}.webp`);
      
      const tempDir = path.join(__dirname, "..", "..", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      
      fs.writeFileSync(tempInput, mediaBuffer);
      
      try {
        if (isVideo) {
          const ffmpegCmd = `ffmpeg -i "${tempInput}" -vf "scale=512:512,setpts=PTS-STARTPTS" -t 5 -r 15 -c:v libwebp -lossless 0 -q:v 70 -preset default -an "${tempOutput}"`;
          await execPromise(ffmpegCmd);
        } else {
          const ffmpegCmd = `ffmpeg -i "${tempInput}" -vf "scale=512:512" -c:v libwebp -lossless 0 -q:v 80 -preset default -an "${tempOutput}"`;
          await execPromise(ffmpegCmd);
        }
        
        if (fs.existsSync(tempOutput) && fs.statSync(tempOutput).size > 0) {
          const stickerBuffer = fs.readFileSync(tempOutput);
          const finalStickerBuffer = await addStickerMetadata(stickerBuffer, PACKNAME, AUTHOR);
          
          await conn.sendMessage(from, {
            sticker: finalStickerBuffer,
            mimetype: "image/webp",
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
        
        try {
          const fallbackCmd = isVideo 
            ? `ffmpeg -i "${tempInput}" -vf "scale=512:512" -t 5 -r 15 -c:v libwebp -lossless 0 -q:v 70 -preset default -an "${tempOutput}"`
            : `ffmpeg -i "${tempInput}" -vf "scale=512:512" -c:v libwebp -lossless 0 -q:v 80 -preset default -an "${tempOutput}"`;
          
          await execPromise(fallbackCmd);
          
          if (fs.existsSync(tempOutput) && fs.statSync(tempOutput).size > 0) {
            const stickerBuffer = fs.readFileSync(tempOutput);
            const finalStickerBuffer = await addStickerMetadata(stickerBuffer, PACKNAME, AUTHOR);
            
            await conn.sendMessage(from, {
              sticker: finalStickerBuffer,
              mimetype: "image/webp",
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
          console.error("Fallback falhou:", fallbackError);
          await conn.sendMessage(from, { 
            text: "❌ Não foi possível criar a figurinha.",
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
          await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
        }
      } finally {
        try {
          if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
          if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
        } catch (e) {}
      }

    } catch (error) {
      console.error("Erro no comando s:", error);
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
            newsletterName: `${bot}`,
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
              displayName: pushName || `${bot}`,
              vcard: 
                "BEGIN:VCARD\n" +
                "VERSION:3.0\n" +
                `FN:${pushName || `${bot}`}\n` +
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