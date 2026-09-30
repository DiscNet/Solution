const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const runtime = require('../MÓDULOS/functions/runtimeCompat');
const { createLogger } = require('../MÓDULOS/functions/terminalLogger');

test('installed lolcat is used to color the ASCII banner', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lolcat-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'lolcat');
  fs.writeFileSync(file, '#!/bin/sh\nprintf "LOL_EFFECT:"\ncat\n', { mode: 0o755 });
  const old = { path: process.env.LOLCAT_PATH, noColor: process.env.NO_COLOR };
  process.env.LOLCAT_PATH = file; delete process.env.NO_COLOR;
  t.after(() => {
    if (old.path == null) delete process.env.LOLCAT_PATH; else process.env.LOLCAT_PATH = old.path;
    if (old.noColor == null) delete process.env.NO_COLOR; else process.env.NO_COLOR = old.noColor;
  });
  let output = '';
  const stream = { isTTY: true, write: value => { output += value; } };
  createLogger('BOT', { stdout: stream, stderr: stream }).banner('Meu Bot');
  assert.match(output, /^LOL_EFFECT:/); assert.match(output, /Meu Bot/);
});

test('non-executable npm scripts run through the current Node', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'npm-cli.js');
  fs.writeFileSync(file, '#!/usr/bin/env node\nconsole.log(process.argv.slice(2).join("|"));\n', { mode: 0o644 });
  const old = process.env.npm_execpath;
  process.env.npm_execpath = file;
  t.after(() => { if (old == null) delete process.env.npm_execpath; else process.env.npm_execpath = old; });
  const command = runtime.commandSpec('npm', ['install', 'arg with spaces']);
  assert.equal(command.file, process.execPath);
  assert.deepEqual(command.args, [file, 'install', 'arg with spaces']);
  const result = await runtime.execFileCompat('npm', ['install', 'arg with spaces'], { encoding: 'utf8' });
  assert.equal(result.stdout.trim(), 'install|arg with spaces');
});

test('Android external storage is recognized', () => {
  assert.equal(runtime.isAndroidExternalStorage('/storage/emulated/0/bot'), true);
  assert.equal(runtime.isAndroidExternalStorage('/sdcard/bot'), true);
  assert.equal(runtime.isAndroidExternalStorage('/data/data/com.termux/files/home/bot'), false);
});

test('plain logs have timestamps and levels without terminal color codes', t => {
  let output = '';
  const stream = { isTTY: false, write: value => { output += value; } };
  const old = process.env.NO_COLOR; process.env.NO_COLOR = '1';
  t.after(() => { if (old == null) delete process.env.NO_COLOR; else process.env.NO_COLOR = old; });
  const logger = createLogger('UPDATE', { stdout: stream, stderr: stream });
  logger.banner('Meu Bot'); logger.success('concluído'); logger.error('falhou');
  assert.match(output, /Meu Bot/); assert.match(output, /\[\d{2}:\d{2}:\d{2}\] \[UPDATE\] \[SUCCESS\]/);
  assert.match(output, /\[ERROR\] falhou/); assert(!output.includes('\x1b'));
});

test('missing lolcat falls back to ANSI without breaking startup', t => {
  let output = '';
  const stream = { isTTY: true, write: value => { output += value; } };
  const old = process.env.NO_COLOR; delete process.env.NO_COLOR;
  t.after(() => { if (old != null) process.env.NO_COLOR = old; });
  createLogger('BOT', { stdout: stream, stderr: stream }).banner('Meu Bot');
  assert.match(output, /Meu Bot/);
});
