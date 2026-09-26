const r = require("../../sistemas/rpg/index");
const dylan = require("../../database/lib/comandos");
const { compacto } = require("../../sistemas/rpg/texto");

function temMateriais(aventura, custo) {
  return Object.entries(custo || {}).every(
    ([id, qtd]) => Number(aventura.materiais?.[id] || 0) >= Number(qtd || 0)
  );
}

module.exports = dylan.setCommand({
  nome: "arsenal",
  comandos: ["arsenal", "forjar", "equipar"],
  categoria: "rpg",
  info: {
    descricao: "Armas, forja e equipamento do RPG.",
    uso: "arsenal",
    requisitos: "Modo RPG",
    categoria: "rpg",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.temRpg(ctx)) return ctx.reply(ctx.mess.rpgDesativado(ctx.prefix));

    const usuario = r.user(ctx);
    const aventura = r.normalizarAventura(usuario);
    const comando = String(ctx.command || "").toLowerCase();

    if (comando === "arsenal") {
      return ctx.reply(
        compacto(ctx, "⚔️", "Arsenal", [
          { emoji: "🎒", texto: "Armas: " + (aventura.armas.join(", ") || "nenhuma") },
          { emoji: "🗡️", texto: "Equipada: " + (aventura.armaEquipada || "nenhuma") },
          { emoji: "⛏️", texto: "Ferro: " + aventura.materiais.ferro + " • Madeira: " + aventura.materiais.madeira },
          { emoji: "💎", texto: "Cristal: " + aventura.materiais.cristal + " • Essência: " + aventura.materiais.essencia },
          ...Object.entries(r.ARMAS_RPG).map(([id, arma]) => ({
            emoji: arma.emoji,
            texto: id + " • poder " + arma.poder + " • " +
              Object.entries(arma.custo).map(([m, q]) => q + " " + m).join(", "),
          })),
        ])
      );
    }

    const id = String(ctx.args?.[0] || "").toLowerCase();
    const arma = r.ARMAS_RPG[id];

    if (!arma) {
      return ctx.reply(
        compacto(ctx, "⚔️", "Arma inválida", [
          { emoji: "📌", texto: ctx.prefix + "arsenal" },
        ])
      );
    }

    if (comando === "forjar") {
      if (!temMateriais(aventura, arma.custo)) {
        return ctx.reply(
          compacto(ctx, "⛏️", "Materiais insuficientes", [
            {
              emoji: arma.emoji,
              texto: Object.entries(arma.custo)
                .map(([m, q]) => q + " " + m)
                .join(", "),
            },
          ])
        );
      }

      for (const [material, qtd] of Object.entries(arma.custo)) {
        aventura.materiais[material] -= qtd;
      }

      if (!aventura.armas.includes(id)) aventura.armas.push(id);
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, arma.emoji, "Arma forjada", [
          { emoji: arma.emoji, texto: arma.nome },
          { emoji: "⚔️", texto: "Poder: " + arma.poder },
        ])
      );
    }

    if (!aventura.armas.includes(id)) {
      return ctx.reply(
        compacto(ctx, "🔒", "Arma não forjada", [
          { emoji: "📌", texto: ctx.prefix + "forjar " + id },
        ])
      );
    }

    aventura.armaEquipada = id;
    r.salvar(ctx);

    return ctx.reply(
      compacto(ctx, arma.emoji, "Arma equipada", [
        { emoji: arma.emoji, texto: arma.nome },
        { emoji: "⚔️", texto: "Poder total: " + r.poderAventureiro(usuario) },
      ])
    );
  },
});
