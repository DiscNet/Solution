const fs = require("fs");
const path = require("path");
const { sendInteractiveMessage } = require("gifted-btns");
const { createStatusQuoted } = require("./statusCard");
const catalog = require("./menuCatalog");
const config = require("../config/config");

const readmore = String.fromCharCode(8206).repeat(4001);
const IMAGE_URL = "https://ik.imagekit.io/f6qfdj7c6p/Grimm%20V2%20(1).jpg";

const routes = {
  RPG: "menurpg",
  Grupos: "menuadm",
  Dono: "menudono",
  Downloads: "menudws",
  Alteradores: "menualterar",
  Figurinhas: "menusticker",
  Brincadeiras: "menubn",
  Utilidades: "menuoutros",
  Menus: "menugeral menus",
};

const menuImages = {
  menuadm: "menuadm.jpg",
  menudono: "menudono.jpg",
  menurpg: "menurpg.jpg",
  menudws: "menudws.jpg",
  menualterar: "menualterar.jpg",
  menusticker: "menusticker.jpg",
  menubn: "menubn.jpg",
  menuoutros: "menuoutros.jpg",
  menugeral: "menu.jpg",
};

const smallCapsMap = {
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ",
  i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ",
  q: "ǫ", r: "ʀ", s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x",
  y: "ʏ", z: "ᴢ",
};

function smallCaps(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split("")
    .map((char) => smallCapsMap[char] || char)
    .join("");
}

function getFraseFilosofica() {
  try {
    const file = path.join(__dirname, "..", "database", "frases.json");
    if (!fs.existsSync(file)) return "";
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const frases = Array.isArray(data.frases) ? data.frases : [];
    if (!frases.length) return "";
    const item = frases[Math.floor(Math.random() * frases.length)];
    return `\n\n╭─🪐〔 𝙵𝚁𝙰𝚂𝙴 𝙳𝙾 𝙳𝙸𝙰 〕🪐─╮\n┃ ✦ "${item.frase}"\n┃ ✦ — ${item.autor}\n╰─🪐━━━━━━━━━━━━━🪐─╯`;
  } catch (error) {
    console.error("Erro ao carregar frase do menu:", error.message);
    return "";
  }
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

function index(prefix) {
  return (
    Object.entries(routes)
      .map(
        ([category, route]) =>
          `├̬⌑ؔ͟ 「🧊」${prefix}${route} — ${category}\n┃  ${catalog.sections(category).join(" · ") || "Navegação"}`,
      )
      .join("\n") +
    `\n├̬⌑ؔ͟ 「🧊」${prefix}menugeral — Todos os comandos\n├̬⌑ؔ͟ 「🧊」${prefix}info comando — Ajuda de um comando\n╰─┄─💎`
  );
}

function menuHeader(title, prefix, page, pages) {
  const owner = config.ownerName || "GrimmJow";
  const name = config.botName || "GrimmJow";
  const pageLine = page && pages ? `\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙿𝚊𝚐𝚒𝚗𝚊: ${page}/${pages}` : "";
  return `╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮\n├̬⌑ؔ͟ ⎾🧊⏌͟ˉ̵͟͞𝙱𝚘𝚝: ${name}\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙳𝚎𝚟: ${owner}\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙷𝚘𝚛𝚊: ${new Date().toLocaleTimeString("pt-BR")}\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙿𝚛𝚎𝚏𝚒𝚡𝚘: ${prefix}\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙼𝚎𝚗𝚞: ${title}${pageLine}\n╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯`;
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

      const [category, ...sectionParts] = heading[1].split(" - ");
      const section = sectionParts.join(" - ");
      out.push(`╭─〔 🧊 ${smallCaps(category)} 〕`);
      if (section) out.push(`│ ${smallCaps(section)}`);
      sectionOpen = true;
      continue;
    }
    if (!sectionOpen) {
      out.push("╭─〔 🧊 ᴄᴏᴍᴀɴᴅᴏs 〕");
      sectionOpen = true;
    }
    out.push(`├̬⌑ؔ͟ 「🧊」${line}`);
  }

  if (sectionOpen) out.push("╰─");
  return out.join("\n");
}

function imagePath(name) {
  const imagesDir = path.join(__dirname, "..", "imagens");
  const preferred = path.join(imagesDir, menuImages[name] || "menu.jpg");
  const fallback = path.join(imagesDir, "menu.jpg");
  return fs.existsSync(preferred) ? preferred : fallback;
}

async function sendStyledMenu(conn, msg, from, { name, title, body, page, pages, next }) {
  const prefix = config.prefix || ".";
  const caption = `${menuHeader(title, prefix, page, pages)}\n${readmore}\n${body}${next ? `\n\n╭─┄─🧊〔 𝙽𝙰𝚅𝙴𝙶𝙰𝙲̧𝙰̃𝙾 〕\n├̬⌑ؔ͟ ${next}\n╰─┄─🧊` : ""}${getFraseFilosofica()}`;
  const img = imagePath(name);
  const quoted = createStatusQuoted(msg);

  if (fs.existsSync(img)) {
    await conn.sendMessage(
      from,
      { image: fs.readFileSync(img), caption, contextInfo: contextInfo() },
      { quoted },
    );
  } else {
    await conn.sendMessage(from, { text: caption, contextInfo: contextInfo() }, { quoted });
  }

  await conn.sendMessage(from, { react: { text: "🧊", key: msg.key } });
}

async function sendMainMenu(conn, msg, from) {
  const prefix = config.prefix || ".";
  const menuText = `\n${menuHeader("Principal", prefix)}\n`;
  const row = (id, title, description) => ({ id: `${prefix}${id}`, title, description });

  await sendInteractiveMessage(
    conn,
    from,
    {
      text: menuText,
      footer: "ᴇsᴄᴏʟʜᴀ ᴀ ᴏᴘᴄ̧ᴀ̃ᴏ ᴀʙᴀɪxᴏ",
      image: { url: IMAGE_URL },
      aimode: true,
      contextInfo: contextInfo(),
      interactiveButtons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "『🧊』𝐌𝐄𝐍𝐔『🧊』",
            sections: [
              {
                title: "       》𝐌𝐄𝐍𝐔 𝐋𝐈𝐒𝐓𝐀《",
                rows: [
                  row("menugeral", "   『🧊』𝗠𝗘𝗡𝗨 𝗚𝗘𝗥𝗔𝗟", "ᴛᴏᴅᴏs ᴏs ᴄᴏᴍᴀɴᴅᴏs, ᴏʀɢᴀɴɪᴢᴀᴅᴏs ᴘᴏʀ sᴇᴄ̧ᴀ̃ᴏ"),
                  row("menuadm", "   『🧊』𝗠𝗘𝗡𝗨 𝗔𝗗𝗠", "ᴀᴅᴍɪɴɪsᴛʀᴀᴄ̧ᴀ̃ᴏ ᴇ ᴍᴏᴅᴇʀᴀᴄ̧ᴀ̃ᴏ ᴅᴇ ɢʀᴜᴘᴏs"),
                  row("menudono", "   『🧊』𝗠𝗘𝗡𝗨 𝗗𝗢𝗡𝗢", "ᴄᴏᴍᴀɴᴅᴏs ʀᴇsᴛʀɪᴛᴏs ᴀᴏ ᴅᴏɴᴏ"),
                  row("menurpg", "   『🧊』𝗠𝗘𝗡𝗨 𝗥𝗣𝗚", "sɪsᴛᴇᴍᴀ ʀᴘɢ ᴏʀɢᴀɴɪᴢᴀᴅᴏ ᴘᴏʀ sᴇᴄ̧ᴏ̃ᴇs"),
                  row("menusticker", "   『🧊』𝗠𝗘𝗡𝗨 𝗦𝗧𝗜𝗖𝗞𝗘𝗥", "ғɪɢᴜʀɪɴʜᴀs ᴇ ғᴇʀʀᴀᴍᴇɴᴛᴀs ʀᴇʟᴀᴄɪᴏɴᴀᴅᴀs"),
                  row("menudws", "   『🧊』𝗠𝗘𝗡𝗨 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗦", "ᴅᴏᴡɴʟᴏᴀᴅs ᴅᴇ ᴍɪ́ᴅɪᴀ ᴇ ᴀʀǫᴜɪᴠᴏs"),
                  row("menualterar", "   『🧊』𝗠𝗘𝗡𝗨 𝗔𝗟𝗧𝗘𝗥𝗔𝗗𝗢𝗥𝗘𝗦", "ᴀʟᴛᴇʀᴀᴄ̧ᴀ̃ᴏ ᴇ ᴄᴏɴᴠᴇʀsᴀ̃ᴏ ᴅᴇ ᴍɪ́ᴅɪᴀ"),
                  row("menubn", "   『🧊』𝗠𝗘𝗡𝗨 𝗕𝗥𝗜𝗡𝗖𝗔𝗗𝗘𝗜𝗥𝗔𝗦", "ᴊᴏɢᴏs ᴇ ᴄᴏᴍᴀɴᴅᴏs ᴅᴇ ᴅɪᴠᴇʀsᴀ̃ᴏ"),
                  row("menuoutros", "   『🧊』𝗠𝗘𝗡𝗨 𝗨𝗧𝗜𝗟𝗜𝗗𝗔𝗗𝗘𝗦", "ғᴇʀʀᴀᴍᴇɴᴛᴀs, ᴄᴏɴsᴜʟᴛᴀs ᴇ ᴏᴜᴛʀᴏs ᴄᴏᴍᴀɴᴅᴏs"),
                ],
              },
              {
                title: "       》𝐄𝐗𝐓𝐑𝐀𝐒《",
                rows: [
                  row("ping", "   『💎』𝐏𝐈𝐍𝐆", "ᴠᴇʀɪғɪᴄᴀʀ ʟᴀᴛᴇ̂ɴᴄɪᴀ ᴅᴏ ʙᴏᴛ"),
                  row("info comando", "   『💎』𝐀𝐉𝐔𝐃𝐀 𝐃𝐄 𝐂𝐎𝐌𝐀𝐍𝐃𝐎", "ᴍᴏsᴛʀᴀ ᴏ ᴜsᴏ ᴄᴜʀᴛᴏ ᴅᴇ ᴜᴍ ᴄᴏᴍᴀɴᴅᴏ"),
                  row("alugarbot", "   『💎』𝐀𝐋𝐔𝐆𝐀𝐑 𝐁𝐎𝐓", "ɪɴғᴏʀᴍᴀᴄ̧ᴏ̃ᴇs ᴅᴇ ᴀʟᴜɢᴜᴇʟ ᴅᴏ ʙᴏᴛ"),
                ],
              },
            ],
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "『〩』𝐆𝐫𝐮𝐩𝐨 𝐎𝐟𝐢𝐜𝐢𝐚𝐥『〩』",
            url: "https://chat.whatsapp.com/DgzrFZtkitBHZvNNYbuEKr?s=cl&p=a&ilr=4",
            merchant_url: "https://chat.whatsapp.com/DgzrFZtkitBHZvNNYbuEKr?s=cl&p=a&ilr=4",
          }),
        },
      ],
    },
    { quoted: createStatusQuoted(msg) },
  );

  await conn.sendMessage(from, { react: { text: "🧊", key: msg.key } });
}

function createMenu(name, category, aliases = []) {
  return {
    name,
    aliases,
    menuCategory: "Menus",
    menuSection: "Navegação",
    usage: `${name} [seção] [página]`,
    description: `Uso: .${name} [seção] [página]`,
    async execute(conn, msg, args = [], from) {
      try {
        const prefix = config.prefix || ".";
        let chosen = category;
        const params = [...args];

        if (name === "menu" && !params.length) return sendMainMenu(conn, msg, from);

        if (name === "menu") {
          const key = catalog.normalize(params.shift());
          if (!Object.hasOwn(catalog.categories, key)) {
            return sendStyledMenu(conn, msg, from, {
              name,
              title: "Categorias",
              body: `╭─┄─💎〔 𝙲𝙰𝚃𝙴𝙶𝙾𝚁𝙸𝙰𝚂 〕\n${index(prefix)}`,
            });
          }
          chosen = catalog.categories[key];
        }

        if (
          name === "menugeral" &&
          Object.hasOwn(catalog.categories, catalog.normalize(params[0]))
        ) {
          chosen = catalog.categories[catalog.normalize(params.shift())];
        }

        let page = 1;
        if (/^\d+$/.test(params.at(-1) || "")) page = Number(params.pop());
        const section = params.join(" ");
        const singleMessage = name === "menugeral" && !chosen;
        const parts = catalog.pages({
          category: chosen,
          section,
          prefix,
          limit: singleMessage ? 60000 : 3200,
        });

        if (!parts.length) {
          const available = catalog.sections(chosen).join(" · ") || "Nenhuma";
          return sendStyledMenu(conn, msg, from, {
            name,
            title: chosen || "Todos os comandos",
            body: `╭─┄─💎〔 𝚂𝙴𝙲̧𝙾̃𝙴𝚂 〕\n├̬⌑ؔ͟ 「🧊」Seção não encontrada.\n├̬⌑ؔ͟ 「🧊」Disponíveis: ${available}\n╰─┄─💎`,
          });
        }

        if (
          !singleMessage &&
          (!Number.isSafeInteger(page) || page < 1 || page > parts.length)
        ) {
          return sendStyledMenu(conn, msg, from, {
            name,
            title: chosen || "Todos os comandos",
            body: `╭─┄─💎〔 𝙿𝙰́𝙶𝙸𝙽𝙰 〕\n├̬⌑ؔ͟ 「🧊」Informe uma página de 1 a ${parts.length}.\n╰─┄─💎`,
          });
        }

        if (singleMessage) {
          return sendStyledMenu(conn, msg, from, {
            name,
            title: "Todos os comandos",
            body: decoratePage(parts.join("\n")),
          });
        }

        const base =
          name === "menu"
            ? `${prefix}menu ${args[0]}`
            : name === "menugeral" && chosen
              ? `${prefix}menugeral ${catalog.normalize(chosen)}`
              : `${prefix}${name}`;
        const next =
          page < parts.length
            ? `Próxima: ${base}${section ? " " + section : ""} ${page + 1}`
            : parts.length > 1
              ? `Página atual: ${page}/${parts.length}`
              : "";

        return sendStyledMenu(conn, msg, from, {
          name,
          title: chosen || "Todos os comandos",
          body: decoratePage(parts[page - 1]),
          page,
          pages: parts.length,
          next,
        });
      } catch (error) {
        console.error(`Erro no ${name}:`, error);
        await conn.sendMessage(
          from,
          { text: "❌ ᴇʀʀᴏ ᴀᴏ ᴄᴀʀʀᴇɢᴀʀ ᴏ ᴍᴇɴᴜ." },
          { quoted: createStatusQuoted(msg) },
        );
      }
    },
  };
}

module.exports = { createMenu, index, decoratePage };
