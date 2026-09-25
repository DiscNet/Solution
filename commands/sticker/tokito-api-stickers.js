const tokitoApi = require("../../functions/tokitoApi");
const { createStatusQuoted } = require("../../functions/statusCard");

function figuCommand(name, endpoint, description) {
  return {
    name,
    aliases: [],
    menuCategory: "Stickers",
    menuSection: "API",
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
        console.error("[API FIGU]", name, error.message);
        await conn.sendMessage(from, { text: "❌ Não foi possível obter figurinhas desse pacote." }, { quoted: createStatusQuoted(msg) });
      }
    },
  };
}

const commands = [
  figuCommand("figu", "figurinhas", "Envia figurinhas aleatórias da API"),
  figuCommand("figuemoji", "figu_emoji", "Envia figurinhas de emoji da API"),
  figuCommand("figuanime", "figu_anime", "Envia figurinhas de anime da API"),
  figuCommand("figuengracada", "figu_engracadas", "Envia figurinhas engraçadas da API"),
  figuCommand("figuriva", "figu_raiva", "Envia figurinhas de raiva da API"),
  figuCommand("figuflork", "figu_flork", "Envia figurinhas Flork da API"),
  figuCommand("figucoreana", "figu_coreana", "Envia figurinhas coreanas da API"),
  figuCommand("figubebe", "figu_bebe", "Envia figurinhas de bebê da API"),
  figuCommand("figuanimais", "figu_animais", "Envia figurinhas de animais da API"),
  figuCommand("figudesenho", "figu_desenho", "Envia figurinhas de desenho da API"),
  figuCommand("figurimuru", "figu_rimuru", "Envia figurinhas Rimuru da API"),

];

module.exports = commands;
module.exports._test = { figuCommand };
