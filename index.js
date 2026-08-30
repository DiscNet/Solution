// index.js
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, Browsers } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// 🔥 CARREGA O CONFIG COM RECARREGAMENTO AUTOMÁTICO
const configLoader = require("./functions/configLoader");
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
// SILENCIAMENTO TOTAL DE LOGS
// ==============================================

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

let botIniciado = false;
let comandosFalhosLog = [];

// ========== LISTA DE PATTERNS PARA IGNORAR ==========
const ignorePatterns = [
  'baileys', 
  'connected to WA', 
  'myPN', 
  'myLID', 
  'session created', 
  '{"level"', 
  'helloMsg', 
  'ephemeral', 
  'class":"baileys', 
  'connection.update', 
  'creds.update', 
  'messages.upsert',
  '@whiskeysockets',
  'Interactive send:',
  'type:',
  'native_flow',
  'nodes:',
  'aimode'
];

function shouldIgnore(str) {
  if (!str) return false;
  for (const pattern of ignorePatterns) {
    if (str.includes(pattern)) return true;
  }
  return false;
}

console.log = function(...args) {
  const str = args.join('');
  
  if (botIniciado) {
    if (shouldIgnore(str)) return;
    originalConsoleLog.apply(console, args);
    return;
  }
  return;
};

console.error = function(...args) {
  const str = args.join('');
  
  if (botIniciado) {
    if (shouldIgnore(str)) return;
    originalConsoleError.apply(console, args);
    return;
  }
  if (str.includes('Erro ao carregar comando') || str.includes('❌')) {
    comandosFalhosLog.push(str);
    return;
  }
  return;
};

// ==============================================
// FUNÇÃO DE LOGGER SILENCIOSO
// ==============================================

function createSilentLogger() {
  return {
    level: 'fatal',
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    log: () => {},
    child: () => createSilentLogger()
  };
}

// ==============================================
// FUNÇÃO DE LOG ORGANIZADA
// ==============================================

function logMensagem(tipo, dados) {
  const agora = new Date();
  const data = agora.toLocaleDateString('pt-BR');
  const hora = agora.toLocaleTimeString('pt-BR');
  
  const separador = `${cores.amarelo}▶${cores.verde}`;
  
  if (tipo === 'mensagem') {
    if (dados.isGroup) {
      console.log(`\n${cores.verde}${separador} ${cores.amarelo}𝙼𝚎𝚗𝚜𝚊𝚐𝚎𝚖${cores.verde} ▶ ${cores.branco}${dados.texto}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙶𝚛𝚞𝚙𝚘${cores.verde} ▶ ${cores.branco}${dados.grupo}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙿𝚊𝚛𝚝𝚒𝚌𝚒𝚙𝚊𝚗𝚝${cores.verde} ▶ ${cores.branco}${dados.participant || dados.remetente}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙹𝚒𝚍${cores.verde} ▶ ${cores.branco}${dados.remoteJid || dados.chatId}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙳𝚊𝚝𝚊${cores.verde} ▶ ${cores.branco}${data}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙷𝚘𝚛𝚊${cores.verde} ▶ ${cores.branco}${hora}${cores.reset}`);
    } else {
      console.log(`\n${cores.verde}${separador} ${cores.amarelo}𝙼𝚎𝚗𝚜𝚊𝚐𝚎𝚖${cores.verde} ▶ ${cores.branco}${dados.texto}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙹𝚒𝚍${cores.verde} ▶ ${cores.branco}${dados.remoteJid || dados.remetente}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙳𝚊𝚝𝚊${cores.verde} ▶ ${cores.branco}${data}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙷𝚘𝚛𝚊${cores.verde} ▶ ${cores.branco}${hora}${cores.reset}`);
    }
  } else if (tipo === 'comando') {
    if (dados.isGroup) {
      console.log(`\n${cores.verde}${separador} ${cores.amarelo}𝙲𝚘𝚖𝚊𝚗𝚍𝚘${cores.verde} ▶ ${cores.branco}${dados.comando}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙶𝚛𝚞𝚙𝚘${cores.verde} ▶ ${cores.branco}${dados.grupo}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙿𝚊𝚛𝚝𝚒𝚌𝚒𝚙𝚊𝚗𝚝${cores.verde} ▶ ${cores.branco}${dados.participant || dados.remetente}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙹𝚒𝚍${cores.verde} ▶ ${cores.branco}${dados.remoteJid || dados.chatId}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙳𝚊𝚝𝚊${cores.verde} ▶ ${cores.branco}${data}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙷𝚘𝚛𝚊${cores.verde} ▶ ${cores.branco}${hora}${cores.reset}`);
    } else {
      console.log(`\n${cores.verde}${separador} ${cores.amarelo}𝙲𝚘𝚖𝚊𝚗𝚍𝚘${cores.verde} ▶ ${cores.branco}${dados.comando}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙹𝚒𝚍${cores.verde} ▶ ${cores.branco}${dados.remoteJid || dados.remetente}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙳𝚊𝚝𝚊${cores.verde} ▶ ${cores.branco}${data}${cores.reset}`);
      console.log(`${cores.verde}${separador} ${cores.amarelo}𝙷𝚘𝚛𝚊${cores.verde} ▶ ${cores.branco}${hora}${cores.reset}`);
    }
  }
}

// ==============================================
// FUNÇÕES AUXILIARES
// ==============================================

function getMessageText(msg) {
  if (msg.message?.conversation) return msg.message.conversation;
  if (msg.message?.extendedTextMessage?.text) return msg.message.extendedTextMessage.text;
  if (msg.message?.imageMessage?.caption) return msg.message.imageMessage.caption;
  if (msg.message?.videoMessage?.caption) return msg.message.videoMessage.caption;
  if (msg.message?.documentMessage?.caption) return msg.message.documentMessage.caption;
  if (msg.message?.audioMessage?.caption) return msg.message.audioMessage.caption;
  return "";
}

function hasMedia(msg) {
  return !!(msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.stickerMessage);
}

function isReplyingToMedia(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) return false;
  return !!(quoted.imageMessage || quoted.videoMessage || quoted.stickerMessage);
}

const comandosQueExigemMedia = ["s", "sticker", "sticker2", "s2", "scirculo", "stickergif", "stickerwm", "stickerbg", "stcrop", "toimg"];

// ==============================================
// DETECÇÃO DE COMANDO - SOMENTE COM PREFIXO
// ==============================================

function detectCommand(text, commandsList) {
  if (!text) return null;
  
  // 🔥 RECARREGA O CONFIG ANTES DE CADA DETECÇÃO (se ativado)
  if (config.recarregarConfig !== false) {
    config = configLoader.carregarConfig();
  }
  
  const prefix = config.prefix || ".";
  
  // 🔥 SOMENTE COM PREFIXO - NUNCA PERMITE SEM PREFIXO
  if (text.startsWith(prefix)) {
    const cmdName = text.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();
    if (commandsList[cmdName]) {
      return { 
        cmdName, 
        args: text.slice(prefix.length).trim().split(/ +/).slice(1), 
        hasPrefix: true 
      };
    }
  }
  
  return null;
}

function commandNeedsMedia(cmdName) { return comandosQueExigemMedia.includes(cmdName); }

// ==============================================
// ALUGUEL
// ==============================================

const aluguel = require("./functions/aluguel");

// ==============================================
// AFK
// ==============================================

const afk = require("./functions/afk");

// ==============================================
// ANTIS
// ==============================================

const ANTILINK_CONFIG_PATH = path.join(__dirname, "config", "antilink.json");
const ANTIDOC_CONFIG_PATH = path.join(__dirname, "config", "antidoc.json");
const ANTIIMAGEM_CONFIG_PATH = path.join(__dirname, "config", "antiimagem.json");
const ANTIVIDEO_CONFIG_PATH = path.join(__dirname, "config", "antivideo.json");
const ANTIAUDIO_CONFIG_PATH = path.join(__dirname, "config", "antiaudio.json");
const BLOCKCMD_CONFIG_PATH = path.join(__dirname, "config", "blockcmd.json");

function loadConfig(caminho) {
  try {
    if (fs.existsSync(caminho)) {
      return JSON.parse(fs.readFileSync(caminho, "utf8"));
    }
  } catch (e) {}
  return {};
}

function isAntiAtivo(grupoId, tipo) {
  const caminhos = {
    link: ANTILINK_CONFIG_PATH,
    documento: ANTIDOC_CONFIG_PATH,
    imagem: ANTIIMAGEM_CONFIG_PATH,
    video: ANTIVIDEO_CONFIG_PATH,
    audio: ANTIAUDIO_CONFIG_PATH
  };
  const data = loadConfig(caminhos[tipo]);
  return data[grupoId] === true;
}

function isCommandBlocked(grupoId, cmdName) {
  const data = loadConfig(BLOCKCMD_CONFIG_PATH);
  if (data[grupoId]) {
    if (data[grupoId].bloquearTodos === true) return true;
    if (data[grupoId].bloqueados && data[grupoId].bloqueados.includes(cmdName)) return true;
  }
  return false;
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

const { isAntispamAtivo, verificarSpam } = require("./functions/antispam");

// ==============================================
// BEM-VINDO
// ==============================================

const bemvindoFunctions = require("./functions/bemvindo");
const isBemvindoAtivo = bemvindoFunctions.isBemvindoAtivo;

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
  const emManutencao = comandosEmManutencao.includes(cmdName);
  if (!emManutencao) return false;
  const isDono = isUserDono(senderJid);
  if (isDono) {
    await conn.sendMessage(from, { text: `⚠️ *ATENÇÃO DONO!*\n\n🔧 O comando "${cmdName}" está em manutenção para usuários comuns, mas você tem permissão para usar.\n\n📌 Continue com o comando normalmente.` }, { quoted: msg });
    return false;
  }
  const motivo = motivosManutencao[cmdName] || motivosManutencao.default;
  const dataAtual = new Date().toLocaleDateString("pt-BR");
  const horaAtual = new Date().toLocaleTimeString("pt-BR");
  const prefix = config.prefix || ".";
  const textoManutencao = `\n╭══════════════════════╮\n     🔧 *𝑬𝑴 𝑴𝑨𝑵𝑼𝑻𝑬𝑵𝑪̧𝑨̃𝑶* 🔧\n╰══════════════════════╯\n━━━━━━━━━━━━━━━━━━━━━━━\n\n⚠️ *Este comando está temporariamente indisponível!*\n\n📌 *Comando:* ${prefix}${cmdName}\n📅 *Data:* ${dataAtual}\n⏰ *Hora:* ${horaAtual}\n\n━━━━━━━━━━━━━━━━━━━━━━━\n🔧 *Motivo:* ${motivo}\n🔄 *Previsão:* ${PREVISAO_MANUTENCAO}\n━━━━━━━━━━━━━━━━━━━━━━━`;
  await sendInteractiveMessage(conn, from, { text: textoManutencao, footer: "Se quiser, pode tentar falar com o Suporte", interactiveButtons: [{ name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📞 𝐒𝐮𝐩𝐨𝐫𝐭𝐞", url: `https://wa.me/${DONO_NUMERO}` }) }] });
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
  await sendButtons(conn, from, { text: errorMessage, footer: "𝖢𝗅𝗂𝗊𝗎𝖾 𝗇𝗈 𝖻𝗈𝗍𝖺̃𝗈 𝖺𝖻𝖺𝗂𝗑𝗈 𝗉𝖺𝗋𝖺 𝗂𝗋 𝖺𝗈 𝗆𝖾𝗇𝗎", buttons: [{ id: `${prefix}menu`, text: "》『🧊』《　"}], contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } } }, { quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } } });
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
  await sendButtons(conn, from, { text: menuText, footer: "ESCOLHA A FORMA DE DOWNLOAD", buttons: botoes });
}

// ==============================================
// CARREGAMENTO DE COMANDOS (SILENCIOSO)
// ==============================================

const commands = {};
let comandosCarregados = 0;
let comandosFalhos = [];

function loadCommandsRecursive(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) { 
      loadCommandsRecursive(fullPath); 
    } else if (item.endsWith(".js")) {
      try { 
        delete require.cache[require.resolve(fullPath)]; 
        const command = require(fullPath); 
        if (command.name) { 
          // 🔥 ALIASES (suporte para múltiplos aliases)
          if (command.aliases && Array.isArray(command.aliases)) {
            for (const alias of command.aliases) {
              if (typeof alias === 'string') {
                commands[alias.toLowerCase()] = command;
              }
            }
          }
          commands[command.name.toLowerCase()] = command; 
          comandosCarregados++;
        } 
      } catch (err) { 
        comandosFalhos.push(`${item}: ${err.message}`);
      }
    }
  }
}

loadCommandsRecursive(path.join(__dirname, "commands"));

// ==============================================
// FUNÇÕES EXTERNAS
// ==============================================

const autoUpgrade = require("./functions/autoupgrade");
const { autoFiguHandler } = require("./functions/autofigu");
const autofiguPath = path.join(__dirname, "commands", "admins", "autofigu.js");
const autofiguModule = fs.existsSync(autofiguPath) ? require(autofiguPath) : null;
const autoresponse = require("./functions/autoresponse");
const axiosInstance = axios.create({ timeout: 10000 });
global.reactMessages = {};
function isGroup(jid) { return jid.endsWith("@g.us"); }

// ==============================================
// FUNÇÕES DE LOG APÓS O BOT INICIAR
// ==============================================

let conn = null;

function exibirLogsPosInicio() {
  console.log(banner);
  console.log(`    ${cores.magenta}🧊 Número: ${cores.amarelo}${conn.user.id.split(":")[0]}${cores.reset}  ${cores.magenta}🧊 Prefixo: ${cores.amarelo}${config.prefix}${cores.reset}  ${cores.magenta}🧊 Comandos: ${cores.amarelo}${Object.keys(commands).length}${cores.reset}`);
  
  if (comandosFalhos.length > 0) {
    console.log(`${cores.vermelho}❌ Comandos com erro:${cores.reset}`);
    for (const erro of comandosFalhos) {
      console.log(`${cores.vermelho}  ⚠️ ${erro}${cores.reset}`);
    }
  }
  console.log(`\n${cores.verde}╔════════════════════════════════════════════════════════════╗${cores.reset}`);
  console.log(`${cores.verde}║${cores.reset}           ${cores.amarelo}${cores.brilho}LOGS DE MENSAGENS E COMANDOS${cores.reset}           ${cores.verde}║${cores.reset}`);
  console.log(`${cores.verde}╚════════════════════════════════════════════════════════════╝${cores.reset}`);
}

// ==============================================
// BOT PRINCIPAL
// ==============================================

let isReconnecting = false;

async function startBot() {
  if (conn) { try { conn.ev.removeAllListeners(); } catch (_) {} conn = null; }

  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
  
  if (!state.creds.registered) {
    console.clear();
    console.log(banner);
    console.log(`${cores.vermelho}❌ Não autenticado!${cores.reset}`);
    console.log(`${cores.amarelo}Execute primeiro: node conect.js 5563992003562${cores.reset}`);
    console.log(`${cores.branco}Depois volte: node index.js${cores.reset}`);
    process.exit(1);
  }

  const { version } = await fetchLatestBaileysVersion();

  conn = makeWASocket({ 
    version, 
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.macOS('Desktop'),
    defaultQueryTimeoutMs: 10000,
    keepAlive: true,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    logger: createSilentLogger()
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

  conn.ev.on("creds.update", saveCreds);

  conn.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {
    if (connection === "open") {
      isReconnecting = false;
      botIniciado = true;
      exibirLogsPosInicio();
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log(`${cores.vermelho}🚫 Sessão expirada! Execute: node conect.js${cores.reset}`);
        process.exit(1);
      }
      if (!isReconnecting) {
        isReconnecting = true;
        console.log(`${cores.amarelo}🔄 Reconectando em 5s...${cores.reset}`);
        setTimeout(startBot, 5000);
      }
    }
  });

  // ==============================================
  // EVENTO DE MENSAGENS
  // ==============================================
  
  conn.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;
    
    // 🔥 RECARREGA O CONFIG A CADA MENSAGEM (se ativado)
    if (config.recarregarConfig !== false) {
      config = configLoader.carregarConfig();
    }
    
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const grupo = isGroup(from);
    
    let text = getMessageText(msg);
    const hasMediaInMessage = hasMedia(msg);
    const isReplyingMedia = isReplyingToMedia(msg);
    const isMediaCommand = hasMediaInMessage || isReplyingMedia;

    try {
      // ========== EXTRAIR DADOS PARA LOG ==========
      const remetenteNumero = sender ? sender.split('@')[0] : 'desconhecido';
      const participantAlt = msg.key.participant ? msg.key.participant.split('@')[0] : null;
      const remoteJidAlt = from ? from.split('@')[0] : null;

      // ========== 🔥 SISTEMA AFK ==========
      // 🔥 VERIFICA SE QUEM ENVIOU A MENSAGEM ESTÁ EM AFK (REMOVE O AFK)
      if (afk.isAfk(sender)) {
        afk.removeAfk(sender);
        await conn.sendMessage(from, {
          text: `👋 @${sender.split('@')[0]} voltou!\n📌 Seu AFK foi removido automaticamente.`,
          mentions: [sender],
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
      }

      // 🔥 VERIFICA SE ALGUÉM FOI MARCADO E ESTÁ EM AFK
      if (text && text.includes('@')) {
        const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (mentionedJid && mentionedJid.length > 0) {
          for (const jid of mentionedJid) {
            if (afk.isAfk(jid)) {
              const dadosAfk = afk.getAfk(jid);
              
              const tempo = Date.now() - dadosAfk.data;
              const minutos = Math.floor(tempo / 60000);
              const segundos = Math.floor((tempo % 60000) / 1000);
              const tempoString = minutos > 0 ? `${minutos}m ${segundos}s` : `${segundos}s`;
              
              await conn.sendMessage(from, {
                text: `* Olá @${sender.split('@')[0]}!* O participante mencionado se encontra ausente no momento\n*🙇‍♀️ Motivo*: ${dadosAfk.motivo}\n⏳ *Tempo:* ${tempoString}`,
                mentions: [sender, jid],
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
              break;
            }
          }
        }
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

      // ========== 🔥 VERIFICAÇÃO DE COMANDOS BLOQUEADOS ==========
      if (grupo && text && text.startsWith(config.prefix)) {
        const cmdName = text.slice(config.prefix.length).trim().split(/ +/)[0].toLowerCase();
        if (isCommandBlocked(from, cmdName)) {
          await conn.sendMessage(from, { delete: msg.key }).catch(() => {});
          await conn.sendMessage(from, {
            text: `🚫 *ᴄᴏᴍᴀɴᴅᴏ ʙʟᴏǫᴜᴇᴀᴅᴏ!*\n\n📌 ᴏ ᴄᴏᴍᴀɴᴅᴏ *${cmdName}* ғᴏɪ ʙʟᴏǫᴜᴇᴀᴅᴏ ɴᴇsᴛᴇ ɢʀᴜᴘᴏ.`,
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

      // ========== 🔥 VERIFICAÇÃO DE CONTEÚDO BLOQUEADO (ANTI) ==========
      if (grupo) {
        // Anti-Link
        if (text && isAntiAtivo(from, 'link') && contemLink(text)) {
          const groupMetadata = await conn.groupMetadata(from);
          const isSenderAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);
          if (!isSenderAdmin) {
            await conn.sendMessage(from, { delete: msg.key }).catch(() => {});
            await conn.sendMessage(from, {
              text: `⚠️ *ᴀɴᴛɪʟɪɴᴋ DETECTADO!*\n\n🚫 ᴍᴇɴsᴀɢᴇᴍ ᴄᴏᴍ ʟɪɴᴋ ʀᴇᴍᴏᴠɪᴅᴀ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀᴍᴇɴᴛᴇ.`,
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
              text: `⚠️ *ᴀɴᴛɪᴅᴏᴄ DETECTADO!*\n\n🚫 ᴅᴏᴄᴜᴍᴇɴᴛᴏ ʀᴇᴍᴏᴠɪᴅᴏ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀᴍᴇɴᴛᴇ.`,
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
              text: `⚠️ *ᴀɴᴛɪɪᴍᴀɢᴇᴍ DETECTADO!*\n\n🚫 ɪᴍᴀɢᴇᴍ ʀᴇᴍᴏᴠɪᴅᴀ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀᴍᴇɴᴛᴇ.`,
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
              text: `⚠️ *ᴀɴᴛɪᴠɪᴅᴇᴏ DETECTADO!*\n\n🚫 ᴠɪ́ᴅᴇᴏ ʀᴇᴍᴏᴠɪᴅᴏ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀᴍᴇɴᴛᴇ.`,
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
              text: `⚠️ *ᴀɴᴛɪᴀᴜᴅɪᴏ DETECTADO!*\n\n🚫 áᴜᴅɪᴏ ʀᴇᴍᴏᴠɪᴅᴏ ᴀᴜᴛᴏᴍᴀᴛɪᴄᴀᴍᴇɴᴛᴇ.`,
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
          
          const emManutencao = await verificarManutencao(conn, from, cmdName, sender, msg);
          if (emManutencao) return;
          if (commands[cmdName]) { 
            await commands[cmdName].execute(conn, msg, args, from, axiosInstance, cmdName); 
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
          
          const emManutencao = await verificarManutencao(conn, from, cmdName, sender, msg);
          if (emManutencao) return;
          if (commands[cmdName]) { 
            await commands[cmdName].execute(conn, msg, args, from, axiosInstance, cmdName); 
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
          
          // 🔥 COMANDO ESPECIAL PARA RECARREGAR CONFIG
          if (cmdName === "reload" || cmdName === "recarregar" || cmdName === "rconfig") {
            const senderJid = sender;
            const isDono = isUserDono(senderJid);
            if (isDono) {
              const novoConfig = recarregarConfigHandler();
              await conn.sendMessage(from, {
                text: `✅ *CONFIG RECARREGADO!*\n\n📌 *Prefixo:* ${novoConfig.prefix}`,
                contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${config.botName || 'LukaModzz'}`, serverMessageId: 116 } }
              }, { quoted: msg });
              return;
            }
          }
          
          // 🔥 VERIFICAÇÃO DE MÍDIA
          const precisaDeMidia = commandNeedsMedia(cmdName);
          
          if (precisaDeMidia) {
            // Verifica se tem mídia na mensagem OU está respondendo a uma mídia
            const temMidia = hasMediaInMessage || isReplyingMedia;
            
            if (!temMidia) {
              await conn.sendMessage(from, { 
                text: `❌ *O comando "${cmdName}" precisa ser usado respondendo a uma imagem ou vídeo!*\n\n📌 *Exemplos:*\n• Envie uma imagem com a legenda ${config.prefix}${cmdName}\n• Responda a uma imagem com ${config.prefix}${cmdName}` 
              }, { quoted: msg });
              return;
            }
          }
          
          // Executa o comando
          const emManutencao = await verificarManutencao(conn, from, cmdName, sender, msg);
          if (emManutencao) return;
          if (commands[cmdName]) { 
            await commands[cmdName].execute(conn, msg, args, from, axiosInstance, cmdName); 
            return; 
          }
        }
        // 🔥 SE COMEÇOU COM PREFIXO MAS NÃO É COMANDO, MOSTRA SUGESTÃO
        if (text.startsWith(config.prefix)) {
          const afterPrefix = text.slice(config.prefix.length).trim();
          const cmdName = afterPrefix.split(/ +/)[0].toLowerCase();
          if (!commands[cmdName]) {
            const listaComandos = Object.keys(commands);
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
                try { await conn.groupParticipantsUpdate(from, [sender], "remove"); await conn.sendMessage(from, { text: `⚠️ *USUÁRIO EXPULSO POR SPAM!*\n\n@${sender.split('@')[0]} foi expulso do grupo após acumular 3 avisos de spam.`, mentions: [sender] }); } catch (err) { await conn.sendMessage(from, { text: `⚠️ *SPAM DETECTADO!*\n\n@${sender.split('@')[0]} você atingiu 3 avisos de spam, mas não foi possível expulsar.`, mentions: [sender] }); }
              } else if (spamResult.shouldWarn) {
                const tempoRestante = Math.ceil((spamResult.mutedUntil - Date.now()) / 1000);
                await conn.sendMessage(from, { text: `⚠️ *${spamResult.warnings}/3 AVISOS DE SPAM!*\n\n@${sender.split('@')[0]} você enviou ${spamResult.count} mensagens em menos de 5 segundos.\n\n🚫 Você está mutado por ${tempoRestante} segundos.\n\n📌 Próximo aviso = EXPULSÃO!`, mentions: [sender] });
              } else if (spamResult.isMuted) {
                const tempoRestante = Math.ceil((spamResult.mutedUntil - Date.now()) / 1000);
                await conn.sendMessage(from, { text: `⏳ *VOCÊ ESTÁ MUTADO!*\n\n@${sender.split('@')[0]} aguarde ${tempoRestante} segundos antes de enviar novas mensagens.\n\n🚫 Você já tem ${spamResult.warnings} aviso(s) de spam.`, mentions: [sender] });
              }
              return;
            }
          }
        }
      }

      await autoFiguHandler(conn, msg);
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
          
          const emManutencao = await verificarManutencao(conn, from, cmdName, sender, msg);
          if (emManutencao) return;
          if (commands[cmdName]) { await commands[cmdName].execute(conn, msg, args, from, axiosInstance, cmdName); }
          else { const listaComandos = Object.keys(commands); const comandoSugerido = encontrarComandoSemelhante(cmdName, listaComandos); const senderNumber = sender.split('@')[0]; await sendCommandNotFoundMessage(conn, from, cmdName, senderNumber, comandoSugerido, msg); }
        } else if (buttonText) { await conn.sendMessage(from, { text: `✅ Você clicou em: ${buttonText}` }); }
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
  });
  
  // EVENTO DE PARTICIPANTES (BEM-VINDO)
  conn.ev.on("group-participants.update", async (update) => {
    try {
      const config = require("./config/config");
      const axios = require("axios");
      const { downloadMediaMessage } = require("@whiskeysockets/baileys");
      
      const tokitoApi = config.tokitoApi;
      const readmore = String.fromCharCode(8206).repeat(4001);
      const { id, participants, action } = update;
      const bemvindoAtivo = isBemvindoAtivo(id);
      
      if (bemvindoAtivo) {
        const groupMetadata = await conn.groupMetadata(id);
        const groupName = groupMetadata.subject;
        const groupDesc = groupMetadata.desc || "Sem descrição";
        const participantCount = groupMetadata.participants.length;
        const prefix = config.prefix || ".";
        
        function getParticipantJid(p) { 
          if (typeof p === 'string') return p; 
          if (p && typeof p === 'object') return p.id || p.jid || p; 
          return p; 
        }
        
        if (action === "add") {
          for (const participant of participants) {
            try {
              const userJid = getParticipantJid(participant);
              const userNumber = userJid ? userJid.split('@')[0] : 'usuário';
              
              async function getAvatarUrl(jid) {
                let url = null;
                try {
                  url = await conn.profilePictureUrl(jid, "image");
                  return url;
                } catch {}
                if (!url) {
                  try {
                    const wa = await conn.onWhatsApp(jid);
                    const realJid = wa?.[0]?.jid;
                    if (realJid) {
                      url = await conn.profilePictureUrl(realJid, "image");
                      return url;
                    }
                  } catch {}
                }
                if (!url) {
                  try {
                    const res = await conn.query({
                      tag: "iq",
                      attrs: {
                        to: jid,
                        type: "get",
                        xmlns: "w:profile:picture"
                      },
                      content: [
                        {
                          tag: "picture",
                          attrs: { type: "image" }
                        }
                      ]
                    });
                    const pic = res?.content?.find(x => x.tag === "picture");
                    url = pic?.attrs?.url || null;
                    return url;
                  } catch (e) {}
                }
                return null;
              }
              
              let avatarUrl = null;
              try {
                avatarUrl = await getAvatarUrl(userJid);
              } catch (e) {}
              if (!avatarUrl) {
                avatarUrl = "https://i.ibb.co/2MWKpM3/avatar-default.png";
              }
              
              const canvasUrl = `https://tokito-apis.com.br/canvas/welcome?fundo=https%3A%2F%2Fraw.githubusercontent.com%2FdylanModz%2Fuploadsgg%2Fmain%2Fmidias%2Fimagens%2F674b8565116.jpg&avatar=${encodeURIComponent(avatarUrl)}&titulo=Seja+Bem+Vindo%21&sub=${encodeURIComponent(groupName)}&apikey=${tokitoApi}`;
              
              let imageBuffer = null;
              try {
                const response = await axios.get(canvasUrl, {
                  responseType: "arraybuffer",
                  timeout: 30000
                });
                imageBuffer = Buffer.from(response.data);
              } catch (e) {}
              
              if (imageBuffer && imageBuffer.length > 100) {
                const mensagemBoasVindas = `*⎾🧊⏌ sᴇᴊᴀ ʙᴇᴍ ᴠɪɴᴅᴏ @${userNumber}!*\n\n • ᴘᴏʀ ғᴀᴠᴏʀ ʟᴇɪᴀ ᴀ ᴅᴇsᴄʀɪᴄ̧ᴀ̃ᴏ\nᴇ sɪɢᴀ ᴀs ʀᴇɢʀᴀs\n\n> 『🧊』ᴀᴘʀᴏᴠᴇɪᴛᴇ!`;
                await conn.sendMessage(id, {
                  image: imageBuffer,
                  caption: mensagemBoasVindas,
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
              } else {
                const mensagemBoasVindas = `*⎾🧊⏌ sᴇᴊᴀ ʙᴇᴍ ᴠɪɴᴅᴏ @${userNumber}!*\n\n • ᴘᴏʀ ғᴀᴠᴏʀ ʟᴇɪᴀ ᴀ ᴅᴇsᴄʀɪᴄ̧ᴀ̃ᴏ\nᴇ sɪɢᴀ ᴀs ʀᴇɢʀᴀs\n\n> 『🧊』ᴀᴘʀᴏᴠᴇɪᴛᴇ!`;
                await conn.sendMessage(id, { 
                  text: mensagemBoasVindas, 
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
              }
            } catch (err) { 
              console.error("Erro ao processar novo membro:", err); 
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

  try { autoUpgrade({ commands }); } catch (err) {}
  return conn;
}

startBot().catch(err => {
  console.log(`${cores.vermelho}❌ Erro fatal, reiniciando...${cores.reset}`);
  setTimeout(startBot, 5000);
});