// One-time recovery entry point: run from the bot folder, even with a broken updater.
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

function download(url, headers = {}, redirects = 0) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'Solution-Updater', ...headers } }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && redirects < 3) {
        response.resume();
        const target = new URL(response.headers.location, url);
        if (!['raw.githubusercontent.com', 'api.github.com', 'github.com'].includes(target.hostname)) {
          reject(new Error('Redirecionamento inesperado no GitHub.')); return;
        }
        download(target, headers, redirects + 1).then(resolve, reject); return;
      }
      if (response.statusCode !== 200) {
        response.resume(); reject(new Error('GitHub respondeu HTTP ' + response.statusCode + '.')); return;
      }
      const chunks = [];
      let size = 0;
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 3 * 1024 * 1024) request.destroy(new Error('Resposta do GitHub maior que o esperado.'));
        else chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    request.setTimeout(30000, () => request.destroy(new Error('Tempo limite ao acessar o GitHub.')));
    request.on('error', reject);
  });
}

async function main() {
  const root = fs.realpathSync(path.resolve(process.argv[2] || process.cwd()));
  if (!fs.existsSync(path.join(root, 'package.json')) || !fs.existsSync(path.join(root, 'DADOS'))) {
    throw new Error('Execute este comando dentro da pasta do bot ou informe seu caminho.');
  }
  const repository = process.env.BOT_UPDATE_REPOSITORY || 'DiscNet/Solution';
  const branch = process.env.BOT_UPDATE_BRANCH || 'main';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('Repositório inválido.');
  const token = process.env.BOT_UPDATE_TOKEN || process.env.UPDATE_GITHUB_TOKEN ||
    process.env.SOLUTION_GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const headers = token ? { Authorization: 'Bearer ' + token } : {};
  console.log('[UPDATE] Carregando o updater corrigido...');
  const meta = JSON.parse((await download('https://api.github.com/repos/' + repository + '/commits/' + encodeURIComponent(branch), headers)).toString('utf8'));
  if (!/^[a-f0-9]{40}$/.test(meta.sha || '')) throw new Error('Commit inválido recebido do GitHub.');
  const base = process.env.PREFIX ? path.join(process.env.PREFIX, 'tmp') : os.tmpdir();
  fs.mkdirSync(base, { recursive: true });
  const dir = fs.mkdtempSync(path.join(base, 'solution-repair-'));
  try {
    const folder = path.join(dir, 'DADOS', 'MÓDULOS', 'functions');
    fs.mkdirSync(folder, { recursive: true });
    for (const name of ['runtimeCompat.js', 'updateManager.js']) {
      const url = 'https://raw.githubusercontent.com/' + repository + '/' + meta.sha + '/DADOS/M%C3%93DULOS/functions/' + name;
      fs.writeFileSync(path.join(folder, name), await download(url, headers));
    }
    require(path.join(folder, 'runtimeCompat.js')).applyRuntimeEnvironment();
    const manager = require(path.join(folder, 'updateManager.js')).createUpdateManager({
      root, repository, branch: meta.sha
    });
    const result = await manager.installUpdate(text => console.log('[UPDATE] ' + text));
    console.log('[UPDATE] ' + (result.updated ? 'Correção aplicada. Reinicie com npm start.' : 'Bot atualizado.'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
if (require.main === module) main().catch(error => {
  console.error('[UPDATE] ' + error.message); process.exitCode = 1;
});
module.exports = { main };
