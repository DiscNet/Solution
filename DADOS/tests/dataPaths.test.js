const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { resolveDataDirectory, resolveDataFile } = require('../MÓDULOS/functions/dataPaths');
const { createJsonStore } = require('../MÓDULOS/functions/jsonStore');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-data-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const localDirectory = path.join(root, 'database'), legacyDirectory = path.join(root, 'data');
  fs.mkdirSync(legacyDirectory);
  return { root, localDirectory, legacyDirectory, env: {}, termux: false };
}

function denied(operation, directory, code = 'EACCES') {
  const filesystem = Object.create(fs);
  filesystem[operation] = (file, ...args) => {
    if (path.resolve(file).startsWith(directory + path.sep)) {
      throw Object.assign(new Error('simulated permission failure'), { code });
    }
    return fs[operation](file, ...args);
  };
  return filesystem;
}

function load(relative, stubs) {
  const file = path.resolve(__dirname, '..', relative);
  const context = { module: { exports: {} }, __dirname: path.dirname(file), process: { pid: process.pid, env: {} },
    require: name => Object.hasOwn(stubs, name) ? stubs[name] : require(name) };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return context.module.exports;
}

test('Termux does not access Android /data and persists sembotoes and moderation history locally', async t => {
  const options = { ...fixture(t), termux: true };
  const filesystem = Object.create(fs);
  filesystem.existsSync = file => {
    assert(!String(file).startsWith(options.legacyDirectory), 'Android /data must not be probed');
    return fs.existsSync(file);
  };
  options.filesystem = filesystem;
  const dataPaths = { resolveDataFile: (name, extra = {}) => resolveDataFile(name, { ...options, ...extra }) };
  const state = load('MÓDULOS/functions/adminState.js', { './dataPaths': dataPaths, './jsonStore': { createJsonStore } });
  const mode = load('MÓDULOS/functions/uiMode.js', {
    './adminState': state, 'gifted-btns': {}, './messageDefaults': { prepareOutgoing: value => value }
  });
  const command = load('MÓDULOS/plugins/admin/sembotoes.js', {
    '../../functions/uiMode': mode, '../../../config/config': { prefix: '.' }
  });
  const replies = [], group = '123456@g.us';
  const msg = { key: { participant: '5511999990000@s.whatsapp.net' }, pushName: 'Administrador' };
  await command.execute({ sendMessage: async (jid, payload) => replies.push({ jid, payload }) }, msg, ['0'], group);
  assert.equal(mode.isTextOnly(group), false);
  assert.match(replies[0].payload.text, /Botões permitidos/);
  assert.equal(state.filePath, path.join(options.localDirectory, 'administration.json'));
  assert.equal(JSON.parse(fs.readFileSync(state.filePath)).groups[group].semBotoes, false);
  const reloaded = createJsonStore(state.filePath, {});
  assert.equal(reloaded.read().groups[group].semBotoes, false);

  const modLog = load('MÓDULOS/functions/modLog.js', {
    './dataPaths': dataPaths, './jsonStore': { createJsonStore }
  });
  assert.equal(modLog.record({ command, name: 'sembotoes', msg, args: ['0'], from: group }), true);
  assert.equal(modLog.list(group)[0].command, 'sembotoes');
  assert.equal(modLog.filePath, path.join(options.localDirectory, 'modlog.json'));
  assert.deepEqual(fs.readdirSync(options.legacyDirectory), []);
  assert(!fs.readdirSync(options.localDirectory).some(name => /\.tmp$|\.bot-write-/.test(name)));
});

test('a writable legacy volume keeps existing administration data and removes probes', t => {
  const options = fixture(t);
  const file = path.join(options.legacyDirectory, 'administration.json');
  fs.writeFileSync(file, JSON.stringify({ groups: { saved: { semBotoes: false } } }));
  assert.equal(resolveDataFile('administration.json', options), file);
  assert.equal(createJsonStore(file).read().groups.saved.semBotoes, false);
  assert.deepEqual(fs.readdirSync(options.legacyDirectory), ['administration.json']);
});

test('a read-only legacy volume falls back and preserves readable data without replacing either file', t => {
  const options = fixture(t);
  options.filesystem = denied('writeFileSync', options.legacyDirectory, 'EROFS');
  const previous = path.join(options.legacyDirectory, 'administration.json');
  const original = JSON.stringify({ groups: { saved: { semBotoes: false } } });
  fs.writeFileSync(previous, original);
  const file = resolveDataFile('administration.json', options);
  assert.equal(file, path.join(options.localDirectory, 'administration.json'));
  assert.equal(fs.readFileSync(file, 'utf8'), original);
  const store = createJsonStore(file);
  const data = store.read(); data.groups.local = { semBotoes: true }; store.write(data);
  assert.equal(resolveDataFile('administration.json', options), file);
  assert.equal(store.read(true).groups.local.semBotoes, true);
  assert.equal(fs.readFileSync(previous, 'utf8'), original);
});

test('atomic rename permission is validated and failed probes are cleaned before using the local directory', t => {
  const options = fixture(t);
  options.filesystem = denied('renameSync', options.legacyDirectory);
  assert.equal(resolveDataDirectory(options), options.localDirectory);
  assert.deepEqual(fs.readdirSync(options.legacyDirectory), []);
  assert.deepEqual(fs.readdirSync(options.localDirectory), []);
});

test('explicit admin, Railway and moderation paths keep their precedence and permit writes', t => {
  const options = fixture(t);
  const admin = path.join(options.root, 'admin'), volume = path.join(options.root, 'volume');
  options.env = { BOT_ADMIN_DATA_DIR: admin, RAILWAY_VOLUME_MOUNT_PATH: volume };
  assert.equal(resolveDataFile('administration.json', options), path.join(admin, 'administration.json'));
  options.env = { RAILWAY_VOLUME_MOUNT_PATH: volume };
  assert.equal(resolveDataFile('modlog.json', options), path.join(volume, 'modlog.json'));
  const override = path.join(options.root, 'custom', 'audit.json');
  assert.equal(resolveDataFile('modlog.json', { ...options, override }), override);
  assert.equal(createJsonStore(override).write({ groups: { saved: [] } }), true);
});

test('an unwritable explicit volume reports an actionable error and preserves its configuration', t => {
  const options = fixture(t);
  const previous = path.join(options.legacyDirectory, 'administration.json');
  fs.writeFileSync(previous, '{"groups":{"saved":{}}}');
  options.env = { RAILWAY_VOLUME_MOUNT_PATH: options.legacyDirectory };
  options.filesystem = denied('writeFileSync', options.legacyDirectory);
  assert.throws(() => resolveDataFile('administration.json', options), error => {
    assert.equal(error.code, 'ERR_DATA_PERMISSION');
    assert.equal(error.cause.code, 'EACCES');
    assert.match(error.message, /BOT_ADMIN_DATA_DIR/);
    return true;
  });
  assert.equal(fs.existsSync(options.localDirectory), false);
  assert.equal(fs.readFileSync(previous, 'utf8'), '{"groups":{"saved":{}}}');
});

test('a full detected volume is reported instead of silently switching the database', t => {
  const options = fixture(t);
  options.filesystem = denied('writeFileSync', options.legacyDirectory, 'ENOSPC');
  assert.throws(() => resolveDataDirectory(options), error => error.cause.code === 'ENOSPC');
  assert.equal(fs.existsSync(options.localDirectory), false);
});

test('maintenance retains its local data when no volume is explicitly configured', t => {
  const options = fixture(t);
  const maintenance = load('MÓDULOS/functions/maintenance.js', {
    './jsonStore': { createJsonStore },
    './dataPaths': { resolveDataFile: (name, extra) => resolveDataFile(name, { ...options, ...extra }) }
  });
  maintenance.change('menu', true);
  assert(maintenance.list().includes('menu'));
  assert.equal(fs.existsSync(path.join(options.localDirectory, 'manutencao.json')), true);
  assert.equal(fs.existsSync(path.join(options.legacyDirectory, 'manutencao.json')), false);
});

test('failed JSON replacement preserves disk data, clears uncommitted cache mutations and removes temporary files', t => {
  const options = fixture(t);
  const file = path.join(options.legacyDirectory, 'administration.json');
  fs.writeFileSync(file, '{"groups":{"saved":{"semBotoes":false}}}');
  const { createJsonStore: isolatedStore } = load('MÓDULOS/functions/jsonStore.js', {
    fs: denied('renameSync', options.legacyDirectory)
  });
  const store = isolatedStore(file, { groups: {} });
  const data = store.read(); data.groups.saved.semBotoes = true;
  assert.throws(() => store.write(data), error => error.code === 'EACCES');
  assert.equal(store.read().groups.saved.semBotoes, false);
  assert.equal(JSON.parse(fs.readFileSync(file)).groups.saved.semBotoes, false);
  assert.deepEqual(fs.readdirSync(options.legacyDirectory), ['administration.json']);
});

test('a denied first JSON write discards mutations and allows a later successful retry', t => {
  const options = fixture(t);
  const file = path.join(options.legacyDirectory, 'administration.json');
  let blocked = true;
  const filesystem = Object.create(fs);
  filesystem.writeFileSync = (...args) => {
    if (blocked) throw Object.assign(new Error('denied'), { code: 'EACCES' });
    return fs.writeFileSync(...args);
  };
  const { createJsonStore: isolatedStore } = load('MÓDULOS/functions/jsonStore.js', { fs: filesystem });
  const store = isolatedStore(file, { groups: {} });
  const data = store.read(); data.groups.test = { semBotoes: false };
  assert.throws(() => store.write(data), error => error.code === 'EACCES');
  assert.equal(Object.keys(store.read().groups).length, 0);
  blocked = false;
  store.write({ groups: { test: { semBotoes: false } } });
  assert.equal(store.read(true).groups.test.semBotoes, false);
  assert.deepEqual(fs.readdirSync(options.legacyDirectory), ['administration.json']);
});

test('an unreadable existing JSON file is reported instead of loading empty settings', t => {
  const options = fixture(t);
  const file = path.join(options.legacyDirectory, 'administration.json');
  const original = '{"groups":{"saved":{"semBotoes":false}}}';
  fs.writeFileSync(file, original);
  for (const operation of ['statSync', 'readFileSync']) {
    const { createJsonStore: isolatedStore } = load('MÓDULOS/functions/jsonStore.js', {
      fs: denied(operation, options.legacyDirectory)
    });
    assert.throws(() => isolatedStore(file, { groups: {} }).read(), error => {
      assert.equal(error.code, 'ERR_DATA_PERMISSION');
      assert.equal(error.cause.code, 'EACCES');
      return true;
    });
    assert.equal(fs.readFileSync(file, 'utf8'), original);
  }
});
