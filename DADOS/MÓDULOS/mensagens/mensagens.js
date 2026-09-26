const erros = require("./erros");
const { dinheiro, tempo } = require("../sistemas/rpg/texto");

const mention = jid => "@" + String(jid || "").split("@")[0];

const linha = (emoji, texto) =>
  "> *『 " + emoji + " 』— " + String(texto || "") + "*";

const bloco = (emoji, titulo, linhas = []) =>
  "- " + emoji + " `" + String(titulo || "").toUpperCase() + "`\n\n" +
  linhas.filter(Boolean).join("\n");

exports.onlyOwner = () => erros.ownerOnly();
exports.sogrupo = () => erros.groupOnly();
exports.soadm = () => erros.adminOnly();
exports.error = () => erros.generic();
exports.erroApi = () => erros.api();

exports.padraoUso = ({ titulo = "Uso", linhas = [] } = {}) =>
  bloco("📌", titulo, linhas.map(x => linha("•", x)));

exports.padraoErro = ({ titulo = "Erro", linhas = [] } = {}) =>
  bloco("❌", titulo, linhas.map(x => linha("•", x)));

exports.padraoAviso = ({ titulo = "Aviso", linhas = [] } = {}) =>
  bloco("⚠️", titulo, linhas.map(x => linha("•", x)));

exports.padraoInfo = ({ titulo = "Informação", linhas = [] } = {}) =>
  bloco("ℹ️", titulo, linhas.map(x => linha("•", x)));

exports.padraoSucesso = ({ titulo = "Sucesso", linhas = [] } = {}) =>
  bloco("✅", titulo, linhas.map(x => linha("•", x)));

exports.modoRpgUso = prefix =>
  bloco("⚔️", "Modo RPG", [
    linha("✅", "Ativar: " + prefix + "modorpg 1"),
    linha("❌", "Desativar: " + prefix + "modorpg 0"),
  ]);

exports.modoCoinsUso = prefix =>
  bloco("🪙", "Modo Coins", [
    linha("✅", "Ativar: " + prefix + "modocoins 1"),
    linha("❌", "Desativar: " + prefix + "modocoins 0"),
  ]);

exports.modoAlterado = (nome, ativo) =>
  bloco(ativo ? "✅" : "❌", nome, [
    linha("📊", ativo ? "Sistema ativado." : "Sistema desativado."),
  ]);

exports.rpgDesativado = prefix =>
  bloco("⚔️", "RPG desativado", [
    linha("📌", "Um administrador precisa usar " + prefix + "modorpg 1"),
  ]);

exports.coinsDesativado = prefix =>
  bloco("🪙", "Coins desativado", [
    linha("📌", "Um administrador precisa usar " + prefix + "modocoins 1"),
  ]);

exports.rpgCoinsDesativado = prefix =>
  bloco("🔒", "Sistema indisponível", [
    linha("⚔️", "RPG: " + prefix + "modorpg 1"),
    linha("🪙", "Coins: " + prefix + "modocoins 1"),
    linha("📌", "Os dois modos precisam estar ativos."),
  ]);

exports.coinsSemSaldo = (necessario, atual) =>
  bloco("🪙", "Saldo insuficiente", [
    linha("💸", "Necessário: " + dinheiro(necessario)),
    linha("💰", "Seu saldo: " + dinheiro(atual)),
  ]);

exports.coinsCooldown = segundos =>
  bloco("⏳", "Aguarde", [
    linha("⏱️", "Tente novamente em " + tempo(segundos)),
  ]);

exports.coinsDoarMesmo = () =>
  bloco("❌", "Ação inválida", [
    linha("👤", "Escolha outro usuário."),
  ]);

exports.coinsCard = (jid, coins, banco, minerar, cassino, prefix) =>
  bloco("🪙", "N-Coins", [
    linha("👤", mention(jid)),
    linha("💰", "Carteira: " + dinheiro(coins)),
    linha("🏦", "Banco: " + dinheiro(banco)),
    linha("⛏️", "Minerações: " + Number(minerar || 0)),
    linha("🎰", "Cassinos: " + Number(cassino || 0)),
    linha("📌", "Use " + prefix + "menucoins para ver a economia."),
  ]);

exports.coinsMinerado = (jid, ganho, saldo) =>
  bloco("⛏️", "Mineração", [
    linha("👤", mention(jid)),
    linha("🪙", "+" + dinheiro(ganho)),
    linha("💰", "Saldo: " + dinheiro(saldo)),
  ]);

exports.coinsRank = lista =>
  bloco("🏆", "Ranking de Coins",
    (lista || []).map((item, index) =>
      linha(
        ["🥇", "🥈", "🥉"][index] || "🏅",
        (index + 1) + "º " + mention(item.jid) + " • " + dinheiro(item.valor)
      )
    )
  );

exports.coinsGerenciarUso = (prefix, comando) =>
  bloco("🛠️", "Gerenciar Coins", [
    linha("➕", prefix + comando + " @usuario valor"),
  ]);

exports.coinsGerenciado = (alvo, saldo, remove) =>
  bloco("🛠️", "Coins atualizados", [
    linha("👤", mention(alvo)),
    linha(remove ? "➖" : "➕", remove ? "Valor removido." : "Valor adicionado."),
    linha("💰", "Saldo: " + dinheiro(saldo)),
  ]);

exports.levelPerfil = (jid, usuario, pos) =>
  bloco("✨", "Level", [
    linha("👤", mention(jid)),
    linha("⭐", "Level: " + Number(usuario?.level || 1)),
    linha("✨", "XP: " + Number(usuario?.xp || 0)),
    linha("🎖️", "Patente: " + String(usuario?.patente || "Bronze I")),
    linha("🏆", "Ranking: #" + Number(pos || 0)),
  ]);

exports.levelRank = lista =>
  bloco("🏆", "Ranking de Level",
    (lista || []).map((item, index) =>
      linha(
        ["🥇", "🥈", "🥉"][index] || "🏅",
        (index + 1) + "º " + mention(item.jid) +
          " • " + Number(item.u?.level || 1) + " lvl" +
          " • " + Number(item.valor || item.u?.xp || 0) + " XP"
      )
    )
  );

exports.levelGerenciarUso = (prefix, comando) =>
  bloco("🛠️", "Gerenciar RPG", [
    linha("📌", prefix + comando + " @usuario valor"),
  ]);

exports.levelGerenciado = (alvo, usuario, remove) =>
  bloco("🛠️", "RPG atualizado", [
    linha("👤", mention(alvo)),
    linha(remove ? "➖" : "➕", remove ? "Valor removido." : "Valor adicionado."),
    linha("⭐", "Level: " + Number(usuario?.level || 1)),
    linha("✨", "XP: " + Number(usuario?.xp || 0)),
    linha("🎖️", "Patente: " + String(usuario?.patente || "Bronze I")),
  ]);

exports.cidadeRegistrada = nome =>
  bloco("🏙️", "Cidade criada", [
    linha("📍", String(nome || "Sua cidade")),
    linha("✅", "Seu perfil urbano foi registrado."),
  ]);

exports.cidadePerfil = (jid, usuario, patrimonio) => {
  const cidade = usuario?.cidade || {};
  return bloco("🏙️", cidade.nome || "Perfil da Cidade", [
    linha("👤", mention(jid)),
    linha("💰", "Carteira: " + dinheiro(usuario?.coins)),
    linha("🏦", "Banco: " + dinheiro(cidade.saldoBanco)),
    linha("💼", "Emprego: " + String(cidade.cargo || "Desempregado")),
    linha("⚡", "Energia: " + Number(cidade.energia ?? 100) + "%"),
    linha("❤️", "Saúde: " + Number(cidade.saude ?? 100) + "%"),
    linha("⭐", "Nível: " + Number(cidade.nivel || 1)),
    linha("🏆", "Reputação: " + Number(cidade.reputacao || 0)),
    linha("💎", "Patrimônio: " + dinheiro(patrimonio)),
  ]);
};

exports.cidadeTrabalho = (ganho, saldo, detalhe = {}) =>
  bloco(detalhe.emoji || "💼", "Trabalho concluído", [
    linha("💼", String(detalhe.cargo || "Trabalho")),
    detalhe.evento ? linha("📋", detalhe.evento) : "",
    linha("🪙", "+" + dinheiro(ganho)),
    linha("💰", "Saldo: " + dinheiro(saldo)),
    linha("⭐", "+" + Number(detalhe.reputacao || 0) + " reputação"),
  ]);

exports.cidadeBanco = (banco, carteira) =>
  bloco("🏦", "Banco da Cidade", [
    linha("🏛️", "Banco: " + dinheiro(banco)),
    linha("💰", "Carteira: " + dinheiro(carteira)),
  ]);

exports.cidadeBancoUso = prefix =>
  bloco("🏦", "Banco da Cidade", [
    linha("📥", prefix + "depositar valor"),
    linha("📤", prefix + "sacar valor"),
  ]);

exports.onlyVipUser = () =>
  bloco("💎", "Recurso VIP", [
    linha("🔒", "Este Pokémon raro é reservado para usuários VIP."),
  ]);

exports.pokemonNaoTem = prefix =>
  bloco("🔴", "Sem Pokémon", [
    linha("📌", "Use " + prefix + "lojapokemon para escolher um Pokémon."),
  ]);

exports.pokemonInvalido = prefix =>
  bloco("❌", "Pokémon inválido", [
    linha("📌", "Veja as opções em " + prefix + "lojapokemon"),
  ]);

exports.pokemonJaTem = () =>
  bloco("⚠️", "Você já possui um Pokémon", [
    linha("📌", "Venda ou evolua o atual antes de comprar outro."),
  ]);

exports.pokemonShop = (itens, prefix, raro) =>
  bloco(raro ? "💎" : "🔴", raro ? "Pokémon raros" : "Loja Pokémon", [
    ...(itens || []).map(([id, pokemon]) =>
      linha(
        pokemon.raridade === "Lendário" ? "👑" : pokemon.raridade === "Raro" ? "💎" : "🔴",
        pokemon.nome + " • " + pokemon.tipo + " • " + dinheiro(pokemon.preco) +
          " • " + prefix + "comprarpokemon " + id
      )
    ),
  ]);

exports.pokemonComprado = (pokemon, saldo) =>
  bloco("✅", "Pokémon adquirido", [
    linha("🔴", pokemon?.nome || "Pokémon"),
    linha("✨", pokemon?.raridade || "Comum"),
    linha("💰", "Saldo: " + dinheiro(saldo)),
  ]);

exports.pokemonPerfil = (jid, pokemon, dados = {}) =>
  bloco("🔴", "Meu Pokémon", [
    linha("👤", mention(jid)),
    linha("⚪", pokemon?.apelido || dados.nome || pokemon?.tipo || "Pokémon"),
    linha("🧬", "Tipo: " + String(dados.tipo || "Desconhecido")),
    linha("💎", "Raridade: " + String(dados.raridade || "Comum")),
    linha("⭐", "Nível: " + Number(pokemon?.nivel || 1)),
    linha("🧠", "XP: " + Number(pokemon?.xp || 0)),
    linha("🍽️", "Fome: " + Number(pokemon?.fome ?? 100) + "%"),
    linha("💖", "Afeto: " + Number(pokemon?.afeto || 0)),
    pokemon?.energia !== undefined ? linha("⚡", "Energia: " + Number(pokemon.energia) + "%") : "",
    pokemon?.saude !== undefined ? linha("❤️", "Saúde: " + Number(pokemon.saude) + "%") : "",
  ]);

exports.pokemonApelidoUso = prefix =>
  bloco("✏️", "Apelido Pokémon", [
    linha("📌", prefix + "apelidopokemon novo nome"),
  ]);

exports.pokemonApelido = nome =>
  bloco("✅", "Apelido atualizado", [
    linha("✏️", String(nome || "")),
  ]);

exports.pokemonComidas = (catalogo, prefix) =>
  bloco("🍓", "Comidas Pokémon", [
    ...Object.entries(catalogo || {}).map(([id, item]) =>
      linha(
        item.emoji || "🍽️",
        item.nome + " • " + dinheiro(item.preco) +
          " • +" + Number(item.fome || 0) + " fome" +
          " • " + prefix + "comprarcomidapokemon " + id
      )
    ),
  ]);

exports.pokemonAlimentado = (comida, pokemon, saldo) =>
  bloco(comida?.emoji || "🍽️", "Pokémon alimentado", [
    linha("🍽️", comida?.nome || "Comida"),
    linha("❤️", "Fome: " + Number(pokemon?.fome ?? 100) + "%"),
    linha("💰", "Saldo: " + dinheiro(saldo)),
  ]);

exports.pokemonNaoEvolui = () =>
  bloco("❌", "Evolução indisponível", [
    linha("🧬", "Este Pokémon não possui outra evolução disponível."),
  ]);

exports.pokemonNivelEvoluir = nivel =>
  bloco("🔒", "Nível insuficiente", [
    linha("⭐", "Nível necessário: " + Number(nivel || 1)),
  ]);

exports.pokemonEvoluiu = (antes, depois) =>
  bloco("✨", "Pokémon evoluiu", [
    linha("🧬", String(antes || "Pokémon") + " → " + String(depois || "Pokémon")),
  ]);

exports.pokemonMissao = (pokemon, ganho, xp, saldo) =>
  bloco("🗺️", "Missão Pokémon", [
    linha("⚪", pokemon?.apelido || pokemon?.tipo || "Pokémon"),
    linha("🪙", "+" + dinheiro(ganho)),
    linha("🧠", "+" + Number(xp || 0) + " XP"),
    linha("⭐", "Nível: " + Number(pokemon?.nivel || 1)),
    linha("💰", "Saldo: " + dinheiro(saldo)),
  ]);

exports.pokemonRank = lista =>
  bloco("🏆", "Ranking Pokémon",
    (lista || []).map((item, index) => {
      const pokemon = item?.u?.pokemon || item?.pokemon || {};
      return linha(
        ["🥇", "🥈", "🥉"][index] || "🏅",
        (index + 1) + "º " + mention(item.jid) +
          " • " + (pokemon.apelido || pokemon.tipo || "Pokémon") +
          " • nível " + Number(pokemon.nivel || 1)
      );
    })
  );

exports.pokemonVendido = (valor, saldo) =>
  bloco("💸", "Pokémon vendido", [
    linha("🪙", "+" + dinheiro(valor)),
    linha("💰", "Saldo: " + dinheiro(saldo)),
  ]);
