const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { createStatusQuoted } = require("./statusCard");

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(__dirname, "..", "temp");
const MAX_INPUT_BYTES = 80 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 65 * 1024 * 1024;
const MAX_DURATION_SECONDS = 300;

function randomId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureTempDir() { fs.mkdirSync(TEMP_DIR, { recursive: true }); }
function safeUnlink(file) { try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {} }

function contextInfo(msg) {
  return msg?.message?.extendedTextMessage?.contextInfo
    || msg?.message?.imageMessage?.contextInfo
    || msg?.message?.videoMessage?.contextInfo
    || msg?.message?.documentMessage?.contextInfo
    || msg?.message?.audioMessage?.contextInfo
    || {};
}

function quotedEnvelope(msg, type, media) {
  const ctx = contextInfo(msg);
  return {
    key: { remoteJid: msg?.key?.remoteJid, fromMe: false, id: ctx?.stanzaId, participant: ctx?.participant },
    message: { [type]: media }
  };
}

function sourceFromContent(message, envelope) {
  if (message?.audioMessage) return { type: "audio", mimetype: message.audioMessage.mimetype || "audio/ogg", message: envelope };
  if (message?.videoMessage) return { type: "video", mimetype: message.videoMessage.mimetype || "video/mp4", message: envelope };
  if (message?.documentMessage) {
    const mimetype = String(message.documentMessage.mimetype || "");
    if (/^audio\//i.test(mimetype)) return { type: "audio", mimetype, message: envelope, document: true };
    if (/^video\//i.test(mimetype)) return { type: "video", mimetype, message: envelope, document: true };
  }
  return null;
}

function getMediaSource(msg) {
  const direct = sourceFromContent(msg?.message, msg);
  if (direct) return direct;
  const ctx = contextInfo(msg);
  const quoted = ctx?.quotedMessage;
  if (!quoted) return null;
  if (quoted.audioMessage) return sourceFromContent(quoted, quotedEnvelope(msg, "audioMessage", quoted.audioMessage));
  if (quoted.videoMessage) return sourceFromContent(quoted, quotedEnvelope(msg, "videoMessage", quoted.videoMessage));
  if (quoted.documentMessage) return sourceFromContent(quoted, quotedEnvelope(msg, "documentMessage", quoted.documentMessage));
  return null;
}

function extensionFor(source) {
  const mime = String(source?.mimetype || "").toLowerCase();
  if (source?.type === "audio") {
    if (mime.includes("mpeg")) return "mp3";
    if (mime.includes("wav")) return "wav";
    if (mime.includes("m4a") || mime.includes("mp4")) return "m4a";
    if (mime.includes("opus")) return "opus";
    return "ogg";
  }
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  return "mp4";
}

async function probe(file) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-show_entries", "stream=codec_type", "-of", "json", file
  ], { timeout: 15000, maxBuffer: 2 * 1024 * 1024 });
  const data = JSON.parse(stdout || "{}");
  return {
    duration: Number(data?.format?.duration) || 0,
    hasAudio: Array.isArray(data?.streams) && data.streams.some((stream) => stream.codec_type === "audio"),
    hasVideo: Array.isArray(data?.streams) && data.streams.some((stream) => stream.codec_type === "video")
  };
}

function parseTrim(args) {
  const start = Math.max(0, Number(args?.[0]) || 0);
  const duration = Math.max(1, Math.min(120, Number(args?.[1]) || 10));
  return { start, duration };
}

function buildArgs(def, input, output, meta, userArgs = []) {
  const args = ["-y", "-hide_banner", "-loglevel", "error"];
  if (def.trim) {
    const trim = parseTrim(userArgs);
    args.push("-ss", String(trim.start), "-t", String(trim.duration));
  }
  args.push("-i", input);

  if (def.output === "audio") {
    if (!meta.hasAudio) throw new Error("ERR_MEDIA_NO_AUDIO");
    if (def.audioFilter) args.push("-af", def.audioFilter);
    args.push("-vn", "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", def.audioBitrate || "192k", output);
    return args;
  }

  if (!meta.hasVideo) throw new Error("ERR_MEDIA_NO_VIDEO");
  if (def.videoFilter) args.push("-vf", def.videoFilter);
  if (def.audioFilter && meta.hasAudio && !def.mute) args.push("-af", def.audioFilter);
  args.push("-map_metadata", "-1", "-c:v", "libx264", "-preset", "veryfast", "-crf", String(def.crf || 27), "-pix_fmt", "yuv420p");
  if (def.mute || !meta.hasAudio) args.push("-an");
  else args.push("-c:a", "aac", "-b:a", "128k");
  args.push("-movflags", "+faststart", output);
  return args;
}

function smallcaps(text) {
  const map = { a:"ᴀ",b:"ʙ",c:"ᴄ",d:"ᴅ",e:"ᴇ",f:"ғ",g:"ɢ",h:"ʜ",i:"ɪ",j:"ᴊ",k:"ᴋ",l:"ʟ",m:"ᴍ",n:"ɴ",o:"ᴏ",p:"ᴘ",q:"ǫ",r:"ʀ",t:"ᴛ",u:"ᴜ",v:"ᴠ",w:"ᴡ",y:"ʏ",z:"ᴢ" };
  return String(text).replace(/[A-Za-z]/g, (ch) => map[ch.toLowerCase()] || ch.toLowerCase());
}

async function runTransform(def, { conn, msg, args = [], from, requestedName }) {
  const prefix = require("../config/config").prefix || ".";
  const invoked = `${prefix}${requestedName || def.name}`;
  const source = getMediaSource(msg);
  if (!source || (def.input && source.type !== def.input)) {
    const expected = def.input === "audio" ? "áudio" : "vídeo";
    return conn.sendMessage(from, {
      text: smallcaps(`❌ Envie ou responda a um ${expected} e use `) + invoked + (def.trim ? smallcaps(" <início em segundos> <duração em segundos>.") : ".")
    }, { quoted: createStatusQuoted(msg) });
  }

  ensureTempDir();
  const id = randomId();
  const input = path.join(TEMP_DIR, `transform_${id}.${extensionFor(source)}`);
  const output = path.join(TEMP_DIR, `transform_${id}.${def.output === "audio" ? "mp3" : "mp4"}`);

  try {
    await conn.sendMessage(from, { react: { text: "🎛️", key: msg.key } }).catch(() => {});
    const buffer = await downloadMediaMessage(source.message, "buffer", {}, {});
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error("ERR_MEDIA_DOWNLOAD");
    if (buffer.length > MAX_INPUT_BYTES) throw new Error("ERR_MEDIA_TOO_LARGE");
    fs.writeFileSync(input, buffer);

    const meta = await probe(input);
    const durationLimit = Math.min(MAX_DURATION_SECONDS, Math.max(1, Number(def.maxDuration) || MAX_DURATION_SECONDS));
    if (meta.duration > durationLimit) throw new Error("ERR_MEDIA_TOO_LONG");
    if (def.input === "audio" && !meta.hasAudio) throw new Error("ERR_MEDIA_NO_AUDIO");
    if (def.input === "video" && !meta.hasVideo) throw new Error("ERR_MEDIA_NO_VIDEO");

    await execFileAsync("ffmpeg", buildArgs(def, input, output, meta, args), {
      timeout: 180000,
      killSignal: "SIGKILL",
      maxBuffer: 8 * 1024 * 1024
    });

    const stat = fs.statSync(output);
    if (!stat.size) throw new Error("ERR_MEDIA_EMPTY_OUTPUT");
    if (stat.size > MAX_OUTPUT_BYTES) throw new Error("ERR_MEDIA_OUTPUT_TOO_LARGE");
    const result = fs.readFileSync(output);

    if (def.output === "audio") await conn.sendMessage(from, { audio: result, mimetype: "audio/mpeg", ptt: false }, { quoted: createStatusQuoted(msg) });
    else await conn.sendMessage(from, { video: result, mimetype: "video/mp4" }, { quoted: createStatusQuoted(msg) });
    await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
  } catch (error) {
    const code = String(error?.message || "ERR_MEDIA_TRANSFORM");
    console.error(`[MEDIA] ${def.name} | ${code}`);
    const messages = {
      ERR_MEDIA_TOO_LARGE: "A mídia é grande demais para este alterador.",
      ERR_MEDIA_TOO_LONG: "A mídia ultrapassa o limite permitido para este efeito.",
      ERR_MEDIA_NO_AUDIO: "A mídia não possui faixa de áudio.",
      ERR_MEDIA_NO_VIDEO: "A mídia não possui faixa de vídeo.",
      ERR_MEDIA_DOWNLOAD: "Não foi possível baixar a mídia.",
      ERR_MEDIA_OUTPUT_TOO_LARGE: "O resultado ficou grande demais para envio."
    };
    await conn.sendMessage(from, { react: { text: "❌", key: msg.key } }).catch(() => {});
    await conn.sendMessage(from, { text: smallcaps(`❌ ${messages[code] || "Não foi possível processar a mídia."}`) }, { quoted: createStatusQuoted(msg) }).catch(() => {});
  } finally {
    safeUnlink(input);
    safeUnlink(output);
  }
}

module.exports = { getMediaSource, probe, buildArgs, runTransform, parseTrim, MAX_INPUT_BYTES, MAX_OUTPUT_BYTES, MAX_DURATION_SECONDS };
