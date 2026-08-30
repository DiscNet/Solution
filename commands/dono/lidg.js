// commands/lidg.js
const config = require("../../config/config");
const { sendInteractiveMessage } = require("gifted-btns");

module.exports = {
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
          text: "❌ *Apenas o dono pode usar este comando!*" 
        }, { quoted: msg });
        return;
      }

      if (!args[0]) {
        await conn.sendMessage(from, { 
          text: `❌ *Forneça o número do grupo na lista!*\n\n📌 *Exemplo:* ${prefix}lidg 1\n\n📌 *Use ${prefix}listg para ver a lista.*` 
        }, { quoted: msg });
        return;
      }

      const numero = parseInt(args[0]);
      
      if (isNaN(numero) || numero < 1) {
        await conn.sendMessage(from, { 
          text: "❌ *Número inválido!* Digite um número positivo." 
        }, { quoted: msg });
        return;
      }

      await conn.sendMessage(from, { text: "⏳ *Buscando grupo...*" }, { quoted: msg });

      // Buscar todos os grupos
      const groups = await conn.groupFetchAllParticipating();
      const groupList = Object.values(groups);
      
      if (groupList.length === 0) {
        await conn.sendMessage(from, { 
          text: "❌ *O bot não está em nenhum grupo!*" 
        }, { quoted: msg });
        return;
      }

      if (numero > groupList.length) {
        await conn.sendMessage(from, { 
          text: `❌ *Grupo não encontrado!*\n\n📊 *Total de grupos:* ${groupList.length}\n📌 *Digite um número entre 1 e ${groupList.length}.*` 
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

📛 *Nome:* ${groupName}
🆔 *LID:* \`${groupLid}\`
👥 *Membros:* ${memberCount}
📅 *Data:* ${dataAtual}
⏰ *Hora:* ${horaAtual}

━━━━━━━━━━━━━━━━━━━━━━
📌 *Comandos úteis:*
${prefix}sair ${groupLid}
${prefix}aviso ${groupLid} mensagem
${prefix}addme ${groupLid}
━━━━━━━━━━━━━━━━━━━━━━
      `;

      // Enviar mensagem com botão de cópia usando sendInteractiveMessage
      await sendInteractiveMessage(conn, from, {
        text: texto,
        footer: "Clique no botão abaixo para copiar o LID",
        interactiveButtons: [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 COPIAR LID",
              copy_code: groupLid
            })
          },
        ]
      });

      await conn.sendMessage(from, { react: { text: "📋", key: msg.key } });

    } catch (error) {
      console.error("Erro no lidg:", error);
      await conn.sendMessage(from, { 
        text: "❌ *Erro ao buscar LID!* Tente novamente." 
      }, { quoted: msg });
    }
  }
};