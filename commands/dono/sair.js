// commands/sair.js
const config = require("../../config/config");

module.exports = {
  name: "sair",
  description: "𝑭𝒂𝒛 𝒐 𝒃𝒐𝒕 𝒔𝒂𝒊𝒓 𝒅𝒆 𝒖𝒎 𝒈𝒓𝒖𝒑𝒐 (𝑫𝒐𝒏𝒐)",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      
      const senderJid = msg.key.participant || msg.key.remoteJid;
      const donoLid = config.ownerLid || `${config.ownerNumber}@s.whatsapp.net`;
      
      if (senderJid !== donoLid && !senderJid.includes(config.ownerNumber)) {
        await conn.sendMessage(from, { 
          text: "❌ *Apenas o dono pode usar este comando!*" 
        }, { quoted: msg });
        return;
      }

      if (!args[0]) {
        await conn.sendMessage(from, { 
          text: `❌ *Forneça o LID do grupo!*\n\n📌 *Exemplo:* ${prefix}sair 55123456789` 
        }, { quoted: msg });
        return;
      }

      const grupoLid = args[0].replace(/\D/g, '');
      const groupJid = `${grupoLid}@g.us`;
      
      await conn.sendMessage(from, { text: `⏳ *Tentando sair do grupo ${grupoLid}...*` }, { quoted: msg });

      try {
        await conn.groupLeave(groupJid);
        await conn.sendMessage(from, { 
          text: `✅ *Bot saiu do grupo!*\n\n🆔 LID: ${grupoLid}` 
        }, { quoted: msg });
      } catch (err) {
        await conn.sendMessage(from, { 
          text: `❌ *Não foi possível sair!*\n\nVerifique se o LID está correto.` 
        }, { quoted: msg });
      }

    } catch (error) {
      console.error("Erro no sair:", error);
      await conn.sendMessage(from, { text: "❌ *Erro ao sair do grupo!*" });
    }
  }
};