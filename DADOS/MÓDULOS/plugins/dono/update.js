const config = require('../../../config/config');
const manager = require('../../functions/updateManager');
const logger = require('../../functions/terminalLogger').createLogger('UPDATE');
const prefix = String(config.prefix || '.');
const botName = () => String(config.botName || 'Bot').trim() || 'Bot';

function shortList(changes) {
  if (!changes.length) return 'Arquivos de código atuais.';
  const lines = changes.slice(0, 10).map(item =>
    (item.type === 'delete' ? '−' : item.type === 'create' ? '+' : '↻') + ' ' + item.path);
  if (changes.length > 10) lines.push('… +' + (changes.length - 10) + ' arquivo(s)');
  return lines.join('\n');
}

module.exports = {
  permissions: { owner: true }, name: 'update', aliases: ['up', 'atualizarbot', 'botupdate'],
  menuCategory: 'Dono', menuSection: 'Sistema',
  description: 'Atualiza o bot pelo GitHub preservando sessão, configurações e dados.',

  async execute(conn, msg, args, from, axios, requestedName) {
    const action = String(args?.[0] || (requestedName === 'up' ? 'start' : 'check')).trim().toLowerCase();
    const reply = text => conn.sendMessage(from, { text }, { quoted: msg });
    const restart = () => {
      if (process.env.BOT_SUPERVISED === '1') setTimeout(() => process.exit(20), 1200);
    };
    const restartText = () => process.env.BOT_SUPERVISED === '1' ?
      'O bot será reiniciado agora.' : 'Reinicie com npm start para carregar os arquivos atualizados.';

    try {
      if (['check', 'info'].includes(action)) {
        await conn.sendMessage(from, { react: { text: '🔎', key: msg.key } }).catch(() => {});
        const check = await manager.checkUpdate(logger.log);
        await reply('*' + botName() + (check.available ? ' — atualização disponível*\n\n' : ' — atualizado*\n\n') +
          'Commit: ' + manager.shortSha(check.remoteCommit) + '\n' +
          'Arquivos pendentes: ' + check.changes.length +
          (check.dependenciesNeeded ? '\nDependências precisam ser sincronizadas.' : '') +
          (check.available ? '\n\n' + shortList(check.changes) + '\n\nUse *' + prefix + 'up start* para instalar.' : ''));
        return;
      }
      if (['start', 'install', 'up', 'update'].includes(action)) {
        await reply('*' + botName() + ' — atualização*\n\nBaixando e validando arquivos. O progresso aparece no terminal.');
        logger.section('Atualizando ' + botName());
        const result = await manager.installUpdate(logger.log);
        if (!result.updated) {
          await reply('*' + botName() + ' — atualizado*\n\nCommit: ' + manager.shortSha(result.version)); return;
        }
        await reply('*' + botName() + ' — atualização concluída*\n\n' +
          'Commit: ' + manager.shortSha(result.version) + '\n' +
          'Arquivos atualizados: ' + result.filesUpdated + '\nRemovidos: ' + result.filesDeleted +
          '\n\nSessão, dados dos grupos e configuração preservados.\n' + restartText());
        restart(); return;
      }
      if (action === 'rollback') {
        const result = await manager.rollback(logger.log);
        await reply('*' + botName() + ' — backup restaurado*\n\nArquivos: ' + result.files + '\n\n' + restartText());
        restart(); return;
      }
      await reply('Use:\n' + prefix + 'up\n' + prefix + 'up check\n' + prefix + 'up rollback');
    } catch (error) {
      const info = manager.describeError(error);
      logger.error(info.code + ': ' + info.message);
      if (info.detail) logger.error(info.detail);
      await reply('*❌ Falha na atualização*\n\n• Código: ' + info.code + '\n• Motivo: ' + info.message +
        (info.detail ? '\n• Detalhe: ' + info.detail.replace(/\s+/g, ' ').slice(-500) : '') +
        (info.hint ? '\n\n' + info.hint : '')).catch(() => {});
      return false;
    }
  }
};
