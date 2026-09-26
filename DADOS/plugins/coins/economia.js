const r = require("../../sistemas/rpg/index");
const comandos = require("../../database/lib/comandos");
const { compacto, dinheiro, tempo } = require("../../sistemas/rpg/texto");

function cooldown(ultimo, duracao) {
  const falta = duracao - (Date.now() - Number(ultimo || 0));
  return falta > 0 ? Math.ceil(falta / 1000) : 0;
}

function apostaDoTexto(ctx) {
  const valor = Number(
    String(ctx.q || "")
      .replace(/[^0-9]/g, "")
  );
  return Math.max(0, Math.floor(valor || 0));
}

function inventarioLinhas(usuario) {
  const itens = Object.entries(usuario.itensCoins || {})
    .filter(([, qtd]) => Number(qtd || 0) > 0);

  return itens.length
    ? itens.map(([id, qtd]) => {
        const item = r.COINS_LOJA[id] || { nome: id, emoji: "📦" };
        return {
          emoji: item.emoji,
          texto: item.nome + " x" + qtd,
        };
      })
    : [{ emoji: "📭", texto: "Seu inventário está vazio." }];
}

module.exports = comandos.setCommand({
  nome: "economiacoins",
  comandos: [
    "trabalharcoins",
    "jobcoins",
    "roubarcoins",
    "rouboncoins",
    "cassino",
    "cassinocoins",
    "apostarcoins",
    "dadoapostado",
    "slot",
    "slotcoins",
    "lojacoins",
    "lojancoins",
    "inventariocoins",
    "invcoins",
    "comprarcerveja",
    "comprarjob",
    "comprarbomba",
    "comprararma",
    "pocao",
    "comprarpocao",
    "escudo",
    "comprarescudo",
  ],
  categoria: "coins",
  info: {
    descricao: "Trabalho, roubo, cassino e loja da economia.",
    uso: "cassino 500",
    requisitos: "Modo Coins",
    categoria: "coins",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.temCoins(ctx)) return ctx.reply(ctx.mess.coinsDesativado(ctx.prefix));

    const comando = String(ctx.command || "").toLowerCase();
    const usuario = r.eco(ctx);

    if (["lojacoins", "lojancoins"].includes(comando)) {
      return ctx.reply(
        compacto(ctx, "🛒", "Loja de N-Coins",
          Object.entries(r.COINS_LOJA).map(([id, item]) => ({
            emoji: item.emoji,
            texto: item.nome + " • " + dinheiro(item.preco) +
              " • " + ctx.prefix + "comprar" + id,
          }))
        )
      );
    }

    if (["inventariocoins", "invcoins"].includes(comando)) {
      return ctx.reply(
        compacto(ctx, "🎒", "Inventário de Coins", inventarioLinhas(usuario))
      );
    }

    const compraMap = {
      comprarcerveja: "cerveja",
      comprarjob: "job",
      comprarbomba: "bomba",
      comprararma: "arma",
      pocao: "pocao",
      comprarpocao: "pocao",
      escudo: "escudo",
      comprarescudo: "escudo",
    };

    if (compraMap[comando]) {
      const id = compraMap[comando];
      const item = r.COINS_LOJA[id];

      if (usuario.coins < item.preco) {
        return ctx.reply(
          ctx.mess.coinsSemSaldo(item.preco, usuario.coins)
        );
      }

      usuario.coins -= item.preco;
      usuario.itensCoins[id] =
        Number(usuario.itensCoins[id] || 0) + 1;

      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, item.emoji, "Compra concluída", [
          { emoji: item.emoji, texto: item.nome },
          { emoji: "💸", texto: "Custo: " + dinheiro(item.preco) },
          { emoji: "🎒", texto: "Quantidade: " + usuario.itensCoins[id] },
          { emoji: "💰", texto: "Saldo: " + dinheiro(usuario.coins) },
        ])
      );
    }

    if (["trabalharcoins", "jobcoins"].includes(comando)) {
      const espera = cooldown(usuario.ultimoTrabalhoCoins, 5 * 60 * 1000);

      if (espera) return ctx.reply(ctx.mess.coinsCooldown(espera));

      let ganho = r.aleatorio(280, 760);

      if (Number(usuario.itensCoins.job || 0) > 0) {
        usuario.itensCoins.job -= 1;
        ganho = Math.floor(ganho * 1.2);
      }

      usuario.coins += ganho;
      usuario.ultimoTrabalhoCoins = Date.now();
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "💼", "Trabalho de Coins", [
          { emoji: "🪙", texto: "+" + dinheiro(ganho) },
          { emoji: "💰", texto: "Saldo: " + dinheiro(usuario.coins) },
        ])
      );
    }

    if (["roubarcoins", "rouboncoins"].includes(comando)) {
      const espera = cooldown(usuario.ultimoRoubo, 10 * 60 * 1000);
      if (espera) return ctx.reply(ctx.mess.coinsCooldown(espera));

      const dados = await ctx.destino().catch(() => null);
      const alvo = dados?.mencao ? ctx.normalizar(dados.mencao) : null;

      if (!alvo || alvo === ctx.normalizar(ctx.sender)) {
        return ctx.reply(ctx.mess.coinsDoarMesmo());
      }

      const vitima = r.eco(ctx, alvo);

      if (Number(vitima.itensCoins?.escudo || 0) > 0) {
        vitima.itensCoins.escudo -= 1;
        usuario.ultimoRoubo = Date.now();
        r.salvar(ctx);

        return ctx.reply(
          compacto(ctx, "🛡️", "Roubo bloqueado", [
            { emoji: "👤", texto: "@" + alvo.split("@")[0] + " usou um escudo." },
          ]),
          [alvo]
        );
      }

      let chance = 45;

      if (Number(usuario.itensCoins.bomba || 0) > 0) {
        usuario.itensCoins.bomba -= 1;
        chance += 8;
      }

      if (Number(usuario.itensCoins.arma || 0) > 0) {
        usuario.itensCoins.arma -= 1;
        chance += 12;
      }

      const sucesso = r.aleatorio(1, 100) <= chance;
      usuario.ultimoRoubo = Date.now();

      if (!sucesso || vitima.coins <= 0) {
        const multa = Math.min(usuario.coins, r.aleatorio(50, 220));
        usuario.coins -= multa;
        r.salvar(ctx);

        return ctx.reply(
          compacto(ctx, "🚨", "Roubo falhou", [
            { emoji: "💸", texto: "Multa: " + dinheiro(multa) },
            { emoji: "💰", texto: "Saldo: " + dinheiro(usuario.coins) },
          ])
        );
      }

      const ganho = Math.max(
        1,
        Math.min(
          1500,
          Math.floor(vitima.coins * (r.aleatorio(5, 15) / 100))
        )
      );

      vitima.coins -= ganho;
      usuario.coins += ganho;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "🥷", "Roubo concluído", [
          { emoji: "👤", texto: "Alvo: @" + alvo.split("@")[0] },
          { emoji: "🪙", texto: "+" + dinheiro(ganho) },
          { emoji: "💰", texto: "Saldo: " + dinheiro(usuario.coins) },
        ]),
        [alvo]
      );
    }

    const aposta = apostaDoTexto(ctx);

    if (!aposta || usuario.coins < aposta) {
      return ctx.reply(
        aposta
          ? ctx.mess.coinsSemSaldo(aposta, usuario.coins)
          : compacto(ctx, "🎰", "Cassino", [
              { emoji: "📌", texto: ctx.prefix + comando + " 500" },
            ])
      );
    }

    const espera = cooldown(usuario.ultimoCassino, 30 * 1000);
    if (espera) return ctx.reply(ctx.mess.coinsCooldown(espera));

    usuario.ultimoCassino = Date.now();
    usuario.chances.cassino = Number(usuario.chances.cassino || 0) + 1;

    let venceu = false;
    let multiplicador = 0;
    let detalhe = "";

    if (["slot", "slotcoins"].includes(comando)) {
      const simbolos = ["🍒", "🍋", "💎", "7️⃣", "⭐"];
      const rolo = [
        r.escolher(simbolos),
        r.escolher(simbolos),
        r.escolher(simbolos),
      ];

      venceu = rolo[0] === rolo[1] && rolo[1] === rolo[2];
      multiplicador = venceu ? (rolo[0] === "7️⃣" ? 6 : 4) : 0;
      detalhe = rolo.join(" | ");
    } else if (comando === "dadoapostado") {
      const dado = r.aleatorio(1, 6);
      venceu = dado >= 4;
      multiplicador = venceu ? 2 : 0;
      detalhe = "🎲 Dado: " + dado;
    } else {
      const numero = r.aleatorio(1, 100);
      venceu = numero >= 55;
      multiplicador = venceu ? 2 : 0;
      detalhe = "🎯 Número: " + numero;
    }

    usuario.coins -= aposta;

    const premio = venceu
      ? Math.floor(aposta * multiplicador)
      : 0;

    usuario.coins += premio;
    r.salvar(ctx);

    return ctx.reply(
      compacto(ctx, venceu ? "🎉" : "🎰", venceu ? "Você venceu" : "Você perdeu", [
        { emoji: "🎲", texto: detalhe },
        { emoji: "💸", texto: "Aposta: " + dinheiro(aposta) },
        { emoji: "🏆", texto: "Prêmio: " + dinheiro(premio) },
        { emoji: "💰", texto: "Saldo: " + dinheiro(usuario.coins) },
      ])
    );
  },
});
