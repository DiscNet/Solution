const fs = require('fs');
const path = require('path');

const repoAuthDir = path.join(__dirname, 'auth_info');
const configuredAuthDir = process.env.AUTH_DIR
  ? path.resolve(process.env.AUTH_DIR)
  : (process.env.RAILWAY_VOLUME_MOUNT_PATH
      ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'auth_info')
      : repoAuthDir);

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
  // Execução local: a sessão continua em ./auth_info, mas a pasta é ignorada pelo Git.
  if (configuredAuthDir === repoAuthDir) {
    fs.mkdirSync(repoAuthDir, { recursive: true });
    if (isDirEmpty(repoAuthDir)) restoreAuthFromEnv(repoAuthDir);
    return;
  }

  // Railway/servidor: guarda a sessão fora do checkout do repositório.
  fs.mkdirSync(configuredAuthDir, { recursive: true });
  if (isDirEmpty(configuredAuthDir)) restoreAuthFromEnv(configuredAuthDir);

  // O restante do bot pode continuar usando ./auth_info sem conhecer o volume.
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

async function refreshWhatsAppWebVersion() {
  try {
    const baileys = require('@whiskeysockets/baileys');
    const { DEFAULT_CONNECTION_CONFIG, fetchLatestWaWebVersion, fetchLatestBaileysVersion } = baileys;

    let result = null;

    if (typeof fetchLatestWaWebVersion === 'function') {
      try {
        result = await fetchLatestWaWebVersion();
      } catch (_) {}
    }

    if ((!result || !Array.isArray(result.version) || result.version.length !== 3) &&
        typeof fetchLatestBaileysVersion === 'function') {
      try {
        result = await fetchLatestBaileysVersion();
      } catch (_) {}
    }

    if (result && Array.isArray(result.version) && result.version.length === 3 && DEFAULT_CONNECTION_CONFIG) {
      DEFAULT_CONNECTION_CONFIG.version = result.version;
      console.log(`✅ WhatsApp Web version: ${result.version.join('.')}${result.isLatest === false ? ' (fallback)' : ''}`);
      return true;
    }

    console.warn('⚠️ Não foi possível atualizar a versão do WhatsApp Web; usando a versão do Baileys.');
    return false;
  } catch (err) {
    console.warn(`⚠️ Falha ao resolver versão do WhatsApp Web: ${err.message}`);
    return false;
  }
}

async function boot() {
  prepareAuthDirectory();

  const credsPath = path.join(repoAuthDir, 'creds.json');
  if (!fs.existsSync(credsPath)) {
    console.error('❌ Nenhuma sessão privada do WhatsApp foi encontrada.');
    console.error('Use um volume persistente (AUTH_DIR/RAILWAY_VOLUME_MOUNT_PATH) ou AUTH_INFO_B64.');
    console.error('Não envie auth_info para o GitHub.');
    console.error(`Diretório de autenticação usado: ${configuredAuthDir}`);
    process.exit(1);
  }

  // Evita 405/client_too_old causado por revisão Web embutida desatualizada.
  await refreshWhatsAppWebVersion();

  const versionRefreshTimer = setInterval(() => {
    refreshWhatsAppWebVersion().catch(() => {});
  }, 6 * 60 * 60 * 1000);
  versionRefreshTimer.unref?.();

  require('./index.js');
}

boot().catch(err => {
  console.error('❌ Falha ao iniciar o Railway runtime:', err);
  process.exit(1);
});
