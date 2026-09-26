// Identificação e uso de cada comando: gerada a partir das definições abaixo.
const { runTransform } = require("../../functions/mediaTransform");

function sc(text) {
  const map = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ғ", g: "ɢ", h: "ʜ",
    i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ",
    q: "ǫ", r: "ʀ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", y: "ʏ", z: "ᴢ"
  };
  return String(text).replace(/[A-Za-z]/g, (ch) => map[ch.toLowerCase()] || ch.toLowerCase());
}

const blownAudio =
  "volume=16dB,asoftclip=type=hard:threshold=0.22:output=0.95";
const blownAudioFallback =
  "volume=12dB,acrusher=bits=4:mode=log:mix=0.95:level_in=2:level_out=0.9";

const definitions = [
  {
    name: "reverter",
    aliases: ["areverse", "reverseaudio"],
    section: "Áudio",
    mediaType: "audio",
    input: "audio",
    output: "audio",
    audioFilter: "areverse",
    maxDuration: 120,
    help: "reverte o áudio do fim para o início",
  },
  {
    name: "lento",
    aliases: ["aslow"],
    section: "Áudio",
    mediaType: "audio",
    input: "audio",
    output: "audio",
    audioFilter: "atempo=0.75",
    help: "deixa o áudio mais lento",
  },
  {
    name: "rapido",
    aliases: ["aspeed", "rápido"],
    section: "Áudio",
    mediaType: "audio",
    input: "audio",
    output: "audio",
    audioFilter: "atempo=1.5",
    help: "acelera o áudio",
  },
  {
    name: "agudo",
    aliases: ["afinado"],
    section: "Áudio",
    mediaType: "audio",
    input: "audio",
    output: "audio",
    audioFilter: "aresample=48000,asetrate=60000,aresample=48000,atempo=0.8",
    help: "deixa a voz mais aguda sem mudar a duração",
  },
  {
    name: "grave",
    aliases: ["agravado"],
    section: "Áudio",
    mediaType: "audio",
    input: "audio",
    output: "audio",
    audioFilter: "aresample=48000,asetrate=38400,aresample=48000,atempo=1.25",
    help: "deixa a voz mais grave sem mudar a duração",
  },
  {
    name: "estourar",
    aliases: ["aestourado", "aestourar", "estourado"],
    section: "Áudio",
    mediaType: "audio",
    input: "audio",
    output: "audio",
    audioFilter: blownAudio,
    audioFilterFallback: blownAudioFallback,
    help: "aplica clipping e distorção forte de propósito",
  },
  {
    name: "eco",
    aliases: ["ecoaudio"],
    section: "Áudio",
    mediaType: "audio",
    input: "audio",
    output: "audio",
    audioFilter: "aecho=0.8:0.88:60:0.4",
    help: "adiciona eco ao áudio",
  },
  {
    name: "bass",
    aliases: ["bassaudio", "graves"],
    section: "Áudio",
    mediaType: "audio",
    input: "audio",
    output: "audio",
    audioFilter: "bass=g=12:f=110:w=0.6",
    help: "reforça os graves do áudio",
  },
  {
    name: "normalizar",
    aliases: ["normalizeaudio", "normalizaraudio"],
    section: "Áudio",
    mediaType: "audio",
    input: "audio",
    output: "audio",
    audioFilter: "loudnorm=I=-16:LRA=11:TP=-1.5",
    help: "normaliza o volume do áudio",
  },
  {
    name: "reverb",
    aliases: ["reverbaudio"],
    section: "Áudio",
    mediaType: "audio",
    input: "audio",
    output: "audio",
    audioFilter: "aecho=0.8:0.9:500:0.28",
    help: "adiciona reverberação ao áudio",
  },
  {
    name: "cortaraudio",
    aliases: [],
    section: "Áudio",
    mediaType: "audio",
    input: "audio",
    output: "audio",
    trim: true,
    help: "recorta um trecho do áudio",
  },

  {
    name: "revertervideo",
    aliases: ["vreverse"],
    section: "Vídeo",
    mediaType: "video",
    input: "video",
    output: "video",
    videoFilter: "reverse",
    audioFilter: "areverse",
    maxDuration: 90,
    help: "reverte vídeo e áudio do fim para o início",
  },
  {
    name: "videolento",
    aliases: ["vslow"],
    section: "Vídeo",
    mediaType: "video",
    input: "video",
    output: "video",
    videoFilter: "setpts=1.5*PTS",
    audioFilter: "atempo=0.6667",
    help: "deixa o vídeo e o áudio mais lentos",
  },
  {
    name: "videorapido",
    aliases: ["vspeed", "videorápido"],
    section: "Vídeo",
    mediaType: "video",
    input: "video",
    output: "video",
    videoFilter: "setpts=0.6667*PTS",
    audioFilter: "atempo=1.5",
    help: "acelera vídeo e áudio",
  },
  {
    name: "videopb",
    aliases: ["vpb"],
    section: "Vídeo",
    mediaType: "video",
    input: "video",
    output: "video",
    videoFilter: "hue=s=0",
    help: "converte o vídeo para preto e branco",
  },
  {
    name: "estourarvideo",
    aliases: ["vestourado"],
    section: "Vídeo",
    mediaType: "video",
    input: "video",
    output: "video",
    audioFilter: blownAudio,
    audioFilterFallback: blownAudioFallback,
    help: "estoura de propósito a faixa de áudio do vídeo",
  },
  {
    name: "extrairaudio",
    aliases: [],
    section: "Vídeo",
    mediaType: "video",
    input: "video",
    output: "audio",
    help: "extrai o áudio de um vídeo em mp3",
  },
  {
    name: "mutarvideo",
    aliases: [],
    section: "Vídeo",
    mediaType: "video",
    input: "video",
    output: "video",
    mute: true,
    help: "remove completamente o áudio do vídeo",
  },
  {
    name: "espelharvideo",
    aliases: [],
    section: "Vídeo",
    mediaType: "video",
    input: "video",
    output: "video",
    videoFilter: "hflip",
    help: "espelha o vídeo horizontalmente",
  },
  {
    name: "cortavideo",
    aliases: [],
    section: "Vídeo",
    mediaType: "video",
    input: "video",
    output: "video",
    trim: true,
    help: "recorta um trecho do vídeo",
  },
  {
    name: "comprimirvideo",
    aliases: [],
    section: "Vídeo",
    mediaType: "video",
    input: "video",
    output: "video",
    videoFilter: "scale='min(720,iw)':-2",
    crf: 32,
    help: "reduz tamanho e resolução do vídeo",
  },
  {
    name: "rotacionarvideo",
    aliases: [],
    section: "Vídeo",
    mediaType: "video",
    input: "video",
    output: "video",
    videoFilter: "transpose=1",
    help: "rotaciona o vídeo em noventa graus",
  },
];

if (definitions.length !== 22) {
  throw new Error(`Media alteradores expected 22 commands, got ${definitions.length}`);
}

function usageFor(definition) {
  const medium = definition.input === "audio" ? "áudio" : "vídeo";
  const trimArgs = definition.trim ? " início duração" : "";
  return `${definition.name}${trimArgs} (responda ao ${medium})`;
}

module.exports = definitions.map((definition) => ({
  name: definition.name,
  aliases: definition.aliases || [],
  description: sc(definition.help),
  mediaType: definition.mediaType,
  mediaDefinition: Object.freeze({ ...definition }),
  menuCategory: "Alteradores",
  menuSection: definition.section,
  usage: usageFor(definition),
  async execute(conn, msg, args, from, axiosInstance, requestedName) {
    return runTransform(definition, {
      conn,
      msg,
      args,
      from,
      axiosInstance,
      requestedName,
    });
  },
}));
