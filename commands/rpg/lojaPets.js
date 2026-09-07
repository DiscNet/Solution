// Menu: RPG - Pets | Comando: lojapets
const { createStatusQuoted } = require("../../functions/statusCard");
// commands/rpg/lojapets.js
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
  name: "lojapets",
  aliases: ["petshop", "petstore", "lojapet"],
  description: "ᴄᴏᴍᴘʀᴇ ᴘᴇᴛs ᴘᴀʀᴀ ᴛᴇ ᴀᴄᴏᴍᴘᴀɴʜᴀʀ ᴇᴍ sᴜᴀs ᴀᴠᴇɴᴛᴜʀᴀs",
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

      // 🔥 VERIFICA SE É COMPRA
      if (args[0] && args[0].toLowerCase() === "comprar") {
        let petNome = args.slice(1).join(" ").trim();
        petNome = petNome.replace(/^["']|["']$/g, "").trim();

        if (!petNome) {
          return await conn.sendMessage(from, {
            text: `❌ ɪɴғᴏʀᴍᴇ ᴏ ɴᴏᴍᴇ ᴅᴏ ᴘᴇᴛ!\n📌 ${prefix}lojapets comprar filhote de lobo\n📌 ${prefix}lojapets comprar "filhote de lobo"`,
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        }

        // Procura o pet
        let petEncontrado = null;
        let petNomeOriginal = null;

        for (const [nome, pet] of Object.entries(petsData.pets)) {
          if (nome.toLowerCase() === petNome.toLowerCase()) {
            petEncontrado = pet;
            petNomeOriginal = nome;
            break;
          }
        }

        if (!petEncontrado) {
          return await conn.sendMessage(from, {
            text: `❌ ᴘᴇᴛ *${petNome}* ɴᴀ̃ᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ ɴᴀ ʟᴏᴊᴀ!`,
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        }

        // Verifica level
        if (ficha.level < petEncontrado.level) {
          return await conn.sendMessage(from, {
            text: `❌ ᴠᴏᴄᴇ ᴘʀᴇᴄɪsᴀ sᴇʀ ʟᴇᴠᴇʟ ${petEncontrado.level} ᴘᴀʀᴀ ᴀᴅᴏᴛᴀʀ *${petNomeOriginal}*!\n📊 sᴇᴜ ʟᴇᴠᴇʟ: ${ficha.level}`,
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        }

        // Verifica gold
        if (ficha.gold < petEncontrado.preco) {
          return await conn.sendMessage(from, {
            text: `❌ ᴠᴏᴄᴇ ɴᴀ̃ᴏ ᴛᴇᴍ ɢᴏʟᴅ sᴜғɪᴄɪᴇɴᴛᴇ!\n💰 ᴘʀᴇᴄ̧ᴏ: ${petEncontrado.preco}\n💰 sᴇᴜ ɢᴏʟᴅ: ${ficha.gold}`,
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        }

        // 🔥 COMPRA REALIZADA
        ficha.gold -= petEncontrado.preco;
        ficha.pet.push(petNomeOriginal);

        salvarDb(db);

        await conn.sendMessage(from, {
          text: `✅ *ᴘᴇᴛ ᴀᴅᴏᴛᴀᴅᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ!*

${petEncontrado.emoji} *ᴘᴇᴛ:* ${petNomeOriginal}
📊 *ʀᴀʀɪᴅᴀᴅᴇ:* ${petEncontrado.raro}
💰 *ɢᴏʟᴅ ɢᴀsᴛᴏ:* ${petEncontrado.preco}
💰 *ɢᴏʟᴅ ʀᴇsᴛᴀɴᴛᴇ:* ${ficha.gold}

📝 ${petEncontrado.descricao}`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });

        return;
      }

      // =====================
      // MENU INTERATIVO DA LOJA DE PETS
      // =====================

      const sections = [];

      // Agrupa pets por raridade
      const raridades = {
        "comum": { emoji: "🟢", label: "ᴄᴏᴍᴜɴs" },
        "incomum": { emoji: "🔵", label: "ɪɴᴄᴏᴍᴜɴs" },
        "raro": { emoji: "🟣", label: "ʀᴀʀᴏs" },
        "lendario": { emoji: "🟡", label: "ʟᴇɴᴅᴀ́ʀɪᴏs" }
      };

      for (const [raridade, configRaridade] of Object.entries(raridades)) {
        const petsDaRaridade = Object.entries(petsData.pets)
          .filter(([nome, pet]) => pet.raro === raridade);

        if (petsDaRaridade.length > 0) {
          const rows = [];

          for (const [nome, pet] of petsDaRaridade) {
            const disponivel = ficha.level >= pet.level;
            const status = disponivel ? "✅" : "🔒";
            rows.push({
              id: `${prefix}lojapets comprar "${nome}"`,
              title: `${status} ${pet.emoji} ${nome}`,
              description: `💰 ${pet.preco} ɢᴏʟᴅs | ʟᴠ.${pet.level} | ${pet.descricao.substring(0, 30)}...`
            });
          }

          sections.push({
            title: `${configRaridade.emoji} ${configRaridade.label}`,
            rows: rows
          });
        }
      }

      // Seção de Informações do Jogador
      sections.push({
        title: "👤 sᴇᴜs ᴅᴀᴅᴏs",
        rows: [
          {
            id: `${prefix}ficha`,
            title: `📊 ${ficha.pushName}`,
            description: `ʟᴇᴠᴇʟ ${ficha.level} | ${ficha.classe} | 💰 ${ficha.gold} ɢᴏʟᴅs`
          },
          {
            id: `${prefix}petinfo`,
            title: `🐾 ${ficha.pet.length} ᴘᴇᴛs`,
            description: ficha.pet.length > 0 ? ficha.pet.join(", ") : "ɴᴇɴʜᴜᴍ ᴘᴇᴛ"
          }
        ]
      });

      // Envia a mensagem interativa
      await sendInteractiveMessage(conn, from, {
        text: `🐾 *ʟᴏᴊᴀ ᴅᴇ ᴘᴇᴛs*

━━━━━━━━━━━━━━━━━━━━
👤 *ɴᴏᴍᴇ:* ${ficha.pushName}
💰 *ɢᴏʟᴅ:* ${ficha.gold}
📊 *ʟᴇᴠᴇʟ:* ${ficha.level}
🐾 *ᴘᴇᴛs:* ${ficha.pet.length}
━━━━━━━━━━━━━━━━━━━━

📌 sᴇʟᴇᴄɪᴏɴᴇ ᴜᴍ ᴘᴇᴛ ᴘᴀʀᴀ ᴀᴅᴏᴛᴀʀ:

✅ = ᴅɪsᴘᴏɴɪ́ᴠᴇʟ
🔒 = ʙʟᴏǫᴜᴇᴀᴅᴏ (ʟᴇᴠᴇʟ ɪɴsᴜғɪᴄɪᴇɴᴛᴇ)`,
        footer: "ʟᴜᴋᴀᴍᴏᴅᴢᴢ • ʀᴘɢ",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } },
        interactiveButtons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "🐾 ʟᴏᴊᴀ ᴅᴇ ᴘᴇᴛs",
              sections: sections
            })
          }
        ]
      }, {
        quoted: createStatusQuoted(msg)
      });

    } catch (error) {
      console.error("❌ Erro lojapets:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴀᴄᴇssᴀʀ ᴀ ʟᴏᴊᴀ ᴅᴇ ᴘᴇᴛs!*\n\n📌 ${error.message}`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "RPG",
  "menuSection": "Pets",
  "description": "Uso: .lojapets [comprar nome]",
  "usage": "lojapets [comprar nome]"
});
