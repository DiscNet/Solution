const r = require("../../sistemas/rpg/index");
const comandos = require("../../database/lib/comandos");

module.exports = comandos.setCommand({
  nome: "level",
  comandos: ["level", "patente", "nivel"],
  categoria: "rpg",
  info: {
    descricao: "Mostra Level, XP, patente e posição no ranking.",
    uso: "level",
    requisitos: "Modo RPG",
    categoria: "rpg",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.temRpg(ctx)) return ctx.reply(ctx.mess.rpgDesativado(ctx.prefix));

    const usuario = r.user(ctx);
    const ranking = r.rank(ctx, "xp");
    const posicao = ranking.findIndex(item => item.jid === ctx.normalizar(ctx.sender)) + 1;

    r.salvar(ctx);

    return ctx.reply(
      ctx.mess.levelPerfil(ctx.sender, usuario, posicao),
      [ctx.sender]
    );
  },
});
