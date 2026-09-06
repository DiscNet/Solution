const { createStatusQuoted } = require("../../functions/statusCard");
// commands/upscale.js
const config = require("../../config/config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const axios = require("axios");
const FormData = require("form-data");
const bot = config.botName || "LukaModzz";
const prefix = config.prefix || ".";
const owner = config.ownerName || "LukaModzz";

module.exports = {
  name: "upscale",
  aliases: ["hd", "hdr"],
  description: "ᴍᴇʟʜᴏʀᴀ ᴀ ǫᴜᴀʟɪᴅᴀᴅᴇ ᴅᴇ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix
      const API_KEY = config.tokitoApi;
      const prefixAtual = config.prefix;
      const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || "";
      // 🔥 PEGA O QUE O USUÁRIO DIGITOU (COM ALIASES)
      const cmd = texto.split(" ")[0].replace(prefixAtual, "").trim();

      let pushName = "Usuário";
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
        return await conn.sendMessage(from, {
          text: `❌ ᴇɴᴠɪᴇ ᴏᴜ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ!\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}${cmd} (com uma imagem)`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: bot,
              serverMessageId: 116
            }
          }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      await conn.sendMessage(from, { react: { text: "🔄", key: msg.key } });

      // 📤 Upload para tmpfiles.org com timeout aumentado
      const form = new FormData();
      form.append("file", imageBuffer, "image.jpg");

      const uploadRes = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
        headers: form.getHeaders(),
        timeout: 30000 // Aumentado para 30 segundos
      });

      const pageUrl = uploadRes.data?.data?.url;
      if (!pageUrl) throw new Error("Falha no upload");

      console.log('📄 Página da imagem:', pageUrl);

      // 🔥 Extrai o link direto da imagem do HTML com timeout aumentado
      const pageRes = await axios.get(pageUrl, {
        timeout: 30000 // Aumentado para 30 segundos
      });

      const html = pageRes.data;
      let directImageUrl = null;

      // Procura pela imagem no HTML
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        directImageUrl = imgMatch[1];
        if (directImageUrl.startsWith('/')) {
          directImageUrl = 'https://tmpfiles.org' + directImageUrl;
        }
      }

      if (!directImageUrl) {
        const altMatch = html.match(/src=["'](https?:\/\/[^"']+\.(jpg|jpeg|png|gif|webp))["']/i);
        if (altMatch && altMatch[1]) {
          directImageUrl = altMatch[1];
        }
      }

      if (!directImageUrl) {
        console.error('HTML da página:', html.substring(0, 500));
        throw new Error("Não foi possível extrair o link direto da imagem");
      }

      console.log('🖼️ Link direto da imagem:', directImageUrl);

      // 🔥 API de upscale da Tokito com timeout aumentado
      const apiUrl = `https://tokito-apis.com.br/api/upscale?url=${encodeURIComponent(directImageUrl)}&resolusi=6&apikey=${API_KEY}`;
      console.log('📡 Chamando API:', apiUrl);

      const response = await axios.get(apiUrl, {
        responseType: "arraybuffer",
        timeout: 80000 // Aumentado para 60 segundos
      });

      const upscaledBuffer = Buffer.from(response.data);

      // Verifica se a resposta é uma imagem válida
      const isJpeg = upscaledBuffer[0] === 0xFF && upscaledBuffer[1] === 0xD8;
      const isPng = upscaledBuffer[0] === 0x89 && upscaledBuffer[1] === 0x50;

      if (!isJpeg && !isPng) {
        console.error('Resposta não é imagem, tentando interpretar como JSON');
        try {
          const errorText = upscaledBuffer.toString('utf-8');
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || errorJson.error || "Erro na API");
        } catch (e) {
          throw new Error("Resposta da API não é uma imagem válida");
        }
      }

      await conn.sendMessage(from, {
        image: upscaledBuffer,
        caption: `📥 │ ɪᴍᴀɢᴇᴍ ᴍᴇʟʜᴏʀᴀᴅᴀ ᴄᴏᴍ sᴜᴄᴇssᴏ!\n⚓ │ ʀᴇsᴏʟᴜçãᴏ: 6x\n> 👤 ᴘᴏʀ: ${pushName}`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: bot,
            serverMessageId: 116
          }
        }
      }, {
        quoted: createStatusQuoted(msg)
      });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("❌ Erro upscale:", error);

      let errorMessage = "❌ ᴇʀʀᴏ ᴀᴏ ᴍᴇʟʜᴏʀᴀʀ ᴀ ɪᴍᴀɢᴇᴍ!\n\n";

      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage += "⏰ ᴛᴇᴍᴘᴏ ʟɪᴍɪᴛᴇ ᴇxᴄᴇᴅɪᴅᴏ.\n";
        errorMessage += "🔄 ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ ᴄᴏᴍ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ ᴍᴇɴᴏʀ.";
      } else if (error.response) {
        if (error.response.status === 500) {
          errorMessage += "🔴 ᴀ ᴀᴘɪ ᴅᴇ ᴜᴘsᴄᴀʟᴇ ᴇsᴛá ᴄᴏᴍ ᴘʀᴏʙʟᴇᴍᴀs ɪɴᴛᴇʀɴᴏs.\n";
          errorMessage += "🔄 ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ ᴇᴍ ᴀʟɢᴜɴs ᴍɪɴᴜᴛᴏs.";
        } else if (error.response.status === 404) {
          errorMessage += "🔴 ᴀᴘɪ ɴãᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴀ.\n";
          errorMessage += "📌 ᴠᴇʀɪғɪǫᴜᴇ sᴇ ᴀ ᴜʀʟ ᴇsᴛá ᴄᴏʀʀᴇᴛᴀ.";
        } else if (error.response.status === 429) {
          errorMessage += "🔴 ᴍᴜɪᴛᴀs ʀᴇǫᴜɪsɪçõᴇs!\n";
          errorMessage += "⏳ ᴀɢᴜᴀʀᴅᴇ ᴜɴs sᴇɢᴜɴᴅᴏs ᴇ ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ.";
        } else {
          errorMessage += `📌 sᴛᴀᴛᴜs: ${error.response.status}\n`;
          errorMessage += `📌 ᴇʀʀᴏ: ${error.response.statusText || 'Erro desconhecido'}`;
        }
      } else if (error.message.includes('upload')) {
        errorMessage += "📤 ᴇʀʀᴏ ᴀᴏ ғᴀᴢᴇʀ ᴜᴘʟᴏᴀᴅ ᴅᴀ ɪᴍᴀɢᴇᴍ.\n";
        errorMessage += "🔄 ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ ᴇᴍ ᴀʟɢᴜɴs ɪɴsᴛᴀɴᴛᴇs.";
      } else if (error.message.includes('extrair')) {
        errorMessage += "🔍 ɴãᴏ ғᴏɪ ᴘᴏssíᴠᴇʟ ᴇxᴛʀᴀɪʀ ᴏ ʟɪɴᴋ ᴅᴀ ɪᴍᴀɢᴇᴍ.\n";
        errorMessage += "🔄 ᴛᴇɴᴛᴇ ᴜsᴀʀ ᴏᴜᴛʀᴏ sᴇʀᴠɪçᴏ ᴅᴇ ᴜᴘʟᴏᴀᴅ.";
      } else {
        errorMessage += `📌 ᴇʀʀᴏ: ${error.message}`;
      }

      await conn.sendMessage(from, {
        text: errorMessage,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: bot,
            serverMessageId: 116
          }
        }
      }, {
        quoted: createStatusQuoted(msg)
      });
    }
  }
};