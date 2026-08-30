// commands/ping.js
const config = require("../../config/config");
const os = require("os");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const UPTIME_FILE = path.join(__dirname, "..", "..", "database", "uptime.json");

function getBotStartTime() {
  try {
    if (fs.existsSync(UPTIME_FILE)) {
      const data = JSON.parse(fs.readFileSync(UPTIME_FILE, "utf8"));
      return data.startTime || Date.now();
    }
  } catch (e) {}
  const startTime = Date.now();
  const dir = path.dirname(UPTIME_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(UPTIME_FILE, JSON.stringify({ startTime }));
  return startTime;
}

const BOT_START_TIME = getBotStartTime();

function getUptime() {
  const uptime = Date.now() - BOT_START_TIME;
  const segundos = Math.floor(uptime / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  
  if (dias > 0) return `${dias}d ${horas % 24}h ${minutos % 60}m`;
  if (horas > 0) return `${horas}h ${minutos % 60}m ${segundos % 60}s`;
  if (minutos > 0) return `${minutos}m ${segundos % 60}s`;
  return `${segundos}s`;
}

function getMemoryUsage() {
  const used = process.memoryUsage();
  return `${Math.round(used.heapUsed / 1024 / 1024)}MB`;
}

function getPlatform() {
  return os.platform() === "android" ? "Termux/Android" : os.platform();
}

module.exports = {
  name: "ping",
  description: "Mostra a latência do bot",
  async execute(conn, msg, args, from) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "LukaModzz";
      const name = config.botName || "LukaModzz BOT";
      const version = config.botVersion || "7.0.0-rc9";
      
      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      const start = Date.now();
      await axios.get("https://api.github.com/zen", { timeout: 5000 }).catch(() => {});
      const pingMs = Date.now() - start;
      
      // 🔥 Pega só os 2 primeiros dígitos
      const pingDisplay = String(pingMs).slice(0, 2);
      
      const uptime = getUptime();
      const memory = getMemoryUsage();
      const platform = getPlatform();
      const dataAtual = new Date().toLocaleDateString("pt-BR");
      const horaAtual = new Date().toLocaleTimeString("pt-BR");

      let statusPing;
      if (pingMs < 300) statusPing = "❀ *Ótimo*";
      else if (pingMs < 800) statusPing = "❀ *Médio*";
      else statusPing = "❀ *Lento*";

      const pingText = `
╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮
├̬⌑ؔ͟ ⎾🪐⏌͟ˉ̵͟͞𝙿𝚒𝚗𝚐: ${pingDisplay}ms ${statusPing}
├̬⌑ؔ͟ ⎾🪐⏌͟ˉ̵͟͞𝚄𝚙𝚝𝚒𝚖𝚎: ${uptime}
├̬⌑ؔ͟ ⎾🪐⏌͟ˉ̵͟͞𝙿𝚕𝚊𝚝𝚊𝚏𝚘𝚛𝚖𝚊: ${platform}
├̬⌑ؔ͟ ⎾🪐⏌͟ˉ̵͟͞𝚁𝙰𝙼: ${memory}
├̬⌑ؔ͟ ⎾🪐⏌͟ˉ̵͟͞𝙱𝚘𝚝: ${name}
├̬⌑ؔ͟ ⎾🪐⏌͟ˉ̵͟͞𝙳𝚎𝚟: ${owner}
├̬⌑ؔ͟ ⎾🪐⏌͟ˉ̵͟͞𝙷𝚘𝚛𝚊: ${horaAtual}
├̬⌑ؔ͟ ⎾🪐⏌͟ˉ̵͟͞𝙳𝚊𝚝𝚊: ${dataAtual}
├̬⌑ؔ͟ ⎾🪐⏌͟ˉ̵͟͞𝙿𝚛𝚎𝚏𝚒𝚡𝚘: ${prefix}
├̬⌑ؔ͟ ⎾🪐⏌͟ˉ̵͟͞𝚅𝚎𝚛𝚜𝚊̃𝚘: ${version}
├̬⌑ؔ͟ ⎾🪐⏌͟ˉ̵͟͞𝚂𝚘𝚕𝚒𝚌𝚒𝚝𝚊𝚍𝚘: ${pushName}
├̬⌑ؔ͟ ⎾🪐⏌͟ˉ̵͟͞𝙲𝚘𝚖𝚊𝚗𝚍𝚘𝚜: ${Object.keys(require.cache).filter(k => k.includes("commands")).length}
╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯

> 🪐 *ᴅɪɢɪᴛᴇ .ᴍᴇɴᴜ ᴘᴀʀᴀ ᴠᴇʀ ᴏs ᴄᴏᴍᴀɴᴅᴏs!*
`;

      await conn.sendMessage(from, {
        text: pingText,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: "LukaModzz",
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
              displayName: pushName,
              vcard: 
                "BEGIN:VCARD\n" +
                "VERSION:3.0\n" +
                `FN:${pushName}\n` +
                `ORG:${owner};\n` +
                "TEL;type=CELL;type=VOICE;waid=13135550002:556384673123\n" +
                "END:VCARD"
            }
          }
        }
      });

      await conn.sendMessage(from, { react: { text: "🪐", key: msg.key } });

    } catch (err) {
      console.error(err);
      await conn.sendMessage(from, {
        text: "❌ *Erro ao calcular ping!*",
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: "LukaModzz",
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
              displayName: pushName,
              vcard: 
                "BEGIN:VCARD\n" +
                "VERSION:3.0\n" +
                `FN:${pushName}\n` +
                `ORG:${owner};\n` +
                "TEL;type=CELL;type=VOICE;waid=13135550002:556384673123\n" +
                "END:VCARD"
            }
          }
        }
      });
    }
  }
};