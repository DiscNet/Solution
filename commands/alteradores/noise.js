// Menu: Alteradores - Imagem | Comando: noise
const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../config/config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

module.exports = {
  name: "noise",
  description: "ᴀᴅɪᴄɪᴏɴᴀ ʀᴜíᴅᴏ ɴᴀ ɪᴍᴀɢᴇᴍ",
  async execute(conn, msg, args, from) {
    try {
      const owner = config.ownerName || "LukaModzz";
      let pushName = "Usuário"; try { pushName = msg.pushName || "LukaModzz"; } catch (e) {}
      let imageBuffer = null;
      if (msg.message?.imageMessage) imageBuffer = await downloadMediaMessage(msg, "buffer", {}, {});
      else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        const q = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        imageBuffer = await downloadMediaMessage({ message: { imageMessage: q.imageMessage }, key: msg.key }, "buffer", {}, {});
      }
      if (!imageBuffer) return conn.sendMessage(from, { text: "❌ ᴇɴᴠɪᴇ ᴏᴜ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ ᴄᴏᴍ .noise" }, { quoted: msg });
      await conn.sendMessage(from, { react: { text: "📺", key: msg.key } });
      const d = path.join(__dirname, "..", "..", "temp"); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      const i = path.join(d, `ns_${Date.now()}.jpg`), o = path.join(d, `ns_${Date.now()}.jpg`);
      fs.writeFileSync(i, imageBuffer);
      await execPromise(`ffmpeg -y -i "${i}" -vf "noise=alls=20:allf=t+u,scale=512:512:force_original_aspect_ratio=decrease" "${o}"`);
      const b = fs.readFileSync(o);
      await conn.sendMessage(from, { image: b, caption: "📺 *Ruído*", contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } } }, { quoted: createStatusQuoted(msg) });
      try { fs.unlinkSync(i); fs.unlinkSync(o); } catch (e) {}
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (e) { console.error(e); }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Alteradores",
  "menuSection": "Imagem",
  "usage": "noise (responda à imagem)",
  "description": "Uso: .noise (responda à imagem)"
});
