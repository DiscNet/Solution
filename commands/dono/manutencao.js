// commands/manutencao.js
const config = require("../../config/config");
const { sendInteractiveMessage } = require("baileys_helper");

// Lista de comandos em manutenção
const comandosEmManutencao = [
  "alugar-bot",
  "alugarbot",
  "alugar",
  "comprar",
  "premium",
  "vip"
];

// Número do dono para suporte
const DONO_NUMERO = "556384673123";

module.exports = {
  permissions: { owner: true },
  name: "manutencao",
  description: "𝑽𝒆𝒓𝒊𝒇𝒊𝒄𝒂 𝒔𝒆 𝒖𝒎 𝒄𝒐𝒎𝒂𝒏𝒅𝒐 𝒆𝒔𝒕𝒂́ 𝒆𝒎 𝒎𝒂𝒏𝒖𝒕𝒆𝒏𝒄̧𝒂̃𝒐",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      const senderJid = msg.key.participant || msg.key.remoteJid;
      const senderNumber = senderJid.split('@')[0];

      // Verificar se é o dono
      const isDono = senderNumber === DONO_NUMERO;

      // Se não tiver argumentos, mostra lista de comandos em manutenção
      if (!args[0]) {
        const listaComandos = comandosEmManutencao.map(cmd => `🔧 ${prefix}${cmd}`).join('\n');

        const texto = `
╭══════════════════════════════╮
     🔧 *𝑪𝑶𝑴𝑨𝑵𝑫𝑶𝑺 𝑬𝑴 𝑴𝑨𝑵𝑼𝑻𝑬𝑵𝑪̧𝑨̃𝑶* 🔧
╰══════════════════════════════╯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 *ᴄᴏᴍᴀɴᴅᴏs ɪɴᴅɪsᴘᴏɴíᴠᴇɪs:*

${listaComandos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 *ᴄᴏɴᴛᴀᴛᴇ ᴏ sᴜᴘᴏʀᴛᴇ ᴘᴀʀᴀ ᴍᴀɪs ɪɴғᴏʀᴍᴀçõᴇs*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;

        await conn.sendMessage(from, { text: texto }, { quoted: msg });
        return;
      }

      const comando = args[0].toLowerCase();
      const comandoCompleto = args.join(" ");

      // Verificar se o comando está em manutenção
      const emManutencao = comandosEmManutencao.some(cmd =>
        comando === cmd || comandoCompleto.includes(cmd)
      );

      // Se for o dono, libera o comando
      if (isDono) {
        await conn.sendMessage(from, {
          text: `✅ *ᴅᴏɴᴏ ᴅᴇᴛᴇᴄᴛᴀᴅᴏ!*\n\n🔧 ᴏ ᴄᴏᴍᴀɴᴅᴏ "${comandoCompleto}" ᴇsᴛá ᴇᴍ ᴍᴀɴᴜᴛᴇɴçãᴏ, ᴍᴀs ᴠᴏᴄê ᴛᴇᴍ ᴘᴇʀᴍɪssãᴏ ᴘᴀʀᴀ ᴜsᴀʀ.\n\n⚠️ ʟᴇᴍʙʀᴇ-sᴇ ᴅᴇ ʀᴇᴀᴛɪᴠᴀʀ ǫᴜᴀɴᴅᴏ ᴛᴇʀᴍɪɴᴀʀ!`
        }, { quoted: msg });
        return;
      }

      // Se não estiver em manutenção, avisa que está disponível
      if (!emManutencao) {
        await conn.sendMessage(from, {
          text: `✅ *ᴄᴏᴍᴀɴᴅᴏ ᴅɪsᴘᴏɴíᴠᴇʟ!*\n\n🔧 ᴏ ᴄᴏᴍᴀɴᴅᴏ "${comandoCompleto}" ᴇsᴛá ғᴜɴᴄɪᴏɴᴀɴᴅᴏ ɴᴏʀᴍᴀʟᴍᴇɴᴛᴇ.\n\n📌 ᴜsᴇ ${prefix}${comandoCompleto} para executar.`
        }, { quoted: msg });
        return;
      }

      // ==============================================
      // MENSAGEM DE MANUTENÇÃO COM BOTÃO CTA_URL
      // ==============================================

      const dataAtual = new Date().toLocaleDateString("pt-BR");
      const horaAtual = new Date().toLocaleTimeString("pt-BR");

      const textoManutencao = `
╭══════════════════════════════╮
     🔧 *𝑬𝑴 𝑴𝑨𝑵𝑼𝑻𝑬𝑵𝑪̧𝑨̃𝑶* 🔧
╰══════════════════════════════╯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ ᴇsᴛá ᴛᴇᴍᴘᴏʀᴀʀɪᴀᴍᴇɴᴛᴇ ɪɴᴅɪsᴘᴏɴíᴠᴇʟ!*

📌 *ᴄᴏᴍᴀɴᴅᴏ:* ${prefix}${comandoCompleto}
📅 *ᴅᴀᴛᴀ:* ${dataAtual}
⏰ *ʜᴏʀᴀ:* ${horaAtual}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 *ᴍᴏᴛɪᴠᴏ:* ᴍᴀɴᴜᴛᴇɴçãᴏ ᴘʀᴏɢʀᴀᴍᴀᴅᴀ
🔄 *ᴘʀᴇᴠɪsãᴏ:* ᴇᴍ ʙʀᴇᴠᴇ ᴇsᴛᴀʀá ᴅɪsᴘᴏɴíᴠᴇʟ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `;

      // Enviar mensagem com botão CTA_URL usando baileys_helper
      await sendInteractiveMessage(conn, from, {
        text: textoManutencao,
        footer: "ʟᴜᴋᴀᴍᴏᴅᴢ ʙᴏᴛ 🤖",
        interactiveButtons: [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "📞 𝐒𝐮𝐩𝐨𝐫𝐭𝐞",
              url: `https://wa.me/${DONO_NUMERO}`,
              merchant_url: `https://wa.me/${DONO_NUMERO}`
            })
          }
        ]
      });

      await conn.sendMessage(from, { react: { text: "🔧", key: msg.key } });

    } catch (error) {
      console.error("Erro no manutencao:", error);
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴠᴇʀɪғɪᴄᴀʀ ᴍᴀɴᴜᴛᴇɴçãᴏ!* ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ."
      }, { quoted: msg });
    }
  }
};