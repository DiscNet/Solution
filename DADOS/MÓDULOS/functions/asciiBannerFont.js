const fs = require('fs');
const path = require('path');

// ANSI Shadow from patorjk/figlet.js; attribution is in fonts/LICENSE-figlet.txt.
// Decode the bundled font locally, without a FIGlet executable or npm dependency.
const source = fs.readFileSync(path.join(__dirname, 'fonts', 'ANSI-Shadow.flf'), 'utf8').split(/\r?\n/);
const header = source[0].split(/\s+/);
const height = Number(header[1]);
const hardBlank = header[0].slice(-1);
let offset = 1 + Number(header[5]);
const glyphs = {};

if (!header[0].startsWith('flf2a') || height !== 7) throw new Error('Invalid bundled ANSI Shadow font');
for (let code = 32; code <= 126; code++) {
  const raw = source.slice(offset, offset + height);
  if (raw.length !== height || raw.some(row => !row.endsWith('@'))) throw new Error('Incomplete bundled ANSI Shadow font');
  offset += height;
  // The font's seventh row is empty. Separators between panels are added by the renderer.
  glyphs[String.fromCharCode(code)] = raw.slice(0, -1).map(row =>
    row.replace(/@{1,2}$/, '').replaceAll(hardBlank, ' '));
}

// These symbols are blank in the original font; draw them instead of losing text.
Object.assign(glyphs, {
  '+': ['        ', '  ██╗   ', '██████╗ ', '╚═██╔═╝ ', '  ╚═╝   ', '        '],
  '=': ['      ', '█████╗', '╚════╝', '█████╗', '╚════╝', '      '],
  '\\': ['██╗    ', '╚██╗   ', ' ╚██╗  ', '  ╚██╗ ', '   ╚██╗', '    ╚═╝'],
  "'": ['██╗', '╚═╝', '   ', '   ', '   ', '   '],
  '"': ['██╗██╗', '╚═╝╚═╝', '      ', '      ', '      ', '      '],
  '|': ['██╗', '██║', '██║', '██║', '██║', '╚═╝']
});

module.exports = Object.freeze(Object.fromEntries(Object.entries(glyphs).map(([character, rows]) => {
  const width = Math.max(...rows.map(row => row.length));
  return [character, Object.freeze(rows.map(row => row.padEnd(width)))];
})));
