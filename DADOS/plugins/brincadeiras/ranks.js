// Ranks de brincadeira inspirados no sistema genérico da Tokito.
const { createStatusQuoted } = require("../../functions/statusCard");

const configs = [
  { name: "rankbeta", aliases: ["rankbetas"], emoji: "🤓", title: "ʀᴀɴᴋ ʙᴇᴛᴀ" },
  { name: "rankfalido", aliases: ["rankfalidos"], emoji: "💸", title: "ʀᴀɴᴋ ғᴀʟɪᴅᴏ" },
  { name: "rankgado", aliases: ["rankgados"], emoji: "🐄", title: "ʀᴀɴᴋ ɢᴀᴅᴏ" },
  { name: "ranklouca", aliases: ["rankloucas"], emoji: "🤪", title: "ʀᴀɴᴋ ʟᴏᴜᴄᴀ" },
  { name: "ranklouco", aliases: ["rankloucos"], emoji: "🤪", title: "ʀᴀɴᴋ ʟᴏᴜᴄᴏ" },
  { name: "rankotaku", aliases: ["rankotakus"], emoji: "🍥", title: "ʀᴀɴᴋ ᴏᴛᴀᴋᴜ" },
  { name: "ranksigma", aliases: ["ranksigmas"], emoji: "🗿", title: "ʀᴀɴᴋ sɪɢᴍᴀ" },
  { name: "rankbaiano", aliases: ["rankbaianos"], emoji: "🌵", title: "ʀᴀɴᴋ ʙᴀɪᴀɴᴏ" },
  { name: "rankbaiana", aliases: ["rankbaianas"], emoji: "🌵", title: "ʀᴀɴᴋ ʙᴀɪᴀɴᴀ" },
  { name: "rankcarioca", aliases: ["rankcariocas"], emoji: "🌴", title: "ʀᴀɴᴋ ᴄᴀʀɪᴏᴄᴀ" },
  { name: "rankcorno", aliases: ["rankcornos"], emoji: "🐂", title: "ʀᴀɴᴋ ᴄᴏʀɴᴏ" },
];

function participantJid(participant) {
  if (typeof participant === "string") return participant;
  return participant?.phoneNumber || participant?.id || participant?.jid || participant?.participant || null;
}

function tag(jid) {
  return `@${String(jid || "").split("@")[0].split(":")[0]}`;
}

function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function members(conn, from) {
  const metadata = await conn.groupMetadata(from);
  return [...new Set((metadata?.participants || []).map(participantJid).filter(Boolean))];
}

function createRank(config) {
  return {
    name: config.name,
    aliases: config.aliases || [],
    description: `sorteia o ${config.title.toLowerCase()} entre membros do grupo`,
    menuCategory: "Brincadeiras",
    menuSection: "Ranks",
    usage: config.name,
    permissions: { group: true },

    async execute(conn, msg, args, from) {
      try {
        const list = shuffle(await members(conn, from)).slice(0, 5);
        if (!list.length) {
          return conn.sendMessage(from, { text: "❌ Não encontrei membros para montar o ranking." }, { quoted: msg });
        }

        const items = list
          .map((jid) => ({ jid, value: Math.floor(Math.random() * 101) }))
          .sort((a, b) => b.value - a.value);

        const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
        const lines = items.map((item, index) =>
          `${medals[index]} *${item.value}%* — ${tag(item.jid)}`
        );

        return conn.sendMessage(from, {
          text:
            `${config.emoji} *${config.title}*\n\n` +
            `${lines.join("\n\n")}\n\n` +
            `> Ranking aleatório de brincadeira; os valores não representam características reais das pessoas.`,
          mentions: items.map((item) => item.jid),
        }, { quoted: createStatusQuoted(msg) });
      } catch (error) {
        console.error(`[${config.name}]`, error);
        return conn.sendMessage(from, { text: "❌ Não foi possível gerar esse ranking." }, { quoted: msg });
      }
    },
  };
}

const casal = {
  name: "rankcasal",
  aliases: ["rankcasalzin", "rankcasais"],
  description: "sorteia pares e compatibilidades de brincadeira no grupo",
  menuCategory: "Brincadeiras",
  menuSection: "Ranks",
  usage: "rankcasal",
  permissions: { group: true },

  async execute(conn, msg, args, from) {
    try {
      const list = shuffle(await members(conn, from));
      if (list.length < 2) {
        return conn.sendMessage(from, { text: "❌ São necessários pelo menos dois membros." }, { quoted: msg });
      }

      const count = Math.min(5, Math.floor(list.length / 2));
      const pairs = [];
      for (let i = 0; i < count; i++) {
        const a = list[i * 2];
        const b = list[i * 2 + 1];
        if (!a || !b) continue;
        pairs.push({ a, b, value: Math.floor(Math.random() * 101) });
      }
      pairs.sort((a, b) => b.value - a.value);

      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];
      const lines = pairs.map((pair, index) =>
        `${medals[index]} *${pair.value}%*\n   💞 ${tag(pair.a)} + ${tag(pair.b)}`
      );

      return conn.sendMessage(from, {
        text:
          `💞 *ʀᴀɴᴋ ᴅᴇ ᴄᴀsᴀɪs*\n\n` +
          `${lines.join("\n\n")}\n\n` +
          `> Compatibilidade gerada aleatoriamente só por brincadeira.`,
        mentions: pairs.flatMap((pair) => [pair.a, pair.b]),
      }, { quoted: createStatusQuoted(msg) });
    } catch (error) {
      console.error("[RANKCASAL]", error);
      return conn.sendMessage(from, { text: "❌ Não foi possível gerar o rank de casais." }, { quoted: msg });
    }
  },
};

module.exports = [...configs.map(createRank), casal];
module.exports._internals = { configs, shuffle, participantJid };
