// commands/dono/listg.js
const config = require("../../config/config");
const { sendInteractiveMessage } = require("gifted-btns");

module.exports = {
  name: "listg",
  description: "𝑳𝒊𝒔𝒕𝒂 𝒕𝒐𝒅𝒐𝒔 𝒐𝒔 𝒈𝒓𝒖𝒑𝒐𝒔 𝒒𝒖𝒆 𝒐 𝒃𝒐𝒕 𝒆𝒔𝒕𝒂́",
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
          quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
        });
      }

      await conn.sendMessage(from, { react: { text: "📋", key: msg.key } });

      const groups = await conn.groupFetchAllParticipating();
      const groupList = Object.values(groups);
      
      if (groupList.length === 0) {
        return await conn.sendMessage(from, { 
          text: "❌ ɴᴇɴʜᴜᴍ ɢʀᴜᴘᴏ.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      const botJid = conn.user.id.split(":")[0] + "@s.whatsapp.net";
      const GRUPO_OFICIAL_ID = "120363428783733638@g.us";
      
      const grupoOficial = groupList.find(g => g.id === GRUPO_OFICIAL_ID);
      const outrosGrupos = groupList.filter(g => g.id !== GRUPO_OFICIAL_ID);

      const makeRow = (group, isOficial = false) => {
        const name = group.subject || "sᴇᴍ ɴᴏᴍᴇ";
        const members = group.participants?.length || 0;
        const isBotAdmin = group.participants?.some(p => p.id === botJid && p.admin) || false;
        const adminStatus = isBotAdmin ? "👮 ᴀᴅᴍ" : "👤 ᴍᴇᴍʙʀᴏ";
        const desc = `👥 ${members} · ${adminStatus}`;
        const lid = group.id.split("@")[0]; // 🔥 Pega só o número
        
        return {
          id: `${prefix}gerenciar ${lid}@g.us`, // 🔥 Formato: .gerenciar-120363XXXXX
          title: `   ${isOficial ? "⭐ " : "• "}${name}`,
          description: desc
        };
      };

      const sections = [];
      
      if (grupoOficial) {
        sections.push({
          title: "⭐ ɢʀᴜᴘᴏ ᴏғɪᴄɪᴀʟ",
          rows: [makeRow(grupoOficial, true)]
        });
      } else {
        sections.push({
          title: "⭐ ɢʀᴜᴘᴏ ᴏғɪᴄɪᴀʟ",
          rows: [{
            id: `${prefix}menu`,
            title: "   ⚠️ ʙᴏᴛ ɴᴀ̃ᴏ ᴇsᴛᴀ́ ɴᴏ ɢʀᴜᴘᴏ ᴏғɪᴄɪᴀʟ",
            description: "ᴀᴅɪᴄɪᴏɴᴇ ᴏ ʙᴏᴛ ᴀᴏ ɢʀᴜᴘᴏ ᴏғɪᴄɪᴀʟ"
          }]
        });
      }

      if (outrosGrupos.length > 0) {
        sections.push({
          title: `📋 ᴛᴏᴅᴏs ᴏs ɢʀᴜᴘᴏs (${outrosGrupos.length})`,
          rows: outrosGrupos.map(g => makeRow(g))
        });
      }

      await sendInteractiveMessage(conn, from, {
        text: `📋 *ʟɪsᴛᴀ ᴅᴇ ɢʀᴜᴘᴏs*\n📊 ᴛᴏᴛᴀʟ: ${groupList.length}\n\n📌 sᴇʟᴇᴄɪᴏɴᴇ ᴜᴍ ɢʀᴜᴘᴏ ᴘᴀʀᴀ ɢᴇʀᴇɴᴄɪᴀʀ:`,
        footer: "ʟᴜᴋᴀᴍᴏᴅᴢᴢ · ʟɪsᴛɢ",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } },
        interactiveButtons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "📋 ɢʀᴜᴘᴏs",
              sections: sections
            })
          }
        ]
      }, {
        quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
      });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("ʟɪsᴛɢ:", error);
      await conn.sendMessage(from, { 
        text: "❌ ᴇʀʀᴏ.",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};