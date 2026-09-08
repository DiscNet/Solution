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

test("ping responds immediately with the full report and then fills the exact WA latency", async () => {
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

  const reportKey = { remoteJid: from, fromMe: true, id: "ping-report-1" };
  const conn = {
    async sendMessage(jid, content, options) {
      calls.push({ jid, content, options });
      if (calls.length === 1) return { key: reportKey };
      return { key: { remoteJid: jid, fromMe: true, id: `out-${calls.length}` } };
    },
  };

  await ping.execute(conn, msg, [], from);

  // A primeira resposta visível já contém TODAS as métricas; só o valor do
  // ping/tempo total fica como "medindo..." até o próprio envio ser concluído.
  assert.match(calls[0].content.text, /medindo\.\.\./i);
  assert.match(calls[0].content.text, /🏓/);
  assert.match(calls[0].content.text, /⚡/);
  assert.match(calls[0].content.text, /⏱️/);
  assert.match(calls[0].content.text, /📦/);
  assert.match(calls[0].content.text, /💾/);
  assert.match(calls[0].content.text, /⚙️/);
  assert.doesNotMatch(calls[0].content.text, /^🏓 \*Medindo latência real\.\.\.\*$/i);

  const editCall = calls.find((call) => call.content?.edit?.id === reportKey.id);
  assert.ok(editCall, "the same report message must be edited with the measured latency");
  assert.match(editCall.content.text, /tempo real do envio/i);
  assert.doesNotMatch(editCall.content.text, /Latê[^\n]*medindo\.\.\./i);
  assert.ok(calls.some((call) => call.content?.react?.text === "🏓"));
});
