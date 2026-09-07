const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const roots = [path.join(root, "commands"), path.join(root, "core")];

function findExpressionEnd(text, start) {
  let depth = 1;
  let quote = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return text.length - 1;
}

function findLiteralEnd(source, quoteIndex) {
  const quote = source[quoteIndex];
  for (let i = quoteIndex + 1; i < source.length; i++) {
    const ch = source[i];
    if (ch === "\\") { i += 1; continue; }
    if (quote === "`" && ch === "$" && source[i + 1] === "{") {
      i = findExpressionEnd(source, i + 2);
      continue;
    }
    if (ch === quote) return i;
  }
  return -1;
}

function visibleStaticText(body) {
  return body
    // Linhas copiáveis de comando permanecem ASCII de propósito; isso garante
    // que o usuário possa copiar `${prefix}comando argumento` e executar.
    .replace(/\$\{\s*(?:prefix|config\.prefix(?:\s*\|\|\s*["'][^"']*["'])?)\s*\}[^\\\r\n`]*/g, " ")
    .replace(/\$\{[\s\S]*?\}/g, " ")
    .replace(/https?:\/\/[^\s`'"\\]+/gi, " ")
    .replace(/www\.[^\s`'"\\]+/gi, " ")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, " ")
    .replace(/[.!/#][A-Za-z0-9_-]{1,64}/g, " ")
    .replace(/\\[a-zA-Z0-9]/g, " ");
}

function hasNonSmallcapsAscii(text) {
  // Na fonte adotada pelo bot, `s` e `x` permanecem como caracteres ASCII.
  return /[a-rt-wyz]/i.test(text);
}

function samplesFrom(text) {
  return [...new Set((text.match(/[A-Za-z]{2,}/g) || []).filter(word => hasNonSmallcapsAscii(word)))].slice(0, 5);
}

function scanFile(file) {
  const source = fs.readFileSync(file, "utf8");
  const issues = [];
  // Descrições são instruções curtas e copiáveis em português comum (Uso: ...).
  const patterns = [
    /\b(?:text|footer|display_text|title)\s*:\s*([`'"])/g,
    /\b(?:const|let|var)\s+\w*(?:message|mensagem|texto|aviso|erro|error)\w*\s*=\s*([`'"])/gi
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(source))) {
      const quoteIndex = match.index + match[0].lastIndexOf(match[1]);
      const end = findLiteralEnd(source, quoteIndex);
      if (end < 0) continue;
      const body = source.slice(quoteIndex + 1, end);
      const visible = visibleStaticText(body);
      if (!hasNonSmallcapsAscii(visible)) continue;
      const samples = samplesFrom(visible);
      issues.push(samples.length ? samples : [visible.slice(0, 80)]);
    }
  }
  return issues;
}

const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(full);
  }
}
roots.forEach(walk);

const bad = [];
for (const file of files) {
  const issues = scanFile(file);
  if (issues.length) bad.push({ file: path.relative(root, file), samples: issues.slice(0, 4) });
}

console.log(`ui_files_checked=${files.length}`);
console.log(`legacy_ui_files=${bad.length}`);
for (const item of bad.slice(0, 50)) console.log(JSON.stringify(item));
if (bad.length) process.exitCode = 1;

