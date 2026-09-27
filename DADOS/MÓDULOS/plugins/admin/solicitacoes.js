// Menu: Grupos - Solicitações
const h = require("../../functions/adminHelpers");
const ui = require("../../functions/ui");
const state = require("../../functions/adminState");
const { sameIdentity } = require("../../functions/permissions");
const { sendInteractiveMessage } = require("../../functions/uiMode");
const config = require("../../../config/config");

const recentlyNotified = new Map();
const NOTICE_TTL = 60_000;
const requestValues = request => [
  request?.jid, request?.participant, request?.participantPn,
  request?.phoneNumber, request?.id, request?.lid,
].filter(value => typeof value === "string" && value.includes("@"));
const requestId = request => requestValues(request)[0] || "";

function sameRequest(request, target) {
  const value = String(target || "").trim().replace(/^@/, "");
  if (!value) return false;
  return requestValues(request).some(candidate =>
    candidate === value ||
    (value.includes("@") && sameIdentity(candidate, value)) ||
    (/^\+?\d{8,15}$/.test(value) &&
      candidate.endsWith("@s.whatsapp.net") &&
      candidate.split("@")[0].split(":")[0] === value.replace("+", ""))
  );
}

async function pending(conn, groupId) {
  h.need(typeof conn.groupRequestParticipantsList === "function",
    "Esta versão da conexão não permite consultar solicitações.");
  const requests = await conn.groupRequestParticipantsList(groupId);
  h.need(Array.isArray(requests), "Não foi possível consultar as solicitações.");
  return requests.filter(request => requestId(request));
}

async function decide(conn, groupId, requests, action) {
  h.need(typeof conn.groupRequestParticipantsUpdate === "function",
    "Esta versão da conexão não permite responder solicitações.");
  const ids = [...new Set(requests.map(requestId))];
  h.need(ids.length, "Nenhuma solicitação pendente.");
  const result = await conn.groupRequestParticipantsUpdate(groupId, ids, action);
  const statuses = Array.isArray(result) ? result : [];
  if (statuses.length) {
    const ok = statuses.filter(item => String(item?.status) === "200").length;
    return { ok, failed: Math.max(ids.length - ok, 0) };
  }
  const remaining = await pending(conn, groupId);
  const failed = ids.filter(jid => remaining.some(request => sameRequest(request, jid))).length;
  return { ok: ids.length - failed, failed };
}

function statusCard(title, lines) {
  return ui.adminCard(title, lines);
}

function option(args) {
  const value = String(args[0] || "").toLowerCase();
  if (["1", "on", "ativar"].includes(value)) return true;
  if (["0", "off", "desativar"].includes(value)) return false;
  h.need(!value, "Use 1 para ativar ou 0 para desativar.");
  return null;
}

async function run(name, { conn, msg, args, from }) {
  const prefix = config.prefix || ".";
  if (name === "aprovacao" || name === "autoaprovacao") {
    const enabled = option(args);
    if (enabled !== null) {
      if (name === "aprovacao" || enabled) {
        h.need(typeof conn.groupJoinApprovalMode === "function",
          "Esta versão da conexão não permite alterar a aprovação de entrada.");
        await conn.groupJoinApprovalMode(from, enabled ? "on" : "off");
      }
      state.update(data => {
        const group = state.group(data, from);
        if (name === "aprovacao") {
          group.approvalNotice = enabled;
          if (!enabled) group.autoApprove = false;
        } else {
          group.autoApprove = enabled;
          if (enabled) group.approvalNotice = true;
        }
      });
    }
    const group = state.groupSettings(from);
    const metadata = await conn.groupMetadata(from);
    return statusCard("Aprovação de entrada", [
      ui.adminRow("📥", "Pedidos no WhatsApp", metadata.joinApprovalMode ? "exigidos" : "desativados"),
      ui.adminRow("🔔", "Avisos no grupo", group.approvalNotice ? "ativos" : "inativos"),
      ui.adminRow("🤖", "Autoaprovação", group.autoApprove ? "ativa" : "inativa"),
      ui.adminRow("💎", "Uso", `${prefix}${name} 1|0`),
    ]);
  }

  if (name === "pedidos") {
    const requests = await pending(conn, from);
    if (!requests.length) return statusCard("Pedidos de entrada", ["⎾📥⏌ Nenhuma solicitação pendente."]);
    const lines = requests.map((request, index) =>
      ui.adminRow("🔹", `Pedido ${index + 1}`, `\`${requestId(request)}\``));
    const instructions = [
      ui.adminRow("✅", "Aprovar", `${prefix}aprovarpedido número`),
      ui.adminRow("❌", "Recusar", `${prefix}recusarpedido número`),
    ];
    for (let i = 0; i < lines.length; i += 20) {
      await conn.sendMessage(from, {
        text: statusCard(`Pedidos de entrada ${Math.floor(i / 20) + 1}/${Math.ceil(lines.length / 20)}`,
          [...lines.slice(i, i + 20), ...instructions]),
      }, { quoted: msg });
    }
    return;
  }

  const requests = await pending(conn, from);
  h.need(requests.length, "Não há solicitações pendentes.");
  const bulk = name.endsWith("pedidos");
  if (bulk) {
    h.need(String(args[0] || "").toLowerCase() === "confirmar",
      `Para responder a todos, use ${prefix}${name} confirmar.`);
  }
  const target = h.context(msg).mentionedJid?.[0] || args[0];
  let selected = requests;
  if (!bulk) {
    h.need(target, `Informe o número da lista ou o ID/LID. Consulte ${prefix}pedidos.`);
    const index = /^\d+$/.test(String(target)) ? Number(target) : 0;
    const request = index >= 1 && index <= requests.length
      ? requests[index - 1]
      : requests.find(item => sameRequest(item, target));
    h.need(request, `Solicitação não encontrada. Consulte ${prefix}pedidos.`);
    selected = [request];
  }
  const approve = name.startsWith("aprovar");
  const result = await decide(conn, from, selected, approve ? "approve" : "reject");
  return statusCard(approve ? "Pedidos aprovados" : "Pedidos recusados", [
    ui.adminRow("✅", "Concluídos", result.ok),
    ui.adminRow("⚠️", "Não concluídos", result.failed),
    ui.adminRow("📥", "Total solicitado", selected.length),
  ]);
}

const definitions = [
  ["aprovacao", [], "aprovacao 1|0", "Ativa aprovação e avisos de pedidos de entrada"],
  ["autoaprovacao", [], "autoaprovacao 1|0", "Aprova automaticamente novos pedidos, se ativado"],
  ["pedidos", ["pedidospendentes", "listarpedidos"], "pedidos", "Lista pedidos de entrada pendentes"],
  ["aprovarpedido", [], "aprovarpedido número|ID", "Aprova um pedido de entrada"],
  ["recusarpedido", [], "recusarpedido número|ID", "Recusa um pedido de entrada"],
  ["aprovarpedidos", [], "aprovarpedidos confirmar", "Aprova todos os pedidos pendentes"],
  ["recusarpedidos", [], "recusarpedidos confirmar", "Recusa todos os pedidos pendentes"],
];

const commands = definitions.map(([name, aliases, usage, description]) =>
  h.factory({
    name, aliases, usage, description,
    permissions: { group: true, admin: true, botAdmin: true },
    menuCategory: "Grupos",
    menuSection: "Solicitações",
  }, context => run(name, context)));

async function notifyRequest(conn, groupId, request) {
  const group = state.groupSettings(groupId);
  if (!group.approvalNotice && !group.autoApprove) return;
  const jid = requestId(request);
  if (!jid) return;
  const key = `${groupId}:${jid}`;
  const now = Date.now();
  if (recentlyNotified.size > 1000) {
    for (const [id, time] of recentlyNotified)
      if (time + NOTICE_TTL < now) recentlyNotified.delete(id);
  }
  if ((recentlyNotified.get(key) || 0) + NOTICE_TTL > now) return;
  recentlyNotified.set(key, now);
  try {
    if (group.autoApprove) {
      const result = await decide(conn, groupId, [request], "approve");
      h.need(result.ok === 1, "O WhatsApp não confirmou a aprovação automática.");
      await conn.sendMessage(groupId, {
        text: statusCard("Entrada aprovada", [ui.adminRow("👥", "Participante", `\`${jid}\``)]),
      });
      return;
    }
    const prefix = config.prefix || ".";
    await sendInteractiveMessage(conn, groupId, {
      text: statusCard("Nova solicitação", [
        ui.adminRow("👥", "Participante", `\`${jid}\``),
        ui.adminRow("✅", "Aprovar", `${prefix}aprovarpedido ${jid}`),
        ui.adminRow("❌", "Recusar", `${prefix}recusarpedido ${jid}`),
      ]),
      footer: config.botName || "Solution",
      interactiveButtons: [
        { name: "quick_reply", buttonParamsJson: JSON.stringify({
          display_text: "✅ Aprovar", id: `${prefix}aprovarpedido ${jid}`,
        }) },
        { name: "quick_reply", buttonParamsJson: JSON.stringify({
          display_text: "❌ Recusar", id: `${prefix}recusarpedido ${jid}`,
        }) },
      ],
    });
  } catch (error) {
    recentlyNotified.delete(key);
    throw error;
  }
}

async function onJoinRequest(conn, update) {
  if (update?.action !== "created" || !String(update.id || "").endsWith("@g.us")) return;
  const group = state.groupSettings(update.id);
  if (!group.approvalNotice && !group.autoApprove) return;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, 800));
    const requests = await pending(conn, update.id);
    const request = requests.find(item =>
      [update.participant, update.participantPn].some(value => sameRequest(item, value)));
    if (request) return notifyRequest(conn, update.id, request);
  }
}

function hasRequestTag(node, depth = 0) {
  if (!node || depth > 6) return false;
  if (node.tag === "created_membership_requests") return true;
  return Array.isArray(node.content) &&
    node.content.some(child => hasRequestTag(child, depth + 1));
}

async function onMembershipNotification(conn, node) {
  const groupId = String(node?.attrs?.from || "");
  if (!groupId.endsWith("@g.us") || !hasRequestTag(node)) return;
  if (!state.groupSettings(groupId).approvalNotice) return;
  for (const request of await pending(conn, groupId))
    await notifyRequest(conn, groupId, request);
}

module.exports = { commands, onJoinRequest, onMembershipNotification };
