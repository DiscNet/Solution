// Menu: Figurinhas - Texto | Comandos: ttp / attp
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const os = require("os");
const util = require("util");
const { execFile } = require("child_process");
const sharp = require("sharp");
const kit = require("../../functions/utilityKit");
const { applyStickerMetadata } = require("../../functions/stickerMetadata");

const execFilePromise = util.promisify(execFile);

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(value, maxChars = 16) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      continue;
    }

    const next = current ? current + " " + word : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 7);
}

function textLayout(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  const maxChars = clean.length <= 18 ? 18 : clean.length <= 45 ? 15 : 13;
  const lines = wrapText(clean, maxChars);
  const longest = Math.max(1, ...lines.map(line => [...line].length));
  const byWidth = Math.floor(430 / Math.max(1, longest * 0.58));
  const byHeight = Math.floor(360 / Math.max(1, lines.length * 1.18));
  const fontSize = Math.max(38, Math.min(120, byWidth, byHeight));
  const lineHeight = Math.round(fontSize * 1.16);
  const totalHeight = Math.max(lineHeight, lines.length * lineHeight);
  const firstY = 256 - totalHeight / 2 + lineHeight * 0.78;
  return { lines, fontSize, lineHeight, firstY };
}

function textSvg(text, fill = "#ffffff") {
  const { lines, fontSize, lineHeight, firstY } = textLayout(text);
  const content = lines.map((line, index) => {
    const y = Math.round(firstY + index * lineHeight);
    return `<text x="256" y="${y}" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="${fontSize}" font-weight="800" fill="${fill}" stroke="#111111" stroke-width="10" stroke-linejoin="round" paint-order="stroke fill">${escapeXml(line)}</text>`;
  }).join("");

  return Buffer.from(
    `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" fill="transparent"/>${content}</svg>`,
    "utf8",
  );
}

async function staticSticker(text) {
  return sharp(textSvg(text))
    .webp({ quality: 92, effort: 5 })
    .toBuffer();
}

async function animatedSticker(text) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "solution-attp-"));
  const output = path.join(dir, "attp.webp");
  const colors = [
    "#ff355e", "#ff8c42", "#ffd23f", "#33d17a",
    "#2ec4ff", "#5865f2", "#b967ff", "#ff4fd8",
  ];

  try {
    for (let i = 0; i < colors.length; i++) {
      const file = path.join(dir, `frame-${String(i).padStart(2, "0")}.png`);
      await sharp(textSvg(text, colors[i])).png().toFile(file);
    }

    await execFilePromise("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error",
      "-framerate", "8",
      "-i", path.join(dir, "frame-%02d.png"),
      "-vf", "scale=512:512:flags=lanczos,format=rgba",
      "-loop", "0",
      "-an",
      "-c:v", "libwebp",
      "-lossless", "0",
      "-q:v", "80",
      "-preset", "picture",
      output,
    ], { timeout: 45000, maxBuffer: 8 * 1024 * 1024 });

    const buffer = await fsp.readFile(output);
    if (!buffer.length) throw new Error("ATTP gerou uma figurinha vazia.");
    return buffer;
  } finally {
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function textCommand(name, animated) {
  return {
    name,
    aliases: [],
    menuCategory: "Figurinhas",
    menuSection: "Texto",
    usage: name + " <texto>",
    description: animated
      ? "Cria uma figurinha de texto animada e colorida"
      : "Cria uma figurinha de texto estática",
    async execute(conn, msg, args, from) {
      try {
        const text = kit.inputText(msg, args).replace(/\s+/g, " ").trim();
        if (!text) {
          return kit.reply(conn, msg, from, `❌ Uso: .${name} <texto>`);
        }
        if (text.length > 120) {
          return kit.reply(conn, msg, from, "❌ Use no máximo 120 caracteres.");
        }

        await conn.sendMessage(from, {
          react: { text: animated ? "🌈" : "📝", key: msg.key },
        }).catch(() => {});

        const generated = animated
          ? await animatedSticker(text)
          : await staticSticker(text);

        const sticker = await applyStickerMetadata(generated, {
          emojis: animated ? ["🌈", "🧊"] : ["📝", "🧊"],
        });

        await conn.sendMessage(from, {
          sticker,
          mimetype: "image/webp",
        });

        await conn.sendMessage(from, {
          react: { text: "✅", key: msg.key },
        }).catch(() => {});
      } catch (error) {
        console.error(`[${name.toUpperCase()}]`, error?.message || error);
        await conn.sendMessage(from, {
          react: { text: "❌", key: msg.key },
        }).catch(() => {});
        return kit.reply(
          conn,
          msg,
          from,
          `❌ Não foi possível gerar o ${name.toUpperCase()} agora.`,
        );
      }
    },
  };
}

module.exports = [
  textCommand("ttp", false),
  textCommand("attp", true),
];

module.exports._test = {
  escapeXml,
  wrapText,
  textLayout,
  textSvg,
  staticSticker,
  animatedSticker,
};
