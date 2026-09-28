const fs = require("fs");
const path = require("path");
const { execFileCompat, writableTempDir } = require("./runtimeCompat");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { createStatusQuoted } = require("./statusCard");

const TEMP_DIR = writableTempDir("solution-media");
const MAX_INPUT_BYTES = 80 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 65 * 1024 * 1024;
const MAX_DURATION_SECONDS = 300;

function randomId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureTempDir() {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function safeUnlink(file) {
  try {
    if (file && fs.existsSync(file)) fs.unlinkSync(file);
  } catch {}
}

function unwrapMessageContent(message) {
  let current = message && typeof message === "object" ? message : {};
  for (let i = 0; i < 8; i++) {
    const next =
      current?.ephemeralMessage?.message ||
      current?.viewOnceMessage?.message ||
      current?.viewOnceMessageV2?.message ||
      current?.viewOnceMessageV2Extension?.message ||
      current?.documentWithCaptionMessage?.message;
    if (!next || next === current) break;
    current = next;
  }
  return current || {};
}

function contextInfo(msg) {
  const message = unwrapMessageContent(msg?.message);
  return (
    message?.extendedTextMessage?.contextInfo ||
    message?.imageMessage?.contextInfo ||
    message?.videoMessage?.contextInfo ||
    message?.documentMessage?.contextInfo ||
    message?.audioMessage?.contextInfo ||
    {}
  );
}

function sourceFromContent(rawMessage) {
  const message = unwrapMessageContent(rawMessage);
  if (message?.audioMessage) {
    return {
      type: "audio",
      downloadType: "audio",
      mimetype: message.audioMessage.mimetype || "audio/ogg",
      media: message.audioMessage,
    };
  }
  if (message?.videoMessage) {
    return {
      type: "video",
      downloadType: "video",
      mimetype: message.videoMessage.mimetype || "video/mp4",
      media: message.videoMessage,
    };
  }
  if (message?.documentMessage) {
    const mimetype = String(message.documentMessage.mimetype || "");
    if (/^audio\//i.test(mimetype)) {
      return {
        type: "audio",
        downloadType: "document",
        mimetype,
        media: message.documentMessage,
        document: true,
      };
    }
    if (/^video\//i.test(mimetype)) {
      return {
        type: "video",
        downloadType: "document",
        mimetype,
        media: message.documentMessage,
        document: true,
      };
    }
  }
  return null;
}

function getMediaSource(msg) {
  const direct = sourceFromContent(msg?.message);
  if (direct) return direct;

  const quoted = contextInfo(msg)?.quotedMessage;
  if (!quoted) return null;
  return sourceFromContent(quoted);
}

async function downloadSource(source) {
  if (!source?.media || !source?.downloadType) throw new Error("ERR_MEDIA_DOWNLOAD");
  const stream = await downloadContentFromMessage(source.media, source.downloadType);
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);
  if (!buffer.length) throw new Error("ERR_MEDIA_DOWNLOAD");
  return buffer;
}

function extensionFor(source) {
  const mime = String(source?.mimetype || "").toLowerCase();
  if (source?.type === "audio") {
    if (mime.includes("mpeg")) return "mp3";
    if (mime.includes("wav")) return "wav";
    if (mime.includes("aac")) return "aac";
    if (mime.includes("m4a") || mime.includes("mp4")) return "m4a";
    if (mime.includes("opus")) return "opus";
    return "ogg";
  }
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  return "mp4";
}

function codedError(code, cause) {
  const error = new Error(code);
  if (cause) error.cause = cause;
  return error;
}

async function probe(file) {
  let stdout;
  try {
    ({ stdout } = await execFileCompat(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-show_entries",
        "stream=codec_type",
        "-of",
        "json",
        file,
      ],
      { timeout: 15000, maxBuffer: 2 * 1024 * 1024 },
    ));
  } catch (error) {
    if (error?.code === "ERR_EXEC_MISSING") {
      throw codedError("ERR_MEDIA_TOOLS_MISSING", error);
    }
    if (error?.code === "ERR_EXEC_PERMISSION") {
      throw codedError("ERR_MEDIA_TOOLS_PERMISSION", error);
    }
    throw codedError("ERR_MEDIA_PROBE", error);
  }

  let data;
  try {
    data = JSON.parse(stdout || "{}");
  } catch (error) {
    throw codedError("ERR_MEDIA_PROBE", error);
  }

  return {
    duration: Number(data?.format?.duration) || 0,
    hasAudio:
      Array.isArray(data?.streams) &&
      data.streams.some((stream) => stream.codec_type === "audio"),
    hasVideo:
      Array.isArray(data?.streams) &&
      data.streams.some((stream) => stream.codec_type === "video"),
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
    args.push(
      "-vn",
      "-map_metadata",
      "-1",
      "-c:a",
      "libmp3lame",
      "-b:a",
      def.audioBitrate || "192k",
      output,
    );
    return args;
  }

  if (!meta.hasVideo) throw new Error("ERR_MEDIA_NO_VIDEO");
  if (def.videoFilter) args.push("-vf", def.videoFilter);
  if (def.audioFilter && meta.hasAudio && !def.mute) {
    args.push("-af", def.audioFilter);
  }
  args.push(
    "-map_metadata",
    "-1",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    String(def.crf || 27),
    "-pix_fmt",
    "yuv420p",
  );
  if (def.mute || !meta.hasAudio) args.push("-an");
  else args.push("-c:a", "aac", "-b:a", "128k");
  args.push("-movflags", "+faststart", output);
  return args;
}

function smallcaps(text) {
  const map = {
    a: "ᴀ",
    b: "ʙ",
    c: "ᴄ",
    d: "ᴅ",
    e: "ᴇ",
    f: "ғ",
    g: "ɢ",
    h: "ʜ",
    i: "ɪ",
    j: "ᴊ",
    k: "ᴋ",
    l: "ʟ",
    m: "ᴍ",
    n: "ɴ",
    o: "ᴏ",
    p: "ᴘ",
    q: "ǫ",
    r: "ʀ",
    t: "ᴛ",
    u: "ᴜ",
    v: "ᴠ",
    w: "ᴡ",
    y: "ʏ",
    z: "ᴢ",
  };
  return String(text).replace(
    /[A-Za-z]/g,
    (ch) => map[ch.toLowerCase()] || ch.toLowerCase(),
  );
}

async function executeFfmpeg(def, input, output, meta, userArgs) {
  const run = async (activeDef) => {
    try {
      await execFileCompat("ffmpeg", buildArgs(activeDef, input, output, meta, userArgs), {
        timeout: 180000,
        killSignal: "SIGKILL",
        maxBuffer: 8 * 1024 * 1024,
      });
    } catch (error) {
      if (error?.code === "ERR_EXEC_MISSING") {
        throw codedError("ERR_MEDIA_TOOLS_MISSING", error);
      }
      if (error?.code === "ERR_EXEC_PERMISSION") {
        throw codedError("ERR_MEDIA_TOOLS_PERMISSION", error);
      }
      throw error;
    }
  };

  try {
    await run(def);
  } catch (firstError) {
    if (!def.audioFilterFallback || !def.audioFilter) {
      if (String(firstError?.message || "").startsWith("ERR_MEDIA_")) throw firstError;
      throw codedError("ERR_MEDIA_FFMPEG", firstError);
    }

    safeUnlink(output);
    const fallbackDef = {
      ...def,
      audioFilter: def.audioFilterFallback,
      audioFilterFallback: null,
    };
    try {
      await run(fallbackDef);
    } catch (fallbackError) {
      if (String(fallbackError?.message || "").startsWith("ERR_MEDIA_")) {
        throw fallbackError;
      }
      const combined = codedError("ERR_MEDIA_FFMPEG", fallbackError);
      combined.firstCause = firstError;
      throw combined;
    }
  }
}

async function runTransform(def, { conn, msg, args = [], from, requestedName }) {
  const prefix = require("../../config/config").prefix || ".";
  const invoked = `${prefix}${requestedName || def.name}`;
  const source = getMediaSource(msg);

  if (!source || (def.input && source.type !== def.input)) {
    const expected = def.input === "audio" ? "áudio" : "vídeo";
    return conn.sendMessage(
      from,
      {
        text:
          smallcaps(`❌ Envie ou responda a um ${expected} e use `) +
          invoked +
          (def.trim
            ? smallcaps(" <início em segundos> <duração em segundos>.")
            : "."),
      },
      { quoted: createStatusQuoted(msg) },
    );
  }

  ensureTempDir();
  const id = randomId();
  const input = path.join(TEMP_DIR, `transform_${id}_in.${extensionFor(source)}`);
  const output = path.join(
    TEMP_DIR,
    `transform_${id}_out.${def.output === "audio" ? "mp3" : "mp4"}`,
  );

  try {
    await conn
      .sendMessage(from, { react: { text: "🎛️", key: msg.key } })
      .catch(() => {});

    const buffer = await downloadSource(source);
    if (buffer.length > MAX_INPUT_BYTES) throw new Error("ERR_MEDIA_TOO_LARGE");
    fs.writeFileSync(input, buffer);

    const meta = await probe(input);
    const durationLimit = Math.min(
      MAX_DURATION_SECONDS,
      Math.max(1, Number(def.maxDuration) || MAX_DURATION_SECONDS),
    );
    if (meta.duration > durationLimit) throw new Error("ERR_MEDIA_TOO_LONG");
    if (def.input === "audio" && !meta.hasAudio) {
      throw new Error("ERR_MEDIA_NO_AUDIO");
    }
    if (def.input === "video" && !meta.hasVideo) {
      throw new Error("ERR_MEDIA_NO_VIDEO");
    }

    await executeFfmpeg(def, input, output, meta, args);

    if (!fs.existsSync(output)) throw new Error("ERR_MEDIA_EMPTY_OUTPUT");
    const stat = fs.statSync(output);
    if (!stat.size) throw new Error("ERR_MEDIA_EMPTY_OUTPUT");
    if (stat.size > MAX_OUTPUT_BYTES) {
      throw new Error("ERR_MEDIA_OUTPUT_TOO_LARGE");
    }
    const result = fs.readFileSync(output);

    if (def.output === "audio") {
      await conn.sendMessage(
        from,
        { audio: result, mimetype: "audio/mpeg", ptt: false },
        { quoted: createStatusQuoted(msg) },
      );
    } else {
      await conn.sendMessage(
        from,
        { video: result, mimetype: "video/mp4" },
        { quoted: createStatusQuoted(msg) },
      );
    }

    await conn
      .sendMessage(from, { react: { text: "✅", key: msg.key } })
      .catch(() => {});
  } catch (error) {
    const code = String(error?.message || "ERR_MEDIA_TRANSFORM");
    const detail =
      error?.cause?.stderr ||
      error?.cause?.message ||
      error?.stderr ||
      error?.firstCause?.stderr ||
      "";
    console.error(`[MEDIA] ${def.name} | ${code}${detail ? ` | ${detail}` : ""}`);

    const messages = {
      ERR_MEDIA_TOO_LARGE: "A mídia é grande demais para este alterador.",
      ERR_MEDIA_TOO_LONG: "A mídia ultrapassa o limite permitido para este efeito.",
      ERR_MEDIA_NO_AUDIO: "A mídia não possui faixa de áudio.",
      ERR_MEDIA_NO_VIDEO: "A mídia não possui faixa de vídeo.",
      ERR_MEDIA_DOWNLOAD:
        "Não foi possível baixar a mídia. Tente reenviar o arquivo e responder novamente.",
      ERR_MEDIA_OUTPUT_TOO_LARGE:
        "O resultado ficou grande demais para envio.",
      ERR_MEDIA_EMPTY_OUTPUT: "O efeito não gerou um arquivo válido.",
      ERR_MEDIA_PROBE:
        "Não foi possível identificar o formato da mídia. Tente reenviar como arquivo comum.",
      ERR_MEDIA_TOOLS_MISSING:
        "FFmpeg/FFprobe não está instalado ou não foi encontrado neste ambiente.",
      ERR_MEDIA_TOOLS_PERMISSION:
        "O Android/Termux bloqueou a execução do FFmpeg/FFprobe. O bot agora procura primeiro os binários internos do Termux; confirme que ffmpeg está instalado pelo gerenciador de pacotes do Termux.",
      ERR_MEDIA_FFMPEG:
        "O FFmpeg não conseguiu processar este arquivo. Tente reenviar a mídia em um formato comum.",
    };

    await conn
      .sendMessage(from, { react: { text: "❌", key: msg.key } })
      .catch(() => {});
    await conn
      .sendMessage(
        from,
        {
          text: smallcaps(
            `❌ ${messages[code] || "Não foi possível processar a mídia."}`,
          ),
        },
        { quoted: createStatusQuoted(msg) },
      )
      .catch(() => {});
  } finally {
    safeUnlink(input);
    safeUnlink(output);
  }
}

module.exports = {
  unwrapMessageContent,
  contextInfo,
  getMediaSource,
  downloadSource,
  probe,
  buildArgs,
  runTransform,
  parseTrim,
  MAX_INPUT_BYTES,
  MAX_OUTPUT_BYTES,
  MAX_DURATION_SECONDS,
};
