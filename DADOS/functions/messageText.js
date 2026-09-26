function unwrapMessage(input) {
  let message = input?.message || input || {};
  for (let i = 0; i < 8; i++) {
    if (message?.ephemeralMessage?.message) {
      message = message.ephemeralMessage.message;
      continue;
    }
    if (message?.viewOnceMessage?.message) {
      message = message.viewOnceMessage.message;
      continue;
    }
    if (message?.viewOnceMessageV2?.message) {
      message = message.viewOnceMessageV2.message;
      continue;
    }
    if (message?.viewOnceMessageV2Extension?.message) {
      message = message.viewOnceMessageV2Extension.message;
      continue;
    }
    if (message?.documentWithCaptionMessage?.message) {
      message = message.documentWithCaptionMessage.message;
      continue;
    }
    break;
  }
  return message || {};
}

function nativeFlowParams(message) {
  const native = message?.interactiveResponseMessage?.nativeFlowResponseMessage;
  const raw = native?.paramsJson;

  if (!raw) return {};

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

function findInteractiveId(value, depth = 0) {
  if (depth > 5 || value == null) return "";

  if (typeof value === "string") {
    const text = value.trim();
    return text.startsWith(".") || text.startsWith("!") || text.startsWith("/")
      ? text
      : "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findInteractiveId(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof value !== "object") return "";

  const keys = [
    "id",
    "selectedId",
    "selected_id",
    "selectedRowId",
    "selected_row_id",
    "rowId",
    "row_id",
    "buttonId",
    "button_id",
    "command",
    "cmd",
  ];

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const nested of Object.values(value)) {
    const found = findInteractiveId(nested, depth + 1);
    if (found) return found;
  }

  return "";
}

function nativeFlowReplyId(message) {
  const native = message?.interactiveResponseMessage?.nativeFlowResponseMessage;
  const params = nativeFlowParams(message);

  return String(
    findInteractiveId(params) ||
    native?.id ||
    native?.selectedId ||
    native?.selectedRowId ||
    "",
  ).trim();
}

function interactiveReplyId(input) {
  const message = unwrapMessage(input);

  return String(
    message?.buttonsResponseMessage?.selectedButtonId ||
    message?.buttonsResponseMessage?.id ||
    message?.templateButtonReplyMessage?.selectedId ||
    message?.templateButtonReplyMessage?.id ||
    message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    message?.listResponseMessage?.singleSelectReply?.selectedId ||
    message?.interactiveResponseMessage?.buttonReply?.id ||
    nativeFlowReplyId(message) ||
    "",
  ).trim();
}

function isInteractiveReply(input) {
  const message = unwrapMessage(input);
  return Boolean(
    message?.buttonsResponseMessage ||
    message?.templateButtonReplyMessage ||
    message?.listResponseMessage ||
    message?.interactiveResponseMessage
  );
}

function extractMessageText(msg) {
  const message = unwrapMessage(msg);

  return String(
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    message?.documentMessage?.caption ||
    message?.audioMessage?.caption ||
    interactiveReplyId(message) ||
    "",
  );
}

module.exports = {
  extractMessageText,
  unwrapMessage,
  nativeFlowParams,
  findInteractiveId,
  nativeFlowReplyId,
  interactiveReplyId,
  isInteractiveReply,
};
