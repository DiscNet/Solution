const fs = require("fs");
const { exec } = require("child_process");
const webp = require("node-webpmux");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

const PACKNAME = `○֩�Lᴜᴋᴀ.ᴍᴏᴅᴢᴢ🍥҈

 ۩                                L͟u͟k͟a͟                                 🂱


      `;

const AUTHOR = `🔱҉⃤𝙾𝚠𝚗𝚎𝚛: 63 98467-3123 ꪜ
📍҉⃤𝐵𝑜𝑡: 63 99200-3562 ꪜ
🕋҉⃤ℒ𝓊𝓀𝒶ℳℴ𝒹𝓏𝓏 ꪜ`;

async function addMeta(file) {
  const img = new webp.Image();

  const json = {
    "sticker-pack-id": `${Math.floor(Math.random() * 90000) + 10000}`,
    "sticker-pack-name": PACKNAME,
    "sticker-pack-publisher": AUTHOR,
    emojis: ["✨", "🎨"]
  };

  const exifAttr = Buffer.from([
    0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,0x01,0x00,
    0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00
  ]);

  const jsonBuff = Buffer.from(JSON.stringify(json));
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);

  await img.load(file);
  img.exif = exif;
  await img.save(file);

  return fs.readFileSync(file);
}

module.exports = {
  name: "stickerwm",
  description: "Criar sticker com marca d'água",

  async execute(conn, msg, args, from) {
    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo;

      if (!quoted?.quotedMessage?.imageMessage) {
        return await conn.sendMessage(
          from,
          { text: "❌ Responda uma imagem com .stickerwm texto" },
          { quoted: msg }
        );
      }

      // 🔒 evitar quebrar ffmpeg
      const textoMarca = (args.join(" ") || "Luka Modzz")
        .replace(/'/g, "")
        .replace(/:/g, "");

      await conn.sendMessage(
        from,
        { text: "⏳ Criando figurinha com marca d'água..." },
        { quoted: msg }
      );

      // 📥 baixar imagem corretamente
      const stream = await downloadContentFromMessage(
        quoted.quotedMessage.imageMessage,
        "image"
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const input = "./temp_in.png";
      const output = "./temp_out.webp";

      fs.writeFileSync(input, buffer);

      // 🎨 comando completo (UMA LINHA!!)
      const cmd = `ffmpeg -i ${input} -vf "drawtext=text='${textoMarca}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-40:borderw=3:bordercolor=black:shadowcolor=black:shadowx=2:shadowy=2,scale=512:512:force_original_aspect_ratio=decrease" -vcodec libwebp -lossless 1 -qscale 50 -preset default -loop 0 -an -vsync 0 ${output}`;

      await new Promise((resolve, reject) => {
        exec(cmd, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 🔥 adicionar metadata (IGUAL .s)
      const finalSticker = await addMeta(output);

      await conn.sendMessage(
        from,
        { sticker: finalSticker },
        { quoted: msg }
      );

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key }
      });

      // 🧹 limpar
      fs.unlinkSync(input);
      fs.unlinkSync(output);

    } catch (error) {
      console.error(error);

      await conn.sendMessage(
        from,
        { text: "❌ Erro ao criar figurinha com marca d'água!" },
        { quoted: msg }
      );
    }
  }
};