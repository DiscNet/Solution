const r = require("../../sistemas/rpg/index");
const dylan = require("../../database/lib/comandos");
const { compacto, dinheiro } = require("../../sistemas/rpg/texto");

function slug(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
}

module.exports = dylan.setCommand({
  nome: "guilda",
  comandos: ["guilda", "criarguilda", "entrarguilda", "sairguilda", "rankguilda"],
  categoria: "rpg",
  info: {
    descricao: "Criação, entrada, saída e ranking de guildas.",
    uso: "guilda",
    requisitos: "Modo RPG",
    categoria: "rpg",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.temRpg(ctx)) return ctx.reply(ctx.mess.rpgDesativado(ctx.prefix));

    const grupo = r.garantir(ctx);
    const usuario = r.user(ctx);
    const aventura = r.normalizarAventura(usuario);
    const comando = String(ctx.command || "").toLowerCase();

    if (comando === "rankguilda") {
      const lista = Object.values(grupo.rpg.guildas)
        .sort((a, b) => Number(b.pontos || 0) - Number(a.pontos || 0))
        .slice(0, 10);

      return ctx.reply(
        compacto(ctx, "🏰", "Ranking de Guildas",
          lista.length
            ? lista.map((g, i) => ({
                emoji: ["🥇", "🥈", "🥉"][i] || "🏅",
                texto: (i + 1) + "º " + g.nome + " • " + Number(g.pontos || 0) + " pontos",
              }))
            : [{ emoji: "📭", texto: "Nenhuma guilda criada." }]
        )
      );
    }

    if (comando === "criarguilda") {
      if (aventura.guilda) {
        return ctx.reply(compacto(ctx, "⚠️", "Guilda", [
          { emoji: "📌", texto: "Saia da sua guilda atual primeiro." },
        ]));
      }

      const nome = ctx.args.join(" ").trim().slice(0, 35);
      const id = slug(nome);

      if (nome.length < 3 || !id) {
        return ctx.reply(compacto(ctx, "🏰", "Criar Guilda", [
          { emoji: "📌", texto: ctx.prefix + "criarguilda Nome da Guilda" },
        ]));
      }

      if (grupo.rpg.guildas[id]) {
        return ctx.reply(compacto(ctx, "❌", "Guilda", [
          { emoji: "📌", texto: "Esse nome já está em uso." },
        ]));
      }

      const custo = r.temCoins(ctx) ? 3000 : 0;

      if (custo && r.eco(ctx).coins < custo) {
        return ctx.reply(ctx.mess.coinsSemSaldo(custo, r.eco(ctx).coins));
      }

      if (custo) r.eco(ctx).coins -= custo;

      grupo.rpg.guildas[id] = {
        id,
        nome,
        lider: ctx.normalizar(ctx.sender),
        membros: [ctx.normalizar(ctx.sender)],
        pontos: 0,
        criadoEm: Date.now(),
      };

      aventura.guilda = id;
      r.salvar(ctx);

      return ctx.reply(compacto(ctx, "🏰", "Guilda criada", [
        { emoji: "🏷️", texto: nome },
        { emoji: "👑", texto: "Líder: @" + ctx.sender.split("@")[0] },
        custo ? { emoji: "🪙", texto: "Custo: " + dinheiro(custo) } : null,
      ]), [ctx.sender]);
    }

    if (comando === "entrarguilda") {
      if (aventura.guilda) {
        return ctx.reply(compacto(ctx, "⚠️", "Guilda", [
          { emoji: "📌", texto: "Você já está em uma guilda." },
        ]));
      }

      const busca = slug(ctx.args.join(" "));
      const guilda = grupo.rpg.guildas[busca] ||
        Object.values(grupo.rpg.guildas).find(g => slug(g.nome) === busca);

      if (!guilda) {
        return ctx.reply(compacto(ctx, "❌", "Guilda", [
          { emoji: "📌", texto: "Guilda não encontrada." },
        ]));
      }

      const jid = ctx.normalizar(ctx.sender);
      if (!guilda.membros.includes(jid)) guilda.membros.push(jid);
      aventura.guilda = guilda.id;
      r.salvar(ctx);

      return ctx.reply(compacto(ctx, "✅", "Entrada na Guilda", [
        { emoji: "🏰", texto: guilda.nome },
        { emoji: "👥", texto: "Membros: " + guilda.membros.length },
      ]));
    }

    if (comando === "sairguilda") {
      const guilda = r.guildaDoUsuario(ctx, usuario);

      if (!guilda) {
        return ctx.reply(compacto(ctx, "📭", "Guilda", [
          { emoji: "📌", texto: "Você não está em uma guilda." },
        ]));
      }

      const jid = ctx.normalizar(ctx.sender);
      guilda.membros = guilda.membros.filter(id => id !== jid);
      aventura.guilda = null;

      if (guilda.lider === jid) {
        if (guilda.membros.length) guilda.lider = guilda.membros[0];
        else delete grupo.rpg.guildas[guilda.id];
      }

      r.salvar(ctx);

      return ctx.reply(compacto(ctx, "🚪", "Guilda", [
        { emoji: "✅", texto: "Você saiu da guilda." },
      ]));
    }

    const guilda = r.guildaDoUsuario(ctx, usuario);

    if (!guilda) {
      return ctx.reply(compacto(ctx, "🏰", "Guilda", [
        { emoji: "📌", texto: ctx.prefix + "criarguilda Nome" },
        { emoji: "📌", texto: ctx.prefix + "entrarguilda Nome" },
        { emoji: "🏆", texto: ctx.prefix + "rankguilda" },
      ]));
    }

    return ctx.reply(
      compacto(ctx, "🏰", guilda.nome, [
        { emoji: "👑", texto: "Líder: @" + String(guilda.lider || "").split("@")[0] },
        { emoji: "👥", texto: "Membros: " + guilda.membros.length },
        { emoji: "⭐", texto: "Pontos: " + Number(guilda.pontos || 0) },
        { emoji: "🆔", texto: guilda.id },
      ]),
      guilda.membros
    );
  },
});
