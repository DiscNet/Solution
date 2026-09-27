const state = require("./adminState");
const h = require("./adminHelpers");
const { isAdminParticipant, sameIdentity, botIdentityCandidates } = require("./permissions");
const block = require("./blockcmd");
const ui = require("./ui");
const autoban = require("./groupAutoban");
function rest(msg, args) {
  return h.context(msg).participant &&
    !h.context(msg).mentionedJid?.length &&
    !/^@?\+?\d/.test(args[0] || "")
    ? args
    : args.slice(1);
}
function list(object) {
  return (
    Object.entries(object || {})
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join("\n") || "Nenhum registro."
  );
}
async function run({ conn, msg, args, from, def }) {
  const name = def.name;
  const g = state.groupSettings(from);
  const change = (fn) => state.update((d) => fn(state.group(d, from)));
  if (["advertir", "retiraradv", "advertencias", "limparadv"].includes(name)) {
    const { jid, p, metadata } = await h.resolveMember(conn, from, msg, args, {
      protect: name === "advertir",
    });
    if (name === "advertencias")
      return (
        (g.warnings?.[jid] || [])
          .map(
            (w, i) =>
              `${i + 1}. ${new Date(w.at).toLocaleString("pt-BR")} — ${w.reason}`,
          )
          .join("\n") || "Sem advertências."
      );
    if (name === "limparadv") {
      change((g) => {
        delete (g.warnings || {})[jid];
      });
      return "Advertências apagadas.";
    }
    if (name === "retiraradv") {
      const n = change((g) => {
        const a = (g.warnings || {})[jid] || [];
        h.need(a.length, "Esse membro não tem advertências.");
        a.pop();
        return a.length;
      });
      return `Advertência retirada. Restam ${n}.`;
    }
    const reason = h.text(rest(msg, args), 180);
    const n = change((g) => {
      g.warnings ||= {};
      const a = (g.warnings[jid] ||= []);
      h.need(
        a.length < 100,
        "Limite de histórico atingido. Revise e limpe as advertências.",
      );
      a.push({ at: Date.now(), actor: h.actor(msg), reason });
      return a.length;
    });
    const limit = state.groupSettings(from).warnLimit || 3;
    if (n >= limit && autoban.isEnabled(from)) {
      const result = await autoban.tryAutoban(conn, { from, msg, metadata, participant: p, reason: "limite de advertências" });
      if (result.removed) {
        change(group => { delete (group.warnings || {})[jid]; });
      }
      return ui.adminCard("Advertência", [
        ui.adminRow("⚠️", "Avisos", `${n}/${limit}`),
        ui.adminRow("📝", "Motivo", reason),
        ui.adminRow(result.removed ? "✅" : "❌", "Autoban",
          ui.smallcaps(result.removed ? "membro removido" : result.error || "não concluído")),
      ]);
    }
    return ui.adminCard("Advertência", [
      ui.adminRow("⚠️", "Avisos", `${n}/${limit}`),
      ui.adminRow("📝", "Motivo", reason),
      ...(n >= limit ? [ui.adminRow("🛡️", "Limite", ui.smallcaps("atingido; autoban desligado"))] : []),
    ]);
  }
  if (name === "limiteadv") {
    const n = h.integer(args[0], 1, 20);
    change((g) => (g.warnLimit = n));
    return ui.adminCard("Limite de advertências", [
      ui.adminRow("⚠️", "Limite", n),
      ui.adminRow("🛡️", "Autoban", ui.smallcaps(autoban.isEnabled(from) ? "ativo" : "inativo")),
    ]);
  }
  if (name === "listaadv")
    return list(
      Object.fromEntries(
        Object.entries(g.warnings || {})
          .filter(([, v]) => v.length)
          .map(([k, v]) => [k, v.length]),
      ),
    );
  if (["mutar", "desmutar"].includes(name)) {
    const { jid } = await h.resolveMember(conn, from, msg, args, {
      protect: name === "mutar",
    });
    if (name === "mutar") {
      const n = h.integer(rest(msg, args)[0], 1, 10080);
      change((g) => {
        g.mutes ||= {};
        g.mutes[jid] = Date.now() + n * 60000;
      });
      return `Mensagens desse membro serão apagadas durante ${n} minutos.`;
    }
    change((g) => {
      delete (g.mutes || {})[jid];
    });
    return "Silenciamento removido.";
  }
  if (name === "listamutes")
    return list(
      Object.fromEntries(
        Object.entries(g.mutes || {})
          .filter(([, v]) => v > Date.now())
          .map(([k, v]) => [k, new Date(v).toLocaleString("pt-BR")]),
      ),
    );
  if (name === "setregras") {
    const v = h.text(args, 2000);
    change((g) => (g.rules = v));
    return "Regras salvas. Use regras para consultar.";
  }
  if (name === "regras") return g.rules || "Nenhuma regra cadastrada.";
  if (name === "delregras") {
    change((g) => (g.rules = ""));
    return "Regras removidas.";
  }
  if (name === "salvarnota") {
    const k = h.key(args[0]);
    const v = h.text(args.slice(1), 2000);
    change((g) => {
      g.notes ||= {};
      h.need(
        Object.keys(g.notes).length < 50 || Object.hasOwn(g.notes, k),
        "Limite de 50 notas atingido.",
      );
      g.notes[k] = v;
    });
    return `Nota ${k} salva.`;
  }
  if (name === "nota") {
    const k = h.key(args[0]);
    h.need(Object.hasOwn(g.notes || {}, k), "Nota não encontrada.");
    return g.notes[k];
  }
  if (name === "notas")
    return (
      Object.keys(g.notes || {})
        .sort()
        .join("\n") || "Nenhuma nota salva."
    );
  if (name === "delnota") {
    const k = h.key(args[0]);
    change((g) => {
      h.need(Object.hasOwn(g.notes || {}, k), "Nota não encontrada.");
      delete g.notes[k];
    });
    return "Nota removida.";
  }
  const toggles = {
    antisticker: "sticker",
    anticontato: "contato",
    antilocalizacao: "localizacao",
    antienquete: "enquete",
    antiencaminhado: "encaminhado",
  };
  if (toggles[name]) {
    const v = h.onoff(args[0]);
    change((g) => {
      g.filters ||= {};
      g.filters[toggles[name]] = v;
    });
    return `${name}: ${v ? "ativado" : "desativado"}.`;
  }
  if (name === "antimencao" || name === "antilongo") {
    const n = h.integer(args[0], 0, name === "antimencao" ? 100 : 10000);
    change((g) => {
      g.filters ||= {};
      g.filters[name === "antimencao" ? "mencao" : "longo"] = n;
    });
    return `${name}: ${n || "desativado"}.`;
  }
  if (name === "modolento") {
    const n = h.integer(args[0], 0, 3600);
    change((g) => (g.slowmode = n));
    return `Intervalo entre mensagens: ${n}s. Administradores são isentos.`;
  }
  if (name === "filtros") {
    const entries = Object.entries(g.filters || {});
    return ui.adminCard("Filtros do grupo", entries.length
      ? entries.map(([key, value]) => ui.adminRow("🛡️", key, typeof value === "boolean" ? (value ? "ativo" : "inativo") : value))
      : ["⎾🛡️⏌ Nenhum filtro configurado."]);
  }
  if (name === "configgrupo") {
    const antiSpam = require("./antispam").isAntispamAtivo(from);
    return ui.adminCard("Configuração do grupo", [
      ui.adminRow("⚠️", "Limite de advertências", g.warnLimit || 3),
      ui.adminRow("⏳", "Modo lento", `${g.slowmode || 0}s`),
      ui.adminRow("🛡️", "Anti-spam", antiSpam ? "ativo" : "inativo"),
      ui.adminRow("🚫", "Autoban", g.autoban ? "ativo" : "inativo"),
      ui.adminRow("📥", "Aprovação", g.approvalNotice ? "avisos ativos" : "avisos inativos"),
      ui.adminRow("🤖", "Autoaprovação", g.autoApprove ? "ativa" : "inativa"),
      ui.adminRow("🔒", "Comandos só admins", g.commandsAdminOnly ? "sim" : "não"),
      ui.adminRow("📝", "Regras", g.rules ? "cadastradas" : "não cadastradas"),
      ui.adminRow("📌", "Notas", Object.keys(g.notes || {}).length),
      ui.adminRow("🧊", "Filtros", Object.entries(g.filters || {}).filter(([,v]) => Boolean(v)).length),
      ui.adminRow("⏱️", "Cooldowns", Object.keys(g.cooldowns || {}).length),
    ]);
  }
  if (name === "cmdsadmin") {
    const v = h.onoff(args[0]);
    change((g) => (g.commandsAdminOnly = v));
    return `Comandos exclusivos para administradores: ${v ? "on" : "off"}.`;
  }
  if (name === "cmdespera") {
    const { resolve } = require("./menuCatalog");
    const cmd = resolve(args[0]);
    h.need(cmd, "Comando não encontrado.");
    h.need(
      !cmd.permissions?.owner && !cmd.permissions?.admin,
      "Comandos administrativos são isentos de cooldown.",
    );
    const n = h.integer(args[1], 0, 3600);
    change((g) => {
      g.cooldowns ||= {};
      if (n) g.cooldowns[cmd.name] = n;
      else delete g.cooldowns[cmd.name];
    });
    return `Intervalo de ${cmd.name}: ${n}s.`;
  }
  if (name === "cmdesperas") return list(g.cooldowns);
  if (name === "cmdsbloqueados") {
    const d = block.loadConfig(true)[from] || {};
    return d.bloquearTodos
      ? "Todos os comandos estão bloqueados."
      : (d.bloqueados || []).join("\n") || "Nenhum comando bloqueado.";
  }
  if (name === "linkgrupo")
    return "https://chat.whatsapp.com/" + (await conn.groupInviteCode(from));
  if (name === "revogarlink") {
    await conn.groupRevokeInvite(from);
    return "Link anterior revogado. Use linkgrupo para consultar o novo.";
  }
  if (name === "editargrupo") {
    h.need(["admins", "todos"].includes(args[0]), "Use admins ou todos.");
    await conn.groupSettingUpdate(
      from,
      args[0] === "admins" ? "locked" : "unlocked",
    );
    return `Edição de nome, descrição e imagem: ${args[0]}.`;
  }
  if (name === "infogrupo") {
    const m = await conn.groupMetadata(from);
    return ui.adminCard("Informações do grupo", [
      ui.adminRow("👥", "Grupo", m.subject || "Sem nome"),
      ui.adminRow("🆔", "ID/LID", `\`${from}\``),
      ui.adminRow("🔹", "Membros", m.participants?.length || 0),
      ui.adminRow("👑", "Admins", (m.participants || []).filter(isAdminParticipant).length),
      ui.adminRow("🔒", "Mensagens", m.announce ? "somente admins" : "todos"),
      ui.adminRow("🛠️", "Edição", m.restrict ? "somente admins" : "todos"),
      ui.adminRow("📝", "Descrição", String(m.desc || "Sem descrição").replace(/\s+/g, " ").slice(0, 1200)),
    ]);
  }
  if (name === "veradmin") {
    const { p } = await h.resolveMember(conn, from, msg, args);
    return `Cargo: ${p.admin === "superadmin" ? "criador" : isAdminParticipant(p) ? "administrador" : "membro"}.`;
  }
  if (name === "exportarmembros") {
    const m = await conn.groupMetadata(from);
    const rows = [
      "jid,cargo",
      ...m.participants.map((p) => `${h.identity(p)},${p.admin || "membro"}`),
    ];
    await conn.sendMessage(
      from,
      {
        document: Buffer.from(rows.join("\n")),
        mimetype: "text/csv",
        fileName: "membros.csv",
      },
      { quoted: msg },
    );
    return;
  }
  if (name === "apagarmensagem") {
    const c = h.context(msg);
    h.need(
      c.stanzaId && c.quotedMessage && c.participant,
      "Responda à mensagem que deseja apagar.",
    );
    const fromMe = botIdentityCandidates(conn)
      .some(jid => sameIdentity(c.participant, jid));
    await conn.sendMessage(from, {
      delete: {
        remoteJid: from,
        id: c.stanzaId,
        participant: c.participant,
        fromMe,
      },
    });
    return;
  }
  throw new Error("Unknown group admin operation: " + name);
}
module.exports = { run, rest };
