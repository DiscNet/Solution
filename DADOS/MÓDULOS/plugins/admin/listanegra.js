const h = require("../../functions/adminHelpers");
const state = require("../../functions/adminState");
const ui = require("../../functions/ui");
const { removeMember } = require("../../functions/groupAutoban");
const { participantIds, findBlacklisted } = require("../../functions/groupProtection");
const { isOwner, isAdminParticipant, sameIdentity, botIdentityCandidates } = require("../../functions/permissions");
const config = require("../../../config/config");

const definitions = [
  ["listanegra", "listanegra", "Consulta os membros impedidos de retornar", false],
  ["addlistanegra", "addlistanegra @membro|número|LID", "Bloqueia o retorno e remove um membro presente", true],
  ["dellistanegra", "dellistanegra número-da-lista|@membro|ID", "Retira um membro da lista negra", false],
];

async function run(name, { conn, msg, args, from, permission }) {
  const prefix = config.prefix || ".";
  const entries = state.groupSettings(from).blacklist || [];
  if (name === "listanegra") {
    return ui.adminCard("Lista negra", [
      ui.adminRow("🚫", "Total", entries.length),
      ...entries.map((entry, index) =>
        ui.adminRow("👤", String(index + 1), `\`${entry.ids?.[0] || "ID indisponível"}\``)),
      ui.adminRow("💎", "Remover", `${prefix}dellistanegra número-da-lista`),
    ]);
  }
  if (name === "dellistanegra") {
    h.need(args[0] || h.context(msg).participant || h.context(msg).mentionedJid?.length,
      `Use ${prefix}dellistanegra número-da-lista ou marque o membro.`);
    const index = /^\d{1,3}$/.test(String(args[0])) ? Number(args[0]) - 1 : -1;
    const target = index >= 0 && index < entries.length ? null : h.target(msg, args);
    const found = index >= 0 && index < entries.length ? entries[index] : findBlacklisted(from, [target]);
    h.need(found, "Esse membro não consta da lista negra.");
    state.update(data => {
      const group = state.group(data, from);
      group.blacklist = (group.blacklist || []).filter(entry => entry !== found &&
        !(entry.ids || []).some(id => (found.ids || []).some(other => sameIdentity(id, other))));
    });
    return ui.adminCard("Lista negra", [
      ui.adminRow("✅", "Removido da lista", `\`${found.ids?.[0] || target}\``),
    ]);
  }

  const target = h.target(msg, args);
  const metadata = permission.metadata;
  const member = h.member(metadata, target);
  const ids = [...new Set([target, ...participantIds(member)])];
  h.need(!isAdminParticipant(member), "Não é permitido bloquear administradores.");
  h.need(!ids.some(id => isOwner({ key: { remoteJid: id } })), "Não é permitido bloquear o dono do bot.");
  h.need(!ids.some(id => botIdentityCandidates(conn).some(bot => sameIdentity(id, bot))),
    "Não é permitido bloquear o próprio bot.");
  h.need(!findBlacklisted(from, ids), "Esse membro já consta da lista negra.");
  state.update(data => {
    const group = state.group(data, from);
    group.blacklist ||= [];
    h.need(group.blacklist.length < 100, "O limite de 100 membros foi atingido.");
    group.blacklist.push({ ids, at: Date.now(), by: h.actor(msg) });
  });

  const result = member ? await removeMember(conn, { from, metadata, participant: member }) : null;
  return ui.adminCard("Lista negra", [
    ui.adminRow("👤", "Membro", `\`${ids[0]}\``),
    ui.adminRow("🚫", "Retorno", ui.smallcaps("bloqueado")),
    ui.adminRow(result?.removed ? "✅" : "⚠️", "Agora", ui.smallcaps(
      result ? result.removed ? "membro removido" : result.error || "não foi possível remover o membro presente" : "bloqueio salvo")),
  ]);
}

module.exports = { commands: definitions.map(([name, usage, description, botAdmin]) =>
  h.factory({
    name, aliases: [], usage, description,
    permissions: { group: true, admin: true, ...(botAdmin ? { botAdmin: true } : {}) },
    menuCategory: "Grupos", menuSection: "Moderação",
  }, context => run(name, context))) };
