const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const commandsDir = path.join(rootDir, "commands");
const statusCardModule = path.join(rootDir, "functions", "statusCard");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

function getHelperImport(filePath) {
  let relative = path.relative(path.dirname(filePath), statusCardModule).replace(/\\/g, "/");
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return `const { createStatusQuoted } = require(${JSON.stringify(relative)});`;
}

function findMatchingBrace(source, openIndex) {
  let depth = 0;
  let state = "code";
  let quote = null;
  let escaped = false;

  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (state === "line-comment") {
      if (ch === "\n") state = "code";
      continue;
    }

    if (state === "block-comment") {
      if (ch === "*" && next === "/") {
        state = "code";
        i++;
      }
      continue;
    }

    if (state === "string") {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        state = "code";
        quote = null;
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      state = "line-comment";
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      state = "block-comment";
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      state = "string";
      quote = ch;
      continue;
    }

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function normalizeFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  if (!original.includes("status@broadcast")) return 0;

  let source = original;
  let offset = 0;
  let replacements = 0;
  const quotedRegex = /\bquoted\s*:\s*\{/g;

  while (true) {
    quotedRegex.lastIndex = offset;
    const match = quotedRegex.exec(source);
    if (!match) break;

    const openIndex = source.indexOf("{", match.index);
    if (openIndex < 0) break;
    const closeIndex = findMatchingBrace(source, openIndex);
    if (closeIndex < 0) {
      throw new Error(`Objeto quoted sem fechamento em ${filePath}`);
    }

    const block = source.slice(match.index, closeIndex + 1);
    if (block.includes("status@broadcast")) {
      const replacement = "quoted: createStatusQuoted(msg)";
      source = source.slice(0, match.index) + replacement + source.slice(closeIndex + 1);
      offset = match.index + replacement.length;
      replacements++;
    } else {
      offset = closeIndex + 1;
    }
  }

  if (replacements > 0) {
    if (!source.includes("functions/statusCard")) {
      source = `${getHelperImport(filePath)}\n${source}`;
    }
    fs.writeFileSync(filePath, source, "utf8");
  }

  return replacements;
}

let filesChanged = 0;
let cardsChanged = 0;

for (const file of walk(commandsDir)) {
  const count = normalizeFile(file);
  if (count > 0) {
    filesChanged++;
    cardsChanged += count;
    console.log(`✓ ${path.relative(process.cwd(), file)}: ${count} card(s)`);
  }
}

console.log(`\nStatus cards normalizados: ${cardsChanged} em ${filesChanged} arquivo(s).`);
