const {
  checkCommandPermissions,
  sameIdentity,
  senderCandidates,
  isOwner,
  isAdminParticipant,
} = require("./permissions");
const ui = require("./ui");
class InputError extends Error {}
function need(condition, text) {
  if (!condition) throw new InputError(text);
}
function integer(value, min, max) {
  need(
    /^\d+$/.test(String(value)),
    `Informe um inteiro entre ${min} e ${max}.`,
  );
  const n = Number(value);
  need(
    Number.isSafeInteger(n) && n >= min && n <= max,
    `Informe um inteiro entre ${min} e ${max}.`,
  );
  return n;
}
function onoff(value) {
  need(["on", "off"].includes(value), "Use on ou off.");
  return value === "on";
}
function body(msg) {
  let m = msg?.message || {};
  for (let i = 0; i < 4; i++) {
    const next =
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.documentWithCaptionMessage?.message;
    if (!next) break;
    m = next;
  }
  return m;
}
function context(msg) {
  const m = body(msg);
  return (
    Object.values(m).find((v) => v && typeof v === "object" && v.contextInfo)
      ?.contextInfo || {}
  );
}
function target(msg, args) {
  const c = context(msg);
  const v = c.mentionedJid?.[0] || c.participant || args?.[0];
  need(v, "Marque alguém, responda uma mensagem ou informe o número com DDI.");
  if (/^\d+(?::\d+)?@(s.whatsapp.net|lid)$/.test(v)) return v;
  need(/^\+?\d{8,15}$/.test(v), "Número inválido. Use DDI e somente dígitos.");
  return v.replace("+", "") + "@s.whatsapp.net";
}
function values(p) {
  return [p?.id, p?.jid, p?.lid, p?.phoneNumber].filter(Boolean);
}
function member(metadata, jid) {
  return metadata.participants?.find((p) =>
    values(p).some((v) => sameIdentity(v, jid)),
  );
}
function identity(p) {
  return p?.id || p?.jid || p?.lid || p?.phoneNumber;
}
async function resolveMember(conn, from, msg, args, { protect = false } = {}) {
  const metadata = await conn.groupMetadata(from);
  const p = member(metadata, target(msg, args));
  need(p, "Esse usuário não está no grupo.");
  if (protect) {
    need(!isAdminParticipant(p), "Essa ação não pode atingir administradores.");
    need(
      !values(p).some((v) =>
        [conn.user?.id, conn.user?.lid].some((b) => sameIdentity(v, b)),
      ),
      "Essa ação não pode atingir o bot.",
    );
    need(
      !values(p).some((v) => isOwner({ key: { remoteJid: v } })),
      "Essa ação não pode atingir o dono.",
    );
  }
  return { p, metadata, jid: identity(p) };
}
function actor(msg) {
  return senderCandidates(msg)[0] || "";
}
function key(value) {
  need(
    /^[a-z0-9][a-z0-9_-]{0,31}$/.test(value || ""),
    "Use um nome de até 32 letras minúsculas, números ou hífen.",
  );
  return value;
}
function text(args, max = 1000) {
  const v = args.join(" ").trim();
  need(
    v.length > 0 && v.length <= max,
    `Informe um texto entre 1 e ${max} caracteres.`,
  );
  return v;
}
function factory(def, handler) {
  return {
    ...def,
    async execute(conn, msg, args = [], from) {
      const permission = await checkCommandPermissions({
        conn,
        msg,
        from,
        command: def,
      });
      if (!permission.ok) {
        await ui.reply(conn, msg, ui.permissionMessage(permission.code), {
          from,
        });
        return false;
      }
      try {
        const result = await handler({
          conn,
          msg,
          args,
          from,
          permission,
          def,
        });
        if (result !== undefined) return ui.reply(conn, msg, result, { from });
      } catch (e) {
        if (e instanceof InputError) {
          await ui.reply(conn, msg, e.message, { from });
          return false;
        }
        throw e;
      }
    },
  };
}
module.exports = {
  InputError,
  need,
  integer,
  onoff,
  body,
  context,
  target,
  values,
  member,
  identity,
  resolveMember,
  actor,
  key,
  text,
  factory,
};
