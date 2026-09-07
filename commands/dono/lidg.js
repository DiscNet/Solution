// Menu: Dono - Grupos | Comando: lidg
// commands/lidg.js
const config = require("../../config/config");
const { sendInteractiveMessage } = require("gifted-btns");

module.exports = {
  permissions: { owner: true },
  name: "lidg",
  description: "𝑶𝒃𝒕𝒆𝒎 𝒐 𝑳𝑰𝑫 𝒅𝒆 𝒖𝒎 𝒈𝒓𝒖𝒑𝒐 𝒑𝒆𝒍𝒐 𝒏ú𝒎𝒆𝒓𝒐 𝒏𝒂 𝒍𝒊𝒔𝒕𝒂",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";

      // Verificar se é o dono
      const senderJid = msg.key.participant || msg.key.remoteJid;
      const donoLid = config.ownerLid || `${config.ownerNumber}@s.whatsapp.net`;

      if (senderJid !== donoLid && !senderJid.includes(config.ownerNumber)) {
        await conn.sendMessage(from, {
          text: "❌ *ᴀᴘᴇɴᴀs ᴏ ᴅᴏɴᴏ ᴘᴏᴅᴇ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!*"
        }, { quoted: msg });
        return;
      }

      if (!args[0]) {
        await conn.sendMessage(from, {
          text: `❌ *ғᴏʀɴᴇçᴀ ᴏ ɴúᴍᴇʀᴏ ᴅᴏ ɢʀᴜᴘᴏ ɴᴀ ʟɪsᴛᴀ!*\n\n📌 *ᴇxᴇᴍᴘʟᴏ:* ${prefix}lidg 1\n\n📌 *ᴜsᴇ ${prefix}listg para ver a lista.*`
        }, { quoted: msg });
        return;
      }

      const numero = parseInt(args[0]);

      if (isNaN(numero) || numero < 1) {
        await conn.sendMessage(from, {
          text: "❌ *ɴúᴍᴇʀᴏ ɪɴᴠáʟɪᴅᴏ!* ᴅɪɢɪᴛᴇ ᴜᴍ ɴúᴍᴇʀᴏ ᴘᴏsɪᴛɪᴠᴏ."
        }, { quoted: msg });
        return;
      }

      await conn.sendMessage(from, { text: "⏳ *ʙᴜsᴄᴀɴᴅᴏ ɢʀᴜᴘᴏ...*" }, { quoted: msg });

      // Buscar todos os grupos
      const groups = await conn.groupFetchAllParticipating();
      const groupList = Object.values(groups);

      if (groupList.length === 0) {
        await conn.sendMessage(from, {
          text: "❌ *ᴏ ʙᴏᴛ ɴãᴏ ᴇsᴛá ᴇᴍ ɴᴇɴʜᴜᴍ ɢʀᴜᴘᴏ!*"
        }, { quoted: msg });
        return;
      }

      if (numero > groupList.length) {
        await conn.sendMessage(from, {
          text: `❌ *ɢʀᴜᴘᴏ ɴãᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ!*\n\n📊 *ᴛᴏᴛᴀʟ ᴅᴇ ɢʀᴜᴘᴏs:* ${groupList.length}\n📌 *ᴅɪɢɪᴛᴇ ᴜᴍ ɴúᴍᴇʀᴏ ᴇɴᴛʀᴇ 1 ᴇ ${groupList.length}.*`
        }, { quoted: msg });
        return;
      }

      const grupo = groupList[numero - 1];
      const groupId = grupo.id;
      const groupName = grupo.subject || "Sem nome";
      const groupLid = groupId.split('@')[0];
      const memberCount = grupo.participants ? grupo.participants.length : 0;

      const dataAtual = new Date().toLocaleDateString("pt-BR");
      const horaAtual = new Date().toLocaleTimeString("pt-BR");

      const texto = `
╭════════════════════════╮
     🔍 *𝑳𝑰𝑫 𝑫𝑶 𝑮𝑹𝑼𝑷𝑶* 🔍
╰════════════════════════╯
━━━━━━━━━━━━━━━━━━━━━━━━

📛 *ɴᴏᴍᴇ:* ${groupName}
🆔 *ʟɪᴅ:* \`${groupLid}\`
👥 *ᴍᴇᴍʙʀᴏs:* ${memberCount}
📅 *ᴅᴀᴛᴀ:* ${dataAtual}
⏰ *ʜᴏʀᴀ:* ${horaAtual}

━━━━━━━━━━━━━━━━━━━━━━
📌 *ᴄᴏᴍᴀɴᴅᴏs úᴛᴇɪs:*
${prefix}sair ${groupLid}
━━━━━━━━━━━━━━━━━━━━━━
      `;

      // Enviar mensagem com botão de cópia usando sendInteractiveMessage
      await sendInteractiveMessage(conn, from, {
        text: texto,
        footer: "ᴄʟɪǫᴜᴇ ɴᴏ ʙᴏᴛãᴏ ᴀʙᴀɪxᴏ ᴘᴀʀᴀ ᴄᴏᴘɪᴀʀ ᴏ ʟɪᴅ",
        interactiveButtons: [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 ᴄᴏᴘɪᴀʀ ʟɪᴅ",
              copy_code: groupLid
            })
          },
        ]
      });

      await conn.sendMessage(from, { react: { text: "📋", key: msg.key } });

    } catch (error) {
      console.error("Erro no lidg:", error);
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ʙᴜsᴄᴀʀ ʟɪᴅ!* ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ."
      }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Dono",
  "menuSection": "Grupos",
  "usage": "lidg número do grupo",
  "description": "Uso: .lidg número do grupo"
});
