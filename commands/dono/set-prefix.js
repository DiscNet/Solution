// commands/dono/set-prefix.js
const config = require("../../config/config");
const configLoader = require("../../functions/configLoader");
const { createStatusQuoted } = require("../../functions/statusCard");

function newsletterContext(botName) {
  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363426698503859@newsletter",
      newsletterName: botName,
      serverMessageId: 116
    }
  };
}

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function isOwnerMessage(msg, from) {
  const sender = msg?.key?.participant || msg?.key?.remoteJid || from || "";
  const senderDigits = digits(sender);
  const ownerLid = String(config.ownerLid || "");
  const ownerNumber = String(config.ownerNumber || "");

  if (ownerLid && sender === ownerLid) return true;
  if (ownerLid && senderDigits && senderDigits === digits(ownerLid)) return true;
  if (ownerNumber && senderDigits && senderDigits === digits(ownerNumber)) return true;
  return false;
}

async function reply(conn, from, msg, text, bot) {
  return conn.sendMessage(from, {
    text,
    contextInfo: newsletterContext(bot)
  }, { quoted: createStatusQuoted(msg) });
}

module.exports = {
  permissions: { owner: true },
  name: "setprefix",
  aliases: ["set-prefix", "prefixo", "changeprefix"],
  description: "ᴀʟᴛᴇʀᴀ ᴏ ᴘʀᴇғɪxᴏ ᴅᴏ ʙᴏᴛ (ᴀᴘᴇɴᴀs ᴅᴏɴᴏ)",

  async execute(conn, msg, args, from, _axiosInstance, cmdUsado) {
    const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
    const prefixAtual = config.prefix || ".";
    const comandoUsado = String(cmdUsado || "setprefix").trim() || "setprefix";

    try {
      if (!isOwnerMessage(msg, from)) {
        return reply(conn, from, msg, "❌ ᴀᴘᴇɴᴀs ᴏ ᴅᴏɴᴏ ᴘᴏᴅᴇ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!", bot);
      }

      if (!args?.[0]) {
        return reply(
          conn,
          from,
          msg,
          `❌ ɪɴғᴏʀᴍᴇ ᴏ ɴᴏᴠᴏ ᴘʀᴇғɪxᴏ!\n\n` +
            `📌 ᴘʀᴇғɪxᴏ ᴀᴛᴜᴀʟ: \`${prefixAtual}\`\n` +
            `📌 ᴇxᴇᴍᴘʟᴏ: ${prefixAtual}${comandoUsado} !\n` +
            `📌 ᴇxᴇᴍᴘʟᴏ: ${prefixAtual}${comandoUsado} /`,
          bot
        );
      }

      const novoPrefixo = String(args[0]);
      const tamanho = [...novoPrefixo].length;

      if (tamanho < 1 || tamanho > 5) {
        return reply(conn, from, msg, "❌ ᴏ ᴘʀᴇғɪxᴏ ᴅᴇᴠᴇ ᴛᴇʀ ᴇɴᴛʀᴇ 1 ᴇ 5 ᴄᴀʀᴀᴄᴛᴇʀᴇs!", bot);
      }

      if (/[\s\u0000-\u001f\u007f]/u.test(novoPrefixo)) {
        return reply(conn, from, msg, "❌ ᴏ ᴘʀᴇғɪxᴏ ɴᴀ̃ᴏ ᴘᴏᴅᴇ ᴄᴏɴᴛᴇʀ ᴇsᴘᴀᴄ̧ᴏs, ǫᴜᴇʙʀᴀs ᴅᴇ ʟɪɴʜᴀ ᴏᴜ ᴄᴀʀᴀᴄᴛᴇʀᴇs ᴅᴇ ᴄᴏɴᴛʀᴏʟᴇ!", bot);
      }

      if (novoPrefixo === prefixAtual) {
        return reply(conn, from, msg, `ℹ️ ᴏ ᴘʀᴇғɪxᴏ ᴊᴀ́ ᴇ́ \`${novoPrefixo}\`.`, bot);
      }

      const atualizado = configLoader.salvarConfig({ prefix: novoPrefixo });
      if (atualizado.prefix !== novoPrefixo || config.prefix !== novoPrefixo) {
        throw new Error("o novo prefixo não foi aplicado em memória");
      }

      console.log(
        `✅ Prefixo alterado de "${prefixAtual}" para "${novoPrefixo}" ` +
        `(persistência: ${configLoader.getRuntimeConfigPath()})`
      );

      return reply(
        conn,
        from,
        msg,
        `✅ *ᴘʀᴇғɪxᴏ ᴀʟᴛᴇʀᴀᴅᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ!*\n\n` +
          `📌 ᴀɴᴛɪɢᴏ: \`${prefixAtual}\`\n` +
          `📌 ɴᴏᴠᴏ: \`${novoPrefixo}\`\n\n` +
          `💾 ᴀʟᴛᴇʀᴀᴄ̧ᴀ̃ᴏ ᴘᴇʀsɪsᴛɪᴅᴀ ᴇ ᴀᴘʟɪᴄᴀᴅᴀ ɪᴍᴇᴅɪᴀᴛᴀᴍᴇɴᴛᴇ.`,
        bot
      );
    } catch (error) {
      console.error("❌ Erro set-prefix:", error);
      return reply(
        conn,
        from,
        msg,
        `❌ *ᴇʀʀᴏ ᴀᴏ ᴀʟᴛᴇʀᴀʀ ᴏ ᴘʀᴇғɪxᴏ!*\n\n📌 ${error.message}`,
        bot
      ).catch(() => {});
    }
  }
};
