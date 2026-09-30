const { execFileCompatSync } = require('./runtimeCompat');

const COLORS = { info: 36, success: 32, warn: 33, error: 31 };
function clean(value) { return String(value ?? '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\r\n]+/g, ' ').trim(); }
function createLogger(scope = 'BOT', streams = {}) {
  const out = streams.stdout || process.stdout;
  const err = streams.stderr || process.stderr;
  const colors = () => !process.env.NO_COLOR && (out.isTTY || process.env.FORCE_COLOR === '1');
  function write(message, level = 'info') {
    let time;
    try { time = new Date().toLocaleTimeString('pt-BR', { timeZone: process.env.BOT_LOG_TIMEZONE || 'America/Fortaleza' }); }
    catch (_) { time = new Date().toLocaleTimeString('pt-BR'); }
    const label = '[' + time + '] [' + clean(scope) + '] [' + level.toUpperCase() + ']';
    const prefix = colors() ? '\x1b[' + (COLORS[level] || 36) + 'm' + label + '\x1b[0m' : label;
    (level === 'error' ? err : out).write(prefix + ' ' + clean(message) + '\n');
  }
  function banner(title = scope) {
    const art = [
      '', '         /\\', '        /  \\', '   ____/ /\\ \\____',
      '   \\   \\/  \\/   /', '    \\   /\\ /\\  /', '     \\_/  V  \\_/',
      '', '  ' + clean(title), '  ' + '-'.repeat(44), ''
    ].join('\n');
    if (colors()) {
      try {
        const result = execFileCompatSync('lolcat', ['-f'], {
          input: art, encoding: 'utf8', timeout: 1200, maxBuffer: 64 * 1024,
          useTnode: true, stdio: ['pipe', 'pipe', 'pipe']
        });
        out.write(result); return;
      } catch (_) {}
      out.write('\x1b[35m' + art + '\x1b[0m\n');
    } else out.write(art + '\n');
  }
  return { log: write, info: text => write(text), success: text => write(text, 'success'),
    warn: text => write(text, 'warn'), error: text => write(text, 'error'), banner };
}
module.exports = { createLogger };
