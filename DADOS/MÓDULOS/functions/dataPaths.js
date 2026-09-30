const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const runtime = require('./runtimeCompat');

const LOCAL_DIRECTORY = path.join(__dirname, '..', '..', 'database');
const PERMISSION_ERRORS = new Set(['EACCES', 'EPERM', 'EROFS']);

function writableDirectory(directory, filesystem) {
  const probe = path.join(directory, '.bot-write-' + process.pid + '-' + randomBytes(8).toString('hex'));
  const renamed = probe + '.ready';
  let created = false, moved = false;
  try {
    filesystem.mkdirSync(directory, { recursive: true });
    filesystem.writeFileSync(probe, '', { flag: 'wx', mode: 0o600 });
    created = true;
    filesystem.renameSync(probe, renamed);
    created = false; moved = true;
    filesystem.unlinkSync(renamed);
    moved = false;
    return directory;
  } finally {
    if (created) { try { filesystem.unlinkSync(probe); } catch (_) {} }
    if (moved) { try { filesystem.unlinkSync(renamed); } catch (_) {} }
  }
}

function directoryError(error, directory) {
  const denied = PERMISSION_ERRORS.has(error.code);
  const wrapped = new Error((denied ? 'Sem permissão para salvar dados em ' : 'Não foi possível preparar a pasta de dados ') +
    directory + (error.code ? ' (' + error.code + ')' : '') + '. Configure BOT_ADMIN_DATA_DIR com uma pasta gravável.');
  wrapped.code = denied ? 'ERR_DATA_PERMISSION' : 'ERR_DATA_DIRECTORY';
  wrapped.cause = error;
  return wrapped;
}

function resolveDataDirectory(options = {}) {
  const { env = process.env, filesystem = fs, localDirectory = LOCAL_DIRECTORY,
    legacyDirectory = '/data', termux = runtime.isTermux(), useLegacyVolume = true } = options;
  const configured = env.BOT_ADMIN_DATA_DIR || env.RAILWAY_VOLUME_MOUNT_PATH;
  if (configured) {
    const directory = path.resolve(configured);
    try { return writableDirectory(directory, filesystem); }
    catch (error) { throw directoryError(error, directory); }
  }
  // Android's /data is a system directory, not a bot volume.
  if (useLegacyVolume && !termux && filesystem.existsSync(legacyDirectory)) {
    try { return writableDirectory(path.resolve(legacyDirectory), filesystem); }
    catch (error) {
      if (!PERMISSION_ERRORS.has(error.code)) throw directoryError(error, legacyDirectory);
    }
  }
  const directory = path.resolve(localDirectory);
  try { return writableDirectory(directory, filesystem); }
  catch (error) { throw directoryError(error, directory); }
}

function resolveDataFile(filename, options = {}) {
  const { env = process.env, filesystem = fs, legacyDirectory = '/data',
    termux = runtime.isTermux(), useLegacyVolume = true, override } = options;
  if (override) {
    const file = path.resolve(override);
    try { writableDirectory(path.dirname(file), filesystem); }
    catch (error) { throw directoryError(error, path.dirname(file)); }
    return file;
  }
  const directory = resolveDataDirectory(options);
  const file = path.join(directory, filename);
  const previous = path.join(path.resolve(legacyDirectory), filename);
  // Preserve readable legacy data when an automatically detected volume is read-only.
  // An existing local file always wins; explicit paths never migrate implicitly.
  if (useLegacyVolume && !termux && !env.BOT_ADMIN_DATA_DIR && !env.RAILWAY_VOLUME_MOUNT_PATH &&
      file !== previous && !filesystem.existsSync(file) && filesystem.existsSync(previous)) {
    try { filesystem.copyFileSync(previous, file, fs.constants.COPYFILE_EXCL); }
    catch (error) {
      if (error.code !== 'EEXIST') {
        const wrapped = new Error('Não foi possível preservar os dados de ' + previous + '.');
        wrapped.code = 'ERR_DATA_MIGRATION'; wrapped.cause = error;
        throw wrapped;
      }
    }
  }
  return file;
}

module.exports = { resolveDataDirectory, resolveDataFile };
