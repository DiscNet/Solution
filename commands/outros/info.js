// commands/info.js
const config = require("../config/config");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "info",
  description: "𝑴𝒐𝒔𝒕𝒓𝒂 𝒂 𝒅𝒆𝒔𝒄𝒓𝒊𝒄̧𝒂̃𝒐 𝒅𝒆 𝒖𝒎 𝒄𝒐𝒎𝒂𝒏𝒅𝒐 𝒆𝒔𝒑𝒆𝒄𝒊́𝒇𝒊𝒄𝒐",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      
      if (!args[0]) {
        await conn.sendMessage(from, { 
          text: `❌ *Por favor, informe um comando!*\n\n📌 *Exemplo:* ${prefix}info menu` 
        }, { quoted: msg });
        return;
      }
      
      const cmdNome = args[0].toLowerCase();
      
      // Carregar o comando específico
      let cmd = null;
      try {
        const cmdPath = path.join(__dirname, `${cmdNome}.js`);
        if (fs.existsSync(cmdPath)) {
          cmd = require(cmdPath);
        }
      } catch (err) {}
      
      if (!cmd || !cmd.name) {
        await conn.sendMessage(from, { 
          text: `❌ *Comando "${cmdNome}" não encontrado!*` 
        }, { quoted: msg });
        return;
      }
      
      const texto = `
╭══════════════════════════════╮
     📖 *𝑰𝑵𝑭𝑶𝑹𝑴𝑨𝑪̧𝑶̃𝑬𝑺 𝑫𝑶 𝑪𝑶𝑴𝑨𝑵𝑫𝑶* 📖
╰══════════════════════════════╯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 *Comando:* ${prefix}${cmd.name}
📝 *Descrição:* ${cmd.description || "Sem descrição"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 *Digite ${prefix}${cmd.name} para executar*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `;
      
      await conn.sendMessage(from, { text: texto }, { quoted: msg });
      await conn.sendMessage(from, { react: { text: "📖", key: msg.key } });

    } catch (error) {
      console.error("Erro no info:", error);
      await conn.sendMessage(from, { 
        text: "❌ *Erro ao buscar informações do comando!*" 
      }, { quoted: msg });
    }
  }
};