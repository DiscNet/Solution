// commands/rpg/rankativo.js
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
  name: "rankativo",
  aliases: ["rankatv", "ra", "ativo"],
  description: "ᴍᴏsᴛʀᴀ ᴏs ᴍᴀɪs ᴀᴛɪᴠᴏs ᴅᴏ ɢʀᴜᴘᴏ",
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

      // Calcula a "atividade" baseada em:
      // - Level (peso 2)
      // - Gold (peso 1)
      // - Última mineração, caça, treino (se tiver feito recentemente)
      const agora = Date.now();
      const umaSemana = 7 * 24 * 60 * 60 * 1000;

      const usuariosComAtividade = usuarios.map(user => {
        let pontos = 0;

        // Level (peso 2)
        pontos += user.level * 2;

        // Gold (peso 1)
        pontos += Math.floor(user.gold / 10);

        // Atividade recente (última mineração)
        if (user.ultimaMina && (agora - user.ultimaMina) < umaSemana) {
          pontos += 50;
        }
        if (user.ultimaCaca && (agora - user.ultimaCaca) < umaSemana) {
          pontos += 50;
        }
        if (user.ultimoTreino && (agora - user.ultimoTreino) < umaSemana) {
          pontos += 30;
        }

        // Quantidade de itens (ativo nas lojas)
        pontos += user.itens.length * 5;
        pontos += user.arma.length * 10;
        pontos += user.espada.length * 10;
        pontos += user.escudo.length * 10;
        pontos += user.pet.length * 20;

        return { ...user, pontos };
      });

      // Ordena por pontos (decrescente)
      const ranking = usuariosComAtividade
        .sort((a, b) => b.pontos - a.pontos)
        .slice(0, 10);

      const emojisRank = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

      let texto = `⚡ *ʀᴀɴᴋɪɴɢ ᴅᴏs ᴍᴀɪs ᴀᴛɪᴠᴏs*

━━━━━━━━━━━━━━━━━━━━
👥 *ᴛᴏᴛᴀʟ ᴅᴇ ᴊᴏɢᴀᴅᴏʀᴇs:* ${usuarios.length}
━━━━━━━━━━━━━━━━━━━━\n`;

      ranking.forEach((user, index) => {
        const nome = user.pushName || user.lid.split('@')[0];
        const emoji = emojisRank[index] || `${index + 1}️⃣`;

        // Verifica se esteve ativo na última semana
        const ativoRecentemente = (user.ultimaMina && (agora - user.ultimaMina) < umaSemana) ||
                                   (user.ultimaCaca && (agora - user.ultimaCaca) < umaSemana) ||
                                   (user.ultimoTreino && (agora - user.ultimoTreino) < umaSemana);

        const statusAtivo = ativoRecentemente ? "🟢 ᴀᴛɪᴠᴏ" : "🔴 ɪɴᴀᴛɪᴠᴏ";

        texto += `${emoji} *${nome}*
   ⚡ ${user.pontos} ᴘᴏɴᴛᴏs ᴅᴇ ᴀᴛɪᴠɪᴅᴀᴅᴇ
   ${statusAtivo}
   📊 Level ${user.level} • 🏷️ ${user.classe} • 💰 ${user.gold} golds
━━━━━━━━━━━━━━━━━━━━\n`;
      });

      texto += `\n📌 *ᴄᴏᴍᴏ sᴇ ᴄᴀʟᴄᴜʟᴀ ᴀ ᴀᴛɪᴠɪᴅᴀᴅᴇ?*
🎯 Level x2 + Gold/10
⚔️ Mineração +50 (últ. semana)
🏹 Caça +50 (últ. semana)
💪 Treino +30 (últ. semana)
🎒 Itens e equipamentos dão bônus`;

      await conn.sendMessage(from, {
        text: texto,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });

    } catch (error) {
      console.error("❌ Erro rankativo:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴀʀʀᴇɢᴀʀ ᴏ ʀᴀɴᴋɪɴɢ!*\n\n📌 ${error.message}`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};