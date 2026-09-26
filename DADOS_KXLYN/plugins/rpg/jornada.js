const r = require("../../sistemas/rpg/index");
const dylan = require("../../database/lib/comandos");
const { compacto, tempo } = require("../../sistemas/rpg/texto");

function cooldown(ultimo, duracao) {
  const falta = duracao - (Date.now() - Number(ultimo || 0));
  return falta > 0 ? Math.ceil(falta / 1000) : 0;
}

module.exports = dylan.setCommand({
  nome: "jornada",
  comandos: [
    "jornada",
    "classe",
    "escolherclasse",
    "aventura",
    "explorar",
    "descansarheroi",
    "historia",
  ],
  categoria: "rpg",
  info: {
    descricao: "Jornada, classes, exploração e história do RPG.",
    uso: "jornada",
    requisitos: "Modo RPG",
    categoria: "rpg",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.temRpg(ctx)) return ctx.reply(ctx.mess.rpgDesativado(ctx.prefix));

    const comando = String(ctx.command || "").toLowerCase();
    const usuario = r.user(ctx);
    const aventura = r.normalizarAventura(usuario);

    if (["jornada", "classe"].includes(comando)) {
      const classe = r.CLASSES_RPG[aventura.classe];
      return ctx.reply(
        compacto(ctx, "🗺️", "Jornada RPG", [
          {
            emoji: classe?.emoji || "🧭",
            texto: classe
              ? "Classe: " + classe.nome
              : "Escolha uma classe com " + ctx.prefix + "escolherclasse guerreiro",
          },
          { emoji: "❤️", texto: "Vida: " + aventura.vida + "%" },
          { emoji: "⚡", texto: "Energia: " + aventura.energia + "%" },
          { emoji: "✨", texto: "XP: " + usuario.xp + " • Level " + usuario.level },
          { emoji: "🗺️", texto: "Aventuras: " + aventura.aventuras },
          { emoji: "📖", texto: "Capítulo: " + aventura.capitulo + "/" + r.CAPITULOS_RPG.length },
        ])
      );
    }

    if (comando === "escolherclasse") {
      const id = String(ctx.args?.[0] || "").toLowerCase();
      const classe = r.CLASSES_RPG[id];

      if (!classe) {
        return ctx.reply(
          compacto(ctx, "🧭", "Classes disponíveis",
            Object.entries(r.CLASSES_RPG).map(([key, item]) => ({
              emoji: item.emoji,
              texto: key + " • " + item.descricao,
            }))
          )
        );
      }

      aventura.classe = id;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, classe.emoji, "Classe escolhida", [
          { emoji: classe.emoji, texto: classe.nome },
          { emoji: "⚔️", texto: "Poder base: " + classe.poder },
          { emoji: "🛡️", texto: "Defesa base: " + classe.defesa },
        ])
      );
    }

    if (comando === "descansarheroi") {
      aventura.vida = 100;
      aventura.energia = 100;
      aventura.ultimaRecuperacao = Date.now();
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "🏕️", "Descanso concluído", [
          { emoji: "❤️", texto: "Vida recuperada: 100%" },
          { emoji: "⚡", texto: "Energia recuperada: 100%" },
        ])
      );
    }

    if (comando === "historia") {
      const atual = Number(aventura.capitulo || 0);

      if (atual >= r.CAPITULOS_RPG.length) {
        return ctx.reply(
          compacto(ctx, "📖", "História concluída", [
            { emoji: "👑", texto: "Todos os capítulos disponíveis foram concluídos." },
          ])
        );
      }

      const necessario = atual * 3;

      if (Number(aventura.aventuras || 0) < necessario) {
        return ctx.reply(
          compacto(ctx, "🔒", "Capítulo bloqueado", [
            { emoji: "🗺️", texto: "Complete " + necessario + " aventuras." },
            { emoji: "📊", texto: "Progresso: " + aventura.aventuras + "/" + necessario },
          ])
        );
      }

      const capitulo = r.CAPITULOS_RPG[atual];
      aventura.capitulo = atual + 1;
      r.addXp(ctx, 25);
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "📖", "Capítulo " + (atual + 1) + " • " + capitulo.titulo, [
          { emoji: "📜", texto: capitulo.texto },
          { emoji: "✨", texto: "+25 XP" },
        ])
      );
    }

    const falta = cooldown(aventura.ultimaAventura, 5 * 60 * 1000);

    if (falta) {
      return ctx.reply(
        compacto(ctx, "⏳", "Aventura em espera", [
          { emoji: "⏱️", texto: "Tente novamente em " + tempo(falta) },
        ])
      );
    }

    if (Number(aventura.energia || 0) < 12) {
      return ctx.reply(
        compacto(ctx, "⚡", "Sem energia", [
          { emoji: "📊", texto: "Energia atual: " + aventura.energia + "%" },
          { emoji: "🏕️", texto: "Use " + ctx.prefix + "descansarheroi" },
        ])
      );
    }

    const evento = r.escolher(r.AVENTURAS_RPG);
    const poder = r.poderAventureiro(usuario);
    const sucesso = Math.random() * 100 < Math.min(92, 58 + poder / 5);
    const xp = sucesso ? r.aleatorio(18, 40) : r.aleatorio(5, 12);
    const ganho = sucesso ? r.aleatorio(120, 480) : 0;
    const material = r.escolher(["ferro", "madeira", "cristal", "essencia"]);
    const quantidade = sucesso ? r.aleatorio(1, material === "essencia" ? 2 : 4) : 0;

    aventura.energia = r.limitar(Number(aventura.energia || 0) - 12);
    aventura.vida = r.limitar(
      Number(aventura.vida || 0) -
      (sucesso ? r.aleatorio(0, 4) : r.aleatorio(5, 14))
    );
    aventura.aventuras = Number(aventura.aventuras || 0) + 1;
    aventura.ultimaAventura = Date.now();

    if (sucesso) {
      aventura.vitorias = Number(aventura.vitorias || 0) + 1;
      r.adicionarMaterial(usuario, material, quantidade);
      r.adicionarPontosGuilda(ctx, usuario, Math.max(1, Math.floor(xp / 2)));
    } else {
      aventura.derrotas = Number(aventura.derrotas || 0) + 1;
    }

    r.addXp(ctx, xp);

    if (r.temCoins(ctx)) {
      const economia = r.eco(ctx);
      economia.coins = Number(economia.coins || 0) + ganho;
    }

    r.salvar(ctx);

    return ctx.reply(
      compacto(ctx, evento.emoji, evento.nome, [
        {
          emoji: sucesso ? "✅" : "💥",
          texto: sucesso
            ? evento.texto
            : "A exploração falhou, mas você ganhou experiência.",
        },
        { emoji: "✨", texto: "+" + xp + " XP" },
        r.temCoins(ctx) ? { emoji: "🪙", texto: "+" + ganho.toLocaleString("pt-BR") + " N-Coins" } : null,
        sucesso ? { emoji: "🎒", texto: "+" + quantidade + " " + material } : null,
        { emoji: "❤️", texto: "Vida: " + aventura.vida + "%" },
        { emoji: "⚡", texto: "Energia: " + aventura.energia + "%" },
      ])
    );
  },
});
