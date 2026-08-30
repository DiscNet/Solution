// commands/steffect.js

const config = require("../../config/config");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const webp = require("node-webpmux");

// ==============================================
// CONFIGURAÇÕES PADRÃO (IGUAL AO STICKER.JS)
// ==============================================
const PACKNAME = `Created by LᴜᴋᴀMᴏᴅᴢᴢ Rᴏʙᴏᴛ\nDev & Owner: Kxʟʏɴ\n`;
const AUTHOR = `\nBᴏᴛ: +55 (63) 9200-3562\nMy hatred shall build empires.`;

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

module.exports = {
  name: "steffect",
  description: "Aplicar efeitos no sticker",

  async execute(conn, msg, args, from) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "LukaModzz";
      
      let pushName = "Usuário";
      try {
        pushName = msg.pushName || "LukaModzz";
      } catch (e) {
        pushName = "LukaModzz";
      }

      const quoted = msg.message?.extendedTextMessage?.contextInfo;

      if (!quoted?.quotedMessage?.imageMessage) {
        return await conn.sendMessage(
          from,
          {
            text: `❌ Responda uma imagem!\n\nEfeitos: blur, grayscale, sepia, negative, bright, dark\nExemplo: ${prefix}steffect grayscale`,
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363426698503859@newsletter",
                newsletterName: "LukaModzz",
                serverMessageId: 116
              }
            }
          },
          {
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
          }
        );
      }

      const effect = args[0]?.toLowerCase() || "grayscale";

      await conn.sendMessage(
        from,
        { 
          text: `⏳ Aplicando efeito ${effect}...`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: "LukaModzz",
              serverMessageId: 116
            }
          }
        },
        {
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
        }
      );

      // baixar imagem
      const stream = await downloadContentFromMessage(
        quoted.quotedMessage.imageMessage,
        "image"
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const tempDir = path.join(__dirname, "..", "..", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const input = path.join(tempDir, `steffect_in_${Date.now()}.png`);
      const output = path.join(tempDir, `steffect_out_${Date.now()}.webp`);

      fs.writeFileSync(input, buffer);

      // 🎨 FILTROS CORRETOS
      let filter = "";

      switch (effect) {
        case "blur":
          filter = "boxblur=10:0.6";
          break;
        case "grayscale":
          filter = "hue=s=0";
          break;
        case "sepia":
          filter = "colorchannelmixer=.393:.769:.189:.349:.686:.168:.272:.534:.131";
          break;
        case "negative":
          filter = "negate";
          break;
        case "bright":
          filter = "eq=brightness=0.3";
          break;
        case "dark":
          filter = "eq=brightness=-0.3";
          break;
        default:
          filter = "hue=s=0";
      }

      const comando = `ffmpeg -y -i ${input} -vf "${filter},scale=512:512:force_original_aspect_ratio=decrease" -vcodec libwebp -lossless 1 -q:v 80 -preset default -loop 0 -an ${output}`;

      await execPromise(comando);

      if (!fs.existsSync(output) || fs.statSync(output).size === 0) {
        throw new Error("Sticker vazio");
      }

      const stickerBuffer = fs.readFileSync(output);
      const finalStickerBuffer = await addStickerMetadata(stickerBuffer, PACKNAME, AUTHOR);

      await conn.sendMessage(
        from,
        { 
          sticker: finalStickerBuffer,
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
        },
        {
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
        }
      );

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      });

      // Limpar arquivos temporários
      try {
        if (fs.existsSync(input)) fs.unlinkSync(input);
        if (fs.existsSync(output)) fs.unlinkSync(output);
      } catch (e) {}

    } catch (error) {
      console.error(error);

      await conn.sendMessage(
        from,
        { 
          text: "❌ Erro ao aplicar efeito!",
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: "LukaModzz",
              serverMessageId: 116
            }
          }
        },
        {
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
        }
      );
    }
  },
};