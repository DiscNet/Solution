// commands/seradm.js
const config = require("../../config/config");

module.exports = {
  name: "seradm",
  description: "𝑫𝒐𝒏𝒐 𝒅𝒐 𝒃𝒐𝒕 𝒔𝒆 𝒕𝒐𝒓𝒏𝒂 𝒂𝒅𝒎𝒊𝒏𝒊𝒔𝒕𝒓𝒂𝒅𝒐𝒓 𝒏𝒐 𝒈𝒓𝒖𝒑𝒐",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      // ==============================================
      // 1. VERIFICA SE É GRUPO
      // ==============================================
      if (!from.endsWith("@g.us")) {
        return conn.sendMessage(from, { text: "❌ Este comando só funciona em grupos." }, { quoted: msg });
      }

      // ==============================================
      // 2. VERIFICA SE QUEM USOU É O DONO DO BOT
      // ==============================================
      const sender = msg.key.participant || msg.key.remoteJid;
      const ownerLid = config.ownerLid || "67203856621763@lid";
      const owner = config.ownerName;
      
      if (sender !== ownerLid) {
        return conn.sendMessage(from, { 
          text: ` ҉ ⃤ ❌ *𝑨𝒄𝒆𝒔𝒔𝒐 𝒏𝒆𝒈𝒂𝒅𝒐!*\n\n👑 *𝑨𝒑𝒆𝒏𝒂𝒔 𝒐 𝒅𝒐𝒏𝒐 𝒅𝒐 𝒃𝒐𝒕 𝒑𝒐𝒅𝒆 𝒖𝒔𝒂𝒓 𝒆𝒔𝒕𝒆 𝒄𝒐𝒎𝒂𝒏𝒅𝒐.*` 
        }, { quoted: msg });
      }

      // ==============================================
      // 3. TENTA PROMOVER O DONO (SEM VERIFICAR)
      // ==============================================
      await conn.groupParticipantsUpdate(from, [sender], "promote");
      
      // Pega o nome do grupo
      const groupMetadata = await conn.groupMetadata(from);
      const groupName = groupMetadata.subject || "Grupo";
      
      await conn.sendMessage(from, { 
        text: `*⎾🪐⏌ ᴅᴏɴᴏ ${owner}*
> 🎭 | ᴀᴄ̧ᴀ̃ᴏ: ᴘʀᴏᴍᴏᴠɪᴅᴏ ᴀ _*ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ*_` 
      }, { quoted: msg });
      
      await conn.sendMessage(from, { react: { text: "👑", key: msg.key } });

    } catch (error) {
      console.error("Erro no seradm:", error);
      
      // ==============================================
      // 4. ERRO - MOSTRA MENSAGEM APROPRIADA
      // ==============================================
      let errorMsg = "❌ Erro ao promover usuário.";
      
      if (error.message?.includes("admin") || error.message?.includes("403")) {
        errorMsg = "❌ O bot precisa ser administrador do grupo para isso.\n\n🔧 *Adicione o bot como admin e tente novamente.*";
      } else if (error.message?.includes("already")) {
        errorMsg = "👑 Você já é administrador deste grupo!";
      }
      
      await conn.sendMessage(from, { text: errorMsg }, { quoted: msg });
      await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
    }
  }
};