const art = require('../../functions/asciiArt');

function createAsciiCommand(dependencies = {}) {
  const quote = dependencies.quote || (msg => require('../../functions/statusCard').createStatusQuoted(msg));
  const getPrefix = dependencies.getPrefix || (() => require('../../../config/config').prefix || '.');
  const convert = dependencies.convert || art.imageToAscii;
  const download = dependencies.download || ((payload, type) =>
    require('@whiskeysockets/baileys').downloadContentFromMessage(payload, type));
  const textCommand = require('./asciitext').createAsciiTextCommand({ quote, getPrefix });
  const fence = String.fromCharCode(96).repeat(3);

  function help(prefix) {
    return '*ASCII — imagem em caracteres*\n\n' +
      'Envie uma imagem com o comando na legenda ou responda a uma foto, figurinha ou imagem enviada como arquivo.\n\n' +
      prefix + 'ascii — tamanho padrão de 32 caracteres, adequado ao celular\n' +
      prefix + 'ascii 80 — mais resolução\n' +
      prefix + 'ascii 60 detalhado — mais níveis de detalhe\n' +
      prefix + 'ascii negativo — inverte claro e escuro\n' +
      prefix + 'ascii arquivo — recebe a arte completa em .txt\n\n' +
      prefix + 'ascii text Olá — desenha letras grandes com quadrados\n\n' +
      'Largura: 16 a 120. As opções podem ser combinadas. Artes grandes ou largas são enviadas em .txt para manter o alinhamento.';
  }

  return {
    name: 'ascii', aliases: ['asciiart'], menuCategory: 'Utilidades', menuSection: 'Imagens',
    description: 'Transforma fotos e figurinhas em arte ASCII.',
    usage: 'ascii [16-120] [detalhado] [negativo] [arquivo] (responda à imagem)',

    async execute(conn, msg, args = [], from) {
      if (['text', 'texto'].includes(String(args[0] || '').toLowerCase())) {
        return textCommand.execute(conn, msg, args.slice(1), from);
      }
      const prefix = String(getPrefix());
      const reply = content => conn.sendMessage(from, content, { quoted: quote(msg) });
      const react = text => conn.sendMessage(from, { react: { text, key: msg.key } }).catch(() => {});
      try {
        const options = art.parseOptions(args);
        if (options.help) return reply({ text: help(prefix) });
        const source = art.imageSource(msg);
        if (!source) return reply({ text: help(prefix) });
        await react('🎨');
        const buffer = await art.downloadImage(source, download);
        const result = await convert(buffer, options);
        const title = '*ASCII Art* — ' + result.width + ' × ' + result.height + ' caracteres';
        const text = title + '\n\n' + fence + '\n' + result.text + '\n' + fence;
        if (options.file || result.width > art.CHAT_WIDTH_LIMIT || text.length > art.TEXT_LIMIT) {
          await reply({
            document: Buffer.from(result.text + '\n', 'utf8'),
            mimetype: 'text/plain', fileName: 'ascii_' + result.width + 'x' + result.height + '.txt',
            caption: title + '\nAbra em um editor com fonte monoespaçada para preservar o desenho.'
          });
        } else await reply({ text });
        await react('✅');
      } catch (error) {
        const code = error.code || 'ERR_ASCII_CONVERT';
        const messages = {
          ERR_ASCII_WIDTH: 'Informe uma largura inteira entre 16 e 120. Exemplo: ' + prefix + 'ascii 60',
          ERR_ASCII_OPTIONS: 'Opção inválida. Use largura, detalhado, negativo ou arquivo. Veja ' + prefix + 'ascii ajuda',
          ERR_ASCII_TOO_LARGE: 'A imagem excede o limite de 12 MB ou 24 megapixels. Envie uma versão menor.',
          ERR_ASCII_DOWNLOAD: 'Não consegui baixar a imagem. Reenvie a mídia e responda a ela com ' + prefix + 'ascii',
          ERR_ASCII_IMAGE: 'Não consegui ler essa imagem. Tente reenviar em JPG, PNG ou WebP.',
          ERR_ASCII_ENGINE: 'O processamento de imagens está indisponível. Verifique o sharp do bot ou o FFmpeg; no Termux, use pkg install ffmpeg.'
        };
        await react('❌');
        await reply({ text: '❌ ' + (messages[code] || 'Não consegui criar a arte ASCII. Tente reenviar a imagem.') });
        error.code = code; error.userMessageSent = true;
        throw error;
      }
    }
  };
}
module.exports = createAsciiCommand();
module.exports.createAsciiCommand = createAsciiCommand;
