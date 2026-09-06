const { createStatusQuoted } = require("../../functions/statusCard");
// commands/admins/membros.js
const config = require("../../config/config");
const readmore = String.fromCharCode(8206).repeat(4001);

module.exports = {
  permissions: { group: true },
  name: "membros",
  description: "𝑳𝒊𝒔𝒕𝒂 𝒕𝒐𝒅𝒐𝒔 𝒐𝒔 𝒎𝒆𝒎𝒃𝒓𝒐𝒔 𝒅𝒐 𝒈𝒓𝒖𝒑𝒐",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      if (!from.endsWith("@g.us")) {
        return conn.sendMessage(from, {
          text: "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ sᴏ́ ғᴜɴᴄɪᴏɴᴀ ᴇᴍ ɢʀᴜᴘᴏs.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      const groupMetadata = await conn.groupMetadata(from);
      const participants = groupMetadata.participants;
      const groupName = groupMetadata.subject;
      const groupDesc = groupMetadata.desc || "sᴇᴍ ᴅᴇsᴄʀɪᴄ̧ᴀ̃ᴏ";
      const created = new Date(groupMetadata.creation * 1000).toLocaleDateString("pt-BR");

      const admins = participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
      const membros = participants.filter(p => !p.admin);
      const dono = participants.find(p => p.admin === "superadmin");

      // Modo: admin
      if (args[0] === "admin" || args[0] === "admins") {
        let lista = "";
        let cont = 1;
        for (const a of admins) {
          let nome = a.id.split("@")[0];
          try { const c = await conn.getContact(a.id); nome = c.notifyName || nome; } catch (e) {}
          lista += `${cont++}. @${a.id.split("@")[0]} ${a.admin === "superadmin" ? "👑" : "👮"}\n`;
        }

        return conn.sendMessage(from, {
          text: `👑 *ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs (${admins.length})*\n━━━━━━━━━━━━━━━━━━━━\n\n${lista}`,
          mentions: admins.map(a => a.id),
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      // Modo: info do grupo (aqui sim a descrição)
      if (args[0] === "info" || args[0] === "grupo") {
        return conn.sendMessage(from, {
          text: `📋 *ɪɴғᴏʀᴍᴀᴄ̧ᴏ̃ᴇs ᴅᴏ ɢʀᴜᴘᴏ*\n━━━━━━━━━━━━━━━━━━━━\n\n📛 *ɴᴏᴍᴇ:* ${groupName}\n👑 *ᴅᴏɴᴏ:* @${dono?.id?.split("@")[0] || "ɴ/ᴀ"}\n👥 *ᴍᴇᴍʙʀᴏs:* ${participants.length}\n👮 *ᴀᴅᴍɪɴs:* ${admins.length}\n📅 *ᴄʀɪᴀᴅᴏ:* ${created}\n🆔 *ɪᴅ:* \`${from}\`\n${readmore}\n📝 *ᴅᴇsᴄʀɪᴄ̧ᴀ̃ᴏ:*\n${groupDesc}`,
          mentions: dono ? [dono.id] : [],
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      // Modo: procurar membro
      if (args[0]) {
        const busca = args.join(" ").toLowerCase();
        const encontrados = [];
        for (const p of participants) {
          let nome = p.id.split("@")[0];
          try { const c = await conn.getContact(p.id); nome = (c.notifyName || nome).toLowerCase(); } catch (e) {}
          if (nome.includes(busca) || p.id.split("@")[0].includes(busca)) {
            encontrados.push(p);
          }
        }

        if (encontrados.length === 0) {
          return conn.sendMessage(from, {
            text: `🔍 ɴᴇɴʜᴜᴍ ᴍᴇᴍʙʀᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ ᴘᴀʀᴀ: *${busca}*`,
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        }

        let lista = "";
        let cont = 1;
        for (const e of encontrados.slice(0, 20)) {
          let nome = e.id.split("@")[0];
          try { const c = await conn.getContact(e.id); nome = c.notifyName || nome; } catch (ex) {}
          lista += `${cont++}. @${e.id.split("@")[0]} - ${nome} ${e.admin ? "👮" : ""}\n`;
        }

        return conn.sendMessage(from, {
          text: `🔍 *ʙᴜsᴄᴀ: ${busca}* (${encontrados.length})\n━━━━━━━━━━━━━━━━━━━━\n\n${lista}`,
          mentions: encontrados.slice(0, 20).map(e => e.id),
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      // Modo padrão: resumo + lista de membros (sem descrição)
      let lista = "";
      let cont = 1;
      for (const m of membros.slice(0, 30)) {
        let nome = m.id.split("@")[0];
        try { const c = await conn.getContact(m.id); nome = c.notifyName || nome; } catch (e) {}
        lista += `${cont++}. @${m.id.split("@")[0]}\n`;
      }

      const resumo = `
📋 *ʀᴇsᴜᴍᴏ ᴅᴏ ɢʀᴜᴘᴏ*
━━━━━━━━━━━━━━━━━━━━
📛 *${groupName}*
👑 ᴅᴏɴᴏ: @${dono?.id?.split("@")[0] || "ɴ/ᴀ"}
👥 ᴍᴇᴍʙʀᴏs: ${participants.length}
👮 ᴀᴅᴍɪɴs: ${admins.length}
👤 ᴄᴏᴍᴜɴs: ${membros.length}
📅 ᴄʀɪᴀᴅᴏ: ${created}

━━━━━━━━━━━━━━━━━━━━
👤 *ᴍᴇᴍʙʀᴏs (${membros.length})*
${lista}${membros.length > 30 ? `\n⚠️ ᴇ ᴍᴀɪs ${membros.length - 30}...` : ""}
━━━━━━━━━━━━━━━━━━━━
📌 *${prefix}membros admin* - ᴠᴇʀ ᴀᴅᴍɪɴs
📌 *${prefix}membros info* - ɪɴғᴏ + ᴅᴇsᴄʀɪᴄ̧ᴀ̃ᴏ
📌 *${prefix}membros [ɴᴏᴍᴇ]* - ʙᴜsᴄᴀʀ
`;

      await conn.sendMessage(from, {
        text: resumo,
        mentions: [dono?.id, ...membros.slice(0, 30).map(m => m.id)].filter(Boolean),
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: createStatusQuoted(msg)
      });

      await conn.sendMessage(from, { react: { text: "👥", key: msg.key } });

    } catch (error) {
      console.error("ᴇʀʀᴏ ᴍᴇᴍʙʀᴏs:", error);
      await conn.sendMessage(from, {
        text: "❌ ᴇʀʀᴏ ᴀᴏ ʟɪsᴛᴀʀ ᴍᴇᴍʙʀᴏs.",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};