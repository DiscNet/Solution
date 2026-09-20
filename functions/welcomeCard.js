const dns = require("dns");
const net = require("net");
const axios = require("axios");
const sharp = require("sharp");

const CARD_SIZE = 1080;
const CARD_INSET = 24;
const CARD_RADIUS = 42;
const NEON_COLORS = ["#ff1744", "#00a8ff", "#39ff14", "#a855f7"];
const MAX_REMOTE_BYTES = 15 * 1024 * 1024;

function cleanText(value, maxLength) {
  return String(value || "").replace(/\r/g, "").trim().slice(0, maxLength);
}

function sanitizeInput(input = {}) {
  return {
    backgroundUrl: String(input.backgroundUrl || input.fundo || "").trim(),
    mainImageUrl: String(input.mainImageUrl || input.imagem || input.avatar || "").trim(),
    text1: cleanText(input.text1 ?? input.texto1 ?? input.textoCima, 160),
    text2: cleanText(input.text2 ?? input.texto2 ?? input.textoPrincipal, 360),
    text3: cleanText(input.text3 ?? input.texto3 ?? input.textoBaixo, 180),
  };
}

function parseCommandInput(raw) {
  const parts = String(raw || "").split("|").map((part) => part.trim());
  if (parts.length < 5) return null;
  return sanitizeInput({
    backgroundUrl: parts[0],
    mainImageUrl: parts[1],
    text1: parts[2],
    text2: parts[3],
    text3: parts.slice(4).join(" | "),
  });
}

function isPrivateIp(address) {
  const value = String(address || "").toLowerCase();
  if (!value) return true;
  if (value.startsWith("::ffff:")) return isPrivateIp(value.slice(7));
  if (net.isIPv6(value)) {
    return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") ||
      value.startsWith("fe8") || value.startsWith("fe9") || value.startsWith("fea") || value.startsWith("feb");
  }
  if (!net.isIPv4(value)) return true;
  const parts = value.split(".").map(Number);
  const a = parts[0];
  const b = parts[1];
  if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  return false;
}

async function assertPublicHostname(hostname) {
  if (!hostname) throw new Error("Hostname inválido.");
  const stripped = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(stripped)) {
    if (isPrivateIp(stripped)) throw new Error("Endereços de rede interna não são permitidos.");
    return;
  }
  const addresses = await dns.promises.lookup(stripped, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => isPrivateIp(item.address))) {
    throw new Error("O endereço informado aponta para uma rede não permitida.");
  }
}

async function fetchRemoteImage(urlValue) {
  let current;
  try {
    current = new URL(urlValue);
  } catch {
    throw new Error("URL de imagem inválida.");
  }

  if (!["http:", "https:"].includes(current.protocol)) {
    throw new Error("Apenas URLs HTTP/HTTPS são permitidas.");
  }

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    await assertPublicHostname(current.hostname);

    const response = await axios.get(current.toString(), {
      responseType: "arraybuffer",
      timeout: 8000,
      maxRedirects: 0,
      validateStatus: (status) =>
        (status >= 200 && status < 300) || (status >= 300 && status < 400),
      maxContentLength: MAX_REMOTE_BYTES,
      maxBodyLength: MAX_REMOTE_BYTES,
      headers: { "user-agent": "SolutionBot/testwelcome" },
    });

    if (response.status >= 300 && response.status < 400) {
      if (!response.headers.location) throw new Error("Redirecionamento remoto inválido.");
      current = new URL(response.headers.location, current);
      if (!["http:", "https:"].includes(current.protocol)) {
        throw new Error("Redirecionamento para protocolo não permitido.");
      }
      continue;
    }

    const contentType = String(response.headers["content-type"] || "").toLowerCase();
    if (contentType && !contentType.startsWith("image/")) {
      throw new Error("A URL informada não retornou uma imagem.");
    }

    const raw = Buffer.from(response.data);
    if (!raw.length || raw.length > MAX_REMOTE_BYTES) {
      throw new Error("Imagem remota inválida ou muito grande.");
    }

    const metadata = await sharp(raw, {
      failOn: "error",
      limitInputPixels: 40_000_000,
      sequentialRead: true,
    }).metadata();

    if (!metadata.width || !metadata.height || metadata.width * metadata.height > 40_000_000) {
      throw new Error("As dimensões da imagem são inválidas ou grandes demais.");
    }

    return sharp(raw, { failOn: "error", limitInputPixels: 40_000_000 })
      .rotate()
      .png({ compressionLevel: 8 })
      .toBuffer();
  }

  throw new Error("A URL excedeu o limite de redirecionamentos.");
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function splitGraphemes(text) {
  const value = String(text || "");
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    return Array.from(
      new Intl.Segmenter("pt-BR", { granularity: "grapheme" }).segment(value),
      (item) => item.segment
    );
  }
  return Array.from(value);
}

function isEmojiGrapheme(value) {
  return /\p{Extended_Pictographic}/u.test(value) || /[\u2600-\u27BF]/u.test(value);
}

function approxWidth(text, fontSize) {
  let total = 0;
  for (const grapheme of splitGraphemes(text)) {
    if (/^\s+$/u.test(grapheme)) total += fontSize * 0.32;
    else if (isEmojiGrapheme(grapheme)) total += fontSize * 1.04;
    else if (/^[MW@#%&]$/u.test(grapheme)) total += fontSize * 0.8;
    else if (/^[ilI1.,'|]$/u.test(grapheme)) total += fontSize * 0.3;
    else total += fontSize * 0.58;
  }
  return total;
}

function wrapWords(text, maxWidth, fontSize, maxLines) {
  const words = String(text || "").replace(/\r/g, "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (!line || approxWidth(next, fontSize) <= maxWidth) {
      line = next;
    } else {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    }
  }

  if (line && lines.length < maxLines) lines.push(line);

  if (lines.length === maxLines) {
    const consumed = lines.join(" ").split(/\s+/).length;
    if (consumed < words.length) {
      let last = lines[maxLines - 1];
      while (last.length > 4 && approxWidth(last + "…", fontSize) > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = last.replace(/[\s.,;:!?-]+$/g, "") + "…";
    }
  }
  return lines;
}

function fitBlock(text, maxWidth, startSize, maxLines, minSize = 26) {
  for (let size = startSize; size >= minSize; size -= 4) {
    const lines = wrapWords(text, maxWidth, size, maxLines);
    if (lines.length <= maxLines && lines.every((line) => approxWidth(line, size) <= maxWidth)) {
      return { size, lines };
    }
  }
  return { size: minSize, lines: wrapWords(text, maxWidth, minSize, maxLines) };
}

function textBlockSvg(options) {
  const text = options.text;
  if (!String(text || "").trim()) return "";

  const layout = fitBlock(text, options.maxWidth, options.startSize, options.maxLines);
  const measured = Math.max(...layout.lines.map((line) => approxWidth(line, layout.size)));
  const horizontalPadding = options.strong ? 38 : 32;
  const verticalPadding = options.strong ? 22 : 18;
  const lineHeight = Math.round(layout.size * (options.strong ? 1.22 : 1.18));
  const minWidth = options.strong ? 220 : 160;
  const blockWidth = Math.min(
    options.maxWidth + horizontalPadding * 2,
    Math.max(minWidth, Math.ceil(measured + horizontalPadding * 2))
  );
  const textHeight = layout.size + Math.max(0, layout.lines.length - 1) * lineHeight;
  const blockHeight = Math.ceil(textHeight + verticalPadding * 2);
  const x = (CARD_SIZE - blockWidth) / 2;
  const y = options.centerY - blockHeight / 2;
  const startY = options.centerY - ((layout.lines.length - 1) * lineHeight) / 2;

  const tspans = layout.lines.map((line, index) => {
    const lineY = startY + index * lineHeight;
    return '<text x="540" y="' + lineY + '" text-anchor="middle" dominant-baseline="middle" ' +
      'font-family="Noto Color Emoji,Segoe UI Emoji,Apple Color Emoji,DejaVu Sans,Arial,sans-serif" font-size="' + layout.size + '" font-weight="700" ' +
      'fill="#ffffff" stroke="#03050a" stroke-width="' + (options.strong ? 11 : 8) + '" ' +
      'paint-order="stroke" stroke-linejoin="round">' + escapeXml(line) + '</text>';
  }).join("");

  return '<g><rect x="' + x + '" y="' + y + '" width="' + blockWidth + '" height="' + blockHeight +
    '" rx="' + (options.strong ? 22 : 17) + '" fill="' +
    (options.strong ? 'rgba(5,7,14,0.78)' : 'rgba(5,7,14,0.66)') + '" stroke="' + options.neon +
    '" stroke-opacity="' + (options.strong ? 0.62 : 0.46) + '" stroke-width="' +
    (options.strong ? 3 : 2) + '"/><g filter="url(#textGlow)">' + tspans + '</g></g>';
}

function buildOverlaySvg(params) {
  const text1 = textBlockSvg({
    text: params.text1, centerY: 132, maxWidth: 870, startSize: 52, maxLines: 2, neon: params.neon
  });
  const text2 = textBlockSvg({
    text: params.text2, centerY: 720, maxWidth: 900, startSize: 78, maxLines: 4, neon: params.neon, strong: true
  });
  const text3 = textBlockSvg({
    text: params.text3, centerY: 925, maxWidth: 870, startSize: 42, maxLines: 2, neon: params.neon
  });

  const innerSize = CARD_SIZE - CARD_INSET * 2;
  const svg =
    '<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<clipPath id="cardClip"><rect x="' + CARD_INSET + '" y="' + CARD_INSET + '" width="' + innerSize +
      '" height="' + innerSize + '" rx="' + CARD_RADIUS + '"/></clipPath>' +
    '<filter id="frameGlow" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur stdDeviation="18"/></filter>' +
    '<filter id="avatarGlow" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="16"/></filter>' +
    '<filter id="textGlow" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#03050c" stop-opacity="0.48"/><stop offset="45%" stop-color="#03050c" stop-opacity="0.22"/><stop offset="100%" stop-color="#03050c" stop-opacity="0.62"/></linearGradient>' +
    '</defs>' +
    '<rect x="' + CARD_INSET + '" y="' + CARD_INSET + '" width="' + innerSize + '" height="' + innerSize +
      '" rx="' + CARD_RADIUS + '" fill="url(#shade)" clip-path="url(#cardClip)"/>' +
    '<rect x="30" y="30" width="1020" height="1020" rx="' + (CARD_RADIUS - 4) +
      '" fill="none" stroke="' + params.neon + '" stroke-opacity="0.78" stroke-width="15" filter="url(#frameGlow)"/>' +
    '<rect x="' + CARD_INSET + '" y="' + CARD_INSET + '" width="' + innerSize + '" height="' + innerSize +
      '" rx="' + CARD_RADIUS + '" fill="none" stroke="' + params.neon + '" stroke-width="6"/>' +
    '<rect x="30.5" y="30.5" width="1019" height="1019" rx="' + (CARD_RADIUS - 7) +
      '" fill="none" stroke="#ffffff" stroke-opacity="0.96" stroke-width="1"/>' +
    '<circle cx="540" cy="395" r="146" fill="none" stroke="' + params.neon +
      '" stroke-opacity="0.78" stroke-width="18" filter="url(#avatarGlow)"/>' +
    '<circle cx="540" cy="395" r="140" fill="none" stroke="' + params.neon + '" stroke-width="11"/>' +
    '<circle cx="540" cy="395" r="128" fill="none" stroke="#ffffff" stroke-opacity="0.88" stroke-width="3"/>' +
    text1 + text2 + text3 +
    '</svg>';

  return Buffer.from(svg);
}

async function prepareCircularImage(buffer) {
  const size = 260;
  const normalized = await sharp(buffer, { limitInputPixels: 40_000_000 })
    .resize(size, size, { fit: "cover", position: "attention" })
    .png()
    .toBuffer();

  const mask = Buffer.from(
    '<svg width="260" height="260" xmlns="http://www.w3.org/2000/svg"><circle cx="130" cy="130" r="130" fill="#fff"/></svg>'
  );

  return sharp(normalized)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

function buildCardMaskSvg() {
  const innerSize = CARD_SIZE - CARD_INSET * 2;
  return Buffer.from(
    '<svg width="' + CARD_SIZE + '" height="' + CARD_SIZE + '" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="' + CARD_INSET + '" y="' + CARD_INSET + '" width="' + innerSize + '" height="' + innerSize +
      '" rx="' + CARD_RADIUS + '" fill="#ffffff"/>' +
    '</svg>'
  );
}

async function prepareRoundedBackground(buffer) {
  const resized = await sharp(buffer, { limitInputPixels: 40_000_000 })
    .resize(CARD_SIZE, CARD_SIZE, { fit: "cover", position: "attention" })
    .blur(8)
    .modulate({
      brightness: 0.72,
      saturation: 0.94,
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  return sharp(resized)
    .composite([{ input: buildCardMaskSvg(), blend: "dest-in" }])
    .png({ compressionLevel: 8 })
    .toBuffer();
}

async function generateWelcomeCard(input, options = {}) {
  const params = sanitizeInput(input);
  if (!params.backgroundUrl) throw new Error("Informe a imagem de fundo.");
  if (!params.mainImageUrl) throw new Error("Informe a imagem principal.");

  const images = await Promise.all([
    fetchRemoteImage(params.backgroundUrl),
    fetchRemoteImage(params.mainImageUrl),
  ]);

  const neon = options.neon && /^#[0-9a-f]{6}$/i.test(options.neon)
    ? options.neon
    : NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];

  const background = await prepareRoundedBackground(images[0]);

  const mainImage = await prepareCircularImage(images[1]);
  const overlay = buildOverlaySvg({
    text1: params.text1,
    text2: params.text2,
    text3: params.text3,
    neon,
  });

  return sharp(background)
    .composite([
      { input: mainImage, left: 410, top: 265 },
      { input: overlay, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 8 })
    .toBuffer();
}

module.exports = {
  CARD_SIZE,
  CARD_INSET,
  CARD_RADIUS,
  NEON_COLORS,
  parseCommandInput,
  sanitizeInput,
  generateWelcomeCard,
  _internals: {
    cleanText,
    escapeXml,
    splitGraphemes,
    isEmojiGrapheme,
    approxWidth,
    wrapWords,
    fitBlock,
    isPrivateIp,
    buildOverlaySvg,
    buildCardMaskSvg,
    prepareRoundedBackground,
  },
};
