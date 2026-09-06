const { createStatusQuoted } = require("../../functions/statusCard");
// commands/rpg/pets.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");
const rpgSystem = require("../../functions/rpgSystem");
const { sendInteractiveMessage } = require("gifted-btns");

const dbPath = path.join(__dirname, "..", "..", "database", "rpg.json");
const petsPath = path.join(__dirname, "..", "..", "database", "rpgPets.json");

function carregarDb() {
  if (!fs.existsSync(dbPath)) return { usuarios: {} };
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function carregarPets() {
  if (!fs.existsSync(petsPath)) return { pets: {} };
  return JSON.parse(fs.readFileSync(petsPath, "utf8"));
}

function salvarDb(data) {
  const dbDir = path.join(__dirname, "..", "..", "database");
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
  permissions: { group: true },
  name: "pets",
  aliases: ["pet", "meuspets", "equipar"],
  description: "ᴠᴇʀ sᴇᴜs ᴘᴇᴛs ᴇ ᴇǫᴜɪᴘᴀʀ ᴜᴍ",
  async execute(conn, msg, args, from) {
    try {
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const prefix = config.prefix || ".";

      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      // Verifica se o RPG está ativo
      if (from.endsWith("@g.us") && !rpgSystem.isRpgAtivo(from)) {
        return await conn.sendMessage(from, {
          text: `❌ *sɪsᴛᴇᴍᴀ ʀᴘɢ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*\n\n⚔️ ᴘᴇᴄᴀ ᴀ ᴜᴍ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴘᴀʀᴀ ᴀᴛɪᴠᴀʀ ᴏ sɪsᴛᴇᴍᴀ ᴄᴏᴍ:\n${prefix}rpgsystem on`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      let lid = msg.key.participant || msg.key.remoteJid || from;
      if (from.endsWith("@g.us") && msg.key.participant) {
        lid = msg.key.participant;
      }

      const db = carregarDb();
      const petsData = carregarPets();

      if (!db.usuarios[lid]) {
        return await conn.sendMessage(from, {
          text: `❌ ᴠᴏᴄᴇ ᴀɪɴᴅᴀ ɴᴀᴏ ᴇsᴛᴀ́ ʀᴇɢɪsᴛʀᴀᴅᴏ!\n\n📌 ᴜsᴇ ${prefix}registro para criar seu personagem.`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      const ficha = db.usuarios[lid];

      // 🔥 VERIFICA SE É PARA EQUIPAR
      if (args[0] && args[0].toLowerCase() === "equipar") {
        let petNome = args.slice(1).join(" ").trim();
        petNome = petNome.replace(/^["']|["']$/g, "").trim();

        if (!petNome) {
          return await conn.sendMessage(from, {
            text: `❌ ɪɴғᴏʀᴍᴇ ᴏ ɴᴏᴍᴇ ᴅᴏ ᴘᴇᴛ ᴘᴀʀᴀ ᴇǫᴜɪᴘᴀʀ!\n📌 ${prefix}pets equipar filhote de lobo`,
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        }

        // Verifica se o pet existe no inventário
        if (!ficha.pet.includes(petNome)) {
          return await conn.sendMessage(from, {
            text: `❌ ᴠᴏᴄᴇ ɴᴀ̃ᴏ ᴘᴏssᴜɪ ᴏ ᴘᴇᴛ *${petNome}*!`,
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        }

        // Equipa o pet
        ficha.petEquipado = petNome;
        salvarDb(db);

        const petData = petsData.pets[petNome];

        await conn.sendMessage(from, {
          text: `✅ *ᴘᴇᴛ ᴇǫᴜɪᴘᴀᴅᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ!*

${petData.emoji} *ᴘᴇᴛ:* ${petNome}
📊 *ʀᴀʀɪᴅᴀᴅᴇ:* ${petData.raro}
❤️ *ᴠɪᴅᴀ:* +${petData.vida}
⚔️ *ᴅᴀɴᴏ:* +${petData.dano}
🛡️ *ᴅᴇғᴇsᴀ:* +${petData.defesa}
💨 *ᴀɢɪʟɪᴅᴀᴅᴇ:* +${petData.agilidade}

🎯 *ʜᴀʙɪʟɪᴅᴀᴅᴇs:* ${petData.habilidades.join(", ")}`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });

        return;
      }

      // 🔥 VERIFICA SE É PARA DESEQUIPAR
      if (args[0] && args[0].toLowerCase() === "desequipar") {
        if (!ficha.petEquipado) {
          return await conn.sendMessage(from, {
            text: "❌ ᴠᴏᴄᴇ ɴᴀ̃ᴏ ᴛᴇᴍ ɴᴇɴʜᴜᴍ ᴘᴇᴛ ᴇǫᴜɪᴘᴀᴅᴏ!",
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        }

        const petNome = ficha.petEquipado;
        ficha.petEquipado = null;
        salvarDb(db);

        await conn.sendMessage(from, {
          text: `❌ *ᴘᴇᴛ ᴅᴇsᴇǫᴜɪᴘᴀᴅᴏ!*\n\n${petNome} ғᴏɪ ᴅᴇsᴇǫᴜɪᴘᴀᴅᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ.`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });

        return;
      }

      // =====================
      // MENU INTERATIVO DOS PETS
      // =====================

      const sections = [];

      // Verifica se tem pet equipado
      let petEquipadoInfo = "ɴᴇɴʜᴜᴍ";
      if (ficha.petEquipado) {
        const petData = petsData.pets[ficha.petEquipado];
        petEquipadoInfo = `${petData.emoji} ${ficha.petEquipado}`;
      }

      // Seção do pet equipado
      sections.push({
        title: "🐾 ᴘᴇᴛ ᴇǫᴜɪᴘᴀᴅᴏ",
        rows: [
          {
            id: `${prefix}pets desequipar`,
            title: petEquipadoInfo,
            description: ficha.petEquipado ? "🔽 ᴄʟɪǫᴜᴇ ᴘᴀʀᴀ ᴅᴇsᴇǫᴜɪᴘᴀʀ" : "ɴᴇɴʜᴜᴍ ᴘᴇᴛ ᴇǫᴜɪᴘᴀᴅᴏ"
          }
        ]
      });

      // Seção de pets disponíveis
      if (ficha.pet.length > 0) {
        const rows = [];
        const petAtual = ficha.petEquipado;

        for (const nomePet of ficha.pet) {
          const petData = petsData.pets[nomePet];
          if (!petData) continue;

          const equipado = petAtual === nomePet ? "✅" : "⬜";
          rows.push({
            id: `${prefix}pets equipar "${nomePet}"`,
            title: `${equipado} ${petData.emoji} ${nomePet}`,
            description: `${petData.raro} | ❤️${petData.vida} ⚔️${petData.dano} | ${petData.descricao.substring(0, 25)}...`
          });
        }

        if (rows.length > 0) {
          sections.push({
            title: `📦 sᴇᴜs ᴘᴇᴛs (${ficha.pet.length})`,
            rows: rows
          });
        }
      }

      // Seção de informações
      sections.push({
        title: "📊 ɪɴғᴏʀᴍᴀᴄ̧ᴏ̃ᴇs",
        rows: [
          {
            id: `${prefix}ficha`,
            title: `📊 ${ficha.pushName}`,
            description: `ʟᴇᴠᴇʟ ${ficha.level} | ${ficha.classe} | 💰 ${ficha.gold} ɢᴏʟᴅs`
          },
          {
            id: `${prefix}lojapets`,
            title: "🐾 ᴀᴅᴏᴛᴀʀ ɴᴏᴠᴏ ᴘᴇᴛ",
            description: "ᴠᴀ́ ᴀ ʟᴏᴊᴀ ᴅᴇ ᴘᴇᴛs"
          }
        ]
      });

      // Monta o texto principal
      let texto = `🐾 *sᴇᴜs ᴘᴇᴛs*

━━━━━━━━━━━━━━━━━━━━
👤 *ɴᴏᴍᴇ:* ${ficha.pushName}
🐾 *ᴘᴇᴛs:* ${ficha.pet.length}
`;

      if (ficha.petEquipado) {
        const petData = petsData.pets[ficha.petEquipado];
        texto += `\n✅ *ᴇǫᴜɪᴘᴀᴅᴏ:* ${petData.emoji} ${ficha.petEquipado}`;
      } else {
        texto += `\n❌ *ᴇǫᴜɪᴘᴀᴅᴏ:* ɴᴇɴʜᴜᴍ`;
      }

      texto += `\n━━━━━━━━━━━━━━━━━━━━

📌 sᴇʟᴇᴄɪᴏɴᴇ ᴜᴍ ᴘᴇᴛ ᴘᴀʀᴀ ᴇǫᴜɪᴘᴀʀ:

✅ = ᴘᴇᴛ ᴀᴛᴜᴀʟ
⬜ = ᴅɪsᴘᴏɴɪ́ᴠᴇʟ ᴘᴀʀᴀ ᴇǫᴜɪᴘᴀʀ`;

      // Envia a mensagem interativa
      await sendInteractiveMessage(conn, from, {
        text: texto,
        footer: "ʟᴜᴋᴀᴍᴏᴅᴢᴢ • ʀᴘɢ",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } },
        interactiveButtons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "🐾 sᴇᴜs ᴘᴇᴛs",
              sections: sections
            })
          }
        ]
      }, {
        quoted: createStatusQuoted(msg)
      });

    } catch (error) {
      console.error("❌ Erro pets:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴀʀʀᴇɢᴀʀ sᴇᴜs ᴘᴇᴛs!*\n\n📌 ${error.message}`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};