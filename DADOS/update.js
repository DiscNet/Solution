const path = require('path');
process.chdir(path.resolve(__dirname, '..'));
require('./MÓDULOS/functions/runtimeCompat').applyRuntimeEnvironment();
const manager = require('./MÓDULOS/functions/updateManager');
const logger = require('./MÓDULOS/functions/terminalLogger').createLogger('UPDATE');

function printCheck(check) {
  logger.info('Local: ' + manager.shortSha(check.localCommit) + ' | GitHub: ' + manager.shortSha(check.remoteCommit));
  logger.info('Arquivos pendentes: ' + check.changes.length + ' | Dependências: ' + (check.dependenciesNeeded ? 'sincronizar' : 'atuais'));
  for (const item of check.changes.slice(0, 20)) {
    logger.info((item.type === 'delete' ? '-' : item.type === 'create' ? '+' : '~') + ' ' + item.path);
  }
  if (check.changes.length > 20) logger.info('Mais ' + (check.changes.length - 20) + ' arquivo(s).');
  (check.available ? logger.info : logger.success)(check.available ? 'Atualização disponível.' : 'Bot atualizado.');
}

async function main(actionOverride) {
  const action = String(actionOverride || process.argv[2] || 'start').toLowerCase();
  logger.banner('ATUALIZAÇÃO DO BOT');
  try {
    if (['check', 'info'].includes(action)) {
      const check = await manager.checkUpdate(logger.log); printCheck(check); return 0;
    }
    if (action === 'rollback') {
      const result = await manager.rollback(logger.log);
      logger.success('Backup restaurado: ' + result.files + ' arquivo(s).'); return 0;
    }
    if (!['start', 'install', 'up', 'update'].includes(action)) {
      logger.info('Uso: node DADOS/update.js [check|start|rollback]'); return 2;
    }
    const result = await manager.installUpdate(logger.log);
    logger.success(result.updated ?
      'Concluído: ' + result.filesUpdated + ' arquivo(s) atualizado(s), ' + result.filesDeleted + ' removido(s).' :
      'Bot atualizado (' + manager.shortSha(result.version) + ').');
    return 0;
  } catch (error) {
    const info = manager.describeError(error);
    logger.error(info.code + ': ' + info.message);
    if (info.detail) logger.error(info.detail);
    if (info.hint) logger.warn(info.hint);
    return 1;
  }
}
if (require.main === module) main().then(code => { process.exitCode = code; }).catch(error => {
  logger.error(error.message); process.exitCode = 1;
});
module.exports = { main };
