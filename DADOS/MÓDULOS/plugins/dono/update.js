const config = require('../../../config/config');
const manager = require('../../functions/updateManager');

const prefix = String(config.prefix || '.');

function botName() {
  return String(config.botName || 'Bot').trim() || 'Bot';
}

function shortList(changes) {
  if (!changes.length) return 'Nenhum arquivo pendente.';
  const lines = changes.slice(0, 12).map(item => {
    const symbol = item.type === 'delete' ? '−' : item.type === 'create' ? '+' : '↻';
    return `${symbol} ${item.path}`;
  });
  if (changes.length > 12) lines.push(`… +${changes.length - 12} arquivo(s)`);
  return lines.join('\n');
}

async function sendUpdaterError(conn, msg, from, error) {
  const info = manager.describeError(error);
  const storageWarning =
    manager.isAndroidExternalStorage(manager.ROOT)
      ? '\n\n⚠️ O bot está em armazenamento compartilhado do Android. O updater agora usa o armazenamento interno do Termux para o clone temporário.'
      : '';

  const detail = info.detail
    ? '\n• Detalhe: ' + info.detail.replace(/\s+/g, ' ').slice(0, 500)
    : '';

  await conn.sendMessage(from, {
    text:
      '*❌ Falha no updater*\n\n' +
      '• Código: ' + info.code + '\n' +
      '• Motivo: ' + info.message +
      detail +
      storageWarning
  }, { quoted: msg });
}

module.exports = {
  permissions: { owner: true },
  name: 'update',
  aliases: ['up', 'atualizarbot', 'botupdate'],
  description: 'Verifica, instala ou desfaz atualizações do bot preservando dados locais.',

  async execute(conn, msg, args, from) {
    const action = String(args?.[0] || 'check').trim().toLowerCase();

    try {
    if (action === 'check' || action === 'info') {
      await conn.sendMessage(from, { react: { text: '🔎', key: msg.key } }).catch(() => {});
      const check = await manager.checkUpdate();

      const text = check.available
        ? `*${botName()} — atualização disponível*\n\n` +
          `Local: ${manager.shortSha(check.localCommit)}\n` +
          `Remoto: ${manager.shortSha(check.remoteCommit)}\n` +
          `Fonte: ${check.source}\n` +
          `Alterações: ${check.changes.length}\n\n` +
          `${shortList(check.changes)}\n\n` +
          `Use *${prefix}update start* para instalar.`
        : `*${botName()} — atualizado*\n\n` +
          `Commit: ${manager.shortSha(check.remoteCommit)}\n` +
          `Fonte: ${check.source}\n\n` +
          `Não há alterações pendentes.`;

      await conn.sendMessage(from, { text }, { quoted: msg });
      return;
    }

    if (action === 'start' || action === 'install') {
      await conn.sendMessage(from, {
        text: `*${botName()} — atualização*\n\nVerificando arquivos, criando backup e preservando os dados locais...`
      }, { quoted: msg });

      const result = await manager.installUpdate(text => console.log(`[UPDATE] ${text}`));
      if (!result.updated) {
        await conn.sendMessage(from, {
          text: `*${botName()} — atualizado*\n\nNenhuma alteração pendente.\nCommit: ${manager.shortSha(result.version)}`
        }, { quoted: msg });
        return;
      }

      await conn.sendMessage(from, {
        text: `*${botName()} — atualização concluída*\n\n` +
          `${manager.shortSha(result.from)} → ${manager.shortSha(result.version)}\n` +
          `Arquivos atualizados: ${result.filesUpdated}\n` +
          `Arquivos removidos: ${result.filesDeleted}\n\n` +
          `Database, grupos, sessão, configuração local e .env foram preservados.\n` +
          `O bot será reiniciado agora.`
      }, { quoted: msg });

      setTimeout(() => process.exit(20), 1200);
      return;
    }

    if (action === 'rollback') {
      const result = manager.rollback();
      await conn.sendMessage(from, {
        text: `*${botName()} — rollback concluído*\n\n` +
          `Arquivos restaurados: ${result.files}\n` +
          `Commit restaurado: ${manager.shortSha(result.version)}\n\n` +
          `O bot será reiniciado agora.`
      }, { quoted: msg });
      setTimeout(() => process.exit(20), 1200);
      return;
    }

    await conn.sendMessage(from, {
      text: `Use:\n${prefix}update check\n${prefix}update start\n${prefix}update rollback`
    }, { quoted: msg });
    } catch (error) {
      console.error('[UPDATE COMMAND]', error?.code || '-', error?.message || error);
      await sendUpdaterError(conn, msg, from, error).catch(() => {});
      return;
    }
  }
};

Object.assign(module.exports, {
  menuCategory: 'Dono',
  menuSection: 'Sistema',
  description: 'Atualiza o bot pelo GitHub sem substituir dados persistentes'
});
