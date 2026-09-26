const r = require("../../sistemas/rpg/index");
const comandos = require("../../../database/lib/comandos");
const { compacto, dinheiro, tempo } = require("../../sistemas/rpg/texto");

function restante(ultimo, duracao) {
  const falta = duracao - (Date.now() - Number(ultimo || 0));
  return falta > 0 ? Math.ceil(falta / 1000) : 0;
}

function valorDoTexto(texto) {
  return Math.max(
    0,
    Math.floor(
      Number(String(texto || "").replace(/[^0-9]/g, "")) || 0
    )
  );
}

function itemId(ctx) {
  return String(ctx.args?.[0] || "").toLowerCase();
}

function statusCidade(cidade) {
  return cidade.registrada ? "Ativa" : "Não registrada";
}

function listaCatalogo(ctx, titulo, catalogo, comando, emoji = "🛒") {
  return compacto(
    ctx,
    emoji,
    titulo,
    Object.entries(catalogo).map(([id, item]) => ({
      emoji: item.emoji || "📦",
      texto:
        item.nome +
        " • " +
        dinheiro(item.preco) +
        " • " +
        ctx.prefix +
        comando +
        " " +
        id,
    }))
  );
}

module.exports = comandos.setCommand({
  nome: "registrarcidade",
  comandos: [
    "registrarcidade",
    "entrarnacidade",
    "cidade",
    "perfilcidade",
    "cidadeperfil",
    "empregoscidade",
    "trabalhoscidade",
    "settrabalho",
    "setemprego",
    "trabalharcidade",
    "trabalhocidade",
    "trabalhar",
    "coletarsalario",
    "salariocidade",
    "bancocidade",
    "cidadebanco",
    "banco",
    "depositarcidade",
    "depositarbank",
    "depositar",
    "sacarcidade",
    "sacarbanco",
    "sacar",
    "doarcidade",
    "pixcidade",
    "lojacidade",
    "lojaitenscidade",
    "compraritemcidade",
    "compraritenscidade",
    "inventariocidade",
    "inventcidade",
    "usaritemcidade",
    "mercadocidade",
    "comidascidade",
    "comercidade",
    "restaurantecidade",
    "descansarcidade",
    "hospitalcidade",
    "casascidade",
    "lojacasas",
    "comprarcasa",
    "vendercasa",
    "alugarcasa",
    "coletaraluguel",
    "veiculoscidade",
    "lojaveiculos",
    "comprarveiculo",
    "venderveiculo",
    "abastecercidade",
    "abastecerveiculo",
    "oficinacidade",
    "repararveiculo",
    "empresascidade",
    "lojaempresas",
    "comprarempresa",
    "venderempresa",
    "lucroempresa",
    "assaltarcidade",
    "crimecidade",
    "fiancacidade",
    "corridacidade",
    "apostacidade",
    "pescacidade",
    "venderpeixes",
    "buscarcidade",
    "casarcidade",
    "divorciocidade",
    "rankcidade",
    "rankingcidade",
  ],
  categoria: "coins",
  info: {
    descricao: "Sistema urbano da economia: trabalho, banco, imóveis, veículos, empresas, pesca e ranking.",
    uso: "cidade",
    requisitos: "Modo Coins",
    categoria: "coins",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.temCoins(ctx)) return ctx.reply(ctx.mess.coinsDesativado(ctx.prefix));

    const comando = String(ctx.command || "").toLowerCase();
    const usuario = r.eco(ctx);
    const cidade = r.normalizarCidade(usuario);

    if (["registrarcidade", "entrarnacidade"].includes(comando)) {
      if (!cidade.registrada) {
        cidade.registrada = true;
        cidade.nome =
          ctx.args.join(" ").trim().slice(0, 35) ||
          "Cidade de " + String(ctx.pushname || "Jogador").slice(0, 24);
        cidade.criadaEm = Date.now();
        r.salvar(ctx);
      }

      return ctx.reply(ctx.mess.cidadeRegistrada(cidade.nome));
    }

    if (!cidade.registrada) {
      return ctx.reply(
        compacto(ctx, "🏙️", "Cidade não registrada", [
          {
            emoji: "📌",
            texto: "Use " + ctx.prefix + "registrarcidade Nome",
          },
        ])
      );
    }

    if (["cidade", "perfilcidade", "cidadeperfil"].includes(comando)) {
      return ctx.reply(
        ctx.mess.cidadePerfil(
          ctx.sender,
          usuario,
          r.patrimonioCidade(usuario)
        ),
        [ctx.sender]
      );
    }

    if (["empregoscidade", "trabalhoscidade"].includes(comando)) {
      return ctx.reply(
        compacto(
          ctx,
          "💼",
          "Empregos da Cidade",
          Object.entries(r.CIDADE_EMPREGOS).map(([id, emprego]) => ({
            emoji: emprego.emoji,
            texto:
              emprego.nome +
              " • " +
              dinheiro(emprego.salario[0]) +
              " a " +
              dinheiro(emprego.salario[1]) +
              " • " +
              ctx.prefix +
              "settrabalho " +
              id,
          }))
        )
      );
    }

    if (["settrabalho", "setemprego"].includes(comando)) {
      const id = itemId(ctx);
      const emprego = r.CIDADE_EMPREGOS[id];

      if (!emprego) {
        return ctx.reply(
          compacto(ctx, "💼", "Emprego inválido", [
            {
              emoji: "📌",
              texto: ctx.prefix + "empregoscidade",
            },
          ])
        );
      }

      cidade.cargo = id;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, emprego.emoji, "Emprego atualizado", [
          { emoji: emprego.emoji, texto: emprego.nome },
        ])
      );
    }

    if (["trabalharcidade", "trabalhocidade", "trabalhar"].includes(comando)) {
      if (!cidade.cargo || !r.CIDADE_EMPREGOS[cidade.cargo]) {
        return ctx.reply(
          compacto(ctx, "💼", "Sem emprego", [
            {
              emoji: "📌",
              texto: "Use " + ctx.prefix + "empregoscidade",
            },
          ])
        );
      }

      const espera = restante(cidade.ultimoTrabalho, 10 * 60 * 1000);

      if (espera) return ctx.reply(ctx.mess.coinsCooldown(espera));

      const emprego = r.CIDADE_EMPREGOS[cidade.cargo];

      if (cidade.energia < emprego.energia) {
        return ctx.reply(
          compacto(ctx, "⚡", "Sem energia", [
            { emoji: "⚡", texto: "Energia atual: " + cidade.energia + "%" },
            {
              emoji: "🛌",
              texto: "Use " + ctx.prefix + "descansarcidade",
            },
          ])
        );
      }

      const ganho = r.aleatorio(
        emprego.salario[0],
        emprego.salario[1]
      );

      cidade.energia = r.limitar(
        cidade.energia - emprego.energia
      );
      cidade.reputacao += emprego.reputacao;
      cidade.xp += 20;
      cidade.nivel = 1 + Math.floor(cidade.xp / 100);
      cidade.salarioPendente += Math.floor(ganho * 0.2);
      cidade.ultimoTrabalho = Date.now();

      usuario.coins += ganho;
      r.salvar(ctx);

      return ctx.reply(
        ctx.mess.cidadeTrabalho(
          ganho,
          usuario.coins,
          {
            emoji: emprego.emoji,
            cargo: emprego.nome,
            evento: "Turno concluído com sucesso.",
            reputacao: emprego.reputacao,
            energia: emprego.energia,
          }
        )
      );
    }

    if (["coletarsalario", "salariocidade"].includes(comando)) {
      const valor = Number(cidade.salarioPendente || 0);

      if (valor <= 0) {
        return ctx.reply(
          compacto(ctx, "💼", "Sem salário pendente", [
            {
              emoji: "📌",
              texto: "Trabalhe antes de coletar salário.",
            },
          ])
        );
      }

      usuario.coins += valor;
      cidade.salarioPendente = 0;
      cidade.ultimoSalario = Date.now();
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "💵", "Salário coletado", [
          { emoji: "🪙", texto: "+" + dinheiro(valor) },
          { emoji: "💰", texto: "Saldo: " + dinheiro(usuario.coins) },
        ])
      );
    }

    if (["bancocidade", "cidadebanco", "banco"].includes(comando)) {
      return ctx.reply(
        ctx.mess.cidadeBanco(cidade.saldoBanco, usuario.coins)
      );
    }

    if (["depositarcidade", "depositarbank", "depositar"].includes(comando)) {
      const valor = valorDoTexto(ctx.q);

      if (!valor || usuario.coins < valor) {
        return ctx.reply(ctx.mess.cidadeBancoUso(ctx.prefix));
      }

      usuario.coins -= valor;
      cidade.saldoBanco += valor;
      cidade.historicoBanco.unshift({
        tipo: "deposito",
        valor,
        em: Date.now(),
      });
      cidade.historicoBanco = cidade.historicoBanco.slice(0, 10);
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "📥", "Depósito concluído", [
          { emoji: "🏦", texto: "+" + dinheiro(valor) + " no banco" },
          { emoji: "💰", texto: "Carteira: " + dinheiro(usuario.coins) },
          { emoji: "🏛️", texto: "Banco: " + dinheiro(cidade.saldoBanco) },
        ])
      );
    }

    if (["sacarcidade", "sacarbanco", "sacar"].includes(comando)) {
      const valor = valorDoTexto(ctx.q);

      if (!valor || cidade.saldoBanco < valor) {
        return ctx.reply(ctx.mess.cidadeBancoUso(ctx.prefix));
      }

      cidade.saldoBanco -= valor;
      usuario.coins += valor;
      cidade.historicoBanco.unshift({
        tipo: "saque",
        valor,
        em: Date.now(),
      });
      cidade.historicoBanco = cidade.historicoBanco.slice(0, 10);
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "📤", "Saque concluído", [
          { emoji: "💰", texto: "+" + dinheiro(valor) + " na carteira" },
          { emoji: "🏛️", texto: "Banco: " + dinheiro(cidade.saldoBanco) },
        ])
      );
    }

    if (["doarcidade", "pixcidade"].includes(comando)) {
      const dados = await ctx.destino().catch(() => null);
      const alvo = dados?.mencao ? ctx.normalizar(dados.mencao) : null;
      const valor = valorDoTexto(ctx.q);

      if (!alvo || !valor || alvo === ctx.normalizar(ctx.sender)) {
        return ctx.reply(
          compacto(ctx, "💸", "Pix da Cidade", [
            {
              emoji: "📌",
              texto: ctx.prefix + "pixcidade 500 @usuario",
            },
          ])
        );
      }

      if (usuario.coins < valor) {
        return ctx.reply(
          ctx.mess.coinsSemSaldo(valor, usuario.coins)
        );
      }

      const destino = r.eco(ctx, alvo);
      usuario.coins -= valor;
      destino.coins += valor;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "💸", "Pix concluído", [
          { emoji: "👤", texto: "@" + alvo.split("@")[0] },
          { emoji: "🪙", texto: dinheiro(valor) },
          { emoji: "💰", texto: "Saldo: " + dinheiro(usuario.coins) },
        ]),
        [alvo]
      );
    }

    if (["lojacidade", "lojaitenscidade"].includes(comando)) {
      return ctx.reply(
        listaCatalogo(
          ctx,
          "Loja da Cidade",
          r.CIDADE_ITENS,
          "compraritemcidade",
          "🛒"
        )
      );
    }

    if (["compraritemcidade", "compraritenscidade"].includes(comando)) {
      const id = itemId(ctx);
      const item = r.CIDADE_ITENS[id];

      if (!item) {
        return ctx.reply(
          compacto(ctx, "🛒", "Item inválido", [
            {
              emoji: "📌",
              texto: ctx.prefix + "lojacidade",
            },
          ])
        );
      }

      if (usuario.coins < item.preco) {
        return ctx.reply(
          ctx.mess.coinsSemSaldo(item.preco, usuario.coins)
        );
      }

      usuario.coins -= item.preco;
      cidade.inventario[id] =
        Number(cidade.inventario[id] || 0) + 1;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, item.emoji, "Item comprado", [
          { emoji: item.emoji, texto: item.nome },
          { emoji: "💸", texto: dinheiro(item.preco) },
          { emoji: "🎒", texto: "Quantidade: " + cidade.inventario[id] },
        ])
      );
    }

    if (["inventariocidade", "inventcidade"].includes(comando)) {
      const itens = Object.entries(cidade.inventario)
        .filter(([, qtd]) => Number(qtd || 0) > 0);

      return ctx.reply(
        compacto(
          ctx,
          "🎒",
          "Inventário da Cidade",
          itens.length
            ? itens.map(([id, qtd]) => ({
                emoji: r.CIDADE_ITENS[id]?.emoji || "📦",
                texto:
                  (r.CIDADE_ITENS[id]?.nome || id) +
                  " x" +
                  qtd,
              }))
            : [{ emoji: "📭", texto: "Inventário vazio." }]
        )
      );
    }

    if (comando === "usaritemcidade") {
      const id = itemId(ctx);
      const item = r.CIDADE_ITENS[id];

      if (!item || Number(cidade.inventario[id] || 0) <= 0) {
        return ctx.reply(
          compacto(ctx, "❌", "Item indisponível", [
            {
              emoji: "📌",
              texto: ctx.prefix + "inventariocidade",
            },
          ])
        );
      }

      if (item.tipo === "energia") {
        cidade.energia = r.limitar(cidade.energia + item.valor);
      } else if (item.tipo === "saude") {
        cidade.saude = r.limitar(cidade.saude + item.valor);
      } else if (item.tipo === "fome") {
        cidade.fome = r.limitar(cidade.fome + item.valor);
      }

      cidade.inventario[id] -= 1;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, item.emoji, "Item usado", [
          { emoji: item.emoji, texto: item.nome },
          { emoji: "⚡", texto: "Energia: " + cidade.energia + "%" },
          { emoji: "❤️", texto: "Saúde: " + cidade.saude + "%" },
          { emoji: "🍽️", texto: "Fome: " + cidade.fome + "%" },
        ])
      );
    }

    if (["mercadocidade", "comidascidade"].includes(comando)) {
      return ctx.reply(
        listaCatalogo(
          ctx,
          "Comidas da Cidade",
          r.CIDADE_COMIDAS,
          "comercidade",
          "🍽️"
        )
      );
    }

    if (["comercidade", "restaurantecidade"].includes(comando)) {
      const id = itemId(ctx);
      const comida = r.CIDADE_COMIDAS[id];

      if (!comida) {
        return ctx.reply(
          compacto(ctx, "🍽️", "Comida inválida", [
            {
              emoji: "📌",
              texto: ctx.prefix + "mercadocidade",
            },
          ])
        );
      }

      if (usuario.coins < comida.preco) {
        return ctx.reply(
          ctx.mess.coinsSemSaldo(comida.preco, usuario.coins)
        );
      }

      usuario.coins -= comida.preco;
      cidade.fome = r.limitar(cidade.fome + comida.fome);
      cidade.energia = r.limitar(
        cidade.energia + Number(comida.energia || 0)
      );
      cidade.saude = r.limitar(
        cidade.saude + Number(comida.saude || 0)
      );
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, comida.emoji, "Refeição concluída", [
          { emoji: comida.emoji, texto: comida.nome },
          { emoji: "🍽️", texto: "Fome: " + cidade.fome + "%" },
          { emoji: "⚡", texto: "Energia: " + cidade.energia + "%" },
          { emoji: "💰", texto: "Saldo: " + dinheiro(usuario.coins) },
        ])
      );
    }

    if (comando === "descansarcidade") {
      const espera = restante(cidade.ultimoDescanso, 20 * 60 * 1000);
      if (espera) return ctx.reply(ctx.mess.coinsCooldown(espera));

      const bonusCasa = cidade.casa
        ? Number(r.CIDADE_CASAS[cidade.casa.id || cidade.casa]?.descanso || 0)
        : 15;

      cidade.energia = r.limitar(cidade.energia + bonusCasa);
      cidade.saude = r.limitar(cidade.saude + 8);
      cidade.ultimoDescanso = Date.now();
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "🛌", "Descanso concluído", [
          { emoji: "⚡", texto: "Energia: " + cidade.energia + "%" },
          { emoji: "❤️", texto: "Saúde: " + cidade.saude + "%" },
        ])
      );
    }

    if (comando === "hospitalcidade") {
      const custo = Math.max(200, (100 - cidade.saude) * 25);

      if (cidade.saude >= 100) {
        return ctx.reply(
          compacto(ctx, "🏥", "Hospital", [
            { emoji: "✅", texto: "Sua saúde já está em 100%." },
          ])
        );
      }

      if (usuario.coins < custo) {
        return ctx.reply(
          ctx.mess.coinsSemSaldo(custo, usuario.coins)
        );
      }

      usuario.coins -= custo;
      cidade.saude = 100;
      cidade.ultimoHospital = Date.now();
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "🏥", "Tratamento concluído", [
          { emoji: "❤️", texto: "Saúde: 100%" },
          { emoji: "💸", texto: "Custo: " + dinheiro(custo) },
        ])
      );
    }

    if (["casascidade", "lojacasas"].includes(comando)) {
      return ctx.reply(
        listaCatalogo(
          ctx,
          "Imóveis",
          r.CIDADE_CASAS,
          "comprarcasa",
          "🏠"
        )
      );
    }

    if (comando === "comprarcasa") {
      const id = itemId(ctx);
      const casa = r.CIDADE_CASAS[id];

      if (!casa) {
        return ctx.reply(
          compacto(ctx, "🏠", "Imóvel inválido", [
            { emoji: "📌", texto: ctx.prefix + "casascidade" },
          ])
        );
      }

      if (usuario.coins < casa.preco) {
        return ctx.reply(
          ctx.mess.coinsSemSaldo(casa.preco, usuario.coins)
        );
      }

      if (cidade.casa) {
        return ctx.reply(
          compacto(ctx, "🏠", "Você já possui um imóvel", [
            { emoji: "📌", texto: "Venda o atual antes de comprar outro." },
          ])
        );
      }

      usuario.coins -= casa.preco;
      cidade.casa = {
        id,
        compradaEm: Date.now(),
        ultimoAluguel: 0,
      };
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, casa.emoji, "Imóvel comprado", [
          { emoji: casa.emoji, texto: casa.nome },
          { emoji: "💸", texto: dinheiro(casa.preco) },
        ])
      );
    }

    if (comando === "vendercasa") {
      if (!cidade.casa) {
        return ctx.reply(
          compacto(ctx, "🏠", "Sem imóvel", [
            { emoji: "📌", texto: ctx.prefix + "casascidade" },
          ])
        );
      }

      const id = cidade.casa.id || cidade.casa;
      const casa = r.CIDADE_CASAS[id];
      const valor = Math.floor(Number(casa?.preco || 0) * 0.7);

      cidade.casa = null;
      usuario.coins += valor;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "💸", "Imóvel vendido", [
          { emoji: "🪙", texto: "+" + dinheiro(valor) },
        ])
      );
    }

    if (comando === "alugarcasa") {
      if (!cidade.casa) {
        return ctx.reply(
          compacto(ctx, "🏠", "Sem imóvel", [
            { emoji: "📌", texto: ctx.prefix + "comprarcasa kitnet" },
          ])
        );
      }

      cidade.casa.alugada = !cidade.casa.alugada;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "🏠", "Aluguel", [
          {
            emoji: cidade.casa.alugada ? "✅" : "❌",
            texto: cidade.casa.alugada
              ? "Imóvel colocado para aluguel."
              : "Imóvel retirado do aluguel.",
          },
        ])
      );
    }

    if (comando === "coletaraluguel") {
      if (!cidade.casa?.alugada) {
        return ctx.reply(
          compacto(ctx, "🏠", "Aluguel", [
            { emoji: "📌", texto: "Seu imóvel não está alugado." },
          ])
        );
      }

      const espera = restante(
        cidade.casa.ultimoAluguel,
        60 * 60 * 1000
      );
      if (espera) return ctx.reply(ctx.mess.coinsCooldown(espera));

      const casa = r.CIDADE_CASAS[cidade.casa.id];
      const valor = Number(casa?.aluguel || 0);

      usuario.coins += valor;
      cidade.casa.ultimoAluguel = Date.now();
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "🏠", "Aluguel recebido", [
          { emoji: "🪙", texto: "+" + dinheiro(valor) },
        ])
      );
    }

    if (["veiculoscidade", "lojaveiculos"].includes(comando)) {
      return ctx.reply(
        listaCatalogo(
          ctx,
          "Veículos",
          r.CIDADE_VEICULOS,
          "comprarveiculo",
          "🚗"
        )
      );
    }

    if (comando === "comprarveiculo") {
      const id = itemId(ctx);
      const veiculo = r.CIDADE_VEICULOS[id];

      if (!veiculo) {
        return ctx.reply(
          compacto(ctx, "🚗", "Veículo inválido", [
            { emoji: "📌", texto: ctx.prefix + "veiculoscidade" },
          ])
        );
      }

      if (usuario.coins < veiculo.preco) {
        return ctx.reply(
          ctx.mess.coinsSemSaldo(veiculo.preco, usuario.coins)
        );
      }

      if (cidade.veiculo) {
        return ctx.reply(
          compacto(ctx, "🚗", "Você já possui um veículo", [
            { emoji: "📌", texto: "Venda o atual primeiro." },
          ])
        );
      }

      usuario.coins -= veiculo.preco;
      cidade.veiculo = {
        id,
        compradaEm: Date.now(),
      };
      cidade.combustivel = 100;
      cidade.durabilidadeVeiculo = 100;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, veiculo.emoji, "Veículo comprado", [
          { emoji: veiculo.emoji, texto: veiculo.nome },
          { emoji: "💸", texto: dinheiro(veiculo.preco) },
        ])
      );
    }

    if (comando === "venderveiculo") {
      if (!cidade.veiculo) {
        return ctx.reply(
          compacto(ctx, "🚗", "Sem veículo", [
            { emoji: "📌", texto: ctx.prefix + "veiculoscidade" },
          ])
        );
      }

      const id = cidade.veiculo.id || cidade.veiculo;
      const veiculo = r.CIDADE_VEICULOS[id];
      const valor = Math.floor(Number(veiculo?.preco || 0) * 0.7);

      cidade.veiculo = null;
      usuario.coins += valor;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "💸", "Veículo vendido", [
          { emoji: "🪙", texto: "+" + dinheiro(valor) },
        ])
      );
    }

    if (["abastecercidade", "abastecerveiculo"].includes(comando)) {
      if (!cidade.veiculo) {
        return ctx.reply(
          compacto(ctx, "⛽", "Sem veículo", [
            { emoji: "📌", texto: ctx.prefix + "veiculoscidade" },
          ])
        );
      }

      const necessario = Math.max(0, 100 - cidade.combustivel);
      const custo = necessario * 18;

      if (!necessario) {
        return ctx.reply(
          compacto(ctx, "⛽", "Tanque cheio", [
            { emoji: "✅", texto: "Combustível: 100%" },
          ])
        );
      }

      if (usuario.coins < custo) {
        return ctx.reply(
          ctx.mess.coinsSemSaldo(custo, usuario.coins)
        );
      }

      usuario.coins -= custo;
      cidade.combustivel = 100;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "⛽", "Abastecimento concluído", [
          { emoji: "⛽", texto: "Combustível: 100%" },
          { emoji: "💸", texto: dinheiro(custo) },
        ])
      );
    }

    if (["oficinacidade", "repararveiculo"].includes(comando)) {
      if (!cidade.veiculo) {
        return ctx.reply(
          compacto(ctx, "🔧", "Sem veículo", [
            { emoji: "📌", texto: ctx.prefix + "veiculoscidade" },
          ])
        );
      }

      const necessario = Math.max(
        0,
        100 - cidade.durabilidadeVeiculo
      );
      const custo = necessario * 25;

      if (!necessario) {
        return ctx.reply(
          compacto(ctx, "🔧", "Veículo em perfeito estado", [
            { emoji: "✅", texto: "Durabilidade: 100%" },
          ])
        );
      }

      if (usuario.coins < custo) {
        return ctx.reply(
          ctx.mess.coinsSemSaldo(custo, usuario.coins)
        );
      }

      usuario.coins -= custo;
      cidade.durabilidadeVeiculo = 100;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "🔧", "Reparo concluído", [
          { emoji: "🚗", texto: "Durabilidade: 100%" },
          { emoji: "💸", texto: dinheiro(custo) },
        ])
      );
    }

    if (["empresascidade", "lojaempresas"].includes(comando)) {
      return ctx.reply(
        listaCatalogo(
          ctx,
          "Empresas",
          r.CIDADE_EMPRESAS,
          "comprarempresa",
          "🏢"
        )
      );
    }

    if (comando === "comprarempresa") {
      const id = itemId(ctx);
      const empresa = r.CIDADE_EMPRESAS[id];

      if (!empresa) {
        return ctx.reply(
          compacto(ctx, "🏢", "Empresa inválida", [
            { emoji: "📌", texto: ctx.prefix + "empresascidade" },
          ])
        );
      }

      if (usuario.coins < empresa.preco) {
        return ctx.reply(
          ctx.mess.coinsSemSaldo(empresa.preco, usuario.coins)
        );
      }

      if (cidade.empresa) {
        return ctx.reply(
          compacto(ctx, "🏢", "Você já possui uma empresa", [
            { emoji: "📌", texto: "Venda a atual primeiro." },
          ])
        );
      }

      usuario.coins -= empresa.preco;
      cidade.empresa = {
        id,
        compradaEm: Date.now(),
        ultimoLucro: 0,
      };
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, empresa.emoji, "Empresa comprada", [
          { emoji: empresa.emoji, texto: empresa.nome },
          { emoji: "💸", texto: dinheiro(empresa.preco) },
        ])
      );
    }

    if (comando === "venderempresa") {
      if (!cidade.empresa) {
        return ctx.reply(
          compacto(ctx, "🏢", "Sem empresa", [
            { emoji: "📌", texto: ctx.prefix + "empresascidade" },
          ])
        );
      }

      const id = cidade.empresa.id || cidade.empresa;
      const empresa = r.CIDADE_EMPRESAS[id];
      const valor = Math.floor(Number(empresa?.preco || 0) * 0.7);

      cidade.empresa = null;
      usuario.coins += valor;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "💸", "Empresa vendida", [
          { emoji: "🪙", texto: "+" + dinheiro(valor) },
        ])
      );
    }

    if (comando === "lucroempresa") {
      if (!cidade.empresa) {
        return ctx.reply(
          compacto(ctx, "🏢", "Sem empresa", [
            { emoji: "📌", texto: ctx.prefix + "comprarempresa startup" },
          ])
        );
      }

      const espera = restante(
        cidade.empresa.ultimoLucro,
        60 * 60 * 1000
      );
      if (espera) return ctx.reply(ctx.mess.coinsCooldown(espera));

      const empresa = r.CIDADE_EMPRESAS[cidade.empresa.id];
      const ganho = r.aleatorio(
        empresa.receita[0],
        empresa.receita[1]
      );

      usuario.coins += ganho;
      cidade.empresa.ultimoLucro = Date.now();
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, empresa.emoji, "Lucro da Empresa", [
          { emoji: empresa.emoji, texto: empresa.nome },
          { emoji: "🪙", texto: "+" + dinheiro(ganho) },
        ])
      );
    }

    if (["assaltarcidade", "crimecidade"].includes(comando)) {
      const espera = restante(cidade.ultimoCrime, 30 * 60 * 1000);
      if (espera) return ctx.reply(ctx.mess.coinsCooldown(espera));

      cidade.ultimoCrime = Date.now();

      const sucesso = r.aleatorio(1, 100) <= 42;

      if (!sucesso) {
        const fianca = r.aleatorio(300, 900);
        cidade.fianca = fianca;
        cidade.procurado = true;
        cidade.reputacao = Math.max(0, cidade.reputacao - 5);
        r.salvar(ctx);

        return ctx.reply(
          compacto(ctx, "🚔", "Crime falhou", [
            { emoji: "🚨", texto: "Você está procurado." },
            { emoji: "💸", texto: "Fiança: " + dinheiro(fianca) },
            { emoji: "📌", texto: ctx.prefix + "fiancacidade" },
          ])
        );
      }

      const ganho = r.aleatorio(500, 1800);
      usuario.coins += ganho;
      cidade.reputacao = Math.max(0, cidade.reputacao - 2);
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "🥷", "Crime concluído", [
          { emoji: "🪙", texto: "+" + dinheiro(ganho) },
          { emoji: "💰", texto: "Saldo: " + dinheiro(usuario.coins) },
        ])
      );
    }

    if (comando === "fiancacidade") {
      const custo = Number(cidade.fianca || 0);

      if (!cidade.procurado || !custo) {
        return ctx.reply(
          compacto(ctx, "✅", "Situação regular", [
            { emoji: "👮", texto: "Você não possui fiança pendente." },
          ])
        );
      }

      if (usuario.coins < custo) {
        return ctx.reply(
          ctx.mess.coinsSemSaldo(custo, usuario.coins)
        );
      }

      usuario.coins -= custo;
      cidade.procurado = false;
      cidade.fianca = 0;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "👮", "Fiança paga", [
          { emoji: "💸", texto: dinheiro(custo) },
          { emoji: "✅", texto: "Situação regularizada." },
        ])
      );
    }

    if (["corridacidade", "apostacidade"].includes(comando)) {
      if (!cidade.veiculo) {
        return ctx.reply(
          compacto(ctx, "🏎️", "Sem veículo", [
            { emoji: "📌", texto: ctx.prefix + "veiculoscidade" },
          ])
        );
      }

      const espera = restante(cidade.ultimaCorrida, 10 * 60 * 1000);
      if (espera) return ctx.reply(ctx.mess.coinsCooldown(espera));

      const aposta = Math.max(100, valorDoTexto(ctx.q) || 100);

      if (usuario.coins < aposta) {
        return ctx.reply(
          ctx.mess.coinsSemSaldo(aposta, usuario.coins)
        );
      }

      usuario.coins -= aposta;
      cidade.ultimaCorrida = Date.now();
      cidade.combustivel = r.limitar(cidade.combustivel - 12);
      cidade.durabilidadeVeiculo = r.limitar(
        cidade.durabilidadeVeiculo - r.aleatorio(2, 8)
      );

      const veiculo = r.CIDADE_VEICULOS[cidade.veiculo.id];
      const venceu =
        r.aleatorio(1, 100) +
          Number(veiculo?.velocidade || 50) / 4 >
        70;

      const premio = venceu ? aposta * 2 : 0;
      usuario.coins += premio;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, venceu ? "🏆" : "🏎️", "Corrida da Cidade", [
          { emoji: venceu ? "🥇" : "💥", texto: venceu ? "Você venceu!" : "Você perdeu." },
          { emoji: "💸", texto: "Aposta: " + dinheiro(aposta) },
          { emoji: "🏆", texto: "Prêmio: " + dinheiro(premio) },
        ])
      );
    }

    if (comando === "pescacidade") {
      const espera = restante(cidade.ultimaPesca, 5 * 60 * 1000);
      if (espera) return ctx.reply(ctx.mess.coinsCooldown(espera));

      if (Number(cidade.inventario.vara || 0) <= 0) {
        return ctx.reply(
          compacto(ctx, "🎣", "Sem vara de pesca", [
            { emoji: "📌", texto: ctx.prefix + "compraritemcidade vara" },
          ])
        );
      }

      const peixe = r.sortearPonderado(r.CIDADE_PEIXES);
      const peso =
        r.aleatorio(peixe.peso[0] * 10, peixe.peso[1] * 10) /
        10;

      cidade.peixes.push({
        nome: peixe.nome,
        emoji: peixe.emoji,
        raridade: peixe.raridade,
        peso,
        valorKg: peixe.valorKg,
      });
      cidade.ultimaPesca = Date.now();
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, peixe.emoji, "Pesca concluída", [
          { emoji: peixe.emoji, texto: peixe.nome },
          { emoji: "⚖️", texto: peso.toFixed(1) + " kg" },
          { emoji: "💎", texto: "Raridade: " + peixe.raridade },
        ])
      );
    }

    if (comando === "venderpeixes") {
      if (!cidade.peixes.length) {
        return ctx.reply(
          compacto(ctx, "🎣", "Sem peixes", [
            { emoji: "📌", texto: ctx.prefix + "pescacidade" },
          ])
        );
      }

      const valor = cidade.peixes.reduce(
        (total, peixe) =>
          total +
          Math.floor(
            Number(peixe.peso || 0) *
            Number(peixe.valorKg || 0)
          ),
        0
      );

      const quantidade = cidade.peixes.length;
      cidade.peixes = [];
      usuario.coins += valor;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "🐟", "Peixes vendidos", [
          { emoji: "🎣", texto: "Quantidade: " + quantidade },
          { emoji: "🪙", texto: "+" + dinheiro(valor) },
        ])
      );
    }

    if (comando === "buscarcidade") {
      const dados = await ctx.destino().catch(() => null);
      const alvo = dados?.mencao ? ctx.normalizar(dados.mencao) : null;

      if (!alvo) {
        return ctx.reply(
          compacto(ctx, "🔎", "Buscar Cidade", [
            { emoji: "📌", texto: ctx.prefix + "buscarcidade @usuario" },
          ])
        );
      }

      const outro = r.eco(ctx, alvo);
      const outraCidade = r.normalizarCidade(outro);

      return ctx.reply(
        ctx.mess.cidadePerfil(
          alvo,
          outro,
          r.patrimonioCidade(outro)
        ),
        [alvo]
      );
    }

    if (comando === "casarcidade") {
      const dados = await ctx.destino().catch(() => null);
      const alvo = dados?.mencao ? ctx.normalizar(dados.mencao) : null;

      if (!alvo || alvo === ctx.normalizar(ctx.sender)) {
        return ctx.reply(
          compacto(ctx, "💍", "Relacionamento da Cidade", [
            { emoji: "📌", texto: ctx.prefix + "casarcidade @usuario" },
          ])
        );
      }

      const outro = r.eco(ctx, alvo);
      const outraCidade = r.normalizarCidade(outro);

      cidade.parceiro = alvo;
      outraCidade.parceiro = ctx.normalizar(ctx.sender);
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "💍", "Relacionamento registrado", [
          { emoji: "❤️", texto: "@" + ctx.sender.split("@")[0] + " + @" + alvo.split("@")[0] },
        ]),
        [ctx.sender, alvo]
      );
    }

    if (comando === "divorciocidade") {
      const parceiro = cidade.parceiro;

      if (!parceiro) {
        return ctx.reply(
          compacto(ctx, "💔", "Relacionamento", [
            { emoji: "📌", texto: "Você não possui parceiro registrado." },
          ])
        );
      }

      const outro = r.eco(ctx, parceiro);
      r.normalizarCidade(outro).parceiro = null;
      cidade.parceiro = null;
      r.salvar(ctx);

      return ctx.reply(
        compacto(ctx, "💔", "Relacionamento encerrado", [
          { emoji: "✅", texto: "O vínculo foi removido." },
        ])
      );
    }

    if (["rankcidade", "rankingcidade"].includes(comando)) {
      const grupo = r.garantir(ctx);
      const lista = Object.entries(grupo.economia.usuarios)
        .map(([jid, item]) => ({
          jid,
          valor: r.patrimonioCidade(item),
        }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10);

      return ctx.reply(
        compacto(
          ctx,
          "🏆",
          "Ranking da Cidade",
          lista.length
            ? lista.map((item, indice) => ({
                emoji: ["🥇", "🥈", "🥉"][indice] || "🏅",
                texto:
                  (indice + 1) +
                  "º @" +
                  item.jid.split("@")[0] +
                  " • " +
                  dinheiro(item.valor),
              }))
            : [{ emoji: "📭", texto: "Nenhum cidadão registrado." }]
        ),
        lista.map(item => item.jid)
      );
    }

    return ctx.reply(
      compacto(ctx, "🏙️", cidade.nome || "Cidade", [
        { emoji: "📊", texto: "Status: " + statusCidade(cidade) },
        { emoji: "💼", texto: "Emprego: " + (cidade.cargo || "Desempregado") },
        { emoji: "🏦", texto: "Banco: " + dinheiro(cidade.saldoBanco) },
        { emoji: "💎", texto: "Patrimônio: " + dinheiro(r.patrimonioCidade(usuario)) },
        { emoji: "📌", texto: ctx.prefix + "empregoscidade • " + ctx.prefix + "banco • " + ctx.prefix + "lojacidade" },
      ])
    );
  },
});
