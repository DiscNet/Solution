const sharp = require("sharp");
const { generateWelcomeCard } = require("./welcomeCard");

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

async function resolveDisplayName(conn, participant, metadata, candidates) {
  const direct = participant && typeof participant === "object"
    ? participant.notify || participant.name || participant.pushName
    : "";
  if (direct) return String(direct).trim();

  const item = findMetadataParticipant(metadata, candidates);
  const fromMetadata = item?.notify || item?.name || item?.pushName;
  if (fromMetadata) return String(fromMetadata).trim();

  if (typeof conn.contactFetchWait === "function") {
    for (const jid of candidates) {
      try {
        const contact = await conn.contactFetchWait(jid);
        const name =
          contact?.notify ||
          contact?.name ||
          contact?.verifiedName ||
          contact?.pushName;
        if (name) return String(name).trim();
      } catch {}
    }
  }

  return jidNumber(candidates[0]) || "Novo membro";
}

async function createGroupWelcomeBanner(conn, options = {}) {
  const groupJid = normalizeJid(options.groupJid);
  const participant = options.participant;
  if (!groupJid) throw new Error("groupJid não informado.");

  const candidates = participantCandidates(participant);
  if (!candidates.length) throw new Error("Participante inválido.");

  const metadata = options.groupMetadata || await conn.groupMetadata(groupJid);
  const groupName = String(options.groupName || metadata?.subject || "Grupo").trim();
  const displayName = String(
    options.displayName ||
    await resolveDisplayName(conn, participant, metadata, candidates)
  ).trim();

  const [backgroundUrl, mainImageUrl] = await Promise.all([
    findProfilePictureUrl(conn, [groupJid]),
    findProfilePictureUrl(conn, candidates),
  ]);

  const [backgroundBuffer, mainImageBuffer] = await Promise.all([
    createFallbackBackground(groupName),
    createFallbackAvatar(displayName),
  ]);

  const image = await generateWelcomeCard({
    backgroundUrl,
    backgroundBuffer,
    mainImageUrl,
    mainImageBuffer,
    text1: options.text1 || "SEJA BEM-VINDO(A)! 👋",
    text2: options.text2 || displayName,
    text3: options.text3 || ("AO GRUPO " + groupName),
  }, {
    neon: options.neon,
  });

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
          "ORG:LukaModzz;\n" +
          "TEL;type=CELL;type=VOICE;waid=13135550002:556384673123\n" +
          "END:VCARD",
      },
    },
  };
}

async function sendGroupWelcomeBanner(conn, options = {}) {
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
        newsletterName: options.botName || "LukaModzz",
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
    initials,
    createFallbackBackground,
    createFallbackAvatar,
    participantCandidates,
    resolveDisplayName,
  },
};
