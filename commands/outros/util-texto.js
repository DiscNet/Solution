// Menu: Utilidades - Texto/Conversores
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const FormData = require("form-data");
const kit = require("../../functions/utilityKit");
const { createStatusQuoted } = require("../../functions/statusCard");

function chunks(text, max = 180) {
  const out = [];
  let rest = text.trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf(" ", max);
    if (cut < max / 2) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

const commands = [
  kit.makeCommand({
    name: "ocr", section: "Texto",
    usage: "ocr (responda à imagem)",
    async execute(conn, msg, args, from) {
      try {
        const media = await kit.downloadMedia(msg);
        if (!["image", "sticker"].includes(media.type)) throw kit.userError("Responda a uma imagem para extrair o texto.");
        await kit.withTempDir(async (dir) => {
          const input = path.join(dir, "entrada.png");
          await sharp(media.buffer).rotate().png().toFile(input);
          const text = String(await kit.run("tesseract", [input, "stdout", "-l", "por+eng", "--psm", "6"], { timeout: 60000 })).trim();
          if (!text) throw kit.userError("Não encontrei texto legível nessa imagem.");
          await kit.reply(conn, msg, from, `📝 *Texto detectado*\n\n${text.slice(0, 12000)}`);
        }, "grimm-ocr-");
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível ler o texto da imagem."); }
    },
  }),

  kit.makeCommand({
    name: "qrcode", section: "Conversores", usage: "qrcode [texto/link]",
    async execute(conn, msg, args, from) {
      try {
        const text = kit.inputText(msg, args);
        if (!text) throw kit.userError("Informe um texto/link ou responda a uma mensagem.");
        if (text.length > 1800) throw kit.userError("O conteúdo é grande demais para um QR Code útil.");
        await kit.withTempDir(async (dir) => {
          const out = path.join(dir, "qr.png");
          await kit.run("qrencode", ["-o", out, "-s", "8", "-m", "2", text]);
          await conn.sendMessage(from, { image: await fsp.readFile(out), caption: "🧊 QR Code gerado." }, { quoted: createStatusQuoted(msg) });
        }, "grimm-qr-");
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível criar o QR Code."); }
    },
  }),

  kit.makeCommand({
    name: "lerqr", section: "Conversores", usage: "lerqr (responda ao QR)",
    async execute(conn, msg, args, from) {
      try {
        const media = await kit.downloadMedia(msg);
        if (!["image", "sticker"].includes(media.type)) throw kit.userError("Responda a uma imagem contendo um QR Code.");
        await kit.withTempDir(async (dir) => {
          const input = path.join(dir, "qr.png");
          await sharp(media.buffer).rotate().png().toFile(input);
          const text = String(await kit.run("zbarimg", ["--quiet", "--raw", input])).trim();
          if (!text) throw kit.userError("Nenhum QR Code legível foi encontrado.");
          await kit.reply(conn, msg, from, `🔎 *Conteúdo do QR*\n\n${text.slice(0, 8000)}`);
        }, "grimm-scanqr-");
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível ler o QR Code."); }
    },
  }),

  kit.makeCommand({
    name: "traduzir", section: "Texto", usage: "traduzir [idioma] [texto]",
    async execute(conn, msg, args, from, http) {
      try {
        let target = "pt";
        let textArgs = [...args];
        if (/^[a-z]{2,5}(?:-[a-z]{2})?$/i.test(textArgs[0] || "")) target = textArgs.shift();
        const text = kit.inputText(msg, textArgs);
        if (!text) throw kit.userError("Ex.: .traduzir en bom dia — ou responda a uma mensagem.");
        if (text.length > 5000) throw kit.userError("O texto deve ter no máximo 5000 caracteres.");
        const { data } = await http.get("https://translate.googleapis.com/translate_a/single", {
          params: { client: "gtx", sl: "auto", tl: target, dt: "t", q: text }, timeout: 12000,
        });
        const translated = (data?.[0] || []).map((x) => x?.[0] || "").join("").trim();
        if (!translated) throw new Error("resposta vazia");
        await kit.reply(conn, msg, from, `🌐 *Tradução → ${target}*\n\n${translated}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível traduzir agora."); }
    },
  }),

  kit.makeCommand({
    name: "corrigir", section: "Texto", usage: "corrigir [texto]",
    async execute(conn, msg, args, from, http) {
      try {
        const text = kit.inputText(msg, args);
        if (!text) throw kit.userError("Informe um texto ou responda a uma mensagem.");
        if (text.length > 5000) throw kit.userError("O texto deve ter no máximo 5000 caracteres.");
        const body = new URLSearchParams({ text, language: "pt-BR" });
        const { data } = await http.post("https://api.languagetool.org/v2/check", body.toString(), {
          headers: { "content-type": "application/x-www-form-urlencoded" }, timeout: 15000,
        });
        let corrected = text;
        const matches = (data?.matches || []).filter((m) => m.replacements?.[0]?.value).sort((a, b) => b.offset - a.offset);
        for (const m of matches) corrected = corrected.slice(0, m.offset) + m.replacements[0].value + corrected.slice(m.offset + m.length);
        const count = matches.length;
        await kit.reply(conn, msg, from, `✍️ *Texto corrigido* (${count} ajuste${count === 1 ? "" : "s"})\n\n${corrected}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível corrigir o texto agora."); }
    },
  }),

  kit.makeCommand({
    name: "tts", section: "Conversores", usage: "tts [texto]",
    async execute(conn, msg, args, from, http) {
      try {
        const text = kit.inputText(msg, args);
        if (!text) throw kit.userError("Informe um texto ou responda a uma mensagem.");
        if (text.length > 1200) throw kit.userError("Use no máximo 1200 caracteres por áudio.");
        await kit.withTempDir(async (dir) => {
          const parts = chunks(text);
          const files = [];
          for (let i = 0; i < parts.length; i++) {
            const file = path.join(dir, `parte-${i}.mp3`);
            const { data } = await http.get("https://translate.googleapis.com/translate_tts", {
              params: { ie: "UTF-8", client: "tw-ob", tl: "pt-BR", q: parts[i] }, responseType: "arraybuffer", timeout: 15000,
              headers: { "user-agent": "Mozilla/5.0" },
            });
            await fsp.writeFile(file, Buffer.from(data));
            files.push(file);
          }
          let output = files[0];
          if (files.length > 1) {
            const list = path.join(dir, "lista.txt");
            await fsp.writeFile(list, files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"));
            output = path.join(dir, "voz.mp3");
            await kit.run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", output]);
          }
          await conn.sendMessage(from, { audio: await fsp.readFile(output), mimetype: "audio/mpeg", ptt: false }, { quoted: createStatusQuoted(msg) });
        }, "grimm-tts-");
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível gerar o áudio."); }
    },
  }),

  kit.makeCommand({
    name: "transcrever", section: "Conversores", usage: "transcrever (responda ao áudio)",
    async execute(conn, msg, args, from, http) {
      try {
        const media = await kit.downloadMedia(msg);
        if (!["audio", "video", "document"].includes(media.type)) throw kit.userError("Responda a um áudio, vídeo ou arquivo de áudio.");
        const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) throw kit.userError("Configure GROQ_API_KEY ou OPENAI_API_KEY no ambiente para usar transcrição.");
        if (media.buffer.length > 24 * 1024 * 1024) throw kit.userError("O arquivo deve ter menos de 24 MB.");
        const form = new FormData();
        form.append("file", media.buffer, { filename: media.fileName || "audio.ogg", contentType: media.mimetype || "audio/ogg" });
        const groq = Boolean(process.env.GROQ_API_KEY);
        form.append("model", groq ? "whisper-large-v3-turbo" : "whisper-1");
        form.append("language", "pt");
        const url = groq ? "https://api.groq.com/openai/v1/audio/transcriptions" : "https://api.openai.com/v1/audio/transcriptions";
        const { data } = await http.post(url, form, { headers: { ...form.getHeaders(), Authorization: `Bearer ${apiKey}` }, timeout: 90000, maxBodyLength: Infinity });
        const text = String(data?.text || "").trim();
        if (!text) throw new Error("transcrição vazia");
        await kit.reply(conn, msg, from, `🎙️ *Transcrição*\n\n${text.slice(0, 12000)}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível transcrever o áudio."); }
    },
  }),

  kit.makeCommand({
    name: "hash", section: "Ferramentas", usage: "hash [sha256|sha1|md5] [texto/mídia]",
    async execute(conn, msg, args, from) {
      try {
        const allowed = new Set(["sha256", "sha1", "md5"]);
        let algorithm = "sha256";
        const rest = [...args];
        if (allowed.has((rest[0] || "").toLowerCase())) algorithm = rest.shift().toLowerCase();
        let data;
        const media = kit.mediaInfo(msg);
        if (media) data = (await kit.downloadMedia(msg)).buffer;
        else data = Buffer.from(kit.inputText(msg, rest));
        if (!data.length) throw kit.userError("Informe um texto ou responda a uma mídia.");
        const digest = crypto.createHash(algorithm).update(data).digest("hex");
        await kit.reply(conn, msg, from, `#️⃣ *${algorithm.toUpperCase()}*\n\n${digest}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível calcular o hash."); }
    },
  }),
];

module.exports = commands;
