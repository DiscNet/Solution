'use strict';
const system = require('../../functions/stickerAudio');

module.exports = {
  name: 'autostickeraudio',
  aliases: [],
  permissions: { group: true, admin: true },
  description: 'Ativa ou desativa a conversão automática de áudios em figurinhas sonoras.',
  async execute(conn, msg, args, from) {
    const option = String(args?.[0] || '').toLowerCase();
    if (!['1', '0', 'on', 'off', 'ativar', 'desativar'].includes(option)) {
      return conn.sendMessage(from, { text: 'Uso: .autostickeraudio 1 (ativar) ou .autostickeraudio 0 (desativar).' }, { quoted: msg });
    }
    const enabled = ['1', 'on', 'ativar'].includes(option);
    if (enabled && !system.isRegistered()) {
      return conn.sendMessage(from, { text: 'O dono precisa registrar uma figurinha primeiro com .rgfigaudio.' }, { quoted: msg });
    }
    system.setAuto(from, enabled);
    return conn.sendMessage(from, { text: enabled ? 'Figurinha sonora automática ativada neste grupo.' : 'Figurinha sonora automática desativada neste grupo.' }, { quoted: msg });
  },
  async autoHandler(conn, msg, from) {
    return system.autoHandler(conn, msg, from);
  }
};
