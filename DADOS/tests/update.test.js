const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const managerFile = path.resolve(__dirname, '../MÓDULOS/functions/updateManager.js');
const { createUpdateManager, blobSha, describeError } = require(managerFile);
const runtime = require('../MÓDULOS/functions/runtimeCompat');

test('rollback interrupted by process termination is completed on startup', async t => {
  const f = fixture(t);
  put(f.source, 'DADOS/MÓDULOS/plugins/sample.js', 'module.exports = "new";\n'); f.commit();
  await f.manager.installUpdate();
  const script = [
    'const fs=require("fs"),path=require("path");const options=JSON.parse(process.argv[1]);',
    'const manager=require(process.argv[2]).createUpdateManager(options);',
    'const original=fs.renameSync;fs.renameSync=function(from,to){const result=original(from,to);',
    'if(to===path.join(options.root,"DADOS/MÓDULOS/plugins/sample.js"))process.exit(75);return result;};',
    'manager.rollback().catch(e=>{console.error(e);process.exit(1)});'
  ].join('');
  const child = spawnSync(process.execPath, ['-e', script, JSON.stringify(f.options), managerFile], { encoding: 'utf8' });
  assert.equal(child.status, 75, child.stderr);
  assert.equal(JSON.parse(f.read('.update/pending.json')).phase, 'rollback');
  await f.manager.recover();
  assert.equal(f.read('DADOS/MÓDULOS/plugins/sample.js'), 'module.exports = "old";\n');
  assert.equal(fs.existsSync(path.join(f.root, '.update/pending.json')), false);
  assertProtected(f);
});

test('supervisor restarts a runtime after update exit code 20', t => {
  const f = fixture(t);
  for (const name of ['runtimeCompat.js', 'terminalLogger.js', 'terminalLayout.js', 'terminalEffects.js', 'updateManager.js']) {
    put(f.root, 'DADOS/MÓDULOS/functions/' + name, fs.readFileSync(path.resolve(__dirname, '../MÓDULOS/functions/', name)));
  }
  put(f.root, 'DADOS/supervisor.js', fs.readFileSync(path.resolve(__dirname, '../supervisor.js')));
  put(f.root, 'DADOS/railway-start.js',
    'const fs=require("fs");const file="launches.txt";const n=fs.existsSync(file)?Number(fs.readFileSync(file,"utf8")):0;fs.writeFileSync(file,String(n+1));if(process.env.BOT_SUPERVISED!=="1")process.exit(4);process.exit(n?0:20);');
  const child = spawnSync(process.execPath, [path.join(f.root, 'DADOS/supervisor.js')], {
    cwd: f.root, encoding: 'utf8', timeout: 10000
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(f.read('launches.txt'), '2');
});

function put(root, rel, value) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
  return file;
}
function env(t, values) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value == null) delete process.env[key]; else process.env[key] = String(value);
  }
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) delete process.env[key]; else process.env[key] = value;
    }
  });
}
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'solution-test-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const source = path.join(base, 'source'), root = path.join(base, 'bot');
  fs.mkdirSync(source); fs.mkdirSync(root);
  const pkg = { name: 'fixture-bot', version: '1.0.0', type: 'commonjs', scripts: {}, dependencies: {} };
  put(source, 'package.json', JSON.stringify(pkg));
  put(source, 'DADOS/update.js', 'module.exports = {};\n');
  put(source, 'DADOS/MÓDULOS/functions/updateManager.js', 'module.exports = {};\n');
  put(source, 'DADOS/MÓDULOS/plugins/sample.js', 'module.exports = "old";\n');
  put(source, 'DADOS/config/config.js', 'remote config');
  put(source, 'DADOS/database/grupos.json', 'remote groups');
  put(source, 'DADOS/conexão/bot_auth/creds.json', 'remote session');
  put(source, 'DADOS/database/lib/runtime.js', 'module.exports = "old";\n');
  execFileSync('git', ['init', '-q', '-b', 'main', source]);
  const git = args => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git(['config', 'user.name', 'Fixture']); git(['config', 'user.email', 'fixture@example.test']);
  const commit = () => { git(['add', '-A']); git(['commit', '-qm', 'fixture', '--allow-empty']); return git(['rev-parse', 'HEAD']).trim(); };
  commit();
  fs.cpSync(source, root, { recursive: true, filter: value => path.basename(value) !== '.git' });
  put(root, 'DADOS/config/config.js', 'my config');
  put(root, 'DADOS/database/grupos.json', 'my groups');
  put(root, 'DADOS/conexão/bot_auth/creds.json', 'my session');
  put(root, '.env', 'my env');
  const options = { root, repositoryUrl: source, branch: 'main' };
  const manager = createUpdateManager(options);
  return { base, source, root, manager, options, commit, git, pkg,
    read: rel => fs.readFileSync(path.join(root, rel), 'utf8') };
}
function assertProtected(f) {
  assert.equal(f.read('DADOS/config/config.js'), 'my config');
  assert.equal(f.read('DADOS/database/grupos.json'), 'my groups');
  assert.equal(f.read('DADOS/conexão/bot_auth/creds.json'), 'my session');
  assert.equal(f.read('.env'), 'my env');
}
function fakeNpm(t, f, mode = 'success') {
  const file = put(f.base, 'npm-cli.js', [
    'const fs=require("fs"),path=require("path");',
    'const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));',
    'if(process.env.FIXTURE_NPM_LOG)fs.appendFileSync(process.env.FIXTURE_NPM_LOG,JSON.stringify(process.argv.slice(2))+"\\n");',
    mode === 'failure' ? 'console.error("npm ERR! native compiler failed");process.exit(42);' :
      'for(const [name,version]of Object.entries(pkg.dependencies||{})){const dir=path.join("node_modules",name);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"package.json"),JSON.stringify({name,version}));}',
    mode === 'timeout' ? 'setTimeout(()=>{},10000);' :
      'fs.writeFileSync("package-lock.json",JSON.stringify({lockfileVersion:3,packages:{}}));'
  ].join('\n'));
  env(t, { npm_execpath: file });
  return file;
}

test('checks and updates code while preserving session, groups, config and env', async t => {
  const f = fixture(t);
  put(f.source, 'DADOS/MÓDULOS/plugins/sample.js', 'module.exports = "new";\n');
  put(f.source, 'DADOS/database/lib/runtime.js', 'module.exports = "new";\n');
  f.commit();
  const check = await f.manager.checkUpdate();
  assert.equal(check.available, true); assert.equal(check.changes.length, 2);
  const result = await f.manager.installUpdate();
  assert.equal(result.filesUpdated, 2); assert.equal(result.dependenciesUpdated, false);
  assert.equal(f.read('DADOS/MÓDULOS/plugins/sample.js'), 'module.exports = "new";\n');
  assertProtected(f);
  assert.equal((await f.manager.checkUpdate()).available, false);
  assert.equal((await f.manager.installUpdate()).updated, false);
});

test('script-only package changes do not invoke npm', async t => {
  const f = fixture(t); fakeNpm(t, f, 'failure');
  put(f.source, 'package.json', JSON.stringify({ ...f.pkg, scripts: { up: 'node DADOS/update.js start' } }));
  f.commit();
  assert.equal((await f.manager.installUpdate()).dependenciesUpdated, false);
  assert.equal(JSON.parse(f.read('package.json')).scripts.up, 'node DADOS/update.js start');
});

test('dependencies are staged, switched and restored by rollback', async t => {
  const f = fixture(t); fakeNpm(t, f);
  put(f.root, 'node_modules/old-marker.txt', 'old modules');
  put(f.source, 'package.json', JSON.stringify({ ...f.pkg, dependencies: { 'fixture-dep': '1.0.0' } }));
  put(f.source, 'DADOS/MÓDULOS/plugins/sample.js', 'module.exports = "new";\n'); f.commit();
  const result = await f.manager.installUpdate();
  assert.equal(result.dependenciesUpdated, true);
  assert.equal(JSON.parse(f.read('node_modules/fixture-dep/package.json')).version, '1.0.0');
  assert.equal(fs.existsSync(path.join(f.root, 'node_modules/old-marker.txt')), false);
  assert.equal((await f.manager.checkUpdate()).available, false);
  await f.manager.rollback();
  assert.equal(f.read('node_modules/old-marker.txt'), 'old modules');
  assert.equal(f.read('DADOS/MÓDULOS/plugins/sample.js'), 'module.exports = "old";\n');
  assert.equal(fs.existsSync(path.join(f.root, 'package-lock.json')), false);
  assertProtected(f);
});

test('failed npm leaves original code and dependencies untouched', async t => {
  const f = fixture(t); fakeNpm(t, f, 'failure');
  put(f.root, 'node_modules/old-marker.txt', 'old modules');
  put(f.source, 'package.json', JSON.stringify({ ...f.pkg, dependencies: { 'fixture-dep': '1.0.0' } })); f.commit();
  await assert.rejects(f.manager.installUpdate(), error => {
    assert.equal(error.code, 'UPDATE_DEPENDENCIES_FAILED');
    assert.match(describeError(error).detail, /native compiler failed/); return true;
  });
  assert.equal(f.read('node_modules/old-marker.txt'), 'old modules');
  assert.deepEqual(JSON.parse(f.read('package.json')), f.pkg);
  assertProtected(f);
});

test('npm timeout cancels installation and preserves the old modules', async t => {
  const f = fixture(t); fakeNpm(t, f, 'timeout');
  env(t, { BOT_UPDATE_NPM_TIMEOUT_MS: '1000' });
  put(f.root, 'node_modules/old-marker.txt', 'old modules');
  put(f.source, 'package.json', JSON.stringify({ ...f.pkg, dependencies: { 'fixture-dep': '1.0.0' } })); f.commit();
  await assert.rejects(f.manager.installUpdate(), { code: 'UPDATE_COMMAND_TIMEOUT' });
  assert.equal(f.read('node_modules/old-marker.txt'), 'old modules');
});

test('concurrent updates are rejected without corrupting files', async t => {
  const f = fixture(t);
  const first = f.manager.checkUpdate();
  await assert.rejects(f.manager.installUpdate(), { code: 'UPDATE_BUSY' });
  await first;
  assertProtected(f);
});

test('stale locks and corrupt state are recovered', async t => {
  const f = fixture(t);
  put(f.root, '.update/lock/owner.json', JSON.stringify({ pid: 2147483647 }));
  put(f.root, '.update/state.json', '{broken');
  await f.manager.checkUpdate();
  assert.equal(fs.existsSync(path.join(f.root, '.update/lock')), false);
  assert(fs.readdirSync(path.join(f.root, '.update')).some(name => name.startsWith('state.json.invalid-')));
});

test('invalid JavaScript is rejected before modifying the bot', async t => {
  const f = fixture(t);
  put(f.source, 'DADOS/MÓDULOS/plugins/sample.js', 'module.exports = ('); f.commit();
  await assert.rejects(f.manager.installUpdate(), { code: 'UPDATE_SYNTAX_INVALID' });
  assert.equal(f.read('DADOS/MÓDULOS/plugins/sample.js'), 'module.exports = "old";\n');
  assertProtected(f);
});

test('symbolic links cannot redirect an update into the database', async t => {
  const f = fixture(t);
  fs.rmSync(path.join(f.root, 'DADOS/MÓDULOS/plugins'), { recursive: true });
  fs.symlinkSync(path.join(f.root, 'DADOS/database'), path.join(f.root, 'DADOS/MÓDULOS/plugins'));
  await assert.rejects(f.manager.installUpdate(), { code: 'UPDATE_UNSAFE_PATH' });
  assertProtected(f);
});

test('new files roll back and upstream deletions preserve locally edited files', async t => {
  const f = fixture(t);
  put(f.source, 'DADOS/obsolete.js', 'module.exports = 1;\n');
  put(f.source, 'DADOS/edited.js', 'module.exports = 2;\n'); f.commit();
  await f.manager.installUpdate();
  put(f.root, 'DADOS/edited.js', 'module.exports = "custom";\n');
  fs.unlinkSync(path.join(f.source, 'DADOS/obsolete.js')); fs.unlinkSync(path.join(f.source, 'DADOS/edited.js'));
  put(f.source, 'DADOS/new.js', 'module.exports = 3;\n'); f.commit();
  const result = await f.manager.installUpdate();
  assert.equal(result.filesDeleted, 1);
  assert.equal(f.read('DADOS/edited.js'), 'module.exports = "custom";\n');
  assert.equal(fs.existsSync(path.join(f.root, 'DADOS/obsolete.js')), false);
  await f.manager.rollback();
  assert.equal(f.read('DADOS/obsolete.js'), 'module.exports = 1;\n');
  assert.equal(fs.existsSync(path.join(f.root, 'DADOS/new.js')), false);
});

test('failure during atomic replacement restores every modified file', async t => {
  const f = fixture(t);
  put(f.source, 'DADOS/MÓDULOS/plugins/sample.js', 'module.exports = "new";\n');
  put(f.source, 'DADOS/database/lib/runtime.js', 'module.exports = "new";\n'); f.commit();
  const rename = fs.renameSync;
  let failed = false;
  t.mock.method(fs, 'renameSync', (from, to) => {
    if (!failed && to === path.join(f.root, 'DADOS/database/lib/runtime.js')) {
      failed = true; const error = new Error('disk full'); error.code = 'ENOSPC'; throw error;
    }
    return rename(from, to);
  });
  await assert.rejects(f.manager.installUpdate(), { code: 'UPDATE_NO_SPACE' });
  assert.equal(f.read('DADOS/MÓDULOS/plugins/sample.js'), 'module.exports = "old";\n');
  assert.equal(f.read('DADOS/database/lib/runtime.js'), 'module.exports = "old";\n');
  assert.equal(fs.existsSync(path.join(f.root, '.update/pending.json')), false);
  assertProtected(f);
});

test('process interruption is recovered at the next startup', async t => {
  const f = fixture(t);
  put(f.source, 'DADOS/MÓDULOS/plugins/sample.js', 'module.exports = "new";\n'); f.commit();
  const script = [
    'const fs=require("fs"),path=require("path");const options=JSON.parse(process.argv[1]);',
    'const manager=require(process.argv[2]).createUpdateManager(options);',
    'const original=fs.renameSync;fs.renameSync=function(from,to){const result=original(from,to);',
    'if(to===path.join(options.root,"DADOS/MÓDULOS/plugins/sample.js"))process.exit(75);return result;};',
    'manager.installUpdate().catch(e=>{console.error(e);process.exit(1)});'
  ].join('');
  const crashed = spawnSync(process.execPath, ['-e', script, JSON.stringify(f.options), managerFile], { encoding: 'utf8' });
  assert.equal(crashed.status, 75, crashed.stderr);
  assert.equal(f.read('DADOS/MÓDULOS/plugins/sample.js'), 'module.exports = "new";\n');
  await f.manager.recover();
  assert.equal(f.read('DADOS/MÓDULOS/plugins/sample.js'), 'module.exports = "old";\n');
  assert.equal(fs.existsSync(path.join(f.root, '.update/pending.json')), false);
  assertProtected(f);
});

test('Termux invokes installed tnode for Git and npm and stays responsive', async t => {
  const f = fixture(t); fakeNpm(t, f);
  const prefix = path.join(f.base, 'prefix'), calls = path.join(f.base, 'tnode-calls');
  const wrapper = put(prefix, 'bin/tnode', '#!/bin/sh\nprintf "%s\\n" "$1" >> "$FIXTURE_TNODE_LOG"\nsleep 0.02\nexec "$@"\n');
  fs.chmodSync(wrapper, 0o755);
  env(t, { TERMUX_VERSION: 'fixture', PREFIX: prefix, TNODE_PATH: wrapper, FIXTURE_TNODE_LOG: calls, BOT_UPDATE_TNODE: null });
  put(f.source, 'package.json', JSON.stringify({ ...f.pkg, dependencies: { 'fixture-dep': '1.0.0' } })); f.commit();
  let ticks = 0;
  const timer = setInterval(() => ticks++, 5);
  try {
    const result = await f.manager.installUpdate();
    assert.equal(result.source, 'git-staging-termux');
    assert(ticks > 10, 'event loop must stay responsive');
    const commands = fs.readFileSync(calls, 'utf8');
    assert.match(commands, /git/); assert(commands.includes(process.execPath));
  } finally { clearInterval(timer); }
  assertProtected(f);
});

test('error details hide access tokens and credential URLs', t => {
  env(t, { BOT_UPDATE_TOKEN: 'fixture-secret' });
  const info = describeError({ code: 'UPDATE_FETCH_FAILED', message: 'failed fixture-secret',
    cause: { stderr: 'https://user:fixture-secret@github.com/fixture/repo Authorization: Basic ' + Buffer.from('x-access-token:fixture-secret').toString('base64') } });
  assert(!JSON.stringify(info).includes('fixture-secret'));
  assert(!JSON.stringify(info).includes(Buffer.from('x-access-token:fixture-secret').toString('base64')));
});

test('Git blob hashes match Git object IDs', t => {
  const f = fixture(t);
  const data = Buffer.from('a fixture\n');
  put(f.base, 'blob.txt', data);
  assert.equal(blobSha(data), execFileSync('git', ['hash-object', path.join(f.base, 'blob.txt')], { encoding: 'utf8' }).trim());
});
