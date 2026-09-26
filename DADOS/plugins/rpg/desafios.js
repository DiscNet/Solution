const r = require("../../sistemas/rpg/index");
const comandos = require("../../database/lib/comandos");
const { compacto, tempo } = require("../../sistemas/rpg/texto");

function restante(ultimo, duracao) {
  const falta = duracao - (Date.now() - Number(ultimo || 0));
  return falta > 0 ? Math.ceil(falta / 1000) : 0;
}

module.exports = comandos.setCommand({
  nome: "desafios",
  comandos: ["torre", "masmorra", "boss", "raid"],
  categoria: "rpg",
  info: {
    descricao: "Bosses, torre, masmorra e raids do RPG.",
    uso: "boss dragao",
    requisitos: "Modo RPG",
    categoria: "rpg",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.temRpg(ctx)) return ctx.reply(ctx.mess.rpgDesativado(ctx.prefix));

    const usuario = r.user(ctx);
    const aventura = r.normalizarAventura(usuario);
    const comando = String(ctx.command || "").toLowerCase();

    const duracao = comando === "raid"
      ? 30 * 60 * 1000
      : comando === "torre"
        ? 15 * 60 * 1000
        : 10 * 60 * 1000;

    const campoCooldown = comando === "torre"
      ? "ultimaTorre"
      : comando === "raid"
        ? "ultimaRaid"
        : "ultimoBoss";

    const espera = restante(aventura[campoCooldown], duracao);

    if (espera) {
      return ctx.reply(
        compacto(ctx, "⏳", "Desafio em espera", [
          { emoji: "⏱️", texto: "Tente novamente em " + tempo(espera) },
        ])
      );
    }

    let bossId = String(ctx.args?.[0] || "").toLowerCase();

    if (!r.BOSSES_RPG[bossId]) {
      bossId = r.escolher(Object.keys(r.BOSSES_RPG));
    }

    const boss = r.BOSSES_RPG[bossId];
    const meuPoder = r.poderAventureiro(usuario) + r.aleatorio(0, 60);
    const multiplicador = comando === "raid" ? 1.35 : comando === "torre" ? 1.15 : 1;
    const venceu = meuPoder >= boss.poder * multiplicador;
    const xp = venceu ? r.aleatorio(boss.xp[0], boss.xp[1]) : r.aleatorio(8, 20);
    const coins = venceu && r.temCoins(ctx)
      ? r.aleatorio(boss.coins[0], boss.coins[1])
      : 0;
    const material = venceu ? r.aleatorio(1, comando === "raid" ? 4 : 2) : 0;

    aventura[campoCooldown] = Date.now();
    aventura.energia = r.limitar(Number(aventura.energia || 0) - (comando === "raid" ? 30 : 20));
    aventura.vida = r.limitar(Number(aventura.vida || 0) - (venceu ? r.aleatorio(2, 8) : r.aleatorio(10, 25)));

    if (venceu) {
      r.adicionarMaterial(usuario, boss.material, material);
      r.adicionarPontosGuilda(ctx, usuario, Math.max(2, Math.floor(xp / 3)));
      if (r.temCoins(ctx)) r.eco(ctx).coins += coins;
    }

    r.addXp(ctx, xp);
    r.salvar(ctx);

    return ctx.reply(
      compacto(ctx, venceu ? "🏆" : "💥", comando.toUpperCase() + " • " + boss.nome, [
        { emoji: boss.emoji, texto: boss.nome + " • poder " + boss.poder },
        { emoji: venceu ? "✅" : "❌", texto: venceu ? "Vitória!" : "Derrota." },
        { emoji: "✨", texto: "+" + xp + " XP" },
        r.temCoins(ctx) ? { emoji: "🪙", texto: "+" + coins.toLocaleString("pt-BR") + " N-Coins" } : null,
        venceu ? { emoji: "🎒", texto: "+" + material + " " + boss.material } : null,
        { emoji: "❤️", texto: "Vida: " + aventura.vida + "%" },
      ])
    );
  },
});
