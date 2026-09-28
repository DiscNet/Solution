process.chdir(require('path').resolve(__dirname, '..'));
require('./MÓDULOS/functions/runtimeCompat').applyRuntimeEnvironment();

const manager = require('./MÓDULOS/functions/updateManager');

function log(text) {
  console.log(`[UPDATE] ${text}`);
}

function printCheck(check) {
  console.log('');
  console.log('=== ATUALIZAÇÃO DO BOT ===');
  console.log(`Fonte: ${check.source}`);
  console.log(`Local:  ${manager.shortSha(check.localCommit)}`);
  console.log(`Remoto: ${manager.shortSha(check.remoteCommit)}`);
  console.log(`Alterações: ${check.changes.length}`);

  if (!check.changes.length) {
    console.log('Status: já está atualizado.');
    return;
  }

  for (const item of check.changes.slice(0, 30)) {
    const symbol = item.type === 'delete' ? '-' : item.type === 'create' ? '+' : '~';
    console.log(`${symbol} ${item.path}`);
  }
  if (check.changes.length > 30) {
    console.log(`... e mais ${check.changes.length - 30} arquivo(s).`);
  }
}

async function main(actionOverride) {
  const action = String(actionOverride || process.argv[2] || 'start').toLowerCase();

  try {
    if (action === 'check' || action === 'info') {
      const check = await manager.checkUpdate();
      printCheck(check);
      return check.available ? 10 : 0;
    }

    if (action === 'rollback') {
      log('Restaurando o último backup...');
      const result = manager.rollback();
      log(`Rollback concluído. Arquivos restaurados: ${result.files}.`);
      return 0;
    }

    if (!['start', 'up', 'update'].includes(action)) {
      console.log('Uso: node DADOS/update.js [check|start|rollback]');
      return 2;
    }

    log('Verificando alterações no GitHub...');
    const result = await manager.installUpdate(log);
    if (!result.updated) {
      log(`Nenhuma atualização pendente (${manager.shortSha(result.version)}).`);
      return 0;
    }

    log(`Atualização concluída: ${manager.shortSha(result.from)} -> ${manager.shortSha(result.version)}.`);
    log(`${result.filesUpdated} arquivo(s) atualizado(s), ${result.filesDeleted} removido(s).`);
    log('Dados protegidos foram preservados.');
    return 0;
  } catch (error) {
    console.error(`[UPDATE] ERRO: ${error?.message || error}`);
    return 1;
  }
}

if (require.main === module) {
  main().then(code => {
    process.exitCode = code;
  });
}

module.exports = { main };
