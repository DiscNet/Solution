const axios = require("axios");
const crypto = require("crypto");
const configLoader = require("./configLoader");

const TOKITO_HEADERS = Object.freeze({
  "User-Agent": "Mozilla/5.0",
  accept: "application/json",
});

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function settings() {
  const config = configLoader.getBaseConfig();
  const rawKey = firstNonEmpty(config.tokitoApi, config.API_KEY_TOKITO);
  const source = firstNonEmpty(config.tokitoApi)
    ? "config.js:tokitoApi"
    : firstNonEmpty(config.API_KEY_TOKITO)
      ? "config.js:API_KEY_TOKITO"
      : "config.js";

  const apiKey = rawKey.trim();
  const keyFingerprint = apiKey
    ? crypto.createHash("sha256").update(apiKey, "utf8").digest("hex").slice(0, 12)
    : "";

  return {
    baseUrl: firstNonEmpty(
      config.tokitoApiUrl,
      config.API_URL,
      "https://tokito-apis.com.br"
    ).replace(/\/+$/, ""),
    apiKey,
    source,
    keyLength: apiKey.length,
    keyFingerprint,
    suspiciousKey:
      /^https?:\/\//i.test(apiKey) ||
      /^apikey=/i.test(apiKey) ||
      /[\r\n]/.test(rawKey),
  };
}

function ensureConfigured() {
  const cfg = settings();
  if (!cfg.apiKey) {
    const error = new Error("Chave da API não configurada no config.js.");
    error.code = "TOKITO_API_NOT_CONFIGURED";
    throw error;
  }
  if (cfg.suspiciousKey) {
    const error = new Error("A chave Tokito no config.js parece estar em formato inválido.");
    error.code = "TOKITO_API_BAD_FORMAT";
    throw error;
  }
  return cfg;
}

function url(route, params = {}) {
  const { baseUrl, apiKey } = ensureConfigured();
  const normalized = String(route || "").startsWith("/")
    ? String(route)
    : "/" + String(route || "");

  const query = Object.entries({ ...params, apikey: apiKey })
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) =>
      encodeURIComponent(String(key)) + "=" + encodeURIComponent(String(value))
    )
    .join("&");

  return baseUrl + normalized + (query ? "?" + query : "");
}

function sanitize(value) {
  const { apiKey } = settings();
  let text = String(value || "");
  if (apiKey) text = text.split(apiKey).join("[API_KEY]");
  return text.replace(/([?&]apikey=)[^&\s]+/gi, "$1[API_KEY]");
}

function errorInfo(error) {
  const status = Number(error?.response?.status || 0) || null;
  const data = error?.response?.data;
  const apiMessage = typeof data === "string"
    ? data
    : data?.resultado || data?.mensagem || data?.message || data?.error || data?.erro || "";

  let message = sanitize(apiMessage || error?.message || "Erro desconhecido na API.");
  if (status === 401) message = "Chave da API inválida ou não autenticada.";
  else if (status === 403) {
    const contentType = String(error?.response?.headers?.["content-type"] || "");
    const bodyLooksHtml = typeof data === "string" && /<html|<!doctype/i.test(data);
    const safeApiMessage = !bodyLooksHtml && apiMessage ? sanitize(apiMessage) : "";
    message = safeApiMessage ||
      (/html/i.test(contentType)
        ? "A camada de proteção da Tokito recusou a requisição HTTP (403)."
        : "A Tokito API recusou a requisição (403). Confira a chave, o plano e o acesso desta rota.");
  }
  else if (status === 404) message = "Endpoint não encontrado na API.";
  else if (status === 429) message = "Limite de requisições da API atingido.";
  else if (status >= 500) message = "A API está com erro interno.";

  return { status, message: String(message).slice(0, 500) };
}

function userError(error, fallback = "Não foi possível consultar a API.") {
  if (error?.code === "TOKITO_API_NOT_CONFIGURED") {
    return "❌ A chave da API não está configurada no config.js.";
  }
  if (error?.code === "TOKITO_API_BAD_FORMAT") {
    return "❌ A chave Tokito no config.js está em formato inválido. Salve apenas o token, sem URL e sem 'apikey='.";
  }
  const info = errorInfo(error);
  if (info.status) return "❌ API (" + info.status + "): " + info.message;
  return "❌ " + (info.message || fallback);
}

async function get(route, params = {}, options = {}) {
  const { timeout = 120000, headers = {}, ...rest } = options;
  const response = await axios.get(url(route, params), {
    timeout,
    headers: {
      ...TOKITO_HEADERS,
      ...headers,
    },
    ...rest,
  });
  return response.data;
}

async function post(route, body = {}, options = {}) {
  const { baseUrl, apiKey } = ensureConfigured();
  const normalized = String(route || "").startsWith("/")
    ? String(route)
    : "/" + String(route || "");
  const { timeout = 120000, headers = {}, params = {}, ...rest } = options;

  const response = await axios.post(baseUrl + normalized, body, {
    timeout,
    params: { ...params, apikey: apiKey },
    headers: {
      ...TOKITO_HEADERS,
      ...headers,
    },
    ...rest,
  });

  return response.data;
}

async function buffer(route, params = {}, options = {}) {
  const {
    timeout = 120000,
    headers = {},
    maxContentLength = 40 * 1024 * 1024,
    maxBodyLength = 40 * 1024 * 1024,
    ...rest
  } = options;

  const response = await axios.get(url(route, params), {
    responseType: "arraybuffer",
    timeout,
    maxContentLength,
    maxBodyLength,
    headers: {
      ...TOKITO_HEADERS,
      accept: "*/*",
      ...headers,
    },
    ...rest,
  });

  return {
    buffer: Buffer.from(response.data || []),
    contentType: String(response.headers?.["content-type"] || ""),
    status: response.status,
  };
}

function firstObject(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data.resultado || data.result || data.data || data.results || data;
}

function list(data) {
  const raw =
    data?.resultado ??
    data?.resultados ??
    data?.result ??
    data?.data ??
    data?.results ??
    data;

  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.videos)) return raw.videos;
  if (Array.isArray(raw?.tracks)) return raw.tracks;
  return raw ? [raw] : [];
}

function geminiText(value) {
  const candidates =
    value?.candidates ||
    value?.resposta?.candidates ||
    value?.resultado?.candidates ||
    [];

  if (!Array.isArray(candidates) || !candidates.length) return "";
  return String(
    candidates[0]?.content?.parts
      ?.map(part => part?.text || "")
      .join("") || ""
  ).trim();
}

function text(data) {
  if (typeof data === "string" && data.trim()) return data.trim();

  const candidates = [
    data?.resposta,
    data?.response,
    data?.text,
    data?.texto,
    data?.answer,
    data?.result,
    data?.resultado,
    data?.message,
    data?.data?.resposta,
    data?.data?.text,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const nested = geminiText(data);
  if (nested) return nested;

  for (const value of candidates) {
    if (!value || typeof value !== "object") continue;
    const inner = text(value);
    if (inner) return inner;
  }

  return "";
}

module.exports = {
  axios,
  settings,
  ensureConfigured,
  url,
  sanitize,
  errorInfo,
  userError,
  get,
  post,
  buffer,
  firstObject,
  list,
  geminiText,
  text,
  TOKITO_HEADERS,
};
