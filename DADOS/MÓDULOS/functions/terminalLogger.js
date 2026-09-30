const layout = require('./terminalLayout');
const { createOutputEffects, getEffects, installOutputEffects } = require('./terminalEffects');

function createLogger(scope = 'BOT', streams = {}) {
  const out = streams.stdout || process.stdout;
  const err = streams.stderr || process.stderr;
  const effects = streams.effects || (out === process.stdout && err === process.stderr
    ? getEffects() : createOutputEffects({ ...streams, stdout: out, stderr: err }));
  function raw(text, options = {}) {
    return effects.write(options.level === 'error' ? err : out, String(text), options);
  }
  function write(message, level = 'info') {
    const label = level === 'error' ? 'Erro' : level === 'warn' ? 'Aviso' : layout.clean(scope);
    return raw(' ! ' + label + ': ' + layout.clean(message) + '\n', { level });
  }
  function banner(details = {}) {
    return raw(layout.startup(typeof details === 'string' ? { bot: details } : details), { animate: true });
  }
  return {
    log: write, info: text => write(text), success: text => write(text, 'success'),
    warn: text => write(text, 'warn'), error: text => write(text, 'error'), banner, raw,
    flush: () => effects.flush()
  };
}

module.exports = { createLogger, installOutputEffects };
