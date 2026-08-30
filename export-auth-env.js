const fs = require('fs');
const path = require('path');

const authDir = path.resolve(process.argv[2] || 'auth_info');

if (!fs.existsSync(authDir) || !fs.statSync(authDir).isDirectory()) {
  console.error(`Pasta auth_info não encontrada: ${authDir}`);
  process.exit(1);
}

const files = {};

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolute);
      continue;
    }
    if (!entry.isFile()) continue;

    const relative = path.relative(authDir, absolute).split(path.sep).join('/');
    files[relative] = fs.readFileSync(absolute).toString('base64');
  }
}

walk(authDir);

if (!files['creds.json']) {
  console.error('creds.json não foi encontrado dentro de auth_info.');
  process.exit(1);
}

const payload = Buffer.from(JSON.stringify({ version: 1, files }), 'utf8').toString('base64');

console.log(payload);
