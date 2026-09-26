const { isTextOnly, setTextOnly } = require("../../functions/uiMode");
const config = require("../../../config/config");

module.exports = {
  name: "sembotoes",
  aliases: ["modobotoes", "botoes"],
  permissions: { group: true, admin: true },
  menuCategory: "Grupos",
  menuSection: "Configuração",
  usage: "sembotoes 1/0",
  description: "Ativa o modo de mensagens sem botões neste grupo.",
  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    const current = isTextOnly(from);
    const option = String(args?.[0] || "").toLowerCase();
    if (!option) {
      return conn.sendMessage(from, {
        text: "🧭 *Modo sem botões:* " + (current ? "ativo" : "desativado") +
          "\n\nUse " + prefix + "sembotoes 1 para mostrar comandos em texto.\n" +
          "Use " + prefix + "sembotoes 0 para permitir botões neste grupo.\n" +
          "Grupos novos começam com o modo sem botões ativo."
      }, { quoted: msg });
    }
    if (!["1", "0", "on", "off", "ativar", "desativar"].includes(option)) {
      return conn.sendMessage(from, { text: "Use " + prefix + "sembotoes 1/0." }, { quoted: msg });
    }
    const enabled = ["1", "on", "ativar"].includes(option);
    setTextOnly(from, enabled);
    return conn.sendMessage(from, {
      text: enabled
        ? "✅ Modo sem botões ativado. Os comandos mostrarão as opções por texto."
        : "✅ Botões permitidos neste grupo. Use " + prefix + "sembotoes 1 para voltar ao texto."
    }, { quoted: msg });
  }
};
