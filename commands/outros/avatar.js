// Menu: Utilidades - Perfil | Comando: avatar
const { createStatusQuoted } = require("../../functions/statusCard");
const { unwrapMessage } = require("../../functions/messageText");
const { isGroupJid, senderCandidates, digits } = require("../../functions/permissions");
const {
  newsletterContext,
  findParticipant,
  participantValues,
} = require("../../functions/ownerGroupManager");

function unique(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function normalizeUserCandidate(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d+(?::\d+)?@(s\.whatsapp\.net|lid)$/i.test(raw)) return raw;
  if (/^\+?\d{8,15}$/.test(raw)) return `${digits(raw)}@s.whatsapp.net`;
  return raw;
}

function messageContext(msg) {
  const message = unwrapMessage(msg);
  for (const value of Object.values(message || {})) {
    if (value && typeof value === "object" && value.contextInfo) return value.contextInfo;
  }
  return {};
}

function userInputJid(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d+(?::\d+)?@(s\.whatsapp\.net|lid)$/i.test(raw)) return raw;

  const printable = raw.replace(/^@/, "");
  if (!/^\+?[\d\s().-]+$/.test(printable)) return null;

  const number = digits(printable);
  if (number.length < 8 || number.length > 15) return null;
  return `${number}@s.whatsapp.net`;
}

function requestedTarget(msg, args, from) {
  const group = isGroupJid(from);
  const first = String(args?.[0] || "").trim();
  const lower = first.toLocaleLowerCase("pt-BR");

  if (lower === "grupo" || lower === "group") {
    return group
      ? { type: "group", candidates: [from], source: "group" }
      : { error: "GROUP_ONLY" };
  }

  const context = messageContext(msg);
  const mentions = unique(context?.mentionedJid).map(normalizeUserCandidate).filter(Boolean);
  if (mentions.length) {
    return { type: "user", candidates: mentions, source: "mention" };
  }

  if (context?.quotedMessage) {
    const quoted = unique([context?.participantAlt, context?.participant])
      .map(normalizeUserCandidate)
      .filter(Boolean);
    if (quoted.length) {
      return { type: "user", candidates: quoted, source: "quoted" };
    }
  }

  if (["eu", "me", "meu", "my"].includes(lower)) {
    return {
      type: "user",
      candidates: senderCandidates(msg).map(normalizeUserCandidate).filter(Boolean),
      source: "self",
    };
  }

  if (first) {
    const jid = userInputJid(first);
    if (!jid) return { error: "INVALID_TARGET" };
    return { type: "user", candidates: [jid], source: "number" };
  }

  return {
    type: "user",
    candidates: senderCandidates(msg).map(normalizeUserCandidate).filter(Boolean),
    source: "self",
  };
}

function preferredCandidates(values = []) {
  const all = unique(values.map(normalizeUserCandidate).filter(Boolean));
  return [
    ...all.filter((jid) => jid.endsWith("@s.whatsapp.net")),
    ...all.filter((jid) => jid.endsWith("@lid")),
    ...all.filter((jid) => !jid.endsWith("@s.whatsapp.net") && !jid.endsWith("@lid")),
  ];
}

function phoneJid(values = []) {
  return preferredCandidates(values).find((jid) => jid.endsWith("@s.whatsapp.net")) || null;
}

async function resolveUserCandidates(conn, metadata, initial = []) {
  let candidates = preferredCandidates(initial);

  if (metadata) {
    const participant = findParticipant(metadata, candidates);
    if (participant) {
      candidates = preferredCandidates([
        ...candidates,
        ...participantValues(participant).map(normalizeUserCandidate),
      ]);
    }
  }

  const phone = phoneJid(candidates);
  if (phone && typeof conn.onWhatsApp === "function") {
    const number = digits(phone.split("@")[0]);
    for (const query of unique([number, phone])) {
      try {
        const result = await conn.onWhatsApp(query);
        for (const item of Array.isArray(result) ? result : []) {
          candidates = preferredCandidates([
            ...candidates,
            normalizeUserCandidate(item?.jid),
            normalizeUserCandidate(item?.lid),
            normalizeUserCandidate(item?.phoneNumber),
          ]);
        }
        if (result?.length) break;
      } catch (_) {
        // onWhatsApp é apenas enriquecimento; a busca da foto continua sem ele.
      }
    }
  }

  if (metadata) {
    const participant = findParticipant(metadata, candidates);
    if (participant) {
      candidates = preferredCandidates([
        ...candidates,
        ...participantValues(participant).map(normalizeUserCandidate),
      ]);
    }
  }

  return preferredCandidates(candidates);
}

async function findProfilePicture(conn, candidates = []) {
  if (typeof conn.profilePictureUrl !== "function") return null;
  const ordered = preferredCandidates(candidates);

  for (const type of ["image", "preview"]) {
    for (const jid of ordered) {
      try {
        const url = await conn.profilePictureUrl(jid, type);
        if (url) return { url, jid, quality: type === "image" ? "Original" : "Prévia" };
      } catch (_) {
        // 401/403/404 são comuns quando não há foto ou a privacidade não permite acesso.
      }
    }
  }

  return null;
}

async function safeName(conn, candidates, fallback) {
  if (typeof conn.getName === "function") {
    for (const jid of preferredCandidates(candidates)) {
      try {
        const value = String(await conn.getName(jid) || "").trim();
        if (value && value !== jid && value !== jid.split("@")[0]) return value;
      } catch (_) {}
    }
  }
  return fallback;
}

function sourceLabel(source) {
  return {
    self: "Seu perfil",
    mention: "Usuário marcado",
    quoted: "Mensagem respondida",
    number: "Número informado",
    group: "Grupo atual",
  }[source] || "WhatsApp";
}

function frame(lines) {
  return [
    "╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮",
    ...lines.map((line) => `├̬⌑ؔ͟ ${line}`),
    "╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯",
  ].join("\n");
}

function errorText(code, prefix = ".") {
  if (code === "GROUP_ONLY") {
    return frame([
      "⎾🧊⏌ *𝙰𝚅𝙰𝚃𝙰𝚁*",
      "⎾❌⏌ `grupo` só pode ser usado dentro de um grupo.",
      `⎾💎⏌ Uso: *${prefix}avatar grupo*`,
    ]);
  }
  if (code === "INVALID_TARGET") {
    return frame([
      "⎾🧊⏌ *𝙰𝚅𝙰𝚃𝙰𝚁*",
      "⎾❌⏌ Número ou alvo inválido.",
      `⎾🔹⏌ *${prefix}avatar* — seu avatar`,
      `⎾🔹⏌ *${prefix}avatar @usuário* — usuário marcado`,
      `⎾💎⏌ Também funciona respondendo uma mensagem.`,
    ]);
  }
  return frame([
    "⎾🧊⏌ *𝙰𝚅𝙰𝚃𝙰𝚁*",
    "⎾❌⏌ A foto de perfil não está disponível para o bot.",
    "⎾🔒⏌ A conta pode estar sem foto ou a privacidade do WhatsApp pode impedir o acesso.",
  ]);
}

async function sendText(conn, msg, from, text) {
  return conn.sendMessage(
    from,
    { text, contextInfo: newsletterContext() },
    { quoted: createStatusQuoted(msg) },
  );
}

const command = {
  name: "avatar",
  aliases: ["foto", "pfp"],
  menuCategory: "Utilidades",
  menuSection: "Perfil",
  usage: "avatar [@usuário|número|grupo]",
  description: "Uso: .avatar [@usuário|número|grupo]",

  async execute(conn, msg, args = [], from) {
    const prefix = require("../../config/config").prefix || ".";

    try {
      const target = requestedTarget(msg, args, from);
      if (target.error) return sendText(conn, msg, from, errorText(target.error, prefix));
      if (!target.candidates?.length) return sendText(conn, msg, from, errorText("INVALID_TARGET", prefix));

      let metadata = null;
      if (isGroupJid(from)) {
        try {
          metadata = await conn.groupMetadata(from);
        } catch (_) {
          // O comando ainda consegue funcionar com o JID recebido diretamente.
        }
      }

      if (target.type === "group") {
        let groupMeta = metadata;
        if (!groupMeta || groupMeta.id !== from) {
          try { groupMeta = await conn.groupMetadata(from); } catch (_) {}
        }

        const picture = await findProfilePicture(conn, [from]);
        if (!picture) return sendText(conn, msg, from, errorText("NO_PICTURE", prefix));

        const subject = String(groupMeta?.subject || "Grupo").trim() || "Grupo";
        const members = Array.isArray(groupMeta?.participants) ? groupMeta.participants.length : null;
        const caption = frame([
          "⎾🧊⏌ *𝙰𝚅𝙰𝚃𝙰𝚁 𝙳𝙾 𝙶𝚁𝚄𝙿𝙾*",
          `⎾👥⏌ 𝙶𝚛𝚞𝚙𝚘: *${subject}*`,
          ...(members !== null ? [`⎾🔹⏌ 𝙼𝚎𝚖𝚋𝚛𝚘𝚜: *${members}*`] : []),
          `⎾🔷⏌ 𝙰𝚕𝚟𝚘: *${sourceLabel(target.source)}*`,
          `⎾💎⏌ 𝚀𝚞𝚊𝚕𝚒𝚍𝚊𝚍𝚎: *${picture.quality}*`,
        ]);

        return conn.sendMessage(
          from,
          { image: { url: picture.url }, caption, contextInfo: newsletterContext() },
          { quoted: createStatusQuoted(msg) },
        );
      }

      const candidates = await resolveUserCandidates(conn, metadata, target.candidates);
      const picture = await findProfilePicture(conn, candidates);
      if (!picture) return sendText(conn, msg, from, errorText("NO_PICTURE", prefix));

      const phone = phoneJid(candidates);
      const mentionNumber = phone ? digits(phone.split("@")[0]) : "";
      const fallbackName = target.source === "self" && msg?.pushName
        ? String(msg.pushName).trim()
        : (mentionNumber ? `@${mentionNumber}` : "Usuário do WhatsApp");
      const name = await safeName(conn, candidates, fallbackName);
      const mentionJid = mentionNumber ? phone : null;

      const lines = [
        "⎾🧊⏌ *𝙰𝚅𝙰𝚃𝙰𝚁 𝙳𝙴 𝙿𝙴𝚁𝙵𝙸𝙻*",
        `⎾👤⏌ 𝙿𝚎𝚛𝚏𝚒𝚕: *${name}*`,
      ];
      if (mentionNumber && name !== `@${mentionNumber}`) {
        lines.push(`⎾🔹⏌ 𝙲𝚘𝚗𝚝𝚊𝚝𝚘: *@${mentionNumber}*`);
      }
      lines.push(`⎾🔷⏌ 𝙰𝚕𝚟𝚘: *${sourceLabel(target.source)}*`);
      lines.push(`⎾💎⏌ 𝚀𝚞𝚊𝚕𝚒𝚍𝚊𝚍𝚎: *${picture.quality}*`);

      const payload = {
        image: { url: picture.url },
        caption: frame(lines),
        contextInfo: newsletterContext(),
      };
      if (mentionJid) payload.mentions = [mentionJid];

      return conn.sendMessage(from, payload, { quoted: createStatusQuoted(msg) });
    } catch (error) {
      console.error("[AVATAR]", error?.message || error);
      return sendText(
        conn,
        msg,
        from,
        frame([
          "⎾🧊⏌ *𝙰𝚅𝙰𝚃𝙰𝚁*",
          "⎾❌⏌ O WhatsApp não conseguiu concluir a consulta da foto.",
          "⎾🔹⏌ Tente novamente em alguns instantes ou use outro alvo.",
        ]),
      );
    }
  },
};

command._internals = {
  messageContext,
  normalizeUserCandidate,
  userInputJid,
  requestedTarget,
  preferredCandidates,
  resolveUserCandidates,
  findProfilePicture,
  phoneJid,
  sourceLabel,
};

module.exports = command;
