'use strict';
const system = require('../../functions/stickerAudio');
const permissions = require('../../functions/permissions');

const commands = [
  {
    name: 'rgfigaudio',
    aliases: [],
    permissions: { owner: true },
    description: 'Registra a figurinha usada nos envios com áudio.',
    async execute(conn, msg, args, from) {
      if (!permissions.isOwner(msg)) return conn.sendMessage(from, { text: 'Este comando é exclusivo do dono.' }, { quoted: msg });
      try {
        await system.registerSticker(conn, msg);
        return conn.sendMessage(from, { text: 'Figurinha registrada. Responda a um áudio com .figaudio.' }, { quoted: msg });
      } catch (error) {
        return conn.sendMessage(from, { text: 'Não foi possível registrar: ' + error.message }, { quoted: msg });
      }
    }
  },
  {
    name: 'figaudio',
    description: 'Envia a figurinha registrada acompanhada de um áudio.',
    async execute(conn, msg, args, from) {
      try {
        const media = system.currentMedia(msg).audio;
        await system.sendStickerAudio(conn, from, msg, media);
        return conn.sendMessage(from, { text: 'Envio concluído pelo socket. A reprodução depende da versão do WhatsApp do destinatário.' }, { quoted: msg });
      } catch (error) {
        return conn.sendMessage(from, { text: 'Não foi possível enviar: ' + error.message }, { quoted: msg });
      }
    }
  },
  {
    name: 'verfigaudio',
    description: 'Visualiza a figurinha sonora registrada.',
    async execute(conn, msg, args, from) {
      try { return await system.viewSticker(conn, from, msg); }
      catch (error) { return conn.sendMessage(from, { text: error.message }, { quoted: msg }); }
    }
  },
  {
    name: 'delfigaudio',
    permissions: { owner: true },
    description: 'Remove a figurinha sonora registrada.',
    async execute(conn, msg, args, from) {
      if (!permissions.isOwner(msg)) return conn.sendMessage(from, { text: 'Este comando é exclusivo do dono.' }, { quoted: msg });
      const removed = system.removeSticker();
      return conn.sendMessage(from, { text: removed ? 'Registro removido.' : 'Não há figurinha registrada.' }, { quoted: msg });
    }
  }
];
module.exports = { commands };
