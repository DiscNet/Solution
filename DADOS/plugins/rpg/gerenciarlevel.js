const r = require("../../sistemas/rpg/index");
const comandos = require("../../database/lib/comandos");
const { compacto } = require("../../sistemas/rpg/texto");

module.exports = comandos.setCommand({
  nome: "gerenciarlevel",
  comandos: ["rank", "blocklevel", "unblocklevel"],
  categoria: "rpg",
  info: {
    descricao: "Ranking geral e bloqueio de ganho de XP.",
    uso: "rank",
    requisitos: "Modo RPG",
    categoria: "rpg",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.temRpg(ctx)) return ctx.reply(ctx.mess.rpgDesativado(ctx.prefix));

    if (ctx.command === "rank") {
      const lista = r.rank(ctx, "xp").slice(0, 10);
      return ctx.reply(
        ctx.mess.levelRank(lista),
        lista.map(item => item.jid)
      );
    }

    if (!ctx.SoDono && !ctx.isGroupAdmins) {
      return ctx.reply(ctx.mess.soadm());
    }

    const dados = await ctx.destino().catch(() => null);
    const jid = dados?.mencao
      ? ctx.normalizar(dados.mencao)
      : null;

    if (!jid) {
      return ctx.reply(
        compacto(ctx, "🎖️", "Gerenciar Level", [
          {
            emoji: "📌",
            texto: ctx.prefix + ctx.command + " @usuario",
          },
        ])
      );
    }

    const usuario = r.user(ctx, jid);
    const bloquear = ctx.command === "blocklevel";

    usuario.bloqueado = bloquear;
    r.salvar(ctx);

    return ctx.reply(
      compacto(
        ctx,
        bloquear ? "🔒" : "🔓",
        bloquear ? "Level bloqueado" : "Level desbloqueado",
        [
          { emoji: "👤", texto: "@" + jid.split("@")[0] },
          {
            emoji: bloquear ? "⛔" : "✅",
            texto: bloquear
              ? "O ganho de XP foi bloqueado."
              : "O ganho de XP foi liberado.",
          },
        ]
      ),
      [jid]
    );
  },
});
