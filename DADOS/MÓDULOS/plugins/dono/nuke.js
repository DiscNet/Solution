// Menu: Dono - Grupos | Comando: nuke
const config = require("../../../config/config");
const h = require("../../functions/adminHelpers");
const {
  participantIdentity,
  isProtectedParticipant,
  newsletterContext,
  readableError,
} = require("../../functions/ownerGroupManager");

module.exports = h.factory({
  name: "nuke",
  permissions: { owner: true, group: true, botAdmin: true },
  menuCategory: "Dono",
  menuSection: "Grupos",
  description: "Reseta o grupo e remove membros após confirmação",
  usage: "nuke confirmar [novo nome]",
}, async ({ conn, msg, args, from, permission }) => {
  if (String(args[0] || "").toLowerCase() !== "confirmar") {
    return [
      "⚠️ *AÇÃO DESTRUTIVA*",
      "Este comando remove membros, limpa descrição/foto e troca o nome do grupo.",
      "",
      `Para continuar: ${config.prefix || "."}nuke confirmar [novo nome]`,
    ].join("\n");
  }

  const newName = args.slice(1).join(" ").trim() || "Grupo resetado";
  h.need(newName.length <= 100, "O novo nome deve ter no máximo 100 caracteres.");

  const metadata = permission.metadata || await conn.groupMetadata(from);
  const participants = Array.isArray(metadata?.participants) ? metadata.participants : [];
  const removable = participants.filter((participant) =>
    participant?.admin !== "superadmin" &&
    !isProtectedParticipant(participant, conn),
  );

  const failures = [];
  let removed = 0;

  for (let i = 0; i < removable.length; i += 50) {
    const batch = removable.slice(i, i + 50);
    const ids = batch.map(participantIdentity).filter(Boolean);
    if (!ids.length) continue;
    try {
      const result = await conn.groupParticipantsUpdate(from, ids, "remove");
      if (Array.isArray(result) && result.length) {
        removed += result.filter((item) => [200, 201].includes(Number(item?.status))).length;
        const failed = result.filter((item) => ![200, 201].includes(Number(item?.status)));
        if (failed.length) failures.push(`${failed.length} remoções recusadas`);
      } else {
        removed += ids.length;
      }
    } catch (error) {
      failures.push(readableError(error, `remover ${ids.length} membro(s)`).replace(/^❌\s*/, ""));
    }
  }

  try {
    await conn.groupUpdateSubject(from, newName);
  } catch (error) {
    failures.push("não foi possível alterar o nome");
  }

  try {
    await conn.groupUpdateDescription(from, "");
  } catch (error) {
    failures.push("não foi possível limpar a descrição");
  }

  try {
    await conn.removeProfilePicture(from);
  } catch (_) {
    // Grupo sem foto ou permissão específica: não impede o restante do reset.
  }

  const report = [
    "🧹 *RESET DO GRUPO CONCLUÍDO*",
    `📛 Nome: *${newName}*`,
    `👥 Removidos: *${removed}/${removable.length}*`,
    "🛡️ Bot, dono e criador do grupo foram preservados.",
    failures.length ? `⚠️ Pendências: ${failures.join("; ")}.` : "✅ Todas as etapas obrigatórias foram concluídas.",
  ].join("\n");

  await conn.sendMessage(from, {
    text: report,
    contextInfo: newsletterContext(),
  }, { quoted: msg });
});
