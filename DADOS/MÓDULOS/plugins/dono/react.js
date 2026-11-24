'use strict';

const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const {
  proto,
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');
const permissions = require('../../functions/permissions');

const ROOT = path.join(__dirname, '..', '..', '..');
const STICKER_FILE = path.join(ROOT, 'database', 'sticker-react.webp');
const META_FILE = path.join(ROOT, 'database', 'sticker-react.json');
const MAX_STICKER = 1024 * 1024;
const activeChats = new Set();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function unwrap(message) {
  let current = message || {};
  for (let i = 0; i < 12; i++) {
    const next = current.ephemeralMessage?.message ||
      current.viewOnceMessage?.message ||
      current.viewOnceMessageV2?.message ||
      current.viewOnceMessageV2Extension?.message ||
      current.documentWithCaptionMessage?.message ||
      current.editedMessage?.message;
    if (!next) break;
    current = next;
  }
  return current || {};
}

function quotedContext(msg) {
  const current = unwrap(msg?.message);
  return current.extendedTextMessage?.contextInfo ||
    current.imageMessage?.contextInfo ||
    current.videoMessage?.contextInfo ||
    current.audioMessage?.contextInfo ||
    current.stickerMessage?.contextInfo ||
    current.documentMessage?.contextInfo ||
    {};
}

function stickerSource(msg) {
  const current = unwrap(msg?.message);
  if (current.stickerMessage) {
    return { key: msg.key, message: { stickerMessage: current.stickerMessage } };
  }

  const context = quotedContext(msg);
  const quoted = unwrap(context.quotedMessage);
  if (!quoted.stickerMessage || !context.stanzaId) return null;

  return {
    key: {
      remoteJid: msg.key?.remoteJid,
      id: context.stanzaId,
      participant: context.participant || context.participantAlt,
      fromMe: context.fromMe === true
    },
    message: { stickerMessage: quoted.stickerMessage }
  };
}

function readMeta() {
  try { return JSON.parse(fs.readFileSync(META_FILE, 'utf8')); }
  catch { return {}; }
}

function isRegistered() {
  return fs.existsSync(STICKER_FILE);
}

async function downloadSticker(conn, source) {
  const buffer = await downloadMediaMessage(source, 'buffer', {}, {
    logger: require('pino')({ level: 'silent' }),
    reuploadRequest: conn.updateMediaMessage
  });
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('Não foi possível baixar a figurinha.');
  }
  return buffer;
}

async function registerSticker(conn, msg) {
  const source = stickerSource(msg);
  const sticker = source?.message?.stickerMessage;
  if (!sticker) throw new Error('Responda a uma figurinha com .rgreact.');
  if (sticker.isLottie) throw new Error('Figurinhas Lottie não são suportadas.');

  const buffer = await downloadSticker(conn, source);
  if (buffer.length > MAX_STICKER ||
      buffer.toString('ascii', 0, 4) !== 'RIFF' ||
      buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('Use uma figurinha WebP válida de até 1 MB.');
  }

  fs.mkdirSync(path.dirname(STICKER_FILE), { recursive: true });
  const temp = STICKER_FILE + '.' + process.pid + '.tmp';
  try {
    fs.writeFileSync(temp, buffer);
    fs.renameSync(temp, STICKER_FILE);
    const metaTemp = META_FILE + '.' + process.pid + '.tmp';
    try {
      fs.writeFileSync(metaTemp, JSON.stringify({
        isAnimated: sticker.isAnimated === true,
        width: Number(sticker.width) || 512,
        height: Number(sticker.height) || 512,
        savedAt: new Date().toISOString()
      }, null, 2) + '\n');
      fs.renameSync(metaTemp, META_FILE);
    } finally {
      try { fs.rmSync(metaTemp, { force: true }); } catch (_) {}
    }
  } finally {
    try { fs.rmSync(temp, { force: true }); } catch (_) {}
  }
}

function removeSticker() {
  const existed = isRegistered();
  try { fs.rmSync(STICKER_FILE, { force: true }); } catch (_) {}
  try { fs.rmSync(META_FILE, { force: true }); } catch (_) {}
  return existed;
}

async function viewSticker(conn, from, msg) {
  if (!isRegistered()) throw new Error('Nenhuma figurinha de reação foi registrada. Use .rgreact.');
  const meta = readMeta();
  return conn.sendMessage(from, {
    sticker: fs.readFileSync(STICKER_FILE),
    isAnimated: meta.isAnimated === true
  }, { quoted: msg });
}

function normalizeJid(value) {
  const raw = String(value || '');
  const [user, server] = raw.split('@');
  return user ? user.split(':')[0] + (server ? '@' + server : '') : '';
}

function getTarget(msg, from) {
  const context = quotedContext(msg);
  if (!context.stanzaId || !context.quotedMessage) {
    throw new Error('Responda à mensagem que receberá a figurinha.');
  }

  const isGroup = String(from || '').endsWith('@g.us');
  const participant = normalizeJid(context.participant || context.participantAlt);
  if (isGroup && !participant) {
    throw new Error('Não consegui identificar quem enviou a mensagem respondida.');
  }

  const ownIds = [
    msg?.key?.participant,
    msg?.key?.participantAlt,
    msg?.key?.remoteJid,
    msg?.key?.remoteJidAlt
  ].filter(Boolean).map(normalizeJid);
  if (participant && ownIds.includes(participant)) {
    throw new Error('Responda à mensagem de outra pessoa, não à sua própria mensagem.');
  }

  return {
    remoteJid: from,
    id: context.stanzaId,
    fromMe: context.fromMe === true,
    ...(isGroup ? { participant } : {})
  };
}

async function sendStickerReaction(conn, msg, from, quantity) {
  if (!isRegistered()) throw new Error('Nenhuma figurinha registrada. Use .rgreact.');
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new Error('Informe uma quantidade entre 1 e 10. Exemplo: .react 3');
  }
  if (activeChats.has(from)) throw new Error('Já existe um envio de reação em andamento neste chat.');

  const target = getTarget(msg, from);
  const associationType = proto?.MessageAssociation?.AssociationType?.STICKER_ANNOTATION;
  if (associationType === undefined || typeof proto?.Message?.fromObject !== 'function' ||
      typeof prepareWAMessageMedia !== 'function' ||
      typeof generateWAMessageFromContent !== 'function') {
    throw new Error('Esta versão do Baileys não oferece o protocolo experimental STICKER_ANNOTATION.');
  }
  if (typeof conn.waUploadToServer !== 'function' || typeof conn.relayMessage !== 'function') {
    throw new Error('A conexão Baileys não oferece suporte ao envio necessário.');
  }

  activeChats.add(from);
  let sent = 0;
  try {
    const meta = readMeta();
    const media = await prepareWAMessageMedia({
      sticker: fs.readFileSync(STICKER_FILE),
      mimetype: 'image/webp',
      isAnimated: meta.isAnimated === true,
      width: meta.width || 512,
      height: meta.height || 512
    }, { upload: conn.waUploadToServer });

    if (!media?.stickerMessage) throw new Error('Não foi possível preparar o upload da figurinha.');

    for (let i = 0; i < quantity; i++) {
      const content = proto.Message.fromObject({
        messageContextInfo: {
          messageSecret: randomBytes(32),
          messageAssociation: {
            associationType,
            parentMessageKey: target
          }
        },
        associatedChildMessage: {
          message: { stickerMessage: media.stickerMessage }
        }
      });

      const generated = generateWAMessageFromContent(from, content, {
        userJid: conn.user?.id || ''
      });
      if (!generated?.key?.id || !generated?.message) {
        throw new Error('Não foi possível montar a mensagem de reação.');
      }

      await conn.relayMessage(from, generated.message, {
        messageId: generated.key.id,
        additionalAttributes: { type: 'text' }
      });
      sent++;
      if (i < quantity - 1) await wait(650);
    }
    return sent;
  } catch (error) {
    error.sentReactions = sent;
    throw error;
  } finally {
    activeChats.delete(from);
  }
}

const commands = [
  {
    name: 'rgreact',
    permissions: { owner: true },
    description: 'Registra a figurinha usada nas reações experimentais.',
    async execute(conn, msg) {
      if (!permissions.isOwner(msg)) {
        return conn.sendMessage(msg.key.remoteJid, { text: 'Este comando é exclusivo do dono.' }, { quoted: msg });
      }
      try {
        await registerSticker(conn, msg);
        return conn.sendMessage(msg.key.remoteJid, {
          text: 'Figurinha de reação registrada. Responda a uma mensagem com .react 1 para testar.'
        }, { quoted: msg });
      } catch (error) {
        return conn.sendMessage(msg.key.remoteJid, { text: 'Não foi possível registrar: ' + error.message }, { quoted: msg });
      }
    }
  },
  {
    name: 'react',
    permissions: { owner: true },
    description: 'Tenta reagir a uma mensagem usando a figurinha registrada.',
    async execute(conn, msg, args, from) {
      if (!permissions.isOwner(msg)) {
        return conn.sendMessage(from, { text: 'Este comando é exclusivo do dono.' }, { quoted: msg });
      }
      const quantity = Number(String(args?.[0] || '1').trim());
      try {
        const sent = await sendStickerReaction(conn, msg, from, quantity);
        return conn.sendMessage(from, {
          text: sent + ' tentativa(s) de reação enviada(s). A exibição depende do suporte do WhatsApp.'
        }, { quoted: msg });
      } catch (error) {
        const sent = Number(error.sentReactions || 0);
        const progress = sent ? sent + ' de ' + quantity + ' tentativa(s) foram enviadas. ' : '';
        return conn.sendMessage(from, { text: progress + 'Não foi possível concluir a reação: ' + error.message }, { quoted: msg });
      }
    }
  },
  {
    name: 'verreact',
    permissions: { owner: true },
    description: 'Mostra a figurinha de reação registrada.',
    async execute(conn, msg, args, from) {
      if (!permissions.isOwner(msg)) {
        return conn.sendMessage(from, { text: 'Este comando é exclusivo do dono.' }, { quoted: msg });
      }
      try { return await viewSticker(conn, from, msg); }
      catch (error) { return conn.sendMessage(from, { text: error.message }, { quoted: msg }); }
    }
  },
  {
    name: 'delreact',
    permissions: { owner: true },
    description: 'Remove a figurinha de reação registrada.',
    async execute(conn, msg, args, from) {
      if (!permissions.isOwner(msg)) {
        return conn.sendMessage(from, { text: 'Este comando é exclusivo do dono.' }, { quoted: msg });
      }
      if (activeChats.size) {
        return conn.sendMessage(from, { text: 'Aguarde o envio de reações em andamento terminar.' }, { quoted: msg });
      }
      const removed = removeSticker();
      return conn.sendMessage(from, {
        text: removed ? 'Figurinha de reação removida.' : 'Nenhuma figurinha de reação estava registrada.'
      }, { quoted: msg });
    }
  }
];

module.exports = { commands };
