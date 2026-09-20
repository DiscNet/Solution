const axios = require("axios");
const sharp = require("sharp");
const { _internals: welcomeInternals } = require("./welcomeCard");

const WIDTH = 1680;
const HEIGHT = 720;
const AVATAR_SIZE = 600;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function sanitizeInput(input = {}) {
  const gamertag = cleanText(input.gamertag, 38);
  const name = cleanText(input.name || input.nome, 60) || gamertag || "Perfil";
  const status = cleanText(input.status, 42);
  const bio = cleanText(input.bio, 300);
  const accent = /^#[0-9a-f]{6}$/i.test(String(input.accent || ""))
    ? String(input.accent).toLowerCase()
    : "";

  return { name, gamertag, status, bio, accent };
}

function hexToRgba(hex, alpha) {
  const value = String(hex || "#d9d9d9").replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${Number.isFinite(r) ? r : 217},${Number.isFinite(g) ? g : 217},${Number.isFinite(b) ? b : 217},${alpha})`;
}

function approxWidth(text, fontSize) {
  return welcomeInternals.approxWidth(String(text || ""), fontSize);
}

function fitFont(text, maxWidth, startSize, minSize) {
  for (let size = startSize; size >= minSize; size -= 2) {
    if (approxWidth(text, size) <= maxWidth) return size;
  }
  return minSize;
}

function wrapText(text, maxWidth, size, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  let consumed = 0;

  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (!line || approxWidth(next, size) <= maxWidth) {
      line = next;
      consumed += 1;
    } else {
      lines.push(line);
      if (lines.length >= maxLines) break;
      line = word;
      consumed += 1;
    }
  }

  if (line && lines.length < maxLines) lines.push(line);

  if (consumed < words.length && lines.length) {
    const index = Math.min(maxLines, lines.length) - 1;
    let last = lines[index];
    while (last.length > 4 && approxWidth(last + "…", size) > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[index] = last.replace(/[\s.,;:!?-]+$/g, "") + "…";
  }

  return lines.slice(0, maxLines);
}

async function fetchImageBuffer(url) {
  const rawUrl = String(url || "").trim();
  if (!/^https?:\/\//i.test(rawUrl)) {
    throw new Error("URL de avatar inválida.");
  }

  const response = await axios.get(rawUrl, {
    responseType: "arraybuffer",
    timeout: 12000,
    maxRedirects: 3,
    maxContentLength: MAX_IMAGE_BYTES,
    maxBodyLength: MAX_IMAGE_BYTES,
    validateStatus: status => status >= 200 && status < 300,
    headers: { "user-agent": "SolutionBot/ProfileCardV2" },
  });

  const raw = Buffer.from(response.data);
  if (!raw.length || raw.length > MAX_IMAGE_BYTES) {
    throw new Error("Avatar inválido ou muito grande.");
  }

  return sharp(raw, {
    failOn: "error",
    limitInputPixels: 40_000_000,
  }).rotate().png().toBuffer();
}

async function createFallbackAvatar(name = "Perfil") {
  const parts = cleanText(name, 60).split(/\s+/).filter(Boolean);
  const initials = (parts.length > 1
    ? (parts[0][0] + parts[1][0])
    : (parts[0] || "P").slice(0, 2)
  ).toUpperCase();

  const svg = Buffer.from(
    '<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#171923"/><stop offset="100%" stop-color="#090b11"/>' +
      '</linearGradient></defs>' +
      '<rect width="600" height="600" rx="32" fill="url(#g)"/>' +
      '<text x="300" y="330" text-anchor="middle" dominant-baseline="middle" ' +
        'font-family="DejaVu Sans,Arial,sans-serif" font-size="180" font-weight="700" fill="#f7f8fb">' +
        escapeXml(initials) +
      '</text>' +
    '</svg>'
  );
  return sharp(svg).png().toBuffer();
}

async function prepareAvatar(buffer) {
  const normalized = await sharp(buffer, { limitInputPixels: 40_000_000 })
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "attention" })
    .ensureAlpha()
    .png()
    .toBuffer();

  const mask = Buffer.from(
    '<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="600" height="600" rx="29" fill="#fff"/>' +
    '</svg>'
  );

  return sharp(normalized)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

function buildBackgroundSvg(accent) {
  return Buffer.from(
    '<svg width="1680" height="720" viewBox="0 0 1680 720" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<linearGradient id="bg" x1="0" y1="0" x2="1680" y2="720">' +
          '<stop offset="0%" stop-color="#090b11"/>' +
          '<stop offset="52%" stop-color="#0d1018"/>' +
          '<stop offset="100%" stop-color="#12101a"/>' +
        '</linearGradient>' +
        '<radialGradient id="accentGlow" cx="82%" cy="16%" r="52%">' +
          '<stop offset="0%" stop-color="' + accent + '" stop-opacity=".13"/>' +
          '<stop offset="100%" stop-color="' + accent + '" stop-opacity="0"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<rect width="1680" height="720" fill="url(#bg)"/>' +
      '<rect width="1680" height="720" fill="url(#accentGlow)"/>' +
      Array.from({ length: 7 }, (_, i) => {
        const y = 92 + i * 92;
        return '<line x1="705" y1="' + y + '" x2="1626" y2="' + y + '" stroke="#ffffff" stroke-opacity=".055" stroke-width="1"/>';
      }).join("") +
    '</svg>'
  );
}

function buildOverlaySvg(params) {
  const left = 720;
  const right = 1620;
  const contentWidth = right - left;
  const titleSize = fitFont(params.name, contentWidth, 64, 38);
  const handle = params.gamertag
    ? (params.gamertag.startsWith("@") ? params.gamertag : "@" + params.gamertag)
    : "";

  const bioLines = wrapText(params.bio || "Sem descrição.", contentWidth, 32, 4);
  const statusWidth = params.status
    ? Math.min(480, Math.max(138, Math.ceil(approxWidth(params.status, 23) + 56)))
    : 0;

  const bioSvg = bioLines.map((line, index) =>
    '<text x="' + left + '" y="' + (382 + index * 44) + '" ' +
      'font-family="DejaVu Sans,Arial,sans-serif" font-size="32" font-weight="700" ' +
      'fill="#f5f6fa" fill-opacity=".92">' + escapeXml(line) + '</text>'
  ).join("");

  const handleSvg = handle && handle !== params.name
    ? '<text x="' + left + '" y="210" font-family="DejaVu Sans,Arial,sans-serif" ' +
        'font-size="30" font-weight="700" fill="#e7e9f1" fill-opacity=".82">' +
        escapeXml(handle) + '</text>'
    : "";

  const statusSvg = params.status
    ? '<g>' +
        '<rect x="' + left + '" y="240" width="' + statusWidth + '" height="52" rx="26" ' +
          'fill="' + params.accent + '" fill-opacity=".14" stroke="' + params.accent + '" stroke-opacity=".56" stroke-width="1.8"/>' +
        '<text x="' + (left + 28) + '" y="267" dominant-baseline="middle" ' +
          'font-family="DejaVu Sans,Arial,sans-serif" font-size="23" font-weight="700" fill="#f5f6fa">' +
          escapeXml(params.status) + '</text>' +
      '</g>'
    : "";

  const footerDots = Array.from({ length: 4 }, (_, index) => {
    const x = left + 380 + index * 42;
    const r = index === 0 ? 7 : 5;
    return '<circle cx="' + x + '" cy="635" r="' + r + '" fill="none" stroke="' +
      (index === 0 ? params.accent : "#ffffff") + '" stroke-opacity="' +
      (index === 0 ? ".75" : ".18") + '" stroke-width="2"/>';
  }).join("");

  return Buffer.from(
    '<svg width="1680" height="720" viewBox="0 0 1680 720" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<filter id="avatarGlow" x="-20%" y="-20%" width="140%" height="140%">' +
          '<feGaussianBlur stdDeviation="10"/>' +
        '</filter>' +
        '<linearGradient id="footerLine" x1="' + left + '" y1="0" x2="' + right + '" y2="0">' +
          '<stop offset="0%" stop-color="' + params.accent + '" stop-opacity=".85"/>' +
          '<stop offset="32%" stop-color="' + params.accent + '" stop-opacity=".22"/>' +
          '<stop offset="100%" stop-color="#ffffff" stop-opacity=".035"/>' +
        '</linearGradient>' +
      '</defs>' +

      '<rect x="60" y="60" width="600" height="600" rx="32" fill="#0c0f16"/>' +
      '<rect x="60" y="60" width="600" height="600" rx="32" fill="none" stroke="' + params.accent + '" stroke-opacity=".45" stroke-width="16" filter="url(#avatarGlow)"/>' +
      '<rect x="60" y="60" width="600" height="600" rx="32" fill="none" stroke="' + params.accent + '" stroke-opacity=".68" stroke-width="4"/>' +
      '<rect x="686" y="126" width="5" height="468" rx="3" fill="' + params.accent + '"/>' +

      '<text x="' + left + '" y="82" font-family="DejaVu Sans,Arial,sans-serif" font-size="22" font-weight="700" fill="' + params.accent + '">PERFIL</text>' +
      '<text x="' + left + '" y="160" font-family="DejaVu Sans,Arial,sans-serif" font-size="' + titleSize + '" font-weight="700" fill="#f7f8fb">' +
        escapeXml(params.name) + '</text>' +
      handleSvg +
      statusSvg +

      '<text x="' + left + '" y="350" font-family="DejaVu Sans,Arial,sans-serif" font-size="20" font-weight="700" fill="' + params.accent + '">SOBRE</text>' +
      '<rect x="' + (left + 86) + '" y="341" width="254" height="2" fill="' + params.accent + '" fill-opacity=".38"/>' +
      bioSvg +

      '<rect x="' + left + '" y="584" width="' + contentWidth + '" height="3" rx="2" fill="url(#footerLine)"/>' +
      '<rect x="' + left + '" y="608" width="238" height="54" rx="18" fill="' + params.accent + '" fill-opacity=".16" stroke="' + params.accent + '" stroke-opacity=".32" stroke-width="1.5"/>' +
      '<rect x="' + (left + 24) + '" y="631" width="94" height="7" rx="4" fill="' + params.accent + '" fill-opacity=".75"/>' +
      '<rect x="' + (left + 132) + '" y="631" width="72" height="7" rx="4" fill="#ffffff" fill-opacity=".16"/>' +
      footerDots +
      '<rect x="' + (right - 330) + '" y="602" width="330" height="66" rx="20" fill="none" stroke="#ffffff" stroke-opacity=".09" stroke-width="1.5"/>' +
      '<rect x="' + (right - 310) + '" y="623" width="116" height="5" rx="3" fill="' + params.accent + '" fill-opacity=".62"/>' +
      '<rect x="' + (right - 310) + '" y="638" width="206" height="5" rx="3" fill="#ffffff" fill-opacity=".14"/>' +
      '<rect x="' + (right - 86) + '" y="623" width="64" height="20" rx="10" fill="' + params.accent + '" fill-opacity=".11"/>' +

      '<rect x="24" y="24" width="1632" height="672" rx="32" fill="none" stroke="#ffffff" stroke-opacity=".10" stroke-width="2"/>' +
      '<rect x="32" y="32" width="1616" height="656" rx="28" fill="none" stroke="' + params.accent + '" stroke-opacity=".22" stroke-width="1"/>' +
    '</svg>'
  );
}

async function generateProfileCardV2(input = {}) {
  const params = sanitizeInput(input);

  let avatarBuffer = Buffer.isBuffer(input.avatarBuffer) ? input.avatarBuffer : null;
  if (!avatarBuffer && input.avatarUrl) {
    try {
      avatarBuffer = await fetchImageBuffer(input.avatarUrl);
    } catch {}
  }
  if (!avatarBuffer) avatarBuffer = await createFallbackAvatar(params.name);

  params.accent = params.accent || await welcomeInternals.deriveAvatarNeon(avatarBuffer);

  const [background, avatar, overlay] = await Promise.all([
    sharp(buildBackgroundSvg(params.accent)).png().toBuffer(),
    prepareAvatar(avatarBuffer),
    Promise.resolve(buildOverlaySvg(params)),
  ]);

  return sharp(background)
    .composite([
      { input: avatar, left: 60, top: 60 },
      { input: overlay, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 8 })
    .toBuffer();
}

module.exports = {
  WIDTH,
  HEIGHT,
  AVATAR_SIZE,
  sanitizeInput,
  generateProfileCardV2,
  _internals: {
    cleanText,
    escapeXml,
    approxWidth,
    fitFont,
    wrapText,
    hexToRgba,
    fetchImageBuffer,
    createFallbackAvatar,
    prepareAvatar,
    buildBackgroundSvg,
    buildOverlaySvg,
  },
};
