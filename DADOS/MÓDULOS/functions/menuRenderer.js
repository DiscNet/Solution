const fs = require("fs");
const path = require("path");
const { isTextOnly, sendInteractiveMessage } = require("./uiMode");
const { createStatusQuoted } = require("./statusCard");
const catalog = require("./menuCatalog");
const config = require("../../config/config");
const menus = require("../mensagens/menus");

// Mantém a arte do submenu e divide apenas legendas grandes demais para mídia.
function splitCaption(value, limit = 3500) {
  const chunks = [];
  let current = "";
  for (const line of String(value).split("\n")) {
    if (current && current.length + line.length + 1 > limit) {
      chunks.push(current);
      current = "";
    }
    current += (current ? "\n" : "") + line;
  }
  if (current) chunks.push(current);
  return chunks;
}

function getFraseFilosofica() {
  try {
    const file = path.join(__dirname, "..", "..", "database", "frases.json");
    if (!fs.existsSync(file)) return "";

    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const frases = Array.isArray(data.frases) ? data.frases : [];
    if (!frases.length) return "";

    const item = frases[Math.floor(Math.random() * frases.length)];

    return (
      "\n\n╭─🪐〔 𝙵𝚁𝙰𝚂𝙴 𝙳𝙾 𝙳𝙸𝙰 〕🪐─╮\n" +
      "┃ ✦ \"" + item.frase + "\"\n" +
      "┃ ✦ — " + item.autor + "\n" +
      "╰─🪐━━━━━━━━━━━━━🪐─╯"
    );
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
      newsletterName: menus.botName(),
      serverMessageId: 116,
    },
  };
}

function imagePath(name) {
  const imagesDir = path.join(__dirname, "..", "..", "imagens");
  const preferred = path.join(
    imagesDir,
    menus.menuImages[name] || "menu.jpg"
  );
  const fallback = path.join(imagesDir, "menu.jpg");

  return fs.existsSync(preferred)
    ? preferred
    : fallback;
}

async function sendStyledMenu(
  conn,
  msg,
  from,
  { name, title, body, page, pages, next }
) {
  const prefix = config.prefix || ".";

  const caption =
    menus.header(title, prefix, page, pages) +
    "\n" +
    body +
    (next
      ? "\n\n╭─┄─🧊〔 𝙽𝙰𝚅𝙴𝙶𝙰𝙲̧𝙰̃𝙾 〕\n├̬⌑ؔ͟ " +
        next +
        "\n╰─┄─🧊"
      : "") +
    getFraseFilosofica();

  const img = imagePath(name);
  const quoted = createStatusQuoted(msg);
  const chunks = splitCaption(caption);

  if (fs.existsSync(img)) {
    await conn.sendMessage(
      from,
      {
        image: fs.readFileSync(img),
        caption: chunks.shift(),
        contextInfo: contextInfo(),
      },
      { quoted }
    );
  } else {
    await conn.sendMessage(
      from,
      {
        text: chunks.shift(),
        contextInfo: contextInfo(),
      },
      { quoted }
    );
  }

  for (const text of chunks) {
    await conn.sendMessage(from, { text, contextInfo: contextInfo() });
  }

  await conn.sendMessage(from, {
    react: {
      text: "🧊",
      key: msg.key,
    },
  });
}

async function sendMainMenu(conn, msg, from) {
  const prefix = config.prefix || ".";

  if (isTextOnly(from)) {
    const img = imagePath("menugeral");
    const caption = menus.textGeneral(prefix);
    if (fs.existsSync(img)) {
      await conn.sendMessage(from, {
        image: fs.readFileSync(img),
        caption,
        contextInfo: contextInfo(),
      }, { quoted: createStatusQuoted(msg) });
    } else {
      await conn.sendMessage(from, {
        text: caption,
        contextInfo: contextInfo(),
      }, { quoted: createStatusQuoted(msg) });
    }
    await conn.sendMessage(from, { react: { text: "🧊", key: msg.key } });
    return;
  }

  await sendInteractiveMessage(
    conn,
    from,
    {
      ...menus.mainPayload(prefix),
      contextInfo: contextInfo(),
    },
    {
      quoted: createStatusQuoted(msg),
    }
  );

  await conn.sendMessage(from, {
    react: {
      text: "🧊",
      key: msg.key,
    },
  });
}

function createMenu(name, category, aliases = []) {
  return {
    name,
    aliases,
    menuCategory: "Menus",
    menuSection: "Navegação",
    usage: name + " [seção]",
    description: "Uso: ." + name + " [seção]",

    async execute(conn, msg, args = [], from) {
      try {
        const prefix = config.prefix || ".";
        let chosen = category;
        const params = [...args];

        if (name === "menu" && !params.length) {
          return sendMainMenu(conn, msg, from);
        }

        if (name === "menu") {
          const key = catalog.normalize(params.shift());

          if (!Object.hasOwn(catalog.categories, key)) {
            return sendStyledMenu(conn, msg, from, {
              name,
              title: "Categorias",
              body:
                "╭─┄─💎〔 𝙲𝙰𝚃𝙴𝙶𝙾𝚁𝙸𝙰𝚂 〕\n" +
                menus.index(prefix, catalog),
            });
          }

          chosen = catalog.categories[key];
        }

        if (
          name === "menugeral" &&
          Object.hasOwn(
            catalog.categories,
            catalog.normalize(params[0])
          )
        ) {
          chosen =
            catalog.categories[
              catalog.normalize(params.shift())
            ];
        }

        const section = params.join(" ");

        const parts = catalog.pages({
          category: chosen,
          section,
          prefix,
          limit: 60000,
        });

        if (!parts.length) {
          const available =
            catalog.sections(chosen).join(" · ") ||
            "Nenhuma";

          return sendStyledMenu(conn, msg, from, {
            name,
            title: chosen || "Todos os comandos",
            body:
              "╭─┄─💎〔 𝚂𝙴𝙲̧𝙾̃𝙴𝚂 〕\n" +
              "├̬⌑ؔ͟ 「🧊」Seção não encontrada.\n" +
              "├̬⌑ؔ͟ 「🧊」Disponíveis: " +
              available +
              "\n╰─┄─💎",
          });
        }

        return sendStyledMenu(conn, msg, from, {
          name,
          title: chosen || "Todos os comandos",
          body: menus.decoratePage(
            parts.join("\n")
          ),
        });
      } catch (error) {
        console.error("Erro no " + name + ":", error);

        await conn.sendMessage(
          from,
          {
            text: "❌ Erro ao carregar o menu.",
          },
          {
            quoted: createStatusQuoted(msg),
          }
        );
      }
    },
  };
}

module.exports = {
  createMenu,
  index: prefix => menus.index(prefix, catalog),
  decoratePage: menus.decoratePage,
  sendMainMenu,
};
