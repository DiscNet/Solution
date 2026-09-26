const r = require("../../sistemas/rpg/index");
const comandos = require("../../database/lib/comandos");

module.exports = comandos.setCommand({
  nome: "ranklevel",
  comandos: ["ranklevel", "rankpatente", "rankinglevel"],
  categoria: "rpg",
  info: {
    descricao: "Mostra o ranking de XP e Level do grupo.",
    uso: "ranklevel",
    requisitos: "Modo RPG",
    categoria: "rpg",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.temRpg(ctx)) return ctx.reply(ctx.mess.rpgDesativado(ctx.prefix));

    const lista = r.rank(ctx, "xp").slice(0, 10);

    return ctx.reply(
      ctx.mess.levelRank(lista),
      lista.map(item => item.jid)
    );
  },
});
