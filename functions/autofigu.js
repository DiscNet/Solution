const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { exec } = require("child_process");
const config = require("../config/config");

// Caminho para salvar o estado (ativado/desativado por grupo ou PV)
const stateFile = path.join(__dirname, "../data/autofigu.json");
let autoFiguState = {};

// Carrega estado salvo
if (fs.existsSync(stateFile)) {
  try {
    autoFiguState = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  } catch (e) {
    console.error("Erro ao carregar estado do AutoFigu:", e);
    autoFiguState = {};
  }
}

// Salva estado no arquivo
function saveState() {
  fs.writeFileSync(stateFile, JSON.stringify(autoFiguState, null, 2));
}

// Verifica se está ativo
function isAutoFiguActive(chatId) {
  return autoFiguState[chatId] || false;
}

// Alterna estado
function toggleAutoFigu(chatId) {
  autoFiguState[chatId] = !autoFiguState[chatId];
  saveState();
  return autoFiguState[chatId];
}

// Handler principal
async function autoFiguHandler(conn, msg) {
  try {
    const from = msg.key.remoteJid;
    const owner = config.ownerName || "LukaModzz";

    // ✅ Agora funciona também no seu número (dono)
    const isGroup = from.endsWith("@g.us");
    const isFromSelf = msg.key.fromMe;
    const sender = msg.key.participant || msg.key.remoteJid;

    // Se não for grupo e não for o dono, não faz nada
    if (!isGroup && sender !== config.ownerNumber && !isFromSelf) return;

    if (!isAutoFiguActive(from)) return;

    // Push Name para o status
    let pushName = "Usuário";
    try {
      pushName = msg.pushName || "LukaModzz";
    } catch (e) {
      pushName = "LukaModzz";
    }

    // Pega mensagem de imagem ou vídeo
    const imageMessage =
      msg.message?.imageMessage ||
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

    const videoMessage =
      msg.message?.videoMessage ||
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

    if (!imageMessage && !videoMessage) return;

    // Baixa a mídia
    const mediaType = imageMessage ? "image" : "video";
    const mediaMessage = imageMessage || videoMessage;
    const stream = await downloadContentFromMessage(mediaMessage, mediaType);

    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    const tmpInput = path.join(__dirname, `../temp_${Date.now()}.${mediaType === "image" ? "png" : "mp4"}`);
    const tmpOutput = path.join(__dirname, `../sticker_${Date.now()}.webp`);
    fs.writeFileSync(tmpInput, buffer);

    // Comando ffmpeg
    const ffmpegCmd = imageMessage
      ? `ffmpeg -y -i "${tmpInput}" -vcodec libwebp -filter:v "scale=512:512:force_original_aspect_ratio=decrease" -lossless 1 -q:v 50 -preset default -loop 0 "${tmpOutput}"`
      : `ffmpeg -y -i "${tmpInput}" -t 6 -vf "scale=512:512,fps=15" -vcodec libwebp -loop 0 -preset default -an -vsync 0 "${tmpOutput}"`;

    exec(ffmpegCmd, async (err) => {
      fs.unlinkSync(tmpInput);

      if (err) {
        console.error("Erro AutoFigu FFmpeg:", err);
        await conn.sendMessage(from, { 
          text: "❌ Erro ao gerar a figurinha automática.",
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
        return;
      }

      try {
        const stickerBuffer = fs.readFileSync(tmpOutput);
        await conn.sendMessage(from, { 
          sticker: stickerBuffer,
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
      } catch (e) {
        console.error("Erro ao enviar figurinha AutoFigu:", e);
      } finally {
        if (fs.existsSync(tmpOutput)) fs.unlinkSync(tmpOutput);
      }
    });
  } catch (e) {
    console.error("Erro AutoFigu:", e);
  }
}

module.exports = {
  autoFiguHandler,
  toggleAutoFigu,
  isAutoFiguActive,
};