// Alteradores de imagem centralizados: um downloader, um pipeline e efeitos realmente distintos.
const { runImageTransform } = require("../../functions/imageTransform");

function sc(text) {
  const map = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ",
    i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ",
    q: "ǫ", r: "ʀ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", y: "ʏ", z: "ᴢ",
  };
  return String(text).replace(/[A-Za-z]/g, (ch) => map[ch.toLowerCase()] || ch.toLowerCase());
}

const definitions = [
  { name: "blue", aliases: ["azul"], effect: "blue", label: "Azul", emoji: "🔵", help: "puxa as cores da imagem para tons azuis" },
  { name: "blur", aliases: ["desfoque"], effect: "blur", label: "Desfoque", emoji: "🌫️", help: "aplica desfoque real à imagem" },
  { name: "bw", aliases: ["pb", "pretoebranco"], effect: "bw", label: "P&B contraste", emoji: "⬛", help: "preto e branco com contraste mais forte" },
  { name: "cartoon", aliases: ["cartum"], effect: "cartoon", label: "Cartoon", emoji: "🖍️", help: "reduz tons e aumenta saturação para efeito de desenho" },
  { name: "cold", aliases: ["frio"], effect: "cold", label: "Frio", emoji: "❄️", help: "deixa a imagem com temperatura de cor mais fria" },
  { name: "dark", aliases: ["escuro"], effect: "dark", label: "Escuro", emoji: "🌑", help: "escurece a imagem de forma intensa" },
  { name: "edge", aliases: ["bordas"], effect: "edge", label: "Bordas", emoji: "🧿", help: "detecta e destaca os contornos da imagem" },
  { name: "emboss", aliases: ["relevo"], effect: "emboss", label: "Relevo", emoji: "🪨", help: "aplica um efeito de relevo nos detalhes" },
  { name: "flip", aliases: ["virar"], effect: "flip", label: "Virado", emoji: "🙃", help: "inverte a imagem verticalmente" },
  { name: "glow", aliases: ["halo"], effect: "glow", label: "Glow", emoji: "✨", help: "realça os pontos claros para criar brilho" },
  { name: "gray", aliases: ["cinza", "grayscale"], effect: "gray", label: "Cinza", emoji: "⚫", help: "converte a imagem para escala de cinza natural" },
  { name: "green", aliases: ["verde"], effect: "green", label: "Verde", emoji: "🟢", help: "puxa as cores da imagem para tons verdes" },
  { name: "mirror", aliases: ["espelhar"], effect: "mirror", label: "Espelho", emoji: "🪞", help: "espelha a imagem horizontalmente" },
  { name: "negativo", aliases: ["invert", "negative"], effect: "negative", label: "Negativo", emoji: "🔄", help: "inverte todas as cores da imagem" },
  { name: "noise", aliases: ["ruido", "ruído"], effect: "noise", label: "Ruído", emoji: "📺", help: "adiciona granulação e ruído visual" },
  { name: "oil", aliases: ["oleo", "óleo", "pinturaoleo"], effect: "oil", label: "Pintura a óleo", emoji: "🎨", help: "suaviza e agrupa tons para lembrar pintura a óleo" },
  { name: "pixel", aliases: ["pixelar"], effect: "pixel", label: "Pixel", emoji: "👾", help: "pixeliza a imagem preservando blocos nítidos" },
  { name: "red", aliases: ["vermelho"], effect: "red", label: "Vermelho", emoji: "🔴", help: "puxa as cores da imagem para tons vermelhos" },
  { name: "rotate", aliases: ["rotacionar"], effect: "rotate", label: "Rotacionado", emoji: "🔃", help: "rotaciona a imagem em noventa graus" },
  { name: "saturar", aliases: ["saturation", "saturarion"], effect: "saturate", label: "Saturado", emoji: "🌈", help: "aumenta bastante a saturação das cores" },
  { name: "sepia", aliases: [], effect: "sepia", label: "Sépia", emoji: "🟤", help: "aplica tonalidade sépia clássica" },
  { name: "sharpen", aliases: ["nitidez"], effect: "sharpen", label: "Nitidez", emoji: "🔎", help: "aumenta a nitidez dos detalhes" },
  { name: "sketch", aliases: ["esboco", "esboço"], effect: "sketch", label: "Esboço", emoji: "✏️", help: "transforma contornos em um esboço claro" },
  { name: "warm", aliases: ["quente"], effect: "warm", label: "Quente", emoji: "🔥", help: "deixa a imagem com temperatura de cor mais quente" },
  { name: "brilho", aliases: ["clarear"], effect: "brightness", label: "Brilho", emoji: "☀️", help: "aumenta luminosidade e brilho da imagem", extra: true },
  { name: "contraste", aliases: [], effect: "contrast", label: "Contraste", emoji: "◐", help: "aumenta a diferença entre áreas claras e escuras", extra: true },
  { name: "dessaturar", aliases: ["desaturar"], effect: "dessaturate", label: "Dessaturado", emoji: "🩶", help: "reduz as cores sem transformar totalmente em cinza", extra: true },
  { name: "posterizar", aliases: ["poster"], effect: "posterize", label: "Posterizado", emoji: "🖼️", help: "reduz a quantidade de tons para efeito de pôster", extra: true },
  { name: "solarizar", aliases: [], effect: "solarize", label: "Solarizado", emoji: "🌞", help: "inverte apenas os tons mais claros para efeito solarizado", extra: true },
  { name: "vinheta", aliases: ["vignette"], effect: "vignette", label: "Vinheta", emoji: "🎞️", help: "escurece gradualmente as bordas mantendo o centro", extra: true },
  { name: "duotone", aliases: ["duotom"], effect: "duotone", label: "Duotone", emoji: "🎭", help: "remapeia a imagem para dois tons principais", extra: true },
  { name: "glitch", aliases: [], effect: "glitch", label: "Glitch", emoji: "📡", help: "desloca faixas e canais de cor para efeito digital", extra: true },
  { name: "cromatico", aliases: ["cromático", "rgbshift"], effect: "chromatic", label: "Cromático", emoji: "🌈", help: "separa levemente os canais vermelho e azul", extra: true },
  { name: "vintage", aliases: ["retro", "retrô"], effect: "vintage", label: "Vintage", emoji: "📷", help: "mistura sépia, desbotamento e grão de filme", extra: true },
  { name: "desbotar", aliases: ["fade"], effect: "fade", label: "Desbotado", emoji: "🫧", help: "levanta os pretos e reduz intensidade das cores", extra: true },
  { name: "moldura", aliases: ["frame"], effect: "frame", label: "Moldura", emoji: "🖼️", help: "adiciona uma moldura dupla ao redor da imagem", extra: true },
  { name: "termico", aliases: ["térmico", "thermal"], effect: "thermal", label: "Térmico", emoji: "🌡️", help: "remapeia luminosidade para uma paleta térmica", extra: true },
  { name: "neon", aliases: [], effect: "neon", label: "Neon", emoji: "💠", help: "transforma os contornos em linhas coloridas de neon", extra: true },
];

const extras = definitions.filter((definition) => definition.extra);
if (extras.length < 13) throw new Error(`Expected at least 13 new image effects, got ${extras.length}`);

const names = new Set();
for (const definition of definitions) {
  if (names.has(definition.name)) throw new Error(`Duplicate image command: ${definition.name}`);
  names.add(definition.name);
}

module.exports = definitions.map((definition) => ({
  name: definition.name,
  aliases: definition.aliases || [],
  description: sc(definition.help),
  menuCategory: "Alteradores",
  menuSection: "Imagem",
  usage: `${definition.name} (responda à imagem)`,
  imageDefinition: Object.freeze({ ...definition }),
  async execute(conn, msg, args, from, axiosInstance, requestedName) {
    return runImageTransform(definition, { conn, msg, args, from, axiosInstance, requestedName });
  },
}));
