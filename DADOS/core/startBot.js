// index.js
const {
  default: makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers
} = require("@whiskeysockets/baileys");
const NodeCache = require("node-cache");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const { authDir } = require("../conexão/sessao");
const ROOT_DIR = path.join(__dirname, "..");
const axios = require("axios");
const { installMessageDefaults } = require("../MÓDULOS/functions/messageDefaults");
const { executeCommand } = require("../MÓDULOS/functions/commandExecutor");
const runtimeLogger = require("../MÓDULOS/functions/runtimeLogger");
const terminal = require("../MÓDULOS/functions/terminalLogger").createLogger("BOT");
const { extractMessageText, unwrapMessage, isInteractiveReply, interactiveReplyId } = require("../MÓDULOS/functions/messageText");
const { registerConnectionEvents } = require("../eventos/connection");
const { createReconnectController } = require("../eventos/reconnect");
const { registerMessagesEvent } = require("../eventos/messages");
const { registerGroupEvents } = require("../eventos/groups");
const { createRestartAnnouncer } = require("../MÓDULOS/functions/restartAnnouncement");
const { handlePrivateInbox } = require("../eventos/privateInbox");
const contactNameCache = require("../MÓDULOS/functions/contactNameCache");
const { moderateLegacyAnti, moderateSpam } = require("../MÓDULOS/functions/groupAntis");
const {
  normalizeCommandName,
  loadProjectCommandModules,
  buildCommandRegistry,
  replaceRegistry,
  formatRegistryIssue
} = require("../MÓDULOS/functions/commandRegistry");

// RUNTIME_OPTIMIZED_V1

// 🔥 CARREGA O CONFIG COM RECARREGAMENTO AUTOMÁTICO
const configLoader = require("../MÓDULOS/functions/configLoader");
let config = configLoader.carregarConfig();

// 🔥 FUNÇÃO PARA RECARREGAR CONFIG EM COMANDOS
function recarregarConfigHandler() {
  config = configLoader.recarregarConfig();
  console.log(`✅ Configurações recarregadas! Prefixo: ${config.prefix}`);
  return config;
}

// ==============================================
// IMPORTS
// ==============================================
const { sendButtons, sendInteractiveMessage } = require("../MÓDULOS/functions/uiMode");

// ==============================================
// CACHE DE NOMES DE GRUPOS
// ==============================================

const groupNamesCache = new Map();

setInterval(() => {
  const agora = Date.now();
  for (const [id, entry] of groupNamesCache.entries()) {
    if (agora - entry.timestamp > 300000) {
      groupNamesCache.delete(id);
    }
  }
}, 300000);

async function getGroupName(conn, groupId) {
  try {
    const cached = groupNamesCache.get(groupId);
    if (cached && (Date.now() - cached.timestamp) < 60000) {
      return cached.name;
    }
    const groupMetadata = await conn.groupMetadata(groupId);
    const groupName = groupMetadata.subject || groupId.split("@")[0];
    groupNamesCache.set(groupId, { name: groupName, timestamp: Date.now() });
    return groupName;
  } catch (error) {
    return groupId.split("@")[0];
  }
}

function formatSender(senderId, isGroup = false) {
  if (isGroup) return "Grupo";
  if (senderId.includes("@lid")) return senderId.split("@")[0];
  if (senderId.includes("@s.whatsapp.net")) return senderId.split("@")[0];
  return senderId;
}

// ==============================================
// LOGGER
// ==============================================

const baileysLogger = pino({ level: process.env.BAILEYS_LOG_LEVEL || "silent" }, process.stdout);
const msgRetryCounterCache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120,
  useClones: false
});

// ==============================================
// FUNÇÃO DE LOG ORGANIZADA
// ==============================================

const LOG_MESSAGES = process.env.LOG_MESSAGES === "1";

function logMensagem(tipo, dados) {
  if (tipo === "mensagem" && !LOG_MESSAGES) return;
  const horario = new Date().toLocaleString("pt-BR");
  const alvo = dados.isGroup
    ? (dados.grupo || dados.remoteJid || dados.chatId || "grupo")
    : (dados.remoteJid || dados.remetente || "privado");
  const remetente = dados.participant || dados.remetente || "desconhecido";

  console.log(`[MSG] ${dados.texto || "(mídia)"} | ${alvo} | ${remetente} | ${horario}`);
}

// ==============================================
// FUNÇÕES AUXILIARES
// ==============================================

function getMessageText(msg) {
  return extractMessageText(msg);
}

function hasMedia(msg) {
  return !!(msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.stickerMessage);
}

function isReplyingToMedia(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) return false;
  return !!(quoted.imageMessage || quoted.videoMessage || quoted.stickerMessage);
}


// ==============================================
// DETECÇÃO DE COMANDO - SOMENTE COM PREFIXO
// ==============================================

function detectCommand(text, commandsList) {
  if (!text) return null;
  const prefix = config.prefix || ".";
  if (!text.startsWith(prefix)) return null;

  const parts = text.slice(prefix.length).trim().split(/ +/);
  const cmdName = (parts.shift() || "").toLowerCase();
  if (!cmdName || !commandsList[cmdName]) return null;
  return { cmdName, args: parts, hasPrefix: true };
}


// ==============================================
// ALUGUEL
// ==============================================

const aluguel = require("../MÓDULOS/functions/aluguel");

// ==============================================
// AFK
// ==============================================

const afk = require("../MÓDULOS/functions/afk");
const activitySystem = require("../MÓDULOS/functions/activitySystem");

const blockcmdManager = require("../MÓDULOS/functions/blockcmd");

function isCommandBlocked(grupoId, cmdName) {
  return blockcmdManager.isCommandBlocked(grupoId, cmdName);
}


// ==============================================
// BEM-VINDO
// ==============================================

const bemvindoFunctions = require("../MÓDULOS/functions/bemvindo");
const isBemvindoAtivo = bemvindoFunctions.isBemvindoAtivo;
const { sendGroupWelcomeBanner } = require("../MÓDULOS/functions/groupWelcomeBanner");

// ==============================================
// CONFIGURAÇÃO DE MANUTENÇÃO
// ==============================================

const comandosEmManutencao = ["alugar-bot", "alugarbot", "alugar", "comprar", "premium", "vip"];
const DONO_LID = config.ownerLid || null;
const DONO_NUMERO = config.ownerNumber || (DONO_LID ? DONO_LID.split('@')[0] : "556384673123");
const motivosManutencao = { default: "Manutenção programada", "alugar-bot": "Sistema de aluguel em atualização", "premium": "Planos premium sendo reestruturados" };
const PREVISAO_MANUTENCAO = "Em breve estará disponível";

function isUserDono(senderJid) {
  const senderNumber = senderJid.split('@')[0];
  if (DONO_LID && senderJid === DONO_LID) return true;
  if (senderNumber === DONO_NUMERO) return true;
  return false;
}

async function verificarManutencao(conn, from, cmdName, senderJid, msg) {
  const emManutencao = require("../MÓDULOS/functions/maintenance").list().includes(cmdName);
  if (!emManutencao) return false;
  const isDono = require("../MÓDULOS/functions/permissions").isOwner(msg);
  if (isDono) {
    await conn.sendMessage(from, { text: `⚠️ *ᴀᴛᴇɴÇÃᴏ ᴅᴏɴᴏ!*\n\n🔧 ᴏ ᴄᴏᴍᴀɴᴅᴏ "${cmdName}" ᴇsᴛá ᴇᴍ ᴍᴀɴᴜᴛᴇɴçãᴏ ᴘᴀʀᴀ ᴜsᴜáʀɪᴏs ᴄᴏᴍᴜɴs, ᴍᴀs ᴠᴏᴄê ᴛᴇᴍ ᴘᴇʀᴍɪssãᴏ ᴘᴀʀᴀ ᴜsᴀʀ.\n\n📌 ᴄᴏɴᴛɪɴᴜᴇ ᴄᴏᴍ ᴏ ᴄᴏᴍᴀɴᴅᴏ ɴᴏʀᴍᴀʟᴍᴇɴᴛᴇ.` }, { quoted: msg });
    return false;
  }
  const motivo = motivosManutencao[cmdName] || motivosManutencao.default;
  const dataAtual = new Date().toLocaleDateString("pt-BR");
  const horaAtual = new Date().toLocaleTimeString("pt-BR");
  const prefix = config.prefix || ".";
  const textoManutencao = `\n╭══════════════════════╮\n     🔧 *𝑬𝑴 𝑴𝑨𝑵𝑼𝑻𝑬𝑵𝑪̧𝑨̃𝑶* 🔧\n╰══════════════════════╯\n━━━━━━━━━━━━━━━━━━━━━━━\n\n⚠️ *ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ ᴇsᴛá ᴛᴇᴍᴘᴏʀᴀʀɪᴀᴍᴇɴᴛᴇ ɪɴᴅɪsᴘᴏɴíᴠᴇʟ!*\n\n📌 *ᴄᴏᴍᴀɴᴅᴏ:* ${prefix}${cmdName}\n📅 *ᴅᴀᴛᴀ:* ${dataAtual}\n⏰ *ʜᴏʀᴀ:* ${horaAtual}\n\n━━━━━━━━━━━━━━━━━━━━━━━\n🔧 *ᴍᴏᴛɪᴠᴏ:* ${motivo}\n🔄 *ᴘʀᴇᴠɪsãᴏ:* ${PREVISAO_MANUTENCAO}\n━━━━━━━━━━━━━━━━━━━━━━━`;
  await sendInteractiveMessage(conn, from, { text: textoManutencao, footer: "sᴇ ǫᴜɪsᴇʀ, ᴘᴏᴅᴇ ᴛᴇɴᴛᴀʀ ғᴀʟᴀʀ ᴄᴏᴍ ᴏ sᴜᴘᴏʀᴛᴇ", interactiveButtons: [{ name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📞 𝐒𝐮𝐩𝐨𝐫𝐭𝐞", url: `https://wa.me/${DONO_NUMERO}` }) }] });
  return true;
}

// ==============================================
// LEVENSHTEIN DISTANCE
// ==============================================

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1));
    }
  }
  return matrix[b.length][a.length];
}

function encontrarComandoSemelhante(cmdDigitado, listaComandos) {
  let melhorMatch = null, menorDistancia = Infinity;
  for (const cmd of listaComandos) {
    const distancia = levenshteinDistance(cmdDigitado.toLowerCase(), cmd.toLowerCase());
    if (distancia < menorDistancia && distancia <= 3) { menorDistancia = distancia; melhorMatch = cmd; }
  }
  return melhorMatch;
}

async function sendCommandNotFoundMessage(conn, from, cmdName, senderNumber, sugestao = null, msg = null) {
  const prefix = config.prefix || ".";
  const horaAtual = new Date().toLocaleTimeString("pt-BR");
  const dataAtual = new Date().toLocaleDateString("pt-BR");
  const owner = config.ownerName || "LukaModzz";
  let pushName = "Unknow";
  if (msg) {
    pushName = msg.pushName || msg.key?.pushName || msg.notify || "Usuário";
  }
  if (pushName === "Usuário" && msg?.key?.remoteJid) {
    const contact = await conn.contactFetchWait(msg.key.remoteJid).catch(() => null);
    if (contact && contact.notify) pushName = contact.notify;
  }
  let sugestaoTexto = sugestao ? `\n┃𖤐𝆺𝅥˚ —̳͟͞͞ 🧊ິ̸𝚂𝚎𝚖𝚊𝚕𝚑𝚊𝚗𝚌̧𝚊: ${prefix}${sugestao}` : "";
  const errorMessage = `\n╭ֹܻ╼֮͊͜❀ֹ݄͜┅᳞֟፝┈̤፟━⵿໋݊━⵿໋݊━⵿݊❄️ᮬ᳘ᰰ━⵿໋݊━⵿໋݊━⵿໋݊┈᳞֟፝┅ֹ݄͜❀֮͜╾ֹܻ͊╮\n┃ ┍─݊━⵿໋݊─⊣ (𔓕᳝ׅ ٜ፝⃐⃑֟۫💎 ٜ፝⃐⃑֟۫𔓕᳝ׅ) ⊢─⵿໋݊━⵿໋݊━⵿໋݊─┑\n┃𖤐𝆺𝅥˚ —̳͟͞͞ 🧊ິ̸𝙴𝚁𝚁𝙾: 𝐂𝐨𝐦𝐚𝐧𝐝𝐨 𝐢𝐧𝐯𝐚́𝐥𝐢𝐝𝐨\n┃𖤐𝆺𝅥˚ —̳͟͞͞ 🧊ິ̸𝙲𝙼𝙳: ${prefix}${cmdName}\n┃𖤐𝆺𝅥˚ —̳͟͞͞ 🧊ິ̸𝙳𝙰𝚃𝙰: ${dataAtual}\n┃𖤐𝆺𝅥˚ —̳͟͞͞ 🧊ິ̸𝙷𝙾𝚁𝙰: ${horaAtual}${sugestaoTexto}\n┃ └─݊━⵿⵿໋݊݊─⊢ (𔓕᳝ׅ ٜ፝⃐⃑֟۫💎 ٜ፝⃐⃑֟۫𔓕᳝ׅ) ⊣━⵿໋━⵿໋݊━⵿໋݊─┘\n╰ܻ╼֮͊͜❀ֹ݄͜┅᳞֟፝┈̤፟━⵿໋݊━⵿໋݊━⵿݊❄️ᮬ᳘ᰰ━⵿໋݊━⵿໋݊━⵿໋݊┈᳞֟፝┅ֹ݄͜❀֮͜╾ֹܻ͊╯`;
  await sendButtons(conn, from, {
    text: errorMessage,
    footer: "𝖢𝗅𝗂𝗊𝗎𝖾 𝗇𝗈 𝖻𝗈𝗍𝖺̃𝗈 𝖺𝖻𝖺𝗂𝗑𝗈 𝗉𝖺𝗋𝖺 𝗂𝗋 𝖺𝗈 𝗆𝖾𝗇𝗎",
    buttons: [{ id: `${prefix}menu`, text: "》『🧊』《　" }],
  });
}

// ==============================================
// DETECTOR DE LINKS DE DOWNLOAD
// ==============================================

function detectarPlataforma(url) {
  if (url.includes('pin.it') || url.includes('pinterest.com')) return '𝘗𝘪𝘯𝘵𝘦𝘳𝘦𝘴𝘵';
  if (url.includes('instagram.com') || url.includes('instagr.am')) return '𝘐𝘯𝘴𝘵𝘢𝘨𝘳𝘢𝘮';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return '𝘠𝘰𝘶𝘵𝘶𝘣𝘦';
  if (url.includes('tiktok.com') || url.includes('vt.tiktok.com')) return '𝘛𝘪𝘬𝘛𝘰𝘬';
  return null;
}

async function enviarMenuDownload(conn, from, plataforma, link) {
  const prefix = config.prefix || ".";
  const menuText = `*📥͜͡￫ Lɪɴᴋ ᴅᴏ ${plataforma} Dᴇᴛᴇᴄᴛᴀᴅᴏ!*`;
  let botoes = [];
  if (plataforma === '𝘠𝘰𝘶𝘵𝘶𝘣𝘦') {
    botoes = [{ id: `${prefix}ytmp4 ${link}`, text: "𝑽𝒊𝒅𝒆𝒐⃝ 📽️ ⃪" }, { id: `${prefix}ytmp3 ${link}`, text: "𝑨𝒖𝒅𝒊𝒐⃝ 🎵 ⃪" }];
  } else if (plataforma === '𝘗𝘪𝘯𝘵𝘦𝘳𝘦𝘴𝘵') {
    botoes = [{ id: `${prefix}pinmp4 ${link}`, text: "𝑽𝒊𝒅𝒆𝒐⃝ 📽️ ⃪" }, { id: `${prefix}pinmp3 ${link}`, text: "𝑨𝒖𝒅𝒊𝒐⃝ 🎵 ⃪" }];
  } else if (plataforma === '𝘐𝘯𝘴𝘵𝘢𝘨𝘳𝘢𝘮') {
    botoes = [{ id: `${prefix}igvideo ${link}`, text: "𝑽𝒊𝒅𝒆𝒐⃝ 📽️ ⃪" }, { id: `${prefix}igaudio ${link}`, text: "𝑨𝒖𝒅𝒊𝒐⃝ 🎵 ⃪" }];
  } else if (plataforma === '𝘛𝘪𝘬𝘛𝘰𝘬') {
    botoes = [{ id: `${prefix}ttkmp4 ${link}`, text: "𝑽𝒊𝒅𝒆𝒐⃝ 📽️ ⃪" }, { id: `${prefix}ttkmp3 ${link}`, text: "𝑨𝒖𝒅𝒊𝒐⃝ 🎵 ⃪" }];
  }
  await sendButtons(conn, from, { text: menuText, footer: "ᴇsᴄᴏʟʜᴀ ᴀ ғᴏʀᴍᴀ ᴅᴇ ᴅᴏᴡɴʟᴏᴀᴅ", buttons: botoes });
}

// ==============================================
// CARREGAMENTO DE COMANDOS (SILENCIOSO)
// ==============================================

const commands = {};
let comandosCarregados = 0;
let comandosFalhos = [];
let conflitosComandos = [];

function reloadCommandsFromDisk() {
  const { records, errors } = loadProjectCommandModules(ROOT_DIR, { clearCache: true });
  const { registry, collisions } = buildCommandRegistry(records);

  replaceRegistry(commands, registry);
  require("../MÓDULOS/functions/menuCatalog").prime(records, errors, collisions);
  comandosCarregados = records.length;
  comandosFalhos = errors.map(({ file, error }) =>
    `${path.relative(ROOT_DIR, file)}: ${error.message}`
  );
  conflitosComandos = collisions.map(item => formatRegistryIssue(item, ROOT_DIR));
}

function getCanonicalCommandName(cmdName) {
  const normalized = normalizeCommandName(cmdName);
  if (!normalized) return "";
  const command = commands[normalized];
  return normalizeCommandName(command?.name) || normalized;
}

function getCanonicalCommandNames() {
  return [...new Set(
    Object.values(commands)
      .map(command => normalizeCommandName(command?.name))
      .filter(Boolean)
  )];
}

reloadCommandsFromDisk();

if (process.env.HOT_RELOAD === "1") {
  try {
    require("../MÓDULOS/functions/autoupgrade")({ commands });
  } catch (error) {
    console.error("Falha ao ativar hot reload:", error.message);
  }
}

// ==============================================
// FUNÇÕES EXTERNAS
// ==============================================

const autofiguPath = path.join(ROOT_DIR, "MÓDULOS", "plugins", "admin", "autofigu.js");
const autofiguModule = fs.existsSync(autofiguPath) ? require(autofiguPath) : null;
const autoresponse = require("../MÓDULOS/functions/autoresponse");
const axiosInstance = axios.create({ timeout: 10000 });
global.reactMessages = {};
function isGroup(jid) { return jid.endsWith("@g.us"); }

// ==============================================
// FUNÇÕES DE LOG APÓS O BOT INICIAR
// ==============================================

let conn = null;
const announceRestartToGroups = createRestartAnnouncer(() => conn);

function ownerPrivateJid() {
  const number = String(config.ownerNumber || "").replace(/\D/g, "");
  if (number) return number + "@s.whatsapp.net";
  return String(config.ownerLid || "").trim();
}

async function notifyOwnerStartup() {
  const ownerJid = ownerPrivateJid();
  if (!ownerJid || !conn || typeof conn.sendMessage !== "function") return;

  const botNumber = String(conn.user?.id || "").split(":")[0].split("@")[0] || "desconhecido";
  const now = new Date();
  const date = now.toLocaleDateString("pt-BR");
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const botName = config.botName || "Solution";

  const message =
    "✅ *BOT INICIADO COM SUCESSO*\n\n" +
    "• Bot: " + botName + "\n" +
    "• Número: " + botNumber + "\n" +
    "• Data: " + date + "\n" +
    "• Hora: " + time + "\n\n" +
    "O sistema foi iniciado/reiniciado e está conectado ao WhatsApp.";

  try {
    await conn.sendMessage(ownerJid, { text: message });
  } catch (error) {
    runtimeLogger.error({
      scope: "startup-owner-notification",
      error,
      code: "ERR_STARTUP_OWNER_NOTIFY",
    });
  }
}

function handleConnectionOpen() {
  exibirLogsPosInicio();
  void notifyOwnerStartup();
  void announceRestartToGroups();
}

function exibirLogsPosInicio() {
  terminal.banner({
    bot: config.botName || 'Bot', owner: config.ownerName || 'Não configurado',
    number: config.ownerNumber || '', commands: getCanonicalCommandNames().length
  });

  if (comandosFalhos.length > 0) {
    terminal.warn("Comandos com erro ao carregar:");
    for (const erro of comandosFalhos) {
      terminal.warn(erro);
    }
  }

  if (conflitosComandos.length > 0) {
    terminal.warn("Conflitos de comandos/aliases:");
    for (const conflito of conflitosComandos) {
      terminal.warn(conflito);
    }
  }
}

async function executeDetectedCommand(cmdName, args, msg, from) {
  const sender = msg.key?.participantAlt || msg.key?.participant || msg.key?.remoteJidAlt || from;
  const user = contactNameCache.cleanName(msg.pushName || msg.pushname) ||
    contactNameCache.get([sender, msg.key?.participant, msg.key?.remoteJid]) || runtimeLogger.senderLabel(sender);
  const group = isGroup(from) ? await getGroupName(conn, from) : 'Privado';
  return executeCommand({ conn, msg, args, from, axiosInstance, requestedName: cmdName, command: commands[cmdName],
    logContext: { user, group, prefix: config.prefix || '.' } });
}

// ==============================================
// BOT PRINCIPAL
// ==============================================

let isStarting = false;
const reconnect = createReconnectController({ start: () => startBot() });

async function startBot() {
  if (isStarting) return conn;
  isStarting = true;
  try {
    if (conn) {
      try { conn.ev.removeAllListeners(); } catch (_) {}
      conn = null;
    }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  if (!state.creds.registered) {
    terminal.banner({ bot: config.botName || 'Bot', owner: config.ownerName || '',
      number: config.ownerNumber || '', commands: getCanonicalCommandNames().length });
    terminal.error('Não autenticado. Execute npm run connect e depois npm start.');
    process.exit(1);
  }

  const auth = {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, baileysLogger)
  };

  conn = makeWASocket({
    auth,
    printQRInTerminal: false,
    browser: Browsers.macOS("Desktop"),
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    msgRetryCounterCache,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    logger: baileysLogger
  });

  installMessageDefaults(conn);

  registerConnectionEvents(conn, {
    saveCreds,
    DisconnectReason,
    reconnect,
    onOpen: handleConnectionOpen
  });

  // Mantém um cache leve dos nomes públicos fornecidos pelo próprio WhatsApp.
  // O evento de entrada nem sempre inclui pushName, mas contacts.* e mensagens
  // costumam trazer essa informação.
  conn.ev.on("contacts.upsert", contacts => {
    try { contactNameCache.rememberContacts(contacts); } catch (_) {}
  });
  conn.ev.on("contacts.update", contacts => {
    try { contactNameCache.rememberContacts(contacts); } catch (_) {}
  });

  // ==============================================
  // EVENTO DE MENSAGENS
  // ==============================================

  async function processIncomingMessage(msg) {
    if (!msg?.message) return;
    if (msg.key?.fromMe) return;

    // msg.pushName é uma das fontes mais confiáveis do nome público no Baileys.
    contactNameCache.rememberMessage(msg);

    // 🔥 RECARREGA O CONFIG A CADA MENSAGEM (se ativado)
    if (config.recarregarConfig !== false) {
      config = configLoader.carregarConfig();
    }

    // Encaminha mensagens privadas recebidas para o dono antes do restante do processamento.
    await handlePrivateInbox(conn, msg);

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const grupo = isGroup(from);

    let text = getMessageText(msg);
    const unwrappedMessage = unwrapMessage(msg);
    const interactiveReply = isInteractiveReply(msg);
    const interactiveId = interactiveReplyId(msg);
    const hasMediaInMessage = hasMedia(msg);
    const isReplyingMedia = isReplyingToMedia(msg);
    const isMediaCommand = hasMediaInMessage || isReplyingMedia;

    try {
      // ========== ATIVIDADE REAL DO GRUPO ==========
      // Equivalente ao evento pre da Tokito: registra toda mensagem recebida
      // e separa comandos, mídia e última atividade por usuário.
      if (grupo) {
        const body = unwrappedMessage || {};
        const interactiveCommand = interactiveReply;
        const detectedForStats = detectCommand(text, commands);
        activitySystem.recordMessage({
          groupId: from,
          msg,
          sender: msg.key.participantAlt || sender,
          isCommand: Boolean(detectedForStats) || interactiveCommand,
        });
      }

      if (await require("../MÓDULOS/functions/adminPolicy").moderateMessage(conn, msg, from, text)) return;

      // ========== EXTRAIR DADOS PARA LOG ==========
      const remetenteNumero = sender ? sender.split('@')[0] : 'desconhecido';
      const participantAlt = msg.key.participant ? msg.key.participant.split('@')[0] : null;
      const remoteJidAlt = from ? from.split('@')[0] : null;

      // ========== SISTEMA AFK ==========
      // O helper ignora os próprios comandos AFK, avisa menções/respostas
      // e remove automaticamente o estado quando a pessoa volta a conversar.
      if (grupo) {
        await afk.processMessage(conn, msg, {
          from,
          text,
          prefix: config.prefix || ".",
        });
      }

      // ========== 🔥 VERIFICAÇÃO DE ALUGUEL ==========
      if (grupo) {
        // Verifica se o grupo tem aluguel ativo
        if (!aluguel.isGrupoAtivo(from)) {
          // Verifica se expirou e precisa notificar
          const expirado = aluguel.verificarExpiracao(from);
          if (expirado) {
            // Envia mensagem de expiração (apenas uma vez)
            try {
              const groupName = await getGroupName(conn, from);
              await conn.sendMessage(from, {
                text: `⚠️ *ᴀʟᴜɢᴜᴇʟ ᴇxᴘɪʀᴀᴅᴏ!*\n\n📌 *ɢʀᴜᴘᴏ:* ${groupName}\n\nᴏ ᴘᴇʀɪ́ᴏᴅᴏ ᴅᴇ ᴀʟᴜɢᴜᴇʟ ᴅᴇsᴛᴇ ɢʀᴜᴘᴏ ᴇxᴘɪʀᴏᴜ. ᴏ ʙᴏᴛ ɴᴀ̃ᴏ ʀᴇsᴘᴏɴᴅᴇʀᴀ́ ᴀᴛᴇ́ ᴏ ᴀʟᴜɢᴜᴇʟ sᴇʀ ʀᴇɴᴏᴠᴀᴅᴏ.\n\n📌 ᴄᴏɴᴛᴀᴛᴇ ᴏ ᴅᴏɴᴏ ᴘᴀʀᴀ ʀᴇɴᴏᴠᴀʀ.`
              });
            } catch (e) {
              console.error("Erro ao enviar notificação de expiração:", e);
            }
          }

          // IGNORA TODAS AS MENSAGENS DO GRUPO (não processa nada)
          return;
        }
      }

      // Bloqueios de comandos são verificados no executor para texto e botões.

      if (await moderateLegacyAnti(conn, msg, from, { text, interactiveReply })) return;

      // ========== LOG DE MENSAGEM ==========
      if (text && !text.startsWith(config.prefix) && !text.match(/(https?:\/\/[^\s]+)/g)) {
        if (grupo) {
          const groupName = await getGroupName(conn, from);
          logMensagem('mensagem', {
            texto: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            isGroup: true,
            grupo: groupName,
            participant: participantAlt,
            remoteJid: remoteJidAlt,
            remetente: remetenteNumero
          });
        } else {
          logMensagem('mensagem', {
            texto: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            isGroup: false,
            remoteJid: remoteJidAlt,
            remetente: remetenteNumero
          });
        }
      }

      // DETECTOR DE LINKS DE DOWNLOAD
      if (text && !text.startsWith(config.prefix)) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = text.match(urlRegex);
        if (urls) {
          for (const url of urls) {
            const plataforma = detectarPlataforma(url);
            if (plataforma) { await enviarMenuDownload(conn, from, plataforma, url); return; }
          }
        }
      }

      // 🔥 COMANDO EM RESPOSTA A MÍDIA (SOMENTE COM PREFIXO)
      if (isReplyingMedia && msg.message?.extendedTextMessage?.text) {
        const responseText = msg.message.extendedTextMessage.text;
        const cmdDetection = detectCommand(responseText, commands);

        if (cmdDetection) {
          const { cmdName, args, hasPrefix } = cmdDetection;

          const emManutencao = await verificarManutencao(conn, from, getCanonicalCommandName(cmdName), sender, msg);
          if (emManutencao) return;
          if (commands[cmdName]) {
            await executeDetectedCommand(cmdName, args, msg, from);
            return;
          }
        }
      }

      // 🔥 COMANDO NA LEGENDA DA MÍDIA (SOMENTE COM PREFIXO)
      if (hasMediaInMessage && text) {
        const cmdDetection = detectCommand(text, commands);

        if (cmdDetection) {
          const { cmdName, args, hasPrefix } = cmdDetection;

          const emManutencao = await verificarManutencao(conn, from, getCanonicalCommandName(cmdName), sender, msg);
          if (emManutencao) return;
          if (commands[cmdName]) {
            await executeDetectedCommand(cmdName, args, msg, from);
            return;
          }
        }
      }

      // 🔥 COMANDO EM TEXTO NORMAL (SOMENTE COM PREFIXO)
      if (text && !isMediaCommand) {
        const cmdDetection = detectCommand(text, commands);

        if (cmdDetection) {
          const { cmdName, args, hasPrefix } = cmdDetection;

          const emManutencao = await verificarManutencao(conn, from, getCanonicalCommandName(cmdName), sender, msg);
          if (emManutencao) return;
          if (commands[cmdName]) {
            await executeDetectedCommand(cmdName, args, msg, from);
            return;
          }
        }
        // 🔥 SE COMEÇOU COM PREFIXO MAS NÃO É COMANDO, MOSTRA SUGESTÃO
        if (text.startsWith(config.prefix)) {
          const afterPrefix = text.slice(config.prefix.length).trim();
          const cmdName = afterPrefix.split(/ +/)[0].toLowerCase();
          if (!commands[cmdName]) {
            const listaComandos = getCanonicalCommandNames();
            const comandoSugerido = encontrarComandoSemelhante(cmdName, listaComandos);
            const senderNumber = sender.split('@')[0];
            await sendCommandNotFoundMessage(conn, from, cmdName, senderNumber, comandoSugerido, msg);
            return;
          }
        }
      }

      if (await moderateSpam(conn, msg, from, { text, prefix: config.prefix })) return;

      if (autofiguModule) { await autofiguModule.autoHandler(conn, msg, from, sender); }

      // HANDLER DE INTERAÇÕES
      let buttonId = interactiveId || null;
      let buttonText = null;
      const interactionMessage = unwrappedMessage || {};

      if (interactionMessage.buttonsResponseMessage) {
        const btn = interactionMessage.buttonsResponseMessage;
        buttonText = btn.selectedDisplayText;
      } else if (interactionMessage.templateButtonReplyMessage) {
        const btn = interactionMessage.templateButtonReplyMessage;
        buttonText = btn.selectedDisplayText;
      } else if (interactionMessage.listResponseMessage) {
        const list = interactionMessage.listResponseMessage.singleSelectReply;
        buttonText = list?.selectedTitle;
      } else if (interactionMessage.interactiveResponseMessage) {
        try {
          const interactive = interactionMessage.interactiveResponseMessage;
          if (interactive.nativeFlowResponseMessage) {
            const params = JSON.parse(interactive.nativeFlowResponseMessage.paramsJson || "{}");
            buttonText =
              params.display_text ||
              params.title ||
              params.selectedTitle ||
              params.selected_title ||
              interactive.nativeFlowResponseMessage.displayText;
          } else if (interactive.buttonReply) {
            buttonText = interactive.buttonReply.displayText;
          }
        } catch (e) {}
      }

      if (buttonId) {
        if (buttonId.startsWith(config.prefix)) {
          const parts = buttonId.slice(config.prefix.length).trim().split(/ +/);
          const cmdName = parts[0].toLowerCase();
          const args = parts.slice(1);

          const emManutencao = await verificarManutencao(conn, from, getCanonicalCommandName(cmdName), sender, msg);
          if (emManutencao) return;
          if (commands[cmdName]) { await executeDetectedCommand(cmdName, args, msg, from); }
          else { const listaComandos = getCanonicalCommandNames(); const comandoSugerido = encontrarComandoSemelhante(cmdName, listaComandos); const senderNumber = sender.split('@')[0]; await sendCommandNotFoundMessage(conn, from, cmdName, senderNumber, comandoSugerido, msg); }
        } else if (buttonText) { await conn.sendMessage(from, { text: `✅ ᴠᴏᴄê ᴄʟɪᴄᴏᴜ ᴇᴍ: ${buttonText}` }); }
        return;
      }

      // HANDLER DE REAÇÕES
      if (msg.message.reactionMessage) {
        const reaction = msg.message.reactionMessage;
        const reactedMessageId = reaction.key.id;
        const emoji = reaction.text;
        if (global.reactMessages && global.reactMessages[reactedMessageId]) {
          const reactData = global.reactMessages[reactedMessageId];
          if (!reactData.usedBy) reactData.usedBy = {};
          if (!reactData.usedBy[sender]) reactData.usedBy[sender] = {};
          if (reactData.usedBy[sender][emoji]) return;
          reactData.usedBy[sender][emoji] = true;
          if (reactData.callback) await reactData.callback(conn, msg, { emoji, sender, from, data: reactData.data });
        }
        return;
      }

      // AUTO RESPONSE
      if (text && !text.startsWith(config.prefix)) { await autoresponse(conn, msg, from, text, axiosInstance); }

    } catch (err) { console.error("Erro no processamento:", err); }
  }

  registerMessagesEvent(conn, processIncomingMessage);

  // EVENTO DE PARTICIPANTES (BEM-VINDO)
  registerGroupEvents(conn, async (update) => {
    try {
      const config = require("../config/config");
      const { id, participants, action } = update;
      const bemvindoAtivo = isBemvindoAtivo(id);

      if (bemvindoAtivo) {
        const groupMetadata = await conn.groupMetadata(id);
        const groupName = groupMetadata.subject;
        const groupDesc = groupMetadata.desc || "Sem descrição";
        const participantCount = groupMetadata.participants.length;
        const prefix = config.prefix || ".";

        function getParticipantJid(p) {
          if (typeof p === "string") return p;
          if (p && typeof p === "object") {
            return p.phoneNumber || p.id || p.jid || p.lid || "";
          }
          return "";
        }

        if (action === "add") {
          for (const participant of participants) {
            try {
              await sendGroupWelcomeBanner(conn, {
                groupJid: id,
                participant,
                groupMetadata,
                botName: config.botName || "LukaModzz",
              });
            } catch (err) {
              console.error("Erro ao gerar banner de boas-vindas:", err);

              const userJid = getParticipantJid(participant);
              const userNumber = userJid ? userJid.split("@")[0] : "usuario";
              const mensagemBoasVindas =
                "*⎾🧊⏌ sᴇᴊᴀ ʙᴇᴍ ᴠɪɴᴅᴏ @" + userNumber + "!*\n\n" +
                " • ᴘᴏʀ ғᴀᴠᴏʀ ʟᴇɪᴀ ᴀ ᴅᴇsᴄʀɪᴄ̧ᴀ̃ᴏ\n" +
                "ᴇ sɪɢᴀ ᴀs ʀᴇɢʀᴀs\n\n" +
                "> 『🧊』ᴀᴘʀᴏᴠᴇɪᴛᴇ!";

              await conn.sendMessage(id, {
                text: mensagemBoasVindas,
                mentions: userJid ? [userJid] : [],
              }).catch(() => {});
            }
          }
        } else if (action === "remove") {
          for (const participant of participants) {
            try {
              const userJid = getParticipantJid(participant);
              const userNumber = userJid ? userJid.split('@')[0] : 'usuário';
              const mensagemAdeus = `*⎾🧊⏌ ᴀᴅᴇᴜs @${userNumber}!*\n\n • sᴇɴᴛɪʀᴇᴍᴏs sᴜᴀ ғᴀʟᴛᴀ\n> ᴠᴏʟᴛᴇ ǫᴜᴀɴᴅᴏ ǫᴜɪsᴇʀ 👋`;
              await conn.sendMessage(id, {
                text: mensagemAdeus,
                mentions: [userJid],
              });
            } catch (err) {
              console.error("Erro ao processar saída de membro:", err);
            }
          }
        }
      }
    } catch (err) {
      console.error("Erro no evento de boas-vindas:", err);
    }
  });

  return conn;
  } finally {
    isStarting = false;
  }
}


async function startBotWithRecovery() {
  try {
    return await startBot();
  } catch (error) {
    runtimeLogger.error({ scope: "startup", error, code: "ERR_BOT_START" });
    reconnect.schedule("falha na inicialização");
    return null;
  }
}

module.exports = { startBot, startBotWithRecovery };
