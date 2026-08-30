// conect.js
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require("readline");
const NodeCache = require("node-cache");
const qrcode = require("qrcode-terminal");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

const cores = {
  reset: "\x1b[0m", brilho: "\x1b[1m", verde: "\x1b[32m", amarelo: "\x1b[33m",
  ciano: "\x1b[36m", vermelho: "\x1b[31m", branco: "\x1b[37m", magenta: "\x1b[35m"
};

const banner = `
        ██╗     ██╗   ██╗██╗  ██╗ █████╗ 
        ██║     ██║   ██║██║ ██╔╝██╔══██╗
        ██║     ██║   ██║█████╔╝ ███████║
        ██║     ██║   ██║██╔═██╗ ██╔══██║
        ███████╗╚██████╔╝██║  ██╗██║  ██║
        ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
`;

async function conectar() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
  const { version } = await fetchLatestBaileysVersion();
  const msgRetryCounterCache = new NodeCache();

  const conn = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    logger: pino({ level: 'silent' }),
    browser: ['Linux', 'Opera', '12.0.22631'],
    generateHighQualityLinkPreview: true,
    msgRetryCounterCache,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 30000,
    keepAliveIntervalMs: 10000,
    printQRInTerminal: false,
  });

  // 🔥 PAIRING CODE
  if (!conn.authState.creds.registered) {
    console.clear();
    console.log(banner);
    console.log(`${cores.verde}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${cores.reset}`);
    console.log(`${cores.verde}┃${cores.reset} ${cores.magenta}🔗 CONEXÃO POR CÓDIGO 🔗${cores.reset}`);
    console.log(`${cores.verde}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${cores.reset}`);
    console.log(`${cores.ciano}Informe o número do bot (ex: 55 XX XXXXX-XXXX)${cores.reset}\n`);
    
    const phoneNumber = await question(`${cores.amarelo}📱 Número: ${cores.reset}`);
    
    if (!phoneNumber) {
      console.log(`${cores.vermelho}🚫 Número inválido!${cores.reset}`);
      process.exit(1);
    }
    
    const numeroLimpo = phoneNumber.replace(/[^0-9]/g, '');
    
    try {
      let code = await conn.requestPairingCode(numeroLimpo);
      code = code?.match(/.{1,4}/g)?.join("-") || code;
      
      console.clear();
      console.log(banner);
      console.log(`${cores.verde}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${cores.reset}`);
      console.log(`${cores.amarelo}🔑 CÓDIGO: ${cores.brilho}${code}${cores.reset}`);
      console.log(`${cores.verde}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${cores.reset}`);
      console.log(`${cores.branco}1. WhatsApp > Aparelhos conectados${cores.reset}`);
      console.log(`${cores.branco}2. Conectar um aparelho${cores.reset}`);
      console.log(`${cores.branco}3. Digite o código acima${cores.reset}`);
      console.log(`${cores.verde}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${cores.reset}`);
    } catch (err) {
      console.log(`${cores.vermelho}❌ Erro: ${err.message}${cores.reset}`);
      process.exit(1);
    }
  }

  conn.ev.on("creds.update", saveCreds);

  conn.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      console.clear();
      console.log(banner);
      console.log(`${cores.ciano}📲 QR Code (alternativa):${cores.reset}`);
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.clear();
      console.log(banner);
      console.log(`${cores.verde}✅ CONECTADO!${cores.reset}`);
      console.log(`${cores.branco}📱 Número: ${cores.amarelo}${conn.user.id.split(":")[0]}${cores.reset}`);
      console.log(`${cores.magenta}🚀 Execute: node index.js${cores.reset}`);
      setTimeout(() => process.exit(0), 2000);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log(`${cores.vermelho}🚫 Sessão encerrada.${cores.reset}`);
        process.exit(1);
      } else {
        console.log(`${cores.amarelo}🔄 Reconectando...${cores.reset}`);
        setTimeout(conectar, 5000);
      }
    }
  });
}

conectar().catch(err => {
  console.log(`${cores.vermelho}❌ Erro: ${err.message}${cores.reset}`);
  setTimeout(conectar, 5000);
});
