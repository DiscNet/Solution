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

test("ping sends exactly one complete message with processing as the primary metric", async () => {
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

  const conn = {
    async sendMessage(jid, content, options) {
      calls.push({ jid, content, options });
      return { key: { remoteJid: jid, fromMe: true, id: "ping-report-1" } };
    },
  };

  await ping.execute(conn, msg, [], from);

  assert.equal(calls.length, 1, "ping must make exactly one sendMessage call");

  const report = calls[0].content.caption || calls[0].content.text;
  assert.match(report, /🏓/);
  assert.match(report, /Ping = tempo real de processamento interno/i);
  assert.match(report, /📶/);
  assert.match(report, /⏱️/);
  assert.match(report, /📦/);
  assert.match(report, /💾/);
  assert.match(report, /⚙️/);
  assert.doesNotMatch(report, /medindo\.\.\./i);
  assert.doesNotMatch(report, /Envio WA/i);
  assert.ok(
    calls[0].content.text || calls[0].content.image,
    "ping deve enviar o relatório mesmo sem Tokito API no ambiente de teste"
  );
  assert.equal(calls[0].content.edit, undefined);
  assert.equal(calls[0].content.react, undefined);
});
