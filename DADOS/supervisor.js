const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2).map(value => String(value).toLowerCase());
const updateMode = args.some(value => ['up', 'update'].includes(value));

if (updateMode) {
  const { main } = require('./update');
  main('start').then(code => process.exit(code)).catch(error => {
    console.error('[SUPERVISOR] Falha ao executar atualização:', error?.message || error);
    process.exit(1);
  });
} else {
  let child = null;
  let stopping = false;

  function start() {
    child = spawn(process.execPath, [path.join(__dirname, 'railway-start.js')], {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit'
    });

    child.on('exit', (code, signal) => {
      child = null;
      if (stopping) process.exit(code || 0);

      if (code === 20) {
        console.log('[SUPERVISOR] Reinício solicitado após atualização.');
        setTimeout(start, 1000);
        return;
      }

      if (signal) {
        console.error(`[SUPERVISOR] Runtime encerrado por sinal ${signal}.`);
        process.exit(1);
      }

      process.exit(code ?? 1);
    });
  }

  function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    if (child && !child.killed) child.kill(signal);
    else process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  start();
}
