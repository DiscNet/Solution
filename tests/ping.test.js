const test = require("node:test");
const assert = require("node:assert/strict");

const ping = require("../commands/outros/ping");

test("ping command has menu metadata", () => {
  assert.equal(ping.name, "ping");
  assert.equal(ping.menuCategory, "Utilidades");
  assert.equal(ping.menuSection, "Estatísticas");
  assert.equal(ping.usage, "ping");
});

test("ping helpers format real values without truncating latency", () => {
  const { formatMs, formatBytes, formatDuration, latencyStatus } = ping._internals;

  assert.equal(formatMs(1234), "1234 ms");
  assert.equal(formatMs(12.34), "12.3 ms");
  assert.equal(formatBytes(1024 * 1024), "1.0 MB");
  assert.equal(formatDuration(90061), "1d 1h 1m 1s");
  assert.match(latencyStatus(80), /Excelente/);
  assert.match(latencyStatus(1500), /Lento/);
});

test("ping measures an actual WhatsApp send and turns the probe into the report", async () => {
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

  const probeKey = { remoteJid: from, fromMe: true, id: "probe-1" };
  const conn = {
    async sendMessage(jid, content, options) {
      calls.push({ jid, content, options });
      if (calls.length === 1) return { key: probeKey };
      return { key: { remoteJid: jid, fromMe: true, id: `out-${calls.length}` } };
    },
  };

  await ping.execute(conn, msg, [], from);

  assert.match(calls[0].content.text, /Medindo latência real/i);
  assert.deepEqual(calls[1].content.edit, probeKey);
  assert.match(calls[1].content.text, /Latê|Latência|ncia/);
  assert.match(calls[1].content.text, /Processamento/);
  assert.match(calls[1].content.text, /Uptime/);
  assert.match(calls[1].content.text, /Heap/);
  assert.ok(calls.some((call) => call.content?.react?.text === "🏓"));
});
