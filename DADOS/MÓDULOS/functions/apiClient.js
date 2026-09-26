const axios = require("axios");
const config = require("../../config/config");

function settings() {
  return {
    baseUrl: String(
      process.env.TOKITO_API_URL ||
      config.tokitoApiUrl ||
      "https://tokito-apis.com.br"
    ).replace(/\/+$/, ""),
    apiKey: String(process.env.TOKITO_API || config.tokitoApi || "").trim(),
  };
}

function ensureConfigured() {
  const cfg = settings();
  if (!cfg.apiKey) {
    const error = new Error("Chave da API não configurada no ambiente.");
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

  for (const [key, value] of Object.entries({ ...params, apikey: apiKey })) {
    if (value === undefined || value === null || value === "") continue;
    target.searchParams.set(key, String(value));
  }

  return target.toString();
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
  else if (status === 403) message = "A chave da API não tem permissão para este endpoint.";
  else if (status === 404) message = "Endpoint não encontrado na API.";
  else if (status === 429) message = "Limite de requisições da API atingido.";
  else if (status >= 500) message = "A API está com erro interno.";

  return { status, message: String(message).slice(0, 500) };
}

function userError(error, fallback = "Não foi possível consultar a API.") {
  if (error?.code === "TOKITO_API_NOT_CONFIGURED") {
    return "❌ A chave da API não está configurada no servidor.";
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
      "user-agent": "WhatsAppBot/1.0",
      accept: "application/json",
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
      "user-agent": "WhatsAppBot/1.0",
      accept: "application/json",
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
      "user-agent": "WhatsAppBot/1.0",
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
};
