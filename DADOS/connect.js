process.chdir(__dirname);
// conect.js
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require("readline");
const NodeCache = require("node-cache");
const qrcode = require("qrcode-terminal");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
const logger = pino({ level: "silent" });

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

let reconnectTimer = null;
let connecting = false;

async function conectar() {
  if (connecting) return;
  connecting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
    const { version } = await fetchLatestBaileysVersion();
    const msgRetryCounterCache = new NodeCache({ stdTTL: 600, checkperiod: 120, useClones: false });

    const conn = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      logger,
      browser: ["Linux", "Opera", "12.0.22631"],
      generateHighQualityLinkPreview: true,
      msgRetryCounterCache,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      printQRInTerminal: false
    });

    if (!state.creds.registered) {
      console.clear();
      console.log(banner);
      console.log(`${cores.verde}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${cores.reset}`);
      console.log(`${cores.verde}┃${cores.reset} ${cores.magenta}🔗 CONEXÃO POR CÓDIGO 🔗${cores.reset}`);
      console.log(`${cores.verde}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${cores.reset}`);
      console.log(`${cores.ciano}Informe o número do bot com DDI e DDD.${cores.reset}\n`);

      const phoneNumber = await question(`${cores.amarelo}📱 Número: ${cores.reset}`);
      const numeroLimpo = String(phoneNumber || "").replace(/[^0-9]/g, "");
      if (numeroLimpo.length < 10) throw new Error("Número inválido");

      let code = await conn.requestPairingCode(numeroLimpo);
      code = code?.match(/.{1,4}/g)?.join("-") || code;

      console.clear();
      console.log(banner);
      console.log(`${cores.verde}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${cores.reset}`);
      console.log(`${cores.amarelo}🔑 CÓDIGO: ${cores.brilho}${code}${cores.reset}`);
      console.log(`${cores.verde}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${cores.reset}`);
      console.log(`${cores.branco}WhatsApp > Aparelhos conectados > Conectar aparelho${cores.reset}`);
    }

    conn.ev.on("creds.update", saveCreds);
    conn.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
      if (qr) {
        console.clear();
        console.log(banner);
        console.log(`${cores.ciano}📲 QR Code (alternativa):${cores.reset}`);
        qrcode.generate(qr, { small: true });
      }

      if (connection === "open") {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = null;
        console.clear();
        console.log(banner);
        console.log(`${cores.verde}✅ CONECTADO!${cores.reset}`);
        console.log(`${cores.magenta}🚀 Execute: npm start${cores.reset}`);
        rl.close();
        setTimeout(() => process.exit(0), 1000);
      }

      if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          console.log(`${cores.vermelho}🚫 Sessão encerrada.${cores.reset}`);
          rl.close();
          process.exit(1);
        }

        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            conectar().catch(err => console.error("Erro ao reconectar:", err.message));
          }, 5000);
        }
      }
    });
  } finally {
    connecting = false;
  }
}

conectar().catch(err => {
  console.error(`${cores.vermelho}❌ Erro: ${err.message}${cores.reset}`);
  rl.close();
  process.exitCode = 1;
});
