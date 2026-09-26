const sharp = require("sharp");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { createStatusQuoted } = require("./statusCard");

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
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
    {}
  );
}

function sourceFromContent(rawMessage) {
  const message = unwrapMessageContent(rawMessage);

  if (message?.imageMessage) {
    return {
      media: message.imageMessage,
      downloadType: "image",
      mimetype: message.imageMessage.mimetype || "image/jpeg",
    };
  }

  if (message?.documentMessage) {
    const mimetype = String(message.documentMessage.mimetype || "");
    if (/^image\//i.test(mimetype)) {
      return {
        media: message.documentMessage,
        downloadType: "document",
        mimetype,
      };
    }
  }

  return null;
}

function getImageSource(msg) {
  const direct = sourceFromContent(msg?.message);
  if (direct) return direct;

  const quoted = contextInfo(msg)?.quotedMessage;
  if (!quoted) return null;
  return sourceFromContent(quoted);
}

async function downloadImageSource(source) {
  if (!source?.media || !source?.downloadType) {
    throw new Error("ERR_IMAGE_DOWNLOAD");
  }

  const stream = await downloadContentFromMessage(source.media, source.downloadType);
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);

  if (!buffer.length) throw new Error("ERR_IMAGE_DOWNLOAD");
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error("ERR_IMAGE_TOO_LARGE");
  return buffer;
}

async function normalizeImage(input) {
  try {
    return await sharp(input, { failOn: "none", limitInputPixels: 80_000_000 })
      .rotate()
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
  } catch (error) {
    const coded = new Error("ERR_IMAGE_DECODE");
    coded.cause = error;
    throw coded;
  }
}

async function rawImage(input) {
  const normalized = await normalizeImage(input);
  const { data, info } = await sharp(normalized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { normalized, data, info };
}

async function encodeRaw(data, info) {
  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function forEachPixel(data, info, fn) {
  const channels = info.channels;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * channels;
      fn(data, i, x, y, channels);
    }
  }
}

function applySimpleRaw(effect, data, info) {
  const out = Buffer.from(data);

  forEachPixel(out, info, (buffer, i, x, y) => {
    const r = buffer[i];
    const g = buffer[i + 1];
    const b = buffer[i + 2];
    const l = luminance(r, g, b);

    switch (effect) {
      case "blue":
        buffer[i] = clamp(r * 0.72);
        buffer[i + 1] = clamp(g * 0.86);
        buffer[i + 2] = clamp(b * 1.34 + 12);
        break;
      case "green":
        buffer[i] = clamp(r * 0.76);
        buffer[i + 1] = clamp(g * 1.32 + 8);
        buffer[i + 2] = clamp(b * 0.76);
        break;
      case "red":
        buffer[i] = clamp(r * 1.34 + 10);
        buffer[i + 1] = clamp(g * 0.76);
        buffer[i + 2] = clamp(b * 0.76);
        break;
      case "cold":
        buffer[i] = clamp(r * 0.84);
        buffer[i + 1] = clamp(g * 1.02);
        buffer[i + 2] = clamp(b * 1.2 + 8);
        break;
      case "warm":
        buffer[i] = clamp(r * 1.18 + 7);
        buffer[i + 1] = clamp(g * 1.04 + 2);
        buffer[i + 2] = clamp(b * 0.84);
        break;
      case "dark":
        buffer[i] = clamp(r * 0.55);
        buffer[i + 1] = clamp(g * 0.55);
        buffer[i + 2] = clamp(b * 0.55);
        break;
      case "gray":
        buffer[i] = buffer[i + 1] = buffer[i + 2] = clamp(l);
        break;
      case "bw": {
        const value = clamp((l - 128) * 1.55 + 128);
        buffer[i] = buffer[i + 1] = buffer[i + 2] = value;
        break;
      }
      case "negative":
        buffer[i] = 255 - r;
        buffer[i + 1] = 255 - g;
        buffer[i + 2] = 255 - b;
        break;
      case "saturate": {
        const amount = 1.85;
        buffer[i] = clamp(l + (r - l) * amount);
        buffer[i + 1] = clamp(l + (g - l) * amount);
        buffer[i + 2] = clamp(l + (b - l) * amount);
        break;
      }
      case "dessaturate": {
        const amount = 0.32;
        buffer[i] = clamp(l + (r - l) * amount);
        buffer[i + 1] = clamp(l + (g - l) * amount);
        buffer[i + 2] = clamp(l + (b - l) * amount);
        break;
      }
      case "brightness":
        buffer[i] = clamp(r * 1.3 + 8);
        buffer[i + 1] = clamp(g * 1.3 + 8);
        buffer[i + 2] = clamp(b * 1.3 + 8);
        break;
      case "contrast":
        buffer[i] = clamp((r - 128) * 1.5 + 128);
        buffer[i + 1] = clamp((g - 128) * 1.5 + 128);
        buffer[i + 2] = clamp((b - 128) * 1.5 + 128);
        break;
      case "posterize": {
        const step = 255 / 4;
        buffer[i] = clamp(Math.round(r / step) * step);
        buffer[i + 1] = clamp(Math.round(g / step) * step);
        buffer[i + 2] = clamp(Math.round(b / step) * step);
        break;
      }
      case "solarize":
        buffer[i] = r > 128 ? 255 - r : r;
        buffer[i + 1] = g > 128 ? 255 - g : g;
        buffer[i + 2] = b > 128 ? 255 - b : b;
        break;
      case "sepia":
        buffer[i] = clamp(r * 0.393 + g * 0.769 + b * 0.189);
        buffer[i + 1] = clamp(r * 0.349 + g * 0.686 + b * 0.168);
        buffer[i + 2] = clamp(r * 0.272 + g * 0.534 + b * 0.131);
        break;
      case "vintage": {
        const sr = clamp(r * 0.393 + g * 0.769 + b * 0.189);
        const sg = clamp(r * 0.349 + g * 0.686 + b * 0.168);
        const sb = clamp(r * 0.272 + g * 0.534 + b * 0.131);
        const grain = ((x * 13 + y * 7) % 17) - 8;
        buffer[i] = clamp(r * 0.35 + sr * 0.65 + 10 + grain);
        buffer[i + 1] = clamp(g * 0.35 + sg * 0.65 + 7 + grain);
        buffer[i + 2] = clamp(b * 0.35 + sb * 0.65 + grain);
        break;
      }
      case "fade":
        buffer[i] = clamp(38 + r * 0.75 + (l - r) * 0.12);
        buffer[i + 1] = clamp(38 + g * 0.75 + (l - g) * 0.12);
        buffer[i + 2] = clamp(38 + b * 0.75 + (l - b) * 0.12);
        break;
      case "duotone": {
        const t = l / 255;
        const dark = [18, 26, 48];
        const light = [245, 184, 78];
        buffer[i] = clamp(dark[0] + (light[0] - dark[0]) * t);
        buffer[i + 1] = clamp(dark[1] + (light[1] - dark[1]) * t);
        buffer[i + 2] = clamp(dark[2] + (light[2] - dark[2]) * t);
        break;
      }
      case "thermal": {
        const t = l / 255;
        let rr;
        let gg;
        let bb;
        if (t < 0.25) {
          rr = 0;
          gg = t * 4 * 120;
          bb = 120 + t * 4 * 135;
        } else if (t < 0.5) {
          const p = (t - 0.25) * 4;
          rr = 0;
          gg = 120 + p * 135;
          bb = 255 - p * 180;
        } else if (t < 0.75) {
          const p = (t - 0.5) * 4;
          rr = p * 255;
          gg = 255;
          bb = 75 - p * 75;
        } else {
          const p = (t - 0.75) * 4;
          rr = 255;
          gg = 255 - p * 230;
          bb = 0;
        }
        buffer[i] = clamp(rr);
        buffer[i + 1] = clamp(gg);
        buffer[i + 2] = clamp(bb);
        break;
      }
      case "vignette": {
        const dx = (x - info.width / 2) / (info.width / 2 || 1);
        const dy = (y - info.height / 2) / (info.height / 2 || 1);
        const distance = Math.sqrt(dx * dx + dy * dy);
        const factor = Math.max(0.28, 1 - Math.max(0, distance - 0.35) * 0.8);
        buffer[i] = clamp(r * factor);
        buffer[i + 1] = clamp(g * factor);
        buffer[i + 2] = clamp(b * factor);
        break;
      }
      case "noise": {
        const n = ((x * 29 + y * 47 + (x * y) % 31) % 43) - 21;
        buffer[i] = clamp(r + n);
        buffer[i + 1] = clamp(g + n);
        buffer[i + 2] = clamp(b + n);
        break;
      }
      case "cartoon": {
        const step = 51;
        const sat = 1.35;
        buffer[i] = clamp(Math.round((l + (r - l) * sat) / step) * step);
        buffer[i + 1] = clamp(Math.round((l + (g - l) * sat) / step) * step);
        buffer[i + 2] = clamp(Math.round((l + (b - l) * sat) / step) * step);
        break;
      }
      case "oil": {
        const step = 42.5;
        buffer[i] = clamp(Math.round((r * 0.9 + l * 0.1) / step) * step);
        buffer[i + 1] = clamp(Math.round((g * 0.9 + l * 0.1) / step) * step);
        buffer[i + 2] = clamp(Math.round((b * 0.9 + l * 0.1) / step) * step);
        break;
      }
      case "glow": {
        const boost = Math.max(0, (l - 145) / 110);
        buffer[i] = clamp(r + 45 * boost);
        buffer[i + 1] = clamp(g + 55 * boost);
        buffer[i + 2] = clamp(b + 70 * boost);
        break;
      }
      default:
        break;
    }
  });

  return out;
}

function shiftedChannels(data, info, mode) {
  const out = Buffer.from(data);
  const channels = info.channels;
  const width = info.width;
  const height = info.height;
  const pixelIndex = (x, y) => (y * width + x) * channels;

  for (let y = 0; y < height; y++) {
    const bandShift = mode === "glitch"
      ? (((Math.floor(y / 18) * 17) % 19) - 9)
      : 0;

    for (let x = 0; x < width; x++) {
      const dst = pixelIndex(x, y);

      if (mode === "chromatic") {
        const left = pixelIndex(Math.max(0, x - 6), y);
        const right = pixelIndex(Math.min(width - 1, x + 6), y);
        out[dst] = data[left];
        out[dst + 1] = data[dst + 1];
        out[dst + 2] = data[right + 2];
      } else {
        const sourceX = Math.max(0, Math.min(width - 1, x + bandShift));
        const src = pixelIndex(sourceX, y);
        const redX = Math.max(0, Math.min(width - 1, sourceX - 4));
        const blueX = Math.max(0, Math.min(width - 1, sourceX + 4));
        out[dst] = data[pixelIndex(redX, y)];
        out[dst + 1] = data[src + 1];
        out[dst + 2] = data[pixelIndex(blueX, y) + 2];
      }
    }
  }

  return out;
}

function edgeEffect(data, info, mode) {
  const out = Buffer.alloc(data.length);
  const channels = info.channels;
  const width = info.width;
  const height = info.height;
  const lum = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      lum[y * width + x] = luminance(data[i], data[i + 1], data[i + 2]);
      if (channels === 4) out[i + 3] = data[i + 3];
    }
  }

  const sample = (x, y) =>
    lum[
      Math.max(0, Math.min(height - 1, y)) * width +
        Math.max(0, Math.min(width - 1, x))
    ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx =
        -sample(x - 1, y - 1) +
        sample(x + 1, y - 1) -
        2 * sample(x - 1, y) +
        2 * sample(x + 1, y) -
        sample(x - 1, y + 1) +
        sample(x + 1, y + 1);
      const gy =
        -sample(x - 1, y - 1) -
        2 * sample(x, y - 1) -
        sample(x + 1, y - 1) +
        sample(x - 1, y + 1) +
        2 * sample(x, y + 1) +
        sample(x + 1, y + 1);
      const magnitude = clamp(Math.sqrt(gx * gx + gy * gy));
      const i = (y * width + x) * channels;

      if (mode === "sketch") {
        const v = 255 - magnitude;
        out[i] = out[i + 1] = out[i + 2] = v;
      } else if (mode === "neon") {
        out[i] = clamp(magnitude * 1.25);
        out[i + 1] = clamp(magnitude * 0.55);
        out[i + 2] = clamp(magnitude * 1.5);
      } else {
        out[i] = out[i + 1] = out[i + 2] = magnitude;
      }
    }
  }

  return out;
}

function embossEffect(data, info) {
  const out = Buffer.from(data);
  const channels = info.channels;
  const width = info.width;
  const height = info.height;

  for (let y = 1; y < height; y++) {
    for (let x = 1; x < width; x++) {
      const i = (y * width + x) * channels;
      const prev = ((y - 1) * width + (x - 1)) * channels;
      out[i] = clamp(128 + data[i] - data[prev]);
      out[i + 1] = clamp(128 + data[i + 1] - data[prev + 1]);
      out[i + 2] = clamp(128 + data[i + 2] - data[prev + 2]);
    }
  }

  return out;
}

async function applyImageEffect(input, effect) {
  const normalized = await normalizeImage(input);

  switch (effect) {
    case "blur":
      return sharp(normalized).blur(5).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    case "sharpen":
      return sharp(normalized)
        .sharpen({ sigma: 1.6, m1: 1.3, m2: 2.2 })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
    case "flip":
      return sharp(normalized).flip().jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    case "mirror":
      return sharp(normalized).flop().jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    case "rotate":
      return sharp(normalized).rotate(90).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    case "pixel": {
      const meta = await sharp(normalized).metadata();
      const width = Math.max(1, Number(meta.width) || 1);
      const height = Math.max(1, Number(meta.height) || 1);
      const smallWidth = Math.max(16, Math.round(width / 14));
      const smallHeight = Math.max(16, Math.round(height / 14));
      return sharp(normalized)
        .resize(smallWidth, smallHeight, { kernel: sharp.kernel.nearest })
        .resize(width, height, { kernel: sharp.kernel.nearest })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
    }
    case "frame":
      return sharp(normalized)
        .extend({
          top: 28,
          bottom: 28,
          left: 28,
          right: 28,
          background: { r: 22, g: 22, b: 22, alpha: 1 },
        })
        .extend({
          top: 8,
          bottom: 8,
          left: 8,
          right: 8,
          background: { r: 235, g: 235, b: 235, alpha: 1 },
        })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
    case "oil": {
      const softened = await sharp(normalized).median(3).png().toBuffer();
      const { data, info } = await sharp(softened)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return encodeRaw(applySimpleRaw("oil", data, info), info);
    }
    case "edge":
    case "sketch":
    case "neon": {
      const { data, info } = await rawImage(normalized);
      return encodeRaw(edgeEffect(data, info, effect), info);
    }
    case "emboss": {
      const { data, info } = await rawImage(normalized);
      return encodeRaw(embossEffect(data, info), info);
    }
    case "chromatic":
    case "glitch": {
      const { data, info } = await rawImage(normalized);
      return encodeRaw(shiftedChannels(data, info, effect), info);
    }
    default: {
      const { data, info } = await rawImage(normalized);
      return encodeRaw(applySimpleRaw(effect, data, info), info);
    }
  }
}

function smallcaps(text) {
  const map = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ",
    i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ",
    q: "ǫ", r: "ʀ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", y: "ʏ", z: "ᴢ",
  };
  return String(text).replace(/[A-Za-z]/g, (ch) => map[ch.toLowerCase()] || ch.toLowerCase());
}

async function runImageTransform(def, { conn, msg, from, requestedName }) {
  const prefix = require("../config/config").prefix || ".";
  const invoked = `${prefix}${requestedName || def.name}`;
  const source = getImageSource(msg);

  if (!source) {
    return conn.sendMessage(
      from,
      {
        text: smallcaps(`❌ Envie ou responda a uma imagem e use ${invoked}.`),
      },
      { quoted: createStatusQuoted(msg) },
    );
  }

  try {
    await conn
      .sendMessage(from, { react: { text: def.reaction || "🖼️", key: msg.key } })
      .catch(() => {});

    const input = await downloadImageSource(source);
    const output = await applyImageEffect(input, def.effect);

    if (!Buffer.isBuffer(output) || !output.length) {
      throw new Error("ERR_IMAGE_EMPTY_OUTPUT");
    }

    await conn.sendMessage(
      from,
      {
        image: output,
        caption: `${def.emoji || "🖼️"} *${def.label || def.name}*`,
      },
      { quoted: createStatusQuoted(msg) },
    );

    await conn
      .sendMessage(from, { react: { text: "✅", key: msg.key } })
      .catch(() => {});
  } catch (error) {
    const code = String(error?.message || "ERR_IMAGE_PROCESS");
    const detail = error?.cause?.message || "";
    console.error(`[IMAGE] ${def.name} | ${code}${detail ? ` | ${detail}` : ""}`);

    const messages = {
      ERR_IMAGE_DOWNLOAD:
        "Não foi possível baixar a imagem. Tente reenviar e responder novamente.",
      ERR_IMAGE_TOO_LARGE: "A imagem é grande demais para este efeito.",
      ERR_IMAGE_DECODE:
        "Não foi possível ler essa imagem. Tente reenviar em JPG, PNG ou WEBP.",
      ERR_IMAGE_EMPTY_OUTPUT: "O efeito não gerou uma imagem válida.",
    };

    await conn
      .sendMessage(from, { react: { text: "❌", key: msg.key } })
      .catch(() => {});
    await conn
      .sendMessage(
        from,
        {
          text: smallcaps(
            `❌ ${messages[code] || "Não foi possível processar a imagem."}`,
          ),
        },
        { quoted: createStatusQuoted(msg) },
      )
      .catch(() => {});
  }
}

module.exports = {
  unwrapMessageContent,
  contextInfo,
  getImageSource,
  downloadImageSource,
  normalizeImage,
  applyImageEffect,
  runImageTransform,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION,
};
