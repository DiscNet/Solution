const r = require("../../sistemas/rpg/index");
const comandos = require("../../../database/lib/comandos");

module.exports = comandos.setCommand({
  nome: "addxp",
  comandos: ["addxp", "addlevel", "tirarxp", "removexp", "tirarlevel"],
  categoria: "rpg",
  info: {
    descricao: "Gerencia XP e Level de um jogador.",
    uso: "addxp @usuario quantidade",
    permissao: "Dono",
    categoria: "rpg",
  },

  async executar(ctx) {
    if (!ctx.SoDono) return ctx.reply(ctx.mess.onlyOwner());
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());

    const alvo = ctx.normalizar(
      (ctx.menc_jid2 || [])[0] ||
      ctx.menc_prt ||
      ctx.sender
    );

    const valor = Number(
      String(ctx.q || "")
        .replace(/@\S+/g, "")
        .replace(/[^0-9]/g, "")
    );

    if (!valor) {
      return ctx.reply(
        ctx.mess.levelGerenciarUso(ctx.prefix, ctx.command)
      );
    }

    const usuario = r.user(ctx, alvo);
    const remover = /tirar|remove/.test(ctx.command);

    if (/level/.test(ctx.command)) {
      const xpAlvo = r.MARCOS[Math.max(0, valor - 2)] || 0;
      usuario.xp = remover
        ? Math.max(0, Number(usuario.xp || 0) - xpAlvo)
        : Math.max(Number(usuario.xp || 0), xpAlvo);
    } else {
      usuario.xp = Math.max(
        0,
        Number(usuario.xp || 0) + (remover ? -valor : valor)
      );
    }

    usuario.level = r.nivelPorXp(usuario.xp);
    usuario.patente = r.patente(usuario.xp);
    r.salvar(ctx);

    return ctx.reply(
      ctx.mess.levelGerenciado(alvo, usuario, remover),
      [alvo]
    );
  },
});
