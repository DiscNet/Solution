const test = require('node:test');
const assert = require('node:assert/strict');
const art = require('../MÓDULOS/functions/asciiText');
const { createAsciiTextCommand } = require('../MÓDULOS/plugins/util/asciitext');
const { createAsciiCommand } = require('../MÓDULOS/plugins/util/ascii');

function incoming(quotedMessage) {
  return { key: { remoteJid: 'fixture@g.us', id: 'fixture' }, message: {
    extendedTextMessage: { text: '.asciitext', contextInfo: { quotedMessage } }
  } };
}

function commandFixture(dependencies = {}) {
  const messages = [];
  const conn = { async sendMessage(from, content, options) { messages.push({ from, content, options }); } };
  const command = createAsciiTextCommand({ getPrefix: () => '.', quote: msg => msg, ...dependencies });
  return { command, conn, messages, replies: () => messages.filter(message => !message.content.react) };
}

test('the default ANSI Shadow banner reproduces the supplied ASCII BANNER example', () => {
  const result = art.renderText('ASCII BANNER');
  assert.equal(result.style, 'banner');
  assert.deepEqual(result.lines, ['ASCII', 'BANNER']);
  assert.equal(result.width, 52);
  assert.equal(result.height, 13);
  assert.equal(result.text.split('\n').map(row => row.trimEnd()).join('\n'), [
    ' █████╗ ███████╗ ██████╗██╗██╗',
    '██╔══██╗██╔════╝██╔════╝██║██║',
    '███████║███████╗██║     ██║██║',
    '██╔══██║╚════██║██║     ██║██║',
    '██║  ██║███████║╚██████╗██║██║',
    '╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝╚═╝',
    '',
    '██████╗  █████╗ ███╗   ██╗███╗   ██╗███████╗██████╗',
    '██╔══██╗██╔══██╗████╗  ██║████╗  ██║██╔════╝██╔══██╗',
    '██████╔╝███████║██╔██╗ ██║██╔██╗ ██║█████╗  ██████╔╝',
    '██╔══██╗██╔══██║██║╚██╗██║██║╚██╗██║██╔══╝  ██╔══██╗',
    '██████╔╝██║  ██║██║ ╚████║██║ ╚████║███████╗██║  ██║',
    '╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝'
  ].join('\n'));
});

test('banner glyphs have six aligned rows and supported symbols are never silently blank', () => {
  for (const character of Object.keys(art.FONT)) {
    const rows = art.BANNER_FONT[character];
    assert.equal(rows.length, 6, character);
    assert(rows.every(row => row.length === rows[0].length), character);
    if (character !== ' ') assert.match(art.renderText(character).text, /█/, character);
  }
  assert.equal(art.renderText('ação 123 + = \\ |').normalized, 'ACAO 123 + = \\ |');
});

test('banner uses variable glyph widths, preserves words and bounds very long words', () => {
  assert.deepEqual(art.renderText('SOLUTION').lines, ['SOLUTION']);
  assert.deepEqual(art.renderText('II III').lines, ['II III']);
  assert.equal(art.renderText('II III').width, 19);
  const result = art.renderText('N'.repeat(80));
  assert.equal(result.lines.join(''), 'N'.repeat(80));
  assert(result.text.split('\n').every(row => row.length <= art.MAX_BANNER_COLUMNS));
  assert.equal(art.parseOptions([]).style, 'banner');
  assert.equal(art.parseOptions(['--banner', 'BOT']).style, 'banner');
});

test('wide banners preserve whole words and are sent once as a complete text document', async () => {
  const f = commandFixture();
  await f.command.execute(f.conn, incoming(), ['ASCII', 'BANNER'], 'fixture@g.us');
  assert.equal(f.replies().length, 1);
  const content = f.replies()[0].content;
  assert.equal(content.document.toString('utf8'), art.renderText('ASCII BANNER').text + '\n');
  assert.equal(content.fileName, 'ascii_text.txt');
  assert.equal(content.mimetype, 'text/plain');
});

test('OI is rendered as recognizable square letters with preserved alignment', () => {
  const result = art.renderText('oi', { style: 'quadrados' });
  assert.equal(result.text, [
    ' ■■■  ■■■■■',
    '■   ■   ■  ',
    '■   ■   ■  ',
    '■   ■   ■  ',
    '■   ■   ■  ',
    '■   ■   ■  ',
    ' ■■■  ■■■■■'
  ].join('\n'));
  assert.equal(result.width, 11);
  assert.equal(result.height, 7);
});

test('Portuguese accents, decomposed accents, whitespace, numbers and punctuation work', () => {
  const result = art.renderText('  Olá,\t Joa\u0303o!  2026\r\nAÇÃO  ', { style: 'quadrados' });
  assert.equal(result.normalized, 'OLA, JOAO! 2026\nACAO');
  assert.deepEqual(result.lines, ['OLA,', 'JOAO!', '2026', 'ACAO']);
  assert.equal(result.height, 31);
  assert(result.text.split('\n').every(row => row.length <= art.MAX_COLUMNS));
});

test('line wrapping keeps whole words and splits long words without losing letters', () => {
  assert.deepEqual(art.renderText('OI BOT', { style: 'quadrados' }).lines, ['OI BOT']);
  assert.deepEqual(art.renderText('OLA MUNDO', { style: 'quadrados' }).lines, ['OLA', 'MUNDO']);
  const result = art.renderText('ABCDEFGHIJKLM', { style: 'quadrados' });
  assert.deepEqual(result.lines, ['ABCDEF', 'GHIJKL', 'M']);
  assert.equal(result.lines.join(''), 'ABCDEFGHIJKLM');
  assert.equal(result.width, 35);
  assert(result.text.split('\n').every(row => row.length <= 36));
});

test('explicit newlines start new letter panels even when both words would fit', () => {
  const result = art.renderText('OI\nBOT');
  assert.deepEqual(result.lines, ['OI', 'BOT']);
  assert.equal(result.height, 13);
  assert.equal(result.text.split('\n')[6], '');
});

test('block, hollow square and plain ASCII styles retain the same letter shapes', () => {
  const reference = art.renderText('BOT', { style: 'quadrados' }).text.replaceAll('■', '1');
  for (const [style, pixel] of Object.entries(art.STYLES)) {
    if (style === 'banner') continue;
    const result = art.renderText('BOT', { style });
    assert.equal(result.text.replaceAll(pixel, '1'), reference);
    assert(result.text.includes(pixel));
    if (style === 'simples') assert.match(result.text, /^[# \n]+$/);
  }
});

test('every supported letter, number and punctuation symbol has a renderable bitmap', () => {
  for (const [character, rows] of Object.entries(art.FONT)) {
    assert.equal(rows.length, 7, character);
    assert(rows.every(row => /^[01]+$/.test(row) && row.length === rows[0].length), character);
    if (character !== ' ') {
      const result = art.renderText(character, { style: 'quadrados' });
      assert.match(result.text, /■/, character);
    }
  }
});

test('input limits and unsupported characters fail clearly instead of disappearing', () => {
  assert.equal(art.renderText('A'.repeat(80)).normalized.length, 80);
  assert.throws(() => art.renderText('A'.repeat(81)), { code: 'ERR_ASCII_TEXT_LIMIT' });
  assert.throws(() => art.renderText(' '.repeat(4097)), { code: 'ERR_ASCII_TEXT_LIMIT' });
  assert.throws(() => art.renderText('Olá 😀'), { code: 'ERR_ASCII_TEXT_CHARACTERS' });
  assert.throws(() => art.renderText('OI\u0000'), { code: 'ERR_ASCII_TEXT_CHARACTERS' });
  assert.throws(() => art.renderText('   \n\t'), { code: 'ERR_ASCII_TEXT_EMPTY' });
  assert.throws(() => art.renderText('OI', { style: 'constructor' }), { code: 'ERR_ASCII_TEXT_OPTIONS' });
});

test('options precede text, preserve newlines and do not consume ordinary words', () => {
  assert.deepEqual(art.parseOptions(['--blocos', '--arquivo', 'Olá\nmundo']),
    { text: 'Olá\nmundo', style: 'blocos', file: true, help: false });
  assert.equal(art.parseOptions(['arquivo', 'blocos', 'quadrados']).text, 'arquivo blocos quadrados');
  assert.equal(art.parseOptions(['ajuda']).help, true);
  assert.equal(art.parseOptions(['--', 'ajuda']).text, 'ajuda');
  assert.equal(art.parseOptions(['--', '--arquivo']).text, '--arquivo');
  assert.throws(() => art.parseOptions(['--constructor', 'BOT']), { code: 'ERR_ASCII_TEXT_OPTIONS' });
});

test('quoted sources support text, captions and ephemeral wrappers', () => {
  assert.equal(art.quotedText(incoming({ conversation: 'João' })), 'João');
  assert.equal(art.quotedText(incoming({ ephemeralMessage: { message: {
    extendedTextMessage: { text: 'OI\nBOT' }
  } } })), 'OI\nBOT');
  assert.equal(art.quotedText({ message: { documentWithCaptionMessage: { message: {
    documentMessage: { contextInfo: { quotedMessage: { imageMessage: { caption: 'Legenda' } } } }
  } } } }), 'Legenda');
  assert.equal(art.quotedText(incoming({ stickerMessage: {} })), '');
});

test('command returns one complete monospace drawing and keeps normal quote behavior', async () => {
  const f = commandFixture();
  const msg = incoming();
  await f.command.execute(f.conn, msg, ['OI'], 'fixture@g.us');
  const sent = f.replies();
  assert.equal(sent.length, 1);
  const fence = String.fromCharCode(96).repeat(3);
  assert.equal(sent[0].content.text.split(fence)[1], '\n' + art.renderText('OI').text + '\n');
  assert.equal(sent[0].options.quoted, msg);
  assert.equal(sent[0].from, 'fixture@g.us');
});

test('quoted text is used when arguments are empty; explicit text takes priority', async () => {
  const f = commandFixture();
  const msg = incoming({ conversation: 'BOT' });
  await f.command.execute(f.conn, msg, ['--vazado'], 'fixture@g.us');
  assert(f.replies()[0].content.text.includes(art.renderText('BOT', { style: 'vazado' }).text));
  await f.command.execute(f.conn, msg, ['OI'], 'fixture@g.us');
  assert(f.replies()[1].content.text.includes(art.renderText('OI').text));
});

test('small explicit files and tall drawings are sent once as full UTF-8 text documents', async () => {
  const f = commandFixture();
  await f.command.execute(f.conn, incoming(), ['--arquivo', 'OI'], 'fixture@g.us');
  const tall = Array(9).fill('A').join('\n');
  await f.command.execute(f.conn, incoming({ conversation: tall }), [], 'fixture@g.us');
  assert.equal(f.replies().length, 2);
  for (const [index, source] of ['OI', tall].entries()) {
    const content = f.replies()[index].content;
    assert.equal(content.document.toString('utf8'), art.renderText(source).text + '\n');
    assert.equal(content.fileName, 'ascii_text.txt');
    assert.equal(content.mimetype, 'text/plain');
  }
});

test('help uses the configured prefix and empty input explains how to use the command', async () => {
  const f = commandFixture({ getPrefix: () => '!' });
  await f.command.execute(f.conn, incoming(), [], 'fixture@g.us');
  await f.command.execute(f.conn, incoming({ conversation: 'BOT' }), ['--help'], 'fixture@g.us');
  assert(f.replies().every(message => message.content.text.includes('!asciitext')));
  assert(f.replies().every(message => !message.content.document));
});

test('reaction failures do not prevent successful delivery of the drawing', async () => {
  const f = commandFixture();
  f.conn.sendMessage = async (from, content, options) => {
    if (content.react) throw new Error('reaction unavailable');
    f.messages.push({ from, content, options });
  };
  await f.command.execute(f.conn, incoming(), ['BOT'], 'fixture@g.us');
  assert.equal(f.replies().length, 1);
  assert(f.replies()[0].content.text.includes('█'));
});

test('invalid text and flags generate one specific error without duplicate executor replies', async () => {
  for (const [args, code, hint] of [
    [['😀'], 'ERR_ASCII_TEXT_CHARACTERS', /emojis/],
    [['A'.repeat(81)], 'ERR_ASCII_TEXT_LIMIT', /80 caracteres/],
    [['--incorreto', 'BOT'], 'ERR_ASCII_TEXT_OPTIONS', /--quadrados/]
  ]) {
    const f = commandFixture();
    await assert.rejects(f.command.execute(f.conn, incoming(), args, 'fixture@g.us'), error => {
      assert.equal(error.code, code);
      assert.equal(error.userMessageSent, true);
      return true;
    });
    assert.equal(f.replies().length, 1);
    assert.match(f.replies()[0].content.text, hint);
  }
});

test('ascii text and ascii texto delegate without attempting media conversion', async () => {
  const f = commandFixture();
  const command = createAsciiCommand({ getPrefix: () => '.', quote: msg => msg,
    download: async () => { throw new Error('should not download media'); },
    convert: async () => { throw new Error('should not convert an image'); }
  });
  await command.execute(f.conn, incoming(), ['text', '--blocos', 'BOT'], 'fixture@g.us');
  await command.execute(f.conn, incoming({ conversation: 'OI' }), ['texto'], 'fixture@g.us');
  assert(f.replies()[0].content.text.includes(art.renderText('BOT', { style: 'blocos' }).text));
  assert(f.replies()[1].content.text.includes(art.renderText('OI').text));
});
