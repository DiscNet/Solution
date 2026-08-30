const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../config/config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

module.exports = {
  name: "emboss",
  description: "Aplica efeito de relevo",
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
      if (!imageBuffer) return conn.sendMessage(from, { text: "❌ Envie ou responda a uma imagem com .emboss" }, { quoted: msg });
      await conn.sendMessage(from, { react: { text: "🗿", key: msg.key } });
      const d = path.join(__dirname, "..", "..", "temp"); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      const i = path.join(d, `em_${Date.now()}.jpg`), o = path.join(d, `em_${Date.now()}.jpg`);
      fs.writeFileSync(i, imageBuffer);
      await execPromise(`ffmpeg -y -i "${i}" -vf "edgedetect=low=0.1:high=0.3,negate,scale=512:512:force_original_aspect_ratio=decrease" "${o}"`);
      const b = fs.readFileSync(o);
      await conn.sendMessage(from, { image: b, caption: "🗿 *Relevo*", contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } } }, { quoted: createStatusQuoted(msg) });
      try { fs.unlinkSync(i); fs.unlinkSync(o); } catch (e) {}
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (e) { console.error(e); }
  }
};