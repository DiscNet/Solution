const config = require("../../../config/config");
const tokitoApi = require("../../functions/apiClient");

function keySource() {
  if (String(process.env.TOKITO_API || "").trim()) return "variável TOKITO_API";
  if (String(config.tokitoApi || "").trim()) return "config.js";
  return "não configurada";
}

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

async function probe() {
  const target = tokitoApi.url("/api/stickers/brat-img", {
    text: "solution-api-test-" + Date.now(),
  });

  return tokitoApi.axios.get(target, {
    responseType: "arraybuffer",
    timeout: 30000,
    validateStatus: () => true,
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

      const first = await probe();
      const second = await probe();

      let diagnosis =
        "As respostas foram diferentes do padrão esperado; compare os códigos abaixo.";

      if (first.status >= 200 && first.status < 300 && second.status === 403) {
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
        `Chave carregada de: *${keySource()}*`,
        `Base: *${cfg.baseUrl}*`,
        "",
        summarize(first, 1),
        "",
        summarize(second, 2),
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
