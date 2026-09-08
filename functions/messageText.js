function unwrapMessage(input) {
  let message = input?.message || input || {};
  for (let i = 0; i < 6; i++) {
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

function nativeFlowReplyId(message) {
  const raw = message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
  if (!raw) return "";
  try {
    const params = typeof raw === "string" ? JSON.parse(raw) : raw;
    return String(
      params?.id ||
      params?.selectedId ||
      params?.selected_id ||
      params?.row_id ||
      params?.button_id ||
      "",
    );
  } catch (_) {
    return "";
  }
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
    message?.buttonsResponseMessage?.selectedButtonId ||
    message?.templateButtonReplyMessage?.selectedId ||
    message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    nativeFlowReplyId(message) ||
    "",
  );
}

module.exports = { extractMessageText, unwrapMessage, nativeFlowReplyId };
