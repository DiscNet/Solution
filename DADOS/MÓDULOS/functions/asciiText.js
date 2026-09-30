const { extractMessageText, unwrapMessage } = require('./messageText');

const MAX_TEXT_LENGTH = 80;
const MAX_COLUMNS = 36;
const TEXT_LIMIT = 3500;
const CHAT_ROW_LIMIT = 55;
const STYLES = Object.freeze({ quadrados: '■', blocos: '█', vazado: '□', simples: '#' });

// Each pixel is one monospaced character, keeping the art readable on phones.
const patterns = {
  A: '01110/10001/10001/11111/10001/10001/10001',
  B: '11110/10001/10001/11110/10001/10001/11110',
  C: '01111/10000/10000/10000/10000/10000/01111',
  D: '11110/10001/10001/10001/10001/10001/11110',
  E: '11111/10000/10000/11110/10000/10000/11111',
  F: '11111/10000/10000/11110/10000/10000/10000',
  G: '01111/10000/10000/10111/10001/10001/01111',
  H: '10001/10001/10001/11111/10001/10001/10001',
  I: '11111/00100/00100/00100/00100/00100/11111',
  J: '00111/00010/00010/00010/10010/10010/01100',
  K: '10001/10010/10100/11000/10100/10010/10001',
  L: '10000/10000/10000/10000/10000/10000/11111',
  M: '10001/11011/10101/10101/10001/10001/10001',
  N: '10001/11001/10101/10011/10001/10001/10001',
  O: '01110/10001/10001/10001/10001/10001/01110',
  P: '11110/10001/10001/11110/10000/10000/10000',
  Q: '01110/10001/10001/10001/10101/10010/01101',
  R: '11110/10001/10001/11110/10100/10010/10001',
  S: '01111/10000/10000/01110/00001/00001/11110',
  T: '11111/00100/00100/00100/00100/00100/00100',
  U: '10001/10001/10001/10001/10001/10001/01110',
  V: '10001/10001/10001/10001/10001/01010/00100',
  W: '10001/10001/10001/10101/10101/10101/01010',
  X: '10001/10001/01010/00100/01010/10001/10001',
  Y: '10001/10001/01010/00100/00100/00100/00100',
  Z: '11111/00001/00010/00100/01000/10000/11111',
  0: '01110/10001/10011/10101/11001/10001/01110',
  1: '00100/01100/00100/00100/00100/00100/01110',
  2: '01110/10001/00001/00010/00100/01000/11111',
  3: '11110/00001/00001/01110/00001/00001/11110',
  4: '00010/00110/01010/10010/11111/00010/00010',
  5: '11111/10000/10000/11110/00001/00001/11110',
  6: '01110/10000/10000/11110/10001/10001/01110',
  7: '11111/00001/00010/00100/01000/01000/01000',
  8: '01110/10001/10001/01110/10001/10001/01110',
  9: '01110/10001/10001/01111/00001/00001/01110',
  '.': '00000/00000/00000/00000/00000/00110/00110',
  ',': '00000/00000/00000/00000/00110/00110/00100',
  '!': '00100/00100/00100/00100/00100/00000/00100',
  '?': '01110/10001/00001/00010/00100/00000/00100',
  ':': '00000/00110/00110/00000/00110/00110/00000',
  ';': '00000/00110/00110/00000/00110/00110/00100',
  '-': '00000/00000/00000/11111/00000/00000/00000',
  '_': '00000/00000/00000/00000/00000/00000/11111',
  '+': '00000/00100/00100/11111/00100/00100/00000',
  '=': '00000/00000/11111/00000/11111/00000/00000',
  '/': '00001/00001/00010/00100/01000/10000/10000',
  '\\': '10000/10000/01000/00100/00010/00001/00001',
  '(': '00010/00100/01000/01000/01000/00100/00010',
  ')': '01000/00100/00010/00010/00010/00100/01000',
  '[': '01110/01000/01000/01000/01000/01000/01110',
  ']': '01110/00010/00010/00010/00010/00010/01110',
  "'": '00100/00100/00000/00000/00000/00000/00000',
  '"': '01010/01010/00000/00000/00000/00000/00000',
  '@': '01110/10001/10111/10101/10111/10000/01110',
  '#': '01010/01010/11111/01010/11111/01010/01010',
  '&': '01100/10010/10100/01000/10101/10010/01101',
  '%': '11001/11010/00100/00100/01000/10110/00110',
  '*': '00000/10101/01110/11111/01110/10101/00000',
  '<': '00001/00010/00100/01000/00100/00010/00001',
  '>': '10000/01000/00100/00010/00100/01000/10000',
  '|': '00100/00100/00100/00100/00100/00100/00100',
  ' ': '000/000/000/000/000/000/000'
};
const FONT = Object.freeze(Object.fromEntries(
  Object.entries(patterns).map(([character, rows]) => [character, Object.freeze(rows.split('/'))])
));

function textError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function parseOptions(args = []) {
  let text = args.map(String).join(' ').trim();
  const options = { text: '', style: 'quadrados', file: false, help: false };
  if (/^(ajuda|help)$/i.test(text)) return { ...options, help: true };
  while (text) {
    const match = /^(\S+)(?:\s+|$)/.exec(text);
    const flag = match[1].toLowerCase();
    if (flag === '--') {
      text = text.slice(match[0].length);
      break;
    }
    if (flag.startsWith('--') && Object.hasOwn(STYLES, flag.slice(2))) options.style = flag.slice(2);
    else if (['--arquivo', '--file'].includes(flag)) options.file = true;
    else if (['--ajuda', '--help', '-h'].includes(flag)) options.help = true;
    else if (flag.startsWith('--')) throw textError('ERR_ASCII_TEXT_OPTIONS');
    else break;
    text = text.slice(match[0].length);
  }
  options.text = text.trim();
  return options;
}

function quotedText(msg) {
  const message = unwrapMessage(msg);
  for (const value of Object.values(message)) {
    const quoted = value?.contextInfo?.quotedMessage;
    if (quoted) return extractMessageText(quoted);
  }
  return '';
}

function normalizeText(input) {
  const raw = String(input || '');
  if (raw.length > 4096) throw textError('ERR_ASCII_TEXT_LIMIT');
  const text = raw.replace(/\r\n?/g, '\n').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase().replace(/[^\S\n]+/g, ' ')
    .split('\n').map(line => line.trim()).filter(Boolean).join('\n');
  if (!text) throw textError('ERR_ASCII_TEXT_EMPTY');
  if (text.length > MAX_TEXT_LENGTH) throw textError('ERR_ASCII_TEXT_LIMIT');
  for (const character of text) {
    if (character !== '\n' && !Object.hasOwn(FONT, character)) throw textError('ERR_ASCII_TEXT_CHARACTERS');
  }
  return text;
}

function measure(text) {
  return [...text].reduce((width, character) => width + FONT[character][0].length + 1, -1);
}

function wrapText(text) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    let current = '';
    for (const word of paragraph.split(' ')) {
      if (current && measure(current + ' ' + word) <= MAX_COLUMNS) {
        current += ' ' + word;
        continue;
      }
      if (current) lines.push(current);
      current = '';
      for (const character of word) {
        if (current && measure(current + character) > MAX_COLUMNS) {
          lines.push(current);
          current = '';
        }
        current += character;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function renderText(input, options = {}) {
  const style = options.style || 'quadrados';
  if (!Object.hasOwn(STYLES, style)) throw textError('ERR_ASCII_TEXT_OPTIONS');
  const normalized = normalizeText(input);
  const lines = wrapText(normalized);
  const blocks = lines.map(line => Array.from({ length: 7 }, (_, row) =>
    [...line].map(character => FONT[character][row].replace(/1/g, STYLES[style]).replace(/0/g, ' ')).join(' ')
  ).join('\n'));
  const text = blocks.join('\n\n');
  return { text, normalized, lines, style, width: Math.max(...lines.map(measure)), height: text.split('\n').length };
}

module.exports = { FONT, STYLES, MAX_TEXT_LENGTH, MAX_COLUMNS, TEXT_LIMIT, CHAT_ROW_LIMIT, parseOptions, quotedText, renderText };
