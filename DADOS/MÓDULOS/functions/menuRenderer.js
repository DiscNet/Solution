const fs = require("fs");
const path = require("path");
const config = require("../../config/config");
const menus = require("../mensagens/menus");
const { createStatusQuoted } = require("./statusCard");
const { isTextOnly, sendInteractiveMessage } = require("./uiMode");

function menuImage(name) {
  const folder = path.join(__dirname, "..", "..", "imagens");
  const chosen = path.join(folder, menus.menuImages[name] || "menu.jpg");
  if (fs.existsSync(chosen)) return chosen;
  const fallback = path.join(folder, "menu.jpg");
  return fs.existsSync(fallback) ? fallback : null;
}

async function react(conn, msg, from) {
  if (msg?.key) {
    await conn.sendMessage(from, { react: { text: "🧭", key: msg.key } }).catch(() => {});
  }
}

async function sendMainMenu(conn, msg, from, extra = "") {
  const prefix = config.prefix || ".";
  const quoted = createStatusQuoted(msg);
  if (isTextOnly(from)) {
    await conn.sendMessage(from, {
      text: (extra ? extra + "\n\n" : "") + menus.mainText(prefix),
    }, { quoted });
  } else {
    const payload = menus.mainPayload(prefix);
    if (extra) payload.text = extra + "\n\n" + payload.text;
    await sendInteractiveMessage(conn, from, payload, { quoted });
  }
  await react(conn, msg, from);
}

async function sendCategory(conn, msg, from, name) {
  const prefix = config.prefix || ".";
  const body = menus.render(name, prefix);
  const img = menuImage(name);
  const content = img ? { image: fs.readFileSync(img), caption: body } : { text: body };
  await conn.sendMessage(from, content, { quoted: createStatusQuoted(msg) });
  await react(conn, msg, from);
}

function createMenu(name, category, aliases = []) {
  return {
    name,
    aliases,
    menuCategory: "Menus",
    menuSection: "Navegação",
    usage: name + (name === "menu" || name === "menugeral" ? " [categoria]" : ""),
    description: "Abre um menu escrito manualmente em menus.js",
    async execute(conn, msg, args = [], from) {
      try {
        const requested = args?.[0];
        const page = name === "menu" || name === "menugeral"
          ? menus.resolveMenu(requested)
          : name === "diversos" ? "menuoutros" : name;

        if (!page || page === "menugeral") {
          const prefix = config.prefix || ".";
          const extra = requested && !page
            ? "Categoria desconhecida. Veja as opções com " + prefix + "menu:"
            : "";
          return sendMainMenu(conn, msg, from, extra);
        }
        return sendCategory(conn, msg, from, page);
      } catch (error) {
        console.error("Erro no " + name + ":", error);
        return conn.sendMessage(from, { text: "❌ Erro ao carregar o menu." },
          { quoted: createStatusQuoted(msg) });
      }
    },
  };
}

module.exports = { createMenu, sendMainMenu };
