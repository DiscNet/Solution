const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  execFileCompatSync,
  isTermux,
  writableTempDir
} = require('./runtimeCompat');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const UPDATE_DIR = path.join(ROOT, '.update');
const BACKUP_DIR = path.join(UPDATE_DIR, 'backups');
const STATE_FILE = path.join(UPDATE_DIR, 'state.json');

const REPOSITORY = String(process.env.BOT_UPDATE_REPOSITORY || 'DiscNet/Solution').trim();
const BRANCH = String(process.env.BOT_UPDATE_BRANCH || 'main').trim();
const REMOTE = String(process.env.BOT_UPDATE_REMOTE || 'origin').trim();
const MAX_BACKUPS = Math.max(1, Number(process.env.BOT_UPDATE_MAX_BACKUPS || 5) || 5);

function isAndroidExternalStorage(value = ROOT) {
  const normalized = path.resolve(String(value || '')).replace(/\\/g, '/');
  return (
    normalized === '/sdcard' ||
    normalized.startsWith('/sdcard/') ||
    normalized.startsWith('/storage/') ||
    normalized.startsWith('/mnt/media_rw/')
  );
}

function codedUpdateError(code, message, cause) {
  const error = new Error(message || code);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

function errorDetail(error) {
  const raw =
    error?.stderr ||
    error?.cause?.stderr ||
    error?.cause?.message ||
    error?.message ||
    String(error || '');
  return Buffer.isBuffer(raw)
    ? raw.toString('utf8').trim().slice(0, 1200)
    : String(raw || '').trim().slice(0, 1200);
}

const PROTECTED = [
  '.git/',
  'node_modules/',
  '.update/',
  '.env',
  '.env.*',
  'DADOS/database/',
  'DADOS/conexão/bot_auth/',
  'DADOS/config/config.js',
  'DADOS/temp/',
  'DADOS/logs/',
  'logs/',
  '.cache/'
];

const ensure = dir => fs.mkdirSync(dir, { recursive: true });
const normalizeRel = value => String(value || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');

function isProtected(rel) {
  const item = normalizeRel(rel);
  if (!item) return true;
  if (item.startsWith('DADOS/database/lib/')) return false;
  return PROTECTED.some(rule => {
    if (rule === '.env.*') return item.startsWith('.env.');
    if (rule.endsWith('/')) return item === rule.slice(0, -1) || item.startsWith(rule);
    return item === rule;
  });
}

function safePath(root, rel) {
  const full = path.resolve(root, normalizeRel(rel));
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error(`Caminho inseguro: ${rel}`);
  return full;
}

function readJson(file, fallback = {}) {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    return value && typeof value === 'object' ? value : fallback;
  } catch (_) { return fallback; }
}

function writeJson(file, value) {
  ensure(path.dirname(file));
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(temp, file);
}

function state() {
  return readJson(STATE_FILE, { lastRemoteCommit: null, managedPaths: [], lastBackup: null });
}

function shortSha(value) {
  return String(value || '').slice(0, 8) || 'desconhecido';
}

function token() {
  return String(
    process.env.BOT_UPDATE_TOKEN ||
    process.env.UPDATE_GITHUB_TOKEN ||
    process.env.GH_TOKEN ||
    process.env.GITHUB_TOKEN ||
    ''
  ).trim();
}

function gitEnv(useToken = false) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' };
  const value = token();
  if (useToken && value) {
    env.GIT_CONFIG_COUNT = '1';
    env.GIT_CONFIG_KEY_0 = 'http.extraHeader';
    env.GIT_CONFIG_VALUE_0 = `Authorization: Basic ${Buffer.from(`x-access-token:${value}`).toString('base64')}`;
  }
  return env;
}

function git(args, { cwd = ROOT, binary = false, useToken = false, inherit = false } = {}) {
  return execFileCompatSync('git', args, {
    cwd,
    encoding: binary ? null : 'utf8',
    stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    maxBuffer: 128 * 1024 * 1024,
    env: gitEnv(useToken)
  });
}

function gitAvailable(cwd = ROOT) {
  try {
    git(['--version'], { cwd });
    return true;
  } catch (error) {
    if (error?.code === 'ERR_EXEC_MISSING') {
      throw codedUpdateError(
        'UPDATE_GIT_MISSING',
        'Git não está instalado ou não foi encontrado neste ambiente.',
        error
      );
    }
    if (error?.code === 'ERR_EXEC_PERMISSION') {
      throw codedUpdateError(
        'UPDATE_GIT_PERMISSION',
        'O Android/Termux negou permissão para executar o Git.',
        error
      );
    }
    return false;
  }
}

function parseTree(output) {
  const text = Buffer.isBuffer(output) ? output.toString('utf8') : String(output || '');
  const map = new Map();
  for (const entry of text.split('\0')) {
    if (!entry) continue;
    const tab = entry.indexOf('\t');
    if (tab < 0) continue;
    const meta = entry.slice(0, tab).split(/\s+/);
    const rel = normalizeRel(entry.slice(tab + 1));
    if (meta.length < 3 || !rel) continue;
    map.set(rel, { mode: meta[0], type: meta[1], sha: meta[2], path: rel });
  }
  return map;
}

const treeAt = (cwd, ref) => parseTree(git(['ls-tree', '-r', '-z', ref], { cwd }));

function remoteMatches(url) {
  const normalized = String(url || '').replace(/\\/g, '/').replace(/\.git$/i, '').toLowerCase();
  return normalized.endsWith(REPOSITORY.toLowerCase());
}

function localGitRemote() {
  try {
    // Repositórios Git em armazenamento compartilhado do Android são
    // deliberadamente evitados. Git depende de permissões/symlinks que esse
    // filesystem não oferece de forma confiável.
    if (isTermux() && isAndroidExternalStorage(ROOT)) return null;
    if (!fs.existsSync(path.join(ROOT, '.git'))) return null;
    const url = git(['remote', 'get-url', REMOTE]).trim();
    if (!remoteMatches(url)) return null;

    try { git(['fetch', '--quiet', REMOTE, BRANCH]); }
    catch (_) { git(['fetch', '--quiet', REMOTE, BRANCH], { useToken: true }); }

    const commit = git(['rev-parse', 'FETCH_HEAD']).trim();
    const head = git(['rev-parse', 'HEAD']).trim();
    return {
      source: 'git',
      cwd: ROOT,
      commit,
      baselineCommit: head,
      tree: treeAt(ROOT, commit),
      baselinePaths: [...treeAt(ROOT, head).keys()],
      cleanup() {}
    };
  } catch (_) { return null; }
}

function stagingRemote() {
  gitAvailable();

  // No Termux o clone temporário sempre vai para o armazenamento privado do
  // app, mesmo que o usuário tenha colocado o bot em /sdcard ou ~/storage.
  const stagingBase = isTermux()
    ? writableTempDir('solution-updater')
    : UPDATE_DIR;

  ensure(stagingBase);
  const dir = path.join(stagingBase, `staging-${process.pid}-${Date.now()}`);
  const url = `https://github.com/${REPOSITORY}.git`;

  try {
    let firstError = null;

    try {
      git(['clone', '--quiet', '--depth', '1', '--branch', BRANCH, url, dir], {
        cwd: stagingBase
      });
    } catch (error) {
      firstError = error;
      fs.rmSync(dir, { recursive: true, force: true });

      // Token é uma segunda tentativa, não a explicação automática para todo
      // erro de clone. DiscNet/Solution é público e deve funcionar sem token.
      if (token()) {
        git(['clone', '--quiet', '--depth', '1', '--branch', BRANCH, url, dir], {
          cwd: stagingBase,
          useToken: true
        });
      } else {
        const detail = errorDetail(error);
        throw codedUpdateError(
          'UPDATE_GIT_CLONE_FAILED',
          detail
            ? `Falha ao clonar a atualização: ${detail}`
            : 'Falha ao clonar a atualização do GitHub.',
          error
        );
      }
    }

    const commit = git(['rev-parse', 'HEAD'], { cwd: dir }).trim();
    const previous = state();

    return {
      source: isTermux() ? 'git-staging-termux' : 'git-staging',
      cwd: dir,
      commit,
      baselineCommit: previous.lastRemoteCommit || null,
      tree: treeAt(dir, 'HEAD'),
      baselinePaths: Array.isArray(previous.managedPaths) ? previous.managedPaths : [],
      cleanup() {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    };
  } catch (error) {
    fs.rmSync(dir, { recursive: true, force: true });

    if (
      error?.code === 'UPDATE_GIT_MISSING' ||
      error?.code === 'UPDATE_GIT_PERMISSION' ||
      error?.code === 'UPDATE_GIT_CLONE_FAILED' ||
      error?.code === 'UPDATE_TOKEN_REQUIRED'
    ) {
      throw error;
    }

    if (error?.code === 'ERR_EXEC_MISSING') {
      throw codedUpdateError('UPDATE_GIT_MISSING', 'Git não foi encontrado.', error);
    }

    if (error?.code === 'ERR_EXEC_PERMISSION') {
      throw codedUpdateError(
        'UPDATE_GIT_PERMISSION',
        'O Android/Termux negou permissão para executar o Git.',
        error
      );
    }

    const detail = errorDetail(error);
    throw codedUpdateError(
      'UPDATE_FETCH_FAILED',
      detail
        ? `Não foi possível obter a atualização: ${detail}`
        : 'Não foi possível obter a versão mais recente do repositório.',
      error
    );
  }
}

function loadRemote() {
  return localGitRemote() || stagingRemote();
}

function blobSha(buffer) {
  const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return crypto.createHash('sha1').update(Buffer.from(`blob ${data.length}\0`)).update(data).digest('hex');
}

function localSha(file) {
  try {
    const stat = fs.lstatSync(file);
    if (stat.isSymbolicLink()) return blobSha(Buffer.from(fs.readlinkSync(file)));
    return stat.isFile() ? blobSha(fs.readFileSync(file)) : null;
  } catch (_) { return null; }
}

function managedTree(remote) {
  return new Map([...remote.tree.entries()].filter(([rel, item]) => item.type === 'blob' && !isProtected(rel)));
}

function calculate(remote) {
  const managed = managedTree(remote);
  const changes = [];

  for (const [rel, item] of managed) {
    const target = safePath(ROOT, rel);
    if (localSha(target) !== item.sha) {
      let exists = true;
      try { fs.lstatSync(target); } catch (_) { exists = false; }
      changes.push({ type: exists ? 'update' : 'create', path: rel, item });
    }
  }

  const remotePaths = new Set(managed.keys());
  for (const raw of remote.baselinePaths || []) {
    const rel = normalizeRel(raw);
    if (!rel || isProtected(rel) || remotePaths.has(rel)) continue;
    try {
      fs.lstatSync(safePath(ROOT, rel));
      changes.push({ type: 'delete', path: rel, item: null });
    } catch (_) {}
  }

  changes.sort((a, b) => a.path.localeCompare(b.path, 'pt-BR'));
  return { changes, managedPaths: [...managed.keys()].sort() };
}

function copyPath(source, destination) {
  const stat = fs.lstatSync(source);
  ensure(path.dirname(destination));
  if (stat.isSymbolicLink()) {
    fs.rmSync(destination, { recursive: true, force: true });
    fs.symlinkSync(fs.readlinkSync(source), destination);
    return;
  }
  if (stat.isDirectory()) fs.cpSync(source, destination, { recursive: true, force: true, dereference: false });
  else fs.copyFileSync(source, destination);
}

function backupChanges(changes, remote, managedPaths) {
  ensure(BACKUP_DIR);
  const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${shortSha(remote.commit)}`;
  const dir = path.join(BACKUP_DIR, name);
  const files = path.join(dir, 'files');
  ensure(files);

  const entries = changes.map(change => {
    const target = safePath(ROOT, change.path);
    let existed = false;
    try {
      fs.lstatSync(target);
      existed = true;
    } catch (_) {}
    if (existed) copyPath(target, safePath(files, change.path));
    return { path: change.path, existed, type: change.type };
  });

  const previous = state();
  const manifest = {
    createdAt: new Date().toISOString(),
    previousCommit: remote.baselineCommit || previous.lastRemoteCommit || null,
    previousManagedPaths: Array.isArray(previous.managedPaths) ? previous.managedPaths : [],
    targetCommit: remote.commit,
    source: remote.source,
    entries,
    managedPaths
  };
  writeJson(path.join(dir, 'manifest.json'), manifest);
  return { dir, manifest };
}

function readRemoteBlob(remote, item) {
  return git(['show', `${remote.commit}:${item.path}`], { cwd: remote.cwd, binary: true });
}

function writeRemoteFile(rel, item, data) {
  const target = safePath(ROOT, rel);
  ensure(path.dirname(target));
  fs.rmSync(target, { recursive: true, force: true });
  if (item.mode === '120000') fs.symlinkSync(data.toString('utf8'), target);
  else {
    fs.writeFileSync(target, data);
    if (item.mode === '100755') {
      try {
        fs.chmodSync(target, 0o755);
      } catch (error) {
        // /sdcard e /storage não implementam permissões Unix corretamente.
        // Arquivos JS continuam utilizáveis via Node mesmo sem chmod.
        if (!(isTermux() && isAndroidExternalStorage(ROOT))) throw error;
      }
    }
  }
}

const dependenciesTouched = changes => changes.some(item => item.path === 'package.json' || item.path === 'package-lock.json');

function installDependencies(log = () => {}) {
  log('Dependências alteradas; sincronizando node_modules...');
  execFileCompatSync('npm', ['install', '--omit=dev', '--no-audit', '--no-fund'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env
  });
}

function moveGitBaseline(commit) {
  if (!fs.existsSync(path.join(ROOT, '.git')) || !commit) return;
  try { git(['reset', '--mixed', commit]); } catch (_) {}
}

function trimBackups() {
  try {
    const dirs = fs.readdirSync(BACKUP_DIR, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => path.join(BACKUP_DIR, item.name))
      .sort((a, b) => b.localeCompare(a));
    for (const dir of dirs.slice(MAX_BACKUPS)) fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

async function checkUpdate() {
  const remote = loadRemote();
  try {
    const { changes } = calculate(remote);
    return {
      ok: true,
      available: changes.length > 0,
      source: remote.source,
      localCommit: remote.baselineCommit || state().lastRemoteCommit || null,
      remoteCommit: remote.commit,
      changes,
      filesUpdated: changes.filter(item => item.type !== 'delete').length,
      filesDeleted: changes.filter(item => item.type === 'delete').length,
      protected: [...PROTECTED]
    };
  } finally { remote.cleanup(); }
}

async function installUpdate(log = () => {}) {
  const remote = loadRemote();
  try {
    const { changes, managedPaths } = calculate(remote);
    if (!changes.length) {
      if (remote.source === 'git') moveGitBaseline(remote.commit);
      writeJson(STATE_FILE, {
        ...state(),
        lastRemoteCommit: remote.commit,
        managedPaths,
        lastCheckedAt: new Date().toISOString(),
        source: remote.source
      });
      return { updated: false, reason: 'already_current', version: remote.commit, source: remote.source, filesUpdated: 0, filesDeleted: 0 };
    }

    log(`Preparando backup de ${changes.length} arquivo(s)...`);
    const backup = backupChanges(changes, remote, managedPaths);
    let filesUpdated = 0;
    let filesDeleted = 0;

    try {
      for (const change of changes) {
        if (change.type === 'delete') {
          log(`Removendo ${change.path}`);
          fs.rmSync(safePath(ROOT, change.path), { recursive: true, force: true });
          filesDeleted++;
          continue;
        }
        log(`Atualizando ${change.path}`);
        const data = readRemoteBlob(remote, change.item);
        if (blobSha(data) !== change.item.sha) throw new Error(`Integridade inválida em ${change.path}.`);
        writeRemoteFile(change.path, change.item, data);
        filesUpdated++;
      }

      if (dependenciesTouched(changes)) installDependencies(log);
      if (remote.source === 'git') moveGitBaseline(remote.commit);

      writeJson(STATE_FILE, {
        ...state(),
        lastRemoteCommit: remote.commit,
        managedPaths,
        lastBackup: path.relative(UPDATE_DIR, backup.dir).replace(/\\/g, '/'),
        lastUpdateAt: new Date().toISOString(),
        source: remote.source
      });
      trimBackups();
      return { updated: true, from: backup.manifest.previousCommit, version: remote.commit, source: remote.source, filesUpdated, filesDeleted };
    } catch (error) {
      try { restoreBackup(backup.dir, { updateState: false }); } catch (_) {}
      throw error;
    }
  } finally { remote.cleanup(); }
}

function latestBackupDir() {
  const current = state();
  if (current.lastBackup) {
    const dir = safePath(UPDATE_DIR, current.lastBackup);
    if (fs.existsSync(path.join(dir, 'manifest.json'))) return dir;
  }
  try {
    return fs.readdirSync(BACKUP_DIR, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => path.join(BACKUP_DIR, item.name))
      .filter(dir => fs.existsSync(path.join(dir, 'manifest.json')))
      .sort((a, b) => b.localeCompare(a))[0] || null;
  } catch (_) { return null; }
}

function restoreBackup(dir, options = {}) {
  const manifest = readJson(path.join(dir, 'manifest.json'), null);
  if (!manifest || !Array.isArray(manifest.entries)) throw new Error('Backup de atualização inválido.');
  const files = path.join(dir, 'files');

  for (const entry of [...manifest.entries].reverse()) {
    const target = safePath(ROOT, entry.path);
    fs.rmSync(target, { recursive: true, force: true });
    if (entry.existed) copyPath(safePath(files, entry.path), target);
  }

  if (manifest.previousCommit) moveGitBaseline(manifest.previousCommit);
  if (dependenciesTouched(manifest.entries)) {
    try { installDependencies(() => {}); } catch (_) {}
  }

  if (options.updateState !== false) {
    writeJson(STATE_FILE, {
      ...state(),
      lastRemoteCommit: manifest.previousCommit || null,
      managedPaths: Array.isArray(manifest.previousManagedPaths) ? manifest.previousManagedPaths : [],
      lastBackup: null,
      lastRollbackAt: new Date().toISOString(),
      rolledBackFrom: manifest.targetCommit || null
    });
  }
  return manifest;
}

function rollback() {
  const dir = latestBackupDir();
  if (!dir) throw new Error('Nenhum backup de atualização está disponível para rollback.');
  const manifest = restoreBackup(dir);
  return { restored: true, version: manifest.previousCommit || 'anterior', from: manifest.targetCommit || null, files: manifest.entries.length };
}

function describeError(error) {
  const code = String(error?.code || 'UPDATE_FAILED');
  const detail = errorDetail(error);

  const messages = {
    UPDATE_GIT_MISSING:
      'Git não está instalado no Termux.',
    UPDATE_GIT_PERMISSION:
      'O Android/Termux bloqueou a execução do Git.',
    UPDATE_GIT_CLONE_FAILED:
      'O Git não conseguiu baixar a atualização do GitHub.',
    UPDATE_FETCH_FAILED:
      'Não foi possível consultar a versão mais recente no GitHub.',
    UPDATE_TOKEN_REQUIRED:
      'A atualização exige um token de acesso ao repositório.',
    ERR_EXEC_MISSING:
      'Uma ferramenta necessária para a atualização não foi encontrada.',
    ERR_EXEC_PERMISSION:
      'O Android negou permissão para executar uma ferramenta do updater.'
  };

  return {
    code,
    message: messages[code] || error?.message || 'Falha desconhecida no updater.',
    detail: detail && detail !== error?.message ? detail : ''
  };
}

module.exports = {
  ROOT,
  PROTECTED,
  checkUpdate,
  installUpdate,
  rollback,
  isProtected,
  shortSha,
  describeError,
  isAndroidExternalStorage
};
