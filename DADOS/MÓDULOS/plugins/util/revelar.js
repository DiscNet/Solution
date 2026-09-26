// Menu: Utilidades - Mídia | Comando: revelar
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { createStatusQuoted } = require("../../functions/statusCard");

function unwrapWithViewOnce(rawMessage) {
  let current = rawMessage && typeof rawMessage === "object" ? rawMessage : {};
  let isViewOnce = false;

  for (let i = 0; i < 8; i++) {
    if (current?.viewOnceMessage?.message) {
      isViewOnce = true;
      current = current.viewOnceMessage.message;
      continue;
    }
    if (current?.viewOnceMessageV2?.message) {
      isViewOnce = true;
      current = current.viewOnceMessageV2.message;
      continue;
    }
    if (current?.viewOnceMessageV2Extension?.message) {
      isViewOnce = true;
      current = current.viewOnceMessageV2Extension.message;
      continue;
    }
    if (current?.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message;
      continue;
    }
    if (current?.documentWithCaptionMessage?.message) {
      current = current.documentWithCaptionMessage.message;
      continue;
    }
    break;
  }

  return { message: current || {}, isViewOnce };
}

function getContextInfo(msg) {
  const { message } = unwrapWithViewOnce(msg?.message);
  return (
    message?.extendedTextMessage?.contextInfo ||
    message?.imageMessage?.contextInfo ||
    message?.videoMessage?.contextInfo ||
    message?.audioMessage?.contextInfo ||
    message?.documentMessage?.contextInfo ||
    {}
  );
}

function getViewOnceMedia(rawMessage) {
  const { message, isViewOnce: wrappedViewOnce } = unwrapWithViewOnce(rawMessage);

  if (message?.imageMessage) {
    const media = message.imageMessage;
    return {
      type: "image",
      media,
      mimetype: media.mimetype || "image/jpeg",
      caption: media.caption || "",
      isViewOnce: wrappedViewOnce || media.viewOnce === true,
    };
  }

  if (message?.videoMessage) {
    const media = message.videoMessage;
    return {
      type: "video",
      media,
      mimetype: media.mimetype || "video/mp4",
      caption: media.caption || "",
      isViewOnce: wrappedViewOnce || media.viewOnce === true,
    };
  }

  if (message?.audioMessage) {
    const media = message.audioMessage;
    return {
      type: "audio",
      media,
      mimetype: media.mimetype || "audio/ogg; codecs=opus",
      ptt: Boolean(media.ptt),
      isViewOnce: wrappedViewOnce || media.viewOnce === true,
    };
  }

  return null;
}

async function downloadMedia(source) {
  const stream = await downloadContentFromMessage(source.media, source.type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);
  if (!buffer.length) throw new Error("EMPTY_MEDIA");
  return buffer;
}

module.exports = {
  name: "revelar",
  aliases: ["reveal", "veronce"],
  description: "reenvia uma mídia de visualização única como mídia normal",
  menuCategory: "Utilidades",
  menuSection: "Mídia",
  usage: "revelar (responda à mídia de visualização única)",

  async execute(conn, msg, args, from) {
    const quotedMessage = getContextInfo(msg)?.quotedMessage;
    const source = quotedMessage ? getViewOnceMedia(quotedMessage) : null;

    if (!source || !source.isViewOnce) {
      return conn.sendMessage(
        from,
        {
          text: "❌ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ᴍíᴅɪᴀ ᴅᴇ ᴠɪsᴜᴀʟɪᴢᴀçãᴏ úɴɪᴄᴀ ᴇ ᴜsᴇ .revelar.",
        },
        { quoted: createStatusQuoted(msg) },
      );
    }

    try {
      await conn
        .sendMessage(from, { react: { text: "👁️", key: msg.key } })
        .catch(() => {});

      const buffer = await downloadMedia(source);
      let payload;

      if (source.type === "image") {
        payload = {
          image: buffer,
          mimetype: source.mimetype,
          ...(source.caption ? { caption: source.caption } : {}),
        };
      } else if (source.type === "video") {
        payload = {
          video: buffer,
          mimetype: source.mimetype,
          ...(source.caption ? { caption: source.caption } : {}),
        };
      } else {
        payload = {
          audio: buffer,
          mimetype: source.mimetype,
          ptt: source.ptt,
        };
      }

      await conn.sendMessage(from, payload, { quoted: createStatusQuoted(msg) });
      await conn
        .sendMessage(from, { react: { text: "✅", key: msg.key } })
        .catch(() => {});
    } catch (error) {
      console.error("[REVELAR] erro ao baixar/reencaminhar mídia:", error);
      await conn
        .sendMessage(from, { react: { text: "❌", key: msg.key } })
        .catch(() => {});
      await conn.sendMessage(
        from,
        {
          text: "❌ ɴãᴏ ғᴏɪ ᴘᴏssíᴠᴇʟ ʙᴀɪxᴀʀ ᴇ ʀᴇᴇɴᴠɪᴀʀ ᴇssᴀ ᴍíᴅɪᴀ.",
        },
        { quoted: createStatusQuoted(msg) },
      );
    }
  },
};

module.exports._test = {
  unwrapWithViewOnce,
  getContextInfo,
  getViewOnceMedia,
};
