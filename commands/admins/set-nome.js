// commands/set-nome.js
const config = require("../../config/config");

module.exports = {
  name: "set-nome",
  description: "𝑨𝒍𝒕𝒆𝒓𝒂 𝒐 𝒏𝒐𝒎𝒆 𝒅𝒐 𝒈𝒓𝒖𝒑𝒐",
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
          text: `❌ *Forneça um novo nome!*\n\n📌 *Exemplo:* ${prefix}set-nome Novo Nome do Grupo` 
        }, { quoted: msg });
        return;
      }

      const novoNome = args.join(" ");
      
      await conn.sendMessage(from, { text: "⏳ *Alterando nome...*" }, { quoted: msg });

      try {
        await conn.groupUpdateSubject(from, novoNome);
        await conn.sendMessage(from, { 
          text: `✅ *Nome alterado com sucesso!*\n\n📛 *Novo nome:* ${novoNome}` 
        }, { quoted: msg });
      } catch (err) {
        await conn.sendMessage(from, { 
          text: "❌ *Falha ao alterar nome!*\n\nVerifique se o bot é administrador do grupo." 
        }, { quoted: msg });
      }

    } catch (error) {
      console.error("Erro no set-nome:", error);
      await conn.sendMessage(from, { 
        text: "❌ *Erro ao alterar nome!*" 
      }, { quoted: msg });
    }
  }
};