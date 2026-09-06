// commands/rpg/ranklevel.js
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
  name: "ranklevel",
  aliases: ["ranklv", "rl"],
  description: "ᴍᴏsᴛʀᴀ ᴏ ʀᴀɴᴋɪɴɢ ᴅᴏs ᴍᴇʟʜᴏʀᴇs ʟᴇᴠᴇʟs",
  async execute(conn, msg, args, from) {
    try {
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const prefix = config.prefix || ".";

      // Verifica se o RPG está ativo
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

      // Ordena por level (decrescente) e depois por XP
      const ranking = usuarios
        .sort((a, b) => b.level - a.level || b.xp - a.xp)
        .slice(0, 10);

      // Emojis dos níveis
      const emojisRank = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

      let texto = `📊 *ʀᴀɴᴋɪɴɢ ᴘᴏʀ ʟᴇᴠᴇʟ*

━━━━━━━━━━━━━━━━━━━━
👥 *ᴛᴏᴛᴀʟ ᴅᴇ ᴊᴏɢᴀᴅᴏʀᴇs:* ${usuarios.length}
━━━━━━━━━━━━━━━━━━━━\n`;

      ranking.forEach((user, index) => {
        const nome = user.pushName || user.lid.split('@')[0];
        const emoji = emojisRank[index] || `${index + 1}️⃣`;
        const xpNecessario = user.level * 100;
        const progresso = Math.floor((user.xp / xpNecessario) * 10);
        const barra = "▰".repeat(progresso) + "▱".repeat(10 - progresso);

        texto += `${emoji} *${nome}*
   📊 Level ${user.level} • XP ${user.xp}/${xpNecessario}
   ${barra}
   🏷️ ${user.classe} • 💰 ${user.gold} golds
━━━━━━━━━━━━━━━━━━━━\n`;
      });

      texto += `\n📌 ᴜsᴇ .ficha ᴘᴀʀᴀ ᴠᴇʀ sᴇᴜs ᴅᴀᴅᴏs.`;

      await conn.sendMessage(from, {
        text: texto,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });

    } catch (error) {
      console.error("❌ Erro ranklevel:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴀʀʀᴇɢᴀʀ ᴏ ʀᴀɴᴋɪɴɢ!*\n\n📌 ${error.message}`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};