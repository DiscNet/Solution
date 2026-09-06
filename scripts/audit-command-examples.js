const fs = require("fs");
const path = require("path");
const { loadCommandModules, buildCommandRegistry, walkJsFiles } = require("../functions/commandRegistry");

const root = path.join(__dirname, "..");
const commandsRoot = path.join(root, "commands");
const { records, errors } = loadCommandModules(commandsRoot, { clearCache: true });
if (errors.length) {
  for (const item of errors) console.error(`${item.file}: ${item.error.message}`);
  process.exit(1);
}
const { registry, collisions } = buildCommandRegistry(records);
if (collisions.length) process.exit(1);

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

function uiLiteralBodies(source) {
  const bodies = [];
  const patterns = [
    /\b(?:text|footer|display_text|description|title)\s*:\s*([`'"])/g,
    /\b(?:const|let|var)\s+\w*(?:message|mensagem|texto|aviso|erro|error)\w*\s*=\s*([`'"])/gi
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(source))) {
      const quoteIndex = match.index + match[0].lastIndexOf(match[1]);
      const end = findLiteralEnd(source, quoteIndex);
      if (end > quoteIndex) bodies.push(source.slice(quoteIndex + 1, end));
    }
  }
  return bodies;
}

const files = [...walkJsFiles(commandsRoot)];
const core = path.join(root, "core", "startBot.js");
if (fs.existsSync(core)) files.push(core);

const issues = [];
const prefixPattern = /\$\{\s*(?:prefix|config\.prefix(?:\s*\|\|\s*["'][^"']*["'])?)\s*\}([^`\r\n\\]*)/g;

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  for (const body of uiLiteralBodies(source)) {
    prefixPattern.lastIndex = 0;
    let match;
    while ((match = prefixPattern.exec(body))) {
      const tail = match[1].trim();
      if (!tail || tail.startsWith("${")) continue;
      const token = tail.split(/\s+/)[0].replace(/^[*`_~]+|[*`_~.,:;!?]+$/g, "").toLowerCase();
      if (!token) continue;
      if (!/^[a-z0-9_-]+$/i.test(token)) {
        issues.push({ file: path.relative(root, file), token, reason: "non-ascii-command-example" });
        continue;
      }
      if (!registry[token]) {
        issues.push({ file: path.relative(root, file), token, reason: "unknown-command-example" });
      }
    }
  }
}

console.log(`command_examples_checked_files=${files.length}`);
console.log(`invalid_command_examples=${issues.length}`);
for (const issue of issues.slice(0, 80)) console.log(JSON.stringify(issue));
if (issues.length) process.exitCode = 1;
