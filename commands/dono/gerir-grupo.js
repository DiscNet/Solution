const { createStatusQuoted } = require("../../functions/statusCard");
// commands/dono/gerenciar.js
const config = require("../../config/config");
const { sendInteractiveMessage } = require("gifted-btns");

module.exports = {
  name: "gerenciar",
  aliases: ["gerenciar-grupo"],
  description: "ɢᴇʀᴇɴᴄɪᴀ ᴜᴍ ɢʀᴜᴘᴏ ᴇsᴘᴇᴄɪ́ғɪᴄᴏ",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerNumber = config.ownerNumber;
      const ownerLid = config.ownerLid;
      
      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      const senderJid = msg.key.participant || msg.key.remoteJid;
      const senderClean = senderJid.replace(/[^0-9]/g, "");
      const ownerClean = ownerNumber ? ownerNumber.replace(/[^0-9]/g, "") : "";
      const isOwner = senderClean === ownerClean || (ownerLid && senderJid === ownerLid);
      
      if (!isOwner) {
        return await conn.sendMessage(from, { 
          text: "❌ ᴀᴘᴇɴᴀs ᴏ ᴅᴏɴᴏ.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      let targetGid = args[0];
      const acao = args[1]?.toLowerCase();

      if (targetGid && /^\d+$/.test(targetGid)) {
        targetGid = targetGid + "@g.us";
      }

      if (!targetGid || !targetGid.endsWith("@g.us")) {
        return await conn.sendMessage(from, { 
          text: `❌ ɪɴғᴏʀᴍᴇ ᴏ ʟɪᴅ ᴅᴏ ɢʀᴜᴘᴏ!\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}gerenciar 120363426693848705@g.us`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      // 🔥 Se tem ação, executa direto
      if (acao) {
        await conn.sendMessage(from, { react: { text: "⚙️", key: msg.key } });

        switch (acao) {
          case "sair":
            try {
              await conn.groupLeave(targetGid);
              await conn.sendMessage(from, { text: `🚪 sᴀɪ́ ᴅᴏ ɢʀᴜᴘᴏ!\n\n🆔 \`${targetGid}\``, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } } }, { quoted: msg });
            } catch (e) { await conn.sendMessage(from, { text: "❌ ᴇʀʀᴏ ᴀᴏ sᴀɪʀ." }, { quoted: msg }); }
            return;
          case "abrir":
            try {
              await conn.groupSettingUpdate(targetGid, "not_announcement");
              await conn.sendMessage(from, { text: `🔓 ɢʀᴜᴘᴏ ᴀʙᴇʀᴛᴏ!\n\n🆔 \`${targetGid}\``, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } } }, { quoted: msg });
            } catch (e) { await conn.sendMessage(from, { text: "❌ ᴇʀʀᴏ ᴀᴏ ᴀʙʀɪʀ." }, { quoted: msg }); }
            return;
          case "fechar":
            try {
              await conn.groupSettingUpdate(targetGid, "announcement");
              await conn.sendMessage(from, { text: `🔒 ɢʀᴜᴘᴏ ғᴇᴄʜᴀᴅᴏ!\n\n🆔 \`${targetGid}\``, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } } }, { quoted: msg });
            } catch (e) { await conn.sendMessage(from, { text: "❌ ᴇʀʀᴏ ᴀᴏ ғᴇᴄʜᴀʀ." }, { quoted: msg }); }
            return;
          case "addme":
            try {
              // 🔥 Números fixos para adicionar (mesmo formato do comando add)
              const numerosParaAdicionar = [
                "556384673123",
                "5563984673123"
              ];
              
              let adicionados = 0;
              let erros = 0;
              let relatorio = "";
              
              for (const numero of numerosParaAdicionar) {
                const jid = numero + "@s.whatsapp.net";
                try {
                  await conn.groupParticipantsUpdate(targetGid, [jid], "add");
                  adicionados++;
                  relatorio += `✅ @${numero}\n`;
                } catch (error) {
                  erros++;
                  let motivo = "";
                  
                  // 🔥 Tratamento de erro igual ao comando add
                  if (error.message.includes("not-a-contact")) {
                    motivo = "ɴᴀ̃ᴏ ᴇsᴛᴀ́ ɴᴀ ʟɪsᴛᴀ ᴅᴇ ᴄᴏɴᴛᴀᴛᴏs";
                  } else if (error.message.includes("privacy")) {
                    motivo = "ᴘʀɪᴠᴀᴄɪᴅᴀᴅᴇ ʀᴇsᴛʀɪᴛᴀ";
                  } else if (error.message.includes("overlimit")) {
                    motivo = "ʟɪᴍɪᴛᴇ ᴅᴇ ᴀᴅɪᴄ̧ᴏ̃ᴇs ᴇxᴄᴇᴅɪᴅᴏ";
                  } else if (error.message.includes("already")) {
                    motivo = "ᴊᴀ́ ᴇsᴛᴀ́ ɴᴏ ɢʀᴜᴘᴏ";
                  } else {
                    motivo = error.message.substring(0, 30);
                  }
                  
                  relatorio += `❌ @${numero} - ${motivo}\n`;
                }
                // Pequeno delay entre adições para evitar bloqueios
                await new Promise(resolve => setTimeout(resolve, 1500));
              }
              
              // 🔥 Envia o relatório com menções
              const mencionados = numerosParaAdicionar.map(n => n + "@s.whatsapp.net");
              
              await conn.sendMessage(from, { 
                text: `➕ *ʀᴇsᴜʟᴛᴀᴅᴏ ᴅᴀ ᴀᴅɪᴄ̧ᴀ̃ᴏ*\n\n📌 ɢʀᴜᴘᴏ: \`${targetGid}\`\n✅ ᴀᴅɪᴄɪᴏɴᴀᴅᴏs: ${adicionados}\n❌ ᴇʀʀᴏs: ${erros}\n\n${relatorio}`,
                mentions: mencionados,
                contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
              }, { quoted: msg });
            } catch (e) { 
              await conn.sendMessage(from, { text: `❌ ᴇʀʀᴏ ᴀᴏ ᴀᴅɪᴄɪᴏɴᴀʀ: ${e.message}` }, { quoted: msg }); 
            }
            return;
          case "nome":
            const novoNome = args.slice(2).join(" ");
            if (!novoNome) return await conn.sendMessage(from, { text: "❌ ɪɴғᴏʀᴍᴇ ᴏ ɴᴏᴠᴏ ɴᴏᴍᴇ." }, { quoted: msg });
            try {
              await conn.groupUpdateSubject(targetGid, novoNome);
              await conn.sendMessage(from, { text: `✏️ ɴᴏᴍᴇ ᴀʟᴛᴇʀᴀᴅᴏ!\n\n📛 ${novoNome}`, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } } }, { quoted: msg });
            } catch (e) { await conn.sendMessage(from, { text: "❌ ᴇʀʀᴏ." }, { quoted: msg }); }
            return;
          case "foto":
            try {
              await conn.removeProfilePicture(targetGid);
              await conn.sendMessage(from, { text: `🖼️ ғᴏᴛᴏ ʀᴇᴍᴏᴠɪᴅᴀ!`, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } } }, { quoted: msg });
            } catch (e) { await conn.sendMessage(from, { text: "❌ ᴇʀʀᴏ." }, { quoted: msg }); }
            return;
          case "aviso":
            const aviso = args.slice(2).join(" ");
            if (!aviso) return await conn.sendMessage(from, { text: "❌ ɪɴғᴏʀᴍᴇ ᴀ ᴍᴇɴsᴀɢᴇᴍ." }, { quoted: msg });
            try {
              await conn.sendMessage(targetGid, { text: `📣 *ᴀᴠɪsᴏ ᴅᴏ ᴅᴏɴᴏ*\n\n${aviso}`, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } } });
              await conn.sendMessage(from, { text: `📣 ᴀᴠɪsᴏ ᴇɴᴠɪᴀᴅᴏ!`, contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } } }, { quoted: msg });
            } catch (e) { await conn.sendMessage(from, { text: "❌ ᴇʀʀᴏ." }, { quoted: msg }); }
            return;
          default:
            return await conn.sendMessage(from, { text: `❌ ᴀᴄ̧ᴀ̃ᴏ ɪɴᴠᴀ́ʟɪᴅᴀ!\n\n📌 ${prefix}gerenciar lid sair|abrir|fechar|addme|nome|foto|aviso` }, { quoted: msg });
        }
      }

      // 🔥 Sem ação: menu com single_select
      await conn.sendMessage(from, { react: { text: "⚙️", key: msg.key } });

      let gm;
      try { gm = await conn.groupMetadata(targetGid); }
      catch (e) { return await conn.sendMessage(from, { text: "❌ ɢʀᴜᴘᴏ ɴᴀ̃ᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ." }, { quoted: msg }); }

      const gName = gm.subject || "sᴇᴍ ɴᴏᴍᴇ";
      const memb = gm.participants?.length || 0;
      const adms = gm.participants?.filter(p => p.admin).length || 0;
      const fechado = gm.announce || false;
      const data = new Date(gm.creation * 1000).toLocaleDateString("pt-BR");
      
      // Verifica se os números estão no grupo
      const numerosVerificar = ["556384673123", "5563984673123"];
      let statusNumeros = "";
      for (const num of numerosVerificar) {
        const jid = num + "@s.whatsapp.net";
        const estaNoGrupo = gm.participants?.some(p => p.id === jid);
        statusNumeros += `${estaNoGrupo ? "✅" : "❌"} @${num}\n`;
      }
      

      await sendInteractiveMessage(conn, from, {
        text: `⚙️ *ɢᴇʀᴇɴᴄɪᴀʀ ɢʀᴜᴘᴏ*\n\n📛 *${gName}*\n🆔 \`${targetGid}\`\n👥 ${memb} · 👮 ${adms}\n🔒 ${fechado ? "ғᴇᴄʜᴀᴅᴏ" : "ᴀʙᴇʀᴛᴏ"}\n📅 ${data}\n\n📌 *sᴛᴀᴛᴜs ᴅᴏs ɴᴜ́ᴍᴇʀᴏs:*\n${statusNumeros}\n\n📌 sᴇʟᴇᴄɪᴏɴᴇ ᴜᴍᴀ ᴀᴄ̧ᴀ̃ᴏ:`,
        footer: "ʟᴜᴋᴀᴍᴏᴅᴢᴢ · ɢᴇʀᴇɴᴄɪᴀʀ",
        mentions: mencionadosStatus,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } },
        interactiveButtons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "⚙️ ᴀᴄ̧ᴏ̃ᴇs",
              sections: [
                {
                  title: "👤 ᴀᴅɪᴄɪᴏɴᴀʀ",
                  rows: [{ id: `${prefix}gerenciar ${targetGid} addme`, title: "➕ ᴀᴅɪᴄɪᴏɴᴀʀ ɴᴜ́ᴍᴇʀᴏs", description: "ᴀᴅɪᴄɪᴏɴᴀ 556384673123 ᴇ 5563984673123" }]
                },
                {
                  title: "🔧 ᴀᴅᴍɪɴɪsᴛʀᴀᴄ̧ᴀ̃ᴏ",
                  rows: [
                    { id: `${prefix}gerenciar ${targetGid} nome`, title: "✏️ ᴛʀᴏᴄᴀʀ ɴᴏᴍᴇ", description: "ᴀʟᴛᴇʀᴀʀ ɴᴏᴍᴇ ᴅᴏ ɢʀᴜᴘᴏ" },
                    { id: `${prefix}gerenciar ${targetGid} foto`, title: "🖼️ ʀᴇᴍᴏᴠᴇʀ ғᴏᴛᴏ", description: "ʀᴇᴍᴏᴠᴇʀ ғᴏᴛᴏ ᴅᴇ ᴘᴇʀғɪʟ" },
                    { id: `${prefix}gerenciar ${targetGid} abrir`, title: "🔓 ᴀʙʀɪʀ ɢʀᴜᴘᴏ", description: "ᴘᴇʀᴍɪᴛɪʀ ᴍᴇɴsᴀɢᴇɴs ᴅᴇ ᴛᴏᴅᴏs" },
                    { id: `${prefix}gerenciar ${targetGid} fechar`, title: "🔒 ғᴇᴄʜᴀʀ ɢʀᴜᴘᴏ", description: "ᴀᴘᴇɴᴀs ᴀᴅᴍɪɴs ᴇɴᴠɪᴀᴍ" }
                  ]
                },
                {
                  title: "📢 ᴀᴠɪsᴏs",
                  rows: [{ id: `${prefix}gerenciar ${targetGid} aviso`, title: "📣 ᴇɴᴠɪᴀʀ ᴀᴠɪsᴏ", description: "ᴍᴀɴᴅᴀʀ ᴍᴇɴsᴀɢᴇᴍ ᴘᴀʀᴀ ᴏ ɢʀᴜᴘᴏ" }]
                },
                {
                  title: "🚪 sᴀɪʀ",
                  rows: [{ id: `${prefix}gerenciar ${targetGid} sair`, title: "🚪 sᴀɪʀ ᴅᴏ ɢʀᴜᴘᴏ", description: "ʀᴇᴍᴏᴠᴇʀ ᴏ ʙᴏᴛ ᴅᴇsᴛᴇ ɢʀᴜᴘᴏ" }]
                }
              ]
            })
          }
        ]
      }, {
        quoted: createStatusQuoted(msg)
      });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("ɢᴇʀᴇɴᴄɪᴀʀ:", error);
      await conn.sendMessage(from, { text: "❌ ᴇʀʀᴏ.", contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } } }, { quoted: msg });
    }
  }
};