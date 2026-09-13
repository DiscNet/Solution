// Menu: Dono - Grupos | Comando: entrar
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const {
  newsletterContext,
  ensureOwner,
} = require("../../functions/ownerGroupManager");

function extractInviteCode(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  // Aceita link completo ou somente o código do convite.
  const match = raw.match(/(?:https?:\/\/)?chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i);
  const code = (match?.[1] || raw)
    .split(/[?#\s]/)[0]
    .trim();

  if (!/^[A-Za-z0-9_-]{10,}$/.test(code)) return null;
  return code;
}

function inviteErrorMessage(error) {
  const text = String(
    error?.message ||
    error?.data?.message ||
    error?.data ||
    error?.output?.payload?.message ||
    ""
  ).toLowerCase();
  const status = error?.output?.statusCode || error?.statusCode || error?.data?.statusCode;

  if (
    status === 401 ||
    status === 403 ||
    text.includes("not-authorized") ||
    text.includes("not authorized")
  ) {
    return "❌ Não foi possível entrar: o convite pode ter sido revogado, expirado ou o bot não tem permissão para usar esse link.";
  }

  if (
    status === 404 ||
    text.includes("not found") ||
    text.includes("invite code") ||
    text.includes("invalid")
  ) {
    return "❌ Link de convite inválido, expirado ou inexistente.";
  }

  if (status === 429 || text.includes("429") || text.includes("rate")) {
    return "❌ O WhatsApp limitou temporariamente entradas em grupos. Tente novamente mais tarde.";
  }

  if (text.includes("already") || text.includes("participant")) {
    return "ℹ️ O bot já parece participar desse grupo.";
  }

  return "❌ Não foi possível entrar no grupo usando esse convite.";
}

module.exports = {
  permissions: { owner: true },
  name: "entrar",
  aliases: ["entrargrupo", "join"],
  description: "Faz o bot entrar em um grupo por link de convite",
  usage: "entrar link_aqui",
  menuCategory: "Dono",
  menuSection: "Grupos",

  async execute(conn, msg, args = [], from) {
    const quoted = createStatusQuoted(msg);

    try {
      if (!ensureOwner(msg)) {
        return conn.sendMessage(from, {
          text: "❌ Apenas o dono pode usar este comando.",
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      const input = args.join(" ").trim();
      const inviteCode = extractInviteCode(input);
      const prefix = config.prefix || ".";

      if (!inviteCode) {
        return conn.sendMessage(from, {
          text: `❌ Informe um link válido de convite do WhatsApp.\nEx.: ${prefix}entrar https://chat.whatsapp.com/SEU_CODIGO`,
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      await conn.sendMessage(from, {
        react: { text: "⏳", key: msg.key },
      }).catch(() => {});

      const groupId = await conn.groupAcceptInvite(inviteCode);

      let groupName = "grupo";
      let members = null;
      try {
        const metadata = await conn.groupMetadata(groupId);
        groupName = metadata?.subject || groupName;
        members = Array.isArray(metadata?.participants)
          ? metadata.participants.length
          : null;
      } catch (_) {}

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});

      const memberLine = members !== null ? `\n👥 Membros: *${members}*` : "";
      return conn.sendMessage(from, {
        text: `✅ Bot entrou com sucesso em *${groupName}*.\n🆔 \`${groupId}\`${memberLine}`,
        contextInfo: newsletterContext(),
      }, { quoted });
    } catch (error) {
      console.error("[ENTRAR]", error);
      await conn.sendMessage(from, {
        react: { text: "❌", key: msg.key },
      }).catch(() => {});

      return conn.sendMessage(from, {
        text: inviteErrorMessage(error),
        contextInfo: newsletterContext(),
      }, { quoted });
    }
  },
};
