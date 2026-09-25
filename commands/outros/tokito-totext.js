const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const tokitoApi = require("../../functions/tokitoApi");
const { createStatusQuoted } = require("../../functions/statusCard");

function unwrap(message) {
  let current = message || {};
  for (let i = 0; i < 6; i++) {
    const next = current?.ephemeralMessage?.message || current?.viewOnceMessage?.message || current?.viewOnceMessageV2?.message || current?.viewOnceMessageV2Extension?.message || current;
    if (next === current) break;
    current = next;
  }
  return current;
}

function contextInfo(root) {
  return root?.extendedTextMessage?.contextInfo || root?.imageMessage?.contextInfo ||
    root?.videoMessage?.contextInfo || root?.audioMessage?.contextInfo || root?.documentMessage?.contextInfo || null;
}

function audioFromMessage(msg) {
  const root = unwrap(msg?.message);
  if (root?.audioMessage) return root.audioMessage;
  const quoted = unwrap(contextInfo(root)?.quotedMessage);
  return quoted?.audioMessage || null;
}

async function mediaBuffer(media) {
  const stream = await downloadContentFromMessage(media, "audio");
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function extension(mime) {
  const value = String(mime || "").toLowerCase();
  if (value.includes("mpeg")) return "mp3";
  if (value.includes("mp4")) return "m4a";
  if (value.includes("wav")) return "wav";
  if (value.includes("webm")) return "webm";
  return "ogg";
}

async function uploadTemp(buffer, ext = "ogg") {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error("Áudio vazio.");
  const form = new FormData();
  form.append("file", new Blob([buffer]), "solution_" + Date.now() + "." + ext);
  const response = await fetch("https://tmpfile.link/api/upload", { method: "POST", body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "Falha no upload temporário.");
  const url = String(data?.downloadLink || data?.download_link || data?.url || "").trim();
  if (!/^https?:\/\//i.test(url)) throw new Error("Upload temporário não retornou URL.");
  return url;
}

function transcriptionText(data) {
  const r = data?.resultado || data?.result || {};
  return String(r?.texto || r?.text || data?.texto || data?.text || "").trim();
}

module.exports = {
  name: "totext",
  aliases: ["transcrever", "transcricao", "audiotexto"],
  menuCategory: "Utilidades",
  menuSection: "Tokito API",
  usage: "responda um áudio com .totext",
  description: "Transcreve áudio pela Tokito API",
  async execute(conn, msg, args, from) {
    try {
      await conn.sendMessage(from, { react: { text: "📝", key: msg.key } }).catch(() => {});
      let url = String(args[0] || "").trim();
      if (!/^https?:\/\//i.test(url)) {
        const media = audioFromMessage(msg);
        if (!media) {
          return conn.sendMessage(from, { text: "❌ Responda um áudio/voz com *.totext* ou informe uma URL pública de áudio." }, { quoted: createStatusQuoted(msg) });
        }
        const buffer = await mediaBuffer(media);
        url = await uploadTemp(buffer, extension(media.mimetype));
      }
      const data = await tokitoApi.get("/api/outros/totext", { url }, { timeout: 180000 });
      const text = transcriptionText(data);
      if (!text) throw new Error(data?.message || data?.mensagem || "A API não retornou transcrição.");
      const r = data?.resultado || data?.result || {};
      const meta = [r?.idioma || r?.language, r?.duracao || r?.duration].filter(Boolean).join(" • ");
      await conn.sendMessage(from, {
        text: "📝 *TRANSCRIÇÃO*\n\n" + text.slice(0, 12000) + (meta ? "\n\nℹ️ " + meta : ""),
      }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[TOKITO TOTEXT]", error.message);
      await conn.sendMessage(from, { text: "❌ Não foi possível transcrever o áudio: " + String(error.message || "erro").slice(0, 180) }, { quoted: createStatusQuoted(msg) });
    }
  },
  _internals: { unwrap, contextInfo, audioFromMessage, extension, transcriptionText },
};
