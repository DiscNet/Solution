const { sendButtons } = require("gifted-btns");
const config = require("../../config/config");
const { createStatusQuoted } = require("./statusCard");

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function isPrivateJid(jid) {
  return typeof jid === "string" && (jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid"));
}

function getOwnerJid() {
  const ownerNumber = digits(config.ownerNumber);
  if (ownerNumber.length >= 10) return `${ownerNumber}@s.whatsapp.net`;
  return String(config.ownerLid || "").trim();
}

function isOwnerJid(jid) {
  const value = String(jid || "");
  const ownerLid = String(config.ownerLid || "");
  const ownerNumber = digits(config.ownerNumber);
  const valueDigits = digits(value);

  if (ownerLid && value === ownerLid) return true;
  if (ownerNumber && valueDigits === ownerNumber) return true;
  if (ownerLid && valueDigits === digits(ownerLid)) return true;
  return false;
}

function isBotJid(jid) {
  const value = String(jid || "");
  const botLid = String(config.botLid || "");
  const pairingNumber = digits(config.pairingNumber);
  const valueDigits = digits(value);

  if (botLid && value === botLid) return true;
  if (botLid && valueDigits === digits(botLid)) return true;
  if (pairingNumber && valueDigits === pairingNumber) return true;
  return false;
}

function getSenderPhoneNumber(msg) {
  const candidates = [
    msg?.key?.remoteJidAlt,
    msg?.key?.participantAlt,
    msg?.key?.remoteJid,
    msg?.key?.participant
  ];

  for (const candidate of candidates) {
    const value = String(candidate || "");
    if (!value) continue;

    // Números de LID não são números de telefone e não devem ser usados no wa.me.
    if (value.endsWith("@lid")) continue;

    const number = digits(value);
    if (number.length >= 10) return number;
  }

  return "";
}

function getSenderTargetJid(msg) {
  const candidates = [
    msg?.key?.remoteJid,
    msg?.key?.remoteJidAlt,
    msg?.key?.participant,
    msg?.key?.participantAlt
  ];

  for (const candidate of candidates) {
    if (isPrivateJid(candidate)) return candidate;
  }

  return "";
}

function safePushName(msg) {
  return String(msg?.pushName || "ᴅᴇsᴄᴏɴʜᴇᴄɪᴅᴏ")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 80) || "ᴅᴇsᴄᴏɴʜᴇᴄɪᴅᴏ";
}

async function sendOwnerNotice(conn, ownerJid, msg, targetJid, phoneNumber) {
  const prefix = config.prefix || ".";
  const pushName = safePushName(msg);
  const numberLabel = phoneNumber ? `+${phoneNumber}` : "ɴᴀ̃ᴏ ʀᴇsᴏʟᴠɪᴅᴏ";
  const blockId = `${prefix}blockpv ${targetJid}${phoneNumber ? ` ${phoneNumber}` : ""}`;
  const statusQuoted = createStatusQuoted(msg, config.ownerName, phoneNumber);

  const buttons = [
    {
      id: blockId,
      text: "ʙʟᴏǫᴜᴇᴀʀ"
    }
  ];

  if (phoneNumber) {
    buttons.push({
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: "ɪʀ ᴀᴏ ᴘᴠ",
        url: `https://wa.me/${phoneNumber}`
      })
    });
  }

  const text =
    `📩 *ɴᴏᴠᴀ ᴍᴇɴsᴀɢᴇᴍ ɴᴏ ᴘᴠ*\n\n` +
    `• ᴅᴇ: ${pushName}\n` +
    `• ɴᴜ́ᴍᴇʀᴏ: ${numberLabel}\n\n` +
    `ᴀ ᴍᴇɴsᴀɢᴇᴍ ᴀᴄɪᴍᴀ ғᴏɪ ᴇɴᴠɪᴀᴅᴀ ᴀᴏ ʙᴏᴛ.`;

  try {
    return await sendButtons(conn, ownerJid, {
      text,
      footer: "ɢᴇʀᴇɴᴄɪᴀʀ ᴄᴏɴᴠᴇʀsᴀ",
      buttons
    }, { quoted: statusQuoted });
  } catch (error) {
    console.error("Erro ao enviar botões do inbox privado:", error.message);
    return conn.sendMessage(ownerJid, { text }, { quoted: statusQuoted });
  }
}

async function forwardPrivateMessageToOwner(conn, msg) {
  if (!conn || !msg?.message || msg?.key?.fromMe) return false;

  const from = String(msg.key.remoteJid || "");
  if (!isPrivateJid(from)) return false;
  if (isOwnerJid(from) || isBotJid(from)) return false;

  const ownerJid = getOwnerJid();
  if (!isPrivateJid(ownerJid)) {
    console.error("Inbox privado: ownerJid inválido.");
    return false;
  }

  const targetJid = getSenderTargetJid(msg);
  if (!targetJid) {
    console.error("Inbox privado: não foi possível resolver o JID do remetente.");
    return false;
  }

  const phoneNumber = getSenderPhoneNumber(msg);

  try {
    await conn.sendMessage(ownerJid, {
      forward: msg,
      force: true
    });

    await sendOwnerNotice(
      conn,
      ownerJid,
      msg,
      targetJid,
      phoneNumber
    );

    return true;
  } catch (error) {
    console.error("Erro ao encaminhar mensagem privada ao dono:", error.message);
    return false;
  }
}

module.exports = {
  digits,
  isPrivateJid,
  getOwnerJid,
  isOwnerJid,
  getSenderPhoneNumber,
  getSenderTargetJid,
  forwardPrivateMessageToOwner
};
