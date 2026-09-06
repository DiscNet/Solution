// commands/rpg/ficha.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");
const rpgSystem = require("../../functions/rpgSystem");
const patentes = require("../../functions/patentes");

const dbPath = path.join(__dirname, "..", "..", "database", "rpg.json");
const petsPath = path.join(__dirname, "..", "..", "database", "rpgPets.json");

function carregarDb() {
  if (!fs.existsSync(dbPath)) {
    return { usuarios: {} };
  }
  const data = fs.readFileSync(dbPath, "utf8");
  return JSON.parse(data);
}

function carregarPets() {
  if (!fs.existsSync(petsPath)) return { pets: {} };
  return JSON.parse(fs.readFileSync(petsPath, "utf8"));
}

module.exports = {
  permissions: { group: true },
  name: "ficha",
  aliases: ["perfilrpg", "stats"],
  description: "ᴍᴏsᴛʀᴀ sᴜᴀ ғɪᴄʜᴀ ᴅᴇ ʀᴘɢ",
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
      const petsData = carregarPets();

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

      // Atualiza o pushName se mudou
      if (ficha.pushName !== pushName) {
        ficha.pushName = pushName;
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      }

      // Calcula XP necessário para próximo nível
      const xpNecessario = ficha.level * 100;
      const progresso = Math.floor((ficha.xp / xpNecessario) * 20);
      const barra = "▰".repeat(progresso) + "▱".repeat(20 - progresso);

      // 🔥 PEGA O PROGRESSO DA PATENTE
      const progressoPatente = patentes.getProgressoPatente(ficha);
      const patentesData = patentes.carregarPatentes();

      // Pega os dados da patente atual
      const patenteAtualKey = ficha.patente.toLowerCase();
      const patenteAtualData = patentesData.patentes[patenteAtualKey];
      const emojiPatente = patenteAtualData ? patenteAtualData.emoji : "⭐";

      // Calcula a barra de progresso da patente
      let barraPatente = "";
      let xpPatenteTexto = "";

      if (progressoPatente.proxima) {
        const progressoPatentePercent = Math.floor(progressoPatente.progresso);
        const barLength = Math.floor(progressoPatentePercent / 5);
        barraPatente = "▰".repeat(Math.min(barLength, 20)) + "▱".repeat(Math.max(20 - barLength, 0));
        xpPatenteTexto = `${ficha.xpPatente}/${progressoPatente.xpNecessario}`;
      } else {
        barraPatente = "▰".repeat(20);
        xpPatenteTexto = `${ficha.xpPatente} (ᴍᴀ́xɪᴍᴀ)`;
      }

      // Emojis das classes
      const emojis = {
        "Arqueiro": "🏹",
        "Assassino": "🗡️"
      };
      const emoji = emojis[ficha.classe] || "⚔️";

      // 🔥 PEGA O PET EQUIPADO
      let petEquipadoTexto = "ɴᴇɴʜᴜᴍ";
      if (ficha.petEquipado && petsData.pets[ficha.petEquipado]) {
        const pet = petsData.pets[ficha.petEquipado];
        petEquipadoTexto = `${pet.emoji} ${ficha.petEquipado}`;
      }

      // Monta a mensagem com fonte smallcap
      const texto = `${emoji} *ғ ɪ ᴄ ʜ ᴀ  ᴅ ᴇ  ʀ ᴘ ɢ*

━━━━━━━━━━━━━━━━━━━━
👤 ɴᴏᴍᴇ: ${ficha.pushName}
🏷️ ᴄʟᴀssᴇ: ${ficha.classe}
📊 ʟᴇᴠᴇʟ: ${ficha.level}
${emojiPatente} ᴘᴀᴛᴇɴᴛᴇ: ${ficha.patente}
💰 ɢᴏʟᴅ: ${ficha.gold}
🐾 ᴘᴇᴛ ᴇǫᴜɪᴘᴀᴅᴏ: ${petEquipadoTexto}

📈 ᴇxᴘ: ${ficha.xp}/${xpNecessario}
${barra}

📈 *ᴘᴀᴛᴇɴᴛᴇ xᴘ:* ${xpPatenteTexto}
${barraPatente}

━━━━━━━━━━━━━━━━━━━━
❤️ ᴠɪᴅᴀ: ${ficha.vida}/${ficha.vidaMax}
💙 ᴍᴀɴᴀ: ${ficha.mana}/${ficha.manaMax}
⚔️ ᴅᴀɴᴏ: ${ficha.dano}
🛡️ ᴅᴇғᴇsᴀ: ${ficha.defesa}
💨 ᴀɢɪʟɪᴅᴀᴅᴇ: ${ficha.agilidade}
💥 ᴄʀɪᴛɪᴄᴏ: ${ficha.critico}%

━━━━━━━━━━━━━━━━━━━━
🗡️ ᴀʀᴍᴀs: ${ficha.arma.length > 0 ? ficha.arma.join(", ") : "ɴᴇɴʜᴜᴍᴀ"}
⚔️ ᴇsᴘᴀᴅᴀs: ${ficha.espada.length > 0 ? ficha.espada.join(", ") : "ɴᴇɴʜᴜᴍᴀ"}
🛡️ ᴇsᴄᴜᴅᴏs: ${ficha.escudo.length > 0 ? ficha.escudo.join(", ") : "ɴᴇɴʜᴜᴍ"}
🐾 ᴘᴇᴛs: ${ficha.pet.length > 0 ? ficha.pet.join(", ") : "ɴᴇɴʜᴜᴍ"}

🎯 ʜᴀʙɪʟɪᴅᴀᴅᴇs: ${ficha.habilidades.length > 0 ? ficha.habilidades.join(", ") : "ɴᴇɴʜᴜᴍᴀ"}

📦 ɪᴛᴇɴs: ${ficha.itens.length > 0 ? ficha.itens.join(", ") : "ɴᴇɴʜᴜᴍ"}
━━━━━━━━━━━━━━━━━━━━

> 🌫️ ᴜᴛɪʟɪᴢᴇ ${prefix}menu para ver os comandos`;

      await conn.sendMessage(from, {
        text: texto,
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
      console.error("❌ Erro ficha:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴀʀʀᴇɢᴀʀ ғɪᴄʜᴀ!*\n\n📌 ${error.message}`,
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