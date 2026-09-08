const test = require("node:test");
const assert = require("node:assert/strict");

const ping = require("../commands/outros/ping");

test("ping sends the complete report immediately, then edits in the exact WA latency", async () => {
  const calls = [];
  const from = "120363000000000000@g.us";
  const msg = {
    key: {
      remoteJid: from,
      participant: "5511999999999@s.whatsapp.net",
      id: "incoming-ping",
    },
    pushName: "Teste",
  };

  const firstKey = { remoteJid: from, fromMe: true, id: "ping-report-1" };
  const conn = {
    async sendMessage(jid, content, options) {
      calls.push({ jid, content, options });
      if (calls.length === 1) return { key: firstKey };
      return { key: { remoteJid: jid, fromMe: true, id: `out-${calls.length}` } };
    },
  };

  await ping.execute(conn, msg, [], from);

  assert.match(calls[0].content.text, /Uptime/);
  assert.match(calls[0].content.text, /Heap/);
  assert.match(calls[0].content.text, /calculando|medindo/i);
  assert.equal(calls[0].content.edit, undefined);

  assert.deepEqual(calls[1].content.edit, firstKey);
  assert.doesNotMatch(calls[1].content.text, /calculando|medindo/i);
  assert.match(calls[1].content.text, /ms/);
  assert.ok(calls.some((call) => call.content?.react?.text === "🏓"));
});
