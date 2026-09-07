// Menu: Dono - Comandos | Comando: exec
// commands/exec.js
const config = require("../../config/config");
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

// Lista de comandos permitidos (whitelist)
const comandosPermitidos = [
  'ls', 'pwd', 'whoami', 'date', 'uptime', 'df -h', 'free -h',
  'node -v', 'npm -v', 'git --version', 'pkg list-installed'
];

module.exports = {
  permissions: { owner: true },
  name: "exec",
  description: "𝑬𝒙𝒆𝒄𝒖𝒕𝒂 𝒄𝒐𝒎𝒂𝒏𝒅𝒐𝒔 𝒃𝒂́𝒔𝒊𝒄𝒐𝒔 𝒏𝒐 𝑻𝒆𝒓𝒎𝒖𝒙 (𝑫𝒐𝒏𝒐)",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      const prefixAtual = config.prefix;
      const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || "";
      // 🔥 PEGA O QUE O USUÁRIO DIGITOU (COM ALIASES)
      const cm = texto.split(" ")[0].replace(prefixAtual, "").trim();

      // Verificar se é o dono usando ownerLid do config
      const ownerJid = config.ownerLid || config.ownerNumber + "@s.whatsapp.net";
      const senderJid = msg.key.participant || msg.key.remoteJid;

      if (senderJid !== ownerJid && !senderJid.includes(config.ownerNumber)) {
        await conn.sendMessage(from, {
          text: "❌ *ᴀᴘᴇɴᴀs ᴏ ᴅᴏɴᴏ ᴘᴏᴅᴇ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!*"
        }, { quoted: msg });
        return;
      }

      if (!args[0]) {
        await conn.sendMessage(from, {
          text: `📌 *ᴄᴏᴍᴀɴᴅᴏs ᴅɪsᴘᴏɴíᴠᴇɪs:*\n\n${comandosPermitidos.map(cmd => `🔹 ${cmd}`).join('\n')}\n\n📌 *ᴇxᴇᴍᴘʟᴏs:*\n${prefix}${cm} ls\n${prefix}${cm} ls commands\n${prefix}${cm} pwd`
        }, { quoted: msg });
        return;
      }

      const comando = args.join(" ");

      // Verificar se o comando é permitido
      const comandoBase = comando.split(' ')[0];
      if (!comandosPermitidos.some(cmd => cmd === comandoBase || cmd.startsWith(comandoBase))) {
        if (comandoBase !== 'ls') {
          await conn.sendMessage(from, {
            text: `❌ *ᴄᴏᴍᴀɴᴅᴏ ɴãᴏ ᴘᴇʀᴍɪᴛɪᴅᴏ!*\n\n📌 *ᴄᴏᴍᴀɴᴅᴏs ᴘᴇʀᴍɪᴛɪᴅᴏs:*\n${comandosPermitidos.map(cmd => `🔹 ${cmd}`).join('\n')}`
          }, { quoted: msg });
          return;
        }
      }

      await conn.sendMessage(from, { text: "⏳ *ᴇxᴇᴄᴜᴛᴀɴᴅᴏ ᴄᴏᴍᴀɴᴅᴏ...*" }, { quoted: msg });

      // Executar comando
      const { stdout, stderr } = await execPromise(comando, {
        cwd: path.join(__dirname, '..'),
        timeout: 10000,
        maxBuffer: 10 * 1024 * 1024
      });

      let resultado = "";
      if (stdout) resultado = stdout.slice(0, 3800);
      if (stderr) resultado = stderr.slice(0, 3800);

      if (!resultado) resultado = "✅ *Comando executado sem saída!*";

      const mensagem = `
╭══════════════════════╮
     💻 *𝑬𝑿𝑬𝑪 𝑪𝑶𝑴𝑨𝑵𝑫𝑶* 💻
╰══════════════════════╯
━━━━━━━━━━━━━━━━━━━━━━
📟 *ᴄᴏᴍᴀɴᴅᴏ:* ${comando}
📂 *ᴅɪʀᴇᴛóʀɪᴏ:* ${path.join(__dirname, '..')}
━━━━━━━━━━━━━━━━━━━━━━
📤 *sᴀíᴅᴀ:*
${resultado}
━━━━━━━━━━━━━━━━━━━━━━
      `;

      await conn.sendMessage(from, { text: mensagem }, { quoted: msg });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("Erro no exec:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴇxᴇᴄᴜᴛᴀʀ ᴄᴏᴍᴀɴᴅᴏ!*\n\n${error.message.slice(0, 500)}`
      }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "description": "Executa comandos básicos no Termux"
});
