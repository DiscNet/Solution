const tokitoApi = require("../../functions/tokitoApi");
const { createStatusQuoted } = require("../../functions/statusCard");

function figuCommand(name, endpoint, description) {
  return {
    name,
    aliases: [],
    menuCategory: "Stickers",
    menuSection: "Tokito API",
    usage: name + " [1-10]",
    description,
    async execute(conn, msg, args, from) {
      const amount = Math.min(10, Math.max(1, Number(args[0] || 1)));
      if (!Number.isInteger(amount)) return conn.sendMessage(from, { text: "❌ Informe uma quantidade de 1 a 10." }, { quoted: createStatusQuoted(msg) });
      try {
        await conn.sendMessage(from, { react: { text: "🧊", key: msg.key } }).catch(() => {});
        for (let i = 0; i < amount; i++) {
          await conn.sendMessage(from, {
            sticker: { url: tokitoApi.url("/api/stickers/" + endpoint, { cache: Date.now() + "-" + i }) },
          }, i === 0 ? { quoted: createStatusQuoted(msg) } : {});
        }
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        console.error("[TOKITO FIGU]", name, error.message);
        await conn.sendMessage(from, { text: "❌ Não foi possível obter figurinhas desse pacote." }, { quoted: createStatusQuoted(msg) });
      }
    },
  };
}

const commands = [
  figuCommand("figu", "figurinhas", "Envia figurinhas aleatórias da Tokito API"),
  figuCommand("figuemoji", "figu_emoji", "Envia figurinhas de emoji da Tokito API"),
  figuCommand("figuanime", "figu_anime", "Envia figurinhas de anime da Tokito API"),
  figuCommand("figuengracada", "figu_engracadas", "Envia figurinhas engraçadas da Tokito API"),
  figuCommand("figuriva", "figu_raiva", "Envia figurinhas de raiva da Tokito API"),
  figuCommand("figuflork", "figu_flork", "Envia figurinhas Flork da Tokito API"),
  figuCommand("figucoreana", "figu_coreana", "Envia figurinhas coreanas da Tokito API"),
  figuCommand("figubebe", "figu_bebe", "Envia figurinhas de bebê da Tokito API"),
  figuCommand("figuanimais", "figu_animais", "Envia figurinhas de animais da Tokito API"),
  figuCommand("figudesenho", "figu_desenho", "Envia figurinhas de desenho da Tokito API"),
  figuCommand("figurimuru", "figu_rimuru", "Envia figurinhas Rimuru da Tokito API"),

];

module.exports = commands;
module.exports._test = { figuCommand };
