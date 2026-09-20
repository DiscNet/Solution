// Menu: Utilidades - Perfil | Comando: perfil
const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../config/config");
const { getMessageProfilePicture } = require("../../functions/profilePicture");
const { generateProfileCardV2 } = require("../../functions/profileCardV2");
const contactNameCache = require("../../functions/contactNameCache");
const { sameIdentity } = require("../../functions/permissions");

function senderCandidates(msg, from) {
  const key = msg?.key || {};
  return [...new Set([
    key.participantAlt,
    key.participant,
    !String(from).endsWith("@g.us") ? key.remoteJidAlt : null,
    !String(from).endsWith("@g.us") ? key.remoteJid : null,
  ].filter(Boolean))];
}

function participantValues(participant) {
  return [
    participant?.phoneNumber,
    participant?.id,
    participant?.jid,
    participant?.lid,
  ].filter(Boolean);
}

function findParticipant(metadata, candidates) {
  return (metadata?.participants || []).find(participant =>
    participantValues(participant).some(value =>
      candidates.some(candidate => sameIdentity(value, candidate))
    )
  ) || null;
}

function cleanName(value) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 60);
}

function gamertagFromName(name, fallback = "whatsapp") {
  const clean = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "")
    .slice(0, 38);
  return clean || String(fallback || "whatsapp").slice(0, 38);
}

async function resolveDisplayName(conn, msg, metadata, candidates) {
  contactNameCache.rememberMessage(msg);

  const direct = cleanName(msg?.pushName || msg?.pushname || msg?.notify);
  if (direct) {
    contactNameCache.remember(candidates, direct);
    return direct;
  }

  const cached = cleanName(contactNameCache.get(candidates));
  if (cached) return cached;

  const participant = findParticipant(metadata, candidates);
  const fromMetadata = cleanName(
    participant?.pushName ||
    participant?.pushname ||
    participant?.notify ||
    participant?.name
  );
  if (fromMetadata) {
    contactNameCache.remember([...candidates, ...participantValues(participant)], fromMetadata);
    return fromMetadata;
  }

  if (typeof conn?.contactFetchWait === "function") {
    for (const jid of candidates) {
      try {
        const contact = await conn.contactFetchWait(jid);
        contactNameCache.rememberContact(contact);
        const name = cleanName(
          contact?.pushName ||
          contact?.pushname ||
          contact?.notify ||
          contact?.name ||
          contact?.verifiedName
        );
        if (name) {
          contactNameCache.remember(candidates, name);
          return name;
        }
      } catch {}
    }
  }

  return "Usuário";
}

async function resolveBio(conn, candidates) {
  for (const jid of candidates) {
    if (typeof conn?.fetchStatus === "function") {
      try {
        const result = await conn.fetchStatus(jid);
        const status = cleanName(result?.status || result?.about);
        if (status) return status;
      } catch {}
    }

    if (typeof conn?.contactQuery === "function") {
      try {
        const result = await conn.contactQuery(jid);
        const status = cleanName(result?.status || result?.about);
        if (status) return status;
      } catch {}
    }
  }
  return "Sem recado público disponível.";
}

module.exports = {
  name: "perfil",
  aliases: ["profile", "meuperfil"],
  description: "mostra as informações do seu perfil",
  menuCategory: "Utilidades",
  menuSection: "Perfil",

  async execute(conn, msg, args, from) {
    const bot = config.botName || "LukaModzz";
    const isGroup = String(from || "").endsWith("@g.us");
    let metadata = null;

    try {
      const candidates = senderCandidates(msg, from);
      if (!candidates.length) {
        return conn.sendMessage(from, {
          text: "❌ ɴᴀ̃ᴏ ғᴏɪ ᴘᴏssɪ́ᴠᴇʟ ɪᴅᴇɴᴛɪғɪᴄᴀʀ ᴏ ᴜsᴜᴀ́ʀɪᴏ.",
        }, { quoted: msg });
      }

      if (isGroup) {
        try {
          metadata = await conn.groupMetadata(from);
          const participant = findParticipant(metadata, candidates);
          if (participant) {
            for (const value of participantValues(participant)) {
              if (!candidates.some(candidate => sameIdentity(candidate, value))) {
                candidates.push(value);
              }
            }
          }
        } catch (error) {
          console.log("⚠️ Perfil: falha ao obter metadados do grupo:", error.message);
        }
      }

      const pushName = await resolveDisplayName(conn, msg, metadata, candidates);
      const participant = findParticipant(metadata, candidates);
      const cargo = participant?.admin === "superadmin"
        ? "CRIADOR"
        : participant?.admin
          ? "ADMIN"
          : "MEMBRO";
      const isVip = participant?.admin === "superadmin";
      const groupName = isGroup
        ? cleanName(metadata?.subject || "Grupo")
        : "Privado";

      const bio = await resolveBio(conn, candidates);

      const profilePicture = await getMessageProfilePicture(
        conn,
        msg,
        from,
        candidates,
        { fallback: null }
      );

      const primaryIdentity =
        candidates.find(jid => String(jid).endsWith("@s.whatsapp.net")) ||
        candidates[0] ||
        "";
      const userNumber = String(primaryIdentity).split("@")[0].split(":")[0].replace(/\D/g, "");
      const gamertag = gamertagFromName(pushName, userNumber || "whatsapp");

      const statusParts = [cargo];
      if (isVip) statusParts.push("VIP");
      if (isGroup && groupName) statusParts.push(groupName);
      const status = statusParts.join(" • ").slice(0, 42);

      await conn.sendMessage(from, { react: { text: "👤", key: msg.key } });

      const imageBuffer = await generateProfileCardV2({
        avatarUrl: profilePicture?.url || "",
        name: pushName,
        gamertag,
        status,
        bio,
      });

      const caption =
        "*👤 | ᴘᴇʀғɪʟ*\n\n" +
        "• ᴜsᴜᴀ́ʀɪᴏ: *" + pushName + "*\n" +
        (userNumber ? "• ɴᴜ́ᴍᴇʀᴏ: *" + userNumber + "*\n" : "") +
        "• ᴄᴀʀɢᴏ: *" + cargo + "*\n" +
        "• ɢʀᴜᴘᴏ: *" + groupName + "*\n" +
        "• ʙɪᴏ: " + bio;

      await conn.sendMessage(from, {
        image: imageBuffer,
        mimetype: "image/png",
        caption,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: bot,
            serverMessageId: 116,
          },
        },
      }, {
        quoted: createStatusQuoted(msg),
      });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (error) {
      console.error("❌ Erro perfil Card 2.0:", error);
      await conn.sendMessage(from, {
        text:
          "❌ *ᴇʀʀᴏ ᴀᴏ ɢᴇʀᴀʀ ᴘᴇʀғɪʟ!*\n\n" +
          "📌 " + (error?.message || "Erro desconhecido."),
      }, { quoted: msg }).catch(() => {});
    }
  },

  _internals: {
    senderCandidates,
    participantValues,
    findParticipant,
    cleanName,
    gamertagFromName,
    resolveDisplayName,
    resolveBio,
  },
};
