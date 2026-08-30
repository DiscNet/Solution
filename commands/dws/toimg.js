// commands/toimg.js
const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

module.exports = {
  name: "toimg",
  description: "Converte figurinha em imagem ou vídeo",
  async execute(conn, msg, args, from) {
    try {
      await conn.sendMessage(from, { react: { text: "🖼️", key: msg.key } });

      let stickerBuffer;
      let isAnimated = false;

      // =============================
      // PEGAR STICKER
      // =============================
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (quoted?.stickerMessage) {
        const fakeMsg = { message: { stickerMessage: quoted.stickerMessage } };
        stickerBuffer = await downloadMediaMessage(fakeMsg, "buffer", {}, {});
      } else if (msg.message?.stickerMessage) {
        stickerBuffer = await downloadMediaMessage(msg, "buffer", {}, {});
      }

      if (!stickerBuffer) {
        return conn.sendMessage(from, {
          text: "❌ Responda a uma figurinha com .toimg"
        }, { quoted: msg });
      }

      // =============================
      // DETECTAR ANIMAÇÃO
      // =============================
      const header = stickerBuffer.toString("utf8", 0, 200);
      isAnimated = header.includes("ANIM") || header.includes("ANMF");

      const tempDir = path.join(__dirname, "..", "..", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const input = path.join(tempDir, `input_${Date.now()}.webp`);
      const output = path.join(tempDir, `output_${Date.now()}.${isAnimated ? "mp4" : "png"}`);

      fs.writeFileSync(input, stickerBuffer);

      await conn.sendMessage(from, {
        text: isAnimated
          ? "🎬 Convertendo figurinha animada..."
          : "🖼️ Convertendo figurinha..."
      }, { quoted: msg });

      // =============================
      // CONVERSÃO
      // =============================
      try {
        if (isAnimated) {

          const gifPath = input.replace(".webp", ".gif");

          // 🔥 ETAPA 1: WEBP → GIF (ImageMagick resolve o bug)
          try {
            await execPromise(`magick "${input}" "${gifPath}"`);
          } catch {
            await execPromise(`convert "${input}" "${gifPath}"`);
          }

          if (!fs.existsSync(gifPath)) {
            throw new Error("Falha ao converter para GIF");
          }

          // 🔥 ETAPA 2: GIF → MP4 (FFmpeg)
          const gifToMp4 = `ffmpeg -y -i "${gifPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2,fps=15" "${output}"`;
          await execPromise(gifToMp4);

          if (!fs.existsSync(output) || fs.statSync(output).size < 1000) {
            throw new Error("MP4 inválido");
          }

          await conn.sendMessage(from, {
            video: { url: output },
            caption: "✅ Sticker animado convertido para vídeo!"
          }, { quoted: msg });

          // limpar gif
          try { fs.unlinkSync(gifPath); } catch {}

        } else {

          // 🖼️ STICKER ESTÁTICO → PNG
          try {
            await execPromise(`magick "${input}" "${output}"`);
          } catch {
            await execPromise(`convert "${input}" "${output}"`);
          }

          if (!fs.existsSync(output)) {
            throw new Error("Falha ao converter imagem");
          }

          await conn.sendMessage(from, {
            image: { url: output },
            caption: "✅ Sticker convertido para imagem!"
          }, { quoted: msg });
        }

      } catch (err) {
        console.log("Erro total:", err);

        await conn.sendMessage(from, {
          text: "❌ Não foi possível converter este sticker!"
        }, { quoted: msg });

        await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
      }

      // =============================
      // LIMPEZA
      // =============================
      setTimeout(() => {
        try { fs.unlinkSync(input); } catch {}
        try { fs.unlinkSync(output); } catch {}
      }, 5000);

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("Erro geral:", error);

      await conn.sendMessage(from, {
        text: "❌ Erro ao converter figurinha!"
      }, { quoted: msg });

      await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
    }
  }
};