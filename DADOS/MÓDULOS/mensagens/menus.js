const config = require("../../config/config");

const IMAGE_URL =
  "https://ik.imagekit.io/f6qfdj7c6p/Grimm%20V2%20(1).jpg";

const OFFICIAL_GROUP =
  "https://chat.whatsapp.com/DgzrFZtkitBHZvNNYbuEKr?s=cl&p=a&ilr=4";

const routes = Object.freeze({
  RPG: "menurpg",
  Economia: "menucoins",
  "Pokémon": "menupokemon",
  Grupos: "menuadm",
  Dono: "menudono",
  Downloads: "menudws",
  Alteradores: "menualterar",
  Logos: "menulogos",
  Figurinhas: "menusticker",
  Brincadeiras: "menubn",
  Utilidades: "menuoutros",
  Menus: "menugeral menus",
});

const menuImages = Object.freeze({
  menuadm: "menuadm.jpg",
  menudono: "menudono.jpg",
  menurpg: "menurpg.jpg",
  menucoins: "menu.jpg",
  menupokemon: "menu.jpg",
  menudws: "menudws.jpg",
  menualterar: "menualterar.jpg",
  menulogos: "menu.jpg",
  menusticker: "menusticker.jpg",
  menubn: "menubn.jpg",
  menuoutros: "menuoutros.jpg",
  menugeral: "menu.jpg",
});

function clean(value, fallback = "Bot") {
  return (
    String(value || fallback)
      .replace(/[\x00-\x1F\x7F]/g, "")
      .trim() || fallback
  );
}

function botName() {
  return clean(config.botName, "Bot");
}

function ownerName() {
  return clean(config.ownerName, "Kxlyn");
}

function header(title, prefix, page, pages) {
  const pageLine =
    page && pages
      ? "\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙿𝚊𝚐𝚒𝚗𝚊: " + page + "/" + pages
      : "";

  return (
    "╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮\n" +
    "├̬⌑ؔ͟ ⎾🧊⏌͟ˉ̵͟͞𝙱𝚘𝚝: " + botName() + "\n" +
    "├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙳𝚎𝚟: " + ownerName() + "\n" +
    "├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙷𝚘𝚛𝚊: " +
      new Date().toLocaleTimeString("pt-BR") +
      "\n" +
    "├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙿𝚛𝚎𝚏𝚒𝚡𝚘: " + prefix + "\n" +
    "├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙼𝚎𝚗𝚞: " + title + pageLine + "\n" +
    "╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯"
  );
}

function row(prefix, id, title, description, headerText) {
  const item = {
    id: prefix + id,
    title,
    description,
  };

  if (headerText) item.header = headerText;
  return item;
}

function mainSections(prefix) {
  const r = (id, title, description, headerText) =>
    row(prefix, id, title, description, headerText);

  return [
    {
      title: "       》🧊 𝐒𝐈𝐒𝐓𝐄𝐌𝐀𝐒 🧊《",
      highlight_label: "KXLYN",
      rows: [
        r(
          "menurpg",
          "   『⚔️』𝗠𝗘𝗡𝗨 𝗥𝗣𝗚",
          "jornada • classes • arsenal • bosses • guildas • level",
          "⚔️ RPG"
        ),
        r(
          "menucoins",
          "   『🪙』𝗠𝗘𝗡𝗨 𝗖𝗢𝗜𝗡𝗦",
          "economia • cidade • trabalho • banco • cassino • mineração",
          "🪙 ECONOMIA"
        ),
        r(
          "menupokemon",
          "   『🔴』𝗠𝗘𝗡𝗨 𝗣𝗢𝗞𝗘́𝗠𝗢𝗡",
          "loja • evolução • cuidados • batalha • missões • ranking",
          "🔴 POKÉMON"
        ),
      ],
    },
    {
      title: "       》🧊 𝐌𝐄𝐍𝐔𝐒 🧊《",
      rows: [
        r(
          "menugeral",
          "   『🧊』𝗠𝗘𝗡𝗨 𝗚𝗘𝗥𝗔𝗟",
          "todos os comandos organizados por categoria e seção"
        ),
        r(
          "menuadm",
          "   『🛡️』𝗠𝗘𝗡𝗨 𝗔𝗗𝗠",
          "administração e moderação de grupos"
        ),
        r(
          "menudono",
          "   『👑』𝗠𝗘𝗡𝗨 𝗗𝗢𝗡𝗢",
          "ferramentas exclusivas do dono"
        ),
        r(
          "menudws",
          "   『📥』𝗠𝗘𝗡𝗨 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗦",
          "YouTube • TikTok • Instagram • mídia"
        ),
        r(
          "menusticker",
          "   『🖼️』𝗠𝗘𝗡𝗨 𝗦𝗧𝗜𝗖𝗞𝗘𝗥",
          "figurinhas e ferramentas relacionadas"
        ),
        r(
          "menubn",
          "   『🎮』𝗠𝗘𝗡𝗨 𝗕𝗥𝗜𝗡𝗖𝗔𝗗𝗘𝗜𝗥𝗔𝗦",
          "jogos e comandos de diversão"
        ),
        r(
          "menuoutros",
          "   『🧰』𝗠𝗘𝗡𝗨 𝗨𝗧𝗜𝗟𝗜𝗗𝗔𝗗𝗘𝗦",
          "ferramentas, consultas e recursos gerais"
        ),
        r(
          "menualterar",
          "   『🎛️』𝗠𝗘𝗡𝗨 𝗔𝗟𝗧𝗘𝗥𝗔𝗗𝗢𝗥𝗘𝗦",
          "edição e conversão de mídia"
        ),
        r(
          "menulogos",
          "   『🎨』𝗠𝗘𝗡𝗨 𝗟𝗢𝗚𝗢𝗦",
          "efeitos visuais e logos pela API"
        ),
      ],
    },
    {
      title: "       》💎 𝐄𝐗𝐓𝐑𝐀𝐒 💎《",
      rows: [
        r("ping", "   『💎』𝐏𝐈𝐍𝐆", "latência e informações do bot"),
        r(
          "info comando",
          "   『📘』𝐀𝐉𝐔𝐃𝐀 𝐃𝐄 𝐂𝐎𝐌𝐀𝐍𝐃𝐎",
          "mostra como usar um comando específico"
        ),
      ],
    },
  ];
}

function mainPayload(prefix) {
  return {
    text: "\n" + header("Principal", prefix) + "\n",
    footer: "『🧊』" + botName() + " • escolha um menu",
    image: { url: IMAGE_URL },
    aimode: true,
    interactiveButtons: [
      {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
          title: "『🧊』𝐌𝐄𝐍𝐔『🧊』",
          sections: mainSections(prefix),
        }),
      },
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "『🧊』𝐆𝐫𝐮𝐩𝐨 𝐎𝐟𝐢𝐜𝐢𝐚𝐥",
          url: OFFICIAL_GROUP,
          merchant_url: OFFICIAL_GROUP,
        }),
      },
    ],
  };
}

function index(prefix, catalog) {
  return (
    Object.entries(routes)
      .map(([category, route]) =>
        "├̬⌑ؔ͟ 「🧊」" +
        prefix +
        route +
        " — " +
        category +
        "\n┃  " +
        (catalog.sections(category).join(" · ") || "Navegação")
      )
      .join("\n") +
    "\n├̬⌑ؔ͟ 「🧊」" +
    prefix +
    "menugeral — Todos os comandos" +
    "\n├̬⌑ؔ͟ 「🧊」" +
    prefix +
    "info comando — Ajuda de um comando" +
    "\n╰─┄─💎"
  );
}

const smallCapsMap = {
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ",
  g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ",
  m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ",
  s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x",
  y: "ʏ", z: "ᴢ",
};

function smallCaps(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split("")
    .map(char => smallCapsMap[char] || char)
    .join("");
}

function decoratePage(text) {
  const lines = String(text || "").split("\n");
  const out = [];
  let sectionOpen = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const heading = line.match(/^\*(.+)\*$/);

    if (heading) {
      if (sectionOpen) {
        out.push("╰─");
        out.push("");
      }

      const [category, ...sectionParts] =
        heading[1].split(" - ");

      const section = sectionParts.join(" - ");

      out.push(
        "╭─〔 🧊 " +
        smallCaps(category) +
        " 〕"
      );

      if (section) {
        out.push("│ " + smallCaps(section));
      }

      sectionOpen = true;
      continue;
    }

    if (!sectionOpen) {
      out.push("╭─〔 🧊 ᴄᴏᴍᴀɴᴅᴏs 〕");
      sectionOpen = true;
    }

    out.push("├̬⌑ؔ͟ 「🧊」" + line);
  }

  if (sectionOpen) out.push("╰─");

  return out.join("\n");
}

module.exports = {
  IMAGE_URL,
  OFFICIAL_GROUP,
  routes,
  menuImages,
  botName,
  ownerName,
  header,
  mainSections,
  mainPayload,
  index,
  decoratePage,
};
