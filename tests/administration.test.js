const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "grimm-admin-test-"));
process.env.BOT_ADMIN_DATA_DIR = temporary;
process.env.BOT_CONFIG_PATH = path.join(temporary, "runtime.json");
process.env.BOT_BLOCKCMD_PATH = path.join(temporary, "blockcmd.json");
process.env.BOT_MODLOG_PATH = path.join(temporary, "modlog.json");
const configLoader = require("../functions/configLoader");
configLoader.salvarConfig({
  ownerNumber: "559900000001",
  ownerLid: "900001@lid",
  botName: "Test",
  ownerName: "Owner",
  prefix: ".",
});
const state = require("../functions/adminState");
const policy = require("../functions/adminPolicy");
const permissions = require("../functions/permissions");
const catalog = require("../functions/menuCatalog");
const registry = require("../functions/commandRegistry");
const owner = "900001@lid",
  admin = "900002@lid",
  member = "900003@lid",
  bot = "900004@lid",
  group = "120000000001@g.us",
  other = "120000000002@g.us";
let messages = [],
  actions = [],
  botAdmin = true;
const participants = [
  { id: owner, phoneNumber: "559900000001@s.whatsapp.net" },
  { id: admin, phoneNumber: "559900000002@s.whatsapp.net", admin: "admin" },
  { id: member, phoneNumber: "559900000003@s.whatsapp.net" },
  { id: bot, phoneNumber: "559900000004@s.whatsapp.net", admin: "admin" },
];
const conn = {
  user: { id: "559900000004:2@s.whatsapp.net", lid: bot },
  groupMetadata: async (jid) => ({
    id: jid,
    subject: "Test group",
    desc: "Description",
    participants: participants.map((p) =>
      p.id === bot ? { ...p, admin: botAdmin ? "admin" : null } : { ...p },
    ),
  }),
  sendMessage: async (to, content) => {
    messages.push({ to, ...content });
    return { key: { id: "sent" } };
  },
  groupParticipantsUpdate: async (...a) => {
    actions.push(a);
    return [{ status: "200" }];
  },
  groupInviteCode: async () => "invite",
  groupRevokeInvite: async (...a) => {
    actions.push(a);
    return "new";
  },
  groupSettingUpdate: async (...a) => {
    actions.push(a);
  },
};
function msg(sender = admin, from = group, c = {}) {
  return {
    key: {
      remoteJid: from,
      participant: from.endsWith("@g.us") ? sender : undefined,
      id: "incoming",
    },
    pushName: "Tester",
    message: { extendedTextMessage: { text: "message", contextInfo: c } },
  };
}
function marked(sender = admin, target = member) {
  return msg(sender, group, { mentionedJid: [target] });
}
async function run(
  name,
  args = [],
  message = msg(),
  from = message.key.remoteJid,
) {
  const command = catalog.resolve(name);
  assert.ok(command, name);
  messages = [];
  return command.execute(conn, message, args, from);
}
function reset() {
  state.update((d) => {
    d.global = {};
    d.groups = {};
  });
  require("../functions/blockcmd").saveConfig({});
  policy.cooldowns.clear();
  policy.slow.clear();
  messages = [];
  actions = [];
  botAdmin = true;
}
test.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
test("1000+ commands load with metadata while generated families stay out of menu payloads", () => {
  const d = catalog.diagnostics();
  assert.equal(d.errors.length, 0);
  assert.equal(d.collisions.length, 0);
  assert.ok(d.records.length >= 1000, `catalog too small: ${d.records.length}`);

  const visible = d.records.filter((r) => r.command.hidden !== true);
  const hidden = d.records.filter((r) => r.command.hidden === true);
  assert.ok(hidden.length >= 1000, `generated catalog too small: ${hidden.length}`);

  const pages = catalog.pages();
  const text = pages.join("\n");
  for (const r of d.records) {
    assert.ok(
      r.command.menuCategory && r.command.menuSection && r.command.description,
      r.name,
    );
    assert.ok(r.command.description.length <= 120, r.name);
  }
  for (const r of visible) {
    assert.equal(
      text.split("\n").filter((l) => l.startsWith("." + r.name + " | ")).length,
      1,
      r.name,
    );
  }
  for (const r of hidden) {
    assert.equal(
      text.split("\n").filter((l) => l.startsWith("." + r.name + " | ")).length,
      0,
      r.name,
    );
  }
  assert.ok(pages.every((p) => p.length <= 3200));
  assert.ok(
    catalog
      .pages({ category: "RPG", section: "Pets" })
      .join("\n")
      .includes(".pets | Uso: .pets [equipar nome|desequipar]"),
  );
  assert.equal(catalog.resolve("figurinha").name, "s");
  assert.equal(catalog.resolve("conv-comprimento-km-m").name, "conv-comprimento-km-m");
});
test("all added owner/group commands deny unauthorized callers without mutations", async () => {
  reset();
  const added = catalog
    .records()
    .filter((r) => /adminHelpers/.test(fs.readFileSync(r.file, "utf8")));
  for (const r of added) {
    if (!r.command.permissions.owner && !r.command.permissions.admin) continue;
    const before = JSON.stringify(state.read());
    assert.equal(
      await r.command.execute(conn, msg(member), [], group),
      false,
      r.name,
    );
    assert.equal(JSON.stringify(state.read()), before, r.name);
  }
  assert.equal(actions.length, 0);
});
test("owner identity respects JID domains and group alternate phone numbers", async () => {
  assert.equal(permissions.sameIdentity("900001@s.whatsapp.net", owner), false);
  assert.equal(permissions.isOwner(msg("900001@s.whatsapp.net")), false);
  const m = msg("999999@lid");
  m.key.participantAlt = "559900000001@s.whatsapp.net";
  assert.equal(permissions.isOwner(m), true);
  const p = await permissions.checkCommandPermissions({
    conn,
    msg: msg("559900000002@s.whatsapp.net"),
    from: group,
    command: { permissions: { admin: true, botAdmin: true } },
  });
  assert.equal(p.ok, true);
});
test("warning lifecycle, isolation, invalid input and protected targets", async () => {
  reset();
  await run("advertir", ["@member", "Regra", "descumprida"], marked());
  assert.equal(state.groupSettings(group).warnings[member].length, 1);
  await run("advertencias", ["@member"], marked());
  assert.match(messages[0].text, /Regra descumprida/);
  await run("limiteadv", ["1"]);
  await run("listaadv");
  assert.match(messages[0].text, /900003/);
  await run("retiraradv", ["@member"], marked());
  assert.equal(state.groupSettings(group).warnings[member].length, 0);
  assert.equal(await run("advertir", ["@member"], marked()), false);
  assert.equal(
    await run("advertir", ["@admin", "motivo"], marked(admin, admin)),
    false,
  );
  await run("advertir", ["@member", "teste"], marked());
  await run("limparadv", ["@member"], marked());
  assert.equal(state.groupSettings(group).warnings[member], undefined);
  assert.deepEqual(state.groupSettings(other).warnings, {});
});
test("timed mute deletes messages, expires and requires bot admin", async () => {
  reset();
  await run("mutar", ["@member", "1"], marked());
  assert.equal(
    await policy.moderateMessage(conn, msg(member), group, "oi"),
    true,
  );
  assert.ok(messages.at(-1).delete);
  await run("listamutes");
  assert.match(messages[0].text, /900003/);
  assert.equal(
    await policy.moderateMessage(conn, msg(admin), group, "oi"),
    false,
  );
  await run("desmutar", ["@member"], marked());
  assert.equal(
    await policy.moderateMessage(conn, msg(member), group, "oi"),
    false,
  );
  state.update((d) => (state.group(d, group).mutes[member] = Date.now() - 1));
  assert.equal(
    await policy.moderateMessage(conn, msg(member), group, "oi"),
    false,
  );
  botAdmin = false;
  assert.equal(await run("mutar", ["@member", "5"], marked()), false);
});
test("all seven filters and slowmode apply to content including wrapped messages", async () => {
  reset();
  const cases = [
    ["antisticker", "stickerMessage"],
    ["anticontato", "contactMessage"],
    ["antilocalizacao", "locationMessage"],
    ["antienquete", "pollCreationMessageV3"],
  ];
  for (const [name, kind] of cases) {
    await run(name, ["on"]);
    const m = msg(member);
    m.message = { ephemeralMessage: { message: { [kind]: {} } } };
    assert.equal(await policy.moderateMessage(conn, m, group, ""), true, name);
    await run(name, ["off"]);
    assert.equal(await policy.moderateMessage(conn, m, group, ""), false, name);
  }
  await run("antiencaminhado", ["on"]);
  assert.equal(
    await policy.moderateMessage(
      conn,
      msg(member, group, { isForwarded: true }),
      group,
      "x",
    ),
    true,
  );
  await run("antiencaminhado", ["off"]);
  await run("antimencao", ["1"]);
  assert.equal(
    await policy.moderateMessage(
      conn,
      msg(member, group, { mentionedJid: [owner, admin] }),
      group,
      "x",
    ),
    true,
  );
  await run("antimencao", ["0"]);
  await run("antilongo", ["5"]);
  assert.equal(
    await policy.moderateMessage(conn, msg(member), group, "123456"),
    true,
  );
  await run("antilongo", ["0"]);
  await run("modolento", ["10"]);
  assert.equal(
    await policy.moderateMessage(conn, msg(member), group, "a"),
    false,
  );
  assert.equal(
    await policy.moderateMessage(conn, msg(member), group, "b"),
    true,
  );
  await run("modolento", ["0"]);
  await run("filtros");
  assert.match(messages[0].text, /sticker/);
  assert.equal(await run("antilongo", ["-1"]), false);
  assert.equal(await run("antisticker", ["maybe"]), false);
});
test("rules and notes validate input, update, isolate groups and remain readable by members", async () => {
  reset();
  await run("setregras", ["Seja", "respeitoso"]);
  await run("regras", [], msg(member));
  assert.equal(messages[0].text, "Seja respeitoso");
  await run("delregras");
  await run("salvarnota", ["agenda", "Reunião", "amanhã"]);
  await run("nota", ["agenda"], msg(member));
  assert.equal(messages[0].text, "Reunião amanhã");
  await run("notas", [], msg(member));
  assert.match(messages[0].text, /agenda/);
  assert.equal(await run("salvarnota", ["__proto__", "x"]), false);
  assert.equal(await run("nota", ["agenda"], msg(member, other)), false);
  await run("delnota", ["agenda"]);
  assert.deepEqual(state.groupSettings(group).notes, {});
});
test("group configuration, canonical blocks, aliases and cooldowns are enforced in executor policy", async () => {
  reset();
  await run("blockcmd", ["figurinha"]);
  assert.deepEqual(
    require("../functions/blockcmd").loadConfig(true)[group].bloqueados,
    ["s"],
  );
  await run("cmdsbloqueados");
  assert.match(messages[0].text, /s/);
  const check = (command) =>
    policy.commandDenial({
      conn,
      msg: msg(member),
      from: group,
      command,
      permission: { ok: true },
    });
  assert.match(await check(catalog.resolve("figurinha")), /bloqueado/);
  await run("unblockcmd", ["s"]);
  assert.equal(await check(catalog.resolve("figurinha")), null);
  await run("cmdespera", ["ping", "10"]);
  assert.equal(await check(catalog.resolve("ping")), null);
  assert.match(await check(catalog.resolve("ping")), /Aguarde/);
  await run("cmdesperas");
  assert.match(messages[0].text, /ping/);
  await run("cmdsadmin", ["on"]);
  assert.match(await check(catalog.resolve("ping")), /administradores/);
  await run("cmdsadmin", ["off"]);
  await run("configgrupo");
  assert.match(messages[0].text, /Advertências/);
  assert.equal(await run("blockcmd", ["unblockcmd"]), false);
  assert.equal(await run("blockcmd", ["inexistente"]), false);
});
test("WhatsApp group operations check acknowledgements and resolve phone/LID targets", async () => {
  reset();
  await run("linkgrupo");
  assert.equal(messages[0].text, "https://chat.whatsapp.com/invite");
  await run("revogarlink");
  await run("editargrupo", ["admins"]);
  assert.equal(actions.at(-1)[1], "locked");
  await run("infogrupo");
  assert.match(messages[0].text, /Membros: 4/);
  await run("veradmin", ["@admin"], marked(admin, admin));
  assert.match(messages[0].text, /administrador/);
  await run("exportarmembros");
  assert.match(messages[0].document.toString(), /jid,cargo/);
  const quoted = msg(admin, group, { participant: member, stanzaId: "quoted" });
  await run("apagarmensagem", [], quoted);
  assert.equal(messages[0].delete.id, "quoted");
  await run("ban", ["559900000003"]);
  assert.deepEqual(actions.at(-1), [
    group,
    ["559900000003@s.whatsapp.net"],
    "remove",
  ]);
  const saved = conn.groupParticipantsUpdate;
  conn.groupParticipantsUpdate = async () => [{ status: "403" }];
  assert.equal(await run("ban", ["559900000003"]), false);
  assert.doesNotMatch(messages[0].text, /confirmada/);
  conn.groupParticipantsUpdate = saved;
  assert.equal(await run("ban", ["@owner"], marked(admin, owner)), false);
});
test("owner access modes, bans and group allowlist are effective and recoverable", async () => {
  reset();
  const check = (m = msg(member), from = group) =>
    policy.commandDenial({
      conn,
      msg: m,
      from,
      command: catalog.resolve("ping"),
      permission: { ok: true },
    });
  await run("botmodo", ["pausado"], msg(owner));
  await run("pausatexto", ["Volto", "logo"], msg(owner));
  assert.equal(await check(), "Volto logo");
  assert.equal(await check(msg(owner)), null);
  await run("botmodo", ["pv"], msg(owner));
  assert.match(await check(), /privado/);
  await run("botmodo", ["grupos"], msg(owner));
  assert.match(
    await check(
      msg("559900000003@s.whatsapp.net", "559900000003@s.whatsapp.net"),
      "559900000003@s.whatsapp.net",
    ),
    /grupos/,
  );
  await run("botmodo", ["publico"], msg(owner));
  await run("botban", ["@member", "motivo"], marked(owner));
  assert.match(await check(), /bloqueado/);
  await run("botbanlista", [], msg(owner));
  assert.match(messages[0].text, /motivo/);
  await run("botunban", ["@member"], marked(owner));
  assert.equal(await check(), null);
  await run("autorizargrupo", [group], msg(owner));
  await run("gruposautorizados", [], msg(owner));
  assert.match(messages[0].text, /@g.us/);
  await run("restricaogrupos", ["on"], msg(owner));
  assert.match(await check(msg(member, other), other), /não autorizado/);
  await run("desautorizargrupo", [group], msg(owner));
  assert.match(await check(), /não autorizado/);
  await run("restricaogrupos", ["off"], msg(owner));
  await run("botestado", [], msg(owner));
  assert.match(messages[0].text, /publico/);
});
test("owner global command toggles, cooldowns, diagnostics, statistics and private export", async () => {
  reset();
  const own = msg(owner);
  await run("cmdglobaloff", ["figurinha"], own);
  assert.deepEqual(state.globalSettings().disabled, ["s"]);
  await run("cmdglobais", [], own);
  assert.equal(messages[0].text, "s");
  await run("cmdglobalon", ["s"], own);
  await run("cooldowncmd", ["ping", "3"], own);
  await run("cooldownlista", [], own);
  assert.match(messages[0].text, /ping/);
  await run("cooldownpadrao", ["2"], own);
  await run("limparcooldowns", [], own);
  for (const name of [
    "botsaudavel",
    "botmemoria",
    "botambiente",
    "botdependencias",
    "cmdauditoria",
    "cmderros",
    "botestatisticas",
    "topcomandos",
    "ultimoserros",
  ]) {
    await run(name, [], own);
    assert.ok(messages[0].text, name);
  }
  for (const name of [
    "cmdpermissoes",
    "cmdaliases",
    "cmdorigem",
    "cmdestatistica",
  ]) {
    await run(name, ["ping"], own);
    assert.ok(messages[0].text, name);
  }
  await run("buscarcmd", ["ping"], own);
  assert.match(messages[0].text, /ping/);
  await run("zerarestatisticas", ["confirmar"], own);
  await run("botnome", ["New", "Bot"], own);
  assert.equal(configLoader.getConfig().botName, "New Bot");
  await run("dononome", ["New", "Owner"], own);
  assert.equal(configLoader.getConfig().ownerName, "New Owner");
  assert.equal(await run("exportaradmin", [], own), false);
  await run(
    "exportaradmin",
    [],
    msg("559900000001@s.whatsapp.net", "559900000001@s.whatsapp.net"),
  );
  assert.equal(JSON.parse(messages[0].document).version, 1);
  assert.ok(!messages[0].document.toString().includes("ownerNumber"));
});
test("maintenance changes and command executor handle aliases, failures and moderation log", async () => {
  reset();
  const { executeCommand } = require("../functions/commandExecutor");
  const own = msg(owner);
  await run("addmanutencao", ["add", "figurinha"], own);
  await run("manutencao", ["s"], own);
  assert.match(messages[0].text, /em manutenção/);
  assert.ok(
    await policy.commandDenial({
      conn,
      msg: msg(member),
      from: group,
      command: catalog.resolve("s"),
      permission: { ok: true },
    }),
  );
  await run("addmanutencao", ["del", "s"], own);
  let executed = false;
  await executeCommand({
    conn,
    msg: msg(member),
    from: group,
    command: {
      name: "fake",
      permissions: { owner: true },
      execute: async () => {
        executed = true;
      },
    },
  });
  assert.equal(executed, false);
  await executeCommand({
    conn,
    msg: marked(),
    from: group,
    args: ["@member", "reason"],
    command: catalog.resolve("advertir"),
  });
  assert.equal(
    require("../functions/modLog").list(group)[0].command,
    "advertir",
  );
  const before = require("../functions/modLog").list(group).length;
  await executeCommand({
    conn,
    msg: marked(),
    from: group,
    args: ["@member"],
    command: catalog.resolve("advertir"),
  });
  assert.equal(require("../functions/modLog").list(group).length, before);
  await executeCommand({
    conn,
    msg: msg(),
    from: group,
    command: {
      name: "broken",
      execute: async () => {
        throw new Error("failure");
      },
    },
  });
  assert.equal(policy.stats.get("broken").error, 1);
});
test("menu navigation preserves all pages, sections, aliases and custom prefixes", async () => {
  reset();
  const body = () => messages[0]?.text || messages[0]?.caption || "";
  await run("menu", ["adm"]);
  assert.match(body(), /\.advertir/);
  await run("menu", ["rpg", "jornada"]);
  assert.match(body(), /\.jornada/);
  reset();
  await run("menucoins");
  assert.match(body(), /\.coins/);
  reset();
  await run("menupokemon");
  assert.match(body(), /\.lojapokemon/);
  await run("menugeral");
  assert.ok(messages[0].image);
  assert.match(body(), /Todos os comandos/);
  assert.doesNotMatch(body(), /Próxima:/);
  configLoader.salvarConfig({ prefix: "!" });
  await run("menuadm");
  assert.match(body(), /!advertir/);
  await run("info", ["figurinha"]);
  assert.match(body(), /!s/);
  configLoader.salvarConfig({ prefix: "." });
});
test("settings survive module reload and unrelated updates", () => {
  reset();
  state.update((d) => {
    state.group(d, group).rules = "Persist";
    d.global.mode = "grupos";
  });
  delete require.cache[require.resolve("../functions/adminState")];
  const reloaded = require("../functions/adminState");
  assert.equal(reloaded.groupSettings(group).rules, "Persist");
  reloaded.update((d) => (d.global.defaultCooldown = 8));
  assert.equal(reloaded.groupSettings(group).rules, "Persist");
  assert.equal(reloaded.globalSettings().mode, "grupos");
});
