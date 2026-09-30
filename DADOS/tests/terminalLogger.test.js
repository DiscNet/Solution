const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { Console } = require('console');
const { Writable } = require('stream');
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
  assert.match(out.text, /\x1b\[18F/);
});

test('new messages cancel a repaint so logs never overwrite each other', async () => {
  const out = capture({ isTTY: true });
  const logger = createLogger('BOT', { stdout: out.stream, stderr: out.stream, native: false, env: {} });
  logger.banner({ bot: 'Meu Bot' });
  setTimeout(() => logger.error('mensagem recebida'), 10);
  await logger.flush();
  assert(!out.text.includes('\x1b[18F'));
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
