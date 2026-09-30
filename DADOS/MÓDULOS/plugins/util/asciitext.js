const art = require('../../functions/asciiText');

function createAsciiTextCommand(dependencies = {}) {
  const quote = dependencies.quote || (msg => require('../../functions/statusCard').createStatusQuoted(msg));
  const getPrefix = dependencies.getPrefix || (() => require('../../../config/config').prefix || '.');
  const fence = String.fromCharCode(96).repeat(3);

  function help(prefix) {
    return '*ASCII Text — texto com quadrados*\n\n' +
      prefix + 'asciitext Olá mundo — letras feitas de ■\n' +
      prefix + 'asciitext --blocos BOT — blocos █\n' +
      prefix + 'asciitext --vazado BOT — quadrados □\n' +
      prefix + 'asciitext --simples BOT — caracteres #\n' +
      prefix + 'asciitext --arquivo Meu texto — arquivo .txt\n' +
      prefix + 'ascii text Meu texto — atalho\n\n' +
      'Também funciona ao responder a uma mensagem de texto ou legenda.\n' +
      'Até ' + art.MAX_TEXT_LENGTH + ' caracteres. Letras em maiúsculas; acentos são convertidos para a letra base. ' +
      'As linhas são ajustadas ao celular e artes longas são enviadas completas em .txt. ' +
      'Coloque as opções antes do texto; use -- para escrever uma opção como texto.';
  }

  return {
    name: 'asciitext', aliases: ['textascii', 'ascii-text'], menuCategory: 'Utilidades', menuSection: 'Texto',
    description: 'Desenha textos em letras grandes feitas de quadrados e blocos.',
    usage: 'asciitext [--quadrados|--blocos|--vazado|--simples] [--arquivo] texto',

    async execute(conn, msg, args = [], from) {
      const prefix = String(getPrefix());
      const reply = content => conn.sendMessage(from, content, { quoted: quote(msg) });
      const react = text => Promise.resolve().then(() =>
        conn.sendMessage(from, { react: { text, key: msg.key } })).catch(() => {});
      try {
        const options = art.parseOptions(args);
        if (options.help) return reply({ text: help(prefix) });
        const source = options.text || art.quotedText(msg);
        if (!source.trim()) return reply({ text: help(prefix) });
        const result = art.renderText(source, options);
        const title = '*ASCII Text* — ' + result.style;
        const text = title + '\n\n' + fence + '\n' + result.text + '\n' + fence;
        if (options.file || text.length > art.TEXT_LIMIT || result.height > art.CHAT_ROW_LIMIT) {
          await reply({
            document: Buffer.from(result.text + '\n', 'utf8'),
            mimetype: 'text/plain', fileName: 'ascii_text.txt',
            caption: title + '\nAbra com fonte monoespaçada para preservar o desenho.'
          });
        } else await reply({ text });
        await react('✅');
      } catch (error) {
        const code = error.code || 'ERR_ASCII_TEXT';
        const messages = {
          ERR_ASCII_TEXT_LIMIT: 'Use até ' + art.MAX_TEXT_LENGTH + ' caracteres de texto.',
          ERR_ASCII_TEXT_EMPTY: 'Digite um texto. Exemplo: ' + prefix + 'asciitext Olá mundo',
          ERR_ASCII_TEXT_CHARACTERS: 'Use letras de A a Z, números e pontuação comum. Acentos são aceitos; emojis e outros alfabetos não têm desenho nessa fonte.',
          ERR_ASCII_TEXT_OPTIONS: 'Opção inválida. Use --quadrados, --blocos, --vazado, --simples ou --arquivo antes do texto. Veja ' + prefix + 'asciitext --ajuda'
        };
        await react('❌');
        await reply({ text: '❌ ' + (messages[code] || 'Não consegui gerar o texto em quadrados. Tente novamente.') });
        error.code = code;
        error.userMessageSent = true;
        throw error;
      }
    }
  };
}

module.exports = createAsciiTextCommand();
module.exports.createAsciiTextCommand = createAsciiTextCommand;
