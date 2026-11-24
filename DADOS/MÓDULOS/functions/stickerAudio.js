'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const { execFile } = require('child_process');
const { randomBytes } = require('crypto');
const { proto, prepareWAMessageMedia, downloadMediaMessage } = require('@whiskeysockets/baileys');

const runFile = promisify(execFile);
const ROOT = path.join(__dirname, '..', '..');
const STICKER_FILE = path.join(ROOT, 'database', 'sticker-audio.webp');
const META_FILE = path.join(ROOT, 'database', 'sticker-audio.json');
const AUTO_FILE = path.join(ROOT, 'database', 'autostickeraudio.json');
const MAX_STICKER = 1024 * 1024;
const MAX_AUDIO = 8 * 1024 * 1024;
const MAX_SECONDS = 10;
const PATCH = Symbol.for('solution.stickerAudio.field26.v1');

function unwrap(message) {
  let current = message || {};
  for (let i = 0; i < 12; i++) {
    const next = current.ephemeralMessage?.message || current.viewOnceMessage?.message ||
      current.viewOnceMessageV2?.message || current.viewOnceMessageV2Extension?.message ||
      current.documentWithCaptionMessage?.message || current.editedMessage?.message;
    if (!next) break;
    current = next;
  }
  return current || {};
}
function quoted(msg) {
  const current = unwrap(msg?.message);
  const context = current.extendedTextMessage?.contextInfo ||
    current.imageMessage?.contextInfo || current.audioMessage?.contextInfo ||
    current.stickerMessage?.contextInfo || current.videoMessage?.contextInfo || {};
  return unwrap(context.quotedMessage);
}
function currentMedia(msg) {
  const current = unwrap(msg?.message);
  const reply = quoted(msg);
  return {
    sticker: current.stickerMessage || reply.stickerMessage || null,
    audio: current.audioMessage || reply.audioMessage || null
  };
}
function readJson(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJsonAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.' + process.pid + '.tmp';
  try { fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n'); fs.renameSync(tmp, file); }
  finally { try { fs.rmSync(tmp, { force: true }); } catch (_) {} }
}
function isRegistered() { return fs.existsSync(STICKER_FILE); }
function metadata() { return readJson(META_FILE, {}); }
async function getBuffer(conn, msg) {
  const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
    logger: require('pino')({ level: 'silent' }),
    reuploadRequest: conn.updateMediaMessage
  });
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error('Não foi possível baixar a mídia.');
  return buffer;
}
async function registerSticker(conn, msg) {
  const media = currentMedia(msg).sticker;
  if (!media) throw new Error('Responda a uma figurinha com .rgfigaudio.');
  if (media.isLottie) throw new Error('Figurinhas Lottie não são suportadas.');
  const source = { key: msg.key, message: { stickerMessage: media } };
  const buffer = await getBuffer(conn, source);
  if (buffer.length > MAX_STICKER || buffer.toString('ascii', 0, 4) !== 'RIFF' ||
      buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('A figurinha precisa ser WebP válida e ter até 1 MB.');
  }
  fs.mkdirSync(path.dirname(STICKER_FILE), { recursive: true });
  const tmp = STICKER_FILE + '.' + process.pid + '.tmp';
  try {
    fs.writeFileSync(tmp, buffer);
    fs.renameSync(tmp, STICKER_FILE);
    writeJsonAtomic(META_FILE, {
      width: Number(media.width) || 512,
      height: Number(media.height) || 512,
      isAnimated: media.isAnimated === true,
      savedAt: new Date().toISOString()
    });
  } finally { try { fs.rmSync(tmp, { force: true }); } catch (_) {} }
}
function removeSticker() {
  if (!isRegistered()) return false;
  fs.rmSync(STICKER_FILE, { force: true });
  fs.rmSync(META_FILE, { force: true });
  return true;
}
async function viewSticker(conn, from, msg) {
  if (!isRegistered()) throw new Error('Nenhuma figurinha foi registrada ainda.');
  return conn.sendMessage(from, { sticker: fs.readFileSync(STICKER_FILE), isAnimated: metadata().isAnimated === true }, { quoted: msg });
}
function validOpus(buffer, mime) {
  return /audio\/ogg/i.test(mime || '') && buffer.length > 8 &&
    buffer.subarray(0, 4).toString('ascii') === 'OggS' &&
    buffer.includes(Buffer.from('OpusHead'));
}
async function normalizeAudio(conn, msg, media) {
  const buffer = await getBuffer(conn, { key: msg.key, message: { audioMessage: media } });
  if (buffer.length > MAX_AUDIO) throw new Error('O áudio excede o limite de 8 MB.');
  if (validOpus(buffer, media.mimetype) && Number(media.seconds || 0) > 0 &&
      Number(media.seconds) <= MAX_SECONDS) return buffer;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'solution-sticker-audio-'));
  const input = path.join(dir, 'input.bin');
  const output = path.join(dir, 'output.ogg');
  try {
    fs.writeFileSync(input, buffer);
    await runFile(process.env.FFMPEG_PATH || 'ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-t', String(MAX_SECONDS),
      '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '32k', '-f', 'ogg', output
    ], { timeout: 30000, maxBuffer: 1024 * 1024 });
    const converted = fs.readFileSync(output);
    if (!validOpus(converted, 'audio/ogg; codecs=opus')) throw new Error('O FFmpeg não gerou OGG/Opus válido.');
    return converted;
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('FFmpeg não encontrado. Instale o FFmpeg ou use áudio OGG/Opus de até 10 segundos.');
    throw new Error('Falha ao converter o áudio: ' + error.message);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function patchStickerEncoder() {
  const sticker = proto?.Message?.StickerMessage;
  const audio = proto?.Message?.AudioMessage;
  if (!sticker?.encode || !audio?.encode) throw new Error('Esta versão do Baileys não expõe o encoder necessário para figurinhas sonoras.');
  if (sticker[PATCH]) return;
  const original = sticker.encode;
  if (/\baudioMessage\b/.test(Function.prototype.toString.call(original))) {
    Object.defineProperty(sticker, PATCH, { value: true }); return;
  }
  sticker.encode = function(value, writer) {
    const result = original.call(this, value, writer);
    if (value?.audioMessage) audio.encode(value.audioMessage, result.uint32(210).fork()).ldelim();
    return result;
  };
  Object.defineProperty(sticker, PATCH, { value: true });
}
async function sendStickerAudio(conn, from, msg, audioMedia) {
  if (!isRegistered()) throw new Error('Nenhuma figurinha registrada. Use .rgfigaudio.');
  if (!audioMedia) throw new Error('Responda a um áudio ou envie .figaudio na legenda dele.');
  const audio = await normalizeAudio(conn, msg, audioMedia);
  const meta = metadata();
  if (typeof conn.waUploadToServer !== 'function' || typeof conn.relayMessage !== 'function') {
    throw new Error('A conexão Baileys não oferece suporte ao envio de mídia necessário.');
  }
  const [stickerUpload, audioUpload] = await Promise.all([
    prepareWAMessageMedia({
      sticker: fs.readFileSync(STICKER_FILE), mimetype: 'image/webp',
      isAnimated: meta.isAnimated === true, width: meta.width || 512, height: meta.height || 512
    }, { upload: conn.waUploadToServer }),
    prepareWAMessageMedia({ audio, mimetype: 'audio/ogg; codecs=opus', ptt: false }, { upload: conn.waUploadToServer })
  ]);
  if (!stickerUpload?.stickerMessage || !audioUpload?.audioMessage) throw new Error('Falha ao preparar upload da figurinha ou do áudio.');
  patchStickerEncoder();
  const message = proto.Message.fromObject({
    stickerMessage: stickerUpload.stickerMessage,
    messageContextInfo: { messageSecret: randomBytes(32) }
  });
  message.stickerMessage.audioMessage = audioUpload.audioMessage;
  if (!message.stickerMessage.audioMessage?.mediaKey ||
      !(message.stickerMessage.audioMessage?.directPath || message.stickerMessage.audioMessage?.url)) {
    throw new Error('O upload não retornou os metadados necessários do áudio.');
  }
  await conn.relayMessage(from, message, {});
}
function loadAuto() { return readJson(AUTO_FILE, {}); }
function setAuto(group, enabled) {
  const data = loadAuto();
  data[group] = enabled === true;
  writeJsonAtomic(AUTO_FILE, data);
}
const processed = new Map();
async function autoHandler(conn, msg, from) {
  if (!from?.endsWith('@g.us') || msg?.key?.fromMe) return;
  const media = unwrap(msg?.message).audioMessage;
  if (!media || !loadAuto()[from] || !isRegistered()) return;
  const id = msg.key?.id;
  if (!id || processed.has(id)) return;
  processed.set(id, Date.now());
  if (processed.size > 1000) {
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [key, time] of processed) if (time < cutoff) processed.delete(key);
  }
  try { await sendStickerAudio(conn, from, msg, media); }
  catch (error) { console.error('[AUTOSTICKERAUDIO]', error.message || error); }
}
module.exports = {
  isRegistered, metadata, registerSticker, removeSticker, viewSticker,
  sendStickerAudio, loadAuto, setAuto, autoHandler, currentMedia
};
