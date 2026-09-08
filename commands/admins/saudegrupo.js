// Menu: Grupos - Diagnóstico | Comando: saudegrupo
const { factory } = require("../../functions/adminHelpers");
const { sameIdentity } = require("../../functions/permissions");

function ids(participant) {
  return [participant?.id, participant?.jid, participant?.lid, participant?.phoneNumber].filter(Boolean);
}

module.exports = factory({
  name: "saudegrupo",
  aliases: ["diagnosticogrupo"],
  menuCategory: "Grupos",
  menuSection: "Diagnóstico",
  usage: "saudegrupo",
  description: "Uso: .saudegrupo",
  permissions: { group: true, admin: true },
}, async ({ conn, from }) => {
  const metadata = await conn.groupMetadata(from);
  const participants = Array.isArray(metadata?.participants) ? metadata.participants : [];
  const admins = participants.filter((p) => p?.admin === "admin" || p?.admin === "superadmin");
  const owners = participants.filter((p) => p?.admin === "superadmin");
  const botIds = [conn?.user?.id, conn?.user?.lid].filter(Boolean);
  const botParticipant = participants.find((p) => ids(p).some((id) => botIds.some((botId) => sameIdentity(id, botId))));
  const botAdmin = botParticipant?.admin === "admin" || botParticipant?.admin === "superadmin";
  const closed = Boolean(metadata?.announce);
  const restricted = Boolean(metadata?.restrict);
  const ephemeral = Number(metadata?.ephemeralDuration || 0);

  const warnings = [];
  if (!botAdmin) warnings.push("bot não é administrador; ações de moderação podem falhar");
  if (admins.length === 0) warnings.push("nenhum administrador detectado");
  if (participants.length > 0 && admins.length / participants.length > 0.5) warnings.push("mais da metade dos membros são administradores");

  return [
    `🩺 *SAÚDE DO GRUPO*`,
    ``,
    `• Grupo: ${metadata?.subject || "sem nome"}`,
    `• Membros: ${participants.length}`,
    `• Administradores: ${admins.length}`,
    `• Donos/superadmins: ${owners.length}`,
    `• Bot administrador: ${botAdmin ? "sim" : "não"}`,
    `• Envio de mensagens: ${closed ? "somente admins" : "todos"}`,
    `• Edição de dados: ${restricted ? "somente admins" : "todos"}`,
    `• Mensagens temporárias: ${ephemeral > 0 ? `${ephemeral}s` : "desativadas"}`,
    ``,
    warnings.length ? `⚠️ ${warnings.join("\n⚠️ ")}` : "✅ Nenhuma irregularidade básica detectada.",
  ].join("\n");
});
