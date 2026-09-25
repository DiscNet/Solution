const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const command = require("../commands/brincadeiras/akinator");
const tokitoApi = require("../functions/tokitoApi");

test("Akinator usa a arquitetura Tokito V10", () => {
  assert.equal(command.name, "akinator");
  assert.ok(command.aliases.includes("aki"));
  assert.equal(command.menuCategory, "Brincadeiras");
  assert.equal(command.menuSection, "Jogos");
  assert.equal(command.permissions.group, true);
  assert.match(command.usage, /iniciar/);
  assert.match(command.usage, /voltar/);
  assert.match(command.usage, /provavelmentenao/);

  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "brincadeiras", "akinator.js"),
    "utf8"
  );

  assert.match(source, /\/api\/akinator\/start/);
  assert.match(source, /\/api\/akinator\/answer/);
  assert.match(source, /\/api\/akinator\/back/);
  assert.match(source, /\/api\/akinator\/end/);
  assert.match(source, /\/canvas\/akinator/);
  assert.doesNotMatch(source, /akinator-client/);
});

test("Akinator normaliza respostas e extrai resultado da API", () => {
  assert.equal(command._internals.norm("  NÃO SEI "), "nao sei");

  const payload = command._internals.payload({
    status: true,
    resultado: { pergunta: "É real?" },
  });
  assert.equal(payload.pergunta, "É real?");

  const guess = command._internals.guessInfo({
    personagem: {
      nome: "Goku",
      descricao: "Saiyajin",
      foto: "https://example.com/goku.jpg",
    },
  });
  assert.equal(guess.name, "Goku");
  assert.equal(guess.desc, "Saiyajin");
  assert.equal(guess.photo, "https://example.com/goku.jpg");
});

test("Akinator inicia uma sessão usando a Tokito API", async () => {
  const originalGet = tokitoApi.get;
  const originalUrl = tokitoApi.url;
  const sent = [];
  const group = "120363000000000000@g.us";

  command._sessions.clear();

  tokitoApi.get = async (route, params) => {
    assert.equal(route, "/api/akinator/start");
    assert.match(params.id, /120363000000000000@g\.us_/);
    return {
      status: true,
      resultado: {
        pergunta: "Seu personagem é real?",
        etapa: 1,
        progresso: 12.5,
      },
    };
  };
  tokitoApi.url = (route) => "https://tokito.test" + route;

  const conn = {
    async sendMessage(jid, content) {
      sent.push({ jid, content });
      return { key: { remoteJid: jid, id: "out-1", fromMe: true } };
    },
  };

  const msg = {
    key: {
      remoteJid: group,
      participant: "5511999999999@s.whatsapp.net",
      id: "in-1",
    },
    pushName: "Alice",
  };

  try {
    await command.execute(conn, msg, ["iniciar"], group);
    assert.equal(command._sessions.size, 1);
    assert.ok(sent.some(item => item.content?.image?.url?.includes("/canvas/akinator")));
    assert.ok(sent.some(item => /Seu personagem é real/i.test(item.content?.caption || "")));
  } finally {
    tokitoApi.get = originalGet;
    tokitoApi.url = originalUrl;
    command._sessions.clear();
  }
});

test("Akinator impede outro membro de responder a uma partida ativa", async () => {
  const group = "120363000000000000@g.us";
  command._sessions.clear();
  command._sessions.set(group, {
    sender: "5511999999999@s.whatsapp.net",
    id: "sessao",
    startedAt: Date.now(),
  });

  const sent = [];
  const conn = {
    async sendMessage(jid, content) {
      sent.push({ jid, content });
      return {};
    },
  };

  await command.execute(conn, {
    key: {
      remoteJid: group,
      participant: "5511888888888@s.whatsapp.net",
    },
    pushName: "Bob",
  }, ["sim"], group);

  assert.match(sent[0]?.content?.text || "", /partida de Akinator em andamento/i);
  command._sessions.clear();
});
