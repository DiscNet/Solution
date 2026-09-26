const config = require("../config/config");

// Mantém a mesma lógica usada originalmente pelo commands/menus/menu.js.
const DEV_NUMBER = "5563984673123";
const NEWSLETTER_JID = "120363426698503859@newsletter";
const NEWSLETTER_MESSAGE_ID = 116;

function forwardedNewsletterContext() {
  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: NEWSLETTER_JID,
      newsletterName: config.botName || "GrimmJow-WA",
      serverMessageId: NEWSLETTER_MESSAGE_ID,
    },
  };
}

function getPushName(msg) {
  try {
    return (
      msg?.pushName ||
      msg?.message?.extendedTextMessage?.contextInfo?.pushName ||
      "Usuário"
    );
  } catch (_) {
    return "Usuário";
  }
}

function getNumeroUsuario(msg) {
  const candidatos = [
    msg?.key?.participantAlt,
    msg?.key?.participant,
    msg?.key?.remoteJidAlt,
    msg?.key?.remoteJid,
    msg?.sender
  ];

  for (const candidato of candidatos) {
    const numero = String(candidato || "").replace(/[^0-9]/g, "");
    if (numero.length >= 10) return numero;
  }

  return DEV_NUMBER;
}

function limparCampoVCard(valor, fallback) {
  const texto = String(valor || fallback || "");
  return texto.replace(/[\r\n]+/g, " ").trim() || fallback;
}

function createStatusQuoted(msg, ownerName, numeroOverride) {
  const pushName = getPushName(msg);
  const numeroForcado = String(numeroOverride || "").replace(/[^0-9]/g, "");
  const numeroUsuario = numeroForcado.length >= 10 ? numeroForcado : getNumeroUsuario(msg);
  const owner = limparCampoVCard(
    ownerName || config.ownerName || "LukaModzz",
    "LukaModzz"
  );
  const nomeVCard = limparCampoVCard(pushName, "Usuário");

  return {
    key: {
      remoteJid: "status@broadcast",
      fromMe: false,
      participant: "0@s.whatsapp.net"
    },
    message: {
      contactMessage: {
        displayName: pushName,
        vcard:
          "BEGIN:VCARD\n" +
          "VERSION:3.0\n" +
          `FN:${nomeVCard}\n` +
          `ORG:${owner};\n` +
          `TEL;type=CELL;type=VOICE;waid=${numeroUsuario}:${numeroUsuario}\n` +
          "END:VCARD"
      }
    }
  };
}

module.exports = {
  DEV_NUMBER,
  NEWSLETTER_JID,
  NEWSLETTER_MESSAGE_ID,
  getPushName,
  getNumeroUsuario,
  createStatusQuoted,
  forwardedNewsletterContext
};
