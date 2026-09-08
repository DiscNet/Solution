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
  assert.match(latencyStatus(5), /Excelente/);
  assert.match(latencyStatus(250), /Lento/);
});

test("ping uses processing time as the primary metric and keeps WA send time secondary", async () => {
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

  const firstReport = calls[0].content.text;
  assert.match(firstReport, /🏓/);
  assert.match(firstReport, /📨/);
  assert.match(firstReport, /Ping = tempo real de processamento interno/i);
  assert.doesNotMatch(firstReport, /Ping[^\n]*medindo\.\.\./i);
  assert.match(firstReport, /Envio[^\n]*medindo\.\.\./i);

  const editCall = calls.find((call) => call.content?.edit?.id === reportKey.id);
  assert.ok(editCall, "the same report message must be updated with the measured WA send time");
  assert.match(editCall.content.text, /Envio WA = tempo do envio/i);
  assert.doesNotMatch(editCall.content.text, /Envio[^\n]*medindo\.\.\./i);
  assert.ok(calls.some((call) => call.content?.react?.text === "🏓"));
});
