// Menu: Menus - Conversões
const fs = require("fs");
const path = require("path");
const catalog = require("../../functions/menuCatalog");
const { decoratePage } = require("../../functions/menuRenderer");
const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../config/config");
const { dimensions } = require("../outros/conversoes");

const labels = {
  comprimento: "Medidas e distâncias",
  massa: "Peso",
  area: "Área",
  volume: "Litros e volume",
  velocidade: "Velocidade",
  tempo: "Tempo",
  dados: "Internet e armazenamento",
  energia: "Energia",
  pressao: "Pressão",
  angulo: "Ângulos",
};

function countFor(dimension) {
  const units = Object.keys(dimensions[dimension]?.units || {}).length;
  return units * Math.max(0, units - 1);
}

function contextInfo() {
  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363426698503859@newsletter",
      newsletterName: config.botName || "GrimmJow",
      serverMessageId: 116,
    },
  };
}

function header(title, prefix) {
  const owner = config.ownerName || "GrimmJow";
  const bot = config.botName || "GrimmJow";
  return `╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮\n├̬⌑ؔ͟ ⎾🧊⏌͟ˉ̵͟͞𝙱𝚘𝚝: ${bot}\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙳𝚎𝚟: ${owner}\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙷𝚘𝚛𝚊: ${new Date().toLocaleTimeString("pt-BR")}\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙿𝚛𝚎𝚏𝚒𝚡𝚘: ${prefix}\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙼𝚎𝚗𝚞: ${title}\n╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯`;
}

async function sendMenu(conn, msg, from, title, body) {
  const prefix = config.prefix || ".";
  const caption = `${header(title, prefix)}\n\n${body}`;
  const image = path.join(__dirname, "..", "..", "imagens", "menuoutros.jpg");
  const quoted = createStatusQuoted(msg);

  if (fs.existsSync(image)) {
    await conn.sendMessage(
      from,
      { image: fs.readFileSync(image), caption, contextInfo: contextInfo() },
      { quoted },
    );
  } else {
    await conn.sendMessage(from, { text: caption, contextInfo: contextInfo() }, { quoted });
  }
  await conn.sendMessage(from, { react: { text: "🧊", key: msg.key } });
}

function indexBody(prefix) {
  const lines = [
    "╭─〔 🧊 ғᴇʀʀᴀᴍᴇɴᴛᴀs ᴅᴏ ᴅɪᴀ ᴀ ᴅɪᴀ 〕",
    "│ ᴇsᴄᴏʟʜᴀ ᴏ ǫᴜᴇ ᴠᴏᴄᴇ̂ ǫᴜᴇʀ ᴄᴏɴᴠᴇʀᴛᴇʀ",
  ];
  for (const dimension of Object.keys(dimensions)) {
    lines.push(
      `├̬⌑ؔ͟ 「🧊」${prefix}menuconv${dimension} | ${labels[dimension]} • ${countFor(dimension)} opções`,
    );
  }
  lines.push("╰─");
  lines.push("");
  lines.push(`╭─┄─🧊〔 𝙰𝚃𝙰𝙻𝙷𝙾 𝚁𝙰́𝙿𝙸𝙳𝙾 〕\n├̬⌑ؔ͟ 「🧊」${prefix}conversor 10 km m\n├̬⌑ؔ͟ 「🧊」${prefix}unidades — veja as unidades disponíveis\n╰─┄─🧊`);
  return lines.join("\n");
}

function makeDimensionMenu(dimension) {
  const label = labels[dimension] || dimension;
  const count = countFor(dimension);
  return {
    name: `menuconv${dimension}`,
    aliases: [`menuconversoes${dimension}`, `conv${dimension}`],
    menuCategory: "Menus",
    menuSection: "Conversões",
    usage: `menuconv${dimension}`,
    description: `Abre ${count} opções de ${label.toLowerCase()}`,
    async execute(conn, msg, args = [], from) {
      const prefix = config.prefix || ".";
      const parts = catalog.pages({
        category: "Utilidades",
        section: "Conversões",
        prefix,
        limit: 50000,
        includeHidden: true,
        namePrefix: `conv-${dimension}-`,
      });
      const body = decoratePage(parts.join("\n"));
      return sendMenu(conn, msg, from, label, body);
    },
  };
}

const commands = [
  {
    name: "menuconversoes",
    aliases: ["menuconv", "menucnv"],
    menuCategory: "Menus",
    menuSection: "Conversões",
    usage: "menuconversoes",
    description: "Abre os conversores de medidas, peso, tempo, internet e mais",
    async execute(conn, msg, args = [], from) {
      return sendMenu(
        conn,
        msg,
        from,
        "Conversores do dia a dia",
        indexBody(config.prefix || "."),
      );
    },
  },
  ...Object.keys(dimensions).map(makeDimensionMenu),
];

module.exports = { commands, countFor, labels, indexBody };
