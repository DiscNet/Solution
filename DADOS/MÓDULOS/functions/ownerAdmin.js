const os = require("os");
const path = require("path");
const state = require("./adminState");
const h = require("./adminHelpers");
const policy = require("./adminPolicy");
const configLoader = require("./configLoader");
function list(value) {
  return (
    Object.entries(value || {})
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join("\n") || "Nenhum registro."
  );
}
function groupId(value) {
  h.need(
    /^\d+(?:-\d+)?@g.us$/.test(value || ""),
    "Informe o ID completo do grupo, terminado em @g.us.",
  );
  return value;
}
async function run({ conn, msg, args, from, def }) {
  const name = def.name;
  const g = state.globalSettings();
  const change = (fn) => state.update((d) => fn(d.global));
  const catalog = () => require("./menuCatalog");
  const command = () => {
    const c = catalog().resolve(args[0]);
    h.need(c, "Comando não encontrado.");
    return c;
  };
  if (name === "botmodo") {
    h.need(
      ["publico", "pausado", "grupos", "pv"].includes(args[0]),
      "Use publico, pausado, grupos ou pv.",
    );
    change((g) => (g.mode = args[0]));
    return `Modo: ${args[0]}. O dono mantém acesso aos comandos.`;
  }
  if (name === "botestado")
    return `Modo: ${g.mode || "publico"}\nLista de grupos: ${g.allowlistEnabled ? "ativa" : "inativa"}\nComandos desativados: ${(g.disabled || []).length}\nUsuários bloqueados: ${Object.keys(g.blockedUsers || {}).length}\nCooldown padrão: ${g.defaultCooldown || 0}s`;
  if (name === "pausatexto") {
    const v = h.text(args, 300);
    change((g) => (g.pauseMessage = v));
    return "Mensagem de pausa salva.";
  }
  if (name === "cmdglobaloff" || name === "cmdglobalon") {
    const c = command();
    h.need(
      !c.permissions?.owner,
      "Comandos do dono permanecem disponíveis para recuperação.",
    );
    change((g) => {
      g.disabled = (g.disabled || []).filter((n) => n !== c.name);
      if (name === "cmdglobaloff") g.disabled.push(c.name);
    });
    return `${c.name}: ${name === "cmdglobaloff" ? "desativado" : "ativado"} globalmente.`;
  }
  if (name === "cmdglobais")
    return (g.disabled || []).join("\n") || "Nenhum comando desativado.";
  if (name === "cooldowncmd") {
    const c = command();
    h.need(
      !c.permissions?.admin && !c.permissions?.owner,
      "Comandos administrativos são isentos.",
    );
    const n = h.integer(args[1], 0, 3600);
    change((g) => {
      g.cooldowns ||= {};
      if (n) g.cooldowns[c.name] = n;
      else delete g.cooldowns[c.name];
    });
    return `Cooldown de ${c.name}: ${n}s.`;
  }
  if (name === "cooldownlista") return list(g.cooldowns);
  if (name === "cooldownpadrao") {
    const n = h.integer(args[0], 0, 3600);
    change((g) => (g.defaultCooldown = n));
    return `Cooldown padrão: ${n}s.`;
  }
  if (name === "limparcooldowns") {
    policy.cooldowns.clear();
    return "Tempos de espera em andamento encerrados. Configurações preservadas.";
  }
  if (name === "botban" || name === "botunban") {
    const jid = h.target(msg, args);
    const { isOwner } = require("./permissions");
    h.need(
      !isOwner({ key: { remoteJid: jid } }),
      "O dono não pode ser bloqueado.",
    );
    let ids = [jid];
    if (from.endsWith("@g.us")) {
      const m = await conn.groupMetadata(from);
      const p = h.member(m, jid);
      if (p) ids = h.values(p);
    }
    const reason =
      name === "botban"
        ? require("./groupAdmin").rest(msg, args).join(" ").slice(0, 180) ||
          "Bloqueado pelo dono"
        : "";
    change((g) => {
      g.blockedUsers ||= {};
      for (const id of ids)
        if (name === "botban") g.blockedUsers[id] = reason;
        else delete g.blockedUsers[id];
    });
    return name === "botban"
      ? "Acesso aos comandos bloqueado."
      : "Bloqueio de acesso removido.";
  }
  if (name === "botbanlista") return list(g.blockedUsers);
  if (name === "autorizargrupo" || name === "desautorizargrupo") {
    const jid = groupId(args[0] || from);
    if (name === "autorizargrupo") await conn.groupMetadata(jid);
    change((g) => {
      g.allowedGroups = (g.allowedGroups || []).filter((v) => v !== jid);
      if (name === "autorizargrupo") g.allowedGroups.push(jid);
    });
    return "Lista de grupos autorizados atualizada.";
  }
  if (name === "gruposautorizados")
    return (g.allowedGroups || []).join("\n") || "Nenhum grupo autorizado.";
  if (name === "restricaogrupos") {
    const v = h.onoff(args[0]);
    h.need(
      !v || (g.allowedGroups || []).length,
      "Autorize pelo menos um grupo antes de ativar.",
    );
    change((g) => (g.allowlistEnabled = v));
    return `Restrição por lista de grupos: ${v ? "on" : "off"}.`;
  }
  if (name === "botsaudavel") {
    const m = process.memoryUsage();
    return `Processo ativo há ${Math.floor(process.uptime())}s\nRAM: ${(m.rss / 1048576).toFixed(1)} MiB\nComandos carregados: ${catalog().records().length}\nErros de carregamento: ${catalog().diagnostics().errors.length}\nÚltimas falhas de execução: ${policy.errors.length}`;
  }
  if (name === "botmemoria")
    return Object.entries(process.memoryUsage())
      .map(([k, v]) => `${k}: ${(v / 1048576).toFixed(1)} MiB`)
      .join("\n");
  if (name === "botambiente")
    return `Node: ${process.version}\nSistema: ${process.platform}/${process.arch}\nCPUs: ${os.availableParallelism?.() || os.cpus().length}\nTempo do processo: ${Math.floor(process.uptime())}s\nDados: ${path.dirname(state.filePath)}`;
  if (name === "botdependencias")
    return list(require("../../../package.json").dependencies);
  if (name === "cmdauditoria") {
    const d = catalog().diagnostics();
    return `Comandos: ${d.records.length}\nColisões: ${d.collisions.length}\nFalhas de carregamento: ${d.errors.length}\nSem seção/uso: ${d.records.filter((r) => !r.command.menuCategory || !r.command.menuSection || !r.command.description).length}`;
  }
  if (name === "cmderros")
    return (
      catalog()
        .diagnostics()
        .errors.map((e) => `${path.basename(e.file)}: falha ao carregar`)
        .join("\n") || "Nenhuma falha de carregamento."
    );
  if (name === "cmdpermissoes") {
    const c = command();
    return `${c.name}\n${list(c.permissions)}\nMenu: ${c.menuCategory} - ${c.menuSection}`;
  }
  if (name === "cmdaliases") {
    const c = command();
    return `${c.name}: ${(c.aliases || c.alias || []).toString() || "sem aliases"}`;
  }
  if (name === "cmdorigem") {
    const c = command();
    const r = catalog()
      .records()
      .find((r) => r.name === c.name);
    return path.relative(path.join(__dirname, "..", ".."), r.file);
  }
  if (name === "buscarcmd") {
    const q = h.text(args, 80).toLowerCase();
    return (
      catalog()
        .records()
        .filter((r) =>
          (r.name + " " + r.command.description + " " + r.command.menuSection)
            .toLowerCase()
            .includes(q),
        )
        .slice(0, 40)
        .map(
          (r) =>
            `${r.command.menuCategory} - ${r.command.menuSection}\n${r.name} | ${r.command.description}`,
        )
        .join("\n") || "Nenhum resultado."
    );
  }
  if (name === "botestatisticas") {
    let ok = 0,
      error = 0,
      denied = 0;
    for (const s of policy.stats.values()) {
      ok += s.ok;
      error += s.error;
      denied += s.denied;
    }
    return `Desde o início deste processo:\nExecutados: ${ok}\nFalhas: ${error}\nNegados: ${denied}`;
  }
  if (name === "topcomandos")
    return (
      [...policy.stats]
        .sort((a, b) => b[1].ok - a[1].ok)
        .slice(0, 20)
        .map(([n, s]) => `${n}: ${s.ok}`)
        .join("\n") || "Nenhum comando executado neste processo."
    );
  if (name === "cmdestatistica") {
    const c = command();
    return list(policy.stats.get(c.name));
  }
  if (name === "zerarestatisticas") {
    h.need(args[0] === "confirmar", "Use zerarestatisticas confirmar.");
    policy.stats.clear();
    policy.errors.length = 0;
    return "Estatísticas deste processo zeradas.";
  }
  if (name === "ultimoserros")
    return (
      policy.errors.map((e) => `${e.at}: ${e.name}`).join("\n") ||
      "Nenhuma falha registrada neste processo."
    );
  if (name === "exportaradmin") {
    await conn.sendMessage(
      from,
      {
        document: Buffer.from(JSON.stringify(state.read(), null, 2)),
        mimetype: "application/json",
        fileName: "administracao.json",
      },
      { quoted: msg },
    );
    return;
  }
  if (name === "botnome") {
    const v = h.text(args, 80);
    configLoader.salvarConfig({ botName: v });
    return "Nome do bot atualizado nos menus.";
  }
  if (name === "dononome") {
    const v = h.text(args, 80);
    configLoader.salvarConfig({ ownerName: v });
    return "Nome de exibição do dono atualizado.";
  }
  throw new Error("Unknown owner operation: " + name);
}
module.exports = { run };
