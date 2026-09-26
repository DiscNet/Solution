const test = require("node:test");
const assert = require("node:assert/strict");

const contexto = require("../DADOS_KXLYN/sistemas/contexto");

test("contexto Kxlyn normaliza PN e LID sem manter device suffix", () => {
  assert.equal(
    contexto.cleanJid("5511999999999:42@s.whatsapp.net"),
    "5511999999999@s.whatsapp.net"
  );
  assert.equal(
    contexto.cleanJid("123456789012345@lid"),
    "123456789012345@lid"
  );
});

test("sender prioriza participantAlt quando disponível", () => {
  const msg = {
    key: {
      participant: "123456789012345@lid",
      participantAlt: "5511999999999@s.whatsapp.net",
      remoteJid: "123-456@g.us",
    },
  };

  assert.equal(
    contexto.senderFrom(msg, "123-456@g.us"),
    "5511999999999@s.whatsapp.net"
  );
});

test("menções e resposta citada são extraídas do contexto", () => {
  const msg = {
    message: {
      extendedTextMessage: {
        contextInfo: {
          mentionedJid: ["5511888888888@s.whatsapp.net"],
          participant: "5511777777777:12@s.whatsapp.net",
        },
      },
    },
  };

  assert.deepEqual(
    contexto.mentionsFrom(msg),
    ["5511888888888@s.whatsapp.net"]
  );
  assert.equal(
    contexto.quotedParticipant(msg),
    "5511777777777@s.whatsapp.net"
  );
});
