// Menu: Grupos - RPG/Economia | Comando: modocoins
const config = require("../../config/config");
const economy = require("../../functions/economySystem");

module.exports = {
  name: "modocoins",
  aliases: ["coinssystem", "economiasystem"],
  menuCategory: "Grupos",
  menuSection: "RPG e Economia",
  usage: "modocoins on|off",
  description: "ativa ou desativa a economia Coins no grupo",
  permissions: { group: true, admin: true },

  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    const action = String(args?.[0] || "").toLowerCase();
    const actor = economy.actorJid(msg, from);
    const enabled = economy.isEnabled(from);

    if (!action) {
      return conn.sendMessage(from, {
        text:
          `🪙 *ᴍᴏᴅᴏ ᴄᴏɪɴs*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📊 sᴛᴀᴛᴜs: *${enabled ? "ᴀᴛɪᴠᴏ ✅" : "ᴅᴇsᴀᴛɪᴠᴀᴅᴏ ❌"}*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📌 ${prefix}modocoins on\n` +
          `📌 ${prefix}modocoins off`
      }, { quoted: msg });
    }

    if (["on", "1", "ativar", "ativo"].includes(action)) {
      economy.setEnabled(from, true, actor);
      return conn.sendMessage(from, {
        text:
          `✅ *ᴇᴄᴏɴᴏᴍɪᴀ ᴀᴛɪᴠᴀᴅᴀ!*\n\n` +
          `🪙 Agora o grupo pode usar Coins, mercado, doações e Pokémon.\n` +
          `⚔️ O Gold antigo continua sincronizado para não perder progresso.`
      }, { quoted: msg });
    }

    if (["off", "0", "desativar", "desativado"].includes(action)) {
      economy.setEnabled(from, false, actor);
      return conn.sendMessage(from, {
        text:
          `❌ *ᴇᴄᴏɴᴏᴍɪᴀ ᴅᴇsᴀᴛɪᴠᴀᴅᴀ!*\n\n` +
          `🪙 Os comandos de Coins e Pokémon ficam pausados neste grupo.\n` +
          `⚔️ O RPG principal continua obedecendo ao modo RPG.`
      }, { quoted: msg });
    }

    return conn.sendMessage(from, {
      text: `❌ Use *${prefix}modocoins on* ou *${prefix}modocoins off*.`
    }, { quoted: msg });
  },
};
