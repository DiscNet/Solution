const path = require('path');
const { spawn } = require('child_process');
const runtime = require('./MÓDULOS/functions/runtimeCompat');
runtime.applyRuntimeEnvironment();
const logger = require('./MÓDULOS/functions/terminalLogger').createLogger('SUPERVISOR');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2).map(value => String(value).toLowerCase());

async function main() {
  const manager = require('./MÓDULOS/functions/updateManager');
  await manager.recover(logger.log);
  if (args.some(value => ['up', 'update'].includes(value))) {
    const code = await require('./update').main('start');
    process.exitCode = code; return;
  }
  let child = null, stopping = false, restartTimer = null;
  function start() {
    if (stopping) return;
    const command = runtime.commandSpec('node', [path.join(__dirname, 'railway-start.js')], { useTnode: true });
    child = spawn(command.file, command.args, {
      cwd: ROOT, env: { ...process.env, BOT_SUPERVISED: '1' }, stdio: 'inherit', shell: false,
      detached: process.platform !== 'win32'
    });
    child.on('error', error => {
      logger.error('Falha ao iniciar: ' + error.message); process.exitCode = 1;
    });
    child.on('exit', (code, signal) => {
      child = null;
      if (stopping) { process.exitCode = 0; return; }
      if (code === 20) {
        logger.info('Atualização concluída; reiniciando o bot.');
        restartTimer = setTimeout(start, 1000);
        return;
      }
      if (signal) logger.error('Runtime encerrado por ' + signal + '.');
      process.exitCode = code ?? 1;
    });
  }
  function shutdown(signal) {
    if (stopping) return;
    stopping = true;
    if (restartTimer) clearTimeout(restartTimer);
    if (child && !child.killed) {
      try {
        if (process.platform !== 'win32') process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch (_) { child.kill(signal); }
    }
  }
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  start();
}
main().catch(error => { logger.error(error.message); process.exitCode = 1; });
