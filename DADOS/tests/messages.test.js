const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { EventEmitter } = require('events');
const { timestampSeconds, createMessageGate, shouldProcessMessage } = require('../MÓDULOS/functions/messageGate');
const messageText = require('../MÓDULOS/functions/messageText');

const START_MS = 1700000000450;
const FIRST_SECOND = 1700000001;

function message(id, timestamp = FIRST_SECOND, body = { conversation: '.menu' }, jid = 'group@g.us') {
  return { key: { id, remoteJid: jid, fromMe: false }, messageTimestamp: timestamp, message: body, pushName: 'Usuário' };
}

function harness(processor = async () => {}) {
  const processed = [], contexts = [], cached = [], typing = [], stopped = [], contacts = [], errors = [];
  const gate = createMessageGate({ startedAtMs: START_MS });
  const stubs = {
    '../MÓDULOS/functions/runtimeLogger': { error: error => errors.push(error) },
    '../MÓDULOS/functions/contactNameCache': {
      rememberMessage: msg => cached.push(msg.key.id), rememberContacts: values => contacts.push(values)
    },
    '../MÓDULOS/functions/messageDefaults': {
      runWithMessage: async (msg, callback) => { contexts.push(msg.key.id); return callback(); },
      startCommandTyping: async (conn, jid) => { typing.push(jid); return async () => stopped.push(jid); }
    },
    '../MÓDULOS/functions/messageText': messageText,
    '../MÓDULOS/functions/messageGate': { shouldProcessMessage: gate },
    '../config/config': { prefix: '.' }
  };
  const file = path.join(__dirname, '../eventos/messages.js');
  const context = { module: { exports: {} }, require: name => {
    if (!Object.hasOwn(stubs, name)) throw new Error('Unexpected import: ' + name);
    return stubs[name];
  } };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  const register = () => {
    const conn = { ev: new EventEmitter() };
    context.module.exports.registerMessagesEvent(conn, async msg => {
      processed.push(msg.key.id); await processor(msg);
    });
    return conn;
  };
  const conn = register();
  const receive = (event, target = conn) => target.ev.listeners('messages.upsert')[0](event);
  return { conn, register, receive, processed, contexts, cached, typing, stopped, contacts, errors };
}

test('timestamps use number, numeric string, bigint and both Baileys Long representations consistently', () => {
  const gate = createMessageGate({ startedAtMs: START_MS });
  const formats = [value => value, value => String(value), value => BigInt(value),
    value => ({ toNumber: () => value }), value => ({ low: value, high: 0, unsigned: true })];
  for (const format of formats) {
    assert.equal(timestampSeconds(format(FIRST_SECOND)), FIRST_SECOND);
    assert.equal(gate(message('old', format(FIRST_SECOND - 1)), 'notify'), false);
    assert.equal(gate(message('new', format(FIRST_SECOND)), 'notify'), true);
  }
  assert.equal(timestampSeconds({ low: -1, high: 1, unsigned: true }), 8589934591);
  assert.equal(timestampSeconds({ low: 0, high: 0x7fffffff, unsigned: true }), null);
});

test('the partially elapsed startup second is excluded so pre-start messages cannot cross the cutoff', () => {
  const gate = createMessageGate({ startedAtMs: START_MS });
  assert.equal(gate(message('startup-second', Math.floor(START_MS / 1000)), 'notify'), false);
  assert.equal(gate(message('after-start', FIRST_SECOND), 'notify'), true);
});

test('the production gate rejects timestamps before the process started and accepts current incoming messages', () => {
  const old = Math.floor((Date.now() - process.uptime() * 1000) / 1000) - 60;
  const current = Math.ceil(Date.now() / 1000);
  assert.equal(shouldProcessMessage(message('old', old), 'notify'), false);
  assert.equal(shouldProcessMessage(message('new', current), 'notify'), true);
});

test('missing, malformed and unsafe timestamps are ignored without treating receipt time as message time', async () => {
  const h = harness();
  const values = [undefined, null, 0, -1, NaN, Infinity, 1.5, 'invalid', '1700000001junk', {},
    { low: FIRST_SECOND }, { low: FIRST_SECOND, high: NaN }, { toNumber() { throw new Error('invalid Long'); } },
    Number.MAX_SAFE_INTEGER + 1, 9007199254740993n];
  await h.receive({ type: 'notify', messages: values.map((value, index) => ({ ...message(String(index)), messageTimestamp: value })) });
  assert.deepEqual(h.processed, []); assert.deepEqual(h.typing, []);
  assert.deepEqual(h.contexts, []); assert.deepEqual(h.cached, []); assert.deepEqual(h.errors, []);
});

test('history append batches never reach typing, caches, processing or replies even with recent timestamps', async () => {
  const h = harness();
  for (const type of ['append', undefined, 'history']) {
    await h.receive({ type, messages: [message('old', FIRST_SECOND - 100), message('recent', FIRST_SECOND + 100)] });
  }
  assert.deepEqual(h.processed, []); assert.deepEqual(h.typing, []);
  assert.deepEqual(h.contexts, []); assert.deepEqual(h.cached, []); assert.deepEqual(h.errors, []);
});

test('mixed live batches ignore old private commands and group media, buttons and reactions before any effects', async () => {
  const h = harness();
  const old = FIRST_SECOND - 3600;
  await h.receive({ type: 'notify', messages: [
    message('old-private', old, { conversation: '.menu' }, 'user@s.whatsapp.net'),
    message('old-image', old, { imageMessage: { caption: '.ascii' } }),
    message('old-button', old, { buttonsResponseMessage: { selectedButtonId: '.menu' } }),
    message('old-reaction', old, { reactionMessage: { text: '✅', key: { id: 'previous' } } }),
    message('fresh-command', FIRST_SECOND),
    message('fresh-text', FIRST_SECOND + 1, { conversation: 'Olá' })
  ] });
  assert.deepEqual(h.processed, ['fresh-command', 'fresh-text']);
  assert.deepEqual(h.contexts, ['fresh-command', 'fresh-text']);
  assert.deepEqual(h.cached, ['fresh-command', 'fresh-text']);
  assert.deepEqual(h.typing, ['group@g.us']); assert.deepEqual(h.stopped, ['group@g.us']);
  assert.deepEqual(h.errors, []);
});

test('new media captions, interactive replies and reactions remain eligible for their normal handlers', async () => {
  const h = harness();
  await h.receive({ type: 'notify', messages: [
    message('image', FIRST_SECOND, { ephemeralMessage: { message: { imageMessage: { caption: '.ascii' } } } }),
    message('button', FIRST_SECOND, { interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: '{"id":".menu"}' } } }),
    message('reaction', FIRST_SECOND, { reactionMessage: { text: '✅', key: { id: 'previous' } } })
  ] });
  assert.deepEqual(h.processed, ['image', 'button', 'reaction']);
  assert.equal(h.typing.length, 2); assert.equal(h.stopped.length, 2);
});

test('a new command quoting old media is handled using the new outer message timestamp', async () => {
  const h = harness();
  const quoted = message('quoted', FIRST_SECOND, { extendedTextMessage: { text: '.ascii', contextInfo: {
    quotedMessage: { imageMessage: {}, messageTimestamp: FIRST_SECOND - 3600 }, stanzaId: 'old-image'
  } } });
  await h.receive({ type: 'notify', messages: [quoted] });
  assert.deepEqual(h.processed, ['quoted']); assert.equal(h.typing.length, 1);
});

test('automatic reconnections keep the original cutoff and still process new live messages', async () => {
  const h = harness();
  await h.receive({ type: 'notify', messages: [message('old-first', FIRST_SECOND - 10), message('new-first', FIRST_SECOND)] });
  const reconnected = h.register();
  await h.receive({ type: 'notify', messages: [message('old-again', FIRST_SECOND - 10), message('new-after-reconnect', FIRST_SECOND + 120)] }, reconnected);
  assert.deepEqual(h.processed, ['new-first', 'new-after-reconnect']);
  assert.deepEqual(h.cached, ['new-first', 'new-after-reconnect']); assert.deepEqual(h.errors, []);
});

test('history events are not loaded and live contact updates remain available', () => {
  const h = harness();
  assert.equal(h.conn.ev.listenerCount('messaging-history.set'), 0);
  h.conn.ev.emit('messaging-history.set', { messages: [message('old', FIRST_SECOND - 100)], contacts: [{ id: 'old', name: 'Histórico' }] });
  assert.deepEqual(h.contacts, []); assert.deepEqual(h.processed, []);
  h.conn.ev.emit('contacts.upsert', [{ id: 'new', name: 'Novo' }]);
  h.conn.ev.emit('contacts.update', [{ id: 'new', name: 'Atualizado' }]);
  assert.equal(h.contacts.length, 2);
});

test('outgoing messages are ignored and a failed current command still ends typing and preserves error reporting', async () => {
  const h = harness(async msg => { if (msg.key.id === 'failure') throw new Error('command failed'); });
  const own = message('own'); own.key.fromMe = true;
  await h.receive({ type: 'notify', messages: [own, message('failure'), message('next')] });
  assert.deepEqual(h.processed, ['failure', 'next']);
  assert.equal(h.typing.length, 2); assert.equal(h.stopped.length, 2);
  assert.equal(h.errors.length, 1); assert.equal(h.errors[0].code, 'ERR_MESSAGE_EVENT');
  assert.equal(h.errors[0].error.message, 'command failed');
});
