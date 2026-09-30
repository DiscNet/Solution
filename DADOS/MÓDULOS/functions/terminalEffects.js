const fs = require('fs');
const { spawn } = require('child_process');
const { StringDecoder } = require('string_decoder');
const runtime = require('./runtimeCompat');

const MAX_PENDING_BYTES = 128 * 1024;
const MAX_NATIVE_BYTES = 16 * 1024;
const ESCAPES = /\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\)|[78])|[\s\S]/gu;

function rainbow(text, phase = 0) {
  let column = 0, row = 0, output = '';
  for (const token of String(text).match(ESCAPES) || []) {
    if (token.startsWith('\x1b')) { output += token; continue; }
    if (token === '\n' || token === '\r') {
      output += '\x1b[39m' + token; column = 0;
      if (token === '\n') row++;
      continue;
    }
    if (/[\x00-\x1f\x7f]/.test(token)) { output += token; continue; }
    const point = 0.1 * (phase + row + column / 3);
    const rgb = [0, 2 * Math.PI / 3, 4 * Math.PI / 3].map(offset => Math.round(Math.sin(point + offset) * 127 + 128));
    output += '\x1b[38;2;' + rgb.join(';') + 'm' + token;
    column++;
  }
  return output + '\x1b[39m';
}

function createOutputEffects(options = {}) {
  const stdout = options.stdout || process.stdout, stderr = options.stderr || process.stderr;
  const env = options.env || process.env;
  const streams = new Map([stdout, stderr].map(stream => [stream, {
    write: stream.write.bind(stream), original: stream.write, decoder: new StringDecoder('utf8'), escape: ''
  }]));
  let nativeSpec = null;
  if (options.native !== false) {
    try {
      if (options.nativeSpec) nativeSpec = options.nativeSpec;
      else {
        const file = runtime.resolveExecutable('lolcat');
        fs.accessSync(file, fs.constants.X_OK);
        nativeSpec = runtime.commandSpec('lolcat', [], { useTnode: true });
      }
    } catch (_) {}
  }
  const queue = [], waiters = [];
  let active = null, pendingBytes = 0, phase = 0, closing = false, scheduled = false;
  const colored = () => !env.NO_COLOR && env.BOT_LOG_COLOR !== '0';
  const plain = text => String(text).replace(/\x1b\[[0-9;:]*m/g, '');
  const paint = (text, seed) => colored() ? rainbow(text, seed) : plain(text);
  function emit(entry, text, callback) { return streams.get(entry.stream).write(text, 'utf8', callback); }
  function settle() {
    if (!active && !queue.length) while (waiters.length) waiters.shift()();
  }
  function done(entry) {
    if (active !== entry) return;
    active = null;
    schedule();
    settle();
  }
  function canAnimate(entry) {
    if (!entry.animate || !colored() || env.BOT_LOG_ANIMATE === '0' || !entry.stream.isTTY || queue.length) return false;
    const lines = plain(entry.text).split('\n');
    return entry.text.endsWith('\n') && lines.length > 1 && lines.length < entry.stream.rows &&
      Math.max(...lines.map(line => line.length)) < entry.stream.columns;
  }
  function display(entry, text) {
    entry.shown = true;
    emit(entry, text);
    if (canAnimate(entry)) {
      const rows = (entry.text.match(/\n/g) || []).length;
      let frame = 0;
      function repaint() {
        if (active !== entry) return;
        if (!queue.length && !closing) emit(entry, '\x1b[' + rows + 'F' + paint(entry.text, entry.seed + 7 * (frame + 1)));
        if (++frame < 3 && !queue.length && !closing) {
          entry.timer = setTimeout(repaint, 70); return;
        }
        if (entry.callback) emit(entry, '', entry.callback);
        done(entry);
      }
      entry.timer = setTimeout(repaint, 70);
    } else {
      if (entry.callback) emit(entry, '', entry.callback);
      done(entry);
    }
  }
  function render(entry) {
    active = entry;
    if (!nativeSpec || !colored() || Buffer.byteLength(entry.text) > MAX_NATIVE_BYTES) {
      display(entry, paint(entry.text, entry.seed)); return;
    }
    let child, output = '', bytes = 0, failed = false;
    function complete(code) {
      if (active !== entry) return;
      clearTimeout(entry.timeout);
      if (failed || code !== 0 || !output) {
        nativeSpec = null;
        display(entry, paint(entry.text, entry.seed));
      } else display(entry, output);
    }
    try {
      child = (options.spawn || spawn)(nativeSpec.file, [...nativeSpec.args, '-f', '-S', String(entry.seed + 1)], {
        env, shell: false, stdio: ['pipe', 'pipe', 'pipe']
      });
      entry.child = child;
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', data => {
        bytes += Buffer.byteLength(data);
        if (bytes > 2 * 1024 * 1024) { failed = true; child.kill(); return; }
        output += data;
      });
      child.stderr.resume();
      child.stdin.on('error', () => { failed = true; });
      child.on('error', () => { failed = true; complete(1); });
      child.on('close', complete);
      entry.timeout = setTimeout(() => { failed = true; child.kill(); complete(1); }, 2000);
      child.stdin.end(entry.text);
    } catch (_) { failed = true; complete(1); }
  }
  function drain() {
    scheduled = false;
    if (active || !queue.length) { settle(); return; }
    const entry = queue.shift(); pendingBytes -= Buffer.byteLength(entry.text);
    if (!entry.animate && !entry.callback) {
      while (queue.length && !queue[0].animate && !queue[0].callback && queue[0].stream === entry.stream &&
          Buffer.byteLength(entry.text) + Buffer.byteLength(queue[0].text) <= MAX_NATIVE_BYTES) {
        const next = queue.shift(); pendingBytes -= Buffer.byteLength(next.text); entry.text += next.text;
      }
    }
    render(entry);
  }
  function schedule() {
    if (scheduled || active || !queue.length) return;
    scheduled = true; setImmediate(drain);
  }
  function write(stream, text, settings = {}) {
    text = String(text);
    const entry = { stream, text, seed: phase++, ...settings };
    if (closing || (!active && !queue.length && (!nativeSpec || !colored()) && !canAnimate(entry))) {
      return emit(entry, paint(text, entry.seed), entry.callback);
    }
    queue.push(entry); pendingBytes += Buffer.byteLength(text);
    // Under bursts, skip subprocesses rather than delaying or discarding diagnostics.
    if (pendingBytes > MAX_PENDING_BYTES) nativeSpec = null;
    if (active?.timer) {
      const previous = active; clearTimeout(previous.timer);
      if (previous.callback) emit(previous, '', previous.callback);
      done(previous);
    }
    schedule(); return true;
  }
  function flushSync() {
    closing = true;
    if (active) {
      const entry = active; active = null;
      clearTimeout(entry.timer); clearTimeout(entry.timeout);
      entry.child?.kill();
      if (!entry.shown) emit(entry, paint(entry.text, entry.seed), entry.callback);
      else if (entry.callback) emit(entry, '', entry.callback);
    }
    while (queue.length) {
      const entry = queue.shift(); emit(entry, paint(entry.text, entry.seed), entry.callback);
    }
    pendingBytes = 0; settle();
  }
  function install() {
    for (const [stream, state] of streams) {
      if (state.wrapper) continue;
      state.wrapper = function(chunk, encoding, callback) {
        if (typeof encoding === 'function') { callback = encoding; encoding = undefined; }
        let text = state.escape + (Buffer.isBuffer(chunk) || chunk instanceof Uint8Array
          ? state.decoder.write(Buffer.from(chunk)) : String(chunk));
        const incomplete = /\x1b(?:\[[0-?]*[ -/]*|\][^\x07\x1b]*|)$/.exec(text);
        state.escape = incomplete ? incomplete[0] : '';
        if (incomplete) text = text.slice(0, incomplete.index);
        return write(stream, text, { callback });
      };
      stream.write = state.wrapper;
    }
    return api;
  }
  function restore() {
    flushSync();
    for (const [stream, state] of streams) {
      const tail = state.decoder.end();
      if (tail) state.write(paint(tail, phase++));
      if (state.escape) state.write(state.escape);
      if (stream.write === state.wrapper) stream.write = state.original;
    }
  }
  const api = { write, install, restore, flushSync,
    flush: () => !active && !queue.length ? Promise.resolve() : new Promise(resolve => waiters.push(resolve)) };
  return api;
}

let defaultEffects;
function getEffects() {
  if (!defaultEffects) {
    defaultEffects = createOutputEffects();
    process.once('exit', () => defaultEffects.flushSync());
  }
  return defaultEffects;
}
function installOutputEffects() { return getEffects().install(); }
module.exports = { rainbow, createOutputEffects, getEffects, installOutputEffects };
