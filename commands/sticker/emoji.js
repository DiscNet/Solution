// Menu: Figurinhas - Texto | Comando: emoji
const fs = require("fs");
const axios = require("axios");
const { exec } = require("child_process");
const webp = require("node-webpmux");

const PACKNAME = `○֩�Lᴜᴋᴀ.ᴍᴏᴅᴢᴢ🍥҈

 ۩                                L͟u͟k͟a͟                                 🂱


      `;

const AUTHOR = `🔱҉⃤𝙾𝚠𝚗𝚎𝚛: 63 98467-3123 ꪜ
📍҉⃤𝐵𝑜𝑡: 63 99200-3562 ꪜ
🕋҉⃤ℒ𝓊𝓀𝒶ℳℴ𝒹𝓏𝓏 ꪜ`;

module.exports = {
  name: "emoji",

  async execute(conn, msg, args, from) {
    try {
      const emoji = args[0];
      if (!emoji) return;

      const code = [...emoji].map(e => e.codePointAt(0).toString(16)).join("-");
      const url = `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512.png`;

      const res = await axios.get(url, { responseType: "arraybuffer" });

      fs.writeFileSync("in.png", res.data);

      await new Promise((resolve, reject) => {
        exec(`ffmpeg -i in.png -vf "scale=512:512:force_original_aspect_ratio=decrease" -vcodec libwebp -lossless 1 -qscale 50 -preset default -loop 0 -an -vsync 0 out.webp`,
        (e)=> e ? reject(e) : resolve());
      });

      const img = new webp.Image();

      const json = {
        "sticker-pack-id": `${Math.floor(Math.random() * 90000) + 10000}`,
        "sticker-pack-name": PACKNAME,
        "sticker-pack-publisher": AUTHOR,
        emojis: ["✨","🎨"]
      };

      const exifAttr = Buffer.from([
        0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,0x01,0x00,
        0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00
      ]);

      const jsonBuff = Buffer.from(JSON.stringify(json));
      const exif = Buffer.concat([exifAttr, jsonBuff]);
      exif.writeUIntLE(jsonBuff.length, 14, 4);

      await img.load("out.webp");
      img.exif = exif;
      await img.save("out.webp");

      const final = fs.readFileSync("out.webp");

      await conn.sendMessage(from, { sticker: final }, { quoted: msg });

      fs.unlinkSync("in.png");
      fs.unlinkSync("out.webp");

    } catch (e) {
      console.log(e);
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Figurinhas",
  "menuSection": "Texto",
  "usage": "emoji emoji",
  "description": "Uso: .emoji emoji"
});
