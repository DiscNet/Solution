const { createStatusQuoted } = require("../../functions/statusCard");
// commands/midia/gsbrat2.js
const { exec } = require('child_process');
const { promisify } = require('util');
const { existsSync, mkdirSync, unlinkSync, writeFileSync, readFileSync } = require('fs');
const { join } = require('path');
const config = require("../../config/config");
const webp = require("node-webpmux");

const execPromise = promisify(exec);

const PACKNAME = `Created by LᴜᴋᴀMᴏᴅᴢᴢ Rᴏʙᴏᴛ\nDev & Owner: Kxʟʏɴ\n`;
const AUTHOR = `\nBᴏᴛ: +55 (63) 9200-3562\nMy hatred shall build empires.`;

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function addStickerMetadata(mediaBuffer, packname, author) {
  const tempInput = join(__dirname, "..", "..", "temp", `meta_in_${Date.now()}.webp`);
  const tempOutput = join(__dirname, "..", "..", "temp", `meta_out_${Date.now()}.webp`);
  const tempDir = join(__dirname, "..", "..", "temp");
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

  writeFileSync(tempInput, mediaBuffer);

  try {
    const img = new webp.Image();
    const json = {
      "sticker-pack-id": `${getRandomNumber(10000, 99999)}`,
      "sticker-pack-name": packname,
      "sticker-pack-publisher": author,
      emojis: ["✨", "🎨"]
    };
    const exifAttr = Buffer.from([0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    await img.load(tempInput);
    img.exif = exif;
    await img.save(tempOutput);
    const result = readFileSync(tempOutput);
    unlinkSync(tempInput);
    unlinkSync(tempOutput);
    return result;
  } catch (e) {
    try { if (existsSync(tempInput)) unlinkSync(tempInput); } catch (_) {}
    try { if (existsSync(tempOutput)) unlinkSync(tempOutput); } catch (_) {}
    throw e;
  }
}

function processText(text) {
  const words = text.split(' ');
  const totalChars = text.length;
  let charsPerLine;
  if (totalChars <= 6) charsPerLine = totalChars;
  else if (totalChars <= 10) charsPerLine = Math.ceil(totalChars / 2);
  else charsPerLine = 9;

  let lines = [], currentLine = '';
  for (const w of words) {
    const t = currentLine + (currentLine ? ' ' : '') + w;
    if (t.length > charsPerLine && currentLine) { lines.push(currentLine); currentLine = w; }
    else currentLine = t;
  }
  if (currentLine) lines.push(currentLine);
  if (!lines.length) lines = ['brat'];

  let fontSize;
  if (lines.length === 1) fontSize = 110;
  else if (lines.length === 2) fontSize = 90;
  else if (lines.length === 3) fontSize = 72;
  else if (lines.length === 4) fontSize = 58;
  else if (lines.length === 5) fontSize = 48;
  else fontSize = 34;

  const allWords = [];
  for (const l of lines) allWords.push(...l.split(' '));
  return { lines, fontSize, allWords, charsPerLine };
}

module.exports = {
  name: "gsbrat2",
  description: "🎨 ғɪɢᴜʀɪɴʜᴀ ᴀɴɪᴍᴀᴅᴀ ʙʀᴀᴛ ᴄᴏᴍ ᴅᴏɪs ᴛᴇxᴛᴏs |",

  async execute(conn, msg, args, from) {
    try {
      const owner = config.ownerName || "LukaModzz";
      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (_) { pushName = "LukaModzz"; }

      const parts = (args.join(' ') || 'brat | brat').split('|').map(t => t.trim());
      const text1 = parts[0] || 'brat';
      const text2 = parts[1] || 'brat';

      const tempDir = join(__dirname, '..', '..', 'temp');
      if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
      const outputPath = join(tempDir, `gsbrat2_${Date.now()}.webp`);

      const d1 = processText(text1), d2 = processText(text2);
      const frames = [];

      const makeFrame = async (lines, fontSize, prefix, idx) => {
        const fp = join(tempDir, `${prefix}_${idx}.png`);
        const ft = join(tempDir, `${prefix}_t_${idx}.txt`);
        writeFileSync(ft, lines.join('\n'), 'utf8');
        await execPromise(`ffmpeg -f lavfi -i color=c=white:s=540x540:d=1 -vf "drawtext=textfile='${ft.replace(/'/g,"'\\''")}':fontcolor=black@1.0:fontsize=${fontSize}:x=15:y=(h-text_h)/2:line_spacing=10,boxblur=3:2,scale=1080:1080:flags=neighbor" -frames:v 1 -y "${fp}"`, {timeout:10000});
        return fp;
      };

      // 🔥 TEXTO 1: aparece palavra por palavra
      for (let i = 0; i < d1.allWords.length; i++) {
        const cw = d1.allWords.slice(0, i + 1);
        let dl = [], tl = '';
        for (const w of cw) {
          const t = tl + (tl ? ' ' : '') + w;
          if (t.length > d1.charsPerLine && tl) { dl.push(tl); tl = w; }
          else tl = t;
        }
        if (tl) dl.push(tl);
        const fp = await makeFrame(dl, d1.fontSize, 'gs2_a', i);
        frames.push({ path: fp, dur: 0.3 });
      }
      // Pausa no texto 1 completo
      const fp1full = await makeFrame(d1.lines, d1.fontSize, 'gs2_t1full', 0);
      frames.push({ path: fp1full, dur: 0.8 });

      // 🔥 TEXTO 2: aparece palavra por palavra (direto, sem tela branca)
      for (let i = 0; i < d2.allWords.length; i++) {
        const cw = d2.allWords.slice(0, i + 1);
        let dl = [], tl = '';
        for (const w of cw) {
          const t = tl + (tl ? ' ' : '') + w;
          if (t.length > d2.charsPerLine && tl) { dl.push(tl); tl = w; }
          else tl = t;
        }
        if (tl) dl.push(tl);
        const fp = await makeFrame(dl, d2.fontSize, 'gs2_b', i);
        frames.push({ path: fp, dur: 0.3 });
      }
      // Pausa no texto 2 completo
      const fp2full = await makeFrame(d2.lines, d2.fontSize, 'gs2_t2full', 0);
      frames.push({ path: fp2full, dur: 1.5 });

      // Concatena WebP
      let inputs = '', filters = '', count = 0;
      for (const f of frames) {
        inputs += ` -loop 1 -t ${f.dur} -i "${f.path}"`;
        filters += `[${count}:v]setpts=PTS-STARTPTS,setdar=1/1[v${count}];`;
        count++;
      }
      filters += ' ';
      for (let i = 0; i < count; i++) filters += `[v${i}]`;
      filters += `concat=n=${count}:v=1:a=0,scale=512:512,fps=8`;

      await execPromise(`ffmpeg${inputs} -filter_complex "${filters}" -c:v libwebp -lossless 0 -q:v 70 -preset default -loop 0 -an -y "${outputPath}"`, {timeout:25000});

      if (!existsSync(outputPath)) throw new Error('WebP não criado');

      const buf = readFileSync(outputPath);
      const final = await addStickerMetadata(buf, PACKNAME, AUTHOR);

      await conn.sendMessage(from, {
        sticker: final,
        mimetype: "image/webp",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
      }, {
        quoted: createStatusQuoted(msg)
      });

      await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } });

      setTimeout(() => {
        try { unlinkSync(outputPath); } catch(_) {}
        for (const f of frames) try { unlinkSync(f.path); } catch(_) {}
      }, 5000);

    } catch (e) {
      console.error("Erro gsbrat2:", e);
      await conn.sendMessage(from, { text: "❌ ᴇʀʀᴏ ᴀᴏ ᴄʀɪᴀʀ ғɪɢᴜʀɪɴʜᴀ!" }, { quoted: msg });
    }
  }
};