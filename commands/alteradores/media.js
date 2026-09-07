// Identificação e uso de cada comando: tabela menuMetadata no final deste arquivo.
const { runTransform } = require("../../functions/mediaTransform");

function sc(text) {
  const map = { a:"ᴀ",b:"ʙ",c:"ᴄ",d:"ᴅ",e:"ᴇ",f:"ғ",g:"ɢ",h:"ʜ",i:"ɪ",j:"ᴊ",k:"ᴋ",l:"ʟ",m:"ᴍ",n:"ɴ",o:"ᴏ",p:"ᴘ",q:"ǫ",r:"ʀ",t:"ᴛ",u:"ᴜ",v:"ᴠ",w:"ᴡ",y:"ʏ",z:"ᴢ" };
  return String(text).replace(/[A-Za-z]/g, (ch) => map[ch.toLowerCase()] || ch.toLowerCase());
}

const definitions = [
  { name:"areverse", mediaType:"audio", input:"audio", output:"audio", audioFilter:"areverse", maxDuration:120, help:"reverte o audio do fim para o inicio" },
  { name:"aslow", mediaType:"audio", input:"audio", output:"audio", audioFilter:"atempo=0.75", help:"deixa o audio mais lento" },
  { name:"aspeed", mediaType:"audio", input:"audio", output:"audio", audioFilter:"atempo=1.5", help:"acelera o audio" },
  { name:"afinado", mediaType:"audio", input:"audio", output:"audio", audioFilter:"asetrate=44100*1.25,aresample=44100,atempo=0.8", help:"deixa a voz mais aguda" },
  { name:"agravado", mediaType:"audio", input:"audio", output:"audio", audioFilter:"asetrate=44100*0.8,aresample=44100,atempo=1.25", help:"deixa a voz mais grave" },
  { name:"aestourado", mediaType:"audio", input:"audio", output:"audio", audioFilter:"volume=8,acompressor=threshold=-18dB:ratio=12:attack=5:release=50", help:"aplica volume extremo e compressao ao audio" },
  { name:"ecoaudio", mediaType:"audio", input:"audio", output:"audio", audioFilter:"aecho=0.8:0.88:60:0.4", help:"adiciona eco ao audio" },
  { name:"bassaudio", mediaType:"audio", input:"audio", output:"audio", audioFilter:"bass=g=10", help:"reforca os graves do audio" },
  { name:"normalizeaudio", mediaType:"audio", input:"audio", output:"audio", audioFilter:"loudnorm=I=-16:LRA=11:TP=-1.5", help:"normaliza o volume do audio" },
  { name:"reverbaudio", mediaType:"audio", input:"audio", output:"audio", audioFilter:"aecho=0.8:0.9:500:0.28", help:"adiciona reverberacao ao audio" },
  { name:"cortaraudio", mediaType:"audio", input:"audio", output:"audio", trim:true, help:"recorta um trecho do audio" },

  { name:"vreverse", mediaType:"video", input:"video", output:"video", videoFilter:"reverse", audioFilter:"areverse", maxDuration:90, help:"reverte video e audio do fim para o inicio" },
  { name:"vslow", mediaType:"video", input:"video", output:"video", videoFilter:"setpts=1.5*PTS", audioFilter:"atempo=0.6667", help:"deixa o video e o audio mais lentos" },
  { name:"vspeed", mediaType:"video", input:"video", output:"video", videoFilter:"setpts=0.6667*PTS", audioFilter:"atempo=1.5", help:"acelera video e audio" },
  { name:"vpb", mediaType:"video", input:"video", output:"video", videoFilter:"hue=s=0", help:"converte o video para preto e branco" },
  { name:"vestourado", mediaType:"video", input:"video", output:"video", audioFilter:"volume=8,acompressor=threshold=-18dB:ratio=12:attack=5:release=50", help:"estoura e comprime o audio do video" },
  { name:"extrairaudio", mediaType:"video", input:"video", output:"audio", help:"extrai o audio de um video em mp3" },
  { name:"mutarvideo", mediaType:"video", input:"video", output:"video", mute:true, help:"remove completamente o audio do video" },
  { name:"espelharvideo", mediaType:"video", input:"video", output:"video", videoFilter:"hflip", help:"espelha o video horizontalmente" },
  { name:"cortavideo", mediaType:"video", input:"video", output:"video", trim:true, help:"recorta um trecho do video" },
  { name:"comprimirvideo", mediaType:"video", input:"video", output:"video", videoFilter:"scale='min(720,iw)':-2", crf:32, help:"reduz tamanho e resolucao do video" },
  { name:"rotacionarvideo", mediaType:"video", input:"video", output:"video", videoFilter:"transpose=1", help:"rotaciona o video em noventa graus" }
];

if (definitions.length !== 22) throw new Error(`Media alteradores expected 22 commands, got ${definitions.length}`);

module.exports = definitions.map((definition) => ({
  name: definition.name,
  aliases: [],
  description: sc(definition.help),
  mediaType: definition.mediaType,
  mediaDefinition: Object.freeze({ ...definition }),
  async execute(conn, msg, args, from, axiosInstance, requestedName) {
    return runTransform(definition, { conn, msg, args, from, axiosInstance, requestedName });
  }
}));


const menuMetadata = {
  "areverse": {
    "menuCategory": "Alteradores",
    "menuSection": "Áudio",
    "usage": "areverse (responda ao áudio)",
    "description": "Uso: .areverse (responda ao áudio)"
  },
  "aslow": {
    "menuCategory": "Alteradores",
    "menuSection": "Áudio",
    "usage": "aslow (responda ao áudio)",
    "description": "Uso: .aslow (responda ao áudio)"
  },
  "aspeed": {
    "menuCategory": "Alteradores",
    "menuSection": "Áudio",
    "usage": "aspeed (responda ao áudio)",
    "description": "Uso: .aspeed (responda ao áudio)"
  },
  "afinado": {
    "menuCategory": "Alteradores",
    "menuSection": "Áudio",
    "usage": "afinado (responda ao áudio)",
    "description": "Uso: .afinado (responda ao áudio)"
  },
  "agravado": {
    "menuCategory": "Alteradores",
    "menuSection": "Áudio",
    "usage": "agravado (responda ao áudio)",
    "description": "Uso: .agravado (responda ao áudio)"
  },
  "aestourado": {
    "menuCategory": "Alteradores",
    "menuSection": "Áudio",
    "usage": "aestourado (responda ao áudio)",
    "description": "Uso: .aestourado (responda ao áudio)"
  },
  "ecoaudio": {
    "menuCategory": "Alteradores",
    "menuSection": "Áudio",
    "usage": "ecoaudio (responda ao áudio)",
    "description": "Uso: .ecoaudio (responda ao áudio)"
  },
  "bassaudio": {
    "menuCategory": "Alteradores",
    "menuSection": "Áudio",
    "usage": "bassaudio (responda ao áudio)",
    "description": "Uso: .bassaudio (responda ao áudio)"
  },
  "normalizeaudio": {
    "menuCategory": "Alteradores",
    "menuSection": "Áudio",
    "usage": "normalizeaudio (responda ao áudio)",
    "description": "Uso: .normalizeaudio (responda ao áudio)"
  },
  "reverbaudio": {
    "menuCategory": "Alteradores",
    "menuSection": "Áudio",
    "usage": "reverbaudio (responda ao áudio)",
    "description": "Uso: .reverbaudio (responda ao áudio)"
  },
  "cortaraudio": {
    "menuCategory": "Alteradores",
    "menuSection": "Áudio",
    "usage": "cortaraudio (responda ao áudio)",
    "description": "Uso: .cortaraudio (responda ao áudio)"
  },
  "vreverse": {
    "menuCategory": "Alteradores",
    "menuSection": "Vídeo",
    "usage": "vreverse (responda ao vídeo)",
    "description": "Uso: .vreverse (responda ao vídeo)"
  },
  "vslow": {
    "menuCategory": "Alteradores",
    "menuSection": "Vídeo",
    "usage": "vslow (responda ao vídeo)",
    "description": "Uso: .vslow (responda ao vídeo)"
  },
  "vspeed": {
    "menuCategory": "Alteradores",
    "menuSection": "Vídeo",
    "usage": "vspeed (responda ao vídeo)",
    "description": "Uso: .vspeed (responda ao vídeo)"
  },
  "vpb": {
    "menuCategory": "Alteradores",
    "menuSection": "Vídeo",
    "usage": "vpb (responda ao vídeo)",
    "description": "Uso: .vpb (responda ao vídeo)"
  },
  "vestourado": {
    "menuCategory": "Alteradores",
    "menuSection": "Vídeo",
    "usage": "vestourado (responda ao vídeo)",
    "description": "Uso: .vestourado (responda ao vídeo)"
  },
  "extrairaudio": {
    "menuCategory": "Alteradores",
    "menuSection": "Vídeo",
    "usage": "extrairaudio (responda ao vídeo)",
    "description": "Uso: .extrairaudio (responda ao vídeo)"
  },
  "mutarvideo": {
    "menuCategory": "Alteradores",
    "menuSection": "Vídeo",
    "usage": "mutarvideo (responda ao vídeo)",
    "description": "Uso: .mutarvideo (responda ao vídeo)"
  },
  "espelharvideo": {
    "menuCategory": "Alteradores",
    "menuSection": "Vídeo",
    "usage": "espelharvideo (responda ao vídeo)",
    "description": "Uso: .espelharvideo (responda ao vídeo)"
  },
  "cortavideo": {
    "menuCategory": "Alteradores",
    "menuSection": "Vídeo",
    "usage": "cortavideo início duração (responda ao vídeo)",
    "description": "Uso: .cortavideo início duração (responda ao vídeo)"
  },
  "comprimirvideo": {
    "menuCategory": "Alteradores",
    "menuSection": "Vídeo",
    "usage": "comprimirvideo (responda ao vídeo)",
    "description": "Uso: .comprimirvideo (responda ao vídeo)"
  },
  "rotacionarvideo": {
    "menuCategory": "Alteradores",
    "menuSection": "Vídeo",
    "usage": "rotacionarvideo (responda ao vídeo)",
    "description": "Uso: .rotacionarvideo (responda ao vídeo)"
  }
};
for (const command of module.exports) Object.assign(command, menuMetadata[command.name]);
