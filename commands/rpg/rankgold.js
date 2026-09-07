// Menu: RPG - Rankings | Comando: rankgold
// commands/rpg/rankgold.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");
const rpgSystem = require("../../functions/rpgSystem");

const dbPath = path.join(__dirname, "..", "..", "database", "rpg.json");

function carregarDb() {
  if (!fs.existsSync(dbPath)) return { usuarios: {} };
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

module.exports = {
  permissions: { group: true },
  name: "rankgold",
  aliases: ["rankg", "rg"],
  description: "ᴍᴏsᴛʀᴀ ᴏ ʀᴀɴᴋɪɴɢ ᴅᴏs ᴍᴀɪs ʀɪᴄᴏs",
  async execute(conn, msg, args, from) {
    try {
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const prefix = config.prefix || ".";

      if (from.endsWith("@g.us") && !rpgSystem.isRpgAtivo(from)) {
        return await conn.sendMessage(from, {
          text: `❌ *sɪsᴛᴇᴍᴀ ʀᴘɢ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*\n\n⚔️ ᴘᴇᴄᴀ ᴀ ᴜᴍ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴘᴀʀᴀ ᴀᴛɪᴠᴀʀ ᴏ sɪsᴛᴇᴍᴀ ᴄᴏᴍ:\n${prefix}rpgsystem on`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      const db = carregarDb();
      const usuarios = Object.values(db.usuarios);

      if (usuarios.length === 0) {
        return await conn.sendMessage(from, {
          text: "❌ ᴀɪɴᴅᴀ ɴᴀ̃ᴏ ʜᴀ́ ᴜsᴜᴀ́ʀɪᴏs ʀᴇɢɪsᴛʀᴀᴅᴏs!",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      // Ordena por gold (decrescente)
      const ranking = usuarios
        .sort((a, b) => b.gold - a.gold)
        .slice(0, 10);

      const emojisRank = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

      // Calcula o total de gold
      const totalGold = usuarios.reduce((acc, user) => acc + user.gold, 0);

      let texto = `💰 *ʀᴀɴᴋɪɴɢ ᴘᴏʀ ɢᴏʟᴅ*

━━━━━━━━━━━━━━━━━━━━
👥 *ᴛᴏᴛᴀʟ ᴅᴇ ᴊᴏɢᴀᴅᴏʀᴇs:* ${usuarios.length}
💰 *ɢᴏʟᴅ ᴛᴏᴛᴀʟ:* ${totalGold}
━━━━━━━━━━━━━━━━━━━━\n`;

      ranking.forEach((user, index) => {
        const nome = user.pushName || user.lid.split('@')[0];
        const emoji = emojisRank[index] || `${index + 1}️⃣`;

        // Calcula a porcentagem do gold total
        const porcentagem = totalGold > 0 ? ((user.gold / totalGold) * 100).toFixed(1) : 0;

        texto += `${emoji} *${nome}*
   💰 ${user.gold} golds (${porcentagem}% do total)
   📊 Level ${user.level} • 🏷️ ${user.classe}
━━━━━━━━━━━━━━━━━━━━\n`;
      });

      texto += `\n📌 ᴜsᴇ .minerar ᴘᴀʀᴀ ɢᴀɴʜᴀʀ ᴍᴀɪs ɢᴏʟᴅ!`;

      await conn.sendMessage(from, {
        text: texto,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });

    } catch (error) {
      console.error("❌ Erro rankgold:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴀʀʀᴇɢᴀʀ ᴏ ʀᴀɴᴋɪɴɢ!*\n\n📌 ${error.message}`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "RPG",
  "menuSection": "Rankings",
  "description": "mostra o ranking dos mais ricos"
});
