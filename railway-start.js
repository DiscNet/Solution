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

function restoreAuthFromEnv(destination) {
  const encoded = process.env.AUTH_INFO_B64;
  if (!encoded) return false;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    const files = parsed.files || parsed;

    if (!files || typeof files !== 'object' || Array.isArray(files)) {
      throw new Error('payload inválido');
    }

    fs.mkdirSync(destination, { recursive: true });

    for (const [relativePath, fileBase64] of Object.entries(files)) {
      if (typeof relativePath !== 'string' || typeof fileBase64 !== 'string') continue;

      const normalized = path.normalize(relativePath);
      if (
        path.isAbsolute(normalized) ||
        normalized === '..' ||
        normalized.startsWith(`..${path.sep}`)
      ) {
        throw new Error(`caminho inválido em AUTH_INFO_B64: ${relativePath}`);
      }

      const outputPath = path.join(destination, normalized);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, Buffer.from(fileBase64, 'base64'));
    }

    console.log('✅ auth_info restaurado a partir de AUTH_INFO_B64.');
    return true;
  } catch (err) {
    console.error('❌ Não foi possível restaurar AUTH_INFO_B64:', err.message);
    return false;
  }
}

function prepareAuthDirectory() {
  // Execução local sem volume.
  if (configuredAuthDir === repoAuthDir) {
    fs.mkdirSync(repoAuthDir, { recursive: true });
    if (isDirEmpty(repoAuthDir)) restoreAuthFromEnv(repoAuthDir);
    return;
  }

  // Railway/volume persistente.
  fs.mkdirSync(configuredAuthDir, { recursive: true });

  if (isDirEmpty(configuredAuthDir)) {
    // 1) usa auth_info enviado pelo GitHub como seed do primeiro deploy;
    // 2) se ele não existir, aceita AUTH_INFO_B64 como alternativa.
    if (fs.existsSync(repoAuthDir) && !isDirEmpty(repoAuthDir)) {
      copyDirContents(repoAuthDir, configuredAuthDir);
      console.log('✅ auth_info inicial copiado para o volume persistente.');
    } else {
      restoreAuthFromEnv(configuredAuthDir);
    }
  }

  // O código antigo continua usando ./auth_info, mas o conteúdo fica no volume.
  try {
    if (fs.existsSync(repoAuthDir)) {
      fs.rmSync(repoAuthDir, { recursive: true, force: true });
    }
    fs.symlinkSync(configuredAuthDir, repoAuthDir, 'dir');
  } catch (err) {
    console.error('❌ Falha ao preparar auth_info persistente:', err.message);
    process.exit(1);
  }
}

prepareAuthDirectory();

const credsPath = path.join(repoAuthDir, 'creds.json');
if (!fs.existsSync(credsPath)) {
  console.error('❌ Nenhuma sessão do WhatsApp foi encontrada.');
  console.error('Envie a pasta auth_info para o GitHub ou defina AUTH_INFO_B64 no Railway.');
  console.error(`Diretório de autenticação usado: ${configuredAuthDir}`);
  process.exit(1);
}

require('./index.js');
