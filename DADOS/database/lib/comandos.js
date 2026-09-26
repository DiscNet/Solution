const { buildContext } = require("../../MÓDULOS/sistemas/contexto");

function normal(value) {
  return String(value || "").trim().toLowerCase();
}

function categoryName(category) {
  const key = normal(category);

  if (key === "rpg") return "RPG";
  if (key === "coins") return "Economia";
  if (key === "pokemon") return "Pokémon";
  if (key === "menus") return "Menus";

  return "Utilidades";
}

function sectionName(category, name) {
  const cat = normal(category);
  const cmd = normal(name);

  if (cat === "coins") {
    if (cmd === "registrarcidade") return "Cidade";
    if (cmd === "economiacoins") return "Trabalho, Loja e Cassino";
    if (cmd === "modocoins") return "Configuração";
    if (cmd === "addcoins") return "Gerenciamento";
    return "N-Coins";
  }

  if (cat === "pokemon") {
    return "Pokémon";
  }

  if (cat === "rpg") {
    if (cmd === "modorpg") return "Configuração";
    if (cmd === "jornada") return "Jornada";
    if (cmd === "guilda") return "Guildas";
    if (cmd === "arsenal") return "Arsenal";
    if (cmd === "desafios") return "Desafios";
    if (["gerenciarxp", "gerenciarlevel"].includes(cmd)) {
      return "Gerenciamento";
    }
    return "Progressão";
  }

  return "Geral";
}

function permissionsFor(config) {
  const raw = normal(
    config?.info?.permissao ||
    config?.permissao ||
    ""
  );

  if (raw === "dono" || raw === "owner") {
    return { owner: true };
  }

  if (raw === "adm" || raw === "admin") {
    return { group: true, admin: true };
  }

  const category = normal(
    config?.categoria ||
    config?.info?.categoria
  );

  if (["rpg", "coins", "pokemon"].includes(category)) {
    return { group: true };
  }

  return {};
}

function setCommand(config) {
  if (!config || typeof config !== "object") {
    throw new TypeError("Configuração de comando inválida.");
  }

  const name = normal(
    config.nome ||
    config.name ||
    config.comandos?.[0] ||
    config.commands?.[0]
  );

  const commandNames =
    config.comandos ||
    config.commands ||
    (name ? [name] : []);

  const aliases = [
    ...new Set(
      commandNames
        .map(normal)
        .filter(Boolean)
    ),
  ].filter(alias => alias !== name);

  const category = normal(
    config.categoria ||
    config.category ||
    config.info?.categoria ||
    "outros"
  );

  return {
    name,
    aliases,
    menuCategory: categoryName(category),
    menuSection: sectionName(category, name),
    usage: String(config.info?.uso || name),
    description: String(
      config.info?.descricao ||
      "Comando"
    ),
    permissions: permissionsFor(config),

    async execute(
      conn,
      msg,
      args,
      from,
      _axios,
      requestedName
    ) {
      const ctx = await buildContext({
        conn,
        msg,
        args,
        from,
        requestedName: requestedName || name,
      });

      return config.executar(ctx);
    },

    _sourceDefinition: config,
  };
}

module.exports = {
  setCommand,
  normal,
  categoryName,
  sectionName,
  permissionsFor,
};
