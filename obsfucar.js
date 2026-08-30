const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');

const codigo = fs.readFileSync('index.js', 'utf8');

const resultado = JavaScriptObfuscator.obfuscate(codigo, {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: true,
  debugProtectionInterval: 2000,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
});

fs.writeFileSync('index.ofuscado.js', resultado.getObfuscatedCode());
console.log('✅ Código ofuscado salvo como index.ofuscado.js');
