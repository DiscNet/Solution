// Menu: Brincadeiras - Interações | Comando: fakechat
const { createStatusQuoted } = require("../../functions/statusCard");

function getContextInfo(msg) {
  const message = msg?.message || {};
  return (
    message?.extendedTextMessage?.contextInfo ||
    message?.imageMessage?.contextInfo ||
    message?.videoMessage?.contextInfo ||
    message?.documentMessage?.contextInfo ||
    message?.audioMessage?.contextInfo ||
    {}
  );
}

function cleanPart(value) {
  return String(value || "").trim();
}

function parseFakeChat(args) {
  const raw = Array.isArray(args) ? args.join(" ") : String(args || "");
  const parts = raw.split("|").map(cleanPart);

  if (parts.length < 3) return null;

  const targetPart = parts.shift();
  const fakeText = parts.shift();
  const replyText = parts.join("|").trim();

  if (!targetPart || !fakeText || !replyText) return null;
  return { targetPart, fakeText, replyText };
}

function getTargetJid(msg) {
  const contextInfo = getContextInfo(msg);
  const mentioned = Array.isArray(contextInfo?.mentionedJid)
    ? contextInfo.mentionedJid.filter(Boolean)
    : [];

  if (mentioned.length) return mentioned[0];

  // Conveniência: se não houver marcação, permite usar o autor da mensagem respondida.
  if (contextInfo?.quotedMessage && contextInfo?.participant) {
    return contextInfo.participant;
  }

  return null;
}

function makeFakeQuoted(from, targetJid, fakeText) {
  return {
    key: {
      remoteJid: from,
      fromMe: false,
      participant: targetJid,
      id: `FAKECHAT_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    },
    message: {
      conversation: fakeText,
    },
  };
}

module.exports = {
  name: "fakechat",
  aliases: ["fakequote", "fchat"],
  description: "cria uma citação falsa de um usuário e faz o bot responder a ela",
  menuCategory: "Brincadeiras",
  menuSection: "Interações",
  usage: "fakechat @usuario | mensagem falsa | resposta",

  async execute(conn, msg, args, from) {
    const parsed = parseFakeChat(args);
    const targetJid = getTargetJid(msg);

    if (!parsed || !targetJid) {
      return conn.sendMessage(
        from,
        {
          text:
            "❌ ᴜsᴏ: .fakechat @usuario | mensagem falsa | resposta\n\n" +
            "ᴇxᴇᴍᴘʟᴏ: .fakechat @usuario | oi gente eu voltei | finalmente apareceu",
        },
        { quoted: createStatusQuoted(msg) },
      );
    }

    const fakeText = parsed.fakeText.slice(0, 1500);
    const replyText = parsed.replyText.slice(0, 3000);

    try {
      const fakeQuoted = makeFakeQuoted(from, targetJid, fakeText);

      await conn.sendMessage(
        from,
        { text: replyText },
        { quoted: fakeQuoted },
      );

      await conn
        .sendMessage(from, { react: { text: "🎭", key: msg.key } })
        .catch(() => {});
    } catch (error) {
      console.error("[FAKECHAT] erro ao criar mensagem falsa:", error);
      await conn.sendMessage(
        from,
        { text: "❌ ɴãᴏ ғᴏɪ ᴘᴏssíᴠᴇʟ ᴄʀɪᴀʀ ᴏ ғᴀᴋᴇᴄʜᴀᴛ." },
        { quoted: createStatusQuoted(msg) },
      );
    }
  },
};

module.exports._test = {
  getContextInfo,
  parseFakeChat,
  getTargetJid,
  makeFakeQuoted,
};
