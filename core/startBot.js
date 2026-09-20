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
const ROOT_DIR = path.join(__dirname, "..");
const axios = require("axios");
const { createStatusQuoted } = require("../functions/statusCard");
const { executeCommand } = require("../functions/commandExecutor");
const runtimeLogger = require("../functions/runtimeLogger");
const { extractMessageText } = require("../functions/messageText");
const { registerConnectionEvents } = require("../events/connection");
const { createReconnectController } = require("../events/reconnect");
const { registerMessagesEvent } = require("../events/messages");
const { registerGroupEvents } = require("../events/groups");
const { handlePrivateInbox } = require("../events/privateInbox");
const contactNameCache = require("../functions/contactNameCache");
const {
  normalizeCommandName,
  loadCommandModules,
  buildCommandRegistry,
  replaceRegistry,
  formatRegistryIssue
} = require("../functions/commandRegistry");

// RUNTIME_OPTIMIZED_V1

// 🔥 CARREGA O CONFIG COM RECARREGAMENTO AUTOMÁTICO
const configLoader = require("../functions/configLoader");
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
const { sendButtons, sendInteractiveMessage } = require("gifted-btns");

// ==============================================
// CORES ANSI PARA TERMINAL
// ==============================================

const cores = {
  reset: "\x1b[0m",
  brilho: "\x1b[1m",
  preto: "\x1b[30m",
  vermelho: "\x1b[31m",
  verde: "\x1b[32m",
  amarelo: "\x1b[33m",
  azul: "\x1b[34m",
  magenta: "\x1b[35m",
  ciano: "\x1b[36m",
  branco: "\x1b[37m"
};

const banner = ` `

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

const baileysLogger = pino({ level: process.env.BAILEYS_LOG_LEVEL || "silent" });
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
  if (tipo === "comando") return; // comandos são logados pelo commandExecutor
  if (tipo === "mensagem" && !LOG_MESSAGES) return;
  const horario = new Date().toLocaleString("pt-BR");
  const alvo = dados.isGroup
    ? (dados.grupo || dados.remoteJid || dados.chatId || "grupo")
    : (dados.remoteJid || dados.remetente || "privado");
  const remetente = dados.participant || dados.remetente || "desconhecido";

  if (tipo === "comando") {
    console.log(`[CMD] ${dados.comando} | ${alvo} | ${remetente} | ${horario}`);
  } else {
    console.log(`[MSG] ${dados.texto || "(mídia)"} | ${alvo} | ${remetente} | ${horario}`);
  }
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

const aluguel = require("../functions/aluguel");

// ==============================================
// AFK
// ==============================================

const afk = require("../functions/afk");
const activitySystem = require("../functions/activitySystem");

// ==============================================
// ANTIS
// ==============================================

const antiManager = require("../functions/antiManager");
const blockcmdManager = require("../functions/blockcmd");

function isAntiAtivo(grupoId, tipo) {
  return antiManager.isAntiAtivo(grupoId, tipo);
}

function isCommandBlocked(grupoId, cmdName) {
  return blockcmdManager.isCommandBlocked(grupoId, cmdName);
}

// ==============================================
// ANTI-LINK
// ==============================================

function contemLink(texto) {
  if (!texto) return false;
  return /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|br|net|org|gov|edu|info|io|app|club|xyz|site|online|store|tech|live|link|me|co|us|uk|de|fr|jp|ru|in|com\.br|org\.br|net\.br|gov\.br|edu\.br))/i.test(texto);
}

// ==============================================
// ANTI-SPAM
// ==============================================

const { isAntispamAtivo, verificarSpam } = require("../functions/antispam");

// ==============================================
// BEM-VINDO
// ==============================================

const bemvindoFunctions = require("../functions/bemvindo");
const isBemvindoAtivo = bemvindoFunctions.isBemvindoAtivo;
const { sendGroupWelcomeBanner } = require("../functions/groupWelcomeBanner");

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
  const emManutencao = require("../functions/maintenance").list().includes(cmdName);
  if (!emManutencao) return false;
  const isDono = require("../functions/permissions").isOwner(msg);
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
  await sendButtons(conn, from, { text: errorMessage, footer: "𝖢𝗅𝗂𝗊𝗎𝖾 𝗇𝗈 𝖻𝗈𝗍𝖺̃𝗈 𝖺𝖻𝖺𝗂𝗑𝗈 𝗉𝖺𝗋𝖺 𝗂𝗋 𝖺𝗈 𝗆𝖾𝗇𝗎", buttons: [{ id: `${prefix}menu`, text: "》『🧊』《　"}], contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } } }, { quoted: createStatusQuoted(msg) });
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
  const commandsPath = path.join(ROOT_DIR, "commands");
  const { records, errors } = loadCommandModules(commandsPath, { clearCache: true });
  const { registry, collisions } = buildCommandRegistry(records);

  replaceRegistry(commands, registry);
  require("../functions/menuCatalog").prime(records, errors, collisions);
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
    require("../functions/autoupgrade")({ commands });
  } catch (error) {
    console.error("Falha ao ativar hot reload:", error.message);
  }
}

// ==============================================
// FUNÇÕES EXTERNAS
// ==============================================

const autofiguPath = path.join(ROOT_DIR, "commands", "admins", "autofigu.js");
const autofiguModule = fs.existsSync(autofiguPath) ? require(autofiguPath) : null;
const autoresponse = require("../functions/autoresponse");
const axiosInstance = axios.create({ timeout: 10000 });
global.reactMessages = {};
function isGroup(jid) { return jid.endsWith("@g.us"); }

// ==============================================
// FUNÇÕES DE LOG APÓS O BOT INICIAR
// ==============================================

let conn = null;

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
}

function exibirLogsPosInicio() {
  console.log(banner);
  console.log(`    ${cores.magenta}🧊 Número: ${cores.amarelo}${conn.user.id.split(":")[0]}${cores.reset}  ${cores.magenta}🧊 Prefixo: ${cores.amarelo}${config.prefix}${cores.reset}  ${cores.magenta}🧊 Comandos: ${cores.amarelo}${Object.keys(commands).length}${cores.reset}`);

  if (comandosFalhos.length > 0) {
    console.log(`${cores.vermelho}❌ Comandos com erro:${cores.reset}`);
    for (const erro of comandosFalhos) {
      console.log(`${cores.vermelho}  ⚠️ ${erro}${cores.reset}`);
    }

  if (conflitosComandos.length > 0) {
    console.log(`${cores.amarelo}⚠️ Conflitos de comandos/aliases:${cores.reset}`);
    for (const conflito of conflitosComandos) {
      console.log(`${cores.amarelo}  ⚠️ ${conflito}${cores.reset}`);
    }
  }
  }
  console.log(`\n${cores.verde}╔════════════════════════════════════════════════════════════╗${cores.reset}`);
  console.log(`${cores.verde}║${cores.reset}           ${cores.amarelo}${cores.brilho}LOGS DE MENSAGENS E COMANDOS${cores.reset}           ${cores.verde}║${cores.reset}`);
  console.log(`${cores.verde}╚════════════════════════════════════════════════════════════╝${cores.reset}`);
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

  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  if (!state.creds.registered) {
    console.clear();
    console.log(banner);
    console.log(`${cores.vermelho}❌ Não autenticado!${cores.reset}`);
    console.log(`${cores.amarelo}Execute primeiro: node conect.js 5563992003562${cores.reset}`);
    console.log(`${cores.branco}Depois volte: node index.js${cores.reset}`);
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
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    logger: baileysLogger
  });

  const NEWSLETTER_JID = config.newsletterJid || "120363xxxxxxxxxx@newsletter";
  const NEWSLETTER_NAME = config.newsletterName || config.botName || "TokitoBot";
  const _originalSendMessage = conn.sendMessage.bind(conn);
  conn.sendMessage = async (jid, content, options = {}) => {
    const semContexto = content.delete || content.react || content.poll || content.pin;
    if (!semContexto) {
      options.contextInfo = { ...(options.contextInfo || {}), forwardingScore: 2, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: NEWSLETTER_JID, newsletterName: NEWSLETTER_NAME, serverMessageId: null } };
    }
    return _originalSendMessage(jid, content, options);
  };

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
    const hasMediaInMessage = hasMedia(msg);
    const isReplyingMedia = isReplyingToMedia(msg);
    const isMediaCommand = hasMediaInMessage || isReplyingMedia;

    try {
      // ========== ATIVIDADE REAL DO GRUPO ==========
      // Equivalente ao evento pre da Tokito: registra toda mensagem recebida
      // e separa comandos, mídia e última atividade por usuário.
      if (grupo) {
        const body = msg.message || {};
        const interactiveCommand = Boolean(
          body.buttonsResponseMessage ||
          body.templateButtonReplyMessage ||
          body.listResponseMessage ||
          body.interactiveResponseMessage
        );
        const detectedForStats = detectCommand(text, commands);
        activitySystem.recordMessage({
          groupId: from,
          msg,
          sender: msg.key.participantAlt || sender,
          isCommand: Boolean(detectedForStats) || interactiveCommand,
        });
      }

      if (await require("../functions/adminPolicy").moderateMessage(conn, msg, from, text)) return;

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
                text: `⚠️ *ᴀʟᴜɢᴜᴇʟ ᴇxᴘɪʀᴀᴅᴏ!*\n\n📌 *ɢʀᴜᴘᴏ:* ${groupName}\n\nᴏ ᴘᴇʀɪ́ᴏᴅᴏ ᴅᴇ ᴀʟᴜɢᴜᴇʟ ᴅᴇsᴛᴇ ɢʀᴜᴘᴏ ᴇxᴘɪʀᴏᴜ. ᴏ ʙᴏᴛ ɴᴀ̃ᴏ ʀᴇsᴘᴏɴᴅᴇʀᴀ́ ᴀᴛᴇ́ ᴏ ᴀʟᴜɢᴜᴇʟ sᴇʀ ʀᴇɴᴏᴠᴀᴅᴏ.\n\n📌 ᴄᴏɴᴛᴀᴛᴇ ᴏ ᴅᴏɴᴏ ᴘᴀʀᴀ ʀᴇɴᴏᴠᴀʀ.`,
                contextInfo: {
                  forwardingScore: 1,
                  isForwarded: true,
                  forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363426698503859@newsletter",
                    newsletterName: `${config.botName || 'LukaModzz'}`,
                    serverMessageId: 116
                  }
                }
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

      // ========== 🔥 VERIFICAÇÃO DE CONTEÚDO BLOQUEADO (ANTI) ==========
      if (grupo) {
        // Anti-Link
        if (text && isAntiAtivo(from, 'link') && contemLink(text)) {
          const groupMetadata = await conn.groupMetadata(from);
          const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);
          if (!isSenderAdmin) {
            await conn.sendMessage(from, { delete: msg.key }).catch(() => {});
            await conn.sendMessage(from, {
              text: `⚠️ *ᴀɴᴛɪʟɪɴᴋ ᴅᴇᴛᴇᴄᴛᴀᴅᴏ!*\n\n🚫 ᴍᴇɴsᴀɢᴇᴍ ᴄᴏᴍ ʟɪɴᴋ ʀᴇᴍᴏᴠɪᴅᴀ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀᴍᴇɴᴛᴇ.`,
              contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "120363426698503859@newsletter",
                  newsletterName: `${config.botName || 'LukaModzz'}`,
                  serverMessageId: 116
                }
              }
            });
            return;
          }
        }

        // Anti-Documento
        if (msg.message.documentMessage && isAntiAtivo(from, 'documento')) {
          const groupMetadata = await conn.groupMetadata(from);
          const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);
          if (!isSenderAdmin) {
            await conn.sendMessage(from, { delete: msg.key }).catch(() => {});
            await conn.sendMessage(from, {
              text: `⚠️ *ᴀɴᴛɪᴅᴏᴄ ᴅᴇᴛᴇᴄᴛᴀᴅᴏ!*\n\n🚫 ᴅᴏᴄᴜᴍᴇɴᴛᴏ ʀᴇᴍᴏᴠɪᴅᴏ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀᴍᴇɴᴛᴇ.`,
              contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "120363426698503859@newsletter",
                  newsletterName: `${config.botName || 'LukaModzz'}`,
                  serverMessageId: 116
                }
              }
            });
            return;
          }
        }

        // Anti-Imagem
        if (msg.message.imageMessage && isAntiAtivo(from, 'imagem')) {
          const groupMetadata = await conn.groupMetadata(from);
          const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);
          if (!isSenderAdmin) {
            await conn.sendMessage(from, { delete: msg.key }).catch(() => {});
            await conn.sendMessage(from, {
              text: `⚠️ *ᴀɴᴛɪɪᴍᴀɢᴇᴍ ᴅᴇᴛᴇᴄᴛᴀᴅᴏ!*\n\n🚫 ɪᴍᴀɢᴇᴍ ʀᴇᴍᴏᴠɪᴅᴀ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀᴍᴇɴᴛᴇ.`,
              contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "120363426698503859@newsletter",
                  newsletterName: `${config.botName || 'LukaModzz'}`,
                  serverMessageId: 116
                }
              }
            });
            return;
          }
        }

        // Anti-Vídeo
        if (msg.message.videoMessage && isAntiAtivo(from, 'video')) {
          const groupMetadata = await conn.groupMetadata(from);
          const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);
          if (!isSenderAdmin) {
            await conn.sendMessage(from, { delete: msg.key }).catch(() => {});
            await conn.sendMessage(from, {
              text: `⚠️ *ᴀɴᴛɪᴠɪᴅᴇᴏ ᴅᴇᴛᴇᴄᴛᴀᴅᴏ!*\n\n🚫 ᴠɪ́ᴅᴇᴏ ʀᴇᴍᴏᴠɪᴅᴏ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀᴍᴇɴᴛᴇ.`,
              contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "120363426698503859@newsletter",
                  newsletterName: `${config.botName || 'LukaModzz'}`,
                  serverMessageId: 116
                }
              }
            });
            return;
          }
        }

        // Anti-Áudio
        if (msg.message.audioMessage && isAntiAtivo(from, 'audio')) {
          const groupMetadata = await conn.groupMetadata(from);
          const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);
          if (!isSenderAdmin) {
            await conn.sendMessage(from, { delete: msg.key }).catch(() => {});
            await conn.sendMessage(from, {
              text: `⚠️ *ᴀɴᴛɪᴀᴜᴅɪᴏ ᴅᴇᴛᴇᴄᴛᴀᴅᴏ!*\n\n🚫 áᴜᴅɪᴏ ʀᴇᴍᴏᴠɪᴅᴏ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀᴍᴇɴᴛᴇ.`,
              contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "120363426698503859@newsletter",
                  newsletterName: `${config.botName || 'LukaModzz'}`,
                  serverMessageId: 116
                }
              }
            });
            return;
          }
        }
      }

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

          // LOG DE COMANDO
          if (grupo) {
            const groupName = await getGroupName(conn, from);
            logMensagem('comando', {
              comando: `${cmdName} ${args.join(' ')} (resposta mídia)`,
              isGroup: true,
              grupo: groupName,
              participant: participantAlt,
              remoteJid: remoteJidAlt,
              remetente: remetenteNumero
            });
          } else {
            logMensagem('comando', {
              comando: `${cmdName} ${args.join(' ')} (resposta mídia)`,
              isGroup: false,
              remoteJid: remoteJidAlt,
              remetente: remetenteNumero
            });
          }

          const emManutencao = await verificarManutencao(conn, from, getCanonicalCommandName(cmdName), sender, msg);
          if (emManutencao) return;
          if (commands[cmdName]) {
            await executeCommand({ conn, msg, args, from, axiosInstance, requestedName: cmdName, command: commands[cmdName] });
            return;
          }
        }
      }

      // 🔥 COMANDO NA LEGENDA DA MÍDIA (SOMENTE COM PREFIXO)
      if (hasMediaInMessage && text) {
        const cmdDetection = detectCommand(text, commands);

        if (cmdDetection) {
          const { cmdName, args, hasPrefix } = cmdDetection;

          // LOG DE COMANDO
          if (grupo) {
            const groupName = await getGroupName(conn, from);
            logMensagem('comando', {
              comando: `${cmdName} ${args.join(' ')} (mídia)`,
              isGroup: true,
              grupo: groupName,
              participant: participantAlt,
              remoteJid: remoteJidAlt,
              remetente: remetenteNumero
            });
          } else {
            logMensagem('comando', {
              comando: `${cmdName} ${args.join(' ')} (mídia)`,
              isGroup: false,
              remoteJid: remoteJidAlt,
              remetente: remetenteNumero
            });
          }

          const emManutencao = await verificarManutencao(conn, from, getCanonicalCommandName(cmdName), sender, msg);
          if (emManutencao) return;
          if (commands[cmdName]) {
            await executeCommand({ conn, msg, args, from, axiosInstance, requestedName: cmdName, command: commands[cmdName] });
            return;
          }
        }
      }

      // 🔥 COMANDO EM TEXTO NORMAL (SOMENTE COM PREFIXO)
      if (text && !isMediaCommand) {
        const cmdDetection = detectCommand(text, commands);

        if (cmdDetection) {
          const { cmdName, args, hasPrefix } = cmdDetection;

          // LOG DE COMANDO
          if (grupo) {
            const groupName = await getGroupName(conn, from);
            logMensagem('comando', {
              comando: `${cmdName} ${args.join(' ')}`,
              isGroup: true,
              grupo: groupName,
              participant: participantAlt,
              remoteJid: remoteJidAlt,
              remetente: remetenteNumero
            });
          } else {
            logMensagem('comando', {
              comando: `${cmdName} ${args.join(' ')}`,
              isGroup: false,
              remoteJid: remoteJidAlt,
              remetente: remetenteNumero
            });
          }

          // Executa o comando
          const emManutencao = await verificarManutencao(conn, from, getCanonicalCommandName(cmdName), sender, msg);
          if (emManutencao) return;
          if (commands[cmdName]) {
            await executeCommand({ conn, msg, args, from, axiosInstance, requestedName: cmdName, command: commands[cmdName] });
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

      // ANTI-SPAM
      if (grupo && text && !text.startsWith(config.prefix)) {
        const antispamAtivo = isAntispamAtivo(from);
        if (antispamAtivo) {
          const groupMetadata = await conn.groupMetadata(from);
          const isAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);
          if (!isAdmin) {
            const spamResult = verificarSpam(sender, from, 5, 5);
            if (spamResult.isSpam) {
              await conn.sendMessage(from, { delete: msg.key }).catch(() => {});
              if (spamResult.shouldExpel) {
                try { await conn.groupParticipantsUpdate(from, [sender], "remove"); await conn.sendMessage(from, { text: `⚠️ *ᴜsᴜÁʀɪᴏ ᴇxᴘᴜʟsᴏ ᴘᴏʀ sᴘᴀᴍ!*\n\n@${sender.split('@')[0]} ғᴏɪ ᴇxᴘᴜʟsᴏ ᴅᴏ ɢʀᴜᴘᴏ ᴀᴘós ᴀᴄᴜᴍᴜʟᴀʀ 3 ᴀᴠɪsᴏs ᴅᴇ sᴘᴀᴍ.`, mentions: [sender] }); } catch (err) { await conn.sendMessage(from, { text: `⚠️ *sᴘᴀᴍ ᴅᴇᴛᴇᴄᴛᴀᴅᴏ!*\n\n@${sender.split('@')[0]} ᴠᴏᴄê ᴀᴛɪɴɢɪᴜ 3 ᴀᴠɪsᴏs ᴅᴇ sᴘᴀᴍ, ᴍᴀs ɴãᴏ ғᴏɪ ᴘᴏssíᴠᴇʟ ᴇxᴘᴜʟsᴀʀ.`, mentions: [sender] }); }
              } else if (spamResult.shouldWarn) {
                const tempoRestante = Math.ceil((spamResult.mutedUntil - Date.now()) / 1000);
                await conn.sendMessage(from, { text: `⚠️ *${spamResult.warnings}/3 ᴀᴠɪsᴏs ᴅᴇ sᴘᴀᴍ!*\n\n@${sender.split('@')[0]} ᴠᴏᴄê ᴇɴᴠɪᴏᴜ ${spamResult.count} ᴍᴇɴsᴀɢᴇɴs ᴇᴍ ᴍᴇɴᴏs ᴅᴇ 5 sᴇɢᴜɴᴅᴏs.\n\n🚫 ᴠᴏᴄê ᴇsᴛá ᴍᴜᴛᴀᴅᴏ ᴘᴏʀ ${tempoRestante} sᴇɢᴜɴᴅᴏs.\n\n📌 ᴘʀóxɪᴍᴏ ᴀᴠɪsᴏ = ᴇxᴘᴜʟsÃᴏ!`, mentions: [sender] });
              } else if (spamResult.isMuted) {
                const tempoRestante = Math.ceil((spamResult.mutedUntil - Date.now()) / 1000);
                await conn.sendMessage(from, { text: `⏳ *ᴠᴏᴄÊ ᴇsᴛÁ ᴍᴜᴛᴀᴅᴏ!*\n\n@${sender.split('@')[0]} ᴀɢᴜᴀʀᴅᴇ ${tempoRestante} sᴇɢᴜɴᴅᴏs ᴀɴᴛᴇs ᴅᴇ ᴇɴᴠɪᴀʀ ɴᴏᴠᴀs ᴍᴇɴsᴀɢᴇɴs.\n\n🚫 ᴠᴏᴄê ᴊá ᴛᴇᴍ ${spamResult.warnings} ᴀᴠɪsᴏ(s) ᴅᴇ sᴘᴀᴍ.`, mentions: [sender] });
              }
              return;
            }
          }
        }
      }

      if (autofiguModule) { await autofiguModule.autoHandler(conn, msg, from, sender); }

      // HANDLER DE INTERAÇÕES
      let buttonId = null, buttonText = null;
      if (msg.message.buttonsResponseMessage) { const btn = msg.message.buttonsResponseMessage; buttonId = btn.selectedButtonId || btn.id; buttonText = btn.selectedDisplayText; }
      else if (msg.message.templateButtonReplyMessage) { const btn = msg.message.templateButtonReplyMessage; buttonId = btn.selectedId || btn.id; buttonText = btn.selectedDisplayText; }
      else if (msg.message.listResponseMessage) { const list = msg.message.listResponseMessage.singleSelectReply; buttonId = list?.selectedRowId; buttonText = list?.selectedTitle; }
      else if (msg.message.interactiveResponseMessage) {
        try {
          const interactive = msg.message.interactiveResponseMessage;
          if (interactive.nativeFlowResponseMessage) { const params = JSON.parse(interactive.nativeFlowResponseMessage.paramsJson || '{}'); buttonId = params.id || params.button_id || interactive.nativeFlowResponseMessage.id; buttonText = params.display_text || params.title || interactive.nativeFlowResponseMessage.displayText; }
          else if (interactive.buttonReply) { buttonId = interactive.buttonReply.id; buttonText = interactive.buttonReply.displayText; }
        } catch (e) {}
      }

      if (buttonId) {
        if (buttonId.startsWith(config.prefix)) {
          const parts = buttonId.slice(config.prefix.length).trim().split(/ +/);
          const cmdName = parts[0].toLowerCase();
          const args = parts.slice(1);

          // LOG DE COMANDO (INTERAÇÃO)
          if (grupo) {
            const groupName = await getGroupName(conn, from);
            logMensagem('comando', {
              comando: `${cmdName} ${args.join(' ')} (botão)`,
              isGroup: true,
              grupo: groupName,
              participant: participantAlt,
              remoteJid: remoteJidAlt,
              remetente: remetenteNumero
            });
          } else {
            logMensagem('comando', {
              comando: `${cmdName} ${args.join(' ')} (botão)`,
              isGroup: false,
              remoteJid: remoteJidAlt,
              remetente: remetenteNumero
            });
          }

          const emManutencao = await verificarManutencao(conn, from, getCanonicalCommandName(cmdName), sender, msg);
          if (emManutencao) return;
          if (commands[cmdName]) { await executeCommand({ conn, msg, args, from, axiosInstance, requestedName: cmdName, command: commands[cmdName] }); }
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
                contextInfo: {
                  forwardingScore: 1,
                  isForwarded: true,
                  forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363426698503859@newsletter",
                    newsletterName: config.botName || "LukaModzz",
                    serverMessageId: 116
                  }
                }
              }, {
                quoted: {
                  key: {
                    remoteJid: "status@broadcast",
                    fromMe: false,
                    participant: "13135550002@s.whatsapp.net"
                  },
                  message: {
                    contactMessage: {
                      displayName: groupName,
                      vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + groupName + "\nORG:LukaModzz;\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD"
                    }
                  }
                }
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

