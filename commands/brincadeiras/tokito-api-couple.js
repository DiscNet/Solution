const tokitoApi = require("../../functions/tokitoApi");
const { createStatusQuoted } = require("../../functions/statusCard");
const { getProfilePicture } = require("../../functions/profilePicture");
const { sameIdentity } = require("../../functions/permissions");

const DEFAULT_PICTURE = "https://raw.githubusercontent.com/dylanModz/uploads/main/midias/imagens/747wlpa89.jpg";

function participantJid(participant) {
  if (typeof participant === "string") return participant;
  return participant?.phoneNumber || participant?.id || participant?.jid || participant?.lid || "";
}

function uniqueMembers(participants = [], botIds = []) {
  const members = [];
  for (const participant of participants) {
    const jid = participantJid(participant);
    if (!jid) continue;
    if (botIds.some(bot => sameIdentity(bot, jid))) continue;
    if (!members.some(current => sameIdentity(current, jid))) members.push(jid);
  }
  return members;
}

async function randomPair(conn, from) {
  const metadata = await conn.groupMetadata(from);
  const members = uniqueMembers(
    metadata?.participants || [],
    [conn?.user?.id, conn?.user?.lid].filter(Boolean)
  );
  if (members.length < 2) return null;

  const first = Math.floor(Math.random() * members.length);
  let second = first;
  while (second === first) second = Math.floor(Math.random() * members.length);
  return [members[first], members[second]];
}

async function picture(conn, jid) {
  const result = await getProfilePicture(conn, [jid], { fallback: DEFAULT_PICTURE });
  return result?.url || DEFAULT_PICTURE;
}

async function generate(conn, msg, from, route, pair, animated = false) {
  const [p1, p2] = pair;
  const porcentagem = Math.floor(Math.random() * 101);
  const [foto1, foto2] = await Promise.all([picture(conn, p1), picture(conn, p2)]);

  const result = await tokitoApi.buffer(route, {
    foto1,
    foto2,
    porcentagem,
  }, {
    timeout: 90000,
    headers: { accept: animated ? "video/*,image/gif,*/*" : "image/*,*/*" },
    maxContentLength: 30 * 1024 * 1024,
    maxBodyLength: 30 * 1024 * 1024,
  });

  if (!result.buffer?.length) throw new Error("A API retornou um card vazio.");

  const caption =
    "💘 *CASAL*\n\n" +
    "💞 @" + p1.split("@")[0] + " + @" + p2.split("@")[0] +
    "\n📊 Compatibilidade: *" + porcentagem + "%*";

  if (animated && /video/i.test(result.contentType)) {
    return conn.sendMessage(from, {
      video: result.buffer,
      mimetype: result.contentType.split(";")[0] || "video/mp4",
      gifPlayback: true,
      caption,
      mentions: [p1, p2],
    }, { quoted: createStatusQuoted(msg) });
  }

  if (/image/i.test(result.contentType)) {
    return conn.sendMessage(from, {
      image: result.buffer,
      caption,
      mentions: [p1, p2],
    }, { quoted: createStatusQuoted(msg) });
  }

  throw new Error("A API retornou um formato de casal não suportado.");
}

function makeCommand({ name, aliases, route, animated }) {
  return {
    name,
    aliases,
    menuCategory: "Brincadeiras",
    menuSection: "Grupo API",
    usage: name,
    description: animated
      ? "Sorteia um casal do grupo e gera o card animado da API"
      : "Sorteia um casal do grupo e gera o card da API",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        const pair = await randomPair(conn, from);
        if (!pair) {
          return conn.sendMessage(from, {
            text: "❌ Preciso de pelo menos 2 membros disponíveis no grupo.",
          }, { quoted: createStatusQuoted(msg) });
        }
        return generate(conn, msg, from, route, pair, animated);
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[API CASAL]", name, info.status || "-", info.message);
        return conn.sendMessage(from, {
          text: tokitoApi.userError(error, "Não foi possível gerar o casal agora."),
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  };
}

module.exports = [
  makeCommand({
    name: "casal",
    aliases: ["casais"],
    route: "/canvas/casal2",
    animated: false,
  }),
  makeCommand({
    name: "casalgif",
    aliases: ["casal2gif"],
    route: "/canvas/casal2-gif",
    animated: true,
  }),
];

module.exports._test = { uniqueMembers, randomPair };
