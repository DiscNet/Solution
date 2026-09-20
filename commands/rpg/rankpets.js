// Menu: RPG - Rankings | Comando: rankpets
const fs = require("fs");
const path = require("path");
const rpgSystem = require("../../functions/rpgSystem");
const { createStatusQuoted } = require("../../functions/statusCard");

const RPG_DB = path.join(__dirname, "..", "..", "database", "rpg.json");
const PET_DB = path.join(__dirname, "..", "..", "database", "rpgPets.json");

function read(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (_) { return fallback; }
}

module.exports = {
  name: "rankpets",
  aliases: ["rankpet", "rankingpets"],
  description: "mostra o ranking dos pets equipados no RPG",
  menuCategory: "RPG",
  menuSection: "Rankings",
  usage: "rankpets",
  permissions: { group: true },

  async execute(conn, msg, args, from) {
    try {
      if (!rpgSystem.isRpgAtivo(from)) {
        return conn.sendMessage(from, { text: "❌ O RPG está desativado neste grupo." }, { quoted: msg });
      }

      const db = read(RPG_DB, { usuarios: {} });
      const catalog = read(PET_DB, { pets: {} }).pets || {};
      const ranking = Object.entries(db.usuarios || {})
        .filter(([, user]) => user?.petEquipado && catalog[user.petEquipado])
        .map(([jid, user]) => {
          const pet = catalog[user.petEquipado];
          const score =
            Number(pet.level || 1) * 100 +
            Number(pet.vida || 0) +
            Number(pet.dano || 0) * 3 +
            Number(pet.defesa || 0) * 2 +
            Number(pet.agilidade || 0);
          return { jid, user, pet, name: user.petEquipado, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      if (!ranking.length) {
        return conn.sendMessage(from, { text: "🐾 Ainda não há pets equipados para o ranking." }, { quoted: msg });
      }

      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      const lines = ranking.map((item, index) =>
        `${medals[index]} @${item.jid.split("@")[0]} — ${item.pet.emoji || "🐾"} *${item.name}*\n` +
        `   Lv.${item.pet.level || 1} • poder ${item.score}`
      );

      return conn.sendMessage(from, {
        text: `🐾 *ʀᴀɴᴋɪɴɢ ᴅᴇ ᴘᴇᴛs*\n\n${lines.join("\n\n")}`,
        mentions: ranking.map((item) => item.jid),
      }, { quoted: createStatusQuoted(msg) });
    } catch (error) {
      console.error("[RANKPETS]", error);
      return conn.sendMessage(from, { text: "❌ Não foi possível gerar o ranking de pets." }, { quoted: msg });
    }
  },
};
