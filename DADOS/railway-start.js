process.chdir(__dirname);
require('./MÓDULOS/functions/runtimeCompat').applyRuntimeEnvironment();
const fs = require('fs');
const path = require('path');
const { authDir: repoAuthDir } = require('./conexão/sessao');

const configuredAuthDir = process.env.AUTH_DIR
  ? path.resolve(process.env.AUTH_DIR)
  : (process.env.RAILWAY_VOLUME_MOUNT_PATH
      ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'bot_auth')
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

    console.log('✅ bot_auth restaurado a partir de AUTH_INFO_B64.');
    return true;
  } catch (err) {
    console.error('❌ Não foi possível restaurar AUTH_INFO_B64:', err.message);
    return false;
  }
}

function prepareAuthDirectory() {
  fs.mkdirSync(path.dirname(repoAuthDir), { recursive: true });
  // Execução local sem volume.
  if (configuredAuthDir === repoAuthDir) {
    fs.mkdirSync(repoAuthDir, { recursive: true });
    if (isDirEmpty(repoAuthDir)) restoreAuthFromEnv(repoAuthDir);
    return;
  }

  // Railway/volume persistente.
  fs.mkdirSync(configuredAuthDir, { recursive: true });

  if (isDirEmpty(configuredAuthDir)) {
    // 1) usa bot_auth enviado pelo GitHub como seed do primeiro deploy;
    // 2) se ele não existir, aceita AUTH_INFO_B64 como alternativa.
    if (fs.existsSync(repoAuthDir) && !isDirEmpty(repoAuthDir)) {
      copyDirContents(repoAuthDir, configuredAuthDir);
      console.log('✅ bot_auth inicial copiado para o volume persistente.');
    } else {
      restoreAuthFromEnv(configuredAuthDir);
    }
  }

  // O caminho em DADOS/conexão/bot_auth aponta para o volume persistente.
  try {
    if (fs.existsSync(repoAuthDir)) {
      fs.rmSync(repoAuthDir, { recursive: true, force: true });
    }
    fs.symlinkSync(configuredAuthDir, repoAuthDir, 'dir');
  } catch (err) {
    console.error('❌ Falha ao preparar bot_auth persistente:', err.message);
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
    console.error('❌ Nenhuma sessão do WhatsApp foi encontrada.');
    console.error('Configure AUTH_INFO_B64 ou um volume de autenticação no Railway.');
    console.error(`Diretório de autenticação usado: ${configuredAuthDir}`);
    process.exit(1);
  }

  // Evita 405/client_too_old causado por revisão Web embutida desatualizada.
  // A atualização é feita uma vez no boot e depois periodicamente; makeWASocket
  // usa DEFAULT_CONNECTION_CONFIG no momento em que cria cada novo socket.
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
