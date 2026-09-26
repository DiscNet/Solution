const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const { unwrapMessage } = require("../../functions/messageText");
const permissions = require("../../functions/permissions");
const grupos = require("./grupos");
const mess = require("../mensagens/mensagens");

function cleanJid(value) {
  let raw = value;

  if (raw && typeof raw === "object") {
    raw =
      raw.phoneNumber ||
      raw.participantAlt ||
      raw.jid ||
      raw.id ||
      raw.participant ||
      raw.lid ||
      "";
  }

  raw = String(raw || "").trim();
  if (!raw) return "";

  if (raw.endsWith("@c.us")) {
    raw = raw.replace(/@c\.us$/, "@s.whatsapp.net");
  }

  const at = raw.indexOf("@");

  if (at < 0) {
    const number = raw.replace(/\D/g, "");
    return number ? number + "@s.whatsapp.net" : raw;
  }

  const user = raw.slice(0, at).split(":")[0];
  const server = raw.slice(at + 1);

  return user && server ? user + "@" + server : raw;
}

function messageContext(msg) {
  const message = unwrapMessage(msg);

  return (
    message?.extendedTextMessage?.contextInfo ||
    message?.imageMessage?.contextInfo ||
    message?.videoMessage?.contextInfo ||
    message?.audioMessage?.contextInfo ||
    message?.documentMessage?.contextInfo ||
    message?.stickerMessage?.contextInfo ||
    {}
  );
}

function mentionsFrom(msg) {
  const ctx = messageContext(msg);

  return Array.isArray(ctx.mentionedJid)
    ? ctx.mentionedJid.map(cleanJid).filter(Boolean)
    : [];
}

function quotedParticipant(msg) {
  const ctx = messageContext(msg);
  return cleanJid(ctx.participantAlt || ctx.participant || "");
}

function senderFrom(msg, from) {
  return cleanJid(
    msg?.key?.participantAlt ||
    msg?.key?.participant ||
    msg?.key?.remoteJidAlt ||
    msg?.key?.remoteJid ||
    from
  );
}

function canalInfo(mentions = []) {
  const name =
    String(config.botName || "Bot")
      .replace(/[\x00-\x1F\x7F]/g, "")
      .trim() || "Bot";

  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363426698503859@newsletter",
      newsletterName: name,
      serverMessageId: 116,
    },
    mentionedJid: mentions,
  };
}

function sanitizarErro(error, secrets = []) {
  let text =
    error instanceof Error
      ? error.stack || error.message
      : String(error || "");

  for (const secret of secrets || []) {
    if (secret) text = text.split(String(secret)).join("[SECRET]");
  }

  return text;
}

function siteApi(url) {
  try {
    return new URL(String(url || "")).origin;
  } catch {
    return String(url || "");
  }
}

async function buildContext({
  conn,
  msg,
  args = [],
  from,
  requestedName,
}) {
  const sender = senderFrom(msg, from);
  const isGroup = String(from || "").endsWith("@g.us");
  const groupId = isGroup ? from : "private:" + sender;

  let dataGp = grupos.loadAsArray(groupId);

  const mentioned = mentionsFrom(msg);
  const quoted = quotedParticipant(msg);
  const destino = mentioned[0] || quoted || sender;

  let groupMetadata = null;

  if (isGroup) {
    groupMetadata = await conn.groupMetadata(from).catch(() => null);
  }

  const participant = (groupMetadata?.participants || []).find(item => {
    const ids = [
      item?.id,
      item?.jid,
      item?.lid,
      item?.phoneNumber,
    ]
      .map(cleanJid)
      .filter(Boolean);

    return ids.includes(sender);
  });

  const SoDono = Boolean(permissions.isOwner?.(msg));

  const isGroupAdmins = Boolean(
    SoDono ||
    participant?.admin === "admin" ||
    participant?.admin === "superadmin" ||
    participant?.admin === true
  );

  const prefix = config.prefix || ".";
  const selo = createStatusQuoted(msg);

  const setGp = value => {
    dataGp = grupos.saveArray(groupId, value);
    return dataGp;
  };

  const reply = async (text, mentions = []) =>
    conn.sendMessage(
      from,
      {
        text: String(text || " "),
        mentions,
        contextInfo: canalInfo(mentions),
      },
      { quoted: selo }
    );

  return {
    tokito: conn,
    info: msg,
    mensagem: unwrapMessage(msg),
    from,
    sender,
    args,
    q: args.join(" "),
    command: String(requestedName || "").toLowerCase(),
    prefix,
    isCmd: true,
    isGroup,
    isGroupAdmins,
    SoDono,
    isVip: SoDono,
    pushname: msg?.pushName || "Usuário",
    groupMetadata,
    groupMembers: groupMetadata?.participants || [],
    dataGp,
    setGp,
    normalizar: cleanJid,
    menc_jid2: mentioned,
    menc_prt: quoted,
    destino,
    reply,
    selo,
    canalInfo,
    mess,
    API_URL: String(
      config.tokitoApiUrl || "https://tokito-apis.com.br"
    ).replace(/\/+$/, ""),
    API_KEY_TOKITO: String(
      config.tokitoApi ||
      process.env.TOKITO_API ||
      ""
    ),
    modulos: {
      sanitizarErro,
      siteApi,
      ehErroApi: error => Boolean(error),
    },
  };
}

module.exports = {
  cleanJid,
  messageContext,
  mentionsFrom,
  quotedParticipant,
  senderFrom,
  canalInfo,
  buildContext,
};
