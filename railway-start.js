const fs = require('fs');
const path = require('path');

const repoAuthDir = path.join(__dirname, 'auth_info');
const configuredAuthDir = process.env.AUTH_DIR
  ? path.resolve(process.env.AUTH_DIR)
  : (process.env.RAILWAY_VOLUME_MOUNT_PATH
      ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'auth_info')
      : repoAuthDir);

function copyDirContents(source, destination) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDirContents(src, dst);
    } else if (entry.isFile()) {
      fs.copyFileSync(src, dst);
    }
  }
}

function isDirEmpty(dir) {
  return !fs.existsSync(dir) || fs.readdirSync(dir).length === 0;
}

function prepareAuthDirectory() {
  if (configuredAuthDir === repoAuthDir) {
    fs.mkdirSync(repoAuthDir, { recursive: true });
    return;
  }

  fs.mkdirSync(configuredAuthDir, { recursive: true });

  // No primeiro deploy, usa auth_info versionado como semente da sessão.
  if (isDirEmpty(configuredAuthDir) && fs.existsSync(repoAuthDir)) {
    copyDirContents(repoAuthDir, configuredAuthDir);
  }

  // Faz o código existente continuar usando ./auth_info, mas apontando para
  // o volume persistente do Railway.
  try {
    if (fs.existsSync(repoAuthDir)) {
      fs.rmSync(repoAuthDir, { recursive: true, force: true });
    }
    fs.symlinkSync(configuredAuthDir, repoAuthDir, 'dir');
  } catch (err) {
    console.error('Falha ao preparar auth_info persistente:', err.message);
    process.exit(1);
  }
}

prepareAuthDirectory();
require('./index.js');
