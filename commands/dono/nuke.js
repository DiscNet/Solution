// Menu: Dono - Grupos | Comando: nuke
// commands/nuke.js
const config = require("../../config/config");

module.exports = {
  permissions: { owner: true },
  name: "nuke",
  description: "💥 ᴅᴇsᴛʀóɪ ᴏ ɢʀᴜᴘᴏ (ᴛʀᴏᴄᴀ ɴᴏᴍᴇ, ᴅᴇsᴄʀɪçãᴏ, ɪᴍᴀɢᴇᴍ ᴇ ʀᴇᴍᴏᴠᴇ ᴛᴏᴅᴏs)",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      // ========== VERIFICAÇÕES ==========
      const sender = msg.key.participant || msg.key.remoteJid;
      const isGroup = from.endsWith("@g.us");

      if (!isGroup) {
        return conn.sendMessage(from, { text: "❌ *ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ só ғᴜɴᴄɪᴏɴᴀ ᴇᴍ ɢʀᴜᴘᴏs!*" });
      }

      // Verificar se é o dono do bot (usando ownerLid)
      const DONO_LID = config.ownerLid || null;

      if (!DONO_LID) {
        return conn.sendMessage(from, {
          text: `❌ *ᴏᴡɴᴇʀʟɪᴅ ɴãᴏ ᴄᴏɴғɪɢᴜʀᴀᴅᴏ!*\n\n⚠️ ᴄᴏɴғɪɢᴜʀᴇ ᴏ ᴏᴡɴᴇʀʟɪᴅ ɴᴏ ᴀʀǫᴜɪᴠᴏ ᴄᴏɴғɪɢ/config.js`
        });
      }

      // Comparar o sender com o ownerLid (removendo @s.whatsapp.net se necessário)
      const senderLid = sender.includes('@lid') ? sender : sender.split('@')[0] + '@lid';

      if (sender !== DONO_LID && senderLid !== DONO_LID) {
        // Tentar comparar apenas o número
        const senderNumber = sender.split('@')[0];
        const donoNumber = DONO_LID.split('@')[0];

        if (senderNumber !== donoNumber) {
          return conn.sendMessage(from, {
            text: `❌ *ᴀᴘᴇɴᴀs ᴏ ᴅᴏɴᴏ ᴅᴏ ʙᴏᴛ ᴘᴏᴅᴇ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!*\n\n⚠️ sᴇᴜ ɪᴅ: ${sender}\n👑 ᴅᴏɴᴏ ʟɪᴅ: ${DONO_LID}`
          });
        }
      }

      // ========== EXECUTAR NUKE DIRETO (SEM CONFIRMAÇÃO) ==========

      // 1. PEGAR METADADOS DO GRUPO
      const groupMetadata = await conn.groupMetadata(from);
      const participants = groupMetadata.participants;

      // 2. TROCAR NOME E DESCRIÇÃO (RÁPIDO)
      await conn.groupUpdateSubject(from, "Burocracia");
      await conn.groupUpdateDescription(from, "");

      // 3. REMOVER IMAGEM (SE TIVER)
      try {
        await conn.updateProfilePicture(from, null);
      } catch (e) {}

      // 4. REMOVER TODOS OS MEMBROS (RÁPIDO)
      const participantIds = participants.map(p => p.id);

      // Filtrar para não remover o bot e o dono
      const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net';

      const toRemove = participantIds.filter(id =>
        id !== botId &&
        id !== DONO_LID &&
        id !== sender
      );

      // Remover em lote (máximo 500 por vez)
      const batchSize = 500;
      let removidos = 0;

      for (let i = 0; i < toRemove.length; i += batchSize) {
        const batch = toRemove.slice(i, i + batchSize);
        try {
          await conn.groupParticipantsUpdate(from, batch, "remove");
          removidos += batch.length;
        } catch (e) {
          console.error("Erro ao remover lote:", e);
        }
      }

      // 5. MENSAGEM FINAL
      await conn.sendMessage(from, {
        text: `ᴛᴇʀᴍᴏɴᴜᴄʟᴇᴀʀ`
      });

    } catch (error) {
      console.error("Erro no nuke:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴇxᴇᴄᴜᴛᴀʀ ɴᴜᴋᴇ:*\n\n${error.message || "Erro desconhecido"}`
      });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Dono",
  "menuSection": "Grupos",
  "description": "💥 destrói o grupo (troca nome, descrição, imagem e remove todos)"
});
