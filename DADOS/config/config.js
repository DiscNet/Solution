// config/config.js
module.exports = {
  botName: "GrimmJow",
  ownerName: "seuNome",
  ownerLid: "@lid",
  ownerNumber: "559999999999",
  botLid: "6@lid",
  pairingNumber: "559999999999",
  prefix: ".",

  // 🔥 NOVAS CONFIGURAÇÕES
  modoComando: "prefixo", // "prefixo" | "semPrefix" | "ambos"
  recarregarConfig: true, // true = recarrega config automaticamente

  // Segredos e chaves ficam em variáveis de ambiente no Railway/local.
  tokitoApiUrl: process.env.TOKITO_API_URL || process.env.API_URL || "https://tokito-apis.com.br",
  tokitoApi: process.env.TOKITO_API || process.env.TOKITO_API_KEY || process.env.API_KEY_TOKITO || "",
  tokitoLikeToken: process.env.TOKITO_LIKE_TOKEN || "",
  tokitoSalaToken: process.env.TOKITO_SALA_TOKEN || "",
  imagekitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  imagekitPublicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  imagekitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/3cki3c6xi/",
};
