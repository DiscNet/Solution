const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const Module = require('module');
const { spawn } = require('child_process');
const runtime = require('./runtimeCompat');

const ROOT = path.resolve(__dirname, '../../..');
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_UPDATE_BYTES = 100 * 1024 * 1024;
const PROTECTED = [
  '.git/', 'node_modules/', '.update/', '.env', '.env.*', '.npmrc',
  'bridge.toml', 'DADOS/database/', 'DADOS/conexão/bot_auth/',
  'DADOS/conexao/bot_auth/', 'DADOS/conexão/auth_info/', 'auth_info/', 'bot_auth/',
  'DADOS/config/config.js', 'DADOS/temp/', 'DADOS/logs/', 'logs/', '.cache/'
];

function updateError(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

function normalizeRel(value) {
  const rel = String(value || '');
  if (!rel || rel.includes('\\') || rel.includes('\0') || path.posix.isAbsolute(rel) ||
      /^[A-Za-z]:/.test(rel) || rel.split('/').some(part => !part || part === '.' || part === '..')) {
    throw updateError('UPDATE_UNSAFE_PATH', 'Caminho inválido na atualização: ' + rel);
  }
  return rel;
}

function isProtected(value) {
  let rel;
  try { rel = normalizeRel(value); } catch (_) { return true; }
  if (rel.startsWith('DADOS/database/lib/')) return false;
  return PROTECTED.some(rule => rule === '.env.*' ? rel.startsWith('.env.') :
    rule.endsWith('/') ? rel === rule.slice(0, -1) || rel.startsWith(rule) : rel === rule);
}

function exists(file) {
  try { return fs.lstatSync(file); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return null;
  }
}

// Reject parent symlinks so code writes cannot reach a session or database.
function safePath(root, value) {
  const rel = normalizeRel(value);
  let current = root;
  const parts = rel.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    const stat = exists(current);
    if (stat?.isSymbolicLink()) throw updateError('UPDATE_UNSAFE_PATH', 'Link simbólico no caminho: ' + rel);
    if (stat && i < parts.length - 1 && !stat.isDirectory()) {
      throw updateError('UPDATE_PATH_CONFLICT', 'Uma pasta do updater está ocupada por um arquivo: ' + rel);
    }
  }
  return current;
}

function blobSha(value) {
  const data = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return crypto.createHash('sha1').update('blob ' + data.length + '\0').update(data).digest('hex');
}

function fileSha(file) {
  const stat = exists(file);
  if (!stat) return null;
  if (!stat.isFile()) throw updateError('UPDATE_PATH_CONFLICT', 'O destino não é um arquivo: ' + file);
  return blobSha(fs.readFileSync(file));
}

function atomicWrite(file, data, mode = 0o644) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.' + process.pid + '-' + crypto.randomBytes(6).toString('hex') + '.tmp';
  try {
    fs.writeFileSync(temporary, data, { flag: 'wx', mode });
    fs.renameSync(temporary, file);
  } finally {
    try { fs.rmSync(temporary, { force: true }); } catch (_) {}
  }
}

function writeJson(file, value) { atomicWrite(file, JSON.stringify(value, null, 2) + '\n', 0o600); }

function readJson(file, fallback = null) {
  if (!exists(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) {
    throw updateError('UPDATE_STATE_INVALID', 'Arquivo de estado inválido: ' + file, error);
  }
}

function shortSha(value) { return String(value || '').slice(0, 8) || 'desconhecido'; }

function token() {
  return String(process.env.BOT_UPDATE_TOKEN || process.env.UPDATE_GITHUB_TOKEN ||
    process.env.SOLUTION_GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '').trim();
}

function redact(value) {
  let result = String(value || '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  const secret = token();
  if (secret) {
    for (const form of [secret, encodeURIComponent(secret), Buffer.from('x-access-token:' + secret).toString('base64')]) {
      result = result.split(form).join('[oculto]');
    }
  }
  return result.replace(/(https?:\/\/)[^/\s@]+@/g, '$1[oculto]@')
    .replace(/(Authorization:\s*(?:Basic|Bearer)\s+)\S+/gi, '$1[oculto]');
}

function describeError(error) {
  const code = String(error?.code || 'UPDATE_FAILED');
  const detail = redact(error?.stderr || error?.cause?.stderr || error?.cause?.message || '').trim().slice(-1000);
  const hints = {
    UPDATE_GIT_MISSING: 'No Termux, instale o Git com: pkg install git',
    UPDATE_NPM_MISSING: 'No Termux, instale o npm com: pkg install nodejs-lts',
    UPDATE_EXEC_PERMISSION: 'Inicie com tnode npm start ou coloque o projeto no armazenamento interno do Termux.',
    UPDATE_DEPENDENCIES_FAILED: 'Consulte as últimas linhas do npm no log. As dependências antigas continuam disponíveis.',
    UPDATE_BUSY: 'Aguarde o processo de atualização em andamento.',
    UPDATE_NO_SPACE: 'Libere espaço para os arquivos novos e o backup.',
    UPDATE_RECOVERY_FAILED: 'O backup foi mantido em .update/backups para recuperar a atualização.',
    UPDATE_COMMAND_TIMEOUT: 'A operação excedeu o tempo limite. Verifique a conexão e tente novamente.',
    UPDATE_SYNTAX_INVALID: 'O código recebido contém um erro de sintaxe; a atualização não foi aplicada.'
  };
  return { code, message: redact(error?.message || 'Falha no updater.'), detail, hint: hints[code] || '' };
}

// Async subprocesses keep the WhatsApp connection responsive. Kill the process
// group on timeout, including npm/git launched through tnode.
async function run(name, args, options = {}) {
  const command = runtime.commandSpec(name, args, { useTnode: true });
  const limit = options.maxBuffer || 32 * 1024 * 1024;
  const timeout = options.timeout || 120000;
  return new Promise((resolve, reject) => {
    const child = spawn(command.file, command.args, {
      cwd: options.cwd, env: options.env || process.env, shell: false,
      detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe']
    });
    const stdout = [], stderr = [];
    let size = 0, failure = null;
    function stop() {
      try {
        if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch (_) { try { child.kill('SIGKILL'); } catch (_) {} }
    }
    const timer = setTimeout(() => {
      failure = updateError('UPDATE_COMMAND_TIMEOUT', name + ' excedeu o tempo limite.');
      stop();
    }, timeout);
    const collect = chunks => data => {
      size += data.length;
      if (size > limit) {
        failure = updateError('UPDATE_OUTPUT_LIMIT', 'Saída excessiva da ferramenta ' + name + '.');
        stop();
      } else chunks.push(data);
    };
    child.stdout.on('data', collect(stdout));
    child.stderr.on('data', collect(stderr));
    child.on('error', error => {
      clearTimeout(timer);
      const code = error.code === 'ENOENT' ? (name === 'npm' ? 'UPDATE_NPM_MISSING' : name === 'git' ? 'UPDATE_GIT_MISSING' : 'ERR_EXEC_MISSING') :
        error.code === 'EACCES' || error.code === 'EPERM' ? 'UPDATE_EXEC_PERMISSION' : error.code;
      reject(updateError(code || 'UPDATE_COMMAND_FAILED', 'Não foi possível executar ' + name + ': ' + redact(error.message), error));
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const out = Buffer.concat(stdout), err = Buffer.concat(stderr).toString('utf8');
      if (failure || code !== 0) {
        const error = failure || updateError('UPDATE_COMMAND_FAILED', name + ' falhou (' + (code ?? signal ?? '?') + ').');
        error.stderr = redact(err || out.toString('utf8')).slice(-12000);
        reject(error);
      } else resolve(options.binary ? out : out.toString('utf8'));
    });
  });
}

function dependencySignature(data) {
  const pkg = JSON.parse(Buffer.isBuffer(data) ? data.toString('utf8') : data);
  const sorted = object => Object.fromEntries(Object.entries(object || {}).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify({
    dependencies: sorted(pkg.dependencies), optionalDependencies: sorted(pkg.optionalDependencies),
    peerDependencies: sorted(pkg.peerDependencies), overrides: sorted(pkg.overrides)
  });
}

function createUpdateManager(options = {}) {
  const root = fs.realpathSync(path.resolve(options.root || ROOT));
  const repository = String(options.repository || process.env.BOT_UPDATE_REPOSITORY || 'DiscNet/Solution').trim();
  const branch = String(options.branch || process.env.BOT_UPDATE_BRANCH || 'main').trim();
  const remoteName = String(process.env.BOT_UPDATE_REMOTE || 'origin').trim();
  const updateDir = path.join(root, '.update'), backupsDir = path.join(updateDir, 'backups');
  const stateFile = path.join(updateDir, 'state.json'), pendingFile = path.join(updateDir, 'pending.json');
  const lockDir = path.join(updateDir, 'lock');
  const maxBackups = Math.max(1, Number(process.env.BOT_UPDATE_MAX_BACKUPS || 5) || 5);
  const emptyState = () => ({ lastRemoteCommit: null, managedPaths: [], managedShas: {}, lastBackup: null });
  const state = () => {
    const saved = readJson(stateFile, emptyState());
    if (!saved || typeof saved !== 'object' || Array.isArray(saved) ||
        (saved.managedPaths && !Array.isArray(saved.managedPaths)) ||
        (saved.managedShas && typeof saved.managedShas !== 'object')) {
      throw updateError('UPDATE_STATE_INVALID', 'Estado antigo do updater inválido.');
    }
    return { ...emptyState(), ...saved };
  };
  const emit = (log, message, level = 'info') => { try { log(redact(message), level); } catch (_) {} };

  function checkedBackup(relative) {
    if (!/^backups\/[^/]+$/.test(relative || '')) throw updateError('UPDATE_UNSAFE_PATH', 'Caminho de backup inválido.');
    return safePath(updateDir, relative);
  }

  function acquireLock() {
    safePath(root, '.update/lock');
    fs.mkdirSync(updateDir, { recursive: true });
    for (let attempt = 0; attempt < 2; attempt++) {
      let created = false;
      try {
        fs.mkdirSync(lockDir);
        created = true;
        writeJson(path.join(lockDir, 'owner.json'), { pid: process.pid, startedAt: Date.now() });
        return () => fs.rmSync(lockDir, { recursive: true, force: true });
      } catch (error) {
        if (created) {
          try { fs.rmSync(lockDir, { recursive: true, force: true }); } catch (_) {}
          throw error;
        }
        if (error.code !== 'EEXIST') throw error;
        let owner = null;
        try { owner = readJson(path.join(lockDir, 'owner.json')); } catch (_) {}
        let alive = false;
        if (Number.isInteger(owner?.pid) && owner.pid > 0) {
          try { process.kill(owner.pid, 0); alive = true; } catch (e) { alive = e.code === 'EPERM'; }
        } else alive = Date.now() - fs.statSync(lockDir).mtimeMs < 30000;
        if (alive) throw updateError('UPDATE_BUSY', 'Outra atualização está em andamento.');
        fs.rmSync(lockDir, { recursive: true, force: true });
      }
    }
    throw updateError('UPDATE_BUSY', 'Não foi possível adquirir o bloqueio do updater.');
  }

  function gitEnv(auth = false) {
    const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'Never' };
    if (auth && token()) {
      const count = Math.max(0, parseInt(env.GIT_CONFIG_COUNT || '0', 10) || 0);
      env.GIT_CONFIG_COUNT = String(count + 1);
      env['GIT_CONFIG_KEY_' + count] = 'http.https://github.com/.extraHeader';
      env['GIT_CONFIG_VALUE_' + count] = 'Authorization: Basic ' + Buffer.from('x-access-token:' + token()).toString('base64');
    }
    return env;
  }
  const git = (args, settings = {}) => run('git', args, { cwd: root, env: gitEnv(settings.auth), ...settings });

  function matchesRepository(url) {
    const normalized = String(url || '').replace(/\.git$/i, '').toLowerCase();
    return normalized === ('https://github.com/' + repository).toLowerCase() ||
      normalized === ('git@github.com:' + repository).toLowerCase() ||
      normalized === ('ssh://git@github.com/' + repository).toLowerCase();
  }

  async function parseTree(cwd, commit) {
    const data = await git(['ls-tree', '-r', '-l', '-z', commit], { cwd, binary: true });
    const tree = new Map();
    for (const entry of data.toString('utf8').split('\0')) {
      if (!entry) continue;
      const tab = entry.indexOf('\t');
      if (tab < 0) throw updateError('UPDATE_SOURCE_INVALID', 'Árvore Git inválida.');
      const [mode, type, sha, sizeText] = entry.slice(0, tab).trim().split(/\s+/);
      const rel = normalizeRel(entry.slice(tab + 1));
      if (isProtected(rel)) continue;
      if (type !== 'blob' || !['100644', '100755'].includes(mode) || !/^[a-f0-9]{40}$/.test(sha)) {
        throw updateError('UPDATE_SOURCE_INVALID', 'Arquivo inválido na origem: ' + rel);
      }
      const size = Number(sizeText);
      if (!Number.isSafeInteger(size) || size < 0 || size > MAX_FILE_BYTES) {
        throw updateError('UPDATE_SOURCE_INVALID', 'Arquivo muito grande na origem: ' + rel);
      }
      tree.set(rel, { path: rel, mode, sha, size });
    }
    return tree;
  }

  async function loadRemote(log) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[\w/.-]+$/.test(branch) || branch.startsWith('-') || branch.includes('..')) {
      throw updateError('UPDATE_SOURCE_INVALID', 'Repositório ou branch do updater inválido.');
    }
    const base = runtime.writableTempDir('solution-updater');
    await git(['--version'], { cwd: base });
    const directory = fs.mkdtempSync(path.join(base, 'source-'));
    const cleanup = () => fs.rmSync(directory, { recursive: true, force: true });
    try {
      const previous = state();
      let baseline = new Map();
      let url = options.repositoryUrl || 'https://github.com/' + repository + '.git';
      if (exists(path.join(root, '.git')) && !(runtime.isTermux() && runtime.isAndroidExternalStorage(root))) {
        try {
          const origin = (await git(['remote', 'get-url', remoteName])).trim();
          if (!options.repositoryUrl && matchesRepository(origin)) url = origin;
          if (!previous.lastRemoteCommit) {
            const head = (await git(['rev-parse', 'HEAD'])).trim();
            baseline = await parseTree(root, head);
          }
        } catch (_) {}
      }
      emit(log, 'Baixando ' + repository + ' (' + branch + ')...');
      await git(['init', '--quiet', '--bare', directory], { cwd: base });
      try {
        await git(['fetch', '--quiet', '--no-tags', '--depth=1', '--', url, branch], { cwd: directory });
      } catch (error) {
        if (!token() || ['UPDATE_COMMAND_TIMEOUT', 'UPDATE_GIT_MISSING', 'UPDATE_EXEC_PERMISSION'].includes(error.code)) throw error;
        await git(['fetch', '--quiet', '--no-tags', '--depth=1', '--', url, branch], { cwd: directory, auth: true });
      }
      const commit = (await git(['rev-parse', 'FETCH_HEAD'], { cwd: directory })).trim();
      const tree = await parseTree(directory, commit);
      for (const required of ['package.json', 'DADOS/update.js', 'DADOS/MÓDULOS/functions/updateManager.js']) {
        if (!tree.has(required)) throw updateError('UPDATE_SOURCE_INVALID', 'Estrutura incompleta na atualização: ' + required);
      }
      const baselineShas = Object.keys(previous.managedShas || {}).length ? previous.managedShas :
        Object.fromEntries([...baseline].map(([rel, item]) => [rel, item.sha]));
      return {
        cwd: directory, commit, tree, baselineCommit: previous.lastRemoteCommit || null,
        baselinePaths: previous.managedPaths?.length ? previous.managedPaths : [...baseline.keys()],
        baselineShas, source: runtime.isTermux() ? 'git-staging-termux' : 'git-staging', cleanup
      };
    } catch (error) {
      cleanup();
      if (error.code?.startsWith('UPDATE_') && error.code !== 'UPDATE_COMMAND_FAILED') throw error;
      throw updateError('UPDATE_FETCH_FAILED', 'Não foi possível baixar a atualização do GitHub.', error);
    }
  }

  function calculate(remote) {
    const changes = [];
    let bytes = 0;
    for (const [rel, item] of remote.tree) {
      if (fileSha(safePath(root, rel)) !== item.sha) {
        bytes += item.size;
        if (bytes > MAX_UPDATE_BYTES) throw updateError('UPDATE_SOURCE_INVALID', 'Atualização maior que 100 MiB.');
        changes.push({ type: exists(safePath(root, rel)) ? 'update' : 'create', path: rel, item });
      }
    }
    for (const rel of remote.baselinePaths) {
      if (isProtected(rel) || remote.tree.has(rel)) continue;
      const current = fileSha(safePath(root, rel));
      if (current && (!remote.baselineShas[rel] || remote.baselineShas[rel] === current)) {
        changes.push({ type: 'delete', path: rel, item: null });
      }
    }
    return changes.sort((a, b) => a.path.localeCompare(b.path, 'pt-BR'));
  }

  async function remoteBlob(remote, item) {
    const data = await git(['cat-file', 'blob', item.sha], { cwd: remote.cwd, binary: true, maxBuffer: MAX_FILE_BYTES + 1024 });
    if (data.length !== item.size || blobSha(data) !== item.sha) throw updateError('UPDATE_INTEGRITY_FAILED', 'Integridade inválida em ' + item.path + '.');
    return data;
  }

  function validateCode(rel, data, packageType) {
    try {
      if (rel.endsWith('.json')) JSON.parse(data.toString('utf8'));
      if (rel.endsWith('.cjs') || (rel.endsWith('.js') && packageType !== 'module')) {
        const text = data.toString('utf8').replace(/^\uFEFF/, '').replace(/^#![^\n]*/, '');
        new vm.Script(Module.wrap(text), { filename: rel });
      }
    } catch (error) {
      throw updateError('UPDATE_SYNTAX_INVALID', 'Arquivo inválido: ' + rel + '. ' + error.message, error);
    }
  }

  async function dependencyPlan(remote, changes, packageData) {
    const oldPackage = exists(path.join(root, 'package.json')) ? fs.readFileSync(path.join(root, 'package.json')) : Buffer.from('{}');
    const pkg = JSON.parse(packageData.toString('utf8'));
    const missing = Object.keys(pkg.dependencies || {}).some(name => !exists(path.join(root, 'node_modules', name, 'package.json')));
    return {
      needed: missing || dependencySignature(oldPackage) !== dependencySignature(packageData) ||
        changes.some(change => change.path === 'package-lock.json'),
      pkg
    };
  }

  async function prepare(remote, changes, log) {
    const packageData = await remoteBlob(remote, remote.tree.get('package.json'));
    validateCode('package.json', packageData);
    const dependencies = await dependencyPlan(remote, changes, packageData);
    const dir = safePath(root, '.update/transactions/' + Date.now() + '-' + crypto.randomBytes(6).toString('hex'));
    fs.mkdirSync(dir, { recursive: true });
    try {
      const incoming = new Map();
      emit(log, 'Validando ' + changes.filter(item => item.type !== 'delete').length + ' arquivo(s)...');
      for (const change of changes) {
        if (change.type === 'delete') continue;
        const data = change.path === 'package.json' ? packageData : await remoteBlob(remote, change.item);
        validateCode(change.path, data, dependencies.pkg.type);
        const file = safePath(dir, 'files/' + change.path);
        atomicWrite(file, data);
        if (change.path.endsWith('.mjs') || (change.path.endsWith('.js') && dependencies.pkg.type === 'module')) {
          await run('node', ['--check', file], { cwd: root });
        }
        incoming.set(change.path, data);
      }
      if (dependencies.needed) {
        const project = path.join(dir, 'project');
        fs.mkdirSync(project);
        atomicWrite(path.join(project, 'package.json'), packageData);
        const lock = remote.tree.get('package-lock.json');
        if (lock) atomicWrite(path.join(project, 'package-lock.json'), await remoteBlob(remote, lock));
        else if (exists(path.join(root, 'package-lock.json'))) fs.copyFileSync(safePath(root, 'package-lock.json'), path.join(project, 'package-lock.json'));
        if (exists(path.join(root, '.npmrc'))) fs.copyFileSync(safePath(root, '.npmrc'), path.join(project, '.npmrc'));
        const spec = runtime.commandSpec('npm', [], { useTnode: true });
        emit(log, 'Preparando dependências separadamente' + (spec.tnode ? ' com tnode' : '') + '...');
        const started = Date.now();
        const heartbeat = setInterval(() => emit(log, 'Instalação de dependências em andamento (' + Math.round((Date.now() - started) / 1000) + 's)...'), 15000);
        try {
          const out = await run('npm', [lock ? 'ci' : 'install', '--omit=dev', '--include=optional', '--no-audit', '--no-fund'], {
            cwd: project, timeout: Math.max(1000, Number(process.env.BOT_UPDATE_NPM_TIMEOUT_MS || 900000)), maxBuffer: 16 * 1024 * 1024
          });
          for (const line of redact(out).trim().split('\n').slice(-8)) if (line) emit(log, 'npm: ' + line);
          if (!exists(path.join(project, 'node_modules'))) fs.mkdirSync(path.join(project, 'node_modules'));
          const required = Object.keys(dependencies.pkg.dependencies || {});
          if (required.length) {
            await run('node', ['-e',
              'const fs=require("fs"),p=require("path");for(const name of JSON.parse(process.argv[1])){if(!fs.existsSync(p.join(process.cwd(),"node_modules",name,"package.json")))throw new Error("Dependência ausente: "+name)}',
              JSON.stringify(required)], { cwd: project });
          }
        } catch (error) {
          if (['UPDATE_NPM_MISSING', 'UPDATE_EXEC_PERMISSION', 'UPDATE_COMMAND_TIMEOUT'].includes(error.code)) throw error;
          throw updateError('UPDATE_DEPENDENCIES_FAILED', 'Falha ao preparar as dependências da atualização.', error);
        } finally { clearInterval(heartbeat); }
        const generated = path.join(project, 'package-lock.json');
        if (!lock && exists(generated)) {
          incoming.set('package-lock.json', fs.readFileSync(generated));
          if (!changes.some(item => item.path === 'package-lock.json')) {
            changes.push({ type: exists(path.join(root, 'package-lock.json')) ? 'update' : 'create', path: 'package-lock.json', item: { mode: '100644' } });
          }
        }
      }
      return { dir, incoming, dependencies: dependencies.needed };
    } catch (error) { fs.rmSync(dir, { recursive: true, force: true }); throw error; }
  }

  function backupChanges(changes, remote, prepared) {
    const name = new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(4).toString('hex');
    const directory = safePath(root, '.update/backups/' + name);
    fs.mkdirSync(directory, { recursive: true });
    const entries = [];
    for (const change of changes) {
      const target = safePath(root, change.path), stat = exists(target);
      let sha = null;
      if (stat) {
        const data = fs.readFileSync(target);
        sha = blobSha(data);
        atomicWrite(safePath(directory, 'files/' + change.path), data, stat.mode & 0o777);
      }
      entries.push({ path: change.path, existed: !!stat, mode: stat ? stat.mode & 0o777 : 0o644, sha });
    }
    const manifest = {
      status: 'prepared', createdAt: new Date().toISOString(), targetCommit: remote.commit,
      previousState: state(), previousCommit: remote.baselineCommit, entries,
      dependencySwap: prepared.dependencies, hadNodeModules: !!exists(path.join(root, 'node_modules'))
    };
    writeJson(path.join(directory, 'manifest.json'), manifest);
    return { dir: directory, relative: 'backups/' + name, manifest };
  }

  function restoreBackup(directory, status = 'rolled_back', updateState = true) {
    const manifest = readJson(path.join(directory, 'manifest.json'));
    if (!manifest || !Array.isArray(manifest.entries)) throw updateError('UPDATE_BACKUP_INVALID', 'Backup inválido.');
    for (const entry of manifest.entries) {
      if (isProtected(entry.path)) throw updateError('UPDATE_BACKUP_INVALID', 'Arquivo protegido no backup.');
      safePath(root, entry.path);
      if (entry.existed && entry.sha && fileSha(safePath(directory, 'files/' + entry.path)) !== entry.sha) {
        throw updateError('UPDATE_BACKUP_INVALID', 'Integridade inválida no backup: ' + entry.path);
      }
    }
    if (manifest.dependencySwap) {
      const saved = path.join(directory, 'node_modules'), current = path.join(root, 'node_modules');
      if (exists(saved)) { fs.rmSync(current, { recursive: true, force: true }); fs.renameSync(saved, current); }
      else if (!manifest.hadNodeModules) fs.rmSync(current, { recursive: true, force: true });
    }
    for (const entry of [...manifest.entries].reverse()) {
      const target = safePath(root, entry.path);
      if (entry.existed) atomicWrite(target, fs.readFileSync(safePath(directory, 'files/' + entry.path)), entry.mode || 0o644);
      else fs.rmSync(target, { force: true });
    }
    if (updateState) writeJson(stateFile, manifest.previousState || {
      ...emptyState(), lastRemoteCommit: manifest.previousCommit || null, managedPaths: manifest.previousManagedPaths || []
    });
    manifest.status = status;
    writeJson(path.join(directory, 'manifest.json'), manifest);
    return manifest;
  }

  function recoverInterrupted(log) {
    if (!exists(pendingFile)) return;
    const pending = readJson(pendingFile), directory = checkedBackup(pending?.backup);
    if (pending.phase !== 'committed') {
      emit(log, 'Recuperando atualização interrompida...', 'warn');
      try { restoreBackup(directory, pending.phase === 'rollback' ? 'rolled_back' : 'failed'); } catch (error) {
        throw updateError('UPDATE_RECOVERY_FAILED', 'Falha ao recuperar a atualização interrompida.', error);
      }
    }
    fs.rmSync(pendingFile, { force: true });
    emit(log, 'Recuperação concluída.');
  }

  function trimBackups() {
    try {
      const directories = fs.readdirSync(backupsDir, { withFileTypes: true })
        .filter(item => item.isDirectory()).map(item => item.name).sort().reverse();
      for (const name of directories.slice(maxBackups)) fs.rmSync(safePath(backupsDir, name), { recursive: true, force: true });
    } catch (_) {}
  }

  async function withLock(callback, log = () => {}) {
    let release;
    try {
      release = acquireLock();
      try { state(); } catch (error) {
        if (error.code !== 'UPDATE_STATE_INVALID' || exists(pendingFile)) throw error;
        fs.renameSync(stateFile, stateFile + '.invalid-' + Date.now());
        emit(log, 'Estado antigo inválido; reconstruindo pelo repositório.', 'warn');
      }
      recoverInterrupted(log);
      return await callback();
    } catch (error) {
      if (['ENOSPC', 'EDQUOT'].includes(error.code)) throw updateError('UPDATE_NO_SPACE', 'Espaço insuficiente para atualizar o bot.', error);
      if (['EACCES', 'EPERM', 'EROFS'].includes(error.code)) throw updateError('UPDATE_WRITE_PERMISSION', 'Sem permissão para gravar no projeto: ' + root, error);
      throw error;
    } finally { if (release) release(); }
  }

  async function checkUpdate(log = () => {}) {
    return withLock(async () => {
      const remote = await loadRemote(log);
      try {
        const changes = calculate(remote), packageData = await remoteBlob(remote, remote.tree.get('package.json'));
        const dependencies = await dependencyPlan(remote, changes, packageData);
        return {
          ok: true, available: !!changes.length || dependencies.needed, changes,
          dependenciesNeeded: dependencies.needed, source: remote.source,
          localCommit: remote.baselineCommit, remoteCommit: remote.commit,
          filesUpdated: changes.filter(item => item.type !== 'delete').length,
          filesDeleted: changes.filter(item => item.type === 'delete').length, protected: [...PROTECTED]
        };
      } finally { remote.cleanup(); }
    }, log);
  }

  async function installUpdate(log = () => {}) {
    return withLock(async () => {
      const remote = await loadRemote(log);
      let prepared = null;
      try {
        const changes = calculate(remote);
        prepared = await prepare(remote, changes, log);
        const managedShas = Object.fromEntries([...remote.tree].map(([rel, item]) => [rel, item.sha]));
        const nextState = {
          ...state(), lastRemoteCommit: remote.commit, managedPaths: [...remote.tree.keys()],
          managedShas, source: remote.source, lastCheckedAt: new Date().toISOString()
        };
        if (!changes.length && !prepared.dependencies) {
          writeJson(stateFile, nextState);
          return { updated: false, version: remote.commit, source: remote.source, filesUpdated: 0, filesDeleted: 0 };
        }
        emit(log, 'Criando backup de ' + changes.length + ' arquivo(s)...');
        const backup = backupChanges(changes, remote, prepared);
        writeJson(pendingFile, { phase: 'applying', backup: backup.relative });
        try {
          if (prepared.dependencies) {
            const current = path.join(root, 'node_modules');
            if (exists(current)) fs.renameSync(current, path.join(backup.dir, 'node_modules'));
            fs.renameSync(path.join(prepared.dir, 'project', 'node_modules'), current);
          }
          for (const change of changes) {
            const target = safePath(root, change.path);
            if (change.type === 'delete') fs.rmSync(target, { force: true });
            else atomicWrite(target, prepared.incoming.get(change.path), change.item.mode === '100755' ? 0o755 : 0o644);
          }
          writeJson(stateFile, { ...nextState, lastBackup: backup.relative, lastUpdateAt: new Date().toISOString() });
          backup.manifest.status = 'applied';
          writeJson(path.join(backup.dir, 'manifest.json'), backup.manifest);
          writeJson(pendingFile, { phase: 'committed', backup: backup.relative });
        } catch (error) {
          emit(log, 'Falha ao aplicar; restaurando arquivos e dependências...', 'warn');
          try {
            restoreBackup(backup.dir, 'failed');
            fs.rmSync(pendingFile, { force: true });
          } catch (recoveryError) {
            throw updateError('UPDATE_RECOVERY_FAILED', 'Não foi possível concluir a recuperação; o backup foi preservado.', recoveryError);
          }
          throw error;
        }
        fs.rmSync(pendingFile, { force: true });
        trimBackups();
        emit(log, 'Arquivos e dependências aplicados com sucesso.', 'success');
        return {
          updated: true, from: backup.manifest.previousCommit, version: remote.commit, source: remote.source,
          dependenciesUpdated: prepared.dependencies,
          filesUpdated: changes.filter(item => item.type !== 'delete').length,
          filesDeleted: changes.filter(item => item.type === 'delete').length
        };
      } finally {
        if (prepared) fs.rmSync(prepared.dir, { recursive: true, force: true });
        remote.cleanup();
      }
    }, log);
  }

  async function rollback(log = () => {}) {
    return withLock(async () => {
      const previous = state();
      let directory = previous.lastBackup ? checkedBackup(previous.lastBackup) : null;
      if (!directory || !exists(path.join(directory, 'manifest.json'))) {
        const names = exists(backupsDir) ? fs.readdirSync(backupsDir).sort().reverse() : [];
        directory = null;
        for (const name of names) {
          const candidate = safePath(backupsDir, name), manifest = readJson(path.join(candidate, 'manifest.json'));
          if (manifest?.status === 'applied') { directory = candidate; break; }
        }
      }
      if (!directory) throw updateError('UPDATE_NO_BACKUP', 'Nenhum backup de atualização está disponível.');
      emit(log, 'Restaurando arquivos e dependências do último backup...');
      writeJson(pendingFile, { phase: 'rollback', backup: path.relative(updateDir, directory).replace(/\\/g, '/') });
      const manifest = restoreBackup(directory);
      fs.rmSync(pendingFile, { force: true });
      return { restored: true, version: manifest.previousCommit || 'anterior', from: manifest.targetCommit, files: manifest.entries.length };
    }, log);
  }

  async function recover(log = () => {}) { return withLock(async () => true, log); }

  return { ROOT: root, PROTECTED, checkUpdate, installUpdate, rollback, recover, isProtected, shortSha, describeError,
    isAndroidExternalStorage: runtime.isAndroidExternalStorage };
}

module.exports = { ...createUpdateManager(), createUpdateManager, blobSha };
