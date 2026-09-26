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

function installMessageDefaults(conn) {
  if (!conn || typeof conn.sendMessage !== "function") {
    throw new Error("Conexão inválida ao instalar padrões de mensagem.");
  }

  if (conn[INSTALLED]) return conn;

  const originalSendMessage = conn.sendMessage.bind(conn);

  Object.defineProperty(conn, INSTALLED, {
    value: true,
    enumerable: false,
    configurable: false,
  });

  conn.sendMessage = async (jid, content, options = {}) => {
    const outgoing = prepareOutgoing(content, options);
    return originalSendMessage(jid, outgoing.content, outgoing.options);
  };

  return conn;
}

module.exports = {
  runWithMessage,
  currentMessage,
  isControlMessage,
  stripLegacyForwarding,
  prepareOutgoing,
  installMessageDefaults,
};
