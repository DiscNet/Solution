// connect-qr.js
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const NodeCache = require("node-cache");
const qrcode = require("qrcode-terminal");
const fs = require("fs");

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
  const authPath = "./auth_info";
  
  // 🔥 NÃO remove auth antigo se já existir
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
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
    msgRetryCounterCache,
    connectTimeoutMs: 120000, // 2 minutos
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 5000, // 🔥 Keep alive a cada 5s
    printQRInTerminal: false,
    markOnlineOnConnect: true,
    syncFullHistory: false,
  });

  conn.ev.on("creds.update", saveCreds);

  let qrMostrado = false;
  let connectionAttempts = 0;

  conn.ev.on("connection.update", async ({ connection, qr, lastDisconnect }) => {
    console.log(`${cores.ciano}📡 Status: ${connection}${cores.reset}`);

    if (qr && !qrMostrado) {
      qrMostrado = true;
      connectionAttempts++;
      
      // Se já tentou 3 vezes, limpa auth e começa de novo
      if (connectionAttempts > 3) {
        console.log(`${cores.amarelo}🔄 Muitas tentativas. Limpando auth...${cores.reset}`);
        if (fs.existsSync(authPath)) {
          fs.rmSync(authPath, { recursive: true, force: true });
        }
        connectionAttempts = 0;
        qrMostrado = false;
        setTimeout(conectar, 3000);
        return;
      }

      console.clear();
      console.log(banner);
      console.log(`${cores.ciano}📲 ESCANEIE O QR CODE:${cores.reset}`);
      console.log(`${cores.branco}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${cores.reset}`);
      qrcode.generate(qr, { small: true });
      console.log(`${cores.branco}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${cores.reset}`);
      console.log(`${cores.amarelo}💡 Aparelhos conectados > Escanear QR${cores.reset}`);
      console.log(`${cores.branco}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${cores.reset}`);
    }

    if (connection === "open") {
      connectionAttempts = 0;
      console.clear();
      console.log(banner);
      console.log(`${cores.verde}✅ CONECTADO!${cores.reset}`);
      console.log(`${cores.branco}📱 ${conn.user.id.split(":")[0]}${cores.reset}`);
      console.log(`${cores.magenta}🚀 node index.js${cores.reset}`);
      // Não fecha - mantém vivo
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log(`${cores.amarelo}🔌 Fechado (${code || 'N/A'})${cores.reset}`);
      
      if (code === DisconnectReason.loggedOut) {
        console.log(`${cores.vermelho}🚫 Logged out. Limpando auth...${cores.reset}`);
        if (fs.existsSync(authPath)) {
          fs.rmSync(authPath, { recursive: true, force: true });
        }
        qrMostrado = false;
        setTimeout(conectar, 3000);
      } else {
        qrMostrado = false;
        setTimeout(conectar, 5000);
      }
    }
  });
}

conectar().catch(err => {
  console.log(`${cores.vermelho}❌ ${err.message}${cores.reset}`);
  setTimeout(conectar, 5000);
});
