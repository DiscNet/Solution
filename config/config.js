// config/config.js
module.exports = {
  botName: "  ̵ ̵̲͞𝑮𝒓𝒊𝒎𝒎𝑱𝒐𝒘𝐁𝐎𝐓 \u0001だ",
  ownerName: "Kxʟʏɴ",
  ownerLid: "67203856621763@lid",
  ownerNumber: "556384673123",
  botLid: "275114834833576@lid",
  pairingNumber: "5563992003562",
  prefix: ".",

  // 🔥 NOVAS CONFIGURAÇÕES
  modoComando: "prefixo", // "prefixo" | "semPrefix" | "ambos"
  recarregarConfig: true, // true = recarrega config automaticamente

  // Segredos e chaves ficam em variáveis de ambiente no Railway/local.
  tokitoApiUrl: process.env.TOKITO_API_URL || "https://tokito-apis.com.br",
  tokitoApi: process.env.TOKITO_API || "tokito_aa8ec032609afb987ab771bb9bfc586d09e8",
  tokitoLikeToken: process.env.TOKEN_LIKE_FF || process.env.TOKITO_API || "",
  tokitoSalaToken: process.env.TOKEN_SALA || process.env.TOKITO_API || "",
  imagekitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  imagekitPublicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  imagekitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/3cki3c6xi/",
};
