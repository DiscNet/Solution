const axios = require("axios");
const configLoader = require("./configLoader");

function settings() {
  const config = configLoader.getBaseConfig();
  return {
    baseUrl: String(
      config.tokitoApiUrl ||
      config.API_URL ||
      "https://tokito-apis.com.br"
    ).replace(/\/+$/, ""),
    apiKey: String(
      config.tokitoApi ||
      config.API_KEY_TOKITO ||
      ""
    ).trim(),
  };
}

function ensureConfigured() {
  const cfg = settings();
  if (!cfg.apiKey) {
    const error = new Error("Chave da API não configurada no config.js.");
    error.code = "TOKITO_API_NOT_CONFIGURED";
    throw error;
  }
  return cfg;
}

function url(route, params = {}) {
  const { baseUrl, apiKey } = ensureConfigured();
  const path = String(route || "").startsWith("/")
    ? String(route)
    : "/" + String(route || "");

  const query = new URLSearchParams({
    ...params,
    apikey: apiKey,
  });

  return `${baseUrl}${path}?${query.toString()}`;
}

function errorInfo(error) {
  const status = Number(error?.response?.status || 0) || null;
  const data = error?.response?.data;

  let message =
    data?.message ||
    data?.mensagem ||
    data?.error ||
    data?.erro ||
    error?.message ||
    "Erro na API.";

  if (typeof data === "string" && data.trim() && !/<html|<!doctype/i.test(data)) {
    message = data.trim();
  }

  return {
    status,
    message: String(message).slice(0, 500),
  };
}

function userError(error, fallback = "Não foi possível consultar a API.") {
  if (error?.code === "TOKITO_API_NOT_CONFIGURED") {
    return "❌ A chave da API não está configurada no config.js.";
  }

  const info = errorInfo(error);
  if (info.status) return `❌ API (${info.status}): ${info.message}`;
  return `❌ ${info.message || fallback}`;
}

async function get(route, params = {}, options = {}) {
  const response = await axios.get(url(route, params), options);
  return response.data;
}

async function post(route, body = {}, options = {}) {
  const { baseUrl, apiKey } = ensureConfigured();
  const path = String(route || "").startsWith("/")
    ? String(route)
    : "/" + String(route || "");

  const response = await axios.post(baseUrl + path, body, {
    ...options,
    params: {
      ...(options.params || {}),
      apikey: apiKey,
    },
  });

  return response.data;
}

async function buffer(route, params = {}, options = {}) {
  const response = await axios.get(url(route, params), {
    ...options,
    responseType: "arraybuffer",
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
  rawAxios: axios,
  settings,
  ensureConfigured,
  url,
  errorInfo,
  userError,
  get,
  post,
  buffer,
  firstObject,
  list,
  geminiText,
  text,
};
