const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const os = require("os");
const net = require("net");
const dns = require("dns").promises;
const { spawn } = require("child_process");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { createStatusQuoted } = require("./statusCard");

const DB_FILE = process.env.BOT_UTIL_DATA_PATH || path.join(__dirname, "..", "..", "database", "utilidades.json");
let writeQueue = Promise.resolve();

function senderId(msg, from = "") {
  return msg?.key?.participantAlt || msg?.key?.participant || msg?.key?.remoteJidAlt || msg?.key?.remoteJid || from;
}

function quotedMessage(msg) {
  return msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

function messageText(message) {
  if (!message) return "";
  return message.conversation || message.extendedTextMessage?.text || message.imageMessage?.caption || message.videoMessage?.caption || message.documentMessage?.caption || "";
}

function inputText(msg, args = []) {
  const direct = args.join(" ").trim();
  if (direct) return direct;
  return messageText(quotedMessage(msg)).trim();
}

function mediaInfo(msg) {
  const direct = msg?.message || {};
  const quoted = quotedMessage(msg) || {};
  const candidates = [
    ["image", direct.imageMessage], ["video", direct.videoMessage],
    ["audio", direct.audioMessage], ["document", direct.documentMessage],
    ["sticker", direct.stickerMessage], ["image", quoted.imageMessage],
    ["video", quoted.videoMessage], ["audio", quoted.audioMessage],
    ["document", quoted.documentMessage], ["sticker", quoted.stickerMessage],
  ];
  const found = candidates.find(([, value]) => value);
  if (!found) return null;
  const [type, message] = found;
  return {
    type,
    message,
    mimetype: message.mimetype || "",
    fileName: message.fileName || "",
    fileLength: Number(message.fileLength || 0),
  };
}

async function downloadMedia(msg) {
  const info = mediaInfo(msg);
  if (!info) throw userError("Envie uma mídia ou responda a uma mídia.");
  const stream = await downloadContentFromMessage(info.message, info.type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);
  if (!buffer.length) throw userError("A mídia recebida está vazia.");
  return { ...info, buffer };
}

function userError(message) {
  const error = new Error(message);
  error.userMessage = message;
  return error;
}

async function reply(conn, msg, from, text) {
  return conn.sendMessage(from, { text }, { quoted: createStatusQuoted(msg) });
}

async function fail(conn, msg, from, error, fallback = "Não foi possível concluir a operação.") {
  const text = error?.userMessage || fallback;
  await reply(conn, msg, from, `❌ ${text}`).catch(() => {});
}

async function run(program, args = [], options = {}) {
  const timeout = options.timeout || 45000;
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, {
      cwd: options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...(options.env || {}) },
    });
    const stdout = [];
    const stderr = [];
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, timeout);
    child.stdout.on("data", (d) => stdout.push(Buffer.from(d)));
    child.stderr.on("data", (d) => stderr.push(Buffer.from(d)));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const out = Buffer.concat(stdout);
      const err = Buffer.concat(stderr).toString("utf8").trim();
      if (killed) return reject(new Error(`${program} excedeu o tempo limite`));
      if (code !== 0) return reject(new Error(err || `${program} terminou com código ${code}`));
      resolve(options.encoding === null ? out : out.toString(options.encoding || "utf8"));
    });
    child.stdin.end(options.input || undefined);
  });
}

async function tempDir(prefix = "grimm-util-") {
  return fsp.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function withTempDir(fn, prefix) {
  const dir = await tempDir(prefix);
  try { return await fn(dir); }
  finally { await fsp.rm(dir, { recursive: true, force: true }).catch(() => {}); }
}

function formatBytes(value) {
  let bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes < 0) bytes = 0;
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
  return `${bytes.toFixed(i ? 2 : 0)} ${units[i]}`;
}

async function readDb() {
  try {
    const raw = await fsp.readFile(DB_FILE, "utf8");
    const data = JSON.parse(raw);
    return {
      notes: data.notes || {},
      favorites: data.favorites || {},
      reminders: Array.isArray(data.reminders) ? data.reminders : [],
    };
  } catch (error) {
    if (error.code !== "ENOENT") console.error("utility db:", error.message);
    return { notes: {}, favorites: {}, reminders: [] };
  }
}

function updateDb(mutator) {
  writeQueue = writeQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await fsp.mkdir(path.dirname(DB_FILE), { recursive: true });
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(db, null, 2));
    await fsp.rename(tmp, DB_FILE);
    return result;
  });
  return writeQueue;
}

function normalizeUrl(value) {
  let raw = String(value || "").trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw userError("Use apenas links HTTP ou HTTPS.");
  return url;
}

function isPrivateIp(ip) {
  if (!ip) return true;
  if (net.isIP(ip) === 4) {
    const p = ip.split(".").map(Number);
    return p[0] === 10 || p[0] === 127 || p[0] === 0 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || p[0] >= 224;
  }
  if (net.isIP(ip) === 6) {
    const s = ip.toLowerCase();
    return s === "::1" || s === "::" || s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe8") || s.startsWith("fe9") || s.startsWith("fea") || s.startsWith("feb");
  }
  return true;
}

async function assertPublicUrl(value) {
  const url = normalizeUrl(value);
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) throw userError("Esse endereço local não é permitido.");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw userError("Endereços privados/locais não são permitidos.");
  } else {
    const addresses = await dns.lookup(host, { all: true });
    if (!addresses.length || addresses.some((x) => isPrivateIp(x.address))) throw userError("O domínio resolve para um endereço privado ou inválido.");
  }
  return url;
}

function validDomain(value) {
  const domain = String(value || "").trim().toLowerCase().replace(/\.$/, "");
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) throw userError("Informe um domínio válido, por exemplo: example.com.");
  return domain;
}

function parseDate(value) {
  const raw = String(value || "").trim();
  let y, m, d;
  let match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) [, d, m, y] = match;
  else {
    match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw userError("Use a data como DD/MM/AAAA ou AAAA-MM-DD.");
    [, y, m, d] = match;
  }
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) throw userError("A data informada não existe.");
  return date;
}

function parseDuration(value) {
  const raw = String(value || "").trim().toLowerCase();
  const m = raw.match(/^(\d+)(s|m|h|d)$/);
  if (!m) throw userError("Use um tempo como 30s, 10m, 2h ou 3d.");
  const n = Number(m[1]);
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]];
  const ms = n * mult;
  if (ms < 1000 || ms > 30 * 86400000) throw userError("O lembrete deve ficar entre 1 segundo e 30 dias.");
  return ms;
}

function makeCommand({ name, aliases = [], section, usage, description, execute }) {
  return {
    name,
    aliases,
    menuCategory: "Utilidades",
    menuSection: section,
    usage,
    description: description || `Uso: .${usage}`,
    execute,
  };
}

module.exports = {
  senderId, quotedMessage, messageText, inputText, mediaInfo, downloadMedia,
  userError, reply, fail, run, tempDir, withTempDir, formatBytes, readDb,
  updateDb, normalizeUrl, assertPublicUrl, isPrivateIp, validDomain,
  parseDate, parseDuration, makeCommand,
};
