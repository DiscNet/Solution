const comandos = require("../../../database/lib/comandos");
const privRush = require("../../functions/privRush");

function formatTime(ms) {
  const value = Math.max(0, Number(ms || 0));
  if (value < 1000) return value + "ms";
  const seconds = value / 1000;
  return seconds < 60
    ? seconds.toFixed(seconds < 10 ? 1 : 0) + "s"
    : Math.floor(seconds / 60) + "m " + Math.floor(seconds % 60) + "s";
}

module.exports = comandos.setCommand({
  nome: "resgatar",
  comandos: ["resgatar", "resgate", "claim"],
  categoria: "brincadeiras",
  info: {
    descricao: "Resgata um código secreto do PrivRush antes de todo mundo.",
    uso: "resgatar KX-ABCD-EFGH",
    categoria: "brincadeiras",
  },

  async executar(ctx) {
    const code = String(ctx.args?.[0] || "").trim();

    if (!code) {
      return ctx.reply(
        "🏁 *PRIVRUSH — RESGATE*\n\n" +
        "Abra um link criado por *.privnote*.\n" +
        "Se você for a primeira pessoa a revelar a nota, haverá um código dentro.\n\n" +
        "Use: *" + ctx.prefix + "resgatar KX-XXXX-XXXX*"
      );
    }

    const result = privRush.claimDrop({
      code,
      user: ctx.normalizar(ctx.sender),
      claimChatId: ctx.from,
    });

    if (result.status === "invalid") {
      return ctx.reply("❌ Código inválido ou PrivRush inexistente.");
    }

    if (result.status === "expired") {
      return ctx.reply("⌛ Esse PrivRush expirou antes do resgate.");
    }

    if (result.status === "claimed") {
      return ctx.reply("🥈 Tarde demais. Alguém já resgatou esse PrivRush.");
    }

    if (result.status === "creator") {
      return ctx.reply(
        "🚫 Quem criou o PrivRush não pode resgatar o próprio código."
      );
    }

    return ctx.reply(
      "🏆 *PRIVRUSH — VOCÊ CHEGOU PRIMEIRO!*\n\n" +
      "👤 Vencedor: @" + ctx.sender.split("@")[0] + "\n" +
      "⚡ Tempo: *" + formatTime(result.elapsedMs) + "*\n" +
      "💠 Pontos: *+" + result.points + " PrivPoints*\n" +
      (result.bonus
        ? "🚀 Bônus de velocidade: *+" + result.bonus + "*\n"
        : "") +
      "🎯 Vitórias neste chat: *" + result.wins + "*\n" +
      "🏅 Total neste chat: *" + result.totalPoints + " PrivPoints*",
      [ctx.sender]
    );
  },
});
