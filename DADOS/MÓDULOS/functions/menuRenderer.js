const fs = require("fs");
const path = require("path");
const { isTextOnly, sendInteractiveMessage } = require("./uiMode");
const { createStatusQuoted } = require("./statusCard");
const catalog = require("./menuCatalog");
const config = require("../../config/config");
const menus = require("../mensagens/menus");

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

  // Cada categoria segue a mesma moldura do menu principal e é enviada
  // em uma única mensagem, sem paginação ou blocos adicionais.
  const caption = menus.header(title, prefix, page, pages) + "\n" + body;

  const img = imagePath(name);
  const quoted = createStatusQuoted(msg);

  // O arquivo local é preferido quando existir; caso contrário, todas as
  // categorias usam exatamente a mesma arte remota do menu principal.
  const image = fs.existsSync(img)
    ? fs.readFileSync(img)
    : { url: menus.IMAGE_URL };

  await conn.sendMessage(
    from,
    {
      image,
      caption,
      contextInfo: contextInfo(),
    },
    { quoted }
  );

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
    const image = fs.existsSync(img)
      ? fs.readFileSync(img)
      : { url: menus.IMAGE_URL };
    const caption = menus.textGeneral(prefix);
    await conn.sendMessage(
      from,
      { image, caption, contextInfo: contextInfo() },
      { quoted: createStatusQuoted(msg) }
    );
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
            body: menus.decorateCategory(
              "Seção não encontrada.\nDisponíveis: " + available,
              chosen || "Comandos"
            ),
          });
        }

        return sendStyledMenu(conn, msg, from, {
          name,
          title: chosen || "Todos os comandos",
          body: menus.decorateCategory(parts.join("\n"), chosen || "Comandos"),
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
  decorateCategory: menus.decorateCategory,
  sendMainMenu,
};
