const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const config = require("../config/config");
const manager = require("../functions/ownerGroupManager");

const root = path.join(__dirname, "..");

test("owner group helper normalizes numeric and full group IDs", () => {
  assert.equal(manager.normalizeGroupId("120363000000000000"), "120363000000000000@g.us");
  assert.equal(manager.normalizeGroupId("120363000000000000@g.us"), "120363000000000000@g.us");
  assert.equal(manager.normalizeGroupId("abc@g.us"), null);
  assert.equal(manager.normalizeGroupId(""), null);
});

test("group listing is stable and group lookup supports index, id and name", async () => {
  const conn = {
    async groupFetchAllParticipating() {
      return {
        z: { id: "120363000000000003@g.us", subject: "Zulu", participants: [] },
        a: { id: "120363000000000001@g.us", subject: "Alpha", participants: [] },
        b: { id: "120363000000000002@g.us", subject: "Beta", participants: [] },
      };
    },
  };

  const groups = await manager.fetchGroups(conn);
  assert.deepEqual(groups.map((g) => g.subject), ["Alpha", "Beta", "Zulu"]);
  assert.equal(manager.resolveGroup(groups, "1").group.id, "120363000000000001@g.us");
  assert.equal(manager.resolveGroup(groups, "120363000000000002").group.subject, "Beta");
  assert.equal(manager.resolveGroup(groups, "zulu").group.subject, "Zulu");
});

test("newsletter metadata follows config.botName dynamically", () => {
  const previous = config.botName;
  try {
    config.botName = "Nome Dinâmico";
    assert.equal(
      manager.newsletterContext().forwardedNewsletterMessageInfo.newsletterName,
      "Nome Dinâmico",
    );
  } finally {
    config.botName = previous;
  }
});

test("bot admin detection understands LID identities", () => {
  const conn = { user: { id: "5511000000000:12@s.whatsapp.net", lid: "999999999999@lid" } };
  const metadata = {
    participants: [
      { id: "999999999999@lid", admin: "admin" },
      { id: "111111111111@lid", admin: null },
    ],
  };
  assert.equal(manager.botIsAdmin(metadata, conn), true);
});

test("owner group commands no longer contain legacy identity/name hardcodes", () => {
  const files = [
    "commands/dono/listg.js",
    "commands/dono/gerir-grupo.js",
    "commands/dono/lidg.js",
    "commands/dono/criargrupo.js",
    "commands/dono/seradm.js",
    "commands/dono/deladm.js",
    "commands/dono/sair.js",
    "commands/dono/nuke.js",
  ];

  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /LukaModzz/i, `${file} still contains the old bot name`);
    assert.doesNotMatch(source, /5563984673123/, `${file} still contains an unrelated hardcoded number`);
  }
});

test("dangerous group exit/reset flows require explicit handling", () => {
  const manageSource = fs.readFileSync(path.join(root, "commands/dono/gerir-grupo.js"), "utf8");
  const nukeSource = fs.readFileSync(path.join(root, "commands/dono/nuke.js"), "utf8");

  assert.match(manageSource, /sair confirmar/);
  assert.match(nukeSource, /nuke confirmar/);
  assert.match(nukeSource, /isProtectedParticipant/);
});
