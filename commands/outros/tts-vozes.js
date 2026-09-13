// Vozes alternativas para o TTS.
// O .tts original continua disponível em util-texto.js.
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const kit = require("../../functions/utilityKit");
const { createStatusQuoted } = require("../../functions/statusCard");

function chunks(text, max = 180) {
  const out = [];
  let rest = String(text || "").trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf(" ", max);
    if (cut < max / 2) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

const voices = [
  {
    name: "tts2",
    label: "Voz grave",
    filter: "asetrate=36000,aresample=48000,atempo=1.333333"
  },
  {
    name: "tts3",
    label: "Voz aguda",
    filter: "asetrate=60000,aresample=48000,atempo=0.8"
  },
  {
    name: "tts4",
    label: "Voz rápida",
    filter: "atempo=1.2"
  },
  {
    name: "tts5",
    label: "Voz de rádio",
    filter: "highpass=f=300,lowpass=f=3400,acompressor=threshold=-18dB:ratio=3:attack=20:release=120"
  },
  {
    name: "tts6",
    label: "Voz robótica",
    filter: "aecho=0.8:0.88:35:0.35,highpass=f=180,lowpass=f=5000"
  }
];

async function googleTtsToFile(http, text, file) {
  const parts = chunks(text);
  const dir = path.dirname(file);
  const files = [];

  for (let i = 0; i < parts.length; i++) {
    const partFile = path.join(dir, `tts-parte-${i}.mp3`);
    const { data } = await http.get("https://translate.googleapis.com/translate_tts", {
      params: {
        ie: "UTF-8",
        client: "tw-ob",
        tl: "pt-BR",
        q: parts[i]
      },
      responseType: "arraybuffer",
      timeout: 15000,
      headers: { "user-agent": "Mozilla/5.0" }
    });

    await fsp.writeFile(partFile, Buffer.from(data));
    files.push(partFile);
  }

  if (files.length === 1) {
    await fsp.copyFile(files[0], file);
    return;
  }

  const list = path.join(dir, "tts-lista.txt");
  await fsp.writeFile(
    list,
    files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n")
  );

  await kit.run("ffmpeg", [
    "-hide_banner", "-loglevel", "error",
    "-f", "concat", "-safe", "0",
    "-i", list,
    "-c", "copy",
    file
  ]);
}

function makeVoiceCommand(profile) {
  return kit.makeCommand({
    name: profile.name,
    section: "Texto",
    usage: `${profile.name} [texto]`,
    description: `${profile.label}. Uso: .${profile.name} seu texto`,
    async execute(conn, msg, args, from, http) {
      try {
        const text = kit.inputText(msg, args);
        if (!text) throw kit.userError("Informe um texto ou responda a uma mensagem.");
        if (text.length > 1200) throw kit.userError("Use no máximo 1200 caracteres por áudio.");

        await kit.withTempDir(async (dir) => {
          const original = path.join(dir, "original.mp3");
          const output = path.join(dir, "voz.mp3");

          await googleTtsToFile(http, text, original);

          await kit.run("ffmpeg", [
            "-hide_banner", "-loglevel", "error",
            "-i", original,
            "-vn",
            "-af", profile.filter,
            "-codec:a", "libmp3lame",
            "-q:a", "4",
            output
          ], { timeout: 45000 });

          await conn.sendMessage(
            from,
            {
              audio: await fsp.readFile(output),
              mimetype: "audio/mpeg",
              ptt: false
            },
            { quoted: createStatusQuoted(msg) }
          );
        }, `grimm-${profile.name}-`);
      } catch (e) {
        await kit.fail(conn, msg, from, e, `Não foi possível gerar ${profile.label.toLowerCase()}.`);
      }
    }
  });
}

const commands = voices.map(makeVoiceCommand);

commands.push(kit.makeCommand({
  name: "ttsvozes",
  aliases: ["vozes", "vozes-tts"],
  section: "Texto",
  usage: "ttsvozes",
  description: "Lista as vozes disponíveis no TTS",
  async execute(conn, msg, args, from) {
    const list = [
      "• .tts — voz padrão",
      ...voices.map((voice) => `• .${voice.name} — ${voice.label}`)
    ].join("\n");

    await kit.reply(
      conn,
      msg,
      from,
      `🎙️ *VOZES TTS*\n\n${list}\n\n` +
      "Você também pode responder a uma mensagem usando qualquer uma dessas opções."
    );
  }
}));

module.exports = commands;
