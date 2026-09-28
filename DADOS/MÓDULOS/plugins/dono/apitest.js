const config = require("../../../config/config");
const https = require("https");
const tokitoApi = require("../../functions/apiClient");

const tokitoV10Agent = new https.Agent({
  keepAlive: true,
  maxSockets: 8,
  maxFreeSockets: 4,
});

function header(response, name) {
  return String(response?.headers?.[name] || response?.headers?.[name.toLowerCase()] || "").trim();
}

function summarize(response, index) {
  const type = header(response, "content-type") || "desconhecido";
  const server = header(response, "server") || "não informado";
  const requestId =
    header(response, "cf-ray") ||
    header(response, "x-request-id") ||
    "não informado";
  const size = Buffer.isBuffer(response?.data)
    ? response.data.length
    : Buffer.byteLength(String(response?.data || ""));

  return [
    `${index}ª chamada: HTTP ${response?.status || "?"}`,
    `Tipo: ${type}`,
    `Servidor: ${server}`,
    `ID: ${requestId}`,
    `Tamanho: ${size} bytes`,
  ].join("\n");
}

function buildProbeUrl() {
  return tokitoApi.url("/api/stickers/brat-img", {
    text: "solution-api-test-" + Date.now(),
  });
}

function inspectGeneratedUrl(target, cfg) {
  const parsed = new URL(target);
  const values = parsed.searchParams.getAll("apikey");
  const sentKey = values[0] || "";
  return {
    count: values.length,
    exactMatch: sentKey === cfg.apiKey,
    sentLength: sentKey.length,
  };
}

async function probeRaw(target) {
  return tokitoApi.rawAxios.get(target, {
    responseType: "arraybuffer",
    timeout: 30000,
    validateStatus: () => true,
  });
}

async function probeV10(target = buildProbeUrl()) {
  return tokitoApi.axios.get(target, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: tokitoApi.TOKITO_HEADERS,
    validateStatus: () => true,
  });
}

async function probeV10Ia(target = buildProbeUrl()) {
  return tokitoApi.rawAxios.get(target, {
    responseType: "arraybuffer",
    timeout: 30000,
    headers: {
      accept: "application/json",
      "user-agent": "TokitoBot/10",
    },
    httpsAgent: tokitoV10Agent,
    validateStatus: () => true,
  });
}

function probeNativeV10(target) {
  return new Promise((resolve, reject) => {
    const req = https.get(target, {
      timeout: 30000,
      headers: tokitoApi.TOKITO_HEADERS,
    }, response => {
      const chunks = [];
      response.on("data", chunk => chunks.push(Buffer.from(chunk)));
      response.on("end", () => {
        resolve({
          status: response.statusCode,
          headers: response.headers || {},
          data: Buffer.concat(chunks),
        });
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("Timeout no HTTPS nativo"));
    });
    req.on("error", reject);
  });
}

module.exports = {
  permissions: { owner: true },
  name: "apitest",
  aliases: ["tokitotest", "testapi"],
  menuCategory: "Dono",
  menuSection: "Sistema",
  usage: "apitest",
  description: "Diagnostica duas chamadas consecutivas à Tokito API sem exibir a chave.",

  async execute(conn, msg, args, from) {
    try {
      await conn.sendMessage(from, {
        react: { text: "🔎", key: msg.key },
      }).catch(() => {});

      const cfg = tokitoApi.settings();
      if (!cfg.apiKey) {
        return conn.sendMessage(from, {
          text: "❌ API Tokito não configurada neste processo.",
        }, { quoted: msg });
      }

      const generatedUrl = buildProbeUrl();
      const urlCheck = inspectGeneratedUrl(generatedUrl, cfg);
      const publicStatusUrl = cfg.baseUrl + "/status";

      const publicRaw = await probeRaw(publicStatusUrl);
      const publicV10 = await probeV10(publicStatusUrl);
      const publicV10Ia = await probeV10Ia(publicStatusUrl);
      const first = await probeV10(generatedUrl);
      const second = await probeV10(buildProbeUrl());
      const native = await probeNativeV10(buildProbeUrl());

      let diagnosis =
        "As respostas foram diferentes do padrão esperado; compare os códigos abaixo.";

      if (
        publicRaw.status === 403 &&
        publicV10.status >= 200 && publicV10.status < 300
      ) {
        diagnosis =
          "O perfil HTTP oficial do Tokito V10 passou enquanto a chamada crua foi bloqueada. O cliente do bot foi alinhado ao V10 e este era o ponto que faltava.";
      } else if (
        publicRaw.status === 403 &&
        publicV10.status === 403 &&
        publicV10Ia.status === 403 &&
        first.status === 403 &&
        native.status === 403
      ) {
        diagnosis =
          "Mesmo o perfil oficial do Tokito V10 foi bloqueado pelo Cloudflare neste ambiente. Isso indica bloqueio da origem/IP/rede antes da API; a chave e a montagem da requisição não são a causa.";
      } else if (
        publicV10.status >= 200 && publicV10.status < 300 &&
        first.status === 403
      ) {
        diagnosis =
          "O perfil V10 acessa o domínio, mas a rota autenticada foi recusada. Nesse caso, o bloqueio está ligado à rota, conta/chave/plano ou regra específica da API.";
      } else if (
        first.status >= 200 && first.status < 300 &&
        second.status >= 200 && second.status < 300
      ) {
        diagnosis =
          "As chamadas autenticadas passaram usando o mesmo perfil HTTP do Tokito V10.";
      }

      const text = [
        "🧪 *DIAGNÓSTICO TOKITO API*",
        "",
        `Chave carregada de: *${cfg.source}*`,
        `Tamanho da chave: *${cfg.keyLength} caracteres*`,
        `Fingerprint SHA-256: *${cfg.keyFingerprint || "vazio"}*`,
        `Base: *${cfg.baseUrl}*`,
        `User-Agent: *${tokitoApi.TOKITO_HEADERS["User-Agent"]}*`,
        `Accept: *${tokitoApi.TOKITO_HEADERS.accept}*`,
        `Parâmetro apikey na URL: *${urlCheck.count}x*`,
        `Chave enviada = chave carregada: *${urlCheck.exactMatch ? "SIM" : "NÃO"}*`,
        `Tamanho enviado: *${urlCheck.sentLength} caracteres*`,
        "",
        "*Conectividade pública — chamada crua*",
        summarize(publicRaw, "RAW"),
        "",
        "*Conectividade pública — cliente de downloads V10*",
        summarize(publicV10, "V10-DL"),
        "",
        "*Conectividade pública — cliente IA V10*",
        summarize(publicV10Ia, "V10-IA"),
        "",
        "*Rota autenticada — padrão Tokito V10*",
        summarize(first, 1),
        "",
        summarize(second, 2),
        "",
        "*Mesma rota via HTTPS nativo + headers V10*",
        summarize(native, "NATIVO"),
        "",
        `Diagnóstico: ${diagnosis}`,
      ].join("\n");

      await conn.sendMessage(from, { text }, { quoted: msg });
      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      const info = tokitoApi.errorInfo(error);
      console.error("[API TEST]", info.status || "-", info.message);
      await conn.sendMessage(from, {
        text: tokitoApi.userError(error, "Falha ao diagnosticar a Tokito API."),
      }, { quoted: msg });
    }
  },
};
