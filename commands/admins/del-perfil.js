// commands/del-perfil.js
const config = require("../../config/config");

module.exports = {
  name: "del-perfil",
  description: "𝑹𝒆𝒎𝒐𝒗𝒆 𝒂 𝒇𝒐𝒕𝒐 𝒅𝒐 𝒈𝒓𝒖𝒑𝒐",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
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

      await conn.sendMessage(from, { text: "⏳ *Removendo foto do grupo...*" }, { quoted: msg });

      try {
        await conn.removeProfilePicture(from);
        await conn.sendMessage(from, { 
          text: `✅ *Foto do grupo removida com sucesso!*` 
        }, { quoted: msg });
      } catch (err) {
        await conn.sendMessage(from, { 
          text: "❌ *Falha ao remover foto!*\n\nVerifique se o bot é administrador do grupo." 
        }, { quoted: msg });
      }

    } catch (error) {
      console.error("Erro no del-perfil:", error);
      await conn.sendMessage(from, { 
        text: "❌ *Erro ao remover foto!*" 
      }, { quoted: msg });
    }
  }
};