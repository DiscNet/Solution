const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { Console } = require('console');
const { spawnSync } = require('child_process');
const { Writable } = require('stream');
const { inspect } = require('util');
const layout = require('../MÓDULOS/functions/terminalLayout');
const { createLogger } = require('../MÓDULOS/functions/terminalLogger');
const { createOutputEffects } = require('../MÓDULOS/functions/terminalEffects');
const strip = value => String(value).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');

function capture(properties = {}) {
  let output = '';
  const stream = new Writable({ write(chunk, encoding, callback) { output += chunk.toString('utf8'); callback(); } });
  Object.assign(stream, { isTTY: false, columns: 100, rows: 50, ...properties });
  return { stream, get text() { return output; } };
}
function fixture(t, source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-effect-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'fake-lolcat.js');
  fs.writeFileSync(file, source);
  return { dir, nativeSpec: { file: process.execPath, args: [file] } };
}

test('startup plus command reproduce the supplied file byte for byte, including spacing', async () => {
  const reference = fs.readFileSync(path.join(__dirname, 'fixtures', 'terminal-layout.txt'), 'utf8');
  assert.equal(layout.startup() + layout.command(), reference);
  const out = capture();
  const logger = createLogger('BOT', { stdout: out.stream, stderr: out.stream, native: false, env: {} });
  logger.banner(); logger.raw(layout.command()); await logger.flush();
  assert.equal(strip(out.text), reference);
});

test('configured fields, command aliases and public names preserve the model labels', () => {
  const header = layout.startup({ bot: 'Meu Bot', owner: 'João', number: '5511999990000', commands: 0 });
  assert.match(header, / ! Bot: Meu Bot\n ! Dono: João\n ! número: 5511999990000\n ! CMD'S: 0\n/);
  const command = layout.command({ name: '!linkgp', user: 'João Augusto', group: 'Meu grupo' });
  assert.match(command, /    ~ Comando: !linkgp\n    ~ Usuário: João Augusto\n      ~ Grupo: Meu grupo\n/);
  assert(!command.includes('[CMD]'));
  assert.equal(layout.clean('nome\x1b[2J\nINVASÃO\x07'), 'nome INVASÃO');
});

test('the separator appears at startup, once before all command records', async () => {
  const out = capture();
  const logger = createLogger('BOT', { stdout: out.stream, stderr: out.stream, native: false, env: {} });
  logger.banner({ bot: 'Meu Bot', owner: 'João', number: '5511999990000', commands: 2 });
  assert.equal(strip(out.text).split(layout.SEPARATOR).length - 1, 1);
  assert.match(strip(out.text), / ! CMD'S: 2\n\n\n   █{64}\n/);
  for (const name of ['.menu', '.ascii TESTE', '.up']) logger.raw(layout.command({ name, user: 'João', group: 'Privado' }));
  await logger.flush();
  const text = strip(out.text);
  assert.equal(text.split(layout.SEPARATOR).length - 1, 1);
  assert.equal(text.split('     + Comando usado!').length - 1, 3);
  assert(text.indexOf(layout.SEPARATOR) < text.indexOf('     + Comando usado!'));
  assert.match(out.text, /\x1b\[38;2;/);
});

test('update sections have a compact colored heading without startup fields or another separator', async () => {
  const out = capture();
  const logger = createLogger('UPDATE', { stdout: out.stream, stderr: out.stream, native: false, env: {} });
  logger.section('Atualizando Meu Bot'); logger.info('Validando 3 arquivos...');
  await logger.flush();
  assert.equal(strip(out.text), '\n ! UPDATE: Atualizando Meu Bot\n\n ! UPDATE: Validando 3 arquivos...\n');
  assert(!strip(out.text).includes(layout.SEPARATOR));
  assert(!/ ! (Bot|Dono|número|CMD'S):/.test(strip(out.text)));
  assert.match(out.text, /\x1b\[38;2;/);
});

test('fallback rainbow colors information, warnings and stderr while preserving text', async () => {
  const out = capture(), err = capture();
  const logger = createLogger('UPDATE', { stdout: out.stream, stderr: err.stream, native: false, env: {} });
  logger.info('informação'); logger.warn('aviso'); logger.error('falha'); await logger.flush();
  assert.equal(strip(out.text), ' ! UPDATE: informação\n ! Aviso: aviso\n');
  assert.equal(strip(err.text), ' ! Erro: falha\n');
  assert.match(out.text, /\x1b\[38;2;/); assert.match(err.text, /\x1b\[38;2;/);
  assert(new Set(out.text.match(/\x1b\[38;2;[0-9;]+m/g)).size > 5);
});

test('output installation colors Console messages and direct writes, and restores streams', async () => {
  const out = capture(), err = capture();
  const original = out.stream.write;
  const effects = createOutputEffects({ stdout: out.stream, stderr: err.stream, native: false, env: {} }).install();
  const console = new Console({ stdout: out.stream, stderr: err.stream });
  console.log('normal'); console.error('erro'); out.stream.write('direto\n');
  await effects.flush(); effects.restore();
  assert.equal(strip(out.text), 'normal\ndireto\n');
  assert.equal(strip(err.text), 'erro\n');
  assert.match(out.text, /\x1b\[38;2;/); assert.match(err.text, /\x1b\[38;2;/);
  assert.equal(out.stream.write, original);
});

test('library session and interactive debug calls are discarded before inspecting their objects', async t => {
  const out = capture(), err = capture();
  const target = new Console({ stdout: out.stream, stderr: err.stream });
  const originals = new Map(['log', 'info', 'debug'].map(method => [method, target[method]]));
  let inspected = 0;
  const session = { [inspect.custom]() { inspected++; return 'SessionEntry { syntheticKey }'; } };
  const interactive = { [inspect.custom]() { inspected++; return '{ type: native_flow }'; } };
  const effects = createOutputEffects({ stdout: out.stream, stderr: err.stream, console: target, native: false, env: {} }).install();
  t.after(() => effects.restore());
  const wrapper = target.info;
  effects.install();
  assert.equal(target.info, wrapper);
  for (const method of ['log', 'info', 'debug']) {
    target[method]('Closing session:', session);
    target[method]('Interactive send:', interactive);
  }
  target.log('Closing session: SessionEntry {\n  syntheticKey: <Buffer 00>\n}');
  target.log("Interactive send: {\n  type: 'native_flow'\n}");
  await effects.flush();
  assert.equal(out.text, ''); assert.equal(err.text, ''); assert.equal(inspected, 0);
  effects.restore();
  for (const [method, original] of originals) assert.equal(target[method], original);
  target.info('Closing session:', session);
  assert.equal(inspected, 1);
  assert.match(out.text, /Closing session: SessionEntry/);
});

test('the debug filter keeps real failures, warnings, formatting and unrelated messages colored', async t => {
  const out = capture(), err = capture();
  const target = new Console({ stdout: out.stream, stderr: err.stream });
  const effects = createOutputEffects({ stdout: out.stream, stderr: err.stream, console: target, native: false, env: {} }).install();
  t.after(() => effects.restore());
  target.log('normal %s %d', 'João', 2);
  target.log('Mensagem contém Interactive send: e Closing session:');
  target.info('Closing session: operação falhou');
  target.log('Interactive send: envio falhou');
  target.info('Closing session:', new Error('falha de sessão'));
  target.warn('Closing session:', { status: 'aviso importante' });
  target.error('Interactive send:', new Error('falha de envio'));
  await effects.flush();
  assert.match(strip(out.text), /normal João 2\n/);
  assert.match(strip(out.text), /Mensagem contém Interactive send: e Closing session:/);
  assert.match(strip(out.text), /Closing session: operação falhou\nInteractive send: envio falhou\n/);
  assert.match(strip(out.text), /Closing session: Error: falha de sessão/);
  assert.match(strip(err.text), /aviso importante/);
  assert.match(strip(err.text), /Interactive send: Error: falha de envio/);
  assert.match(out.text, /\x1b\[38;2;/); assert.match(err.text, /\x1b\[38;2;/);
});

test('the production installer filters global Console calls even when colors are disabled', () => {
  const file = require.resolve('../MÓDULOS/functions/terminalEffects');
  const child = spawnSync(process.execPath, ['-e',
    'require(process.argv[1]).installOutputEffects();' +
    'console.info("Closing session:",{currentRatchet:{rootKey:Buffer.from("synthetic")}});' +
    'console.log("Interactive send:",{type:"native_flow",private:true,aimode:true});' +
    'console.log("comando visível");console.error("falha real visível");', file
  ], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' }, timeout: 10000 });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, 'comando visível\n');
  assert.equal(child.stderr, 'falha real visível\n');
});

test('split UTF-8 buffers preserve ASCII blocks, accents and write callbacks', async () => {
  const out = capture();
  const effects = createOutputEffects({ stdout: out.stream, stderr: out.stream, native: false, env: {} }).install();
  const bytes = Buffer.from('█ João\n');
  const callbacks = [];
  out.stream.write(bytes.subarray(0, 2), () => callbacks.push('first'));
  out.stream.write(bytes.subarray(2, 6), () => callbacks.push('second'));
  await new Promise(resolve => out.stream.write(bytes.subarray(6), () => { callbacks.push('third'); resolve(); }));
  await effects.flush(); effects.restore();
  assert.equal(strip(out.text), '█ João\n');
  assert.deepEqual(callbacks, ['first', 'second', 'third']);
});

test('NO_COLOR disables both coloring and animation even with a native executable', async t => {
  const fake = fixture(t, 'throw new Error("must not run");');
  const out = capture({ isTTY: true });
  const logger = createLogger('BOT', { stdout: out.stream, stderr: out.stream, ...fake, env: { NO_COLOR: '1' } });
  logger.banner({ bot: 'Meu Bot' }); await logger.flush();
  assert.equal(out.text, layout.startup({ bot: 'Meu Bot' }));
  assert(!out.text.includes('\x1b'));
});

test('native lolcat receives all log classes asynchronously with force-color flags', async t => {
  const fake = fixture(t, 'let text="";process.stdin.setEncoding("utf8");process.stdin.on("data",x=>text+=x);' +
    'process.stdin.on("end",()=>{if(!process.argv.includes("-f"))process.exit(2);' +
    'process.stdout.write("\\x1b[38;2;1;2;3m"+text+"\\x1b[0m");});');
  const out = capture(), err = capture();
  const logger = createLogger('BOT', { stdout: out.stream, stderr: err.stream, ...fake, env: {} });
  logger.banner({ bot: 'Meu Bot' }); logger.info('normal'); logger.warn('atenção'); logger.error('erro');
  assert.equal(out.text, '');
  await logger.flush();
  assert.match(out.text, /\x1b\[38;2;1;2;3m/); assert.match(err.text, /\x1b\[38;2;1;2;3m/);
  assert.match(strip(out.text), / ! Bot: Meu Bot/); assert.match(strip(out.text), / ! Aviso: atenção/);
  assert.equal(strip(err.text), ' ! Erro: erro\n');
});

test('failed native effects do not duplicate, lose or expose subprocess diagnostics', async t => {
  const fake = fixture(t, 'process.stdout.write("broken native output");process.stderr.write("native error");process.exitCode=1;');
  const out = capture();
  const logger = createLogger('BOT', { stdout: out.stream, stderr: out.stream, ...fake, env: {} });
  logger.info('primeira'); logger.error('segunda'); await logger.flush();
  assert.equal(strip(out.text), ' ! BOT: primeira\n ! Erro: segunda\n');
});

test('a missing native executable safely falls back for every queued message', async () => {
  const out = capture();
  const logger = createLogger('BOT', { stdout: out.stream, stderr: out.stream,
    nativeSpec: { file: '/no-such-lolcat-command', args: [] }, env: {} });
  logger.info('um'); logger.warn('dois'); await logger.flush();
  assert.equal(strip(out.text), ' ! BOT: um\n ! Aviso: dois\n');
});

test('animation repaints only compatible terminal blocks without blocking the event loop', async () => {
  const out = capture({ isTTY: true });
  const logger = createLogger('BOT', { stdout: out.stream, stderr: out.stream, native: false, env: {} });
  logger.banner({ bot: 'Meu Bot' });
  let eventRan = false;
  setTimeout(() => { eventRan = true; }, 10);
  await logger.flush();
  assert.equal(eventRan, true);
  assert.match(out.text, /\x1b\[21F/);
});

test('new messages cancel a repaint so logs never overwrite each other', async () => {
  const out = capture({ isTTY: true });
  const logger = createLogger('BOT', { stdout: out.stream, stderr: out.stream, native: false, env: {} });
  logger.banner({ bot: 'Meu Bot' });
  setTimeout(() => logger.error('mensagem recebida'), 10);
  await logger.flush();
  assert(!out.text.includes('\x1b[21F'));
  assert.equal(strip(out.text), layout.startup({ bot: 'Meu Bot' }) + ' ! Erro: mensagem recebida\n');
});

test('non-TTY, narrow terminals and disabled animations retain a single copy of the layout', async () => {
  for (const [properties, env] of [
    [{ isTTY: false }, {}], [{ isTTY: true, columns: 30 }, {}],
    [{ isTTY: true, rows: 10 }, {}], [{ isTTY: true }, { BOT_LOG_ANIMATE: '0' }]
  ]) {
    const out = capture(properties);
    const logger = createLogger('BOT', { stdout: out.stream, stderr: out.stream, native: false, env });
    logger.banner(); await logger.flush();
    assert.equal(strip(out.text), layout.startup());
    assert(!/\x1b\[\d+F/.test(out.text));
  }
});

test('bursts of output are preserved when native queue limits force a fallback', async t => {
  const fake = fixture(t, 'throw new Error("native rendering must be bypassed for a burst");');
  const out = capture();
  const effects = createOutputEffects({ stdout: out.stream, stderr: out.stream, ...fake, env: {} });
  const text = 'A'.repeat(40000) + '\n';
  for (let i = 0; i < 4; i++) effects.write(out.stream, text);
  await effects.flush();
  assert.equal(strip(out.text), text.repeat(4));
});

test('shutdown flushes pending log content exactly once', async t => {
  const fake = fixture(t, 'process.stdin.resume();setInterval(()=>{},1000);');
  const out = capture();
  const effects = createOutputEffects({ stdout: out.stream, stderr: out.stream, ...fake, env: {} });
  effects.write(out.stream, 'um\n'); effects.write(out.stream, 'dois\n');
  await new Promise(resolve => setTimeout(resolve, 20));
  effects.flushSync(); await effects.flush();
  assert.equal(strip(out.text), 'um\ndois\n');
});

test('terminal control sequences and QR background styles survive rainbow coloring', async () => {
  const out = capture();
  const effects = createOutputEffects({ stdout: out.stream, stderr: out.stream, native: false, env: {} }).install();
  out.stream.write('\x1b[2J\x1b[47m  ██\x1b[0m\n');
  await effects.flush(); effects.restore();
  assert(out.text.includes('\x1b[2J')); assert(out.text.includes('\x1b[47m'));
  assert.equal(strip(out.text), '  ██\n');
});

test('split ANSI sequences are kept intact before applying rainbow colors', async () => {
  const out = capture();
  const effects = createOutputEffects({ stdout: out.stream, stderr: out.stream, native: false, env: {} }).install();
  out.stream.write('\x1b['); out.stream.write('2J');
  out.stream.write('\x1b[4'); out.stream.write('7m█\x1b[0m\n');
  await effects.flush(); effects.restore();
  assert(out.text.includes('\x1b[2J')); assert(out.text.includes('\x1b[47m'));
  assert.equal(strip(out.text), '█\n');
});

function loadExecutor(stubs) {
  const source = fs.readFileSync(path.join(__dirname, '../MÓDULOS/functions/commandExecutor.js'), 'utf8');
  const context = { module: { exports: {} }, require: name => {
    if (name === 'perf_hooks') return require(name);
    if (!Object.hasOwn(stubs, name)) throw new Error('Unexpected import: ' + name);
    return stubs[name];
  } };
  vm.runInNewContext(source, context);
  return context.module.exports;
}

function loadScript(relative, stubs, globals = {}) {
  const file = path.resolve(__dirname, '..', relative);
  const context = { module: { exports: {} }, __dirname: path.dirname(file), ...globals,
    require: name => {
      if (name === 'path') return require(name);
      if (!Object.hasOwn(stubs, name)) throw new Error('Unexpected import: ' + name);
      return stubs[name];
    } };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return context.module.exports;
}

test('CLI update checks summarize changes and list files only in verbose mode', async () => {
  for (const verbose of [false, true]) {
    const out = capture();
    const logger = createLogger('UPDATE', { stdout: out.stream, stderr: out.stream, native: false, env: {} });
    const check = { localCommit: 'aaaaaaa', remoteCommit: 'bbbbbbb', available: true, dependenciesNeeded: false,
      changes: [{ type: 'create', path: 'DADOS/example-one.js' }, { type: 'update', path: 'DADOS/example-two.js' }] };
    const { main } = loadScript('update.js', {
      './MÓDULOS/functions/runtimeCompat': { applyRuntimeEnvironment() {} },
      './MÓDULOS/functions/terminalLogger': { installOutputEffects() {}, createLogger: () => logger },
      './MÓDULOS/functions/updateManager': { checkUpdate: async () => check, shortSha: value => value }
    }, { process: { chdir() {}, argv: [], env: verbose ? { BOT_UPDATE_VERBOSE: '1' } : {} } });
    assert.equal(await main('check'), 0); await logger.flush();
    const text = strip(out.text);
    assert.match(text, / ! UPDATE: Verificando atualização\n\n/);
    assert.match(text, /Arquivos pendentes: 2/);
    assert.equal(text.includes('DADOS/example-one.js'), verbose);
    assert(!text.includes(layout.SEPARATOR));
    assert(!/ ! (Bot|Dono|número|CMD'S):/.test(text));
  }
});

test('the bot update command keeps progress and replies with a compact terminal heading', async () => {
  const out = capture(), replies = [];
  const logger = createLogger('UPDATE', { stdout: out.stream, stderr: out.stream, native: false, env: {} });
  const command = loadScript('MÓDULOS/plugins/dono/update.js', {
    '../../../config/config': { prefix: '.', botName: 'Meu Bot' },
    '../../functions/terminalLogger': { createLogger: () => logger },
    '../../functions/updateManager': {
      installUpdate: async log => {
        log('Baixando arquivos...');
        return { updated: true, version: 'bbbbbbb', filesUpdated: 3, filesDeleted: 1 };
      }, shortSha: value => value
    }
  }, { process: { env: {} } });
  await command.execute({ sendMessage: async (jid, payload) => replies.push(payload.text) }, { key: {} }, [], 'owner', null, 'up');
  await logger.flush();
  assert.match(strip(out.text), /^\n ! UPDATE: Atualizando Meu Bot\n\n ! UPDATE: Baixando arquivos\.\.\.\n$/);
  assert.equal(replies.length, 2);
  assert.match(replies[1], /atualização concluída/);
  assert(!strip(out.text).includes(layout.SEPARATOR));
});

test('restart summaries keep group notifications and leave a blank line before command logs', async () => {
  const out = capture(), sent = [], errors = [];
  const logger = createLogger('REINÍCIO', { stdout: out.stream, stderr: out.stream, native: false, env: {} });
  const { createRestartAnnouncer } = loadScript('MÓDULOS/functions/restartAnnouncement.js', {
    './aluguel': { isGrupoAtivo: id => id === 'active@g.us' },
    './ui': { adminCard: () => 'Aviso de reinício', adminRow() {}, smallcaps: value => value },
    './runtimeLogger': { error: error => errors.push(error) },
    './terminalLogger': { createLogger: () => logger }
  });
  const announce = createRestartAnnouncer(() => ({ user: { id: 'bot' },
    groupFetchAllParticipating: async () => ({ active: { id: 'active@g.us' }, inactive: { id: 'inactive@g.us' } }),
    sendMessage: async (id, payload) => sent.push({ id, payload })
  }));
  await announce(); await announce();
  logger.raw(layout.command({ name: '.menu', user: 'Kxlynn', group: 'Privado' }));
  await logger.flush();
  assert.equal(sent.length, 1); assert.equal(sent[0].id, 'active@g.us');
  assert.equal(sent[0].payload.text, 'Aviso de reinício'); assert.equal(errors.length, 0);
  assert.match(strip(out.text), /^\n ! REINÍCIO: 1\/1 grupos ativos avisados\.\n\n     \+ Comando usado!/);
  assert(!out.text.includes('[RESTART NOTICE]'));
  assert.match(out.text, /\x1b\[38;2;/);
});

test('each command attempt logs one block for success, permission denial, policy denial and failure', async () => {
  for (const mode of ['success', 'permission', 'policy', 'false', 'error']) {
    const commands = [], errors = [];
    const stubs = {
      './permissions': { checkCommandPermissions: async () => ({ ok: mode !== 'permission', code: 'OWNER_ONLY' }) },
      './runtimeLogger': { command: data => commands.push(data), error: data => { errors.push(data); return 'ERR_TEST'; } },
      './modLog': { record() {} }, './ui': { reply: async () => {}, permissionMessage: code => code, errorReply: async () => {} },
      './adminPolicy': { record() {}, commandDenial: async () => mode === 'policy' ? 'blocked' : null },
      '../mensagens/erros': { commandExecution: code => code }
    };
    const { executeCommand } = loadExecutor(stubs);
    await executeCommand({ conn: {}, msg: { key: { participant: '5511000000000@s.whatsapp.net' }, pushName: 'João' },
      from: 'fixture@g.us', requestedName: 'linkgp', logContext: { user: 'João', group: 'Meu grupo', prefix: '!' },
      command: { name: 'linkgrupo', async execute() {
        if (mode === 'error') throw new Error('failed');
        if (mode === 'false') return false;
      } }
    });
    assert.equal(commands.length, 1, mode);
    assert.equal(commands[0].name, 'linkgp'); assert.equal(commands[0].group, 'Meu grupo');
    assert.equal(commands[0].user, 'João'); assert.equal(commands[0].prefix, '!');
    assert.equal(errors.length, mode === 'error' ? 1 : 0);
  }
});
