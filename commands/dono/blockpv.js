const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const { digits, isOwnerJid, isPrivateJid } = require("../../functions/privateInbox");

function isOwnerMessage(msg, from) {
  const sender = msg?.key?.participant || msg?.key?.remoteJid || from || "";
  return isOwnerJid(sender) || isOwnerJid(from);
}

async function reply(conn, from, msg, text) {
  return conn.sendMessage(from, { text }, { quoted: createStatusQuoted(msg) });
}

module.exports = {
  name: "blockpv",
  aliases: ["bloquearpv"],
  description: "ʙʟᴏǫᴜᴇɪᴀ ᴜᴍ ʀᴇᴍᴇᴛᴇɴᴛᴇ ᴅᴏ ᴘᴠ (ᴀᴘᴇɴᴀs ᴅᴏɴᴏ)",

  async execute(conn, msg, args, from) {
    try {
      if (!isOwnerMessage(msg, from)) {
        return reply(conn, from, msg, "❌ ᴀᴄ̧ᴀ̃ᴏ ᴅɪsᴘᴏɴɪ́ᴠᴇʟ ᴀᴘᴇɴᴀs ᴘᴀʀᴀ ᴏ ᴅᴏɴᴏ.");
      }

      const targetJid = String(args?.[0] || "").trim();
      const phoneNumber = digits(args?.[1]);

      if (!isPrivateJid(targetJid)) {
        return reply(conn, from, msg, "❌ ɴᴀ̃ᴏ ғᴏɪ ᴘᴏssɪ́ᴠᴇʟ ɪᴅᴇɴᴛɪғɪᴄᴀʀ ᴏ ʀᴇᴍᴇᴛᴇɴᴛᴇ.");
      }

      if (isOwnerJid(targetJid)) {
        return reply(conn, from, msg, "❌ ᴏ ᴅᴏɴᴏ ɴᴀ̃ᴏ ᴘᴏᴅᴇ sᴇʀ ʙʟᴏǫᴜᴇᴀᴅᴏ ᴘᴏʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ.");
      }

      const botDigits = [config.pairingNumber, config.botLid].map(digits).filter(Boolean);
      if (botDigits.includes(digits(targetJid))) {
        return reply(conn, from, msg, "❌ ᴏ ʙᴏᴛ ɴᴀ̃ᴏ ᴘᴏᴅᴇ sᴇʀ ʙʟᴏǫᴜᴇᴀᴅᴏ.");
      }

      let blockedJid = targetJid;
      try {
        await conn.updateBlockStatus(targetJid, "block");
      } catch (firstError) {
        if (!phoneNumber) throw firstError;
        blockedJid = `${phoneNumber}@s.whatsapp.net`;
        await conn.updateBlockStatus(blockedJid, "block");
      }

      const numberLabel = phoneNumber || digits(blockedJid) || "ʀᴇᴍᴇᴛᴇɴᴛᴇ";
      return reply(
        conn,
        from,
        msg,
        `✅ *ʀᴇᴍᴇᴛᴇɴᴛᴇ ʙʟᴏǫᴜᴇᴀᴅᴏ*\n\n• ɴᴜ́ᴍᴇʀᴏ: +${numberLabel}`
      );
    } catch (error) {
      console.error("Erro blockpv:", error);
      return reply(
        conn,
        from,
        msg,
        "❌ ɴᴀ̃ᴏ ғᴏɪ ᴘᴏssɪ́ᴠᴇʟ ʙʟᴏǫᴜᴇᴀʀ ᴏ ʀᴇᴍᴇᴛᴇɴᴛᴇ."
      ).catch(() => {});
    }
  }
};
