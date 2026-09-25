// Menu: Utilidades - Perfil | Comando: perfil
const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../config/config");
const { getMessageProfilePicture } = require("../../functions/profilePicture");
const {
  generateProfileCardV2,
  generateProfileCardPreview,
  fetchImageBuffer,
} = require("../../functions/profileCardV2");
const contactNameCache = require("../../functions/contactNameCache");
const { sameIdentity } = require("../../functions/permissions");
const tokitoApi = require("../../functions/tokitoApi");

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

function phone(jid) {
  return String(jid || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}

function parseStatus(value) {
  return String(
    value?.status?.status ||
    value?.status ||
    value?.[0]?.status?.status ||
    value?.[0]?.status ||
    ""
  ).trim();
}

// Mesma lógica do comando getbio em tokito-extras.js.
async function fetchBio(conn, candidates = []) {
  for (const jid of [...new Set(candidates.filter(Boolean))]) {
    try {
      if (typeof conn.fetchStatus === "function") {
        const result = await conn.fetchStatus(jid);
        const text = parseStatus(result);
        if (text) return { text, jid };
      }
    } catch {}

    try {
      if (typeof conn.getStatus === "function") {
        const result = await conn.getStatus(jid);
        const text = parseStatus(result);
        if (text) return { text, jid };
      }
    } catch {}
  }

  return null;
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
    contactNameCache.remember(
      [...candidates, ...participantValues(participant)],
      fromMetadata
    );
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

function resolveCargo(participant) {
  return participant?.admin ? "Admin" : "Membro";
}

async function resolveAvatarData(conn, msg, from, candidates) {
  const profilePicture = await getMessageProfilePicture(
    conn,
    msg,
    from,
    candidates,
    { fallback: null }
  );

  if (!profilePicture?.url) return { url: "", buffer: null };

  try {
    return {
      url: profilePicture.url,
      buffer: await fetchImageBuffer(profilePicture.url),
    };
  } catch (error) {
    console.log("⚠️ Perfil: não foi possível baixar a foto de perfil:", error.message);
    return { url: profilePicture.url, buffer: null };
  }
}

module.exports = {
  name: "perfil",
  aliases: ["profile", "meuperfil"],
  description: "mostra as informações do seu perfil",
  menuCategory: "Utilidades",
  menuSection: "Perfil",

  async execute(conn, msg, args, from) {
    const bot = config.botName || "LukaModzz";
    const prefix = config.prefix || ".";
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

      const participant = findParticipant(metadata, candidates);
      const pushName = await resolveDisplayName(conn, msg, metadata, candidates);
      const cargo = resolveCargo(participant);
      const groupName = isGroup
        ? cleanName(metadata?.subject || "Grupo")
        : "PV";

      const bioResult = await fetchBio(conn, candidates);
      const bio = cleanName(bioResult?.text) || "privado, ou sem recado!!";

      const primaryIdentity =
        candidates.find(jid => String(jid).endsWith("@s.whatsapp.net")) ||
        candidates.find(jid => /\d+@/.test(String(jid))) ||
        candidates[0] ||
        "";

      const userNumber = phone(primaryIdentity);
      const gamertag = gamertagFromName(pushName, userNumber || "whatsapp");
      const avatar = await resolveAvatarData(conn, msg, from, candidates);

      const gadoPercent = Math.floor(Math.random() * 101);
      const gostosuraPercent = Math.floor(Math.random() * 101);
      const gayPercent = Math.floor(Math.random() * 101);
      const putariaPercent = Math.floor(Math.random() * 101);
      const dinheiro = Math.floor(Math.random() * 10000) + 100;

      await conn.sendMessage(from, {
        react: { text: "👤", key: msg.key },
      }).catch(() => {});

      let imageBuffer;

      if (avatar.url) {
        try {
          const apiCard = await tokitoApi.buffer("/canvas/perfil", {
            fundo: avatar.url,
            text: pushName,
            subtext: config.botName || "Bot",
            logo: avatar.url,
            cargo,
            bio,
          }, { timeout: 90000 });
          if (apiCard.buffer?.length) imageBuffer = apiCard.buffer;
        } catch (error) {
          console.log("⚠️ Perfil: API indisponível, usando card local:", error.message);
        }
      }

      if (!imageBuffer) {
        imageBuffer = await generateProfileCardV2({
          avatarBuffer: avatar.buffer,
          name: pushName,
          gamertag,
          status: (cargo + (isGroup ? " • " + groupName : "")).slice(0, 42),
          bio,
        });
      }

      const preview = await generateProfileCardPreview(imageBuffer);

      const caption =
        "*👤 | ᴘᴇʀғɪʟ ᴅᴏ ᴜsᴜᴀʀɪᴏ*\n\n" +
        "- *👤 | ᴜsᴜᴀ́ʀɪᴏ* → *@" + pushName + "*\n" +
        "- *📱 | ɴᴜᴍᴇʀᴏ → " + (userNumber || "indisponível") + "*\n" +
        "- *🗒️ | ʙɪᴏ → " + bio + "*\n" +
        "- *🧰 | ᴄᴀʀɢᴏ → " + cargo + "*\n" +
        "- *🏘️ | ɢʀᴜᴘᴏ → " + groupName + "*\n" +
        "- *🐂 | ɴɪᴠᴇʟ ɢᴀᴅᴏ → " + gadoPercent + "%*\n" +
        "- *😋 | ɢᴏsᴛᴏsᴜʀᴀ → " + gostosuraPercent + "%*\n" +
        "- *🏳️‍🌈 | ɢᴀʏ → " + gayPercent + "%*\n" +
        "- *🔞 | ᴘᴜᴛᴀʀɪᴀ → " + putariaPercent + "%*\n" +
        "- *💰 | ᴘʀᴏɢʀᴀᴍᴀ → R$" + dinheiro.toLocaleString("pt-BR") + "*\n\n" +
        "> 🌫️ | ᴜᴛɪʟɪᴢᴇ " + prefix + "menu ᴘᴀʀᴀ ʀᴇᴄᴇʙᴇʀ ᴀ ʟɪsᴛᴀ ᴅᴇ ᴄᴏᴍᴀɴᴅᴏs";

      await conn.sendMessage(from, {
        image: imageBuffer,
        mimetype: "image/png",
        jpegThumbnail: preview.base64,
        width: 1680,
        height: 900,
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

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
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
    phone,
    parseStatus,
    fetchBio,
    resolveDisplayName,
    resolveCargo,
    resolveAvatarData,
  },
};
