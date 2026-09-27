const SMALLCAPS = Object.freeze({
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ", i: "ɪ",
  j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ",
  s: "s", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ"
});

function smallcaps(value) {
  return String(value ?? "").replace(/[a-z]/gi, char => SMALLCAPS[char.toLowerCase()] || char);
}

function adminRow(icon, label, value) {
  return `⎾${icon}⏌ ${smallcaps(label)}: ${value}`;
}

function adminCard(title, lines = []) {
  const edge = "┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄";
  return [
    `╭${edge}╮`,
    `├̬⌑ؔ͟ ⎾🧊⏌ *${smallcaps(title)}*`,
    ...lines.map(line => `├̬⌑ؔ͟ ${line}`),
    `╰${edge}╯`,
  ].join("\n");
}

function permissionMessage(code) {
  switch (code) {
    case "OWNER_ONLY": return "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ ᴇ́ ᴅɪsᴘᴏɴɪ́ᴠᴇʟ ᴀᴘᴇɴᴀs ᴘᴀʀᴀ ᴏ ᴅᴏɴᴏ.";
    case "GROUP_ONLY": return "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ sᴏ́ ᴘᴏᴅᴇ sᴇʀ ᴜsᴀᴅᴏ ᴇᴍ ɢʀᴜᴘᴏs.";
    case "PRIVATE_ONLY": return "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ sᴏ́ ᴘᴏᴅᴇ sᴇʀ ᴜsᴀᴅᴏ ɴᴏ ᴘᴠ.";
    case "ADMIN_ONLY": return "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ ᴇ́ ᴅɪsᴘᴏɴɪ́ᴠᴇʟ ᴀᴘᴇɴᴀs ᴘᴀʀᴀ ᴀᴅᴍɪɴs.";
    case "BOT_ADMIN_REQUIRED": return "❌ ᴏ ʙᴏᴛ ᴘʀᴇᴄɪsᴀ sᴇʀ ᴀᴅᴍɪɴ ᴘᴀʀᴀ ᴇxᴇᴄᴜᴛᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ.";
    default: return "❌ ᴠᴏᴄᴇ̂ ɴᴀ̃ᴏ ᴛᴇᴍ ᴘᴇʀᴍɪssᴀ̃ᴏ ᴘᴀʀᴀ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ.";
  }
}

async function reply(conn, msg, text, options = {}) {
  const from = options.from || msg?.key?.remoteJid;
  if (!from) throw new Error("UI_REPLY_NO_TARGET");
  const content = { text: String(text), ...(options.content || {}) };
  const sendOptions = { ...(options.sendOptions || {}) };
  if (options.quoted) sendOptions.quoted = options.quoted;
  return conn.sendMessage(from, content, sendOptions);
}

async function errorReply(conn, msg, text = "❌ ᴏᴄᴏʀʀᴇᴜ ᴜᴍ ᴇʀʀᴏ ᴀᴏ ᴇxᴇᴄᴜᴛᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ.", options = {}) {
  return reply(conn, msg, text, options);
}

module.exports = {
  SMALLCAPS,
  smallcaps,
  adminRow,
  adminCard,
  permissionMessage,
  reply,
  errorReply
};
