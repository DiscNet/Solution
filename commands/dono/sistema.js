// commands/sistema.js
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const os = require("os");
const fs = require("fs");
const config = require("../../config/config");

module.exports = {
  permissions: { owner: true },
  name: "sistema",
  description: "𝑴𝒐𝒔𝒕𝒓𝒂 𝒊𝒏𝒇𝒐𝒓𝒎𝒂𝒄̧𝒐̃𝒆𝒔 𝒅𝒆𝒕𝒂𝒍𝒉𝒂𝒅𝒂𝒔 𝒅𝒐 𝒔𝒊𝒔𝒕𝒆𝒎𝒂 (𝒂𝒑𝒆𝒏𝒂𝒔 𝒅𝒐𝒏𝒐)",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      // ==============================================
      // VERIFICA SE É O DONO (USANDO LID)
      // ==============================================
      const sender = msg.key.participant || msg.key.remoteJid;
      const ownerLid = config.ownerLid || "67203856621763@lid"; // LID padrão

      // Verifica se quem enviou é o dono (compara LID)
      if (sender !== ownerLid) {
        await conn.sendMessage(from, {
          text: ` ҉ ⃤ ❌ *𝑨𝒄𝒆𝒔𝒔𝒐 𝒏𝒆𝒈𝒂𝒅𝒐!*\n\n📱 *𝑨𝒑𝒆𝒏𝒂𝒔 𝒐 𝒅𝒐𝒏𝒐 𝒑𝒐𝒅𝒆 𝒖𝒔𝒂𝒓 𝒆𝒔𝒕𝒆 𝒄𝒐𝒎𝒂𝒏𝒅𝒐.*\n\n👤 *𝑫𝒐𝒏𝒐 (𝑳𝑰𝑫):* ${ownerLid.split("@")[0]}\n🔒 *𝑪𝒐𝒎𝒂𝒏𝒅𝒐 𝒓𝒆𝒔𝒕𝒓𝒊𝒕𝒐*`
        }, { quoted: msg });
        return;
      }

      await conn.sendMessage(from, { react: { text: "📊", key: msg.key } });

      const sentMsg = await conn.sendMessage(from, {
        text: ` ҉ ⃤ 📊 *𝑪𝒐𝒍𝒆𝒕𝒂𝒏𝒅𝒐 𝒊𝒏𝒇𝒐𝒓𝒎𝒂𝒄̧𝒐̃𝒆𝒔...*`
      }, { quoted: msg });

      // ==============================================
      // COLETA DE INFORMAÇÕES
      // ==============================================

      // 1. Informações do sistema com Node.js
      const platform = os.platform();
      const arch = os.arch();
      const hostname = os.hostname();
      const cpus = os.cpus();
      const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
      const usedMem = (totalMem - freeMem).toFixed(2);
      const uptime = os.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);

      // CPU Info
      let cpuModel = "Desconhecido";
      let cpuCores = 0;
      if (cpus && cpus.length > 0) {
        cpuModel = cpus[0].model;
        cpuCores = cpus.length;
      }

      // 2. Processo Node.js
      const memoryUsage = process.memoryUsage();
      const nodeHeapUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
      const nodeHeapTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
      const nodeRss = (memoryUsage.rss / 1024 / 1024).toFixed(2);
      const nodeVersion = process.version;
      const nodeUptime = (process.uptime() / 60).toFixed(0);

      // 3. Informações do Termux via comandos
      let bateria = "N/A";
      let wifi = "N/A";
      let armazenamento = "N/A";
      let temperatura = "N/A";
      let dispositivo = "N/A";
      let resolucao = "N/A";

      try {
        const bateriaCmd = await execPromise("termux-battery-status 2>/dev/null || echo '{\"percentage\":0,\"status\":\"DESCONHECIDO\"}'");
        const bateriaData = JSON.parse(bateriaCmd.stdout);
        bateria = `${bateriaData.percentage}% (${bateriaData.status || "Desconhecido"})`;
      } catch (e) {}

      try {
        const wifiCmd = await execPromise("termux-wifi-connectioninfo 2>/dev/null || echo '{\"ssid\":\"N/A\",\"bssid\":\"N/A\"}'");
        const wifiData = JSON.parse(wifiCmd.stdout);
        wifi = wifiData.ssid || "N/A";
      } catch (e) {}

      try {
        const dfCmd = await execPromise("df -h /data 2>/dev/null | tail -1");
        const dfParts = dfCmd.stdout.trim().split(/\s+/);
        if (dfParts.length >= 4) {
          armazenamento = `${dfParts[2]} usado de ${dfParts[1]}`;
        }
      } catch (e) {}

      try {
        const tempCmd = await execPromise("cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo '0'");
        let temp = parseInt(tempCmd.stdout.trim()) / 1000;
        if (temp > 0) {
          temperatura = `${temp.toFixed(1)}°C`;
        }
      } catch (e) {}

      try {
        const deviceCmd = await execPromise("getprop ro.product.model 2>/dev/null || echo 'N/A'");
        dispositivo = deviceCmd.stdout.trim() || "N/A";
      } catch (e) {}

      try {
        const resCmd = await execPromise("wm size 2>/dev/null | grep -o '[0-9]*x[0-9]*' || echo 'N/A'");
        resolucao = resCmd.stdout.trim() || "N/A";
      } catch (e) {}

      // 4. Informações do bot
      const comandosCount = Object.keys(require.cache).filter(m => m.includes("/commands/")).length;

      // Formatar LID do dono
      const ownerDisplay = ownerLid.split("@")[0];

      // ==============================================
      // MONTAR MENSAGEM
      // ==============================================

      const texto = `
 ҉ ⃤ *𝑺𝑰𝑺𝑻𝑬𝑴𝑨 𝑳𝑼𝑲𝑨𝑴𝑶𝑫𝒁* 📊
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖥️ *𝑺𝑶𝑭𝑻𝑾𝑨𝑹𝑬*
├ 🤖 *𝑺𝒊𝒔𝒕𝒆𝒎𝒂:* ${platform} (${arch})
├ 📱 *𝑯𝒐𝒔𝒕:* ${hostname}
├ 🐍 *𝑵𝒐𝒅𝒆:* ${nodeVersion}
└ ⏱️ *𝑼𝒑𝒕𝒊𝒎𝒆:* ${hours}ʜ ${minutes}ᴍ ${seconds}s

⚙️ *𝑯𝑨𝑹𝑫𝑾𝑨𝑹𝑬*
├ 📱 *𝑫𝒊𝒔𝒑𝒐𝒔𝒊𝒕𝒊𝒗𝒐:* ${dispositivo}
├ 📺 *𝑹𝒆𝒔𝒐𝒍𝒖𝒄̧𝒂̃𝒐:* ${resolucao}
├ 💻 *𝑪𝑷𝑼:* ${cpuModel.substring(0, 30)}${cpuModel.length > 30 ? '...' : ''}
├ 🧠 *𝑵𝒖́𝒄𝒍𝒆𝒐𝒔:* ${cpuCores}
├ 💾 *𝑹𝑨𝑴:* ${usedMem}ɢʙ / ${totalMem}ɢʙ (${((usedMem/totalMem)*100).toFixed(1)}%)
├ 🗃️ *𝑫𝒊𝒔𝒄𝒐:* ${armazenamento}
├ 🔋 *𝑩𝒂𝒕𝒆𝒓𝒊𝒂:* ${bateria}
├ 🌡️ *𝑻𝒆𝒎𝒑:* ${temperatura}
└ 📶 *𝑾𝒊-𝑭𝒊:* ${wifi}

🚀 *𝑩𝑶𝑻*
├ 📦 *𝑴𝒆𝒎𝒐́𝒓𝒊𝒂 (𝑹𝑺𝑺):* ${nodeRss}ᴍʙ
├ 📊 *𝑯𝒆𝒂𝒑:* ${nodeHeapUsed}ᴍʙ / ${nodeHeapTotal}ᴍʙ
├ ⏱️ *𝑼𝒑𝒕𝒊𝒎𝒆:* ${nodeUptime} ᴍɪɴ
├ 📋 *𝑪𝒐𝒎𝒂𝒏𝒅𝒐𝒔:* ${comandosCount}
└ 🔧 *𝑷𝒓𝒆𝒇𝒊𝒙𝒐:* ${config.prefix || '.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 *𝑫𝒐𝒏𝒐 (𝑳𝑰𝑫):* ${ownerDisplay}
🔒 *𝑪𝒐𝒎𝒂𝒏𝒅𝒐 𝒓𝒆𝒔𝒕𝒓𝒊𝒕𝒐 𝒂𝒐 𝒅𝒐𝒏𝒐*
✨ *𝑺𝒊𝒔𝒕𝒆𝒎𝒂 𝒐𝒑𝒆𝒓𝒂𝒄𝒊𝒐𝒏𝒂𝒍!*
      `;

      await conn.sendMessage(from, {
        text: texto,
        edit: sentMsg.key
      });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("Erro no comando sistema:", error);

      const ownerLid = config.ownerLid || "67203856621763@lid";
      const sender = msg.key.participant || msg.key.remoteJid;

      if (sender !== ownerLid) {
        return;
      }

      const textoFallback = `
 ҉ ⃤ *𝑺𝑰𝑺𝑻𝑬𝑴𝑨* 📊
━━━━━━━━━━━━━━━━━━━━

🖥️ *𝑷𝒍𝒂𝒕𝒂𝒇𝒐𝒓𝒎𝒂:* ${os.platform()} ${os.arch()}
💾 *𝑹𝑨𝑴:* ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)}ɢʙ
🐍 *𝑵𝒐𝒅𝒆:* ${process.version}
📊 *𝑯𝒆𝒂𝒑:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}ᴍʙ

⚠️ *𝑨𝒍𝒈𝒖𝒎𝒂𝒔 𝒊𝒏𝒇𝒐𝒓𝒎𝒂𝒄̧𝒐̃𝒆𝒔 𝒏𝒂̃𝒐 𝒅𝒊𝒔𝒑𝒐𝒏𝒊́𝒗𝒆𝒊𝒔*
      `;

      await conn.sendMessage(from, {
        text: textoFallback,
        edit: sentMsg.key
      });
      await conn.sendMessage(from, { react: { text: "⚠️", key: msg.key } });
    }
  }
};