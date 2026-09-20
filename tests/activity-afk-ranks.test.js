const test = require("node:test");
const assert = require("node:assert/strict");

const activity = require("../functions/activitySystem");
const afk = require("../functions/afk");
const ranks = require("../commands/brincadeiras/ranks");
const rankativo = require("../commands/outros/rankativo");
const atividades = require("../commands/admins/atividades");

test("atividade calcula pontos como a Tokito", () => {
  const stats = activity.normalizeStats({
    total: 30,
    comandos: 5,
    audios: 2,
    figurinhas: 3,
    documentos: 1,
    fotos: 4,
    videos: 2,
    textos: 13,
  });
  assert.equal(stats.pontos, 17);
  assert.equal(stats.total, 30);
});

test("rankativo foi substituído por atividade real", () => {
  assert.equal(rankativo.name, "rankativo");
  assert.equal(rankativo.aliases.includes("ativo"), false);
  assert.equal(rankativo.permissions.group, true);
});

test("atividades e inativos exigem admin", () => {
  const names = new Set(atividades.map((c) => c.name));
  assert.ok(names.has("atividades"));
  assert.ok(names.has("inativos"));
  for (const command of atividades) {
    assert.equal(command.permissions.group, true);
    assert.equal(command.permissions.admin, true);
  }
});

test("ranks de brincadeira usam motor compartilhado", () => {
  const names = new Set(ranks.map((c) => c.name));
  for (const name of [
    "rankbeta",
    "rankfalido",
    "rankgado",
    "ranklouca",
    "ranklouco",
    "rankotaku",
    "ranksigma",
    "rankbaiano",
    "rankbaiana",
    "rankcarioca",
    "rankcorno",
    "rankcasal",
  ]) {
    assert.ok(names.has(name), `faltando ${name}`);
  }
});

test("AFK suporta fluxo por grupo e aliases do estilo Tokito", () => {
  assert.equal(typeof afk.processMessage, "function");
  assert.equal(afk.tempo(90061000), "1d 1h 1m 1s");
  const command = require("../commands/outros/afk");
  for (const alias of ["off", "ausente", "on", "ativo", "voltei"]) {
    assert.ok(command.aliases.includes(alias));
  }
});
