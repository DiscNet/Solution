const config = require("../../../config/config");
const https = require("https");
const tokitoApi = require("../../functions/apiClient");

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

async function probeAxios(target = buildProbeUrl()) {
  return tokitoApi.axios.get(target, {
    responseType: "arraybuffer",
    timeout: 30000,
    validateStatus: () => true,
  });
}

function probeNative(target) {
  return new Promise((resolve, reject) => {
    const req = https.get(target, { timeout: 30000 }, response => {
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

      const publicStatus = await probeAxios(publicStatusUrl);
      const first = await probeAxios(generatedUrl);
      const second = await probeAxios(buildProbeUrl());
      const native = await probeNative(buildProbeUrl());

      let diagnosis =
        "As respostas foram diferentes do padrão esperado; compare os códigos abaixo.";

      if (
        publicStatus.status >= 200 && publicStatus.status < 300 &&
        first.status === 403 && native.status === 403
      ) {
        diagnosis =
          "O domínio está acessível, mas a rota /api/* é bloqueada pelo Cloudflare tanto no Axios quanto no HTTPS nativo. Isso aponta para regra/proteção da API ou bloqueio do ambiente/IP antes da autenticação.";
      }

      else if (first.status >= 200 && first.status < 300 && second.status === 403) {
        diagnosis =
          "A primeira chamada passou e a segunda foi bloqueada. Isso indica bloqueio/controle do lado da API para chamadas consecutivas.";
      } else if (first.status === 403 && second.status === 403) {
        diagnosis =
          "As duas chamadas foram recusadas. A chave está sendo carregada, mas o acesso da rota foi bloqueado ou recusado pela API.";
      } else if (
        first.status >= 200 && first.status < 300 &&
        second.status >= 200 && second.status < 300
      ) {
        diagnosis =
          "As duas chamadas passaram. O cliente HTTP está acessando a API normalmente.";
      }

      const text = [
        "🧪 *DIAGNÓSTICO TOKITO API*",
        "",
        `Chave carregada de: *${cfg.source}*`,
        `Tamanho da chave: *${cfg.keyLength} caracteres*`,
        `Fingerprint SHA-256: *${cfg.keyFingerprint || "vazio"}*`,
        `Base: *${cfg.baseUrl}*`,
        `Parâmetro apikey na URL: *${urlCheck.count}x*`,
        `Chave enviada = chave carregada: *${urlCheck.exactMatch ? "SIM" : "NÃO"}*`,
        `Tamanho enviado: *${urlCheck.sentLength} caracteres*`,
        "",
        "*Conectividade pública*",
        summarize(publicStatus, "STATUS"),
        "",
        "*Rota autenticada via Axios*",
        summarize(first, 1),
        "",
        summarize(second, 2),
        "",
        "*Mesma rota via HTTPS nativo do Node*",
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
