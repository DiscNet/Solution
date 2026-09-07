// Menu: RPG - Economia e itens | Comando: minerar
// commands/rpg/minerar.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");
const rpgSystem = require("../../functions/rpgSystem");

const dbPath = path.join(__dirname, "..", "..", "database", "rpg.json");

// Carrega o banco de dados
function carregarDb() {
  if (!fs.existsSync(dbPath)) {
    return { usuarios: {} };
  }
  const data = fs.readFileSync(dbPath, "utf8");
  return JSON.parse(data);
}

// Salva o banco de dados
function salvarDb(data) {
  const dbDir = path.join(__dirname, "..", "..", "database");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
  permissions: { group: true },
  name: "minerar",
  aliases: ["miner", "mina"],
  description: "ᴍɪɴᴇʀᴀ ᴇ ᴄᴏɴsɪɢᴀ ɢᴏʟᴅ ᴇ xᴘ",
  async execute(conn, msg, args, from) {
    try {
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const prefix = config.prefix || ".";

      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      // 🔥 VERIFICA SE O RPG ESTÁ ATIVO NO GRUPO
      if (from.endsWith("@g.us") && !rpgSystem.isRpgAtivo(from)) {
        return await conn.sendMessage(from, {
          text: `❌ *sɪsᴛᴇᴍᴀ ʀᴘɢ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*\n\n⚔️ ᴘᴇᴄᴀ ᴀ ᴜᴍ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴘᴀʀᴀ ᴀᴛɪᴠᴀʀ ᴏ sɪsᴛᴇᴍᴀ ᴄᴏᴍ:\n${prefix}rpgsystem on`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      // Pega o LID do usuário
      let lid = msg.key.participant || msg.key.remoteJid || from;

      if (from.endsWith("@g.us") && msg.key.participant) {
        lid = msg.key.participant;
      }

      // Carrega o banco de dados
      const db = carregarDb();

      // Verifica se está registrado
      if (!db.usuarios[lid]) {
        return await conn.sendMessage(from, {
          text: `❌ ᴠᴏᴄᴇ ᴀɪɴᴅᴀ ɴᴀᴏ ᴇsᴛᴀ́ ʀᴇɢɪsᴛʀᴀᴅᴏ!\n\n📌 ᴜsᴇ ${prefix}registro para criar seu personagem.`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      const ficha = db.usuarios[lid];

      // 🔥 VERIFICA COOLDOWN (5 MINUTOS)
      const agora = Date.now();
      const cooldown = 5 * 60 * 1000; // 5 minutos em milissegundos

      if (ficha.ultimaMina && (agora - ficha.ultimaMina) < cooldown) {
        const tempoRestante = Math.ceil((cooldown - (agora - ficha.ultimaMina)) / 1000);
        const minutos = Math.floor(tempoRestante / 60);
        const segundos = tempoRestante % 60;

        return await conn.sendMessage(from, {
          text: `⛏️ *ᴀɢᴜᴀʀᴅᴇ!*\n\nᴠᴏᴄᴇ ᴊᴀ́ ᴍɪɴᴇʀᴏᴜ ʀᴇᴄᴇɴᴛᴇᴍᴇɴᴛᴇ.\n\n⏳ ᴛᴇᴍᴘᴏ ʀᴇsᴛᴀɴᴛᴇ: ${minutos}ᴍ ${segundos}s\n\n📌 ᴠᴏʟᴛᴇ ᴇᴍ ${minutos} ᴍɪɴᴜᴛᴏs ᴇ ${segundos} sᴇɢᴜɴᴅᴏs.`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      // 🔥 GERA OS RESULTADOS DA MINERAÇÃO
      // Gold: 1 a 300
      const goldGanho = Math.floor(Math.random() * 300) + 1;

      // XP: 23% de chance de ganhar 1 a 16 de XP
      let xpGanho = 0;
      const chanceXp = Math.random() * 100;
      if (chanceXp <= 23) {
        xpGanho = Math.floor(Math.random() * 16) + 1;
      }

      // Adiciona gold na ficha
      ficha.gold += goldGanho;

      // Adiciona XP na ficha (se houver)
      let levelUp = false;
      if (xpGanho > 0) {
        ficha.xp += xpGanho;

        // Verifica level up
        const xpNecessario = ficha.level * 100;
        while (ficha.xp >= xpNecessario) {
          ficha.xp -= xpNecessario;
          ficha.level += 1;
          ficha.vidaMax += 20;
          ficha.vida = ficha.vidaMax;
          ficha.manaMax += 10;
          ficha.mana = ficha.manaMax;
          ficha.dano += 5;
          ficha.defesa += 2;
          ficha.agilidade += 2;
          ficha.critico += 1;
          levelUp = true;
        }
      }

      // Registra a última mineração
      ficha.ultimaMina = agora;

      // Salva no banco de dados
      salvarDb(db);

      // 🔥 MONTA A MENSAGEM DE RESULTADO
      let mensagem = `⛏️ *ʀᴇsᴜʟᴛᴀᴅᴏ ᴅᴀ ᴍɪɴᴇʀᴀᴄ̧ᴀ̃ᴏ!*

━━━━━━━━━━━━━━━━━━━━
💰 *ɢᴏʟᴅ ᴏʙᴛɪᴅᴏ:* +${goldGanho}`

      if (xpGanho > 0) {
        mensagem += `\n📈 *xᴘ ᴏʙᴛɪᴅᴏ:* +${xpGanho}`;
      } else {
        mensagem += `\n📈 *xᴘ ᴏʙᴛɪᴅᴏ:* 0 (sᴇᴍ sᴏʀᴛᴇ)`;
      }

      mensagem += `\n\n━━━━━━━━━━━━━━━━━━━━
📊 *ɴᴏᴠᴏs ᴇsᴛᴀᴛᴜs:*
💰 *ɢᴏʟᴅ ᴛᴏᴛᴀʟ:* ${ficha.gold}
📈 *xᴘ ᴛᴏᴛᴀʟ:* ${ficha.xp}
📊 *ʟᴇᴠᴇʟ:* ${ficha.level}`;

      if (levelUp) {
        mensagem += `\n\n🎉 *ᴘᴀʀᴀʙᴇ́ɴs! ᴠᴏᴄᴇ sᴜʙɪᴜ ᴅᴇ ʟᴇᴠᴇʟ!*`;
      }

      mensagem += `\n\n⏳ ᴘʀᴏ́xɪᴍᴀ ᴍɪɴᴇʀᴀᴄ̧ᴀ̃ᴏ ᴇᴍ 5 ᴍɪɴᴜᴛᴏs.`;

      await conn.sendMessage(from, {
        text: mensagem,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: `${bot}`,
            serverMessageId: 116
          }
        }
      }, { quoted: msg });

    } catch (error) {
      console.error("❌ Erro minerar:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴍɪɴᴇʀᴀʀ!*\n\n📌 ${error.message}`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: `${bot}`,
            serverMessageId: 116
          }
        }
      }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "RPG",
  "menuSection": "Economia e itens",
  "description": "minera e consiga gold e xp"
});
