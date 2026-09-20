const test = require("node:test");
const assert = require("node:assert/strict");

const profile = require("../functions/profilePicture");
const extras = require("../commands/outros/tokito-extras");
const figperfil = require("../commands/sticker/figperfil");

test("profilePicture usa apenas profilePictureUrl image e tenta JID alternativo", async () => {
  const calls = [];
  const conn = {
    async profilePictureUrl(jid, type) {
      calls.push([jid, type]);
      if (jid.endsWith("@lid")) throw new Error("indisponível");
      return "https://example.com/avatar.jpg";
    },
  };

  const result = await profile.getProfilePicture(conn, [
    "12345@lid",
    "5511999999999@s.whatsapp.net",
  ]);

  assert.equal(result.url, "https://example.com/avatar.jpg");
  assert.deepEqual(calls, [
    ["12345@lid", "image"],
    ["5511999999999@s.whatsapp.net", "image"],
  ]);
});

test("novos comandos gratuitos do catálogo estão registrados", () => {
  const names = new Set(extras.map((command) => command.name));
  for (const name of [
    "getperfil",
    "getbio",
    "wikipedia",
    "npm",
    "chance",
    "quando",
    "quiz",
    "adivinhe",
  ]) {
    assert.ok(names.has(name), `comando ausente: ${name}`);
  }

  assert.equal(figperfil.name, "figperfil");
});

test("idade valida datas sem aceitar datas impossíveis", () => {
  assert.equal(extras._test.ageFromDate("31/02/2020"), null);
  assert.ok(extras._test.ageFromDate("01/01/2010"));
});
