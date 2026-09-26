const { sendButtons: giftedButtons, sendInteractiveMessage: giftedInteractive } = require("gifted-btns");
const state = require("./adminState");

function isTextOnly(jid) {
  if (!String(jid || "").endsWith("@g.us")) return false;
  return state.groupSettings(jid).semBotoes !== false;
}

function setTextOnly(jid, enabled) {
  if (!String(jid || "").endsWith("@g.us")) throw new Error("Este modo é exclusivo de grupos.");
  state.update(data => {
    state.group(data, jid).semBotoes = Boolean(enabled);
  });
}

function parseButton(button) {
  if (button?.buttonParamsJson) {
    try { return JSON.parse(button.buttonParamsJson); } catch { return {}; }
  }
  return button || {};
}

function textChoices(payload) {
  const lines = [];
  for (const button of [...(payload.interactiveButtons || []), ...(payload.buttons || [])]) {
    const params = parseButton(button);
    if (button.name === "single_select") {
      for (const section of params.sections || []) {
        if (section.title) lines.push("*" + section.title + "*");
        for (const row of section.rows || []) {
          if (!row.id) continue;
          lines.push("• " + (row.title || row.description || "Opção") + ": " + row.id);
        }
      }
    } else if (params.id || button.id) {
      lines.push("• " + (params.display_text || button.text || "Opção") + ": " + (params.id || button.id));
    } else if (params.url) {
      lines.push("• " + (params.display_text || "Link") + ": " + params.url);
    } else if (params.copy_code) {
      lines.push("• " + (params.display_text || "Copiar") + ": " + params.copy_code);
    }
  }
  return [...new Set(lines)];
}

function plainPayload(payload) {
  const { interactiveButtons, buttons, footer, aimode, text, caption, ...content } = payload;
  const choices = textChoices({ interactiveButtons, buttons });
  const parts = [text || caption || "", choices.length ? choices.join("\n") : ""];
  const body = parts.filter(Boolean).join("\n\n");
  if (content.image || content.video || content.document) return { ...content, caption: body };
  return { ...content, text: body };
}

async function sendInteractiveMessage(conn, jid, payload, options) {
  if (isTextOnly(jid)) return conn.sendMessage(jid, plainPayload(payload), options);
  return giftedInteractive(conn, jid, payload, options);
}

async function sendButtons(conn, jid, payload, options) {
  if (isTextOnly(jid)) return conn.sendMessage(jid, plainPayload(payload), options);
  return giftedButtons(conn, jid, payload, options);
}

async function sendMessageWithUi(conn, jid, payload, options) {
  return conn.sendMessage(jid, isTextOnly(jid) ? plainPayload(payload) : payload, options);
}

module.exports = { isTextOnly, setTextOnly, plainPayload, sendInteractiveMessage, sendButtons, sendMessageWithUi };
