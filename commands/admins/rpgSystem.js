// Compatibilidade: o sistema real está em DADOS_KXLYN/plugins/rpg/modorpg.js.
const modoRpg = require("../../DADOS_KXLYN/plugins/rpg/modorpg");

module.exports = {
  name: "rpgsystem",
  aliases: ["sistemarpg", "ativarpg"],
  permissions: { group: true, admin: true },
  menuCategory: "Grupos",
  menuSection: "Configuração",
  usage: "rpgsystem on|off",
  description: "Ativa ou desativa o RPG do grupo.",

  async execute(conn, msg, args, from, axiosInstance) {
    const normalized = [...args];

    if (normalized[0]) {
      const value = String(normalized[0]).toLowerCase();
      if (["on", "ativar", "true"].includes(value)) normalized[0] = "1";
      if (["off", "desativar", "false"].includes(value)) normalized[0] = "0";
    }

    return modoRpg.execute(
      conn,
      msg,
      normalized,
      from,
      axiosInstance,
      "modorpg"
    );
  },
};
