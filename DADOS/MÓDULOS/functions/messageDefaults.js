const { AsyncLocalStorage } = require("async_hooks");
const {
  createStatusQuoted,
  forwardedNewsletterContext,
} = require("./statusCard");

const messageContext = new AsyncLocalStorage();
const INSTALLED = Symbol.for("solution.messageDefaults.installed");

function runWithMessage(msg, callback) {
  return messageContext.run({ msg }, callback);
}

function currentMessage() {
  return messageContext.getStore()?.msg || null;
}

function isControlMessage(content) {
  if (!content || typeof content !== "object") return true;

  return Boolean(
    content.delete ||
    content.react ||
    content.pin ||
    content.edit ||
    content.poll
  );
}

function shouldShowTyping(content) {
  return content && typeof content === "object" &&
    !content.delete && !content.react && !content.pin && !content.edit;
}

function stripLegacyForwarding(contextInfo) {
  if (!contextInfo || typeof contextInfo !== "object") return {};

  const context = { ...contextInfo };
  delete context.forwardingScore;
  delete context.isForwarded;
  delete context.forwardedNewsletterMessageInfo;
  return context;
}

function prepareOutgoing(content, options = {}) {
  if (isControlMessage(content)) {
    return {
      content,
      options: options && typeof options === "object" ? options : {},
    };
  }

  const contextInfo = {
    ...stripLegacyForwarding(content.contextInfo),
    ...forwardedNewsletterContext(),
  };

  return {
    content: {
      ...content,
      contextInfo,
    },
    options: {
      ...(options && typeof options === "object" ? options : {}),
      // O status é responsabilidade do núcleo. Qualquer status manual antigo
      // passado por comandos é substituído aqui.
      quoted: createStatusQuoted(currentMessage()),
    },
  };
}

function isChatJid(jid) {
  return typeof jid === "string" &&
    /@(g\.us|s\.whatsapp\.net|lid)$/.test(jid);
}

async function sendWithTyping(conn, jid, send) {
  if (!isChatJid(jid) || typeof conn.sendPresenceUpdate !== "function") {
    return send();
  }

  let composing = false;
  try {
    await conn.sendPresenceUpdate("composing", jid);
    composing = true;
    // Dá tempo para o WhatsApp exibir o indicador antes do envio.
    await new Promise(resolve => setTimeout(resolve, 650));
  } catch (_) {
    // Falhas de presença não devem impedir uma resposta do bot.
  }

  try {
    return await send();
  } finally {
    if (composing) {
      try {
        await conn.sendPresenceUpdate("paused", jid);
      } catch (_) {
        // A confirmação do envio não depende da atualização de presença.
      }
    }
  }
}

function prepareRelayMessage(message) {
  if (!message || typeof message !== "object") return message;

  const inner = message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.ephemeralMessage?.message || message;
  const type = [
    "interactiveMessage", "imageMessage", "videoMessage",
    "extendedTextMessage", "documentMessage", "audioMessage",
    "stickerMessage", "contactMessage", "albumMessage",
  ].find(key => inner?.[key]);
  if (!type) return message;

  const payload = inner[type];
  const contextInfo = {
    ...stripLegacyForwarding(payload.contextInfo),
    ...forwardedNewsletterContext(),
  };
  return {
    ...message,
    ...(inner === message
      ? { [type]: { ...payload, contextInfo } }
      : message.viewOnceMessage?.message === inner
        ? { viewOnceMessage: { ...message.viewOnceMessage, message: {
          ...inner, [type]: { ...payload, contextInfo },
        } } }
        : message.viewOnceMessageV2?.message === inner
          ? { viewOnceMessageV2: { ...message.viewOnceMessageV2, message: {
            ...inner, [type]: { ...payload, contextInfo },
          } } }
          : { ephemeralMessage: { ...message.ephemeralMessage, message: {
            ...inner, [type]: { ...payload, contextInfo },
          } } }),
  };
}

function installMessageDefaults(conn) {
  if (!conn || typeof conn.sendMessage !== "function") {
    throw new Error("Conexão inválida ao instalar padrões de mensagem.");
  }

  if (conn[INSTALLED]) return conn;

  const originalSendMessage = conn.sendMessage.bind(conn);
  const originalRelayMessage = typeof conn.relayMessage === "function"
    ? conn.relayMessage.bind(conn)
    : null;

  Object.defineProperty(conn, INSTALLED, {
    value: true,
    enumerable: false,
    configurable: false,
  });

  conn.sendMessage = async (jid, content, options = {}) => {
    const outgoing = prepareOutgoing(content, options);
    const send = () => originalSendMessage(jid, outgoing.content, outgoing.options);
    return shouldShowTyping(content)
      ? sendWithTyping(conn, jid, send)
      : send();
  };

  if (originalRelayMessage) {
    conn.relayMessage = (jid, message, options = {}) => {
      const outgoing = prepareRelayMessage(message);
      const send = () => originalRelayMessage(jid, outgoing, options);
      return outgoing === message ? send() : sendWithTyping(conn, jid, send);
    };
  }

  return conn;
}

module.exports = {
  runWithMessage,
  currentMessage,
  isControlMessage,
  shouldShowTyping,
  stripLegacyForwarding,
  prepareOutgoing,
  prepareRelayMessage,
  sendWithTyping,
  installMessageDefaults,
};
