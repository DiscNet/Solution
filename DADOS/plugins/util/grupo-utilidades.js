// Menu: Utilidades - Grupo
const kit = require("../../functions/utilityKit");
const { createStatusQuoted, forwardedNewsletterContext } = require("../../functions/statusCard");

function participantJid(participant) {
  return participant?.phoneNumber || participant?.id || participant?.jid || participant?.lid || null;
}

function identity(value) {
  return String(value || "").split(":")[0].split("@")[0].replace(/\D/g, "");
}

function displayJid(jid) {
  const bare = identity(jid);
  return bare ? `@${bare}` : String(jid || "usuário");
}

function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function groupMembers(conn, from) {
  if (!String(from || "").endsWith("@g.us")) {
    throw kit.userError("Este comando só funciona em grupos.");
  }

  const metadata = await conn.groupMetadata(from);
  const botIds = [conn?.user?.id, conn?.user?.lid].map(identity).filter(Boolean);
  return (metadata?.participants || [])
    .map(participantJid)
    .filter(Boolean)
    .filter((jid) => !botIds.includes(identity(jid)));
}

const commands = [
  kit.makeCommand({
    name: "sortearmembro",
    aliases: ["sorteiarmembro", "sortearpessoa"],
    section: "Grupo",
    usage: "sortearmembro",
    description: "Sorteia uma pessoa do grupo e marca o escolhido",
    async execute(conn, msg, args, from) {
      try {
        const members = await groupMembers(conn, from);
        if (!members.length) throw kit.userError("Não encontrei participantes para sortear.");
        const chosen = members[Math.floor(Math.random() * members.length)];
        await conn.sendMessage(from, {
          text: `🎲 *SORTEIO DO GRUPO*\n\n🏆 Escolhido: ${displayJid(chosen)}`,
          mentions: [chosen],
          contextInfo: {
            ...forwardedNewsletterContext(),
            mentionedJid: [chosen],
          },
        }, { quoted: createStatusQuoted(msg) });
      } catch (e) {
        await kit.fail(conn, msg, from, e, "Não foi possível sortear um membro.");
      }
    },
  }),

  kit.makeCommand({
    name: "times",
    aliases: ["dividirtimes", "fazertimes"],
    section: "Grupo",
    usage: "times <2-8>",
    description: "Divide aleatoriamente os membros do grupo em times",
    async execute(conn, msg, args, from) {
      try {
        const amount = Number(args[0]);
        if (!Number.isInteger(amount) || amount < 2 || amount > 8) {
          throw kit.userError("Use de 2 a 8 times. Ex.: .times 2");
        }

        const members = await groupMembers(conn, from);
        if (members.length < amount) throw kit.userError("Há menos participantes do que times pedidos.");
        if (members.length > 100) throw kit.userError("Por segurança, este comando aceita grupos com até 100 participantes.");

        const teams = Array.from({ length: amount }, () => []);
        shuffle(members).forEach((jid, index) => teams[index % amount].push(jid));

        const text = teams.map((team, index) => {
          const people = team.map((jid) => `• ${displayJid(jid)}`).join("\n");
          return `👥 *TIME ${index + 1}*\n${people}`;
        }).join("\n\n");

        await conn.sendMessage(from, {
          text: `🎯 *TIMES SORTEADOS*\n\n${text}`,
          mentions: members,
          contextInfo: {
            ...forwardedNewsletterContext(),
            mentionedJid: members,
          },
        }, { quoted: createStatusQuoted(msg) });
      } catch (e) {
        await kit.fail(conn, msg, from, e, "Não foi possível montar os times.");
      }
    },
  }),

  kit.makeCommand({
    name: "contartexto",
    aliases: ["contarpalavras", "textoinfo"],
    section: "Texto",
    usage: "contartexto [texto]",
    description: "Conta caracteres, palavras e linhas de um texto",
    async execute(conn, msg, args, from) {
      try {
        const text = kit.inputText(msg, args);
        if (!text) throw kit.userError("Informe um texto ou responda a uma mensagem.");
        const words = text.trim().match(/\S+/g)?.length || 0;
        const lines = text.split(/\r?\n/).length;
        const chars = text.length;
        const charsNoSpaces = text.replace(/\s/g, "").length;

        await kit.reply(conn, msg, from,
          `📝 *INFORMAÇÕES DO TEXTO*\n\n` +
          `• Palavras: *${words}*\n` +
          `• Caracteres: *${chars}*\n` +
          `• Sem espaços: *${charsNoSpaces}*\n` +
          `• Linhas: *${lines}*`);
      } catch (e) {
        await kit.fail(conn, msg, from, e, "Não foi possível analisar o texto.");
      }
    },
  }),
];

module.exports = commands;
