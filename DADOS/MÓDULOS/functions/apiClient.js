const axios = require("axios");
const config = require("../../config/config");

function settings() {
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
    const error = new Error("Chave da Tokito API não configurada no config.js.");
    error.code = "TOKITO_API_NOT_CONFIGURED";
    throw error;
  }

  return cfg;
}

function url(route, params = {}) {
  const { baseUrl, apiKey } = ensureConfigured();
  const normalized = String(route || "").startsWith("/")
    ? String(route)
    : "/" + String(route || "");

  const target = new URL(baseUrl + normalized);

  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    target.searchParams.set(key, String(value));
  }

  target.searchParams.set("apikey", apiKey);
  return target.toString();
}

async function get(route, params = {}, options = {}) {
  const response = await axios.get(url(route, params), options);
  return response.data;
}

async function post(route, body = {}, options = {}) {
  const { baseUrl, apiKey } = ensureConfigured();
  const normalized = String(route || "").startsWith("/")
    ? String(route)
    : "/" + String(route || "");

  const response = await axios.post(baseUrl + normalized, body, {
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

function sanitize(value) {
  const { apiKey } = settings();
  let text = String(value || "");
  if (apiKey) text = text.split(apiKey).join("[API_KEY]");
  return text.replace(/([?&]apikey=)[^&\s]+/gi, "$1[API_KEY]");
}

function errorInfo(error) {
  const status = Number(error?.response?.status || 0) || null;
  const data = error?.response?.data;

  const message = sanitize(
    (typeof data === "string" ? data : data?.message || data?.error || data?.erro) ||
    error?.message ||
    "Erro desconhecido na API."
  );

  return {
    status,
    message: String(message).slice(0, 500),
  };
}

function userError(error, fallback = "Não foi possível consultar a API.") {
  if (error?.code === "TOKITO_API_NOT_CONFIGURED") {
    return "❌ A chave da Tokito API não está configurada no config.js.";
  }

  const info = errorInfo(error);
  if (info.status) return `❌ API (${info.status}): ${info.message}`;
  return `❌ ${info.message || fallback}`;
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
  get,
  post,
  buffer,
  sanitize,
  errorInfo,
  userError,
  firstObject,
  list,
  geminiText,
  text,
};
