// Menu: RPG - Personagem | Comando: registro
// commands/rpg/registro.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");
const rpgSystem = require("../../functions/rpgSystem");

const dbPath = path.join(__dirname, "..", "..", "database", "rpg.json");

// Garante que o diretório existe
function garantirDb() {
  const dbDir = path.join(__dirname, "..", "..", "database");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ usuarios: {} }, null, 2));
  }
}

// Carrega o banco de dados
function carregarDb() {
  garantirDb();
  const data = fs.readFileSync(dbPath, "utf8");
  return JSON.parse(data);
}

// Salva o banco de dados
function salvarDb(data) {
  garantirDb();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
  permissions: { group: true },
  name: "registro",
  aliases: ["registrar", "criarconta"],
  description: "ʀᴇɢɪsᴛʀᴀ sᴇᴜ ᴘᴇʀsᴏɴᴀɢᴇᴍ ɴᴏ ʀᴘɢ",
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

      // Verifica se já está registrado
      if (db.usuarios[lid]) {
        return await conn.sendMessage(from, {
          text: `❌ ᴠᴏᴄᴇ ᴊᴀ́ ᴇsᴛᴀ́ ʀᴇɢɪsᴛʀᴀᴅᴏ!\n\n📌 ᴜsᴇ ${prefix}ficha para ver seus dados.`,
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

      // 🔥 CRIA O PERSONAGEM COM PATENTE RECRUTA E XP PATENTE 0
      db.usuarios[lid] = {
        lid: lid,
        pushName: pushName,
        level: 1,
        xp: 0,
        xpPatente: 0,
        classe: "Arqueiro",
        gold: 0,
        patente: "Recruta",
        arma: [],
        espada: [],
        pet: [],
        petEquipado: null,
        escudo: [],
        itens: [],
        vida: 90,
        vidaMax: 90,
        mana: 40,
        manaMax: 40,
        dano: 20,
        defesa: 8,
        agilidade: 25,
        critico: 10,
        habilidades: [],
        ultimoTreino: null,
        ultimaCaca: null,
        ultimaMina: null,
        pokemon: null,
        inventarioPokemon: {}
      };

      salvarDb(db);

      // Mensagem de sucesso
      const texto = `✅ *ʀᴇɢɪsᴛʀᴏ ʀᴇᴀʟɪᴢᴀᴅᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ!*

━━━━━━━━━━━━━━━━━━━━
👤 *ɴᴏᴍᴇ:* ${pushName}
🏹 *ᴄʟᴀssᴇ:* ᴀʀǫᴜᴇɪʀᴏ
📊 *ʟᴇᴠᴇʟ:* 1
🪖 *ᴘᴀᴛᴇɴᴛᴇ:* ʀᴇᴄʀᴜᴛᴀ
📈 *xᴘ ᴘᴀᴛᴇɴᴛᴇ:* 0
💰 *ɢᴏʟᴅ:* 0

━━━━━━━━━━━━━━━━━━━━
📌 ᴜsᴇ ${prefix}ficha para ver seus dados completos.`;

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
      console.error("❌ Erro registro:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ʀᴇɢɪsᴛʀᴀʀ!*\n\n📌 ${error.message}`,
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
  "menuSection": "Personagem",
  "description": "registra seu personagem no rpg"
});
