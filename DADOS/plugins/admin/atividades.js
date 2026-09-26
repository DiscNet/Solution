// Menu: Grupos - Estatísticas | Comandos: atividades, inativos
const activity = require("../../functions/activitySystem");
const { createStatusQuoted } = require("../../functions/statusCard");

function keys(participant) {
  return [...new Set([
    participant?.phoneNumber,
    participant?.id,
    participant?.jid,
    participant?.participant,
    typeof participant === "string" ? participant : null,
  ].filter(Boolean).map(String))];
}

function tag(jid) {
  return `@${String(jid || "").split("@")[0].split(":")[0]}`;
}

async function rows(conn, from) {
  const metadata = await conn.groupMetadata(from);
  return (metadata?.participants || []).map((participant) => {
    const ids = keys(participant);
    return {
      jid: ids[0] || "",
      ids,
      ...activity.statsFor(from, ids),
    };
  }).filter((item) => item.jid);
}

function block(item) {
  return (
    `👤 *${tag(item.jid)}*\n` +
    `┃ ⚡ Pontos: *${item.pontos}*\n` +
    `┃ 💬 Mensagens: *${item.total}*\n` +
    `┃ 🤖 Comandos: *${item.comandos}*\n` +
    `┃ 🎵 Áudios: *${item.audios}*\n` +
    `┃ 🧩 Figurinhas: *${item.figurinhas}*\n` +
    `┃ 📄 Documentos: *${item.documentos}*\n` +
    `┃ 🖼️ Fotos: *${item.fotos}*\n` +
    `┃ 🎞️ Vídeos: *${item.videos}*\n` +
    `┗ 🕒 Última: *${activity.formatLast(item.ultima)}*`
  );
}

async function sendPages(conn, msg, from, title, list, footer = "") {
  const pages = [];
  for (let i = 0; i < list.length; i += 8) pages.push(list.slice(i, i + 8));
  if (!pages.length) pages.push([]);

  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    const content = page.length
      ? page.map(block).join("\n\n━━━━━━━━━━━━━━━━━━━━\n\n")
      : "Nenhum membro encontrado.";

    await conn.sendMessage(from, {
      text:
        `${title}\n\n${content}\n\n` +
        `📄 Página ${index + 1}/${pages.length}` +
        (footer ? `\n${footer}` : ""),
      mentions: page.map((item) => item.jid),
    }, { quoted: createStatusQuoted(msg) });
  }
}

module.exports = [
  {
    name: "atividades",
    aliases: ["atividadegrupo"],
    description: "mostra a atividade detalhada dos membros do grupo",
    menuCategory: "Grupos",
    menuSection: "Estatísticas",
    usage: "atividades",
    permissions: { group: true, admin: true },
    async execute(conn, msg, args, from) {
      try {
        const list = (await rows(conn, from))
          .sort((a, b) => b.pontos - a.pontos || b.total - a.total || b.ultima - a.ultima)
          .slice(0, 50);
        return sendPages(conn, msg, from, "📊 *ᴀᴛɪᴠɪᴅᴀᴅᴇs ᴅᴏ ɢʀᴜᴘᴏ*", list);
      } catch (error) {
        console.error("[ATIVIDADES]", error);
        return conn.sendMessage(from, { text: "❌ Não foi possível consultar as atividades." }, { quoted: msg });
      }
    },
  },
  {
    name: "inativos",
    aliases: ["rankinativos"],
    description: "lista membros com poucos pontos de atividade",
    menuCategory: "Grupos",
    menuSection: "Estatísticas",
    usage: "inativos [limite]",
    permissions: { group: true, admin: true },
    async execute(conn, msg, args, from) {
      try {
        const limit = Math.max(0, Math.min(100000, Number(String(args?.[0] || "0").replace(/\D/g, "")) || 0));
        const list = (await rows(conn, from))
          .filter((item) => item.pontos <= limit)
          .sort((a, b) => a.pontos - b.pontos || a.total - b.total || a.ultima - b.ultima)
          .slice(0, 50);
        return sendPages(
          conn,
          msg,
          from,
          "💤 *ᴍᴇᴍʙʀᴏs ɪɴᴀᴛɪᴠᴏs*",
          list,
          `Limite: até *${limit}* ponto(s).`
        );
      } catch (error) {
        console.error("[INATIVOS]", error);
        return conn.sendMessage(from, { text: "❌ Não foi possível consultar os membros inativos." }, { quoted: msg });
      }
    },
  },
];

module.exports._internals = { keys, rows, block };
