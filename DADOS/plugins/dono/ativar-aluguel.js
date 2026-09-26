// Menu: Dono - Aluguel | Comando: ativar-aluguel
const { createStatusQuoted } = require("../../functions/statusCard");
// commands/dono/ativar-aluguel.js
const config = require("../../config/config");
const aluguel = require("../../functions/aluguel");

module.exports = {
  permissions: { owner: true },
  name: "ativar-aluguel",
  aliases: ["alugar", "aluguel"],
  description: "ᴀᴛɪᴠᴀ ᴀʟᴜɢᴜᴇʟ ᴘᴀʀᴀ ᴜᴍ ɢʀᴜᴘᴏ (ᴀᴘᴇɴᴀs ᴅᴏɴᴏ)",
  async execute(conn, msg, args, from, axiosInstance, cmdUsado) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerLid = config.ownerLid || "";
      const prefix = config.prefix || ".";

      // PEGA O NOME DO COMANDO USADO
      const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || "";
      const cmd = texto.split(" ")[0].replace(prefix, "").trim() || module.exports.name;

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      // VERIFICA SE É O DONO
      const sender = msg.key.participant || msg.key.remoteJid || from;
      const isOwner = sender === ownerLid || sender.replace(/[^0-9]/g, "") === ownerLid.replace(/[^0-9]/g, "");

      if (!isOwner) {
        return await conn.sendMessage(from, {
          text: "❌ ᴀᴘᴇɴᴀs ᴏ ᴅᴏɴᴏ ᴘᴏᴅᴇ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!",
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      // VERIFICA SE FOI FORNECIDO O PLANO
      if (!args[0]) {
        const planos = Object.keys(aluguel.PLANOS).join(", ");
        return await conn.sendMessage(from, {
          text: `❌ ɪɴғᴏʀᴍᴇ ᴏ ᴘʟᴀɴᴏ ᴇ ᴏ ɢʀᴜᴘᴏ!\n\n📌 ᴘʟᴀɴᴏs ᴅɪsᴘᴏɴɪ́ᴠᴇɪs: ${planos}\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}${cmd} diario @g.us\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}${cmd} permanente @g.us`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      const plano = args[0].toLowerCase();

      // VERIFICA SE O PLANO É VÁLIDO
      if (!aluguel.PLANOS[plano]) {
        const planos = Object.keys(aluguel.PLANOS).join(", ");
        return await conn.sendMessage(from, {
          text: `❌ ᴘʟᴀɴᴏ ɪɴᴠᴀ́ʟɪᴅᴏ!\n\n📌 ᴘʟᴀɴᴏs ᴅɪsᴘᴏɴɪ́ᴠᴇɪs: ${planos}`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      // PEGA O GRUPO (menção ou argumento)
      let grupoJid = null;
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

      if (mentionedJid && mentionedJid.length > 0) {
        grupoJid = mentionedJid[0];
      } else if (args[1]) {
        let grupo = args[1];
        if (!grupo.endsWith("@g.us")) {
          // Tenta limpar o número
          const num = grupo.replace(/[^0-9]/g, "");
          if (num.length > 0) {
            grupoJid = num + "@g.us";
          }
        } else {
          grupoJid = grupo;
        }
      }

      if (!grupoJid || !grupoJid.endsWith("@g.us")) {
        return await conn.sendMessage(from, {
          text: `❌ ᴍᴀʀǫᴜᴇ ᴏ ɢʀᴜᴘᴏ ᴏᴜ ᴘᴀssᴇ ᴏ ʟɪᴅ!\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}${cmd} ${plano} @g.us`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      // VERIFICA SE O GRUPO EXISTE
      try {
        await conn.groupMetadata(grupoJid);
      } catch (e) {
        return await conn.sendMessage(from, {
          text: "❌ ɢʀᴜᴘᴏ ɴᴀ̃ᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ ᴏᴜ ɪɴᴠᴀ́ʟɪᴅᴏ!",
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      // PEGA O NOME DO GRUPO
      let grupoNome = grupoJid;
      try {
        const metadata = await conn.groupMetadata(grupoJid);
        grupoNome = metadata.subject || grupoJid;
      } catch (e) {}

      // ATIVA O ALUGUEL
      if (plano === "permanente") {
        aluguel.ativarPermanente(grupoJid);

        await conn.sendMessage(from, {
          text: `✅ *ᴀʟᴜɢᴜᴇʟ ᴘᴇʀᴍᴀɴᴇɴᴛᴇ ᴀᴛɪᴠᴀᴅᴏ!*\n\n📌 *ɢʀᴜᴘᴏ:* ${grupoNome}\n🆔 \`${grupoJid}\`\n♾️ *ᴘʟᴀɴᴏ:* ᴘᴇʀᴍᴀɴᴇɴᴛᴇ\n\n📌 ᴏ ʙᴏᴛ ʀᴇsᴘᴏɴᴅᴇʀᴀ́ ᴘᴀʀᴀ sᴇᴍᴘʀᴇ ɴᴇsᴛᴇ ɢʀᴜᴘᴏ!`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      } else {
        const dataExpiracao = aluguel.calcularExpiracao(plano);
        aluguel.ativarAluguel(grupoJid, plano, dataExpiracao);

        const dataExp = new Date(dataExpiracao);
        const dataFormatada = dataExp.toLocaleDateString("pt-BR");
        const horaFormatada = dataExp.toLocaleTimeString("pt-BR");
        const dias = aluguel.PLANOS[plano].dias;

        await conn.sendMessage(from, {
          text: `✅ *ᴀʟᴜɢᴜᴇʟ ᴀᴛɪᴠᴀᴅᴏ!*\n\n📌 *ɢʀᴜᴘᴏ:* ${grupoNome}\n🆔 \`${grupoJid}\`\n📊 *ᴘʟᴀɴᴏ:* ${plano.toUpperCase()} (${dias} ᴅɪᴀs)\n📅 *ᴇxᴘɪʀᴀ ᴇᴍ:* ${dataFormatada} às ${horaFormatada}\n\n📌 ᴏ ʙᴏᴛ ʀᴇsᴘᴏɴᴅᴇʀᴀ́ ᴀᴛᴇ́ ᴀ ᴅᴀᴛᴀ ᴅᴇ ᴇxᴘɪʀᴀᴄ̧ᴀ̃ᴏ!`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

    } catch (error) {
      console.error("❌ Erro ativar-aluguel:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴀᴛɪᴠᴀʀ ᴀʟᴜɢᴜᴇʟ!*\n\n📌 ${error.message}`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: `${bot}`,
            serverMessageId: 116
          }
        }
      }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Dono",
  "menuSection": "Aluguel",
  "usage": "ativar-aluguel plano [id@g.us]",
  "description": "Uso: .ativar-aluguel plano [id@g.us]"
});
