// commands/deladm.js
const config = require("../../config/config");

module.exports = {
  permissions: { owner: true },
  name: "deladm",
  description: "𝑹𝒆𝒎𝒐𝒗𝒆 𝒐 𝒄𝒂𝒓𝒈𝒐 𝒅𝒆 𝒂𝒅𝒎𝒊𝒏𝒊𝒔𝒕𝒓𝒂𝒅𝒐𝒓 𝒅𝒐 𝒅𝒐𝒏𝒐 𝒅𝒐 𝒃𝒐𝒕",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      // ==============================================
      // 1. VERIFICA SE É GRUPO
      // ==============================================
      if (!from.endsWith("@g.us")) {
        return conn.sendMessage(from, { text: "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ só ғᴜɴᴄɪᴏɴᴀ ᴇᴍ ɢʀᴜᴘᴏs." }, { quoted: msg });
      }

      // ==============================================
      // 2. VERIFICA SE QUEM USOU É O DONO DO BOT
      // ==============================================
      const sender = msg.key.participant || msg.key.remoteJid;
      const ownerLid = config.ownerLid || "67203856621763@lid";

      if (sender !== ownerLid) {
        return conn.sendMessage(from, {
          text: ` ҉ ⃤ ❌ *𝑨𝒄𝒆𝒔𝒔𝒐 𝒏𝒆𝒈𝒂𝒅𝒐!*\n\n👑 *𝑨𝒑𝒆𝒏𝒂𝒔 𝒐 𝒅𝒐𝒏𝒐 𝒅𝒐 𝒃𝒐𝒕 𝒑𝒐𝒅𝒆 𝒖𝒔𝒂𝒓 𝒆𝒔𝒕𝒆 𝒄𝒐𝒎𝒂𝒏𝒅𝒐.*`
        }, { quoted: msg });
      }

      // ==============================================
      // 3. TENTA REBAIXAR O DONO (SEM VERIFICAR)
      // ==============================================
      await conn.groupParticipantsUpdate(from, [sender], "demote");

      // Pega o nome do grupo
      const groupMetadata = await conn.groupMetadata(from);
      const groupName = groupMetadata.subject || "Grupo";

      await conn.sendMessage(from, {
        text: ` ҉ ⃤ ✅ *𝑽𝒐𝒄𝒆̂ 𝒇𝒐𝒊 𝒓𝒆𝒃𝒂𝒊𝒙𝒂𝒅𝒐 𝒂 𝒎𝒆𝒎𝒃𝒓𝒐 𝒄𝒐𝒎𝒖𝒎!*\n\n👑 *𝑮𝒓𝒖𝒑𝒐:* ${groupName}\n🔑 *𝑨𝒈𝒐𝒓𝒂 𝒗𝒐𝒄𝒆̂ 𝒏𝒂̃𝒐 𝒕𝒆𝒎 𝒎𝒂𝒊𝒔 𝒑𝒐𝒅𝒆𝒓𝒆𝒔 𝒅𝒆 𝒂𝒅𝒎𝒊𝒏𝒊𝒔𝒕𝒓𝒂𝒅𝒐𝒓.*`
      }, { quoted: msg });

      await conn.sendMessage(from, { react: { text: "🔻", key: msg.key } });

    } catch (error) {
      console.error("Erro no deladm:", error);

      // ==============================================
      // 4. ERRO - MOSTRA MENSAGEM APROPRIADA
      // ==============================================
      let errorMsg = "❌ ᴇʀʀᴏ ᴀᴏ ʀᴇʙᴀɪxᴀʀ ᴜsᴜáʀɪᴏ.";

      if (error.message?.includes("admin") || error.message?.includes("403")) {
        errorMsg = "❌ O bot precisa ser administrador do grupo para isso.\n\n🔧 *Adicione o bot como admin e tente novamente.*";
      } else if (error.message?.includes("cannot demote")) {
        errorMsg = "⚠️ Não é possível rebaixar o criador do grupo. Apenas o próprio criador pode se rebaixar manualmente.";
      } else if (error.message?.includes("not admin")) {
        errorMsg = "👤 Você não é administrador deste grupo!";
      }

      await conn.sendMessage(from, { text: errorMsg }, { quoted: msg });
      await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
    }
  }
};