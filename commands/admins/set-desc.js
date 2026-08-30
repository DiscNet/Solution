// commands/set-desc.js
const config = require("../../config/config");

module.exports = {
  name: "set-desc",
  description: "𝑨𝒍𝒕𝒆𝒓𝒂 𝒂 𝒅𝒆𝒔𝒄𝒓𝒊𝒄̧𝒂̃𝒐 𝒅𝒐 𝒈𝒓𝒖𝒑𝒐",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      
      // Verificar se é grupo
      if (!from.endsWith("@g.us")) {
        await conn.sendMessage(from, { 
          text: "❌ *Este comando só pode ser usado em grupos!*" 
        }, { quoted: msg });
        return;
      }

      // Verificar se quem usou é admin
      const groupMetadata = await conn.groupMetadata(from);
      const sender = msg.key.participant || msg.key.remoteJid;
      const isAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);

      if (!isAdmin) {
        await conn.sendMessage(from, { 
          text: "❌ *Apenas administradores podem usar este comando!*" 
        }, { quoted: msg });
        return;
      }

      if (!args[0]) {
        await conn.sendMessage(from, { 
          text: `❌ *Forneça uma nova descrição!*\n\n📌 *Exemplo:* ${prefix}set-desc Esta é a nova descrição do grupo` 
        }, { quoted: msg });
        return;
      }

      const novaDescricao = args.join(" ");
      
      await conn.sendMessage(from, { text: "⏳ *Alterando descrição...*" }, { quoted: msg });

      try {
        await conn.groupUpdateDescription(from, novaDescricao);
        await conn.sendMessage(from, { 
          text: `✅ *Descrição alterada com sucesso!*\n\n📝 *Nova descrição:*\n${novaDescricao}` 
        }, { quoted: msg });
      } catch (err) {
        await conn.sendMessage(from, { 
          text: "❌ *Falha ao alterar descrição!*\n\nVerifique se o bot é administrador do grupo." 
        }, { quoted: msg });
      }

    } catch (error) {
      console.error("Erro no set-desc:", error);
      await conn.sendMessage(from, { 
        text: "❌ *Erro ao alterar descrição!*" 
      }, { quoted: msg });
    }
  }
};