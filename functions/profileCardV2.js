const axios = require("axios");
const sharp = require("sharp");
const { _internals: welcomeInternals } = require("./welcomeCard");

const WIDTH = 1680;
const HEIGHT = 900;
const HERO_HEIGHT = 450;
const AVATAR_SIZE = 360;
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
      '<rect width="600" height="600" fill="url(#g)"/>' +
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
    '<svg width="' + AVATAR_SIZE + '" height="' + AVATAR_SIZE + '" xmlns="http://www.w3.org/2000/svg">' +
      '<rect width="' + AVATAR_SIZE + '" height="' + AVATAR_SIZE + '" rx="34" fill="#fff"/>' +
    '</svg>'
  );

  return sharp(normalized)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function prepareHeroBackground(buffer) {
  return sharp(buffer, { limitInputPixels: 40_000_000 })
    .resize(WIDTH, HERO_HEIGHT, { fit: "cover", position: "attention" })
    .blur(1.5)
    .modulate({ brightness: 0.82, saturation: 0.92 })
    .png()
    .toBuffer();
}

function iconUser(x, y, size, color, opacity = 1) {
  const s = size;
  return '<g transform="translate(' + x + ' ' + y + ')" fill="none" stroke="' + color + '" stroke-opacity="' + opacity + '" stroke-width="' + Math.max(2, Math.round(s * 0.085)) + '" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="' + (s * 0.5) + '" cy="' + (s * 0.32) + '" r="' + (s * 0.18) + '"/>' +
    '<path d="M ' + (s * 0.17) + ' ' + (s * 0.87) + ' C ' + (s * 0.2) + ' ' + (s * 0.62) + ', ' + (s * 0.8) + ' ' + (s * 0.62) + ', ' + (s * 0.83) + ' ' + (s * 0.87) + '"/>' +
  '</g>';
}

function iconAt(x, y, size, color, opacity = 1) {
  return '<text x="' + x + '" y="' + y + '" font-family="DejaVu Sans,Arial,sans-serif" font-size="' + size + '" font-weight="700" fill="' + color + '" fill-opacity="' + opacity + '">@</text>';
}

function iconShield(x, y, size, color, opacity = 1) {
  return '<path d="M ' + x + ' ' + y + ' L ' + (x + size / 2) + ' ' + (y + size * 0.18) + ' L ' + (x + size) + ' ' + y +
    ' L ' + (x + size * 0.92) + ' ' + (y + size * 0.58) + ' Q ' + (x + size * 0.5) + ' ' + (y + size) + ' ' + x + ' ' + (y + size * 0.58) +
    ' Z" fill="none" stroke="' + color + '" stroke-opacity="' + opacity + '" stroke-width="' + Math.max(2, Math.round(size * 0.08)) + '" stroke-linejoin="round"/>';
}

function iconQuote(x, y, size, color, opacity = 1) {
  return '<g fill="' + color + '" fill-opacity="' + opacity + '">' +
    '<path d="M ' + x + ' ' + (y + size * 0.2) + ' h ' + (size * 0.34) + ' v ' + (size * 0.34) + ' h -' + (size * 0.16) + ' q 0 ' + (size * 0.24) + ' -' + (size * 0.18) + ' ' + (size * 0.3) + ' z"/>' +
    '<path d="M ' + (x + size * 0.5) + ' ' + (y + size * 0.2) + ' h ' + (size * 0.34) + ' v ' + (size * 0.34) + ' h -' + (size * 0.16) + ' q 0 ' + (size * 0.24) + ' -' + (size * 0.18) + ' ' + (size * 0.3) + ' z"/>' +
  '</g>';
}

function iconSpark(x, y, size, color, opacity = 1) {
  return '<path d="M ' + (x + size / 2) + ' ' + y +
    ' L ' + (x + size * 0.62) + ' ' + (y + size * 0.38) +
    ' L ' + (x + size) + ' ' + (y + size * 0.5) +
    ' L ' + (x + size * 0.62) + ' ' + (y + size * 0.62) +
    ' L ' + (x + size * 0.5) + ' ' + (y + size) +
    ' L ' + (x + size * 0.38) + ' ' + (y + size * 0.62) +
    ' L ' + x + ' ' + (y + size * 0.5) +
    ' L ' + (x + size * 0.38) + ' ' + (y + size * 0.38) +
    ' Z" fill="' + color + '" fill-opacity="' + opacity + '"/>';
}

function buildBaseSvg(accent) {
  return Buffer.from(
    '<svg width="' + WIDTH + '" height="' + HEIGHT + '" viewBox="0 0 ' + WIDTH + ' ' + HEIGHT + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<linearGradient id="heroShade" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="#000000" stop-opacity=".93"/>' +
          '<stop offset="38%" stop-color="#000000" stop-opacity=".70"/>' +
          '<stop offset="72%" stop-color="#000000" stop-opacity=".34"/>' +
          '<stop offset="100%" stop-color="#000000" stop-opacity=".14"/>' +
        '</linearGradient>' +
        '<linearGradient id="heroBottomFade" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#000000" stop-opacity="0"/>' +
          '<stop offset="100%" stop-color="#000000" stop-opacity=".76"/>' +
        '</linearGradient>' +
        '<radialGradient id="accentGlow" cx="78%" cy="14%" r="48%">' +
          '<stop offset="0%" stop-color="' + accent + '" stop-opacity=".20"/>' +
          '<stop offset="100%" stop-color="' + accent + '" stop-opacity="0"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<rect x="0" y="' + HERO_HEIGHT + '" width="' + WIDTH + '" height="' + (HEIGHT - HERO_HEIGHT) + '" fill="#050608"/>' +
      '<rect x="0" y="0" width="' + WIDTH + '" height="' + HERO_HEIGHT + '" fill="url(#heroShade)"/>' +
      '<rect x="0" y="0" width="' + WIDTH + '" height="' + HERO_HEIGHT + '" fill="url(#heroBottomFade)"/>' +
      '<rect x="0" y="0" width="' + WIDTH + '" height="' + HERO_HEIGHT + '" fill="url(#accentGlow)"/>' +
      '<rect x="0" y="' + (HERO_HEIGHT - 2) + '" width="' + WIDTH + '" height="4" fill="' + accent + '" fill-opacity=".28"/>' +
    '</svg>'
  );
}

function buildOverlaySvg(params) {
  const left = 510;
  const right = 1600;
  const contentWidth = right - left;
  const titleSize = fitFont(params.name, contentWidth, 88, 52);
  const handle = params.gamertag
    ? (params.gamertag.startsWith("@") ? params.gamertag : "@" + params.gamertag)
    : "";

  const bioLines = wrapText(params.bio || "Sem descrição.", 1420, 42, 3);
  const statusWidth = params.status
    ? Math.min(680, Math.max(300, Math.ceil(approxWidth(params.status, 29) + 96)))
    : 0;

  const bioSvg = bioLines.map((line, index) =>
    '<text x="130" y="' + (645 + index * 54) + '" ' +
      'font-family="DejaVu Sans,Arial,sans-serif" font-size="42" font-weight="700" ' +
      'fill="#f4f5f8" fill-opacity=".94">' + escapeXml(line) + '</text>'
  ).join("");

  const handleSvg = handle && handle !== params.name
    ? iconAt(left, 282, 38, "#ffffff", 0.76) +
      '<text x="' + (left + 50) + '" y="281" font-family="DejaVu Sans,Arial,sans-serif" ' +
        'font-size="36" font-weight="700" fill="#ffffff" fill-opacity=".82">' +
        escapeXml(handle.replace(/^@/, "")) + '</text>'
    : "";

  const statusSvg = params.status
    ? '<g>' +
        '<rect x="' + left + '" y="322" width="' + Math.max(statusWidth, 300) + '" height="68" rx="34" ' +
          'fill="#050608" fill-opacity=".66" stroke="' + params.accent + '" stroke-opacity=".72" stroke-width="2"/>' +
        iconShield(left + 24, 338, 34, params.accent, 0.95) +
        '<text x="' + (left + 74) + '" y="356" dominant-baseline="middle" ' +
          'font-family="DejaVu Sans,Arial,sans-serif" font-size="29" font-weight="700" fill="#ffffff">' +
          escapeXml(params.status) + '</text>' +
      '</g>'
    : "";

  const chipWidth = 330;
  const chipHeight = 92;
  const chipGap = 42;
  const chipY = 780;
  const totalChipsWidth = chipWidth * 3 + chipGap * 2;
  const chipsStartX = Math.round((WIDTH - totalChipsWidth) / 2);

  const chips = [
    { label: "IDENTIDADE", kind: "user" },
    { label: "WHATSAPP", kind: "at" },
    { label: "PERFIL", kind: "shield" },
  ].map((item, index) => {
    const x = chipsStartX + index * (chipWidth + chipGap);
    const centerX = x + chipWidth / 2;
    const iconSize = item.kind === "at" ? 48 : 50;
    const iconY = chipY + 16;
    const icon = item.kind === "user"
      ? iconUser(centerX - iconSize / 2, iconY, iconSize, params.accent, 0.98)
      : item.kind === "at"
        ? iconAt(centerX - 14, chipY + 58, iconSize, params.accent, 0.98)
        : iconShield(centerX - iconSize / 2, iconY + 2, iconSize, params.accent, 0.98);

    return '<g>' +
      '<rect x="' + x + '" y="' + chipY + '" width="' + chipWidth + '" height="' + chipHeight + '" rx="26" fill="#ffffff" fill-opacity=".04" stroke="#ffffff" stroke-opacity=".10" stroke-width="1.5"/>' +
      icon +
      '<text x="' + centerX + '" y="' + (chipY + 80) + '" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif" font-size="22" font-weight="700" fill="#ffffff" fill-opacity=".72">' + item.label + '</text>' +
    '</g>';
  }).join("");

  return Buffer.from(
    '<svg width="' + WIDTH + '" height="' + HEIGHT + '" viewBox="0 0 ' + WIDTH + ' ' + HEIGHT + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<filter id="avatarGlow" x="-30%" y="-30%" width="160%" height="160%">' +
          '<feGaussianBlur stdDeviation="14"/>' +
        '</filter>' +
        '<linearGradient id="bioLine" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%" stop-color="' + params.accent + '" stop-opacity=".90"/>' +
          '<stop offset="35%" stop-color="' + params.accent + '" stop-opacity=".28"/>' +
          '<stop offset="100%" stop-color="#ffffff" stop-opacity=".035"/>' +
        '</linearGradient>' +
      '</defs>' +

      '<rect x="96" y="130" width="' + AVATAR_SIZE + '" height="' + AVATAR_SIZE + '" rx="38" fill="none" stroke="' + params.accent + '" stroke-opacity=".42" stroke-width="20" filter="url(#avatarGlow)"/>' +
      '<rect x="96" y="130" width="' + AVATAR_SIZE + '" height="' + AVATAR_SIZE + '" rx="38" fill="none" stroke="' + params.accent + '" stroke-opacity=".82" stroke-width="4"/>' +
      '<rect x="106" y="140" width="' + (AVATAR_SIZE - 20) + '" height="' + (AVATAR_SIZE - 20) + '" rx="31" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="2"/>' +

      iconUser(left, 88, 42, params.accent, 1) +
      '<text x="' + (left + 60) + '" y="124" font-family="DejaVu Sans,Arial,sans-serif" font-size="27" font-weight="700" letter-spacing="3" fill="' + params.accent + '">PERFIL</text>' +
      iconSpark(1540, 86, 34, params.accent, 0.82) +

      '<text x="' + left + '" y="228" font-family="DejaVu Sans,Arial,sans-serif" font-size="' + titleSize + '" font-weight="700" fill="#f8f9fb">' +
        escapeXml(params.name) + '</text>' +
      handleSvg +
      statusSvg +

      '<g>' +
        '<rect x="92" y="535" width="1496" height="292" rx="30" fill="#090a0d" fill-opacity=".78" stroke="#ffffff" stroke-opacity=".055" stroke-width="1.5"/>' +
        iconQuote(130, 570, 50, params.accent, 0.95) +
        '<text x="202" y="610" font-family="DejaVu Sans,Arial,sans-serif" font-size="27" font-weight="700" letter-spacing="2.4" fill="' + params.accent + '">SOBRE</text>' +
        '<rect x="324" y="598" width="1182" height="3" rx="2" fill="url(#bioLine)"/>' +
        bioSvg +
      '</g>' +

      chips +

      '<rect x="24" y="24" width="' + (WIDTH - 48) + '" height="' + (HEIGHT - 48) + '" rx="36" fill="none" stroke="#ffffff" stroke-opacity=".10" stroke-width="2"/>' +
      '<rect x="32" y="32" width="' + (WIDTH - 64) + '" height="' + (HEIGHT - 64) + '" rx="31" fill="none" stroke="' + params.accent + '" stroke-opacity=".23" stroke-width="1"/>' +
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

  const [hero, avatar, base, overlay] = await Promise.all([
    prepareHeroBackground(avatarBuffer),
    prepareAvatar(avatarBuffer),
    Promise.resolve(buildBaseSvg(params.accent)),
    Promise.resolve(buildOverlaySvg(params)),
  ]);

  return sharp({
    create: {
      width: WIDTH,
      height: HEIGHT,
      channels: 4,
      background: { r: 5, g: 6, b: 8, alpha: 1 },
    },
  })
    .composite([
      { input: hero, left: 0, top: 0 },
      { input: base, left: 0, top: 0 },
      { input: avatar, left: 96, top: 130 },
      { input: overlay, left: 0, top: 0 },
    ])
    .png({ compressionLevel: 8 })
    .toBuffer();
}

module.exports = {
  WIDTH,
  HEIGHT,
  HERO_HEIGHT,
  AVATAR_SIZE,
  sanitizeInput,
  fetchImageBuffer,
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
    prepareHeroBackground,
    buildBaseSvg,
    buildOverlaySvg,
    iconUser,
    iconAt,
    iconShield,
    iconQuote,
    iconSpark,
  },
};
