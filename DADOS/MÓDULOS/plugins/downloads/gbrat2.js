// Menu: Downloads - Imagens | Comando: gbrat2
const { createStatusQuoted } = require("../../functions/statusCard");
// commands/midia/gbrat2.js
const { exec } = require('child_process');
const { promisify } = require('util');
const { existsSync, mkdirSync, unlinkSync, writeFileSync, readFileSync } = require('fs');
const { join } = require('path');
const config = require("../../../config/config");

const execPromise = promisify(exec);

module.exports = {
  name: "gbrat2",
  description: "🎨 ɢᴇʀᴀ ɢɪғ ʙʀᴀᴛ ᴄᴏᴍ ᴅᴏɪs ᴛᴇxᴛᴏs sᴇᴘᴀʀᴀᴅᴏs ᴘᴏʀ |",

  async execute(conn, msg, args, from) {
    try {
      const owner = config.ownerName || "LukaModzz";
      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      const fullText = args.join(' ') || 'brat | brat';

      // 🔥 Divide por |
      const parts = fullText.split('|').map(t => t.trim());
      const text1 = parts[0] || 'brat';
      const text2 = parts[1] || 'brat';

      const tempDir = join(__dirname, "..", "..", "..", "temp");
      if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

      const outputPath = join(tempDir, `gbrat2_${Date.now()}.mp4`);

      // 🔥 Função para processar um texto
      function processText(text) {
        const words = text.split(' ');
        const totalChars = text.length;

        let charsPerLine;
        if (totalChars <= 6) charsPerLine = totalChars;
        else if (totalChars <= 10) charsPerLine = Math.ceil(totalChars / 2);
        else charsPerLine = 9;

        let lines = [];
        let currentLine = '';
        for (const word of words) {
          const test = currentLine + (currentLine ? ' ' : '') + word;
          if (test.length > charsPerLine && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = test;
          }
        }
        if (currentLine) lines.push(currentLine);
        if (lines.length === 0) lines = ['brat'];

        let fontSize;
        if (lines.length === 1) fontSize = 110;
        else if (lines.length === 2) fontSize = 90;
        else if (lines.length === 3) fontSize = 72;
        else if (lines.length === 4) fontSize = 58;
        else if (lines.length === 5) fontSize = 48;
        else fontSize = 34;

        const allWords = [];
        for (const line of lines) allWords.push(...line.split(' '));

        return { lines, fontSize, allWords, charsPerLine };
      }

      const data1 = processText(text1);
      const data2 = processText(text2);

      console.log(`🎨 gBrat2: "${text1}" (${data1.allWords.length} palavras) → "${text2}" (${data2.allWords.length} palavras)`);

      const allFrames = [];

      // 🔥 PRIMEIRO TEXTO: aparece palavra por palavra
      for (let i = 0; i < data1.allWords.length; i++) {
        const currentWords = data1.allWords.slice(0, i + 1);
        let displayLines = [];
        let tempLine = '';
        for (const w of currentWords) {
          const test = tempLine + (tempLine ? ' ' : '') + w;
          if (test.length > data1.charsPerLine && tempLine) {
            displayLines.push(tempLine);
            tempLine = w;
          } else {
            tempLine = test;
          }
        }
        if (tempLine) displayLines.push(tempLine);

        const framePath = join(tempDir, `gbrat2_a_${i}.png`);
        const frameTextPath = join(tempDir, `gbrat2_ta_${i}.txt`);
        writeFileSync(frameTextPath, displayLines.join('\n'), 'utf8');

        await execPromise(`ffmpeg -f lavfi -i color=c=white:s=540x540:d=1 -vf "drawtext=textfile='${frameTextPath.replace(/'/g, "'\\''")}':fontcolor=black@1.0:fontsize=${data1.fontSize}:x=15:y=(h-text_h)/2:line_spacing=10,boxblur=3:2,scale=1080:1080:flags=neighbor" -frames:v 1 -y "${framePath}"`, { timeout: 10000 });
        allFrames.push({ path: framePath, duration: 0.3 });
      }

      // Frame completo do texto 1 (pausa)
      const last1Path = join(tempDir, `gbrat2_last1.png`);
      const text1Path = join(tempDir, `gbrat2_t1.txt`);
      writeFileSync(text1Path, data1.lines.join('\n'), 'utf8');
      await execPromise(`ffmpeg -f lavfi -i color=c=white:s=540x540:d=1 -vf "drawtext=textfile='${text1Path.replace(/'/g, "'\\''")}':fontcolor=black@1.0:fontsize=${data1.fontSize}:x=15:y=(h-text_h)/2:line_spacing=10,boxblur=3:2,scale=1080:1080:flags=neighbor" -frames:v 1 -y "${last1Path}"`, { timeout: 10000 });
      allFrames.push({ path: last1Path, duration: 1.0 });

      // 🔥 FRAME DE RESET (vazio)
      const resetPath = join(tempDir, `gbrat2_reset.png`);
      await execPromise(`ffmpeg -f lavfi -i color=c=white:s=540x540:d=1 -frames:v 1 -y "${resetPath}"`, { timeout: 5000 });
      allFrames.push({ path: resetPath, duration: 0.4 });

      // 🔥 SEGUNDO TEXTO: aparece palavra por palavra
      for (let i = 0; i < data2.allWords.length; i++) {
        const currentWords = data2.allWords.slice(0, i + 1);
        let displayLines = [];
        let tempLine = '';
        for (const w of currentWords) {
          const test = tempLine + (tempLine ? ' ' : '') + w;
          if (test.length > data2.charsPerLine && tempLine) {
            displayLines.push(tempLine);
            tempLine = w;
          } else {
            tempLine = test;
          }
        }
        if (tempLine) displayLines.push(tempLine);

        const framePath = join(tempDir, `gbrat2_b_${i}.png`);
        const frameTextPath = join(tempDir, `gbrat2_tb_${i}.txt`);
        writeFileSync(frameTextPath, displayLines.join('\n'), 'utf8');

        await execPromise(`ffmpeg -f lavfi -i color=c=white:s=540x540:d=1 -vf "drawtext=textfile='${frameTextPath.replace(/'/g, "'\\''")}':fontcolor=black@1.0:fontsize=${data2.fontSize}:x=15:y=(h-text_h)/2:line_spacing=10,boxblur=3:2,scale=1080:1080:flags=neighbor" -frames:v 1 -y "${framePath}"`, { timeout: 10000 });
        allFrames.push({ path: framePath, duration: 0.3 });
      }

      // Frame completo do texto 2 (final)
      const last2Path = join(tempDir, `gbrat2_last2.png`);
      const text2Path = join(tempDir, `gbrat2_t2.txt`);
      writeFileSync(text2Path, data2.lines.join('\n'), 'utf8');
      await execPromise(`ffmpeg -f lavfi -i color=c=white:s=540x540:d=1 -vf "drawtext=textfile='${text2Path.replace(/'/g, "'\\''")}':fontcolor=black@1.0:fontsize=${data2.fontSize}:x=15:y=(h-text_h)/2:line_spacing=10,boxblur=3:2,scale=1080:1080:flags=neighbor" -frames:v 1 -y "${last2Path}"`, { timeout: 10000 });
      allFrames.push({ path: last2Path, duration: 2.0 });
      allFrames.push({ path: last2Path, duration: 0.5 });

      // Cria arquivo de concatenação
      const concatFile = join(tempDir, 'concat.txt');
      let concatContent = '';
      for (const frame of allFrames) {
        concatContent += `file '${frame.path}'\nduration ${frame.duration}\n`;
      }
      concatContent += `file '${last2Path}'\n`;
      writeFileSync(concatFile, concatContent);

      // Combina em vídeo
      await execPromise(`ffmpeg -f concat -safe 0 -i "${concatFile}" -vf "fps=10,format=yuv420p" -c:v libx264 -preset ultrafast -crf 28 -pix_fmt yuv420p -an -y "${outputPath}"`, { timeout: 20000 });

      if (!existsSync(outputPath)) throw new Error('GIF não criado');

      const videoBuffer = readFileSync(outputPath);

      await conn.sendMessage(from, {
        video: videoBuffer,
        gifPlayback: true,
        caption: `🎨 *BRAT GIF*\n📝 ${text1} → ${text2}`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
      }, {
        quoted: createStatusQuoted(msg)
      });

      await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } });

      // Limpa
      setTimeout(() => {
        try { unlinkSync(outputPath); } catch(e) {}
        try { unlinkSync(concatFile); } catch(e) {}
        for (const frame of allFrames) {
          try { unlinkSync(frame.path); } catch(e) {}
        }
        try { unlinkSync(text1Path); } catch(e) {}
        try { unlinkSync(text2Path); } catch(e) {}
        try { unlinkSync(last1Path); } catch(e) {}
        try { unlinkSync(last2Path); } catch(e) {}
        try { unlinkSync(resetPath); } catch(e) {}
        for (let i = 0; i < Math.max(data1.allWords.length, data2.allWords.length); i++) {
          try { unlinkSync(join(tempDir, `gbrat2_ta_${i}.txt`)); } catch(e) {}
          try { unlinkSync(join(tempDir, `gbrat2_tb_${i}.txt`)); } catch(e) {}
        }
      }, 5000);

    } catch (error) {
      console.error("Erro gbrat2:", error);
      await conn.sendMessage(from, {
        text: "❌ ᴇʀʀᴏ ᴀᴏ ᴄʀɪᴀʀ ɢɪғ ʙʀᴀᴛ!",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Downloads",
  "menuSection": "Imagens",
  "usage": "gbrat2 texto1 | texto2",
  "description": "Uso: .gbrat2 texto1 | texto2"
});
