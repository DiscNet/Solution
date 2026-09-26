const sharp = require("sharp");
const config = require("../../config/config");
const { generateWelcomeCard } = require("./welcomeCard");
const tokitoApi = require("./apiClient");
const contactNameCache = require("./contactNameCache");

function normalizeJid(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes("@")) return raw;
  if (/^\d+$/.test(raw)) return raw + "@s.whatsapp.net";
  return raw;
}

function getParticipantJid(participant) {
  if (typeof participant === "string") return normalizeJid(participant);
  if (!participant || typeof participant !== "object") return "";
  return normalizeJid(
    participant.phoneNumber ||
    participant.id ||
    participant.jid ||
    participant.lid ||
    ""
  );
}

function jidNumber(jid) {
  return String(jid || "").split("@")[0] || "usuario";
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function initials(value, fallback = "?") {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return fallback;
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

async function createFallbackBackground(groupName) {
  const label = initials(groupName, "GR");
  const svg = Buffer.from(
    '<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#090d18"/><stop offset="55%" stop-color="#111827"/>' +
        '<stop offset="100%" stop-color="#1d2640"/></linearGradient>' +
      '</defs>' +
      '<rect width="1080" height="1080" fill="url(#bg)"/>' +
      '<circle cx="540" cy="430" r="185" fill="#ffffff" fill-opacity="0.06"/>' +
      '<text x="540" y="470" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif" ' +
        'font-size="138" font-weight="700" fill="#ffffff">' + escapeXml(label) + '</text>' +
    '</svg>'
  );
  return sharp(svg).png().toBuffer();
}

async function createFallbackAvatar(displayName) {
  const label = initials(displayName, "NM");
  const svg = Buffer.from(
    '<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="avatar" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0%" stop-color="#2563eb"/><stop offset="100%" stop-color="#7c3aed"/>' +
      '</linearGradient></defs>' +
      '<rect width="512" height="512" rx="256" fill="url(#avatar)"/>' +
      '<text x="256" y="290" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif" ' +
        'font-size="150" font-weight="700" fill="#ffffff">' + escapeXml(label) + '</text>' +
    '</svg>'
  );
  return sharp(svg).png().toBuffer();
}

function participantCandidates(participant) {
  const values = [];
  if (typeof participant === "string") values.push(participant);
  if (participant && typeof participant === "object") {
    values.push(participant.phoneNumber, participant.id, participant.jid, participant.lid);
  }
  return [...new Set(values.map(normalizeJid).filter(Boolean))];
}

async function findProfilePictureUrl(conn, candidates) {
  if (!conn || typeof conn.profilePictureUrl !== "function") return "";
  for (const jid of candidates) {
    try {
      const url = await conn.profilePictureUrl(jid, "image");
      if (url) return url;
    } catch {}
  }
  return "";
}

function findMetadataParticipant(metadata, candidates) {
  const set = new Set(candidates);
  return (metadata?.participants || []).find(item => {
    const values = [
      item?.id,
      item?.jid,
      item?.phoneNumber,
      item?.lid,
    ].map(normalizeJid).filter(Boolean);
    return values.some(value => set.has(value));
  }) || null;
}

function cleanPushName(value) {
  const name = String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 80);

  if (!name) return "";

  // Nunca deixa número/JID virar o "nome" visual do banner.
  const compact = name.replace(/[\s()+\-.]/g, "");
  if (/^\d{6,}$/.test(compact)) return "";
  if (/^\d+@(s\.whatsapp\.net|lid|g\.us)$/i.test(name)) return "";

  return name;
}

async function resolveDisplayName(conn, participant, metadata, candidates, groupJid = "") {
  const cachedName = cleanPushName(contactNameCache.get(candidates));
  if (cachedName) {
    contactNameCache.remember(candidates, cachedName);
    return cachedName;
  }

  // Dependendo do evento/versão do Baileys, o push name pode aparecer como
  // pushName, pushname ou notify. "notify" é uma das formas mais comuns
  // retornadas pelos dados de contato.
  if (participant && typeof participant === "object") {
    const directPushName = cleanPushName(
      participant.pushName ||
      participant.pushname ||
      participant.notify ||
      participant.name
    );
    if (directPushName) {
      contactNameCache.remember(candidates, directPushName);
      return directPushName;
    }
  }

  const item = findMetadataParticipant(metadata, candidates);
  const metadataPushName = cleanPushName(
    item?.pushName ||
    item?.pushname ||
    item?.notify ||
    item?.name
  );
  if (metadataPushName) {
    contactNameCache.remember(candidates, metadataPushName);
    return metadataPushName;
  }

  if (conn && typeof conn.contactFetchWait === "function") {
    for (const jid of candidates) {
      try {
        const contact = await conn.contactFetchWait(jid);
        contactNameCache.rememberContact(contact);
        const contactPushName = cleanPushName(
          contact?.pushName ||
          contact?.pushname ||
          contact?.notify ||
          contact?.name ||
          contact?.verifiedName ||
          contactNameCache.get(candidates)
        );
        if (contactPushName) {
          contactNameCache.remember(candidates, contactPushName);
          return contactPushName;
        }
      } catch {}
    }
  }

  // Algumas implementações/wrappers do socket oferecem getName().
  // Só aceita o retorno se ele for de fato um nome e não um número/JID.
  if (conn && typeof conn.getName === "function") {
    for (const jid of candidates) {
      try {
        const socketName = cleanPushName(await conn.getName(jid));
        if (socketName) {
          contactNameCache.remember(candidates, socketName);
          return socketName;
        }
      } catch {}
    }
  }

  // Eventos de contato podem chegar alguns instantes depois do evento
  // group-participants.update. Dá uma pequena janela para o cache receber o pushName.
  const delayedName = cleanPushName(await contactNameCache.waitFor(candidates, 5000, 250));
  if (delayedName) {
    contactNameCache.remember(candidates, delayedName);
    return delayedName;
  }

  // Depois da espera, tenta novamente porque contacts.update/metadata podem
  // chegar logo após group-participants.update.
  if (conn && typeof conn.contactFetchWait === "function") {
    for (const jid of candidates) {
      try {
        const contact = await conn.contactFetchWait(jid);
        contactNameCache.rememberContact(contact);
        const retriedContactName = cleanPushName(
          contact?.pushName ||
          contact?.pushname ||
          contact?.notify ||
          contact?.name ||
          contact?.verifiedName ||
          contactNameCache.get(candidates)
        );
        if (retriedContactName) {
          contactNameCache.remember(candidates, retriedContactName);
          return retriedContactName;
        }
      } catch {}
    }
  }

  if (groupJid && conn && typeof conn.groupMetadata === "function") {
    try {
      const refreshedMetadata = await conn.groupMetadata(groupJid);
      const refreshedItem = findMetadataParticipant(refreshedMetadata, candidates);
      const refreshedName = cleanPushName(
        refreshedItem?.pushName ||
        refreshedItem?.pushname ||
        refreshedItem?.notify ||
        refreshedItem?.name
      );
      if (refreshedName) {
        contactNameCache.remember(
          [
            refreshedItem?.id,
            refreshedItem?.jid,
            refreshedItem?.lid,
            refreshedItem?.phoneNumber,
          ],
          refreshedName
        );
        return refreshedName;
      }
    } catch {}
  }

  // Não mostra telefone no banner caso o WhatsApp realmente não entregue um nome.
  return "Novo membro";
}

async function createGroupWelcomeBanner(conn, options = {}) {
  const groupJid = normalizeJid(options.groupJid);
  const participant = options.participant;
  if (!groupJid) throw new Error("groupJid não informado.");

  let candidates = participantCandidates(participant);
  if (!candidates.length) throw new Error("Participante inválido.");

  let metadata = options.groupMetadata || null;
  if (!metadata) {
    if (!conn || typeof conn.groupMetadata !== "function") {
      throw new Error("Não foi possível obter os dados do grupo.");
    }
    metadata = await conn.groupMetadata(groupJid);
  }

  // O evento pode chegar com apenas LID ou apenas phoneNumber. Une as
  // identidades encontradas no metadata para localizar o mesmo nome no cache.
  const metadataParticipant = findMetadataParticipant(metadata, candidates);
  if (metadataParticipant) {
    candidates = [...new Set([
      ...candidates,
      ...participantCandidates(metadataParticipant),
    ])];
  }

  const groupName = String(options.groupName || metadata?.subject || "Grupo")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 120) || "Grupo";
  const explicitName = cleanPushName(options.displayName);
  const resolvedPushName = explicitName || await resolveDisplayName(
    conn,
    participant,
    metadata,
    candidates,
    groupJid
  );
  const displayName = cleanPushName(resolvedPushName) || "Novo membro";

  const [backgroundUrl, mainImageUrl] = await Promise.all([
    findProfilePictureUrl(conn, [groupJid]),
    findProfilePictureUrl(conn, candidates),
  ]);

  const [backgroundBuffer, mainImageBuffer] = await Promise.all([
    createFallbackBackground(groupName),
    createFallbackAvatar(displayName),
  ]);

  let image = null;

  if (backgroundUrl && mainImageUrl) {
    try {
      const apiCard = await tokitoApi.buffer("/canvas/welcome", {
        fundo: backgroundUrl,
        avatar: mainImageUrl,
        titulo: options.text1 || "Bem-vindo(a)!",
        sub: options.text2 || (displayName + " • " + groupName),
      }, { timeout: 90000 });
      if (apiCard.buffer?.length) image = apiCard.buffer;
    } catch (error) {
      console.log("⚠️ Welcome: API indisponível, usando renderer local:", error.message);
    }
  }

  if (!image) {
    image = await generateWelcomeCard({
      backgroundUrl,
      backgroundBuffer,
      mainImageUrl,
      mainImageBuffer,
      text1: options.text1 || "SEJA BEM-VINDO(A)!",
      text2: options.text2 || displayName,
      text3: options.text3 || groupName,
    }, {
      neon: options.neon,
    });
  }

  return {
    image,
    groupName,
    displayName,
    participantJid: candidates[0],
    metadata,
  };
}

function createWelcomeQuoted(groupName) {
  return {
    key: {
      remoteJid: "status@broadcast",
      fromMe: false,
      participant: "13135550002@s.whatsapp.net",
    },
    message: {
      contactMessage: {
        displayName: groupName,
        vcard:
          "BEGIN:VCARD\n" +
          "VERSION:3.0\n" +
          "FN:" + groupName + "\n" +
          "ORG:" + String(config.botName || "Bot").replace(/[\r\n;:]/g, " ") + ";\n" +
          "TEL;type=CELL;type=VOICE;waid=13135550002:556384673123\n" +
          "END:VCARD",
      },
    },
  };
}

async function sendGroupWelcomeBanner(conn, options = {}) {
  if (!conn || typeof conn.sendMessage !== "function") {
    throw new Error("Conexão do WhatsApp inválida.");
  }

  const result = await createGroupWelcomeBanner(conn, options);
  const userNumber = jidNumber(result.participantJid);
  const caption = options.caption ||
    "*⎾🧊⏌ sᴇᴊᴀ ʙᴇᴍ ᴠɪɴᴅᴏ @" + userNumber + "!*\n\n" +
    " • ᴘᴏʀ ғᴀᴠᴏʀ ʟᴇɪᴀ ᴀ ᴅᴇsᴄʀɪᴄ̧ᴀ̃ᴏ\n" +
    "ᴇ sɪɢᴀ ᴀs ʀᴇɢʀᴀs\n\n" +
    "> 『🧊』ᴀᴘʀᴏᴠᴇɪᴛᴇ!";

  return conn.sendMessage(options.groupJid, {
    image: result.image,
    mimetype: "image/png",
    caption,
    mentions: [result.participantJid],
    contextInfo: {
      forwardingScore: 1,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363426698503859@newsletter",
        newsletterName: options.botName || config.botName || "Bot",
        serverMessageId: 116,
      },
    },
  }, {
    quoted: options.quoted || createWelcomeQuoted(result.groupName),
  });
}

module.exports = {
  normalizeJid,
  getParticipantJid,
  createGroupWelcomeBanner,
  sendGroupWelcomeBanner,
  _internals: {
    jidNumber,
    cleanPushName,
    initials,
    createFallbackBackground,
    createFallbackAvatar,
    participantCandidates,
    resolveDisplayName,
  },
};
