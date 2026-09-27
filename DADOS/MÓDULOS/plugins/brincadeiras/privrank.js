const comandos = require("../../../database/lib/comandos");
const privRush = require("../../functions/privRush");

function formatTime(ms) {
  if (ms == null || !Number.isFinite(Number(ms))) return "—";
  const seconds = Math.max(0, Number(ms)) / 1000;
  return seconds < 60
    ? seconds.toFixed(seconds < 10 ? 1 : 0) + "s"
    : Math.floor(seconds / 60) + "m " + Math.floor(seconds % 60) + "s";
}

module.exports = comandos.setCommand({
  nome: "privrank",
  comandos: ["privrank", "privscore", "rankpriv"],
  categoria: "brincadeiras",
  info: {
    descricao: "Mostra o ranking local do PrivRush neste chat.",
    uso: "privrank",
    categoria: "brincadeiras",
  },

  async executar(ctx) {
    const ranking = privRush.leaderboard(ctx.from, 10);

    if (!ranking.length) {
      return ctx.reply(
        "🏁 *PRIVRUSH*\n\nAinda não houve nenhum resgate neste chat."
      );
    }

    const medals = ["🥇", "🥈", "🥉"];
    const mentions = [];
    const lines = ranking.map((item, index) => {
      mentions.push(item.jid);
      const medal = medals[index] || "▫️";
      const user = "@" + String(item.jid).split("@")[0];

      return (
        medal + " *" + (index + 1) + "º* " + user +
        "\n   💠 " + item.points + " pts" +
        " • 🏆 " + item.wins +
        " • ⚡ " + formatTime(item.bestMs)
      );
    });

    return ctx.reply(
      "🏁 *RANK PRIVRUSH — ESTE CHAT*\n\n" +
      lines.join("\n\n") +
      "\n\n💡 Pontos extras são dados para resgates mais rápidos.",
      mentions
    );
  },
});
