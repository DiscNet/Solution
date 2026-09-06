const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../config/config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

module.exports = {
  name: "warm",
  description: "ᴀᴘʟɪᴄᴀ ᴇғᴇɪᴛᴏ ǫᴜᴇɴᴛᴇ",
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
      if (!imageBuffer) return conn.sendMessage(from, { text: "❌ ᴇɴᴠɪᴇ ᴏᴜ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ ᴄᴏᴍ .warm" }, { quoted: msg });
      await conn.sendMessage(from, { react: { text: "🔥", key: msg.key } });
      const d = path.join(__dirname, "..", "..", "temp"); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      const i = path.join(d, `w_${Date.now()}.jpg`), o = path.join(d, `w_${Date.now()}.jpg`);
      fs.writeFileSync(i, imageBuffer);
      await execPromise(`ffmpeg -y -i "${i}" -vf "eq=saturation=1.5:brightness=0.1,scale=512:512:force_original_aspect_ratio=decrease" "${o}"`);
      const b = fs.readFileSync(o);
      await conn.sendMessage(from, { image: b, caption: "🔥 *Quente*", contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } } }, { quoted: createStatusQuoted(msg) });
      try { fs.unlinkSync(i); fs.unlinkSync(o); } catch (e) {}
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (e) { console.error(e); }
  }
};